# ============================================
# EMPLOYEES MODELS - Updated with Employee ID & Notifications
# NOW SUPPORTS BOTH TEACHERS AND ADMINS
# ============================================

from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.validators import MinValueValidator
from students.models import CustomUser, School
from decimal import Decimal
import datetime


class TeacherProfile(models.Model):
    """
    Extended profile for employees (Teachers and Admins)
    Auto-generates employee ID based on role
    """
    GENDER_CHOICES = [
        ('Male', 'Male'),
        ('Female', 'Female'),
        ('Other', 'Other'),
    ]
    
    BLOOD_GROUP_CHOICES = [
        ('A+', 'A+'),
        ('A-', 'A-'),
        ('B+', 'B+'),
        ('B-', 'B-'),
        ('AB+', 'AB+'),
        ('AB-', 'AB-'),
        ('O+', 'O+'),
        ('O-', 'O-'),
    ]
    
    # UPDATED: Now supports both Teacher and Admin roles
    user = models.OneToOneField(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='teacher_profile',
        limit_choices_to={'role__in': ['Teacher', 'Admin']}
    )
    
    # Auto-generated Employee ID
    # Teachers: KK-T-025, KK-T-026, etc.
    # Admins: KK-A-001, KK-A-002, etc.
    employee_id = models.CharField(
        max_length=20, 
        unique=True, 
        blank=True, 
        null=True,
        help_text="Auto-generated employee ID (e.g., KK-T-025 or KK-A-001)"
    )
    
    # Profile Photo URL (stored in Supabase)
    profile_photo_url = models.URLField(
        max_length=500, 
        blank=True, 
        null=True,
        help_text="URL to profile photo in Supabase storage"
    )
    
    # Personal Info
    title = models.CharField(max_length=100, blank=True, null=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, blank=True, null=True)
    blood_group = models.CharField(max_length=5, choices=BLOOD_GROUP_CHOICES, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    
    # Employment Info
    date_of_joining = models.DateField(blank=True, null=True)
    
    # Financial Info
    basic_salary = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00,
        validators=[MinValueValidator(Decimal('0'))],
        help_text="Monthly salary in PKR"
    )
    bank_name = models.CharField(max_length=100, blank=True, null=True)
    account_number = models.CharField(max_length=50, blank=True, null=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Employee Profile"
        verbose_name_plural = "Employee Profiles"

    def __str__(self):
        return f"{self.employee_id or 'No ID'} - {self.user.get_full_name()} ({self.user.username})"

    def save(self, *args, **kwargs):
        # Auto-generate employee_id if not set
        if not self.employee_id:
            self.employee_id = self.generate_employee_id()
        super().save(*args, **kwargs)

    def generate_employee_id(self):
        """
        Generate employee ID based on role:
        - Teachers: KK-T-XXX (starting from 025)
        - Admins: KK-A-XXX (starting from 001)
        """
        role = self.user.role
        
        # Determine prefix and start number based on role
        if role == 'Admin':
            prefix = 'KK-A'
            start_number = 1
        else:  # Teacher (default)
            prefix = 'KK-T'
            start_number = 25
        
        # Get the last employee ID with same prefix
        last_profile = TeacherProfile.objects.filter(
            employee_id__startswith=prefix
        ).order_by('-employee_id').first()
        
        if last_profile and last_profile.employee_id:
            try:
                # Extract the number from KK-X-XXX
                last_number = int(last_profile.employee_id.split('-')[-1])
                new_number = last_number + 1
            except (ValueError, IndexError):
                new_number = start_number
        else:
            new_number = start_number
        
        return f"{prefix}-{new_number:03d}"

    @property
    def full_name(self):
        return self.user.get_full_name() or self.user.username


class TeacherEarning(models.Model):
    """
    Additional earnings for teachers (bonuses, allowances, etc.)
    """
    teacher = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        limit_choices_to={'role': 'Teacher'},
        related_name='earnings'
    )
    category = models.CharField(max_length=50)
    amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0.00, 
        validators=[MinValueValidator(Decimal('0'))]
    )
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.category}: PKR {self.amount} for {self.teacher.get_full_name()}"


class TeacherDeduction(models.Model):
    """
    Deductions from teacher salary (loans, advances, etc.)
    """
    teacher = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        limit_choices_to={'role': 'Teacher'},
        related_name='deductions'
    )
    category = models.CharField(max_length=50)
    amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0.00, 
        validators=[MinValueValidator(Decimal('0'))]
    )
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.category}: PKR {self.amount} for {self.teacher.get_full_name()}"


class Notification(models.Model):
    """
    In-app notifications for users
    """
    NOTIFICATION_TYPES = [
        ('info', 'Information'),
        ('warning', 'Warning'),
        ('success', 'Success'),
        ('error', 'Error'),
        ('message', 'Message'),
        ('reminder', 'Reminder'),
    ]
    
    recipient = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    sender = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sent_notifications'
    )
    
    title = models.CharField(max_length=200)
    message = models.TextField()
    notification_type = models.CharField(
        max_length=20, 
        choices=NOTIFICATION_TYPES, 
        default='info'
    )
    
    # Link to related object (optional)
    related_url = models.URLField(blank=True, null=True)
    
    # Status
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Notification"
        verbose_name_plural = "Notifications"

    def __str__(self):
        return f"{self.title} - {self.recipient.username}"

    def mark_as_read(self):
        if not self.is_read:
            self.is_read = True
            self.read_at = datetime.datetime.now()
            self.save()


# ============================================
# SIGNALS - Auto-create TeacherProfile for both Teachers and Admins
# ============================================

@receiver(post_save, sender=CustomUser)
def create_employee_profile(sender, instance, created, **kwargs):
    """
    Automatically create TeacherProfile when a new Teacher or Admin user is created
    """
    if instance.role in ['Teacher', 'Admin']:
        TeacherProfile.objects.get_or_create(user=instance)


@receiver(post_save, sender=CustomUser)
def save_employee_profile(sender, instance, **kwargs):
    """
    Save TeacherProfile when user is saved (for both Teachers and Admins)
    """
    if instance.role in ['Teacher', 'Admin'] and hasattr(instance, 'teacher_profile'):
        instance.teacher_profile.save()