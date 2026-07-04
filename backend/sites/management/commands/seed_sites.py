from django.core.management.base import BaseCommand

from sites.models import Site
from sites.seed_data import SEED_SITES


class Command(BaseCommand):
    help = "Load (or refresh) the curated historic sites. Idempotent: keyed on slug."

    def handle(self, *args, **options):
        created_count = 0
        for entry in SEED_SITES:
            entry = dict(entry)
            slug = entry.pop("slug")
            entry["source"] = Site.Source.CURATED
            _, created = Site.objects.update_or_create(slug=slug, defaults=entry)
            created_count += created
        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded {len(SEED_SITES)} sites ({created_count} new, "
                f"{len(SEED_SITES) - created_count} refreshed)."
            )
        )
