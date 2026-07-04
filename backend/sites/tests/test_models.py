from django.contrib.auth.models import User
from django.core.management import call_command
from django.test import TestCase

from sites.models import Rating, Site
from sites.seed_data import SEED_SITES


class SeedCommandTests(TestCase):
    def test_seed_is_idempotent(self):
        call_command("seed_sites", verbosity=0)
        first_count = Site.objects.count()
        call_command("seed_sites", verbosity=0)
        self.assertEqual(Site.objects.count(), first_count)
        self.assertEqual(first_count, len(SEED_SITES))

    def test_seed_slugs_unique(self):
        slugs = [entry["slug"] for entry in SEED_SITES]
        self.assertEqual(len(slugs), len(set(slugs)))


class RatingTests(TestCase):
    def test_update_or_create_replaces_rating(self):
        user = User.objects.create_user("rita", password="x")
        site = Site.objects.create(
            name="Old Rock", slug="old-rock", description="A rock. Old.",
            latitude=0.0, longitude=0.0,
        )
        Rating.objects.update_or_create(site=site, user=user, defaults={"value": 2})
        Rating.objects.update_or_create(site=site, user=user, defaults={"value": 5})
        self.assertEqual(site.ratings.count(), 1)
        self.assertEqual(site.ratings.first().value, 5)
