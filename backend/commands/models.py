from django.db import models
from django.utils.timezone import now
from students.models import CustomUser, School


class Command(models.Model):
    """Stores command execution history for audit trail"""

    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('awaiting_clarification', 'Awaiting Clarification'),
        ('processing', 'Processing'),
        ('success', 'Success'),
        ('failed', 'Failed'),
    ]

    AGENT_CHOICES = [
        ('inventory', 'Inventory'),
        ('broadcast', 'Broadcast'),
        ('finance', 'Finance'),
        ('hr', 'HR'),
        ('unknown', 'Unknown'),
    ]

    # Input
    raw_input = models.TextField(help_text="Original user input")
    parsed_intent = models.CharField(max_length=100, blank=True)
    parsed_entities = models.JSONField(default=dict)
    agent = models.CharField(max_length=20, choices=AGENT_CHOICES, default='unknown')

    # Clarification (if needed)
    clarification_type = models.CharField(max_length=50, blank=True)
    clarification_options = models.JSONField(default=list)
    selected_option = models.JSONField(null=True, blank=True)

    # Execution context
    executed_by = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='executed_commands'
    )
    source_page = models.CharField(max_length=100, blank=True)
    school = models.ForeignKey(
        School,
        null=True,
        blank=True,
        on_delete=models.SET_NULL
    )
    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default='pending'
    )

    # API Mapping (for tracking what was called)
    api_endpoint = models.CharField(max_length=200, blank=True)
    api_method = models.CharField(max_length=10, blank=True)
    api_params = models.JSONField(default=dict)

    # Response
    response_message = models.TextField(blank=True)
    response_data = models.JSONField(default=dict)
    error_message = models.TextField(blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['executed_by', '-created_at']),
            models.Index(fields=['agent', 'status']),
            models.Index(fields=['status', '-created_at']),
        ]
        verbose_name = 'Command'
        verbose_name_plural = 'Commands'

    def __str__(self):
        return f"{self.executed_by.username}: {self.raw_input[:50]}..."

    def mark_success(self, message: str, data: dict = None):
        """Mark command as successfully executed"""
        self.status = 'success'
        self.response_message = message
        self.response_data = data or {}
        self.completed_at = now()
        self.save()

    def mark_failed(self, error: str):
        """Mark command as failed"""
        self.status = 'failed'
        self.error_message = error
        self.completed_at = now()
        self.save()

    def mark_awaiting_clarification(self, field: str, options: list):
        """Mark command as awaiting user clarification"""
        self.status = 'awaiting_clarification'
        self.clarification_type = field
        self.clarification_options = options
        self.save()


class QuickAction(models.Model):
    """Predefined quick action buttons shown in the command UI"""

    AGENT_CHOICES = [
        ('inventory', 'Inventory'),
        ('broadcast', 'Broadcast'),
        ('finance', 'Finance'),
        ('hr', 'HR'),
    ]

    name = models.CharField(max_length=100, help_text="Display name, e.g., 'Check Stock'")
    icon = models.CharField(max_length=50, help_text="Lucide icon name, e.g., 'package'")
    agent = models.CharField(max_length=20, choices=AGENT_CHOICES)
    description = models.CharField(max_length=200, blank=True)

    # Pre-filled command template
    command_template = models.CharField(
        max_length=200,
        help_text="Command template, e.g., 'Check stock for {item_name}'"
    )

    # Required parameters (shown as form fields if any)
    required_params = models.JSONField(
        default=list,
        help_text='List of required params, e.g., [{"name": "item_name", "label": "Item Name", "type": "text"}]'
    )

    # API mapping (for reference)
    api_endpoint = models.CharField(max_length=200, blank=True)
    api_method = models.CharField(max_length=10, default='GET')

    # Permissions - which roles can see/use this action
    allowed_roles = models.JSONField(
        default=list,
        help_text='List of roles, e.g., ["Admin", "Teacher"]'
    )

    is_active = models.BooleanField(default=True)
    order = models.IntegerField(default=0, help_text="Display order")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order', 'name']
        verbose_name = 'Quick Action'
        verbose_name_plural = 'Quick Actions'

    def __str__(self):
        return f"{self.name} ({self.agent})"

    def is_available_for_role(self, role: str) -> bool:
        """Check if this action is available for the given role"""
        if not self.allowed_roles:
            return True  # No restrictions
        return role in self.allowed_roles


class StaffAttendance(models.Model):
    """Track staff (teachers/admins) attendance - used by HR commands"""

    STATUS_CHOICES = [
        ('present', 'Present'),
        ('absent', 'Absent'),
        ('half_day', 'Half Day'),
        ('late', 'Late'),
        ('on_leave', 'On Leave'),
    ]

    staff = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        limit_choices_to={'role__in': ['Teacher', 'Admin']},
        related_name='staff_attendances'
    )
    date = models.DateField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)

    check_in_time = models.TimeField(null=True, blank=True)
    check_out_time = models.TimeField(null=True, blank=True)

    school = models.ForeignKey(
        School,
        on_delete=models.CASCADE,
        related_name='staff_attendances'
    )

    marked_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        related_name='marked_staff_attendances',
        help_text="Who marked this attendance"
    )

    # Substitute assignment
    substitute = models.ForeignKey(
        CustomUser,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='substitute_assignments',
        help_text="Substitute teacher assigned for this absence"
    )
    substitute_reason = models.TextField(blank=True)

    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['staff', 'date']
        ordering = ['-date', 'staff__first_name']
        verbose_name = 'Staff Attendance'
        verbose_name_plural = 'Staff Attendances'
        indexes = [
            models.Index(fields=['date', 'status']),
            models.Index(fields=['school', 'date']),
        ]

    def __str__(self):
        return f"{self.staff.get_full_name()} - {self.date} - {self.status}"

    @property
    def staff_name(self):
        return self.staff.get_full_name()

    @property
    def substitute_name(self):
        return self.substitute.get_full_name() if self.substitute else None
