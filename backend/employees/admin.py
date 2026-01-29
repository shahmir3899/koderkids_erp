# ============================================
# EMPLOYEES ADMIN - Django Admin Configuration
# ============================================

from django.contrib import admin
from .models import (
    TeacherProfile, TeacherEarning, TeacherDeduction, Notification,
    BDMVisitProforma, TeacherEvaluationScore
)


@admin.register(TeacherProfile)
class TeacherProfileAdmin(admin.ModelAdmin):
    list_display = ['employee_id', 'get_full_name', 'title', 'get_email', 'date_of_joining', 'basic_salary']
    list_filter = ['title', 'gender', 'blood_group', 'date_of_joining']
    search_fields = ['employee_id', 'user__username', 'user__first_name', 'user__last_name', 'user__email']
    readonly_fields = ['employee_id', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Employee Info', {
            'fields': ('user', 'employee_id', 'title', 'profile_photo_url')
        }),
        ('Personal Details', {
            'fields': ('gender', 'blood_group', 'phone', 'address')
        }),
        ('Employment', {
            'fields': ('date_of_joining', 'basic_salary')
        }),
        ('Bank Details', {
            'fields': ('bank_name', 'account_number'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def get_full_name(self, obj):
        return obj.user.get_full_name() or obj.user.username
    get_full_name.short_description = 'Name'
    get_full_name.admin_order_field = 'user__first_name'

    def get_email(self, obj):
        return obj.user.email
    get_email.short_description = 'Email'
    get_email.admin_order_field = 'user__email'


@admin.register(TeacherEarning)
class TeacherEarningAdmin(admin.ModelAdmin):
    list_display = ['get_teacher_name', 'category', 'amount', 'created_at']
    list_filter = ['category', 'created_at']
    search_fields = ['teacher__username', 'teacher__first_name', 'teacher__last_name', 'category']
    date_hierarchy = 'created_at'

    def get_teacher_name(self, obj):
        return obj.teacher.get_full_name() or obj.teacher.username
    get_teacher_name.short_description = 'Teacher'
    get_teacher_name.admin_order_field = 'teacher__first_name'


@admin.register(TeacherDeduction)
class TeacherDeductionAdmin(admin.ModelAdmin):
    list_display = ['get_teacher_name', 'category', 'amount', 'created_at']
    list_filter = ['category', 'created_at']
    search_fields = ['teacher__username', 'teacher__first_name', 'teacher__last_name', 'category']
    date_hierarchy = 'created_at'

    def get_teacher_name(self, obj):
        return obj.teacher.get_full_name() or obj.teacher.username
    get_teacher_name.short_description = 'Teacher'
    get_teacher_name.admin_order_field = 'teacher__first_name'


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['title', 'recipient', 'sender', 'notification_type', 'is_read', 'created_at']
    list_filter = ['notification_type', 'is_read', 'created_at']
    search_fields = ['title', 'message', 'recipient__username', 'sender__username']
    date_hierarchy = 'created_at'
    readonly_fields = ['created_at', 'read_at']
    
    fieldsets = (
        ('Content', {
            'fields': ('title', 'message', 'notification_type', 'related_url')
        }),
        ('Recipients', {
            'fields': ('recipient', 'sender')
        }),
        ('Status', {
            'fields': ('is_read', 'read_at', 'created_at')
        }),
    )

    actions = ['mark_as_read', 'mark_as_unread']

    def mark_as_read(self, request, queryset):
        from django.utils import timezone
        count = queryset.update(is_read=True, read_at=timezone.now())
        self.message_user(request, f'{count} notification(s) marked as read.')
    mark_as_read.short_description = 'Mark selected notifications as read'

    def mark_as_unread(self, request, queryset):
        count = queryset.update(is_read=False, read_at=None)
        self.message_user(request, f'{count} notification(s) marked as unread.')
    mark_as_unread.short_description = 'Mark selected notifications as unread'


# ============================================
# BDM PROFORMA & TEACHER EVALUATION ADMIN
# ============================================

@admin.register(BDMVisitProforma)
class BDMVisitProformaAdmin(admin.ModelAdmin):
    list_display = [
        'teacher', 'school', 'bdm', 'month', 'year',
        'overall_attitude_score', 'visit_date'
    ]
    list_filter = ['school', 'month', 'year', 'visit_date']
    search_fields = [
        'teacher__username', 'teacher__first_name', 'teacher__last_name',
        'school__name', 'bdm__username'
    ]
    readonly_fields = ['overall_attitude_score', 'created_at', 'updated_at']
    date_hierarchy = 'visit_date'

    fieldsets = (
        ('Visit Info', {
            'fields': ('teacher', 'school', 'bdm', 'visit_date', 'month', 'year')
        }),
        ('Ratings (1-5)', {
            'fields': (
                'discipline_rating', 'communication_rating',
                'child_handling_rating', 'professionalism_rating',
                'content_knowledge_rating'
            )
        }),
        ('Calculated Score', {
            'fields': ('overall_attitude_score',)
        }),
        ('Additional Comments', {
            'fields': ('remarks', 'areas_of_improvement', 'teacher_strengths'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(TeacherEvaluationScore)
class TeacherEvaluationScoreAdmin(admin.ModelAdmin):
    list_display = [
        'teacher', 'month', 'year',
        'attendance_score', 'attitude_score',
        'student_interest_score', 'enrollment_impact_score',
        'total_score', 'rating'
    ]
    list_filter = ['rating', 'month', 'year']
    search_fields = ['teacher__username', 'teacher__first_name', 'teacher__last_name']
    readonly_fields = ['calculated_at', 'created_at']

    fieldsets = (
        ('Teacher & Period', {
            'fields': ('teacher', 'month', 'year')
        }),
        ('Component Scores', {
            'fields': (
                'attendance_score', 'attitude_score',
                'student_interest_score', 'enrollment_impact_score'
            )
        }),
        ('Final Score', {
            'fields': ('total_score', 'rating')
        }),
        ('Timestamps', {
            'fields': ('calculated_at', 'created_at'),
            'classes': ('collapse',)
        }),
    )