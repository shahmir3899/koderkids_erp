# inventory/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import InventoryItemViewSet, inventory_categories, inventory_summary, users_assigned_to_school

router = DefaultRouter()
router.register(r'items', InventoryItemViewSet, basename='inventory-item')



urlpatterns = [
    path("categories/", inventory_categories),
    path("assigned-users/", users_assigned_to_school),
    path("inventory/summary/", inventory_summary),
    path('', include(router.urls)),
]
