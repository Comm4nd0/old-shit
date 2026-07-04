"""Wikipedia GeoSearch integration.

Fetches historic-ish pages near a point (or matching a search) and
materializes them as Site rows so the rest of the app only ever talks
to the database. Every public function swallows network errors: if
Wikipedia is down, the feed just serves what we already have.
"""
import logging
from datetime import timedelta

import requests
from django.conf import settings
from django.core.cache import cache
from django.utils import timezone

from .geo import bounding_box, haversine_km
from .models import Site

logger = logging.getLogger(__name__)

API_URL = "https://en.wikipedia.org/w/api.php"
TIMEOUT_SECONDS = 8
GEOSEARCH_MAX_RADIUS_M = 10_000  # hard cap imposed by the Wikipedia API
GEOSEARCH_LIMIT = 25
REFRESH_AFTER = timedelta(days=7)
THROTTLE_TTL_SECONDS = 60 * 60
MAX_EXTRACT_CHARS = 1500
DEDUPE_DISTANCE_KM = 0.15

PAGE_PROPS = {
    "prop": "extracts|pageimages|coordinates|info",
    "exintro": 1,
    "explaintext": 1,
    "piprop": "thumbnail",
    "pithumbsize": 800,
    "inprop": "url",
}


def fetch_and_cache_nearby(lat, lng, radius_km):
    """Materialize Wikipedia pages around a point. Throttled to ~1/km²/hour."""
    throttle_key = f"geosearch:{round(lat, 2)}:{round(lng, 2)}"
    if cache.get(throttle_key):
        return
    params = {
        "action": "query",
        "format": "json",
        "formatversion": 2,
        "generator": "geosearch",
        "ggscoord": f"{lat}|{lng}",
        "ggsradius": min(int(radius_km * 1000), GEOSEARCH_MAX_RADIUS_M),
        "ggslimit": GEOSEARCH_LIMIT,
        "exlimit": GEOSEARCH_LIMIT,
        **PAGE_PROPS,
    }
    try:
        pages = _call_api(params)
    except requests.RequestException as exc:
        logger.warning("Wikipedia geosearch failed: %s", exc)
        return
    _materialize(pages)
    cache.set(throttle_key, True, THROTTLE_TTL_SECONDS)


def search_and_cache(query):
    """Materialize Wikipedia pages whose titles match a search query."""
    query = query.strip()
    if not query:
        return
    throttle_key = f"wikisearch:{query.lower()}"
    if cache.get(throttle_key):
        return
    try:
        hits = _call_api(
            {
                "action": "query",
                "format": "json",
                "formatversion": 2,
                "list": "search",
                "srsearch": query,
                "srlimit": 10,
                "srnamespace": 0,
            },
            result_key="search",
        )
        pageids = [str(hit["pageid"]) for hit in hits]
        pages = []
        if pageids:
            pages = _call_api(
                {
                    "action": "query",
                    "format": "json",
                    "formatversion": 2,
                    "pageids": "|".join(pageids),
                    "exlimit": len(pageids),
                    **PAGE_PROPS,
                }
            )
    except requests.RequestException as exc:
        logger.warning("Wikipedia search failed: %s", exc)
        return
    _materialize(pages)
    cache.set(throttle_key, True, THROTTLE_TTL_SECONDS)


def _call_api(params, result_key="pages"):
    response = requests.get(
        API_URL,
        params=params,
        headers={"User-Agent": settings.WIKIPEDIA_USER_AGENT},
        timeout=TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    return response.json().get("query", {}).get(result_key, [])


def _materialize(pages):
    for page in pages:
        try:
            _materialize_page(page)
        except Exception:  # one bad page must not kill the batch
            logger.exception("Failed to materialize Wikipedia page %s", page.get("pageid"))


def _materialize_page(page):
    pageid = page.get("pageid")
    extract = (page.get("extract") or "").strip()
    coords = page.get("coordinates") or []
    if not pageid or not extract or not coords:
        return  # coordinate-less stubs make lousy feed cards

    lat, lng = coords[0]["lat"], coords[0]["lon"]
    thumbnail = (page.get("thumbnail") or {}).get("source", "")
    fullurl = page.get("fullurl", "")
    now = timezone.now()

    existing = Site.objects.filter(wikipedia_pageid=pageid).first()
    if existing:
        if (
            existing.source == Site.Source.WIKIPEDIA
            and (existing.wiki_fetched_at is None or now - existing.wiki_fetched_at > REFRESH_AFTER)
        ):
            existing.description = extract[:MAX_EXTRACT_CHARS]
            existing.image_url = thumbnail or existing.image_url
            existing.wiki_fetched_at = now
            existing.save(update_fields=["description", "image_url", "wiki_fetched_at"])
        return

    curated_match = _find_curated_match(page["title"], lat, lng)
    if curated_match:
        # Link the pageid onto the curated row; curated description always wins.
        curated_match.wikipedia_pageid = pageid
        curated_match.wikipedia_url = fullurl
        curated_match.wiki_fetched_at = now
        if not curated_match.image_url:
            curated_match.image_url = thumbnail
        curated_match.save(
            update_fields=["wikipedia_pageid", "wikipedia_url", "wiki_fetched_at", "image_url"]
        )
        return

    Site.objects.create(
        name=page["title"][:255],
        slug=f"wiki-{pageid}",
        description=extract[:MAX_EXTRACT_CHARS],
        latitude=lat,
        longitude=lng,
        image_url=thumbnail,
        wikipedia_pageid=pageid,
        wikipedia_url=fullurl,
        wiki_fetched_at=now,
        source=Site.Source.WIKIPEDIA,
    )


def _find_curated_match(title, lat, lng):
    """A curated site within 150 m whose name overlaps the wiki title."""
    min_lat, max_lat, min_lng, max_lng = bounding_box(lat, lng, DEDUPE_DISTANCE_KM)
    candidates = Site.objects.filter(
        source=Site.Source.CURATED,
        wikipedia_pageid__isnull=True,
        latitude__range=(min_lat, max_lat),
        longitude__range=(min_lng, max_lng),
    )
    title_lower = title.lower()
    for candidate in candidates:
        name_lower = candidate.name.lower()
        if name_lower not in title_lower and title_lower not in name_lower:
            continue
        if haversine_km(lat, lng, candidate.latitude, candidate.longitude) <= DEDUPE_DISTANCE_KM:
            return candidate
    return None
