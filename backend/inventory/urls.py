# inventory/urls.py
# ============================================
# INVENTORY URL ROUTES - Complete Version
# ============================================

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    InventoryItemViewSet,
    inventory_categories,
    inventory_category_detail,
    inventory_summary,
    users_assigned_to_school,
    bulk_update_status,
    bulk_assign,
)

# Router for ViewSet
router = DefaultRouter()
router.register(r'items', InventoryItemViewSet, basename='inventory-item')

urlpatterns = [
    # Category endpoints
    path("categories/", inventory_categories, name="inventory-categories"),
    path("categories/<int:pk>/", inventory_category_detail, name="inventory-category-detail"),
    
    # Summary/Statistics
    path("summary/", inventory_summary, name="inventory-summary"),
    
    # Users for assignment dropdown
    path("assigned-users/", users_assigned_to_school, name="inventory-assigned-users"),
    
    # Bulk operations
    path("bulk-update-status/", bulk_update_status, name="inventory-bulk-status"),
    path("bulk-assign/", bulk_assign, name="inventory-bulk-assign"),
    
    # ViewSet routes (items CRUD)
    path('', include(router.urls)),
]
