"""Social endpoints: check-ins, comment votes, activity feed, leaderboard, profiles."""
from django.contrib.auth.models import User
from django.db.models import Count
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .era import age_years
from .models import Comment, CommentVote, Site, SitePhoto, Visit

ACTIVITY_LIMIT = 30
LEADERBOARD_SIZE = 10


class SiteVisitView(APIView):
    """POST = 'I saw this old shit', DELETE = actually I didn't."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        site = get_object_or_404(Site, pk=pk)
        Visit.objects.get_or_create(site=site, user=request.user)
        return Response(
            {"visited": True, "visit_count": site.visits.count()}, status=status.HTTP_200_OK
        )

    def delete(self, request, pk):
        site = get_object_or_404(Site, pk=pk)
        Visit.objects.filter(site=site, user=request.user).delete()
        return Response({"visited": False, "visit_count": site.visits.count()})


class CommentVoteView(APIView):
    """Toggle an upvote on a comment."""

    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        comment = get_object_or_404(Comment, pk=pk)
        vote, created = CommentVote.objects.get_or_create(comment=comment, user=request.user)
        if not created:
            vote.delete()
        return Response({"upvoted": created, "upvotes": comment.votes.count()})


class ActivityFeedView(APIView):
    """The most recent check-ins, hot takes, and photos across all sites."""

    def get(self, request):
        visits = Visit.objects.select_related("user", "site")[:ACTIVITY_LIMIT]
        comments = Comment.objects.select_related("user", "site")[:ACTIVITY_LIMIT]
        photos = SitePhoto.objects.select_related("user", "site")[:ACTIVITY_LIMIT]

        events = (
            [self._event("visit", v, v.site) for v in visits]
            + [self._event("comment", c, c.site, text=c.text) for c in comments]
            + [
                self._event(
                    "photo",
                    p,
                    p.site,
                    caption=p.caption,
                    image=request.build_absolute_uri(p.image.url),
                )
                for p in photos
            ]
        )
        events.sort(key=lambda event: event["created_at"], reverse=True)
        return Response({"results": events[:ACTIVITY_LIMIT]})

    @staticmethod
    def _event(kind, obj, site, **extra):
        return {
            "type": kind,
            "username": obj.user.username,
            "site_id": site.id,
            "site_name": site.name,
            "created_at": obj.created_at,
            **extra,
        }


class LeaderboardView(APIView):
    """Ruin Enjoyers ranked by how much old shit they have personally witnessed."""

    def get(self, request):
        enjoyers = (
            User.objects.annotate(visit_count=Count("visits", distinct=True))
            .filter(visit_count__gt=0)
            .order_by("-visit_count", "username")[:LEADERBOARD_SIZE]
        )
        return Response(
            {
                "results": [
                    {"username": user.username, "visit_count": user.visit_count}
                    for user in enjoyers
                ]
            }
        )


class UserProfileView(APIView):
    """Public profile: stats plus the sites this person has conquered."""

    def get(self, request, username):
        user = get_object_or_404(User, username=username)
        visits = user.visits.select_related("site").order_by("-created_at")

        years = [age_years(visit.site.era) for visit in visits]
        years_witnessed = sum(y for y in years if y) or None

        return Response(
            {
                "username": user.username,
                "joined": user.date_joined.date(),
                "visit_count": visits.count(),
                "comment_count": user.comment_set.count(),
                "photo_count": user.sitephoto_set.count(),
                "rating_count": user.rating_set.count(),
                "years_of_old_shit": years_witnessed,
                "recent_visits": [
                    {
                        "site_id": visit.site.id,
                        "site_name": visit.site.name,
                        "visited_at": visit.created_at,
                    }
                    for visit in visits[:10]
                ],
            }
        )
