# inventory/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import InventoryItemViewSet, inventory_categories

router = DefaultRouter()
router.register(r'items', InventoryItemViewSet, basename='inventory-item')



urlpatterns = [
    path("categories/", inventory_categories),
    path('', include(router.urls)),
]
