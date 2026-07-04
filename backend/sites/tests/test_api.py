import io
import tempfile
from unittest.mock import patch

from django.contrib.auth.models import User
from django.test import override_settings
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase

from sites.models import Site

MEDIA_TMP = tempfile.mkdtemp(prefix="oldshit-test-media-")


def make_site(slug, name, lat, lng, **extra):
    return Site.objects.create(
        name=name, slug=slug, description=f"{name}: extremely old.",
        latitude=lat, longitude=lng, **extra,
    )


def png_file():
    buffer = io.BytesIO()
    Image.new("RGB", (1, 1), "brown").save(buffer, format="PNG")
    buffer.seek(0)
    buffer.name = "photo.png"
    return buffer


class BaseSiteTest(APITestCase):
    def setUp(self):
        # Rome cluster + one far away, with the wiki fetch stubbed out.
        self.colosseum = make_site(
            "colosseum", "Colosseum", 41.8902, 12.4922,
            city="Rome", country="Italy",
            ticket_url="https://ticketing.colosseo.it/en/",
        )
        self.pantheon = make_site(
            "pantheon", "Pantheon", 41.8986, 12.4769, city="Rome", country="Italy"
        )
        self.stonehenge = make_site(
            "stonehenge", "Stonehenge", 51.1789, -1.8262, city="Amesbury", country="UK"
        )
        wiki_patcher = patch("sites.views.wikipedia.fetch_and_cache_nearby")
        self.mock_wiki_nearby = wiki_patcher.start()
        self.addCleanup(wiki_patcher.stop)

    def login(self):
        response = self.client.post(
            "/api/auth/register/",
            {"username": "marco", "email": "m@example.com", "password": "very-old-shit-42"},
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {response.data['token']}")


class NearbyTests(BaseSiteTest):
    def test_nearby_orders_by_distance_and_filters_radius(self):
        response = self.client.get("/api/sites/nearby/?lat=41.8902&lng=12.4922&radius=25")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data["results"]
        self.assertEqual([r["slug"] for r in results], ["colosseum", "pantheon"])
        self.assertAlmostEqual(results[0]["distance_km"], 0, delta=0.1)
        self.assertAlmostEqual(results[1]["distance_km"], 1.6, delta=0.3)
        self.mock_wiki_nearby.assert_called_once()

    def test_nearby_requires_coords(self):
        self.assertEqual(
            self.client.get("/api/sites/nearby/").status_code, status.HTTP_400_BAD_REQUEST
        )
        self.assertEqual(
            self.client.get("/api/sites/nearby/?lat=abc&lng=1").status_code,
            status.HTTP_400_BAD_REQUEST,
        )


class SearchTests(BaseSiteTest):
    @patch("sites.views.wikipedia.search_and_cache")
    def test_search_matches_name_and_city(self, mock_search):
        by_name = self.client.get("/api/sites/search/?q=stonehenge")
        self.assertEqual([r["slug"] for r in by_name.data["results"]], ["stonehenge"])
        by_city = self.client.get("/api/sites/search/?q=rome")
        self.assertEqual(len(by_city.data["results"]), 2)
        mock_search.assert_called()  # fewer than 5 DB hits triggers the wiki search


class RatingCommentTests(BaseSiteTest):
    def test_anonymous_writes_rejected(self):
        site_id = self.colosseum.id
        self.assertEqual(
            self.client.post(f"/api/sites/{site_id}/comments/", {"text": "old"}).status_code,
            status.HTTP_401_UNAUTHORIZED,
        )
        self.assertEqual(
            self.client.post(f"/api/sites/{site_id}/ratings/", {"value": 5}).status_code,
            status.HTTP_401_UNAUTHORIZED,
        )

    def test_comment_flow(self):
        self.login()
        response = self.client.post(
            f"/api/sites/{self.colosseum.id}/comments/",
            {"text": "Very old. Would shit again."},
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        listing = self.client.get(f"/api/sites/{self.colosseum.id}/comments/")
        self.assertEqual(listing.data["results"][0]["username"], "marco")

    def test_rating_average_and_upsert(self):
        other = User.objects.create_user("indy", password="x")
        self.colosseum.ratings.create(user=other, value=2)
        self.login()
        first = self.client.post(f"/api/sites/{self.colosseum.id}/ratings/", {"value": 4})
        self.assertEqual(first.data["average_rating"], 3.0)
        second = self.client.post(f"/api/sites/{self.colosseum.id}/ratings/", {"value": 5})
        self.assertEqual(second.data["rating_count"], 2)  # upsert, not a third row
        self.assertEqual(second.data["average_rating"], 3.5)
        detail = self.client.get(f"/api/sites/{self.colosseum.id}/")
        self.assertEqual(detail.data["user_rating"], 5)
        self.assertEqual(detail.data["average_rating"], 3.5)

    def test_rating_value_bounds(self):
        self.login()
        response = self.client.post(f"/api/sites/{self.colosseum.id}/ratings/", {"value": 6})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class TicketLinkTests(BaseSiteTest):
    def test_official_ticket_url_passthrough(self):
        detail = self.client.get(f"/api/sites/{self.colosseum.id}/")
        self.assertEqual(detail.data["ticket_url_kind"], "official")
        self.assertEqual(detail.data["ticket_url"], "https://ticketing.colosseo.it/en/")

    def test_fallback_is_getyourguide_search(self):
        detail = self.client.get(f"/api/sites/{self.pantheon.id}/")
        self.assertEqual(detail.data["ticket_url_kind"], "search")
        self.assertIn("getyourguide.com/s/?q=Pantheon+Rome", detail.data["ticket_url"])


@override_settings(MEDIA_ROOT=MEDIA_TMP)
class PhotoTests(BaseSiteTest):
    def test_photo_upload_and_listing(self):
        self.login()
        response = self.client.post(
            f"/api/sites/{self.colosseum.id}/photos/",
            {"image": png_file(), "caption": "me pointing at old shit"},
            format="multipart",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data["image"].startswith("http"))
        listing = self.client.get(f"/api/sites/{self.colosseum.id}/photos/")
        self.assertEqual(listing.data["results"][0]["caption"], "me pointing at old shit")
        detail = self.client.get(f"/api/sites/{self.colosseum.id}/")
        self.assertEqual(len(detail.data["photos"]), 1)
