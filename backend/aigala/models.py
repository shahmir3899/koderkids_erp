"""
AI Gala Models
Monthly creative AI projects with parent voting and badges.
"""
from django.db import models
from django.utils import timezone
from students.models import Student


class Gallery(models.Model):
    """
    Monthly AI Gala event container.
    Each gallery represents one month's theme/competition.
    """
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('active', 'Active - Accepting Submissions'),
        ('voting', 'Voting Open'),
        ('closed', 'Closed - Results Announced'),
    ]

    # Basic Info
    title = models.CharField(max_length=200, help_text="e.g., 'My AI Superhero Origins'")
    month_label = models.CharField(max_length=50, help_text="e.g., 'Month 1', 'February 2026'")
    theme = models.CharField(max_length=100, help_text="e.g., 'Superhero', 'Time Machine'")
    description = models.TextField(blank=True, default='')
    instructions = models.TextField(blank=True, help_text="What students should create")

    # Cover image (optional)
    cover_image_url = models.URLField(blank=True, null=True)
    cover_image_path = models.CharField(max_length=500, blank=True, null=True)

    # Important Dates (all optional - can be set later)
    class_date = models.DateField(blank=True, null=True, help_text="When the AI Gala class happens")
    gallery_open_date = models.DateField(blank=True, null=True, help_text="When gallery becomes visible")
    voting_start_date = models.DateField(blank=True, null=True, help_text="When voting begins")
    voting_end_date = models.DateField(blank=True, null=True, help_text="When voting closes")

    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')

    # Settings
    max_votes_per_user = models.IntegerField(default=3, help_text="How many projects each user can vote for")
    allow_comments = models.BooleanField(default=True)
    allow_downloads = models.BooleanField(default=True)

    # Targeting - Which schools/classes can participate
    target_schools = models.ManyToManyField(
        'students.School',
        blank=True,
        related_name='gala_galleries',
        help_text="Schools that can participate. Empty = all schools."
    )
    target_classes = models.JSONField(
        default=list,
        blank=True,
        help_text="Class names that can participate (e.g., ['Level 1', 'Level 2']). Empty = all classes."
    )

    # Who created this gallery
    created_by = models.ForeignKey(
        'students.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_galleries'
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-class_date']
        verbose_name = "AI Gala Gallery"
        verbose_name_plural = "AI Gala Galleries"

    def __str__(self):
        return f"{self.month_label}: {self.title}"

    def can_student_access(self, student):
        """Check if a student can access this gallery based on targeting."""
        # If no target schools specified, gallery is open to all
        if not self.target_schools.exists():
            return True

        # Check if student's school is in target schools
        student_school = student.school  # This is a School object or school name
        if hasattr(student_school, 'id'):
            school_match = self.target_schools.filter(id=student_school.id).exists()
        else:
            # student.school might be a string (school name)
            school_match = self.target_schools.filter(name=student_school).exists()

        if not school_match:
            return False

        # If no target classes specified, all classes in target schools can access
        if not self.target_classes:
            return True

        # Check if student's class is in target classes
        return student.student_class in self.target_classes

    @property
    def target_display(self):
        """Human-readable targeting info."""
        schools = self.target_schools.all()
        if not schools.exists():
            return "All Schools"

        school_names = [s.name for s in schools]
        if self.target_classes:
            return f"{', '.join(school_names)} - {', '.join(self.target_classes)}"
        return ', '.join(school_names)

    @property
    def is_voting_open(self):
        """Check if voting is currently active."""
        if not self.voting_start_date or not self.voting_end_date:
            return self.status == 'voting'  # If no dates, just check status
        today = timezone.now().date()
        return (
            self.status == 'voting' and
            self.voting_start_date <= today <= self.voting_end_date
        )

    @property
    def total_projects(self):
        """Count of approved projects in this gallery."""
        return self.projects.filter(is_approved=True).count()

    @property
    def total_votes(self):
        """Total votes cast in this gallery."""
        return Vote.objects.filter(project__gallery=self).count()

    @property
    def days_until_voting_ends(self):
        """Days remaining for voting."""
        if not self.voting_end_date:
            return 0
        if not self.is_voting_open:
            return 0
        today = timezone.now().date()
        delta = self.voting_end_date - today
        return max(0, delta.days)


class Project(models.Model):
    """
    Individual student submission for an AI Gala.
    One student can have one project per gallery.
    """
    gallery = models.ForeignKey(
        Gallery,
        on_delete=models.CASCADE,
        related_name='projects'
    )
    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name='gala_projects'
    )

    # Project Content
    title = models.CharField(max_length=200, help_text="e.g., 'Thunder Girl'")
    image_url = models.URLField(help_text="Supabase public URL")
    image_path = models.CharField(max_length=500, help_text="Supabase storage path for deletion")
    thumbnail_url = models.URLField(blank=True, null=True, help_text="Optional smaller version")

    # Description / Story
    description = models.TextField(blank=True, help_text="Origin story, explanation, etc.")

    # Flexible metadata for different themes (JSON)
    # For Superhero: {"powers": ["lightning", "flight"], "costume_colors": ["blue", "yellow"]}
    # For Time Machine: {"historical_figure": "Einstein", "era": "1905"}
    metadata = models.JSONField(default=dict, blank=True)

    # Statistics
    vote_count = models.IntegerField(default=0)
    comment_count = models.IntegerField(default=0)
    view_count = models.IntegerField(default=0)

    # Moderation
    is_approved = models.BooleanField(default=True, help_text="Admin can hide inappropriate content")

    # Winner status (set when gallery closes)
    is_winner = models.BooleanField(default=False)
    winner_rank = models.IntegerField(null=True, blank=True, help_text="1=Champion, 2=Innovator, 3=Creator")

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-vote_count', '-created_at']
        unique_together = ['gallery', 'student']  # One submission per student per gallery
        verbose_name = "AI Gala Project"
        verbose_name_plural = "AI Gala Projects"

    def __str__(self):
        return f"{self.student.name}'s {self.title}"

    @property
    def rank_title(self):
        """Human-readable rank title."""
        ranks = {1: 'Champion', 2: 'Innovator', 3: 'Creator'}
        return ranks.get(self.winner_rank, None)


class Vote(models.Model):
    """
    Vote cast by a student/parent for a project.
    Parents use student accounts to vote.
    """
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='votes'
    )
    voter = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name='gala_votes_cast',
        help_text="Student account used for voting (parent uses student login)"
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['project', 'voter']  # One vote per project per voter
        verbose_name = "AI Gala Vote"
        verbose_name_plural = "AI Gala Votes"

    def __str__(self):
        return f"{self.voter.name} -> {self.project.title}"


class Comment(models.Model):
    """
    Comments on AI Gala projects.
    """
    project = models.ForeignKey(
        Project,
        on_delete=models.CASCADE,
        related_name='comments'
    )
    commenter = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name='gala_comments'
    )

    content = models.TextField(max_length=500)

    # Moderation
    is_approved = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "AI Gala Comment"
        verbose_name_plural = "AI Gala Comments"

    def __str__(self):
        preview = self.content[:30] + '...' if len(self.content) > 30 else self.content
        return f"{self.commenter.name}: {preview}"
