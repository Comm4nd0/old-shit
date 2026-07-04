from urllib.parse import quote_plus

from django.db.models import Count
from rest_framework import serializers

from .models import Comment, Rating, Site, SitePhoto

GETYOURGUIDE_SEARCH = "https://www.getyourguide.com/s/?q={query}"


def ticket_link(site):
    """(url, kind): the official booking page, or an honest search fallback."""
    if site.ticket_url:
        return site.ticket_url, "official"
    query = quote_plus(f"{site.name} {site.city}".strip())
    return GETYOURGUIDE_SEARCH.format(query=query), "search"


class SiteListSerializer(serializers.ModelSerializer):
    short_description = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()
    rating_count = serializers.IntegerField(read_only=True)
    distance_km = serializers.SerializerMethodField()

    class Meta:
        model = Site
        fields = [
            "id", "name", "slug", "short_description", "latitude", "longitude",
            "city", "country", "era", "image_url", "source",
            "average_rating", "rating_count", "distance_km",
        ]

    def get_short_description(self, site):
        text = site.description
        return text if len(text) <= 200 else text[:197].rstrip() + "..."

    def get_average_rating(self, site):
        avg = getattr(site, "average_rating", None)
        return round(avg, 1) if avg is not None else None

    def get_distance_km(self, site):
        distance = getattr(site, "distance_km", None)
        return round(distance, 2) if distance is not None else None


class SitePhotoSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    image = serializers.SerializerMethodField()

    class Meta:
        model = SitePhoto
        fields = ["id", "image", "caption", "username", "created_at"]

    def get_image(self, photo):
        request = self.context.get("request")
        url = photo.image.url
        return request.build_absolute_uri(url) if request else url


class SiteDetailSerializer(SiteListSerializer):
    description = serializers.CharField(read_only=True)
    photos = SitePhotoSerializer(many=True, read_only=True)
    user_rating = serializers.SerializerMethodField()
    ticket_url = serializers.SerializerMethodField()
    ticket_url_kind = serializers.SerializerMethodField()
    visit_count = serializers.SerializerMethodField()
    visited_by_me = serializers.SerializerMethodField()
    top_take = serializers.SerializerMethodField()
    share_url = serializers.SerializerMethodField()

    class Meta(SiteListSerializer.Meta):
        fields = SiteListSerializer.Meta.fields + [
            "description", "ticket_url", "ticket_url_kind",
            "wikipedia_url", "photos", "user_rating",
            "visit_count", "visited_by_me", "top_take", "share_url",
        ]

    def get_user_rating(self, site):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return None
        rating = site.ratings.filter(user=request.user).first()
        return rating.value if rating else None

    def get_ticket_url(self, site):
        return ticket_link(site)[0]

    def get_ticket_url_kind(self, site):
        return ticket_link(site)[1]

    def get_visit_count(self, site):
        return site.visits.count()

    def get_visited_by_me(self, site):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return site.visits.filter(user=request.user).exists()

    def get_top_take(self, site):
        """The most-upvoted comment (needs at least one vote)."""
        top = (
            site.comments.annotate(upvote_count=Count("votes"))
            .filter(upvote_count__gt=0)
            .order_by("-upvote_count", "-created_at")
            .first()
        )
        return CommentSerializer(top, context=self.context).data if top else None

    def get_share_url(self, site):
        request = self.context.get("request")
        path = f"/site/{site.id}"
        return request.build_absolute_uri(path) if request else path


class CommentSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    upvotes = serializers.SerializerMethodField()
    upvoted_by_me = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ["id", "text", "username", "created_at", "upvotes", "upvoted_by_me"]

    def get_upvotes(self, comment):
        annotated = getattr(comment, "upvote_count", None)
        return annotated if annotated is not None else comment.votes.count()

    def get_upvoted_by_me(self, comment):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            return False
        return comment.votes.filter(user=request.user).exists()


class RatingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Rating
        fields = ["value"]


class SitePhotoCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SitePhoto
        fields = ["image", "caption"]
