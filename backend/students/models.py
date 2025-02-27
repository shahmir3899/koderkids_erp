from django.db import models
from django.core.validators import MinValueValidator
from django.contrib.auth.models import AbstractUser
from django.db import models

class School(models.Model):
    name = models.CharField(max_length=255, unique=True)
    location = models.CharField(max_length=255, blank=True, null=True)

    def __str__(self):
        return self.name


class CustomUser(AbstractUser):
    ROLE_CHOICES = [
        ('Admin', 'Admin'),
        ('Teacher', 'Teacher'),
        ('Student', 'Student'),
    ]
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='Student')
    assigned_schools = models.ManyToManyField('students.School', blank=True, related_name="teachers")  # ✅ Assign multiple schools
    # ✅ Fix Foreign Key issue by ensuring proper token relations
    groups = models.ManyToManyField(
        'auth.Group',
        related_name="custom_user_groups",
        blank=True
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        related_name="custom_user_permissions",
        blank=True
    )

    def __str__(self):
        return f"{self.username} ({self.role})"


class Student(models.Model):
    STATUS_CHOICES = [
        ('Active', 'Active'),
        ('Pass Out', 'Pass Out'),
        ('Left', 'Left'),
        ('Suspended', 'Suspended'),
        ('Expelled', 'Expelled'),
    ]

    GENDER_CHOICES = [
        ('Male', 'Male'),
        ('Female', 'Female'),
        ('Other', 'Other'),
    ]

    date_of_registration = models.DateField(auto_now_add=True)
    reg_num = models.CharField(max_length=50, unique=True, blank=False)
    name = models.CharField(max_length=100, default="Unknown")
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, default='Male')

    # ✅ Convert school from CharField to ForeignKey
    school = models.ForeignKey('students.School', on_delete=models.CASCADE, related_name="students")

    monthly_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, validators=[MinValueValidator(0)])
    date_of_birth = models.DateField(blank=True, null=True)
    student_class = models.CharField(max_length=10, default="PlayGroup")
    phone = models.CharField(max_length=20, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Active')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Student"
        verbose_name_plural = "Students"
        ordering = ['name']

    def __str__(self):
        return f"{self.name} ({self.reg_num})"

    
class Fee(models.Model):
    student_id = models.BigIntegerField()  # Keep student ID
    student_name = models.CharField(max_length=100, default="Unknown")  # New Field
    school = models.CharField(max_length=200, default="Unknown")  # New Field
    student_class = models.CharField(max_length=50, default="Unknown")  # New Field
    monthly_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)  # New Field

    month = models.CharField(max_length=10)  # E.g., "Feb-2025"
    total_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    paid_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    balance_due = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    payment_date = models.DateField(null=True, blank=True)

    STATUS_CHOICES = [
        ('Paid', 'Paid'),
        ('Pending', 'Pending'),
        ('Overdue', 'Overdue'),
    ]
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='Pending')

    def __str__(self):
        return f"{self.student_name} - {self.month}"

class Attendance(models.Model):
    student = models.ForeignKey('students.Student', on_delete=models.CASCADE)
    session_date = models.DateField()
    status = models.CharField(max_length=10, choices=[('Present', 'Present'), ('Absent', 'Absent')])
    teacher = models.ForeignKey('students.CustomUser', on_delete=models.CASCADE)
    lesson_plan = models.ForeignKey('students.LessonPlan', on_delete=models.CASCADE, null=True, blank=True)  # Link to Lesson Plan
    achieved_topic = models.TextField(null=True, blank=True)  # ✅ This must exist

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('student', 'session_date')  # Prevent duplicate attendance records

class LessonPlan(models.Model):
    session_date = models.DateField()
    teacher = models.ForeignKey('students.CustomUser', on_delete=models.CASCADE)
    school = models.ForeignKey('students.School', on_delete=models.CASCADE)
    student_class = models.CharField(max_length=50)  # Class name (e.g., Grade 5)
    planned_topic = models.TextField()  # Auto-filled lesson
    achieved_topic = models.TextField(blank=True, null=True)  # Updated after session

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('session_date', 'teacher', 'student_class')  # Prevent duplicate lesson plans

    def __str__(self):
        return f"{self.session_date} - {self.student_class} - {self.teacher.username}"


class StudentImage(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE)  # Links image to a student
    session_date = models.DateField()  # Date when the image was uploaded
    image_url = models.URLField()  # Stores the image URL

    def __str__(self):
        return f"Image for {self.student.name} on {self.session_date}"
