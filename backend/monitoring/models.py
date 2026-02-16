# ============================================
# MONITORING MODELS
# ============================================
# Visit planning, configurable evaluation forms,
# and teacher evaluation during BDM school visits.

from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal

from students.models import CustomUser, School


# ============================================
# VISIT PLANNING
# ============================================

class MonitoringVisit(models.Model):
    """
    A planned or completed BDM visit to a school.
    BDMs plan visits on school working days, then
    evaluate teachers on-site during the visit.
    """
    STATUS_CHOICES = [
        ('planned', 'Planned'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('missed', 'Missed'),
    ]

    bdm = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        limit_choices_to={'role': 'BDM'},
        related_name='monitoring_visits',
    )
    school = models.ForeignKey(
        School,
        on_delete=models.CASCADE,
        related_name='monitoring_visits',
    )
    visit_date = models.DateField()
    planned_time = models.TimeField(null=True, blank=True, help_text='BDM planned visit time')
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='planned',
    )
    purpose = models.CharField(
        max_length=200,
        blank=True,
        help_text='e.g. Monthly Review, New Teacher Onboarding',
    )
    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-visit_date', '-created_at']
        unique_together = ('school', 'visit_date')
        verbose_name = 'Monitoring Visit'
        verbose_name_plural = 'Monitoring Visits'

    def __str__(self):
        return f"{self.bdm.get_full_name()} → {self.school.name} ({self.visit_date})"


# ============================================
# CONFIGURABLE EVALUATION FORMS
# ============================================

class EvaluationFormTemplate(models.Model):
    """
    Admin-created evaluation form template.
    Each template has a set of configurable fields.
    A default template is seeded matching the existing
    BDMVisitProforma 5-criteria format.
    """
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_form_templates',
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        verbose_name = 'Evaluation Form Template'
        verbose_name_plural = 'Evaluation Form Templates'

    def __str__(self):
        return self.name


class EvaluationFormField(models.Model):
    """
    A single field within an evaluation form template.
    Supports multiple field types and weighted scoring.
    """
    FIELD_TYPE_CHOICES = [
        ('rating_1_5', 'Rating 1-5'),
        ('rating_1_10', 'Rating 1-10'),
        ('text', 'Text Input'),
        ('textarea', 'Text Area'),
        ('yes_no', 'Yes / No'),
        ('select', 'Dropdown Select'),
    ]

    template = models.ForeignKey(
        EvaluationFormTemplate,
        on_delete=models.CASCADE,
        related_name='fields',
    )
    label = models.CharField(max_length=200)
    field_type = models.CharField(max_length=20, choices=FIELD_TYPE_CHOICES)
    is_required = models.BooleanField(default=True)
    order = models.IntegerField(default=0)
    options = models.JSONField(
        default=list,
        blank=True,
        help_text='Options for select type, e.g. ["Good", "Average", "Poor"]',
    )
    weight = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text='Weight for score calculation (0 = not scored)',
    )

    class Meta:
        ordering = ['order']
        verbose_name = 'Evaluation Form Field'
        verbose_name_plural = 'Evaluation Form Fields'

    def __str__(self):
        return f"{self.template.name} → {self.label}"


# ============================================
# TEACHER EVALUATIONS (FILLED FORMS)
# ============================================

class TeacherEvaluation(models.Model):
    """
    A completed evaluation for one teacher during a visit.
    Links to the visit, teacher, and the template used.
    Score is auto-calculated from weighted field responses.
    """
    visit = models.ForeignKey(
        MonitoringVisit,
        on_delete=models.CASCADE,
        related_name='evaluations',
    )
    teacher = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        limit_choices_to={'role': 'Teacher'},
        related_name='monitoring_evaluations',
    )
    template = models.ForeignKey(
        EvaluationFormTemplate,
        on_delete=models.PROTECT,
        related_name='evaluations',
    )

    # Calculated scores
    total_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
    )
    normalized_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text='Score normalized to 0-100 scale',
    )

    # Qualitative fields
    remarks = models.TextField(blank=True)
    areas_of_improvement = models.TextField(blank=True)
    teacher_strengths = models.TextField(blank=True)

    submitted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-submitted_at']
        unique_together = ('visit', 'teacher')
        verbose_name = 'Teacher Evaluation'
        verbose_name_plural = 'Teacher Evaluations'

    def __str__(self):
        return f"{self.teacher.get_full_name()} @ {self.visit.school.name} ({self.visit.visit_date})"

    def calculate_score(self):
        """
        Calculate total and normalized score from weighted responses.
        Only rating fields with weight > 0 contribute to the score.
        """
        responses = self.responses.select_related('field').filter(
            field__weight__gt=0,
            numeric_value__isnull=False,
        )

        total_weight = Decimal('0.00')
        weighted_sum = Decimal('0.00')

        for resp in responses:
            field = resp.field
            weight = field.weight

            # Normalize the numeric value to 0-100 based on field type
            if field.field_type == 'rating_1_5':
                max_val = Decimal('5.00')
            elif field.field_type == 'rating_1_10':
                max_val = Decimal('10.00')
            elif field.field_type == 'yes_no':
                max_val = Decimal('1.00')
            else:
                continue  # text/textarea/select don't contribute to score

            normalized = (resp.numeric_value / max_val) * Decimal('100.00')
            weighted_sum += normalized * weight
            total_weight += weight

        if total_weight > 0:
            self.normalized_score = (weighted_sum / total_weight).quantize(Decimal('0.01'))
        else:
            self.normalized_score = Decimal('0.00')

        self.total_score = weighted_sum.quantize(Decimal('0.01'))
        self.save(update_fields=['total_score', 'normalized_score'])


class EvaluationResponse(models.Model):
    """
    A single field response within a teacher evaluation.
    Stores the value as text for all types, plus a numeric
    value for scoring purposes on rating fields.
    """
    evaluation = models.ForeignKey(
        TeacherEvaluation,
        on_delete=models.CASCADE,
        related_name='responses',
    )
    field = models.ForeignKey(
        EvaluationFormField,
        on_delete=models.PROTECT,
        related_name='responses',
    )
    value = models.TextField(help_text='Stored as text for all field types')
    numeric_value = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Numeric value for rating fields (for scoring)',
    )

    class Meta:
        unique_together = ('evaluation', 'field')
        verbose_name = 'Evaluation Response'
        verbose_name_plural = 'Evaluation Responses'

    def __str__(self):
        return f"{self.field.label}: {self.value}"
