# courses/models.py
from django.db import models
from django.utils import timezone


class CourseEnrollment(models.Model):
    """
    Tracks student enrollment in courses (books).
    One student can enroll in multiple courses.
    """
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('paused', 'Paused'),
        ('dropped', 'Dropped'),
    ]

    student = models.ForeignKey(
        'students.Student',
        on_delete=models.CASCADE,
        related_name='course_enrollments'
    )
    course = models.ForeignKey(
        'books.Book',
        on_delete=models.CASCADE,
        related_name='enrollments'
    )
    enrolled_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='active'
    )
    last_accessed_at = models.DateTimeField(auto_now=True)
    last_topic = models.ForeignKey(
        'books.Topic',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='resume_points',
        help_text="Last topic viewed for resume functionality"
    )

    class Meta:
        unique_together = ('student', 'course')
        ordering = ['-last_accessed_at']
        verbose_name = 'Course Enrollment'
        verbose_name_plural = 'Course Enrollments'

    def __str__(self):
        return f"{self.student.name} - {self.course.title}"

    def get_progress_percentage(self):
        """Calculate overall course progress percentage."""
        total_topics = self.course.topics.filter(is_required=True).count()
        if total_topics == 0:
            return 0
        completed = self.topic_progress.filter(status='completed').count()
        return round((completed / total_topics) * 100, 1)

    def mark_completed(self):
        """Mark course as completed."""
        self.status = 'completed'
        self.completed_at = timezone.now()
        self.save()


class TopicProgress(models.Model):
    """
    Tracks individual topic completion and time spent.
    """
    STATUS_CHOICES = [
        ('not_started', 'Not Started'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
    ]

    enrollment = models.ForeignKey(
        CourseEnrollment,
        on_delete=models.CASCADE,
        related_name='topic_progress'
    )
    topic = models.ForeignKey(
        'books.Topic',
        on_delete=models.CASCADE,
        related_name='student_progress'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='not_started'
    )
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    time_spent_seconds = models.PositiveIntegerField(default=0)
    last_position = models.JSONField(
        default=dict,
        blank=True,
        help_text="Store video timestamp, scroll position, etc."
    )

    class Meta:
        unique_together = ('enrollment', 'topic')
        ordering = ['topic__lft']  # MPTT ordering
        verbose_name = 'Topic Progress'
        verbose_name_plural = 'Topic Progress'

    def __str__(self):
        return f"{self.enrollment.student.name} - {self.topic.display_title} ({self.status})"

    def is_unlocked(self):
        """
        Check if this topic is unlocked based on sequential completion.
        Simplified logic:
        - Chapters are always unlocked (students can jump between chapters)
        - First lesson in each chapter is always unlocked
        - Other lessons require previous sibling to be completed
        """
        # Chapters (parent=None or type='chapter') are always unlocked
        if self.topic.type == 'chapter' or self.topic.parent is None:
            return True

        # Get previous sibling in MPTT tree
        previous = self.topic.get_previous_sibling()

        # First lesson in chapter (no previous sibling) is always unlocked
        if not previous:
            return True

        # Check if previous topic is completed
        prev_progress = TopicProgress.objects.filter(
            enrollment=self.enrollment,
            topic=previous,
            status='completed'
        ).exists()
        return prev_progress

    def mark_started(self):
        """Mark topic as started."""
        if self.status == 'not_started':
            self.status = 'in_progress'
            self.started_at = timezone.now()
            self.save()
            # Update enrollment's last_topic
            self.enrollment.last_topic = self.topic
            self.enrollment.save()

    def mark_completed(self):
        """Mark topic as completed."""
        self.status = 'completed'
        self.completed_at = timezone.now()
        self.save()
        # Update enrollment's last_topic
        self.enrollment.last_topic = self.topic
        self.enrollment.save()

    def add_time(self, seconds):
        """Add time spent on this topic."""
        self.time_spent_seconds += seconds
        self.save(update_fields=['time_spent_seconds'])


class Quiz(models.Model):
    """
    Quiz associated with a topic.
    """
    topic = models.ForeignKey(
        'books.Topic',
        on_delete=models.CASCADE,
        related_name='quizzes'
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    passing_score = models.PositiveIntegerField(
        default=70,
        help_text="Passing score percentage (0-100)"
    )
    time_limit_minutes = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Time limit in minutes (null = no limit)"
    )
    max_attempts = models.PositiveIntegerField(
        default=3,
        help_text="Maximum number of attempts allowed"
    )
    shuffle_questions = models.BooleanField(default=True)
    show_correct_answers = models.BooleanField(
        default=True,
        help_text="Show correct answers after submission"
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        'students.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_quizzes'
    )

    class Meta:
        verbose_name_plural = "Quizzes"
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} ({self.topic.display_title})"

    def get_total_points(self):
        """Calculate total points for the quiz."""
        return self.questions.aggregate(
            total=models.Sum('points')
        )['total'] or 0


