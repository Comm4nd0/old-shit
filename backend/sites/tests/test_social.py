from datetime import date

from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase

from sites.era import age_years, era_start_year
from sites.models import Site


def make_site(slug, name, era=""):
    return Site.objects.create(
        name=name, slug=slug, description=f"{name}. Old.", latitude=0.0, longitude=0.0, era=era
    )


class EraParserTests(TestCase):
    def test_parses_common_formats(self):
        self.assertEqual(era_start_year("Roman, c. 80 AD"), 80)
        self.assertEqual(era_start_year("Neolithic, c. 3000 BC"), -3000)
        self.assertEqual(era_start_year("Inca, 15th century"), 1450)
        self.assertEqual(era_start_year("1st century BC"), -50)
        self.assertEqual(era_start_year("Mughal, 1632"), 1632)
        self.assertIsNone(era_start_year(""))
        self.assertIsNone(era_start_year("Prehistoric"))

    def test_age_years(self):
        self.assertEqual(age_years("c. 3000 BC"), date.today().year + 3000)
        self.assertIsNone(age_years("Ancient"))


class SocialApiTests(APITestCase):
    def setUp(self):
        self.colosseum = make_site("colosseum", "Colosseum", era="Roman, c. 80 AD")
        self.stonehenge = make_site("stonehenge", "Stonehenge", era="Neolithic, c. 3000 BC")

    def login(self, name="marco"):
        response = self.client.post(
            "/api/auth/register/",
            {"username": name, "email": f"{name}@example.com", "password": "very-old-shit-42"},
        )
        self.client.credentials(HTTP_AUTHORIZATION=f"Token {response.data['token']}")

    def test_visit_requires_auth(self):
        response = self.client.post(f"/api/sites/{self.colosseum.id}/visits/")
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_visit_checkin_idempotent_and_removable(self):
        self.login()
        url = f"/api/sites/{self.colosseum.id}/visits/"
        first = self.client.post(url)
        self.assertEqual(first.data, {"visited": True, "visit_count": 1})
        second = self.client.post(url)  # double check-in doesn't double-count
        self.assertEqual(second.data["visit_count"], 1)
        removed = self.client.delete(url)
        self.assertEqual(removed.data, {"visited": False, "visit_count": 0})

    def test_detail_includes_visit_info_and_share_url(self):
        self.login()
        self.client.post(f"/api/sites/{self.colosseum.id}/visits/")
        detail = self.client.get(f"/api/sites/{self.colosseum.id}/")
        self.assertEqual(detail.data["visit_count"], 1)
        self.assertTrue(detail.data["visited_by_me"])
        self.assertTrue(detail.data["share_url"].endswith(f"/site/{self.colosseum.id}"))

    def test_comment_vote_toggle_and_top_take(self):
        self.login()
        comment = self.client.post(
            f"/api/sites/{self.colosseum.id}/comments/", {"text": "Solid venue. Loud crowd."}
        )
        comment_id = comment.data["id"]

        vote = self.client.post(f"/api/comments/{comment_id}/vote/")
        self.assertEqual(vote.data, {"upvoted": True, "upvotes": 1})
        unvote = self.client.post(f"/api/comments/{comment_id}/vote/")
        self.assertEqual(unvote.data, {"upvoted": False, "upvotes": 0})

        self.client.post(f"/api/comments/{comment_id}/vote/")
        detail = self.client.get(f"/api/sites/{self.colosseum.id}/")
        self.assertEqual(detail.data["top_take"]["id"], comment_id)
        self.assertEqual(detail.data["top_take"]["upvotes"], 1)
        self.assertTrue(detail.data["top_take"]["upvoted_by_me"])

        listing = self.client.get(f"/api/sites/{self.colosseum.id}/comments/")
        self.assertEqual(listing.data["results"][0]["upvotes"], 1)

    def test_top_take_null_without_votes(self):
        self.login()
        self.client.post(f"/api/sites/{self.colosseum.id}/comments/", {"text": "meh"})
        detail = self.client.get(f"/api/sites/{self.colosseum.id}/")
        self.assertIsNone(detail.data["top_take"])

    def test_profile_stats_and_years(self):
        self.login()
        self.client.post(f"/api/sites/{self.colosseum.id}/visits/")
        self.client.post(f"/api/sites/{self.stonehenge.id}/visits/")
        self.client.post(f"/api/sites/{self.colosseum.id}/comments/", {"text": "old"})

        profile = self.client.get("/api/users/marco/")
        self.assertEqual(profile.data["visit_count"], 2)
        self.assertEqual(profile.data["comment_count"], 1)
        expected_years = (date.today().year - 80) + (date.today().year + 3000)
        self.assertEqual(profile.data["years_of_old_shit"], expected_years)
        self.assertEqual(len(profile.data["recent_visits"]), 2)

        self.assertEqual(
            self.client.get("/api/users/nobody/").status_code, status.HTTP_404_NOT_FOUND
        )

    def test_leaderboard_orders_by_visits(self):
        other = User.objects.create_user("indy", password="x")
        self.colosseum.visits.create(user=other)
        self.stonehenge.visits.create(user=other)
        self.login()
        self.client.post(f"/api/sites/{self.colosseum.id}/visits/")

        board = self.client.get("/api/leaderboard/")
        self.assertEqual(
            [(row["username"], row["visit_count"]) for row in board.data["results"]],
            [("indy", 2), ("marco", 1)],
        )

    def test_activity_feed_merges_and_sorts(self):
        self.login()
        self.client.post(f"/api/sites/{self.colosseum.id}/visits/")
        self.client.post(f"/api/sites/{self.stonehenge.id}/comments/", {"text": "rocks, but old"})

        feed = self.client.get("/api/activity/")
        events = feed.data["results"]
        self.assertEqual(len(events), 2)
        self.assertEqual(events[0]["type"], "comment")  # newest first
        self.assertEqual(events[0]["site_name"], "Stonehenge")
        self.assertEqual(events[1]["type"], "visit")
        self.assertEqual(events[1]["username"], "marco")
