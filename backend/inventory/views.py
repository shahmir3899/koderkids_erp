# inventory/views.py
# ============================================
# INVENTORY VIEWS - Complete Version
# ============================================

from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework import status
from django.contrib.auth import get_user_model
from django.db.models import Count, Sum

from .models import InventoryCategory, InventoryItem
from .serializers import (
    InventoryCategorySerializer, 
    InventoryItemSerializer,
    InventoryItemListSerializer
)

User = get_user_model()


# ============================================
# CATEGORY VIEWS
# ============================================

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def inventory_categories(request):
    """
    GET: List all categories with item counts
    POST: Create a new category
    """
    if request.method == "GET":
        categories = InventoryCategory.objects.all().order_by("name")
        serializer = InventoryCategorySerializer(categories, many=True)
        return Response(serializer.data)
    
    elif request.method == "POST":
        serializer = InventoryCategorySerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET", "PUT", "DELETE"])
@permission_classes([IsAuthenticated])
def inventory_category_detail(request, pk):
    """
    GET: Retrieve a category
    PUT: Update a category
    DELETE: Delete a category (only if no items)
    """
    try:
        category = InventoryCategory.objects.get(pk=pk)
    except InventoryCategory.DoesNotExist:
        return Response(
            {"detail": "Category not found"}, 
            status=status.HTTP_404_NOT_FOUND
        )
    
    if request.method == "GET":
        serializer = InventoryCategorySerializer(category)
        return Response(serializer.data)
    
    elif request.method == "PUT":
        serializer = InventoryCategorySerializer(category, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == "DELETE":
        # Check if category has items
        if category.items.exists():
            return Response(
                {"detail": f"Cannot delete: {category.items.count()} items are using this category"},
                status=status.HTTP_400_BAD_REQUEST
            )
        category.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ============================================
# INVENTORY ITEM VIEWSET
# ============================================

class InventoryItemViewSet(ModelViewSet):
    """ViewSet for inventory items CRUD operations"""
    
    queryset = InventoryItem.objects.all()
    serializer_class = InventoryItemSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        """Use lightweight serializer for list action"""
        if self.action == 'list':
            return InventoryItemListSerializer
        return InventoryItemSerializer

    def get_queryset(self):
        """Filter queryset based on query parameters"""
        queryset = InventoryItem.objects.select_related(
            "school", 
            "assigned_to", 
            "category"
        ).order_by('-last_updated')
        
        # Apply filters
        school_id = self.request.query_params.get('school')
        category_id = self.request.query_params.get('category')
        location = self.request.query_params.get('location')
        status_filter = self.request.query_params.get('status')
        assigned_to = self.request.query_params.get('assigned_to')
        search = self.request.query_params.get('search')
        
        if school_id:
            queryset = queryset.filter(school_id=school_id)
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        if location:
            queryset = queryset.filter(location=location)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if assigned_to:
            queryset = queryset.filter(assigned_to_id=assigned_to)
        if search:
            queryset = queryset.filter(name__icontains=search)
        
        return queryset
    
    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        """Get history/audit log for an item (placeholder - implement if you have audit logging)"""
        # This is a placeholder. Implement actual history tracking if needed.
        return Response([])


# ============================================
# SUMMARY & STATISTICS
# ============================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def inventory_summary(request):
    """
    Get inventory summary statistics
    Supports filtering by school and location
    """
    school_id = request.query_params.get("school")
    location = request.query_params.get("location")
    
    items = InventoryItem.objects.all()
    
    # Apply filters
    if school_id:
        items = items.filter(school_id=school_id)
    if location:
        items = items.filter(location=location)
    
    # Calculate statistics
    summary = {
        "total": items.count(),
        "total_value": items.aggregate(total=Sum('purchase_value'))['total'] or 0,
        "by_status": list(
            items.values("status").annotate(count=Count("id")).order_by('status')
        ),
        "by_category": list(
            items.values("category__name").annotate(count=Count("id")).order_by('-count')
        ),
        "by_location": list(
            items.values("location").annotate(count=Count("id")).order_by('location')
        ),
    }
    
    return Response(summary)


# ============================================
# USER LIST FOR ASSIGNMENT
# ============================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def users_assigned_to_school(request):
    """
    GET /api/inventory/assigned-users/
    
    Purpose:
    - Admins / Staff → See only active Teachers (for assigning inventory)
    - Regular users (e.g., Teachers) → See only themselves
    
    This prevents regular users from seeing all staff and keeps the dropdown clean.
    """
    current_user = request.user

    if current_user.is_superuser or current_user.is_staff:
        # Admins & staff see only active Teachers
        users = User.objects.filter(
            is_active=True,
            role='Teacher'
        ).order_by('first_name', 'last_name')
    else:
        # Non-admin users (like Teachers) see only themselves
        users = User.objects.filter(id=current_user.id, is_active=True)

    data = [
        {
            "id": user.id,
            "name": f"{user.first_name} {user.last_name}".strip() or user.username,
            "username": user.username,
            "email": user.email,
        }
        for user in users
    ]

    return Response(data, status=status.HTTP_200_OK)

# ============================================
# BULK OPERATIONS (Optional)
# ============================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def bulk_update_status(request):
    """Bulk update status for multiple items"""
    item_ids = request.data.get('item_ids', [])
    new_status = request.data.get('status')
    
    if not item_ids or not new_status:
        return Response(
            {"detail": "item_ids and status are required"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if new_status not in dict(InventoryItem.STATUS_CHOICES):
        return Response(
            {"detail": "Invalid status"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    updated = InventoryItem.objects.filter(id__in=item_ids).update(status=new_status)
    
    return Response({"updated_count": updated})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def bulk_assign(request):
    """Bulk assign items to a user"""
    item_ids = request.data.get('item_ids', [])
    user_id = request.data.get('assigned_to')
    
    if not item_ids:
        return Response(
            {"detail": "item_ids is required"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    user = None
    if user_id:
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {"detail": "User not found"},
                status=status.HTTP_404_NOT_FOUND
            )
    
    # Update items
    items = InventoryItem.objects.filter(id__in=item_ids)
    for item in items:
        item.assigned_to = user
        if user:
            item.status = 'Assigned'
        item.save()
    
    return Response({"updated_count": items.count()})