class QuizQuestion(models.Model):
    """
    Individual question in a quiz.
    """
    QUESTION_TYPES = [
        ('multiple_choice', 'Multiple Choice'),
        ('true_false', 'True/False'),
        ('multiple_answer', 'Multiple Answer'),
    ]

    quiz = models.ForeignKey(
        Quiz,
        on_delete=models.CASCADE,
        related_name='questions'
    )
    question_type = models.CharField(
        max_length=20,
        choices=QUESTION_TYPES,
        default='multiple_choice'
    )
    question_text = models.TextField()
    question_media = models.JSONField(
        default=dict,
        blank=True,
        help_text="Optional image/video URL for question: {type: 'image'|'video', url: '...'}"
    )
    explanation = models.TextField(
        blank=True,
        help_text="Explanation shown after answering"
    )
    points = models.PositiveIntegerField(default=1)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"Q{self.order + 1}: {self.question_text[:50]}..."


class QuizChoice(models.Model):
    """
    Answer choice for a question.
    """
    question = models.ForeignKey(
        QuizQuestion,
        on_delete=models.CASCADE,
        related_name='choices'
    )
    choice_text = models.TextField()
    is_correct = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']

    def __str__(self):
        correct = "✓" if self.is_correct else "✗"
        return f"{correct} {self.choice_text[:30]}..."


class QuizAttempt(models.Model):
    """
    Student's quiz attempt.
    """
    enrollment = models.ForeignKey(
        CourseEnrollment,
        on_delete=models.CASCADE,
        related_name='quiz_attempts'
    )
    quiz = models.ForeignKey(
        Quiz,
        on_delete=models.CASCADE,
        related_name='attempts'
    )
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Score as percentage"
    )
    points_earned = models.PositiveIntegerField(
        default=0,
        help_text="Total points earned"
    )
    passed = models.BooleanField(null=True)
    answers = models.JSONField(
        default=list,
        help_text="List of {question_id, selected_choices, is_correct, points_earned}"
    )
    time_taken_seconds = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        ordering = ['-started_at']

    def __str__(self):
        status = "Passed" if self.passed else "Failed" if self.passed is False else "In Progress"
        return f"{self.enrollment.student.name} - {self.quiz.title} ({status})"

    def submit(self, answers):
        """
        Submit quiz answers and calculate score.

        Args:
            answers: List of {question_id: int, selected_choices: [choice_ids]}
        """
        total_points = 0
        earned_points = 0
        graded_answers = []

        for answer in answers:
            question_id = answer.get('question_id')
            selected_choices = answer.get('selected_choices', [])

            try:
                question = self.quiz.questions.get(id=question_id)
            except QuizQuestion.DoesNotExist:
                continue

            total_points += question.points

            # Get correct choices
            correct_choice_ids = set(
                question.choices.filter(is_correct=True).values_list('id', flat=True)
            )
            selected_set = set(selected_choices)

            # Check if answer is correct
            is_correct = selected_set == correct_choice_ids
            points = question.points if is_correct else 0
            earned_points += points

            graded_answers.append({
                'question_id': question_id,
                'selected_choices': selected_choices,
                'correct_choices': list(correct_choice_ids),
                'is_correct': is_correct,
                'points_earned': points,
                'points_possible': question.points,
            })

        # Calculate score percentage
        score = (earned_points / total_points * 100) if total_points > 0 else 0

        self.answers = graded_answers
        self.points_earned = earned_points
        self.score = round(score, 2)
        self.passed = score >= self.quiz.passing_score
        self.completed_at = timezone.now()

        if self.started_at:
            self.time_taken_seconds = int(
                (self.completed_at - self.started_at).total_seconds()
            )

        self.save()
        return self

    def get_attempt_number(self):
        """Get the attempt number for this quiz attempt."""
        return QuizAttempt.objects.filter(
            enrollment=self.enrollment,
            quiz=self.quiz,
            started_at__lte=self.started_at
        ).count()

    def can_retry(self):
        """Check if student can retry this quiz."""
        attempt_count = QuizAttempt.objects.filter(
            enrollment=self.enrollment,
            quiz=self.quiz
        ).count()
        return attempt_count < self.quiz.max_attempts


# ============================================
# ACTIVITY PROOF & VALIDATION MODELS
# ============================================

