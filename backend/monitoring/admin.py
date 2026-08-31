# ============================================
# MONITORING ADMIN
# ============================================

from django.contrib import admin
from .models import (
    MonitoringVisit,
    TeacherEvaluation,
    EvaluationQuestion,
)


@admin.register(MonitoringVisit)
class MonitoringVisitAdmin(admin.ModelAdmin):
    list_display = ['bdm', 'school', 'visit_date', 'status', 'purpose']
    list_filter = ['status', 'visit_date']
    search_fields = ['school__name', 'bdm__username', 'bdm__first_name']
    date_hierarchy = 'visit_date'


class EvaluationQuestionInline(admin.TabularInline):
    model = EvaluationQuestion
    extra = 0
    readonly_fields = ['question_text', 'answer_text', 'rating']


@admin.register(TeacherEvaluation)
class TeacherEvaluationAdmin(admin.ModelAdmin):
    list_display = ['teacher', 'visit', 'normalized_score', 'submitted_at']
    list_filter = ['submitted_at']
    search_fields = ['teacher__username', 'teacher__first_name']
    inlines = [EvaluationQuestionInline]
