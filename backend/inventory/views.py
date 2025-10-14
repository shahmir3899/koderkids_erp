# inventory/views.py

from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from .models import InventoryCategory, InventoryItem
from .serializers import InventoryCategorySerializer, InventoryItemSerializer
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count

User = get_user_model()

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def inventory_categories(request):
    categories = InventoryCategory.objects.all().order_by("name")
    serializer = InventoryCategorySerializer(categories, many=True)
    return Response(serializer.data)

class InventoryItemViewSet(ModelViewSet):
    queryset = InventoryItem.objects.all().order_by('-last_updated')
    serializer_class = InventoryItemSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        school_id = self.request.query_params.get('school')
        assigned_to = self.request.query_params.get('assigned_to')
        location = self.request.query_params.get('location')  # New filter

        queryset = InventoryItem.objects.select_related("school", "assigned_to", "category").order_by('-last_updated')

        if school_id:
            queryset = queryset.filter(school_id=school_id)
        if assigned_to:
            queryset = queryset.filter(assigned_to_id=assigned_to)
        if location:
            queryset = queryset.filter(location=location)

        return queryset

# views.py
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def users_assigned_to_school(request):
    school_id = request.query_params.get("school")
    location = request.query_params.get("location")  # New optional param for location-based users

    if not school_id and not location:
        return Response({"error": "Provide either school or location parameter"}, status=400)

    users = User.objects.all().distinct()

    if school_id:
        try:
            school_id = int(school_id)
        except ValueError:
            return Response({"error": "Invalid school ID"}, status=400)
        users = users.filter(assigned_schools__id=school_id)

    if location:
        # Assuming users have a 'assigned_location' field or similar; adjust based on User model
        # For now, filter globally if location provided without school (extend User model if needed)
        users = users.filter(assigned_location=location)  # Placeholder; implement per your User model

    return Response([
        {"id": u.id, "name": u.get_full_name() or u.username}
        for u in users
    ])

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def inventory_summary(request):
    school_id = request.query_params.get("school")
    location = request.query_params.get("location")  # New filter
    items = InventoryItem.objects.all()

    if school_id:
        items = items.filter(school_id=school_id)
    if location:
        items = items.filter(location=location)

    summary = {
        "total": items.count(),
        "by_status": items.values("status").annotate(count=Count("id")),
        "by_category": items.values("category__name").annotate(count=Count("id")),
        "by_location": items.values("location").annotate(count=Count("id")),  # New aggregation
    }

    return Response(summary)