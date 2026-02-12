# ============================================
# CRM MODELS - LEAD, ACTIVITY, BDM TARGET
# ============================================

from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.core.validators import MinValueValidator
from decimal import Decimal


class Lead(models.Model):
    """
    Lead model for tracking potential schools/clients
    Minimal required: phone OR school_name
    """
    
    # ===== MINIMAL REQUIRED FIELDS (Quick Entry) =====
    school_name = models.CharField(
        max_length=200, 
        blank=True, 
        null=True,
        help_text="Name of the prospective school"
    )
    phone = models.CharField(
        max_length=20, 
        blank=True, 
        null=True,
        help_text="Contact phone number"
    )
    
    # ===== EXPANDABLE FIELDS (Can be filled later) =====
    contact_person = models.CharField(
        max_length=100, 
        blank=True, 
        null=True,
        help_text="Name of contact person"
    )
    email = models.EmailField(
        blank=True, 
        null=True,
        help_text="Contact email"
    )
    address = models.TextField(
        blank=True, 
        null=True,
        help_text="Physical address"
    )
    city = models.CharField(
        max_length=100, 
        blank=True, 
        null=True,
        help_text="City"
    )
    
    # ===== LEAD TRACKING =====
    lead_source = models.CharField(
        max_length=50,
        choices=[
            ('Website', 'Website'),
            ('Referral', 'Referral'),
            ('Cold Call', 'Cold Call'),
            ('Walk-in', 'Walk-in'),
            ('Social Media', 'Social Media'),
            ('Other', 'Other'),
        ],
        default='Other',
        help_text="How did this lead come to us?"
    )
    
    status = models.CharField(
        max_length=20,
        choices=[
            ('New', 'New'),
            ('Contacted', 'Contacted'),
            ('Interested', 'Interested'),
            ('Not Interested', 'Not Interested'),
            ('Converted', 'Converted'),
            ('Lost', 'Lost'),
        ],
        default='New',
        help_text="Current status of the lead"
    )
    
    # ===== ASSIGNMENT & OWNERSHIP =====
    assigned_to = models.ForeignKey(
        'students.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        limit_choices_to={'role': 'BDM'},
        related_name='assigned_leads',
        help_text="BDM responsible for this lead"
    )
    
    created_by = models.ForeignKey(
        'students.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_leads',
        help_text="User who created this lead"
    )
    
    # ===== CONVERSION TRACKING =====
    converted_to_school = models.ForeignKey(
        'students.School',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='original_lead',
        help_text="School created from this lead"
    )
    conversion_date = models.DateTimeField(
        null=True, 
        blank=True,
        help_text="Date when lead was converted to school"
    )
    
    # ===== BUSINESS INFO =====
    estimated_students = models.IntegerField(
        null=True, 
        blank=True,
        validators=[MinValueValidator(0)],
        help_text="Estimated number of students"
    )
    notes = models.TextField(
        blank=True, 
        null=True,
        help_text="Additional notes about this lead"
    )
    
    # ===== TIMESTAMPS =====
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Lead'
        verbose_name_plural = 'Leads'
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['assigned_to']),
            models.Index(fields=['created_at']),
        ]
    
    def clean(self):
        """Validate that at least phone or school_name is provided"""
        if not self.school_name and not self.phone:
            raise ValidationError("Either School Name or Phone must be provided")
    
    def save(self, *args, **kwargs):
        """Run validation before saving"""
        self.clean()
        super().save(*args, **kwargs)
    
    def __str__(self):
        if self.school_name:
            return self.school_name
        elif self.phone:
            return f"Lead - {self.phone}"
        return f"Lead #{self.id}"


