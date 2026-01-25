from django.db import models
from django.conf import settings
import uuid
from django.utils import timezone


# =============================================================================
# REPORT TEMPLATE MODEL
# =============================================================================
class ReportTemplate(models.Model):
    """
    Defines available report types and their constraints.
    Enables admin to manage templates without code changes.
    """
    CATEGORY_CHOICES = [
        ('hr', 'HR Documents'),
        ('academic', 'Academic'),
        ('financial', 'Financial'),
        ('other', 'Other'),
    ]

    code = models.CharField(
        max_length=50,
        unique=True,
        help_text="Machine-readable identifier (e.g., salary_certificate)"
    )
    name = models.CharField(max_length=100, help_text="Human-readable name")
    description = models.TextField(
        blank=True,
        help_text="Template purpose and usage guidelines"
    )
    category = models.CharField(
        max_length=50,
        choices=CATEGORY_CHOICES,
        default='other'
    )
    allowed_roles = models.JSONField(
        default=list,
        help_text='List of roles that can request: ["Admin", "Teacher", "BDM"]'
    )
    allowed_self_request = models.BooleanField(
        default=True,
        help_text="Can users request this for themselves?"
    )
    allowed_other_request = models.BooleanField(
        default=False,
        help_text="Can users request this for other employees?"
    )
    requires_target_employee = models.BooleanField(
        default=True,
        help_text="Does this template need a target employee?"
    )
    requires_target_school = models.BooleanField(
        default=False,
        help_text="Does this template need a target school?"
    )
    default_subject = models.CharField(
        max_length=200,
        blank=True,
        help_text="Default subject line"
    )
    default_body = models.TextField(
        blank=True,
        help_text="Default body content with placeholders"
    )
    background_image = models.URLField(
        blank=True,
        null=True,
        help_text="Custom background image URL"
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Report Template"
        verbose_name_plural = "Report Templates"
        ordering = ['category', 'name']

    def __str__(self):
        return f"{self.name} ({self.code})"


# =============================================================================
# REPORT REQUEST MODEL
# =============================================================================
class ReportRequest(models.Model):
    """
    Stores report requests with their approval status and content snapshot.
    Any report requested by a non-admin user must be approved by an Admin.
    """
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('SUBMITTED', 'Submitted'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
        ('GENERATED', 'Generated'),
        ('CANCELLED', 'Cancelled'),
        ('ARCHIVED', 'Archived'),
    ]

    PRIORITY_CHOICES = [
        ('normal', 'Normal'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]

    LINE_SPACING_CHOICES = [
        ('single', 'Single'),
        ('1.5', '1.5'),
        ('double', 'Double'),
    ]

    # Primary identifier
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    request_number = models.CharField(
        max_length=20,
        unique=True,
        blank=True,
        help_text="Auto-generated: REQ-YYYY-NNNN"
    )

    # Request metadata
    requested_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='report_requests',
        help_text="User who created the request"
    )
    requested_at = models.DateTimeField(auto_now_add=True)

    # Target information
    target_employee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reports_about_me',
        help_text="Employee the report is about (null = self)"
    )
    target_school = models.ForeignKey(
        'students.School',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='report_requests',
        help_text="For school-specific reports"
    )

    # Template and content
    template = models.ForeignKey(
        ReportTemplate,
        on_delete=models.PROTECT,
        related_name='requests',
        help_text="Selected report template"
    )
    subject = models.CharField(max_length=200)
    recipient_text = models.TextField(
        blank=True,
        help_text="Formatted recipient (To: field)"
    )
    body_text = models.TextField(help_text="Editable body content (DRAFT only)")
    content_snapshot = models.JSONField(
        null=True,
        blank=True,
        help_text="Frozen content after submission - immutable"
    )
    line_spacing = models.CharField(
        max_length=10,
        choices=LINE_SPACING_CHOICES,
        default='single'
    )
    custom_fields = models.JSONField(
        default=dict,
        blank=True,
        help_text="Template-specific custom data"
    )

    # Status and workflow
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='DRAFT'
    )
    priority = models.CharField(
        max_length=10,
        choices=PRIORITY_CHOICES,
        default='normal'
    )

    # Approval information
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_report_requests',
        help_text="Admin who approved"
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(
        blank=True,
        help_text="Why request was rejected"
    )
    admin_notes = models.TextField(
        blank=True,
        help_text="Internal admin notes"
    )

    # Expiration
    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When request expires"
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Report Request"
        verbose_name_plural = "Report Requests"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['requested_by']),
            models.Index(fields=['created_at']),
            models.Index(fields=['template']),
        ]

    def __str__(self):
        return f"{self.request_number} - {self.subject} ({self.status})"

    def save(self, *args, **kwargs):
        # Auto-generate request number if not set
        if not self.request_number:
            year = timezone.now().year
            # Get the last request number for this year
            last_request = ReportRequest.objects.filter(
                request_number__startswith=f'REQ-{year}-'
            ).order_by('-request_number').first()

            if last_request:
                last_num = int(last_request.request_number.split('-')[-1])
                new_num = last_num + 1
            else:
                new_num = 1

            self.request_number = f'REQ-{year}-{new_num:04d}'

        super().save(*args, **kwargs)

    def submit(self, user):
        """Submit the request for approval. Freezes content into snapshot."""
        if self.status != 'DRAFT':
            raise ValueError("Can only submit from DRAFT status")

        # Freeze content
        self.content_snapshot = {
            'subject': self.subject,
            'recipient_text': self.recipient_text,
            'body_text': self.body_text,
            'line_spacing': self.line_spacing,
            'template_code': self.template.code,
            'template_name': self.template.name,
            'target_employee': {
                'id': self.target_employee.id if self.target_employee else None,
                'name': self.target_employee.get_full_name() if self.target_employee else None,
                'username': self.target_employee.username if self.target_employee else None,
            } if self.target_employee else None,
            'custom_fields': self.custom_fields,
            'submitted_at': timezone.now().isoformat(),
        }
        self.status = 'SUBMITTED'
        self.save()

        # Create audit log
        RequestStatusLog.objects.create(
            request=self,
            previous_status='DRAFT',
            new_status='SUBMITTED',
            changed_by=user,
            notes='Request submitted for approval'
        )

    def approve(self, admin, notes=''):
        """Approve the request (admin only)."""
        if self.status != 'SUBMITTED':
            raise ValueError("Can only approve SUBMITTED requests")

        self.status = 'APPROVED'
        self.approved_by = admin
        self.approved_at = timezone.now()
        if notes:
            self.admin_notes = notes
        self.save()

        # Create audit log
        RequestStatusLog.objects.create(
            request=self,
            previous_status='SUBMITTED',
            new_status='APPROVED',
            changed_by=admin,
            notes=notes or 'Request approved'
        )

    def reject(self, admin, reason, notes=''):
        """Reject the request with a reason (admin only)."""
        if self.status != 'SUBMITTED':
            raise ValueError("Can only reject SUBMITTED requests")

        if not reason:
            raise ValueError("Rejection reason is required")

        self.status = 'REJECTED'
        self.rejection_reason = reason
        if notes:
            self.admin_notes = notes
        self.save()

        # Create audit log
        RequestStatusLog.objects.create(
            request=self,
            previous_status='SUBMITTED',
            new_status='REJECTED',
            changed_by=admin,
            notes=f'Rejected: {reason}'
        )

    def cancel(self, user, reason=''):
        """Cancel the request."""
        if self.status not in ['DRAFT', 'SUBMITTED', 'APPROVED']:
            raise ValueError("Cannot cancel request in current status")

        old_status = self.status
        self.status = 'CANCELLED'
        self.save()

        # Create audit log
        RequestStatusLog.objects.create(
            request=self,
            previous_status=old_status,
            new_status='CANCELLED',
            changed_by=user,
            notes=reason or 'Request cancelled'
        )

    def mark_generated(self, admin):
        """Mark the request as generated."""
        if self.status != 'APPROVED':
            raise ValueError("Can only generate APPROVED requests")

        old_status = self.status
        self.status = 'GENERATED'
        self.save()

        # Create audit log
        RequestStatusLog.objects.create(
            request=self,
            previous_status=old_status,
            new_status='GENERATED',
            changed_by=admin,
            notes='Report generated successfully'
        )

    @property
    def is_editable(self):
        """Check if request can be edited."""
        return self.status == 'DRAFT'

    @property
    def can_be_approved(self):
        """Check if request can be approved."""
        return self.status == 'SUBMITTED'

    @property
    def can_be_generated(self):
        """Check if request can generate a report."""
        return self.status == 'APPROVED'


