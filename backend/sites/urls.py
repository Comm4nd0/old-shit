from django.urls import path

from . import views

urlpatterns = [
    path("sites/", views.SiteListView.as_view(), name="site-list"),
    path("sites/nearby/", views.NearbySitesView.as_view(), name="site-nearby"),
    path("sites/search/", views.SiteSearchView.as_view(), name="site-search"),
    path("sites/<int:pk>/", views.SiteDetailView.as_view(), name="site-detail"),
    path("sites/<int:pk>/comments/", views.SiteCommentsView.as_view(), name="site-comments"),
    path("sites/<int:pk>/ratings/", views.SiteRatingView.as_view(), name="site-ratings"),
    path("sites/<int:pk>/photos/", views.SitePhotosView.as_view(), name="site-photos"),
]
