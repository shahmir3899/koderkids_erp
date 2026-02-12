# ============================================
# EMPLOYEES MODELS - Updated with Employee ID & Notifications
# NOW SUPPORTS BOTH TEACHERS AND ADMINS
# ============================================

from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.core.validators import MinValueValidator
from students.models import CustomUser, School
from decimal import Decimal
import datetime


class TeacherProfile(models.Model):
    """
    Extended profile for employees (Teachers and Admins)
    Auto-generates employee ID based on role
    """
    GENDER_CHOICES = [
        ('Male', 'Male'),
        ('Female', 'Female'),
        ('Other', 'Other'),
    ]
    
    BLOOD_GROUP_CHOICES = [
        ('A+', 'A+'),
        ('A-', 'A-'),
        ('B+', 'B+'),
        ('B-', 'B-'),
        ('AB+', 'AB+'),
        ('AB-', 'AB-'),
        ('O+', 'O+'),
        ('O-', 'O-'),
    ]
    
    # UPDATED: Now supports Teacher, Admin, and BDM roles
    user = models.OneToOneField(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='teacher_profile',
        limit_choices_to={'role__in': ['Teacher', 'Admin', 'BDM']}
    )
    
    # Auto-generated Employee ID
    # Teachers: KK-T-025, KK-T-026, etc.
    # Admins: KK-A-001, KK-A-002, etc.
    employee_id = models.CharField(
        max_length=20, 
        unique=True, 
        blank=True, 
        null=True,
        help_text="Auto-generated employee ID (e.g., KK-T-025 or KK-A-001)"
    )
    
    # Profile Photo URL (stored in Supabase)
    profile_photo_url = models.URLField(
        max_length=500, 
        blank=True, 
        null=True,
        help_text="URL to profile photo in Supabase storage"
    )
    
    # Personal Info
    title = models.CharField(max_length=100, blank=True, null=True)
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES, blank=True, null=True)
    blood_group = models.CharField(max_length=5, choices=BLOOD_GROUP_CHOICES, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    
    # Employment Info
    date_of_joining = models.DateField(blank=True, null=True)
    
    # Financial Info
    basic_salary = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0.00,
        validators=[MinValueValidator(Decimal('0'))],
        help_text="Monthly salary in PKR"
    )
    bank_name = models.CharField(max_length=100, blank=True, null=True)
    account_title = models.CharField(max_length=150, blank=True, null=True, help_text="Bank account holder name")
    account_number = models.CharField(max_length=50, blank=True, null=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Employee Profile"
        verbose_name_plural = "Employee Profiles"

    def __str__(self):
        return f"{self.employee_id or 'No ID'} - {self.user.get_full_name()} ({self.user.username})"

    def save(self, *args, **kwargs):
        # Auto-generate employee_id if not set
        if not self.employee_id:
            self.employee_id = self.generate_employee_id()
        super().save(*args, **kwargs)

    def generate_employee_id(self):
        """
        Generate employee ID based on role:
        - Teachers: KK-T-XXX (starting from 025)
        - Admins: KK-A-XXX (starting from 001)
        - BDMs: KK-BDM-XXX (starting from 001)
        """
        role = self.user.role

        # Determine prefix and start number based on role
        if role == 'Admin':
            prefix = 'KK-A'
            start_number = 1
        elif role == 'BDM':
            prefix = 'KK-BDM'
            start_number = 1
        else:  # Teacher (default)
            prefix = 'KK-T'
            start_number = 25
        
        # Get the last employee ID with same prefix
        last_profile = TeacherProfile.objects.filter(
            employee_id__startswith=prefix
        ).order_by('-employee_id').first()
        
        if last_profile and last_profile.employee_id:
            try:
                # Extract the number from KK-X-XXX
                last_number = int(last_profile.employee_id.split('-')[-1])
                new_number = last_number + 1
            except (ValueError, IndexError):
                new_number = start_number
        else:
            new_number = start_number
        
        return f"{prefix}-{new_number:03d}"

    @property
    def full_name(self):
        return self.user.get_full_name() or self.user.username


class TeacherEarning(models.Model):
    """
    Additional earnings for teachers (bonuses, allowances, etc.)
    """
    teacher = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        limit_choices_to={'role': 'Teacher'},
        related_name='earnings'
    )
    category = models.CharField(max_length=50)
    amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0.00, 
        validators=[MinValueValidator(Decimal('0'))]
    )
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.category}: PKR {self.amount} for {self.teacher.get_full_name()}"


