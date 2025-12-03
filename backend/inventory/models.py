# inventory/models.py
# ============================================
# INVENTORY MODELS - Complete Version
# ============================================

from django.db import models
from django.utils.timezone import now
from students.models import School
from django.contrib.auth import get_user_model

User = get_user_model()


class InventoryCategory(models.Model):
    """Category for inventory items (e.g., Electronics, Furniture, etc.)"""
    name = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True, null=True)
    
    class Meta:
        verbose_name_plural = "Inventory Categories"
        ordering = ['name']

    def __str__(self):
        return self.name


class InventoryItem(models.Model):
    """Main inventory item model"""
    
    STATUS_CHOICES = [
        ('Available', 'Available'),
        ('Assigned', 'Assigned'),
        ('Damaged', 'Damaged'),
        ('Lost', 'Lost'),
        ('Disposed', 'Disposed'),
    ]

    LOCATION_CHOICES = [
        ('School', 'School'),
        ('Headquarters', 'Headquarters'),
        ('Unassigned', 'Unassigned'),
    ]

    # Basic Info
    name = models.CharField(max_length=100)
    unique_id = models.CharField(max_length=50, unique=True, blank=True)
    description = models.TextField(blank=True, null=True)
    
    # Category
    category = models.ForeignKey(
        InventoryCategory, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='items'
    )
    
    # Location
    location = models.CharField(
        max_length=20, 
        choices=LOCATION_CHOICES, 
        default='School'
    )
    school = models.ForeignKey(
        School, 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True,
        related_name='inventory_items'
    )
    
    # Assignment
    assigned_to = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name='assigned_inventory'
    )
    status = models.CharField(
        max_length=20, 
        choices=STATUS_CHOICES, 
        default='Available'
    )
    
    # Purchase Info
    purchase_value = models.DecimalField(max_digits=12, decimal_places=2)
    purchase_date = models.DateField(null=True, blank=True)
    
    # Additional fields (optional)
    serial_number = models.CharField(max_length=100, blank=True, null=True)
    warranty_expiry = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True, null=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-last_updated']
        verbose_name = "Inventory Item"
        verbose_name_plural = "Inventory Items"

    def save(self, *args, **kwargs):
        # Auto-generate unique_id if not set
        if not self.unique_id and self.name:
            year = (self.purchase_date or now().date()).year % 100
            location_code = self.location.upper()[:3] if self.location else 'UNK'
            
            # School code
            if self.school and self.school.name:
                words = self.school.name.split()
                if len(words) > 1:
                    school_code = ''.join(word[0] for word in words).upper()
                else:
                    school_code = self.school.name.upper()[:3]
            else:
                school_code = 'GEN'
            
            # Item code from name
            item_code = ''.join(filter(str.isalnum, self.name.upper()))[:3]
            
            base_prefix = f"{year}-{location_code}-{school_code}-{item_code}"
            
            # Find next sequence number
            existing = InventoryItem.objects.filter(
                unique_id__startswith=base_prefix
            ).count() + 1
            suffix = f"{existing:03d}"
            
            self.unique_id = f"{base_prefix}-{suffix}"

        # Auto-set status to 'Assigned' if assigned_to is set
        if self.assigned_to and self.status == 'Available':
            self.status = 'Assigned'
        
        # Clear school if location is not 'School'
        if self.location != 'School':
            self.school = None

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} [{self.unique_id}] - {self.location}"