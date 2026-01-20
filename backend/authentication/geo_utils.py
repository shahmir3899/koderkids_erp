"""
Geolocation utilities for teacher attendance tracking.
"""
import math
from decimal import Decimal

# Geofence radius in meters
GEOFENCE_RADIUS_METERS = 200


def haversine_distance(lat1, lon1, lat2, lon2):
    """
    Calculate the great-circle distance between two points on Earth
    using the Haversine formula.

    Args:
        lat1, lon1: Latitude and longitude of point 1 (in degrees)
        lat2, lon2: Latitude and longitude of point 2 (in degrees)

    Returns:
        Distance in meters
    """
    # Convert to float if Decimal
    lat1 = float(lat1) if isinstance(lat1, Decimal) else lat1
    lon1 = float(lon1) if isinstance(lon1, Decimal) else lon1
    lat2 = float(lat2) if isinstance(lat2, Decimal) else lat2
    lon2 = float(lon2) if isinstance(lon2, Decimal) else lon2

    # Earth's radius in meters
    R = 6371000

    # Convert degrees to radians
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    # Haversine formula
    a = math.sin(delta_phi / 2) ** 2 + \
        math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))

    distance = R * c
    return round(distance, 2)


def is_within_geofence(teacher_lat, teacher_lon, school_lat, school_lon, radius=GEOFENCE_RADIUS_METERS):
    """
    Check if teacher's location is within the school's geofence.

    Args:
        teacher_lat, teacher_lon: Teacher's current location
        school_lat, school_lon: School's location
        radius: Geofence radius in meters (default 200m)

    Returns:
        tuple: (is_within: bool, distance: float)
    """
    if not all([teacher_lat, teacher_lon, school_lat, school_lon]):
        return False, None

    distance = haversine_distance(teacher_lat, teacher_lon, school_lat, school_lon)
    is_within = distance <= radius

    return is_within, distance
