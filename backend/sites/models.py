from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class Site(models.Model):
    class Source(models.TextChoices):
        CURATED = "curated", "Curated"
        WIKIPEDIA = "wikipedia", "Wikipedia"

    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    description = models.TextField()
    latitude = models.FloatField(db_index=True)
    longitude = models.FloatField(db_index=True)
    city = models.CharField(max_length=120, blank=True)
    country = models.CharField(max_length=120, blank=True)
    era = models.CharField(max_length=120, blank=True)
    image_url = models.URLField(max_length=500, blank=True)
    ticket_url = models.URLField(max_length=500, blank=True)
    source = models.CharField(max_length=16, choices=Source.choices, default=Source.CURATED)

    wikipedia_pageid = models.BigIntegerField(null=True, blank=True, unique=True)
    wikipedia_url = models.URLField(max_length=500, blank=True)
    wiki_fetched_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Comment(models.Model):
    site = models.ForeignKey(Site, on_delete=models.CASCADE, related_name="comments")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    text = models.TextField(max_length=2000)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user} on {self.site}"


class Rating(models.Model):
    site = models.ForeignKey(Site, on_delete=models.CASCADE, related_name="ratings")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    value = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["site", "user"], name="one_rating_per_user_per_site")
        ]

    def __str__(self):
        return f"{self.value}★ for {self.site} by {self.user}"


class SitePhoto(models.Model):
    site = models.ForeignKey(Site, on_delete=models.CASCADE, related_name="photos")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    image = models.ImageField(upload_to="site_photos/%Y/%m/")
    caption = models.CharField(max_length=280, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Photo of {self.site} by {self.user}"
