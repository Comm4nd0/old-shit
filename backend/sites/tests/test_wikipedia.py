from unittest.mock import patch

import requests
from django.core.cache import cache
from django.test import TestCase
from rest_framework.test import APITestCase

from sites import wikipedia
from sites.models import Site


def geosearch_payload(pages):
    return {"query": {"pages": pages}}


def wiki_page(pageid, title, lat, lng, extract="Old and full of history.", thumb=True):
    page = {
        "pageid": pageid,
        "title": title,
        "extract": extract,
        "coordinates": [{"lat": lat, "lon": lng}],
        "fullurl": f"https://en.wikipedia.org/wiki/{title.replace(' ', '_')}",
    }
    if thumb:
        page["thumbnail"] = {"source": f"https://upload.wikimedia.org/{pageid}.jpg"}
    return page


class FakeResponse:
    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self):
        pass

    def json(self):
        return self._payload


class GeosearchTests(TestCase):
    def setUp(self):
        cache.clear()

    @patch("sites.wikipedia.requests.get")
    def test_materializes_pages(self, mock_get):
        mock_get.return_value = FakeResponse(
            geosearch_payload(
                [
                    wiki_page(101, "Ancient Wall", 51.5, -0.1),
                    wiki_page(102, "No Extract Stub", 51.5, -0.1, extract=""),
                    {"pageid": 103, "title": "No Coords", "extract": "old"},
                ]
            )
        )
        wikipedia.fetch_and_cache_nearby(51.5, -0.1, 10)
        self.assertEqual(Site.objects.count(), 1)
        site = Site.objects.get()
        self.assertEqual(site.wikipedia_pageid, 101)
        self.assertEqual(site.source, Site.Source.WIKIPEDIA)
        self.assertEqual(site.slug, "wiki-101")

    @patch("sites.wikipedia.requests.get")
    def test_throttle_skips_second_call(self, mock_get):
        mock_get.return_value = FakeResponse(geosearch_payload([]))
        wikipedia.fetch_and_cache_nearby(51.5, -0.1, 10)
        wikipedia.fetch_and_cache_nearby(51.5001, -0.1001, 10)  # same ~1km cell
        self.assertEqual(mock_get.call_count, 1)

    @patch("sites.wikipedia.requests.get")
    def test_dedupes_against_curated_site(self, mock_get):
        curated = Site.objects.create(
            name="Ancient Wall", slug="ancient-wall",
            description="A wall so old it predates fences.",
            latitude=51.5, longitude=-0.1, source=Site.Source.CURATED,
        )
        mock_get.return_value = FakeResponse(
            geosearch_payload([wiki_page(101, "Ancient Wall of London", 51.5001, -0.1001)])
        )
        wikipedia.fetch_and_cache_nearby(51.5, -0.1, 10)
        self.assertEqual(Site.objects.count(), 1)
        curated.refresh_from_db()
        self.assertEqual(curated.wikipedia_pageid, 101)
        self.assertEqual(curated.description, "A wall so old it predates fences.")

    @patch("sites.wikipedia.requests.get")
    def test_network_error_is_swallowed(self, mock_get):
        mock_get.side_effect = requests.ConnectionError("wikipedia is having a day")
        wikipedia.fetch_and_cache_nearby(51.5, -0.1, 10)  # must not raise
        self.assertEqual(Site.objects.count(), 0)


class NearbyEndpointResilienceTests(APITestCase):
    def setUp(self):
        cache.clear()
        Site.objects.create(
            name="Local Ruin", slug="local-ruin", description="Ruined, locally.",
            latitude=51.5, longitude=-0.1,
        )

    @patch("sites.wikipedia.requests.get")
    def test_feed_survives_wikipedia_outage(self, mock_get):
        mock_get.side_effect = requests.Timeout("too slow")
        response = self.client.get("/api/sites/nearby/?lat=51.5&lng=-0.1")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["results"][0]["slug"], "local-ruin")
