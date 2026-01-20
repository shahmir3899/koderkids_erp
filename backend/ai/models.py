"""
AI Agent Models
===============
Database models for AI agent audit logging.
"""

from django.db import models
from django.conf import settings


class AIAuditLog(models.Model):
    """
    Audit log for all AI agent requests and responses.
    Used for debugging, analytics, and security monitoring.
    """

    AGENT_CHOICES = [
        ('fee', 'Fee Agent'),
        ('inventory', 'Inventory Agent'),
        ('hr', 'HR Agent'),
        ('broadcast', 'Broadcast Agent'),
    ]

    STATUS_CHOICES = [
        ('success', 'Success'),
        ('failed', 'Failed'),
        ('clarify', 'Clarification Needed'),
        ('unsupported', 'Unsupported Request'),
        ('pending_confirmation', 'Pending Confirmation'),
        ('confirmed', 'Confirmed & Executed'),
        ('cancelled', 'Cancelled by User'),
    ]

    # User and context
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='ai_audit_logs'
    )
    agent = models.CharField(max_length=50, choices=AGENT_CHOICES)

    # Request
    user_message = models.TextField(help_text="Original user input")
    context_data = models.JSONField(
        default=dict,
        help_text="Context passed to LLM (schools, categories, etc.)"
    )

    # LLM Response
    llm_raw_response = models.TextField(
        blank=True,
        null=True,
        help_text="Raw text response from LLM"
    )
    llm_parsed_response = models.JSONField(
        default=dict,
        null=True,
        help_text="Parsed JSON from LLM"
    )

    # Action execution
    action_name = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Action that was executed"
    )
    action_params = models.JSONField(
        default=dict,
        null=True,
        help_text="Parameters passed to action"
    )

    # Result
    execution_result = models.JSONField(
        default=dict,
        null=True,
        help_text="Result from action execution"
    )
    status = models.CharField(
        max_length=30,
        choices=STATUS_CHOICES,
        default='success'
    )
    error_message = models.TextField(blank=True, null=True)

    # Confirmation (for delete operations)
    confirmation_token = models.CharField(
        max_length=64,
        blank=True,
        null=True,
        unique=True,
        help_text="Token for confirming destructive actions"
    )
    confirmed_at = models.DateTimeField(blank=True, null=True)

    # Performance
    llm_response_time_ms = models.IntegerField(
        default=0,
        help_text="LLM response time in milliseconds"
    )
    total_time_ms = models.IntegerField(
        default=0,
        help_text="Total request time in milliseconds"
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['agent', 'created_at']),
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['confirmation_token']),
        ]
        verbose_name = "AI Audit Log"
        verbose_name_plural = "AI Audit Logs"

    def __str__(self):
        return f"{self.agent} - {self.action_name or 'unknown'} - {self.status} ({self.created_at})"

    @classmethod
    def create_log(cls, user, agent, message, context=None):
        """Create a new audit log entry."""
        return cls.objects.create(
            user=user,
            agent=agent,
            user_message=message,
            context_data=context or {}
        )

    def log_llm_response(self, raw_response, parsed_response, response_time_ms):
        """Update log with LLM response."""
        self.llm_raw_response = raw_response
        self.llm_parsed_response = parsed_response
        self.llm_response_time_ms = response_time_ms
        self.save()

    def log_action_execution(self, action_name, params, result, status, error=None):
        """Update log with action execution result."""
        self.action_name = action_name
        self.action_params = params
        self.execution_result = result
        self.status = status
        self.error_message = error
        self.save()

    def set_pending_confirmation(self, token):
        """Mark as pending confirmation with token."""
        self.confirmation_token = token
        self.status = 'pending_confirmation'
        self.save()

    def confirm(self, result):
        """Mark as confirmed and executed."""
        from django.utils import timezone
        self.confirmed_at = timezone.now()
        self.status = 'confirmed'
        self.execution_result = result
        self.save()

    def cancel(self):
        """Mark as cancelled by user."""
        self.status = 'cancelled'
        self.save()
