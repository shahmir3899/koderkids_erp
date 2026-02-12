# ============================================
# MONITORING ADMIN
# ============================================

from django.contrib import admin
from .models import (
    MonitoringVisit,
    EvaluationFormTemplate,
    EvaluationFormField,
    TeacherEvaluation,
    EvaluationResponse,
)


class EvaluationFormFieldInline(admin.TabularInline):
    model = EvaluationFormField
    extra = 1
    ordering = ['order']


@admin.register(EvaluationFormTemplate)
class EvaluationFormTemplateAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_active', 'created_by', 'created_at']
    list_filter = ['is_active']
    inlines = [EvaluationFormFieldInline]


@admin.register(MonitoringVisit)
class MonitoringVisitAdmin(admin.ModelAdmin):
    list_display = ['bdm', 'school', 'visit_date', 'status', 'purpose']
    list_filter = ['status', 'visit_date']
    search_fields = ['school__name', 'bdm__username', 'bdm__first_name']
    date_hierarchy = 'visit_date'


class EvaluationResponseInline(admin.TabularInline):
    model = EvaluationResponse
    extra = 0
    readonly_fields = ['field', 'value', 'numeric_value']


@admin.register(TeacherEvaluation)
class TeacherEvaluationAdmin(admin.ModelAdmin):
    list_display = ['teacher', 'visit', 'template', 'normalized_score', 'submitted_at']
    list_filter = ['template', 'submitted_at']
    search_fields = ['teacher__username', 'teacher__first_name']
    inlines = [EvaluationResponseInline]
