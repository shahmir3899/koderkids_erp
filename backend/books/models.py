# Create your models here.
# books/models.py
from django.db import models
from mptt.models import MPTTModel, TreeForeignKey
#from students.models import School   # adjust import as needed


class Book(models.Model):
    title = models.CharField(max_length=200)
    #order = models.PositiveIntegerField(default=0)
    isbn = models.CharField(max_length=13, blank=True, null=True, unique=True)
    school = models.ForeignKey(
        'students.School',  # ← String reference
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    cover = models.ImageField(upload_to="books/covers/", blank=True)

    # LMS fields
    description = models.TextField(
        blank=True,
        help_text="Course description shown to students before enrollment"
    )
    is_published = models.BooleanField(
        default=False,
        help_text="Only published courses are visible to students"
    )
    difficulty_level = models.CharField(
        max_length=20,
        choices=[
            ('beginner', 'Beginner'),
            ('intermediate', 'Intermediate'),
            ('advanced', 'Advanced'),
        ],
        default='beginner'
    )

    class Meta:
        unique_together = ('title', 'school')

    def __str__(self):
        return self.title

    @property
    def total_topics(self):
        """Count of leaf topics (actual lessons)"""
        return self.topics.filter(type='lesson').count()

    @property
    def total_duration_minutes(self):
        """Sum of estimated time for all topics"""
        return self.topics.aggregate(
            total=models.Sum('estimated_time_minutes')
        )['total'] or 0


class Topic(MPTTModel):
    """
    Hierarchical node: Chapter → Section → Topic
    """
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name="topics")
    parent = TreeForeignKey(
        "self", on_delete=models.CASCADE, null=True, blank=True, related_name="children"
    )
    code = models.CharField(max_length=20, blank=True)          # e.g. "1.1"
    title = models.CharField(max_length=250)                    # e.g. "Introduction to Fractions"

    # Main topic content (intro, explanations, etc.)
    content = models.TextField(
        blank=True,
        help_text="Main content for the topic (intro, explanations). Supports HTML."
    )

    # Topic thumbnail/banner image
    thumbnail = models.ImageField(
        upload_to="books/topics/",
        blank=True,
        null=True,
        help_text="Topic thumbnail or banner image"
    )

    # JSON array of activity blocks
    activity_blocks = models.JSONField(default=list, blank=True)
    # Example value:
    # [
    #   {
    #     "type": "class_activity",
    #     "title": "Class Activity 1: Draw a Pixel Festival Icon",
    #     "introduction": "Let's make a tiny pixel drawing...",
    #     "steps": [
    #       {"number": 1, "title": "Step", "content": "Open Pixilart...", "image": "url"},
    #       {"number": 2, "title": "Step", "content": "Start a New Drawing...", "image": "url"}
    #     ],
    #     "challenge": "Make your kite animation loop smoothly...",
    #     "order": 0
    #   },
    #   {
    #     "type": "home_activity",
    #     "title": "Home Activity 2",
    #     "content": "Copy a past drawing file...",
    #     "order": 1
    #   }
    # ]

    type = models.CharField(
        max_length=20,
        choices=[
            ('chapter', 'Chapter'),
            ('lesson', 'Lesson'),
            ('activity', 'Activity'),
        ],
        default='lesson'
    )

    # LMS fields for video content and progress tracking
    video_url = models.URLField(
        blank=True,
        null=True,
        help_text="YouTube/Vimeo embed URL for video content"
    )
    video_duration_seconds = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Video duration for progress tracking"
    )
    estimated_time_minutes = models.PositiveIntegerField(
        default=10,
        help_text="Estimated time to complete this topic"
    )
    is_required = models.BooleanField(
        default=True,
        help_text="Whether topic must be completed for course completion"
    )
    class Meta:
        unique_together = ('book', 'code', 'type')  # ADD THIS LINE
    
    class MPTTMeta:
        order_insertion_by = ["code"]

    def __str__(self):
        return f"{self.book} – {self.code or ''} {self.title}".strip()
    
    @property
    def display_title(self):
        return f"{self.code} {self.title}".strip() if self.code else self.title


class BookClassVisibility(models.Model):
    """
    Controls which classes can see/access specific books.
    If no visibility records exist for a book, it's visible to all (default).
    If visibility records exist, only listed classes can see the book.
    """
    book = models.ForeignKey(
        Book,
        on_delete=models.CASCADE,
        related_name='class_visibility'
    )
    school = models.ForeignKey(
        'students.School',
        on_delete=models.CASCADE,
        related_name='book_visibility'
    )
    student_class = models.CharField(
        max_length=50,
        help_text="Class that can see this book (e.g., 'Class 1', 'PlayGroup')"
    )
    is_visible = models.BooleanField(
        default=True,
        help_text="Whether this book is visible to this class"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        'students.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_visibility_rules'
    )

    class Meta:
        unique_together = ('book', 'school', 'student_class')
        verbose_name = 'Book Class Visibility'
        verbose_name_plural = 'Book Class Visibility Rules'

    def __str__(self):
        status = "visible" if self.is_visible else "hidden"
        return f"{self.book.title} - {self.school.name} {self.student_class} ({status})"


class TopicAssignment(models.Model):
    """
    Assigns topics to specific classes with optional deadlines.
    Teachers can set deadlines for when topics should be completed.
    """
    topic = models.ForeignKey(
        Topic,
        on_delete=models.CASCADE,
        related_name='assignments'
    )
    school = models.ForeignKey(
        'students.School',
        on_delete=models.CASCADE,
        related_name='topic_assignments'
    )
    student_class = models.CharField(
        max_length=50,
        help_text="Class this assignment applies to"
    )
    assigned_by = models.ForeignKey(
        'students.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        related_name='assigned_topics'
    )
    assigned_at = models.DateTimeField(auto_now_add=True)
    deadline = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Optional deadline for completing this topic"
    )
    notes = models.TextField(
        blank=True,
        help_text="Optional notes/instructions for students"
    )
    is_mandatory = models.BooleanField(
        default=True,
        help_text="Whether this assignment is mandatory"
    )

    class Meta:
        unique_together = ('topic', 'school', 'student_class')
        verbose_name = 'Topic Assignment'
        verbose_name_plural = 'Topic Assignments'
        ordering = ['-assigned_at']

    def __str__(self):
        deadline_str = f" (due {self.deadline.strftime('%Y-%m-%d')})" if self.deadline else ""
        return f"{self.topic.display_title} - {self.school.name} {self.student_class}{deadline_str}"

    @property
    def is_overdue(self):
        """Check if assignment is past deadline."""
        if not self.deadline:
            return False
        from django.utils import timezone
        return timezone.now() > self.deadline