import uuid
from django.db import models
from students.models import CustomUser, School, Student, TimeSlot


def _generate_room_name():
    return f"session-{uuid.uuid4().hex[:12]}"


class OnlineClassSession(models.Model):
    STATUS_SCHEDULED = 'scheduled'
    STATUS_LIVE = 'live'
    STATUS_ENDED = 'ended'
    STATUS_CANCELLED = 'cancelled'
    STATUS_CHOICES = [
        (STATUS_SCHEDULED, 'Scheduled'),
        (STATUS_LIVE, 'Live'),
        (STATUS_ENDED, 'Ended'),
        (STATUS_CANCELLED, 'Cancelled'),
    ]

    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    teacher = models.ForeignKey(
        CustomUser, on_delete=models.CASCADE, related_name='hosted_sessions'
    )
    school = models.ForeignKey(
        School, on_delete=models.CASCADE, related_name='online_sessions'
    )
    time_slot = models.ForeignKey(
        TimeSlot,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='online_sessions',
        help_text='Teacher time-slot this session targets (ONLINE student flow)',
    )
    selected_students = models.ManyToManyField(
        Student,
        blank=True,
        related_name='scheduled_sessions',
        help_text='Students explicitly invited to this session',
    )
    scheduled_at = models.DateTimeField()
    duration_mins = models.PositiveIntegerField(default=60)
    room_name = models.CharField(
        max_length=64, unique=True, default=_generate_room_name, editable=False
    )

    # Recurrence
    is_recurring = models.BooleanField(default=False)
    recurrence_rule = models.CharField(
        max_length=100, blank=True, default='',
        help_text='e.g. "weekly:mon,wed,fri"'
    )

    # Permissions
    recording_enabled = models.BooleanField(default=False)
    chat_enabled = models.BooleanField(default=True)
    screenshare_student_allowed = models.BooleanField(default=False)

    status = models.CharField(
        max_length=20, choices=STATUS_CHOICES, default=STATUS_SCHEDULED, db_index=True
    )
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-scheduled_at']

    def __str__(self):
        return f"{self.title} ({self.scheduled_at:%Y-%m-%d %H:%M})"


class ClassParticipant(models.Model):
    session = models.ForeignKey(
        OnlineClassSession, on_delete=models.CASCADE, related_name='participants'
    )
    student = models.ForeignKey(
        Student, on_delete=models.CASCADE, related_name='class_participations'
    )
    joined_at = models.DateTimeField(null=True, blank=True)
    left_at = models.DateTimeField(null=True, blank=True)
    duration_mins = models.PositiveIntegerField(default=0)
    attendance_auto_marked = models.BooleanField(default=False)

    class Meta:
        unique_together = ('session', 'student')

    def __str__(self):
        return f"{self.student.name} @ {self.session.title}"


class ClassRecording(models.Model):
    session = models.ForeignKey(
        OnlineClassSession, on_delete=models.CASCADE, related_name='recordings'
    )
    egress_id = models.CharField(max_length=128, blank=True, default='')
    url = models.URLField(max_length=1000)
    duration_seconds = models.PositiveIntegerField(default=0)
    size_bytes = models.BigIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Recording for {self.session.title} ({self.created_at:%Y-%m-%d})"
