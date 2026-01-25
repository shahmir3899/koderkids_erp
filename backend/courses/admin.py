# courses/admin.py
from django.contrib import admin
from .models import (
    CourseEnrollment, TopicProgress,
    Quiz, QuizQuestion, QuizChoice, QuizAttempt
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