class ActivityProof(models.Model):
    """
    Student-uploaded screenshot proof of activity completion.
    Part of the 5-step validation pipeline:
    Reading → Activity → Screenshot → Teacher Approval → Guardian Review
    """
    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    RATING_CHOICES = [
        ('basic', 'Basic'),
        ('good', 'Good'),
        ('excellent', 'Excellent'),
    ]

    SOFTWARE_CHOICES = [
        ('scratch', 'Scratch'),
        ('python', 'Python'),
        ('canva', 'Canva'),
        ('ai_tool', 'AI Tool'),
        ('other', 'Other'),
    ]

    # Student & Topic info
    student = models.ForeignKey(
        'students.Student',
        on_delete=models.CASCADE,
        related_name='activity_proofs'
    )
    topic = models.ForeignKey(
        'books.Topic',
        on_delete=models.CASCADE,
        related_name='activity_proofs'
    )
    enrollment = models.ForeignKey(
        CourseEnrollment,
        on_delete=models.CASCADE,
        related_name='activity_proofs'
    )

    # Screenshot - using Supabase storage URL
    screenshot_url = models.URLField(
        max_length=500,
        help_text="Supabase storage URL for the screenshot"
    )
    software_used = models.CharField(
        max_length=20,
        choices=SOFTWARE_CHOICES,
        default='other'
    )
    student_notes = models.TextField(
        blank=True,
        help_text="Optional notes from student about their activity"
    )
    uploaded_at = models.DateTimeField(auto_now_add=True)

    # Approval status
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='pending'
    )
    teacher_remarks = models.TextField(
        blank=True,
        help_text="Teacher's feedback on the activity"
    )
    teacher_rating = models.CharField(
        max_length=20,
        choices=RATING_CHOICES,
        null=True,
        blank=True,
        help_text="Quality rating given by teacher"
    )
    approved_by = models.ForeignKey(
        'students.CustomUser',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_proofs'
    )
    approved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-uploaded_at']
        verbose_name = 'Activity Proof'
        verbose_name_plural = 'Activity Proofs'
        # One proof per student per topic
        unique_together = ('student', 'topic')

    def __str__(self):
        return f"{self.student.name} - {self.topic.display_title} ({self.status})"

    def approve(self, teacher, rating='good', remarks=''):
        """Approve this activity proof."""
        self.status = 'approved'
        self.approved_by = teacher
        self.approved_at = timezone.now()
        self.teacher_rating = rating
        self.teacher_remarks = remarks
        self.save()

    def reject(self, teacher, remarks=''):
        """Reject this activity proof."""
        self.status = 'rejected'
        self.approved_by = teacher
        self.approved_at = timezone.now()
        self.teacher_remarks = remarks
        self.save()

    def get_rating_score(self):
        """
        Convert teacher rating to score (0-100) for score calculation.
        """
        rating_scores = {
            'excellent': 100,
            'good': 75,
            'basic': 50,
        }
        return rating_scores.get(self.teacher_rating, 0)


