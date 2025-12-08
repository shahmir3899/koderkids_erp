# inventory/views.py
# ============================================
# INVENTORY VIEWS - Complete RBAC Implementation
# ============================================
#
# Role-Based Access Control:
# - Admin: Full access to all inventory across all locations
# - Teacher: Access only to items at their assigned schools
# - Student: No access (blocked at frontend routing level)

from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework import status
from django.contrib.auth import get_user_model
from django.db.models import Count, Sum, Q

from .models import InventoryCategory, InventoryItem
from .serializers import (
    InventoryCategorySerializer, 
    InventoryItemSerializer,
    InventoryItemListSerializer
)

User = get_user_model()


# ============================================
# HELPER FUNCTIONS
# ============================================

def is_admin_user(user):
    """Check if user has admin privileges"""
    return (
        user.is_superuser or 
        user.is_staff or 
        getattr(user, 'role', None) == 'Admin'
    )


def get_user_allowed_schools(user):
    """Get list of school IDs the user can access"""
    if is_admin_user(user):
        return None  # None means all schools
    
    # For teachers, get their assigned schools
    if hasattr(user, 'assigned_schools'):
        return list(user.assigned_schools.values_list('id', flat=True))
    
    return []  # No access if no assigned schools


def filter_items_by_role(queryset, user):
    """Filter inventory items based on user role"""
    if is_admin_user(user):
        return queryset  # Admin sees everything
    
    # Teachers see only items at their assigned schools
    allowed_schools = get_user_allowed_schools(user)
    if allowed_schools:
        return queryset.filter(
            location='School',
            school_id__in=allowed_schools
        )
    
    return queryset.none()  # No access


# ============================================
# CATEGORY VIEWSET
# ============================================

