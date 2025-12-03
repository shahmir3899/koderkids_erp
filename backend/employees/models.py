# ============================================
# EMPLOYEES MODELS - Updated with Employee ID & Notifications
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
    Extended profile for teachers with auto-generated employee ID
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
    
    user = models.OneToOneField(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='teacher_profile',
        limit_choices_to={'role': 'Teacher'}
    )
    
    # Auto-generated Employee ID (KK-T-025, KK-T-026, etc.)
    employee_id = models.CharField(
        max_length=20, 
        unique=True, 
        blank=True, 
        null=True,
        help_text="Auto-generated employee ID (e.g., KK-T-025)"
    )
    
    # Profile Photo URL (stored in Supabase)
    profile_photo_url = models.URLField(
        max_length=500, 
        blank=True, 
        null=True,
        help_text="URL to profile photo in Supabase storage"
    )
    
    # Personal Info
    title = models.CharField(max_length=100, blank=True, null=True)  # e.g., "Senior Teacher"
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
        verbose_name = "Teacher Profile"
        verbose_name_plural = "Teacher Profiles"

    def __str__(self):
        return f"{self.employee_id or 'No ID'} - {self.user.get_full_name()} ({self.user.username})"

    def save(self, *args, **kwargs):
        # Auto-generate employee_id if not set
        if not self.employee_id:
            self.employee_id = self.generate_employee_id()
        super().save(*args, **kwargs)

    @classmethod
    def generate_employee_id(cls):
        """
        Generate employee ID in format: KK-T-XXX (starting from 025)
        """
        # Get the last employee ID
        last_profile = cls.objects.filter(
            employee_id__isnull=False
        ).order_by('-employee_id').first()
        
        if last_profile and last_profile.employee_id:
            try:
                # Extract the number from KK-T-XXX
                last_number = int(last_profile.employee_id.split('-')[-1])
                new_number = last_number + 1
            except (ValueError, IndexError):
                new_number = 25  # Start from 25 if parsing fails
        else:
            new_number = 25  # Start from 25
        
        return f"KK-T-{new_number:03d}"

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
    category = models.CharField(max_length=50)  # e.g., "Bonus", "Travel Allowance"
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
    category = models.CharField(max_length=50)  # e.g., "Loan", "Advance"
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
# SIGNALS - Auto-create TeacherProfile when Teacher user is created
# ============================================

@receiver(post_save, sender=CustomUser)
def create_teacher_profile(sender, instance, created, **kwargs):
    """
    Automatically create TeacherProfile when a new Teacher user is created
    """
    if instance.role == 'Teacher':
        TeacherProfile.objects.get_or_create(user=instance)


@receiver(post_save, sender=CustomUser)
def save_teacher_profile(sender, instance, **kwargs):
    """
    Save TeacherProfile when user is saved
    """
    if instance.role == 'Teacher' and hasattr(instance, 'teacher_profile'):
        instance.teacher_profile.save()