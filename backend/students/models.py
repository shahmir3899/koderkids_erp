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
    
    # 💰 ADD THESE TWO FIELDS:
    PAYMENT_MODE_CHOICES = [
        ('per_student', 'Per Student'),
        ('monthly_subscription', 'Monthly Subscription'),
    ]
    
    payment_mode = models.CharField(
        max_length=20,
        choices=PAYMENT_MODE_CHOICES,
        default='per_student',
        help_text="Payment calculation method for this school"
    )
    
    monthly_subscription_amount = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        help_text="Total monthly subscription (only for monthly_subscription mode)"
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    # ... rest of existing fields ...
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

    # Soft delete fields
    deactivated_at = models.DateTimeField(null=True, blank=True, help_text="When the school was deactivated")
    deactivated_by = models.ForeignKey(
        'students.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='schools_deactivated',
        help_text="User who deactivated this school"
    )

    # Assigned days for teacher attendance and lesson planning
    # Format: List of integers [0=Monday, 1=Tuesday, ..., 6=Sunday]
    # Example: [0, 1] means Monday and Tuesday
    assigned_days = models.JSONField(
        default=list,
        blank=True,
        help_text="Days of week when this school has classes. [0=Mon, 1=Tue, 2=Wed, 3=Thu, 4=Fri, 5=Sat, 6=Sun]"
    )

    def is_working_day(self, date=None):
        """Check if the given date (or today) is a working day for this school."""
        from django.utils import timezone
        if date is None:
            date = timezone.now().date()
        # Python weekday(): Monday=0, Sunday=6
        return date.weekday() in self.assigned_days if self.assigned_days else True

    def get_assigned_days_display(self):
        """Return human-readable list of assigned days."""
        day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        return [day_names[d] for d in self.assigned_days if 0 <= d <= 6]

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['name']


class CustomUser(AbstractUser):
    ROLE_CHOICES = [
        ('Admin', 'Admin'),
        ('Teacher', 'Teacher'),
        ('Student', 'Student'),
        ('BDM', 'Business Development Manager'),
    ]
    # Override email to make it unique (but allow NULL for users without email)
    email = models.EmailField(
        ('email address'),
        blank=True,   # Allow empty in forms
        unique=True,  # Unique constraint (NULL values are ignored by PostgreSQL)
        null=True,    # Allow NULL in database
        error_messages={
            'unique': 'A user with this email already exists.',
        }
    )

    def save(self, *args, **kwargs):
        # Convert empty string email to None to avoid unique constraint issues
        if self.email == '':
            self.email = None
        super().save(*args, **kwargs)
    # Profile Photo URL (ADD THIS)
    profile_photo_url = models.URLField(
        max_length=500, 
        blank=True, 
        null=True,
        help_text="URL to profile photo in Supabase storage"
    )
    # Override username to ensure it stays unique (already has this)
    username = models.CharField(
        ('username'),
        max_length=150,
        unique=True,
        error_messages={
            'unique': 'A user with this username already exists.',
        }
    )
    role = models.CharField(max_length=50, choices=ROLE_CHOICES, default='Student')  # ✅ Increased to 50
    assigned_schools = models.ManyToManyField('students.School', blank=True, related_name="teachers")
    
    # ✅ NEW FIELDS FOR USER MANAGEMENT
    is_super_admin = models.BooleanField(default=False, help_text="Super admin cannot be deleted or demoted")
    created_by = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='users_created')
    updated_by = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='users_updated')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    # Note: is_active already exists from AbstractUser
    # Note: last_login already exists from AbstractUser
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

    @property
    def profile_photo_url(self):
        """Get profile photo from linked CustomUser account."""
        return self.user.profile_photo_url if self.user else None

    
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


class TeacherAttendance(models.Model):
    """
    Automatic teacher attendance tracking.
    Records are created when teachers log in based on their location.
    """
    STATUS_CHOICES = [
        ('present', 'Present'),                      # Within 200m of school
        ('out_of_range', 'Out of Range'),            # Logged in but outside geofence
        ('location_unavailable', 'Location Unavailable'),  # User denied location permission
    ]

    teacher = models.ForeignKey(
        'students.CustomUser',
        on_delete=models.CASCADE,
        related_name='teacher_attendances'
    )
    school = models.ForeignKey(
        'students.School',
        on_delete=models.CASCADE,
        related_name='teacher_attendances'
    )
    date = models.DateField()
    status = models.CharField(max_length=25, choices=STATUS_CHOICES, default='present')

    # Login details
    login_time = models.DateTimeField(auto_now_add=True)
    login_latitude = models.DecimalField(
        max_digits=10, decimal_places=7,
        null=True, blank=True,
        help_text="Teacher's latitude at login time"
    )
    login_longitude = models.DecimalField(
        max_digits=10, decimal_places=7,
        null=True, blank=True,
        help_text="Teacher's longitude at login time"
    )
    distance_from_school = models.DecimalField(
        max_digits=10, decimal_places=2,
        null=True, blank=True,
        help_text="Distance from school in meters"
    )

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        # Changed from ('teacher', 'school', 'date') to ('teacher', 'date')
        # One attendance record per teacher per day (school determined by assigned_days)
        unique_together = ('teacher', 'date')
        ordering = ['-date', '-login_time']
        verbose_name = "Teacher Attendance"
        verbose_name_plural = "Teacher Attendances"

    def __str__(self):
        return f"{self.teacher.username} - {self.school.name} - {self.date} ({self.status})"


class Badge(models.Model):
    """
    Achievement badges that students can earn based on attendance streaks and AI Gala participation.
    """
    BADGE_TYPES = [
        # Attendance Streaks
        ('streak_5', '5 Day Streak'),
        ('streak_10', '10 Day Streak'),
        ('streak_30', '30 Day Streak'),
        ('perfect_week', 'Perfect Week'),
        ('first_month', 'First Month Complete'),
        # AI Gala Badges
        ('gala_champion', 'AI Gala Champion'),      # 1st place winner
        ('gala_innovator', 'AI Gala Innovator'),    # 2nd place winner
        ('gala_creator', 'AI Gala Creator'),        # 3rd place winner
        ('gala_participant', 'Gala Participant'),   # Participated in a gala
        ('gala_veteran', 'Gala Veteran'),           # Participated in 5+ galas
        ('gala_superstar', 'Gala Superstar'),       # Won 3+ gala competitions
    ]

    name = models.CharField(max_length=100)
    description = models.TextField()
    icon = models.CharField(max_length=50, help_text="Emoji or icon identifier (e.g., '⭐', 'star', 'trophy')")
    badge_type = models.CharField(max_length=50, choices=BADGE_TYPES, unique=True)
    criteria_value = models.IntegerField(help_text="Number required to earn badge (e.g., 5 for 5-day streak)")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['criteria_value']
        verbose_name = "Badge"
        verbose_name_plural = "Badges"

    def __str__(self):
        return f"{self.icon} {self.name}"


class StudentBadge(models.Model):
    """
    Tracks which badges each student has earned.
    """
    student = models.ForeignKey(
        'students.Student',
        on_delete=models.CASCADE,
        related_name='earned_badges'
    )
    badge = models.ForeignKey(
        Badge,
        on_delete=models.CASCADE,
        related_name='student_badges'
    )
    earned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('student', 'badge')
        ordering = ['-earned_at']
        verbose_name = "Student Badge"
        verbose_name_plural = "Student Badges"

    def __str__(self):
        return f"{self.student.name} - {self.badge.name}"
