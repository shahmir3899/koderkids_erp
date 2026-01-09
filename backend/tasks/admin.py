from django.contrib import admin
from .models import Task


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = [
        'title', 'assigned_to', 'assigned_by', 'status', 
        'priority', 'due_date', 'created_at'
    ]
    list_filter = [
        'status', 'priority', 'task_type', 'created_at', 'due_date'
    ]
    search_fields = [
        'title', 'description', 'assigned_to__first_name', 
        'assigned_to__last_name', 'assigned_by__first_name',
        'assigned_by__last_name'
    ]
    readonly_fields = ['created_at', 'updated_at', 'assigned_date']
    
    fieldsets = (
        ('Task Information', {
            'fields': ('title', 'description', 'task_type')
        }),
        ('Assignment', {
            'fields': ('assigned_to', 'assigned_by', 'assigned_date')
        }),
        ('Status & Priority', {
            'fields': ('status', 'priority', 'due_date', 'completed_date')
        }),
        ('Completion', {
            'fields': ('completion_answer',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'assigned_to', 'assigned_by'
        )
