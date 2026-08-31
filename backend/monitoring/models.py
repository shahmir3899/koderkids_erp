# ============================================
# MONITORING MODELS
# ============================================
# Instant-start BDM school visits with free-form
# teacher evaluation (ad-hoc questions, optional ratings).

from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal

from students.models import CustomUser, School


# ============================================
# VISITS
# ============================================

class MonitoringVisit(models.Model):
    """
    A monitoring visit to a school. Created already in_progress —
    whoever is on-site starts recording the moment they arrive,
    then evaluates teachers before marking it completed.
    """
    STATUS_CHOICES = [
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]

    bdm = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        limit_choices_to={'role__in': ['Admin', 'BDM']},
        related_name='monitoring_visits',
    )
    school = models.ForeignKey(
        School,
        on_delete=models.CASCADE,
        related_name='monitoring_visits',
    )
    visit_date = models.DateField()
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='in_progress',
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
        verbose_name = 'Monitoring Visit'
        verbose_name_plural = 'Monitoring Visits'

    def __str__(self):
        return f"{self.bdm.get_full_name()} → {self.school.name} ({self.visit_date})"


# ============================================
# TEACHER EVALUATIONS (FREE-FORM Q&A)
# ============================================

class TeacherEvaluation(models.Model):
    """
    A completed evaluation for one teacher during a visit.
    Built from ad-hoc questions the BDM types on the spot.
    Score is auto-calculated from any rated questions.
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
        verbose_name = 'Teacher Evaluation'
        verbose_name_plural = 'Teacher Evaluations'

    def __str__(self):
        return f"{self.teacher.get_full_name()} @ {self.visit.school.name} ({self.visit.visit_date})"

    def calculate_score(self):
        """
        Average the 1-5 rating of any rated questions, normalized to 0-100.
        Unrated questions (plain Q&A notes) don't contribute.
        """
        ratings = list(
            self.questions.filter(rating__isnull=False).values_list('rating', flat=True)
        )

        if ratings:
            average = sum(Decimal(r) for r in ratings) / Decimal(len(ratings))
            score_0_to_100 = ((average / Decimal('5.00')) * Decimal('100.00')).quantize(Decimal('0.01'))
        else:
            score_0_to_100 = Decimal('0.00')

        # Persist both score fields on the same 0-100 scale to avoid DB overflow
        # and keep API responses consistent.
        self.normalized_score = score_0_to_100
        self.total_score = score_0_to_100
        self.save(update_fields=['total_score', 'normalized_score'])


class EvaluationQuestion(models.Model):
    """
    A single ad-hoc question + answer within a teacher evaluation.
    The BDM types the question and answer on the spot; a 1-5 rating
    is optional and, when set, feeds the evaluation's score.
    """
    evaluation = models.ForeignKey(
        TeacherEvaluation,
        on_delete=models.CASCADE,
        related_name='questions',
    )
    question_text = models.CharField(max_length=500)
    answer_text = models.TextField(blank=True)
    rating = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text='Optional 1-5 rating; only rated questions contribute to the score.',
    )
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ['order', 'id']
        verbose_name = 'Evaluation Question'
        verbose_name_plural = 'Evaluation Questions'

    def __str__(self):
        return f"{self.question_text}: {self.answer_text}"