class Activity(models.Model):
    """
    Activity model for tracking calls and meetings with leads
    Activities are only created for leads
    """
    
    # ===== ACTIVITY TYPE =====
    activity_type = models.CharField(
        max_length=20,
        choices=[
            ('Call', 'Phone Call'),
            ('Meeting', 'Meeting'),
        ],
        help_text="Type of activity"
    )
    
    # ===== LINKED TO LEAD =====
    lead = models.ForeignKey(
        'Lead',
        on_delete=models.CASCADE,
        related_name='activities',
        help_text="Lead this activity is related to"
    )
    
    # ===== ACTIVITY DETAILS =====
    subject = models.CharField(
        max_length=200,
        help_text="Brief subject of the activity"
    )
    description = models.TextField(
        blank=True, 
        null=True,
        help_text="Detailed description of the activity"
    )
    
    # ===== ASSIGNMENT =====
    assigned_to = models.ForeignKey(
        'students.CustomUser',
        on_delete=models.CASCADE,
        related_name='activities',
        help_text="User responsible for this activity"
    )
    
    # ===== STATUS & TIMING =====
    status = models.CharField(
        max_length=20,
        choices=[
            ('Scheduled', 'Scheduled'),
            ('Completed', 'Completed'),
            ('Cancelled', 'Cancelled'),
        ],
        default='Scheduled',
        help_text="Current status of the activity"
    )

    scheduled_date = models.DateTimeField(
        help_text="When this activity is scheduled"
    )
    completed_date = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When this activity was completed"
    )

    # ===== OUTCOME & TRACKING =====
    outcome = models.CharField(
        max_length=30,
        choices=[
            ('Interested', 'Interested'),
            ('Not Interested', 'Not Interested'),
            ('Follow-up Required', 'Follow-up Required'),
            ('No Answer', 'No Answer'),
            ('Wrong Number', 'Wrong Number'),
            ('Callback Requested', 'Callback Requested'),
            ('Other', 'Other'),
        ],
        blank=True,
        null=True,
        help_text="Outcome of the activity"
    )

    duration_minutes = models.PositiveIntegerField(
        blank=True,
        null=True,
        help_text="Duration of call/meeting in minutes"
    )

    is_logged = models.BooleanField(
        default=False,
        help_text="True if activity was logged after completion (not scheduled in advance)"
    )
    
    # ===== TIMESTAMPS =====
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-scheduled_date']
        verbose_name = 'Activity'
        verbose_name_plural = 'Activities'
        indexes = [
            models.Index(fields=['lead']),
            models.Index(fields=['assigned_to']),
            models.Index(fields=['scheduled_date']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"{self.activity_type} - {self.lead} ({self.scheduled_date.strftime('%Y-%m-%d')})"


class BDMTarget(models.Model):
    """
    BDM Target model for tracking monthly/quarterly/yearly targets
    Set by Admin, viewed by BDM
    """
    
    # ===== BDM & PERIOD =====
    bdm = models.ForeignKey(
        'students.CustomUser',
        on_delete=models.CASCADE,
        limit_choices_to={'role': 'BDM'},
        related_name='targets',
        help_text="BDM user for this target"
    )
    
    period_type = models.CharField(
        max_length=20,
        choices=[
            ('Monthly', 'Monthly'),
            ('Quarterly', 'Quarterly'),
            ('Yearly', 'Yearly'),
        ],
        default='Monthly',
        help_text="Type of target period"
    )
    
    # ===== TIME PERIOD =====
    start_date = models.DateField(
        help_text="Start date of target period"
    )
    end_date = models.DateField(
        help_text="End date of target period"
    )
    
    # ===== TARGETS =====
    leads_target = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        help_text="Target number of new leads"
    )
    conversions_target = models.IntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        help_text="Target number of converted schools"
    )
    revenue_target = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0.00,
        validators=[MinValueValidator(Decimal('0'))],
        help_text="Expected revenue target"
    )
    
    # ===== ACTUALS (Auto-calculated) =====
    leads_achieved = models.IntegerField(
        default=0,
        editable=False,
        help_text="Actual leads created (auto-calculated)"
    )
    conversions_achieved = models.IntegerField(
        default=0,
        editable=False,
        help_text="Actual conversions (auto-calculated)"
    )
    revenue_achieved = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0.00,
        editable=False,
        help_text="Actual revenue achieved (auto-calculated)"
    )
    
    # ===== TRACKING =====
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        'students.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_targets',
        help_text="Admin who created this target"
    )
    
    class Meta:
        ordering = ['-start_date']
        verbose_name = 'BDM Target'
        verbose_name_plural = 'BDM Targets'
        unique_together = ('bdm', 'start_date', 'end_date')
        indexes = [
            models.Index(fields=['bdm']),
            models.Index(fields=['start_date', 'end_date']),
        ]
    
    def __str__(self):
        return f"{self.bdm.get_full_name()} - {self.period_type} ({self.start_date.strftime('%b %Y')})"
    
    def refresh_actuals(self):
        """
        Recalculate actual achievements for this target period
        Called when leads are created/converted
        """
        from django.db.models import Sum
        from students.models import Fee

        # Count leads created in this period
        self.leads_achieved = Lead.objects.filter(
            assigned_to=self.bdm,
            created_at__date__gte=self.start_date,
            created_at__date__lte=self.end_date
        ).count()

        # Count conversions in this period - select_related to avoid N+1 on school
        converted_leads = Lead.objects.filter(
            assigned_to=self.bdm,
            status='Converted',
            conversion_date__date__gte=self.start_date,
            conversion_date__date__lte=self.end_date
        ).select_related('converted_to_school')
        self.conversions_achieved = converted_leads.count()

        # Calculate revenue from converted schools
        revenue = Decimal('0.00')

        # Collect school IDs for batch fee query
        per_student_school_ids = []
        for lead in converted_leads:
            if lead.converted_to_school:
                school = lead.converted_to_school
                if school.payment_mode == 'monthly_subscription':
                    conversion_month = lead.conversion_date.month
                    months_active = min(
                        12,
                        (self.end_date.month - conversion_month + 1)
                    )
                    if school.monthly_subscription_amount:
                        revenue += school.monthly_subscription_amount * months_active
                else:  # per_student
                    per_student_school_ids.append(school.id)

        # Single batch query for all per_student school fees (was N separate queries)
        if per_student_school_ids:
            fee_totals = Fee.objects.filter(
                school_id__in=per_student_school_ids,
                payment_date__gte=self.start_date,
                payment_date__lte=self.end_date
            ).aggregate(total=Sum('paid_amount'))
            if fee_totals['total']:
                revenue += fee_totals['total']

        self.revenue_achieved = revenue
        self.save()
    
    def get_progress_percentage(self, field='leads'):
        """Calculate percentage progress for a specific field"""
        target_field = f"{field}_target"
        achieved_field = f"{field}_achieved"
        
        target = getattr(self, target_field, 0)
        achieved = getattr(self, achieved_field, 0)
        
        if target == 0:
            return 0
        
        return min(100, round((achieved / target) * 100, 2))
