from django.apps import AppConfig


class SitesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "sites"
    # Distinct label so django.contrib.sites can never collide with us.
    label = "historic_sites"
    verbose_name = "Historic sites"