# =============================================================================
# REQUEST STATUS LOG MODEL (Audit Trail)
# =============================================================================
class RequestStatusLog(models.Model):
    """
    Audit trail for all status transitions.
    Records who did what and when for compliance.
    """
    request = models.ForeignKey(
        ReportRequest,
        on_delete=models.CASCADE,
        related_name='status_logs'
    )
    previous_status = models.CharField(max_length=20, blank=True)
    new_status = models.CharField(max_length=20)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='report_status_changes'
    )
    changed_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        verbose_name = "Request Status Log"
        verbose_name_plural = "Request Status Logs"
        ordering = ['-changed_at']
        indexes = [
            models.Index(fields=['request']),
            models.Index(fields=['changed_at']),
        ]

    def __str__(self):
        return f"{self.request.request_number}: {self.previous_status} → {self.new_status}"


# =============================================================================
# GENERATED REPORT MODEL
# =============================================================================
class GeneratedReport(models.Model):
    """
    Stores generated PDF metadata and file reference.
    Links to an approved request.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    request = models.OneToOneField(
        ReportRequest,
        on_delete=models.CASCADE,
        related_name='generated_report'
    )
    generated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='generated_reports'
    )
    generated_at = models.DateTimeField(auto_now_add=True)

    # File information
    file_path = models.CharField(
        max_length=500,
        help_text="Storage path (Supabase or local)"
    )
    file_name = models.CharField(max_length=200)
    file_size = models.PositiveIntegerField(help_text="File size in bytes")
    file_hash = models.CharField(
        max_length=64,
        help_text="SHA256 hash for integrity verification"
    )
    mime_type = models.CharField(max_length=50, default='application/pdf')

    # Download tracking
    download_count = models.PositiveIntegerField(default=0)
    last_downloaded_at = models.DateTimeField(null=True, blank=True)
    last_downloaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='downloaded_reports'
    )

    # Expiration
    expires_at = models.DateTimeField(null=True, blank=True)
    is_deleted = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Generated Report"
        verbose_name_plural = "Generated Reports"
        ordering = ['-generated_at']

    def __str__(self):
        return f"{self.file_name} (Request: {self.request.request_number})"

    def record_download(self, user):
        """Record a download event."""
        self.download_count += 1
        self.last_downloaded_at = timezone.now()
        self.last_downloaded_by = user
        self.save(update_fields=['download_count', 'last_downloaded_at', 'last_downloaded_by'])


# =============================================================================
# EXISTING MODEL (unchanged)
# =============================================================================
class CustomReport(models.Model):
    """
    Stores custom PDF reports generated by admins.
    """
    TEMPLATE_CHOICES = [
        ('custom', 'Custom Report'),
        ('offer_letter', 'Offer Letter'),
        ('experience_letter', 'Experience Letter'),
        ('warning_letter', 'Warning Letter'),
        ('termination_letter', 'Termination Letter'),
        ('appreciation_letter', 'Appreciation Letter'),
        ('salary_certificate', 'Salary Certificate'),
        ('employment_certificate', 'Employment Certificate'),
        ('recommendation_letter', 'Recommendation Letter'),
    ]

    LINE_SPACING_CHOICES = [
        ('single', 'Single'),
        ('1.5', '1.5'),
        ('double', 'Double'),
    ]

    recipient = models.TextField(help_text="To: field value (supports multiline)")
    subject = models.CharField(max_length=200, help_text="Report subject/title")
    body_text = models.TextField(help_text="Full body content with formatting markers")
    line_spacing = models.CharField(max_length=10, choices=LINE_SPACING_CHOICES, default='single')
    template_type = models.CharField(
        max_length=30,
        choices=TEMPLATE_CHOICES,
        default='custom',
        help_text="Type of report template used"
    )
    generated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='generated_custom_reports',
        help_text="Admin who generated this report"
    )
    generated_by_name = models.CharField(
        max_length=200,
        blank=True,
        help_text="Snapshot of admin name at generation time"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Custom Report"
        verbose_name_plural = "Custom Reports"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.subject} - {self.recipient} ({self.created_at.strftime('%Y-%m-%d')})"

    @property
    def template_display(self):
        """Return human-readable template type."""
        return dict(self.TEMPLATE_CHOICES).get(self.template_type, self.template_type)

    @property
    def short_body(self):
        """Return truncated body for list views."""
        if len(self.body_text) > 100:
            return self.body_text[:100] + "..."
        return self.body_text
