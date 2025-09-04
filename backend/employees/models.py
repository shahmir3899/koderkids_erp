# Create your models here.
from django.db import models
from django.core.validators import MinValueValidator
from students.models import CustomUser, School  # Import from students app
from decimal import Decimal
basic_salary = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, validators=[MinValueValidator(Decimal('0'))])


class TeacherEarning(models.Model):
    teacher = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        limit_choices_to={'role': 'Teacher'},
        related_name='earnings'
    )
    category = models.CharField(max_length=50)  # e.g., "Bonus"
    amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, validators=[MinValueValidator(0)])
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.category} for {self.teacher.get_full_name()}"

class TeacherDeduction(models.Model):
    teacher = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        limit_choices_to={'role': 'Teacher'},
        related_name='deductions'
    )
    category = models.CharField(max_length=50)  # e.g., "Tax"
    amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, validators=[MinValueValidator(0)])
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.category} for {self.teacher.get_full_name()}"
    
class TeacherProfile(models.Model):
    user = models.OneToOneField(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='teacher_profile',
        limit_choices_to={'role': 'Teacher'}  # Restrict to users with role 'Teacher'
    )
    title = models.CharField(max_length=100, blank=True, null=True)  # e.g., "Senior Teacher"
    date_of_joining = models.DateField(blank=True, null=True)  # e.g., "2025-09-01"
    basic_salary = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00,
        validators=[MinValueValidator(0)],
        help_text="Monthly salary in PKR"
    )
    bank_name = models.CharField(max_length=100, blank=True, null=True)  # e.g., "Habib Bank Limited"
    account_number = models.CharField(max_length=50, blank=True, null=True)  # e.g., "1234567890"

    def __str__(self):
        return f"Profile for {self.user.get_full_name()} ({self.user.username})"

    class Meta:
        verbose_name = "Teacher Profile"
        verbose_name_plural = "Teacher Profiles"

    