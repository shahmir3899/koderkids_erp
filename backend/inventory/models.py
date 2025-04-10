# inventory/models.py

from django.db import models
from django.utils.timezone import now
from students.models import School
from django.contrib.auth import get_user_model

User = get_user_model()

class InventoryCategory(models.Model):
    name = models.CharField(max_length=50, unique=True)

    def __str__(self):
        return self.name
    


class InventoryItem(models.Model):
    STATUS_CHOICES = [
        ('Available', 'Available'),
        ('Assigned', 'Assigned'),
        ('Damaged', 'Damaged'),
        ('Lost', 'Lost'),
        ('Disposed', 'Disposed'),
    ]

    name = models.CharField(max_length=100)
    unique_id = models.CharField(max_length=50, unique=True, blank=True)
    description = models.TextField(blank=True)
    school = models.ForeignKey(School, on_delete=models.CASCADE)
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Available')
    purchase_value = models.DecimalField(max_digits=10, decimal_places=2)
    purchase_date = models.DateField(null=True, blank=True)
    category = models.ForeignKey(InventoryCategory, on_delete=models.SET_NULL, null=True, blank=True)

    last_updated = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.unique_id and self.school and self.name:
            year = (self.purchase_date or now().date()).year % 100
            school_code = (
                ''.join(word[0] for word in self.school.name.split())
                if len(self.school.name.split()) > 1 else self.school.name.upper()
            )
            item_code = ''.join(filter(str.isalnum, self.name.upper()))[:3]

            base_prefix = f"{year}-{school_code}-{item_code}"

            existing = InventoryItem.objects.filter(unique_id__startswith=base_prefix).count() + 1
            suffix = f"{existing:03d}"
            self.unique_id = f"{base_prefix}-{suffix}"

        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} [{self.unique_id}] - {self.school.name}"