class TeacherDeduction(models.Model):
    """
    Deductions from teacher salary (loans, advances, etc.)
    """
    teacher = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        limit_choices_to={'role': 'Teacher'},
        related_name='deductions'
    )
    category = models.CharField(max_length=50)
    amount = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=0.00, 
        validators=[MinValueValidator(Decimal('0'))]
    )
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.category}: PKR {self.amount} for {self.teacher.get_full_name()}"


class Notification(models.Model):
    """
    In-app notifications for users
    """
    NOTIFICATION_TYPES = [
        ('info', 'Information'),
        ('warning', 'Warning'),
        ('success', 'Success'),
        ('error', 'Error'),
        ('message', 'Message'),
        ('reminder', 'Reminder'),
    ]
    
    recipient = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    sender = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sent_notifications'
    )
    
    title = models.CharField(max_length=200)
    message = models.TextField()
    notification_type = models.CharField(
        max_length=20, 
        choices=NOTIFICATION_TYPES, 
        default='info'
    )
    
    # Link to related object (optional)
    related_url = models.URLField(blank=True, null=True)
    
    # Status
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = "Notification"
        verbose_name_plural = "Notifications"

    def __str__(self):
        return f"{self.title} - {self.recipient.username}"

    def mark_as_read(self):
        if not self.is_read:
            self.is_read = True
            self.read_at = datetime.datetime.now()
            self.save()


# ============================================
# SALARY SLIP MODEL - Stores generated salary slips
# ============================================

class SalarySlip(models.Model):
    """
    Stores salary slips generated for employees.
    Snapshots all financial data at time of generation for audit trail.
    """
    LINE_SPACING_CHOICES = [
        ('single', 'Single'),
        ('1.5', '1.5'),
        ('double', 'Double'),
    ]

    # Employee reference
    teacher = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        related_name='salary_slips',
        help_text="Employee for whom this salary slip was generated"
    )

    # Period information
    from_date = models.DateField(help_text="Salary period start date")
    till_date = models.DateField(help_text="Salary period end date")
    payment_date = models.DateField(help_text="Date of payment")

    # Snapshot data (frozen at generation time)
    company_name = models.CharField(max_length=200, default='EARLY BIRD KODER KIDS PVT LTD')
    employee_name = models.CharField(max_length=200)
    employee_id_snapshot = models.CharField(max_length=20, blank=True, null=True)
    title = models.CharField(max_length=100, blank=True, null=True)
    schools = models.TextField(blank=True, null=True, help_text="Schools assigned (one per line)")
    date_of_joining = models.DateField(blank=True, null=True)
    bank_name = models.CharField(max_length=100, blank=True, null=True)
    account_title = models.CharField(max_length=150, blank=True, null=True, help_text="Bank account holder name")
    account_number = models.CharField(max_length=50, blank=True, null=True)

    # Financial data
    basic_salary = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0'),
        validators=[MinValueValidator(Decimal('0'))]
    )
    no_of_days = models.IntegerField(default=0, help_text="Actual days in period")
    normalized_days = models.IntegerField(default=30, help_text="Normalized days (30-day month)")
    prorated_salary = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0'),
        validators=[MinValueValidator(Decimal('0'))]
    )

    # Earnings and deductions (JSON snapshots)
    earnings_snapshot = models.JSONField(
        default=list,
        blank=True,
        help_text="JSON array of earnings at time of generation"
    )
    deductions_snapshot = models.JSONField(
        default=list,
        blank=True,
        help_text="JSON array of deductions at time of generation"
    )

    # Totals
    total_earnings = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0'),
        validators=[MinValueValidator(Decimal('0'))]
    )
    total_deductions = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0'),
        validators=[MinValueValidator(Decimal('0'))]
    )
    net_pay = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal('0'),
        help_text="Final amount after earnings and deductions"
    )

    # Formatting
    line_spacing = models.CharField(
        max_length=10,
        choices=LINE_SPACING_CHOICES,
        default='1.5'
    )

    # Generation metadata
    generated_by = models.ForeignKey(
        CustomUser,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='generated_salary_slips',
        help_text="Admin who generated this slip"
    )
    generated_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Salary Slip"
        verbose_name_plural = "Salary Slips"
        ordering = ['-generated_at']
        unique_together = [['teacher', 'from_date', 'till_date']]
        indexes = [
            models.Index(fields=['teacher']),
            models.Index(fields=['from_date', 'till_date']),
            models.Index(fields=['generated_at']),
        ]

    def __str__(self):
        return f"{self.employee_name} - {self.from_date} to {self.till_date}"

    @property
    def period_display(self):
        """Return formatted period string."""
        return f"{self.from_date.strftime('%b %d, %Y')} - {self.till_date.strftime('%b %d, %Y')}"


