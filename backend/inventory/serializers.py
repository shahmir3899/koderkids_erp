# inventory/serializers.py
# ============================================
# INVENTORY SERIALIZERS - Complete Version
# ============================================

from rest_framework import serializers
from .models import InventoryCategory, InventoryItem


class InventoryCategorySerializer(serializers.ModelSerializer):
    """Serializer for inventory categories"""
    item_count = serializers.SerializerMethodField()
    
    class Meta:
        model = InventoryCategory
        fields = ['id', 'name', 'description', 'item_count']
    
    def get_item_count(self, obj):
        return obj.items.count()


class InventoryItemSerializer(serializers.ModelSerializer):
    """Serializer for inventory items"""
    
    # Read-only fields from related models
    category_name = serializers.CharField(
        source='category.name', 
        read_only=True, 
        default='Uncategorized'
    )
    school_name = serializers.CharField(
        source='school.name', 
        read_only=True,
        default=None
    )
    assigned_to_name = serializers.SerializerMethodField()
    
    class Meta:
        model = InventoryItem
        fields = [
            # Primary key
            'id',
            # Basic info
            'name',
            'unique_id',
            'description',
            # Category (FK ID for write, name for read)
            'category',
            'category_name',
            # Location
            'location',
            'school',
            'school_name',
            # Assignment
            'assigned_to',
            'assigned_to_name',
            'status',
            # Purchase info
            'purchase_value',
            'purchase_date',
            # Additional fields
            'serial_number',
            'warranty_expiry',
            'notes',
            # Timestamps
            'created_at',
            'last_updated',
        ]
        read_only_fields = ['unique_id', 'created_at', 'last_updated']
    
    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            full_name = f"{obj.assigned_to.first_name} {obj.assigned_to.last_name}".strip()
            return full_name if full_name else obj.assigned_to.username
        return 'Unassigned'
    
    def validate(self, data):
        """Custom validation"""
        # If location is 'School', school is required
        location = data.get('location', self.instance.location if self.instance else 'School')
        school = data.get('school', self.instance.school if self.instance else None)
        
        if location == 'School' and not school:
            raise serializers.ValidationError({
                'school': 'School is required when location is "School"'
            })
        
        # If location is not 'School', clear school
        if location != 'School':
            data['school'] = None
        
        return data


class InventoryItemListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list views"""
    category_name = serializers.CharField(
        source='category.name', 
        read_only=True, 
        default='Uncategorized'
    )
    school_name = serializers.CharField(
        source='school.name', 
        read_only=True,
        default=None
    )
    assigned_to_name = serializers.SerializerMethodField()
    
    class Meta:
        model = InventoryItem
        fields = [
            'id',
            'name',
            'unique_id',
            'category_name',
            'location',
            'school_name',
            'status',
            'purchase_value',
            'assigned_to_name',
            'last_updated',
        ]
    
    def get_assigned_to_name(self, obj):
        if obj.assigned_to:
            full_name = f"{obj.assigned_to.first_name} {obj.assigned_to.last_name}".strip()
            return full_name if full_name else obj.assigned_to.username
        return None