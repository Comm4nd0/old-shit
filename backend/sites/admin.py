from django.contrib import admin

from .models import Comment, CommentVote, Rating, Site, SitePhoto, Visit


@admin.register(Site)
class SiteAdmin(admin.ModelAdmin):
    list_display = ["name", "city", "country", "source", "wikipedia_pageid"]
    list_filter = ["source", "country"]
    search_fields = ["name", "city", "country"]
    prepopulated_fields = {"slug": ["name"]}


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ["site", "user", "text", "created_at"]


@admin.register(Rating)
class RatingAdmin(admin.ModelAdmin):
    list_display = ["site", "user", "value", "created_at"]


@admin.register(SitePhoto)
class SitePhotoAdmin(admin.ModelAdmin):
    list_display = ["site", "user", "caption", "created_at"]


@admin.register(Visit)
class VisitAdmin(admin.ModelAdmin):
    list_display = ["site", "user", "created_at"]


@admin.register(CommentVote)
class CommentVoteAdmin(admin.ModelAdmin):
    list_display = ["comment", "user", "created_at"]
