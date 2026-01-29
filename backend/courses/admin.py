# courses/admin.py
from django.contrib import admin
from .models import (
    CourseEnrollment, TopicProgress,
    Quiz, QuizQuestion, QuizChoice, QuizAttempt,
    ActivityProof, ActivityProofBulkAction, GuardianReview, SectionScore
)


class TopicProgressInline(admin.TabularInline):
    model = TopicProgress
    extra = 0
    readonly_fields = ('topic', 'status', 'started_at', 'completed_at', 'time_spent_seconds')
    can_delete = False


@admin.register(CourseEnrollment)
class CourseEnrollmentAdmin(admin.ModelAdmin):
    list_display = ('student', 'course', 'status', 'enrolled_at', 'last_accessed_at', 'get_progress')
    list_filter = ('status', 'course', 'enrolled_at')
    search_fields = ('student__name', 'course__title')
    readonly_fields = ('enrolled_at', 'last_accessed_at')
    inlines = [TopicProgressInline]

    def get_progress(self, obj):
        return f"{obj.get_progress_percentage()}%"
    get_progress.short_description = 'Progress'


@admin.register(TopicProgress)
class TopicProgressAdmin(admin.ModelAdmin):
    list_display = ('enrollment', 'topic', 'status', 'time_spent_display', 'started_at', 'completed_at')
    list_filter = ('status', 'enrollment__course')
    search_fields = ('enrollment__student__name', 'topic__title')
    readonly_fields = ('started_at', 'completed_at')

    def time_spent_display(self, obj):
        minutes = obj.time_spent_seconds // 60
        seconds = obj.time_spent_seconds % 60
        return f"{minutes}m {seconds}s"
    time_spent_display.short_description = 'Time Spent'


class QuizChoiceInline(admin.TabularInline):
    model = QuizChoice
    extra = 4
    fields = ('choice_text', 'is_correct', 'order')


class QuizQuestionInline(admin.StackedInline):
    model = QuizQuestion
    extra = 1
    fields = ('question_type', 'question_text', 'explanation', 'points', 'order')


@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    list_display = ('title', 'topic', 'passing_score', 'max_attempts', 'is_active', 'created_at')
    list_filter = ('is_active', 'topic__book', 'created_at')
    search_fields = ('title', 'topic__title')
    inlines = [QuizQuestionInline]
    fieldsets = (
        (None, {
            'fields': ('topic', 'title', 'description')
        }),
        ('Settings', {
            'fields': ('passing_score', 'time_limit_minutes', 'max_attempts', 'shuffle_questions', 'show_correct_answers', 'is_active')
        }),
        ('Metadata', {
            'fields': ('created_by',),
            'classes': ('collapse',)
        }),
    )


@admin.register(QuizQuestion)
class QuizQuestionAdmin(admin.ModelAdmin):
    list_display = ('quiz', 'question_type', 'question_text_short', 'points', 'order')
    list_filter = ('question_type', 'quiz')
    search_fields = ('question_text', 'quiz__title')
    inlines = [QuizChoiceInline]

    def question_text_short(self, obj):
        return obj.question_text[:50] + '...' if len(obj.question_text) > 50 else obj.question_text
    question_text_short.short_description = 'Question'


@admin.register(QuizAttempt)
class QuizAttemptAdmin(admin.ModelAdmin):
    list_display = ('enrollment', 'quiz', 'score', 'passed', 'time_taken_display', 'started_at', 'completed_at')
    list_filter = ('passed', 'quiz', 'started_at')
    search_fields = ('enrollment__student__name', 'quiz__title')
    readonly_fields = ('enrollment', 'quiz', 'started_at', 'completed_at', 'score', 'points_earned', 'passed', 'answers', 'time_taken_seconds')

    def time_taken_display(self, obj):
        if obj.time_taken_seconds:
            minutes = obj.time_taken_seconds // 60
            seconds = obj.time_taken_seconds % 60
            return f"{minutes}m {seconds}s"
        return "-"
    time_taken_display.short_description = 'Time Taken'


# ============================================
# Activity Proof Admin
# ============================================

@admin.register(ActivityProof)
class ActivityProofAdmin(admin.ModelAdmin):
    list_display = (
        'student', 'topic', 'software_used', 'status',
        'teacher_rating', 'uploaded_at', 'approved_at'
    )
    list_filter = ('status', 'software_used', 'teacher_rating', 'uploaded_at')
    search_fields = ('student__name', 'topic__title', 'teacher_remarks')
    readonly_fields = ('uploaded_at', 'approved_at')
    raw_id_fields = ('student', 'topic', 'enrollment', 'approved_by')

    fieldsets = (
        ('Student Info', {
            'fields': ('student', 'topic', 'enrollment')
        }),
        ('Proof Details', {
            'fields': ('screenshot_url', 'software_used', 'student_notes', 'uploaded_at')
        }),
        ('Review', {
            'fields': ('status', 'teacher_rating', 'teacher_remarks', 'approved_by', 'approved_at')
        }),
    )


@admin.register(ActivityProofBulkAction)
class ActivityProofBulkActionAdmin(admin.ModelAdmin):
    list_display = ('teacher', 'action_type', 'count', 'rating', 'created_at')
    list_filter = ('action_type', 'rating', 'created_at')
    search_fields = ('teacher__username', 'remarks')
    readonly_fields = ('teacher', 'action_type', 'proof_ids', 'count', 'rating', 'remarks', 'created_at')


@admin.register(GuardianReview)
class GuardianReviewAdmin(admin.ModelAdmin):
    list_display = ('student', 'topic', 'is_approved', 'reviewed_at', 'reviewer_ip')
    list_filter = ('is_approved', 'reviewed_at')
    search_fields = ('student__name', 'topic__title', 'review_notes')
    readonly_fields = ('reviewed_at',)
    raw_id_fields = ('student', 'topic', 'activity_proof')


@admin.register(SectionScore)
class SectionScoreAdmin(admin.ModelAdmin):
    list_display = (
        'student', 'topic', 'reading_score', 'activity_score',
        'teacher_rating_score', 'guardian_review_score', 'total_score', 'rating'
    )
    list_filter = ('rating', 'calculated_at')
    search_fields = ('student__name', 'topic__title')
    readonly_fields = ('calculated_at', 'created_at')
    raw_id_fields = ('student', 'topic', 'enrollment')
