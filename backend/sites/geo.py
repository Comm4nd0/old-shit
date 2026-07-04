"""Distance helpers: good-enough geography without GeoDjango."""
import math

EARTH_RADIUS_KM = 6371.0
KM_PER_DEGREE_LAT = 111.32


def haversine_km(lat1, lng1, lat2, lng2):
    """Great-circle distance between two points, in kilometres."""
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * EARTH_RADIUS_KM * math.asin(math.sqrt(a))


def bounding_box(lat, lng, radius_km):
    """(min_lat, max_lat, min_lng, max_lng) box enclosing the radius.

    Known limitation: no longitude wraparound handling at the antimeridian.
    """
    dlat = radius_km / KM_PER_DEGREE_LAT
    dlng = radius_km / (KM_PER_DEGREE_LAT * max(math.cos(math.radians(lat)), 0.01))
    return lat - dlat, lat + dlat, lng - dlng, lng + dlng