class ActivityProofBulkAction(models.Model):
    """
    Audit trail for bulk approval/rejection actions by teachers.
    """
    ACTION_CHOICES = [
        ('approve', 'Bulk Approve'),
        ('reject', 'Bulk Reject'),
    ]

    teacher = models.ForeignKey(
        'students.CustomUser',
        on_delete=models.CASCADE,
        related_name='bulk_proof_actions'
    )
    action_type = models.CharField(
        max_length=20,
        choices=ACTION_CHOICES
    )
    proof_ids = models.JSONField(
        help_text="List of ActivityProof IDs affected"
    )
    count = models.PositiveIntegerField(
        help_text="Number of proofs affected"
    )
    rating = models.CharField(
        max_length=20,
        choices=ActivityProof.RATING_CHOICES,
        null=True,
        blank=True,
        help_text="Rating applied (for bulk approve)"
    )
    remarks = models.TextField(
        blank=True,
        help_text="Remarks applied to all proofs"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Bulk Action Log'
        verbose_name_plural = 'Bulk Action Logs'

    def __str__(self):
        return f"{self.teacher.username} - {self.action_type} {self.count} proofs"


class GuardianReview(models.Model):
    """
    Guardian review/approval for activity completion.
    This is the final step in the 5-step validation pipeline.

    Guardian review is only available OUTSIDE school hours,
    using the same student login (no separate guardian account needed).
    """
    student = models.ForeignKey(
        'students.Student',
        on_delete=models.CASCADE,
        related_name='guardian_reviews'
    )
    topic = models.ForeignKey(
        'books.Topic',
        on_delete=models.CASCADE,
        related_name='guardian_reviews'
    )
    activity_proof = models.OneToOneField(
        ActivityProof,
        on_delete=models.CASCADE,
        related_name='guardian_review',
        help_text="The approved activity proof being reviewed"
    )

    # Review details
    reviewed_at = models.DateTimeField(auto_now_add=True)
    is_approved = models.BooleanField(
        default=True,
        help_text="Guardian approval status"
    )
    reviewer_ip = models.GenericIPAddressField(
        null=True,
        blank=True,
        help_text="IP address for audit purposes"
    )
    review_notes = models.TextField(
        blank=True,
        help_text="Optional notes from guardian"
    )

    class Meta:
        ordering = ['-reviewed_at']
        verbose_name = 'Guardian Review'
        verbose_name_plural = 'Guardian Reviews'
        # One review per student per topic
        unique_together = ('student', 'topic')

    def __str__(self):
        status = "Approved" if self.is_approved else "Pending"
        return f"{self.student.name} - {self.topic.display_title} ({status})"


# ============================================
# STUDENT SCORE MODELS
# ============================================

class SectionScore(models.Model):
    """
    Calculated score for a student's section/activity completion.

    Score formula:
    - Reading (time spent): 20%
    - Activity Completion: 30%
    - Teacher Quality Rating: 30%
    - Guardian Review: 20%
    """
    RATING_CHOICES = [
        ('excellent', 'Excellent'),
        ('good', 'Good'),
        ('average', 'Average'),
        ('needs_support', 'Needs Support'),
    ]

    student = models.ForeignKey(
        'students.Student',
        on_delete=models.CASCADE,
        related_name='section_scores'
    )
    topic = models.ForeignKey(
        'books.Topic',
        on_delete=models.CASCADE,
        related_name='section_scores'
    )
    enrollment = models.ForeignKey(
        CourseEnrollment,
        on_delete=models.CASCADE,
        related_name='section_scores'
    )

    # Component scores (0-100)
    reading_score = models.IntegerField(
        default=0,
        help_text="Score based on time spent reading (0-100)"
    )
    activity_score = models.IntegerField(
        default=0,
        help_text="Score based on activity completion (0-100)"
    )
    teacher_rating_score = models.IntegerField(
        default=0,
        help_text="Score based on teacher's quality rating (0-100)"
    )
    guardian_review_score = models.IntegerField(
        default=0,
        help_text="Score based on guardian review (0 or 100)"
    )

    # Weighted total
    total_score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        help_text="Weighted total score"
    )
    rating = models.CharField(
        max_length=20,
        choices=RATING_CHOICES,
        default='needs_support'
    )

    # Timestamps
    calculated_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-calculated_at']
        verbose_name = 'Section Score'
        verbose_name_plural = 'Section Scores'
        unique_together = ('student', 'topic')

    def __str__(self):
        return f"{self.student.name} - {self.topic.display_title}: {self.total_score}%"

    def calculate_score(self):
        """
        Calculate the weighted total score.

        Weight distribution:
        - Reading: 20%
        - Activity Completion: 30%
        - Teacher Quality Rating: 30%
        - Guardian Review: 20%
        """
        self.total_score = (
            (self.reading_score * 0.20) +
            (self.activity_score * 0.30) +
            (self.teacher_rating_score * 0.30) +
            (self.guardian_review_score * 0.20)
        )

        # Assign rating based on total score
        if self.total_score >= 90:
            self.rating = 'excellent'
        elif self.total_score >= 75:
            self.rating = 'good'
        elif self.total_score >= 60:
            self.rating = 'average'
        else:
            self.rating = 'needs_support'

        self.save()
        return self.total_score

    @classmethod
    def calculate_for_topic(cls, student, topic, enrollment=None):
        """
        Calculate or update score for a student's topic.
        """
        if not enrollment:
            enrollment = CourseEnrollment.objects.filter(
                student=student,
                course=topic.book
            ).first()

        if not enrollment:
            return None

        # Get or create score record
        score, created = cls.objects.get_or_create(
            student=student,
            topic=topic,
            defaults={'enrollment': enrollment}
        )

        # 1. Reading Score (based on time spent)
        progress = TopicProgress.objects.filter(
            enrollment=enrollment,
            topic=topic
        ).first()

        if progress:
            # Score based on time spent (target: 10 minutes = 600 seconds)
            min_required = 600  # 10 minutes
            time_spent = progress.time_spent_seconds
            score.reading_score = min(100, int((time_spent / min_required) * 100))

            # Activity completion score
            if progress.status == 'completed':
                score.activity_score = 100
            elif progress.status == 'in_progress':
                score.activity_score = 50
            else:
                score.activity_score = 0
        else:
            score.reading_score = 0
            score.activity_score = 0

        # 2. Teacher Rating Score (from ActivityProof)
        proof = ActivityProof.objects.filter(
            student=student,
            topic=topic,
            status='approved'
        ).first()

        if proof and proof.teacher_rating:
            score.teacher_rating_score = proof.get_rating_score()
        else:
            score.teacher_rating_score = 0

        # 3. Guardian Review Score
        guardian_review = GuardianReview.objects.filter(
            student=student,
            topic=topic,
            is_approved=True
        ).first()

        score.guardian_review_score = 100 if guardian_review else 0

        # Calculate total
        score.calculate_score()
        return score