# ============================================
# SIGNALS - Auto-create TeacherProfile for Teachers, Admins, and BDMs
# ============================================

@receiver(post_save, sender=CustomUser)
def create_employee_profile(sender, instance, created, **kwargs):
    """
    Automatically create TeacherProfile when a new Teacher, Admin, or BDM user is created
    """
    if instance.role in ['Teacher', 'Admin', 'BDM']:
        TeacherProfile.objects.get_or_create(user=instance)


@receiver(post_save, sender=CustomUser)
def save_employee_profile(sender, instance, **kwargs):
    """
    Save TeacherProfile when user is saved (for Teachers, Admins, and BDMs)
    """
    if instance.role in ['Teacher', 'Admin', 'BDM'] and hasattr(instance, 'teacher_profile'):
        instance.teacher_profile.save()


# ============================================
# BDM PROFORMA & TEACHER EVALUATION MODELS
# ============================================

class BDMVisitProforma(models.Model):
    """
    Monthly BDM visit proforma for teacher attitude evaluation.
    BDM fills this during their monthly school visits.

    The attitude score from this proforma contributes to the overall
    teacher evaluation (30% weight).
    """
    teacher = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        limit_choices_to={'role': 'Teacher'},
        related_name='bdm_proformas'
    )
    school = models.ForeignKey(
        School,
        on_delete=models.CASCADE,
        related_name='bdm_proformas'
    )
    bdm = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        limit_choices_to={'role': 'BDM'},
        related_name='submitted_proformas',
        help_text="BDM who filled this proforma"
    )

    # Period
    visit_date = models.DateField()
    month = models.IntegerField(help_text="Month (1-12)")
    year = models.IntegerField()

    # Rating parameters (1-5 scale)
    discipline_rating = models.IntegerField(
        default=3,
        help_text="Discipline & punctuality (1-5)"
    )
    communication_rating = models.IntegerField(
        default=3,
        help_text="Communication skills (1-5)"
    )
    child_handling_rating = models.IntegerField(
        default=3,
        help_text="Child handling & patience (1-5)"
    )
    professionalism_rating = models.IntegerField(
        default=3,
        help_text="Professionalism & dress code (1-5)"
    )
    content_knowledge_rating = models.IntegerField(
        default=3,
        help_text="Subject content knowledge (1-5)"
    )

    # Calculated attitude score (average * 20 to convert to 0-100)
    overall_attitude_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        help_text="Calculated from average of all ratings (0-100)"
    )

    # Additional info
    remarks = models.TextField(blank=True)
    areas_of_improvement = models.TextField(blank=True)
    teacher_strengths = models.TextField(blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-visit_date']
        verbose_name = 'BDM Visit Proforma'
        verbose_name_plural = 'BDM Visit Proformas'
        unique_together = ('teacher', 'school', 'month', 'year')

    def __str__(self):
        return f"{self.teacher.get_full_name()} - {self.school.name} ({self.month}/{self.year})"

    def save(self, *args, **kwargs):
        # Calculate overall attitude score
        ratings = [
            self.discipline_rating,
            self.communication_rating,
            self.child_handling_rating,
            self.professionalism_rating,
            self.content_knowledge_rating
        ]
        average = sum(ratings) / len(ratings)
        # Convert 1-5 scale to 0-100 scale
        self.overall_attitude_score = average * 20
        super().save(*args, **kwargs)


class TeacherEvaluationScore(models.Model):
    """
    Monthly calculated teacher evaluation score.

    Score formula:
    - ERP Attendance (login-based): 30%
    - Attitude Rating (BDM proforma): 30%
    - Student Interest & Engagement: 20%
    - New Enrollment Impact: 20%
    """
    RATING_CHOICES = [
        ('master_trainer', 'Master Trainer'),
        ('certified_trainer', 'Certified Trainer'),
        ('needs_improvement', 'Needs Improvement'),
        ('performance_review', 'Performance Review'),
    ]

    teacher = models.ForeignKey(
        CustomUser,
        on_delete=models.CASCADE,
        limit_choices_to={'role': 'Teacher'},
        related_name='evaluation_scores'
    )

    # Period
    month = models.IntegerField(help_text="Month (1-12)")
    year = models.IntegerField()

    # Component scores (0-100)
    attendance_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        help_text="Score from TeacherAttendance (0-100)"
    )
    attitude_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        help_text="Score from BDMVisitProforma (0-100)"
    )
    student_interest_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        help_text="Score from TopicProgress completion rates (0-100)"
    )
    enrollment_impact_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        help_text="Score from new student admissions (0-100)"
    )

    # Weighted total
    total_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        help_text="Weighted total score"
    )
    rating = models.CharField(
        max_length=30,
        choices=RATING_CHOICES,
        default='needs_improvement'
    )

    # Timestamps
    calculated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-year', '-month']
        verbose_name = 'Teacher Evaluation Score'
        verbose_name_plural = 'Teacher Evaluation Scores'
        unique_together = ('teacher', 'month', 'year')

    def __str__(self):
        return f"{self.teacher.get_full_name()} - {self.month}/{self.year}: {self.total_score}%"

    def calculate_score(self):
        """
        Calculate the weighted total score.

        Weight distribution:
        - Attendance: 30%
        - Attitude: 30%
        - Student Interest: 20%
        - Enrollment Impact: 20%
        """
        self.total_score = (
            (float(self.attendance_score) * 0.30) +
            (float(self.attitude_score) * 0.30) +
            (float(self.student_interest_score) * 0.20) +
            (float(self.enrollment_impact_score) * 0.20)
        )

        # Assign rating based on total score
        if self.total_score >= 85:
            self.rating = 'master_trainer'
        elif self.total_score >= 70:
            self.rating = 'certified_trainer'
        elif self.total_score >= 55:
            self.rating = 'needs_improvement'
        else:
            self.rating = 'performance_review'

        self.save()
        return self.total_score

    @classmethod
    def calculate_for_teacher(cls, teacher, month, year):
        """
        Calculate or update evaluation score for a teacher.
        """
        from students.models import TeacherAttendance
        from courses.models import TopicProgress
        from django.db.models import Avg, Count

        # Get or create score record
        score, created = cls.objects.get_or_create(
            teacher=teacher,
            month=month,
            year=year
        )

        # 1. Attendance Score
        # Get teacher's attendance for the month
        from django.utils import timezone
        from datetime import date
        month_start = date(year, month, 1)
        if month == 12:
            month_end = date(year + 1, 1, 1)
        else:
            month_end = date(year, month + 1, 1)

        # Get working days from assigned schools
        teacher_schools = teacher.assigned_schools.all()
        total_working_days = 0
        present_days = 0

        for school in teacher_schools:
            # Count assigned days in the month
            current_date = month_start
            while current_date < month_end:
                if school.is_working_day(current_date):
                    total_working_days += 1
                current_date += timezone.timedelta(days=1)

        # Count actual attendance
        attendance_records = TeacherAttendance.objects.filter(
            teacher=teacher,
            date__gte=month_start,
            date__lt=month_end,
            status__in=['Present', 'Within Geofence']
        ).count()

        if total_working_days > 0:
            score.attendance_score = min(100, (attendance_records / total_working_days) * 100)
        else:
            score.attendance_score = 0

        # 2. Attitude Score (from Monitoring Evaluation or legacy BDM Proforma)
        # Prefer new monitoring evaluations over legacy proforma
        monitoring_score = None
        try:
            from monitoring.models import TeacherEvaluation
            monitoring_eval = TeacherEvaluation.objects.filter(
                teacher=teacher,
                visit__visit_date__month=month,
                visit__visit_date__year=year,
                normalized_score__gt=0,
            ).order_by('-submitted_at').first()

            if monitoring_eval:
                monitoring_score = monitoring_eval.normalized_score
        except Exception:
            pass  # monitoring app may not be installed yet

        if monitoring_score is not None:
            score.attitude_score = monitoring_score
        else:
            # Fall back to legacy BDM Proforma
            proforma = BDMVisitProforma.objects.filter(
                teacher=teacher,
                month=month,
                year=year
            ).first()

            if proforma:
                score.attitude_score = proforma.overall_attitude_score
            else:
                score.attitude_score = 0

        # 3. Student Interest Score (from TopicProgress completion rates)
        # Get students in teacher's schools
        from students.models import Student
        students_in_schools = Student.objects.filter(
            school__in=teacher_schools,
            is_active=True
        )

        if students_in_schools.exists():
            progress_stats = TopicProgress.objects.filter(
                enrollment__student__in=students_in_schools
            ).aggregate(
                completed=Count('id', filter=models.Q(status='completed')),
                total=Count('id')
            )

            if progress_stats['total'] > 0:
                score.student_interest_score = (
                    progress_stats['completed'] / progress_stats['total']
                ) * 100
            else:
                score.student_interest_score = 0
        else:
            score.student_interest_score = 0

        # 4. Enrollment Impact Score
        # This would need a StudentEnrollmentRecord model to track
        # For now, we'll set it based on student count growth
        # Simplified: 20 students = 100%, scaling down
        student_count = students_in_schools.count()
        score.enrollment_impact_score = min(100, student_count * 5)  # 20 students = 100

        # Calculate total
        score.calculate_score()
        return score