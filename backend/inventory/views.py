# inventory/views.py

from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth import get_user_model
from .models import InventoryCategory, InventoryItem
from .serializers import InventoryCategorySerializer, InventoryItemSerializer
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated

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

        queryset = InventoryItem.objects.select_related("school", "assigned_to", "category").order_by('-last_updated')

        if school_id:
            queryset = queryset.filter(school_id=school_id)
        if assigned_to:
            queryset = queryset.filter(assigned_to_id=assigned_to)

        return queryset


# views.py
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def users_assigned_to_school(request):
    school_id = request.query_params.get("school")

    if not school_id:
        return Response([], status=400)

    try:
        school_id = int(school_id)  # 🔧 convert to int to avoid type mismatch
    except ValueError:
        return Response({"error": "Invalid school ID"}, status=400)

    users = User.objects.filter(assigned_schools__id=school_id).distinct()
    return Response([
        {"id": u.id, "name": u.get_full_name() or u.username}
        for u in users
    ])
