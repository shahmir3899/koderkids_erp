from django.db import models
from django.core.validators import MinValueValidator
from django.core.exceptions import ObjectDoesNotExist

from django.contrib.auth.models import AbstractUser
from django.db import models
from books.models import Topic  # NEW: Import Topic at the top (add this line)



class School(models.Model):
    name = models.CharField(max_length=255, unique=True)
    location = models.CharField(max_length=255, blank=True, null=True)
    # ✅ ADD THESE NEW FIELDS:
    address = models.TextField(blank=True, null=True)  # More detailed address
    logo = models.URLField(blank=True, null=True)  # Supabase URL for logo
    latitude = models.DecimalField(max_digits=10, decimal_places=7, blank=True, null=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, blank=True, null=True)
    contact_email = models.EmailField(blank=True, null=True)
    contact_phone = models.CharField(max_length=20, blank=True, null=True)
    established_date = models.DateField(blank=True, null=True)
    total_capacity = models.IntegerField(blank=True, null=True, validators=[MinValueValidator(1)])
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name
    class Meta:
        ordering = ['name']


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
    user = models.OneToOneField('students.CustomUser', on_delete=models.CASCADE, null=True, blank=True, related_name='student_profile')
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
    school = models.ForeignKey("students.School", on_delete=models.SET_NULL, null=True)
    student_class = models.CharField(max_length=50, default="Unknown")  # New Field
    monthly_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)  # New Field
    date_received = models.DateField(null=True, blank=True)


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
    session_date   = models.DateField()
    teacher        = models.ForeignKey('students.CustomUser', on_delete=models.CASCADE)
    school         = models.ForeignKey('students.School', on_delete=models.CASCADE)
    student_class  = models.CharField(max_length=50)

    planned_topic = models.TextField(blank=True, null=True)
    #achieved_topic = models.TextField(blank=True, null=True),

    planned_topics = models.ManyToManyField(
    'books.Topic',
    blank=True,
    related_name='planned_lessons',
    #through='LessonTopicAssociation',  # Optional: Custom through model if needed for extra fields later
     )
    achieved_topic = models.TextField(blank=True, null=True)
    created_at     = models.DateTimeField(auto_now_add=True)
    updated_at     = models.DateTimeField(auto_now_add=True)
    class Meta:
        unique_together = (
            ('session_date', 'teacher', 'student_class', 'school'),
        )


    def _build_planned_topic_from_fks(self) -> str | None:
        """
        Returns concatenated formatted topics:
            Book <title>
            Chapter <chapter-code>
            Topic: <topic-code> <topic-title>
            ---
            [Next topic...]
        """
        topics = self.planned_topics.select_related('book', 'parent__book').all()
        if not topics.exists():
            return None

        formatted_topics = []
        for topic in topics:
            # ----- 1. Book title (direct or via parent) -----
            book = topic.book or (topic.parent.book if topic.parent else None)
            book_title = getattr(book, "title", "Unknown") or "Unknown"

            # ----- 2. Chapter code (only if parent is a chapter) -----
            chapter_code = ""
            if topic.parent and getattr(topic.parent, "type", "") == "chapter":
                chapter_code = getattr(topic.parent, "code", "").strip()

            # ----- 3. Topic line – use only the *first two* parts of code -----
            raw_code = getattr(topic, "code", "").strip()
            # Split on '.' and keep at most the first two parts (e.g. "9.2.class.1" → "9.2")
            short_code = ".".join(raw_code.split(".", 2)[:2]) if raw_code else ""
            topic_title = getattr(topic, "title", "").strip()
            topic_line = f"{short_code} {topic_title}".strip()
            if not topic_line:
                topic_line = topic_title or "Unnamed Topic"

            formatted_topics.append(
                f"{book_title}\n"
                f"Chapter {chapter_code}\n"
                f"Topic: {topic_line}"
            )

        return "---\n".join(formatted_topics)


class StudentImage(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE)  # Links image to a student
    session_date = models.DateField()  # Date when the image was uploaded
    image_url = models.URLField()  # Stores the image URL
    uploaded_at = models.DateTimeField(auto_now_add=True)


    def __str__(self):
        return f"Image for {self.student.name} on {self.session_date}"
