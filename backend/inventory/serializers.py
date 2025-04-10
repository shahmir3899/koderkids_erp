# inventory/serializers.py

from rest_framework import serializers
from .models import InventoryItem

class InventoryItemSerializer(serializers.ModelSerializer):
    school_name = serializers.CharField(source='school.name', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True)

    class Meta:
        model = InventoryItem
        fields = [
            'id',
            'name',
            'unique_id',
            'description',
            'school',
            'school_name',
            'assigned_to',
            'assigned_to_name',
            'status',
            'purchase_value',
            'purchase_date',
            'last_updated',
        ]
        read_only_fields = ['last_updated']
