# inventory/admin.py

from django.contrib import admin
from .models import InventoryItem

@admin.register(InventoryItem)
class InventoryItemAdmin(admin.ModelAdmin):
    list_display = ('name', 'unique_id', 'school', 'status', 'assigned_to', 'purchase_value')
    search_fields = ('name', 'unique_id', 'assigned_to__username')
    list_filter = ('school', 'status')
