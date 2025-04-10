# inventory/views.py

from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from .models import InventoryCategory, InventoryItem
from .serializers import InventoryCategorySerializer, InventoryItemSerializer
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated


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
        """
        Optional filtering: e.g. by school or assigned teacher.
        """
        queryset = super().get_queryset()
        school_id = self.request.query_params.get('school')
        assigned_to = self.request.query_params.get('assigned_to')

        if school_id:
            queryset = queryset.filter(school_id=school_id)
        if assigned_to:
            queryset = queryset.filter(assigned_to_id=assigned_to)

        return queryset

