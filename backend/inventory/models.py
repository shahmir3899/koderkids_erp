# inventory/models.py

from django.db import models
from django.utils.timezone import now
from students.models import School
from django.contrib.auth import get_user_model

User = get_user_model()

class InventoryItem(models.Model):
    STATUS_CHOICES = [
        ('Available', 'Available'),
        ('Assigned', 'Assigned'),
        ('Damaged', 'Damaged'),
        ('Lost', 'Lost'),
        ('Disposed', 'Disposed'),
    ]

    name = models.CharField(max_length=100)
    unique_id = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    school = models.ForeignKey(School, on_delete=models.CASCADE)
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Available')
    purchase_value = models.DecimalField(max_digits=10, decimal_places=2)
    purchase_date = models.DateField(null=True, blank=True)
    last_updated = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} [{self.unique_id}] - {self.school.name}"
