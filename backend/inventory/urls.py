# inventory/urls.py
# ============================================
# INVENTORY URL CONFIGURATION - With RBAC
# ============================================

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    InventoryItemViewSet,
    InventoryCategoryViewSet,
    inventory_summary,
    bulk_create_items,
    bulk_update_status,
    bulk_assign,
    users_assigned_to_school,
    get_allowed_schools,
    get_user_inventory_context,
)

from .pdf_views import (
    generate_transfer_receipt,
    generate_inventory_list_report,
    generate_item_detail_report,
    get_employees_list,
)

router = DefaultRouter()
router.register(r'items', InventoryItemViewSet, basename='inventory-item')
router.register(r'categories', InventoryCategoryViewSet, basename='inventory-category')

urlpatterns = [
    # Router URLs
    path('', include(router.urls)),
    
    # Summary/Dashboard
    path('summary/', inventory_summary, name='inventory-summary'),
    
    # User Context (for frontend RBAC)
    path('user-context/', get_user_inventory_context, name='inventory-user-context'),
    
    # Users & Schools
    path('assigned-users/', users_assigned_to_school, name='inventory-assigned-users'),
    path('allowed-schools/', get_allowed_schools, name='inventory-allowed-schools'),
    path('employees/', get_employees_list, name='inventory-employees'),
    
    # Bulk Operations
    path('bulk-create/', bulk_create_items, name='inventory-bulk-create'),
    path('bulk-update-status/', bulk_update_status, name='inventory-bulk-update-status'),
    path('bulk-assign/', bulk_assign, name='inventory-bulk-assign'),
    
    # PDF Reports
    path('reports/transfer-receipt/', generate_transfer_receipt, name='inventory-transfer-receipt'),
    path('reports/inventory-list/', generate_inventory_list_report, name='inventory-list-report'),
    path('reports/item-detail/<int:item_id>/', generate_item_detail_report, name='inventory-item-detail'),
]