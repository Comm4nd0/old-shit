from django.db.models import Avg, Count, Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response
from rest_framework.views import APIView

from . import wikipedia
from .geo import bounding_box, haversine_km
from .models import Comment, Rating, Site, SitePhoto
from .serializers import (
    CommentSerializer,
    RatingSerializer,
    SiteDetailSerializer,
    SiteListSerializer,
    SitePhotoCreateSerializer,
    SitePhotoSerializer,
)

DEFAULT_RADIUS_KM = 25
MAX_RADIUS_KM = 100
NEARBY_CANDIDATE_CAP = 500


def annotated_sites():
    return Site.objects.annotate(
        average_rating=Avg("ratings__value"), rating_count=Count("ratings", distinct=True)
    )


class SiteListView(generics.ListAPIView):
    serializer_class = SiteListSerializer
    queryset = annotated_sites().order_by("-rating_count", "name")


class SiteDetailView(generics.RetrieveAPIView):
    serializer_class = SiteDetailSerializer
    queryset = annotated_sites().prefetch_related("photos__user")


class NearbySitesView(APIView):
    """Everything old within `radius` km of (lat, lng), nearest first."""

    def get(self, request):
        try:
            lat = float(request.query_params["lat"])
            lng = float(request.query_params["lng"])
        except (KeyError, ValueError):
            return Response(
                {"detail": "lat and lng query params are required numbers."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not (-90 <= lat <= 90 and -180 <= lng <= 180):
            return Response(
                {"detail": "lat/lng out of range."}, status=status.HTTP_400_BAD_REQUEST
            )
        try:
            radius = float(request.query_params.get("radius", DEFAULT_RADIUS_KM))
        except ValueError:
            return Response(
                {"detail": "radius must be a number (km)."}, status=status.HTTP_400_BAD_REQUEST
            )
        radius = min(max(radius, 1), MAX_RADIUS_KM)

        wikipedia.fetch_and_cache_nearby(lat, lng, radius)

        min_lat, max_lat, min_lng, max_lng = bounding_box(lat, lng, radius)
        candidates = annotated_sites().filter(
            latitude__range=(min_lat, max_lat), longitude__range=(min_lng, max_lng)
        )[:NEARBY_CANDIDATE_CAP]

        nearby = []
        for site in candidates:
            distance = haversine_km(lat, lng, site.latitude, site.longitude)
            if distance <= radius:
                site.distance_km = distance
                nearby.append(site)
        nearby.sort(key=lambda s: s.distance_km)

        paginator = PageNumberPagination()
        page = paginator.paginate_queryset(nearby, request, view=self)
        serializer = SiteListSerializer(page, many=True, context={"request": request})
        return paginator.get_paginated_response(serializer.data)


class SiteSearchView(generics.ListAPIView):
    serializer_class = SiteListSerializer

    def get_queryset(self):
        query = self.request.query_params.get("q", "").strip()
        if not query:
            return Site.objects.none()
        db_filter = (
            Q(name__icontains=query) | Q(city__icontains=query) | Q(country__icontains=query)
        )
        queryset = annotated_sites().filter(db_filter)
        if queryset.count() < 5:
            wikipedia.search_and_cache(query)
            queryset = annotated_sites().filter(db_filter)
        return queryset.order_by("-rating_count", "name")


class SiteCommentsView(generics.ListCreateAPIView):
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        return Comment.objects.filter(site_id=self.kwargs["pk"]).select_related("user")

    def perform_create(self, serializer):
        site = get_object_or_404(Site, pk=self.kwargs["pk"])
        serializer.save(site=site, user=self.request.user)


class SiteRatingView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        site = get_object_or_404(Site, pk=pk)
        serializer = RatingSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        Rating.objects.update_or_create(
            site=site, user=request.user, defaults={"value": serializer.validated_data["value"]}
        )
        stats = site.ratings.aggregate(average=Avg("value"), count=Count("id"))
        return Response(
            {
                "value": serializer.validated_data["value"],
                "average_rating": round(stats["average"], 1),
                "rating_count": stats["count"],
            },
            status=status.HTTP_200_OK,
        )


class SitePhotosView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticatedOrReadOnly]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        return SitePhoto.objects.filter(site_id=self.kwargs["pk"]).select_related("user")

    def get_serializer_class(self):
        return SitePhotoCreateSerializer if self.request.method == "POST" else SitePhotoSerializer

    def perform_create(self, serializer):
        site = get_object_or_404(Site, pk=self.kwargs["pk"])
        serializer.save(site=site, user=self.request.user)

    def create(self, request, *args, **kwargs):
        create_serializer = self.get_serializer(data=request.data)
        create_serializer.is_valid(raise_exception=True)
        self.perform_create(create_serializer)
        read_serializer = SitePhotoSerializer(
            create_serializer.instance, context={"request": request}
        )
        return Response(read_serializer.data, status=status.HTTP_201_CREATED)