class InventoryCategoryViewSet(ModelViewSet):
    """
    ViewSet for inventory categories CRUD operations
    
    Access Control:
    - GET (list/retrieve): All authenticated users (needed for dropdowns)
    - POST/PUT/DELETE: Admin only
    """
    
    queryset = InventoryCategory.objects.all()
    serializer_class = InventoryCategorySerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Return categories ordered by name"""
        return InventoryCategory.objects.annotate(
            item_count=Count('items')
        ).order_by('name')
    
    def create(self, request, *args, **kwargs):
        """Only admins can create categories"""
        if not is_admin_user(request.user):
            return Response(
                {"detail": "Only administrators can create categories"},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().create(request, *args, **kwargs)
    
    def update(self, request, *args, **kwargs):
        """Only admins can update categories"""
        if not is_admin_user(request.user):
            return Response(
                {"detail": "Only administrators can update categories"},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        """Only admins can delete categories (and only if empty)"""
        if not is_admin_user(request.user):
            return Response(
                {"detail": "Only administrators can delete categories"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        category = self.get_object()
        if category.items.exists():
            return Response(
                {"detail": f"Cannot delete: {category.items.count()} items are using this category"},
                status=status.HTTP_400_BAD_REQUEST
            )
        return super().destroy(request, *args, **kwargs)


# ============================================
# INVENTORY ITEM VIEWSET
# ============================================

class InventoryItemViewSet(ModelViewSet):
    """
    ViewSet for inventory items CRUD operations
    
    Access Control:
    - Admin: Full CRUD on all items
    - Teacher: Read/Create/Update only on items at assigned schools, no delete
    """
    
    queryset = InventoryItem.objects.all()
    serializer_class = InventoryItemSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        """Use lightweight serializer for list action"""
        if self.action == 'list':
            return InventoryItemListSerializer
        return InventoryItemSerializer

    def get_queryset(self):
        """Filter queryset based on user role and query parameters"""
        queryset = InventoryItem.objects.select_related(
            "school", 
            "assigned_to", 
            "category"
        ).order_by('-last_updated')
        
        # Apply role-based filtering FIRST
        queryset = filter_items_by_role(queryset, self.request.user)
        
        # Then apply additional filters from query params
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
            queryset = queryset.filter(
                Q(name__icontains=search) | 
                Q(unique_id__icontains=search) |
                Q(description__icontains=search)
            )
        
        return queryset
    
    def create(self, request, *args, **kwargs):
        """
        Create item with role validation
        - Admin: Can create anywhere
        - Teacher: Can only create at their assigned schools
        """
        user = request.user
        
        if not is_admin_user(user):
            location = request.data.get('location')
            school_id = request.data.get('school')
            
            # Teachers can only add to School location
            if location != 'School':
                return Response(
                    {"detail": "You can only add items to school locations"},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Check if school is in their assigned schools
            allowed_schools = get_user_allowed_schools(user)
            if school_id and int(school_id) not in allowed_schools:
                return Response(
                    {"detail": "You can only add items to your assigned schools"},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        return super().create(request, *args, **kwargs)
    
    def update(self, request, *args, **kwargs):
        """
        Update item with role validation
        - Admin: Can update any item
        - Teacher: Can only update items at their assigned schools
        """
        user = request.user
        item = self.get_object()
        
        if not is_admin_user(user):
            allowed_schools = get_user_allowed_schools(user)
            
            # Check if current item is at allowed school
            if item.school_id not in allowed_schools:
                return Response(
                    {"detail": "You can only edit items at your assigned schools"},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Check if trying to move to non-allowed location/school
            new_location = request.data.get('location', item.location)
            new_school_id = request.data.get('school', item.school_id)
            
            if new_location != 'School':
                return Response(
                    {"detail": "You can only keep items at school locations"},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            if new_school_id and int(new_school_id) not in allowed_schools:
                return Response(
                    {"detail": "You can only move items to your assigned schools"},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        return super().update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        """
        Delete item - Admin only
        - Admin: Can delete any item
        - Teacher: Cannot delete (403)
        """
        if not is_admin_user(request.user):
            return Response(
                {"detail": "Only administrators can delete inventory items"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        return super().destroy(request, *args, **kwargs)
    
    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        """Get history/audit log for an item"""
        item = self.get_object()
        history = []
        
        if item.notes:
            lines = item.notes.split('\n')
            for idx, line in enumerate(lines):
                trimmed = line.strip()
                if trimmed.startswith('['):
                    history.append({
                        'id': idx,
                        'entry': trimmed,
                        'type': 'transfer' if 'transferred' in trimmed.lower() else 'note'
                    })
        
        return Response(history)
    
    @action(detail=False, methods=['get'])
    def export_csv(self, request):
        """
        Export inventory items as CSV
        
        GET /api/inventory/items/export_csv/?school=1&category=2&status=Available
        
        Role-based: Admin gets all, Teacher gets only assigned schools
        """
        import csv
        from django.http import HttpResponse
        from datetime import datetime
        
        # Get filtered queryset (already role-filtered by get_queryset)
        queryset = self.get_queryset()
        
        # Create the HttpResponse object with CSV header
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = f'attachment; filename="inventory_export_{timestamp}.csv"'
        
        writer = csv.writer(response)
        
        # Write header row
        writer.writerow([
            'Unique ID',
            'Name',
            'Category',
            'Status',
            'Location',
            'School',
            'Assigned To',
            'Purchase Value (PKR)',
            'Purchase Date',
            'Serial Number',
            'Description',
            'Last Updated'
        ])
        
        # Write data rows
        for item in queryset:
            assigned_to_name = ''
            if item.assigned_to:
                assigned_to_name = f"{item.assigned_to.first_name} {item.assigned_to.last_name}".strip() or item.assigned_to.username
            
            writer.writerow([
                item.unique_id,
                item.name,
                item.category.name if item.category else 'Uncategorized',
                item.status,
                item.location,
                item.school.name if item.school else '',
                assigned_to_name,
                item.purchase_value or 0,
                item.purchase_date.strftime('%Y-%m-%d') if item.purchase_date else '',
                item.serial_number or '',
                item.description or '',
                item.last_updated.strftime('%Y-%m-%d %H:%M') if item.last_updated else ''
            ])
        
        return response


# ============================================
# SUMMARY & STATISTICS
# ============================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def inventory_summary(request):
    """
    Get inventory summary statistics
    
    Access Control:
    - Admin: Stats for all items
    - Teacher: Stats only for items at assigned schools
    """
    user = request.user
    school_id = request.query_params.get("school")
    location = request.query_params.get("location")
    
    # Start with all items, then filter by role
    items = InventoryItem.objects.all()
    items = filter_items_by_role(items, user)
    
    # Apply additional filters
    if school_id:
        items = items.filter(school_id=school_id)
    if location:
        items = items.filter(location=location)
    
    # Calculate statistics
    summary = {
        "total": items.count(),
        "total_value": float(items.aggregate(total=Sum('purchase_value'))['total'] or 0),
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
# USER CONTEXT (for frontend role checks)
# ============================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_user_inventory_context(request):
    """
    Get current user's inventory access context
    
    Returns:
    - role: 'admin' or 'teacher'
    - is_admin: boolean
    - allowed_schools: list of school IDs (null for admin = all)
    - can_delete: boolean
    - can_manage_categories: boolean
    """
    user = request.user
    admin = is_admin_user(user)
    allowed_schools = get_user_allowed_schools(user)
    
    # Get school details for teachers
    allowed_school_details = []
    if not admin and allowed_schools:
        from students.models import School
        schools = School.objects.filter(id__in=allowed_schools)
        allowed_school_details = [
            {"id": s.id, "name": s.name}
            for s in schools
        ]
    
    return Response({
        "user_id": user.id,
        "username": user.username,
        "name": f"{user.first_name} {user.last_name}".strip() or user.username,
        "role": "admin" if admin else "teacher",
        "is_admin": admin,
        "allowed_schools": allowed_schools,  # None for admin, list for teacher
        "allowed_school_details": allowed_school_details,
        "can_delete": admin,
        "can_manage_categories": admin,
        "can_access_headquarters": admin,
        "can_access_unassigned": admin,
    })


# ============================================
# USER LIST FOR ASSIGNMENT
# ============================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def users_assigned_to_school(request):
    """
    GET /api/inventory/assigned-users/
    
    Role-based user list for assignment dropdown:
    - Admin: See all Teachers (exclude Students)
    - Teacher: See only themselves
    """
    user = request.user

    try:
        if is_admin_user(user):
            # Admin sees only Teachers (not Students)
            # Filter by role if the field exists, otherwise get all non-students
            if hasattr(User, 'role'):
                users = User.objects.filter(
                    is_active=True,
                    role='Teacher'
                ).order_by('first_name', 'last_name', 'username')
            else:
                # Fallback if role field doesn't exist - get all staff
                users = User.objects.filter(
                    is_active=True,
                    is_staff=False,
                    is_superuser=False
                ).order_by('first_name', 'last_name', 'username')
        else:
            # Teachers see only themselves
            users = User.objects.filter(id=user.id)

        data = [
            {
                "id": u.id,
                "name": f"{u.first_name} {u.last_name}".strip() or u.username,
                "username": u.username,
            }
            for u in users
        ]

        return Response(data, status=status.HTTP_200_OK)
    
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error in users_assigned_to_school: {str(e)}")
        return Response(
            {"error": "Failed to fetch users", "detail": str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


# Alias for URL import compatibility
get_assigned_users = users_assigned_to_school


# ============================================
# SCHOOLS LIST (filtered by role)
# ============================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_allowed_schools(request):
    """
    Get schools the current user can access
    
    - Admin: All schools
    - Teacher: Only assigned schools
    """
    from students.models import School
    
    user = request.user
    
    if is_admin_user(user):
        schools = School.objects.all().order_by('name')
    else:
        allowed_ids = get_user_allowed_schools(user)
        schools = School.objects.filter(id__in=allowed_ids).order_by('name')
    
    data = [
        {"id": s.id, "name": s.name}
        for s in schools
    ]
    
    return Response(data)


# ============================================
# BULK OPERATIONS
# ============================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def bulk_update_status(request):
    """Bulk update status for multiple items (respects role)"""
    user = request.user
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
    
    # Get items filtered by role
    items = InventoryItem.objects.filter(id__in=item_ids)
    items = filter_items_by_role(items, user)
    
    updated = items.update(status=new_status)
    
    return Response({"updated_count": updated})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def bulk_assign(request):
    """Bulk assign items to a user (respects role)"""
    current_user = request.user
    item_ids = request.data.get('item_ids', [])
    user_id = request.data.get('assigned_to')
    
    if not item_ids:
        return Response(
            {"detail": "item_ids is required"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Teachers can only assign to themselves
    if not is_admin_user(current_user):
        if user_id and int(user_id) != current_user.id:
            return Response(
                {"detail": "You can only assign items to yourself"},
                status=status.HTTP_403_FORBIDDEN
            )
    
    assign_to_user = None
    if user_id:
        try:
            assign_to_user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response(
                {"detail": "User not found"},
                status=status.HTTP_404_NOT_FOUND
            )
    
    # Get items filtered by role
    items = InventoryItem.objects.filter(id__in=item_ids)
    items = filter_items_by_role(items, current_user)
    
    count = 0
    for item in items:
        item.assigned_to = assign_to_user
        if assign_to_user:
            item.status = 'Assigned'
        item.save()
        count += 1
    
    return Response({"updated_count": count})


# ============================================
# BULK CREATE
# ============================================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def bulk_create_items(request):
    """
    Create multiple identical items at once.
    
    Access Control:
    - Admin: Can create anywhere
    - Teacher: Can only create at assigned schools
    """
    import logging
    logger = logging.getLogger(__name__)
    
    user = request.user
    logger.info(f"Bulk create request by {user.username}: {request.data}")
    
    # Role validation for teachers
    if not is_admin_user(user):
        location = request.data.get('location')
        school_id = request.data.get('school')
        
        if location != 'School':
            return Response(
                {"detail": "You can only add items to school locations"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        allowed_schools = get_user_allowed_schools(user)
        if school_id and int(school_id) not in allowed_schools:
            return Response(
                {"detail": "You can only add items to your assigned schools"},
                status=status.HTTP_403_FORBIDDEN
            )
    
    quantity = request.data.get('quantity', 1)
    
    # Validate quantity
    try:
        quantity = int(quantity)
        if quantity < 1:
            return Response(
                {"detail": "Quantity must be at least 1"},
                status=status.HTTP_400_BAD_REQUEST
            )
        if quantity > 500:
            return Response(
                {"detail": "Maximum quantity is 500 items per request"},
                status=status.HTTP_400_BAD_REQUEST
            )
    except (ValueError, TypeError):
        return Response(
            {"detail": "Invalid quantity value"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Prepare item data (without quantity)
    item_data = {k: v for k, v in request.data.items() if k != 'quantity'}
    
    # Validate with serializer first
    serializer = InventoryItemSerializer(data=item_data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    # Create items
    created_items = []
    errors = []
    
    for i in range(quantity):
        try:
            item_serializer = InventoryItemSerializer(data=item_data)
            if item_serializer.is_valid():
                item = item_serializer.save()
                created_items.append({
                    "id": item.id,
                    "unique_id": item.unique_id,
                    "name": item.name,
                })
            else:
                errors.append({"index": i, "errors": item_serializer.errors})
        except Exception as e:
            logger.error(f"Error creating item {i+1}: {str(e)}")
            errors.append({"index": i, "error": str(e)})
    
    response_data = {
        "created_count": len(created_items),
        "requested_count": quantity,
        "items": created_items,
    }
    
    if errors:
        response_data["errors"] = errors
        response_data["message"] = f"Created {len(created_items)} of {quantity} items"
        return Response(response_data, status=status.HTTP_207_MULTI_STATUS)
    
    logger.info(f"Successfully created {len(created_items)} items")
    return Response(response_data, status=status.HTTP_201_CREATED)