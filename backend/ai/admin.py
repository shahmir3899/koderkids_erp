"""
AI Admin Configuration
======================
"""

from django.contrib import admin
from .models import AIAuditLog


@admin.register(AIAuditLog)
class AIAuditLogAdmin(admin.ModelAdmin):
    list_display = [
        'id', 'user', 'agent', 'action_name', 'status',
        'llm_response_time_ms', 'created_at'
    ]
    list_filter = ['agent', 'status', 'created_at']
    search_fields = ['user__username', 'user_message', 'action_name']
    readonly_fields = [
        'user', 'agent', 'user_message', 'context_data',
        'llm_raw_response', 'llm_parsed_response', 'action_name',
        'action_params', 'execution_result', 'status', 'error_message',
        'confirmation_token', 'confirmed_at', 'llm_response_time_ms',
        'total_time_ms', 'created_at', 'updated_at'
    ]
    ordering = ['-created_at']

    fieldsets = (
        ('Request', {
            'fields': ('user', 'agent', 'user_message', 'context_data')
        }),
        ('LLM Response', {
            'fields': ('llm_raw_response', 'llm_parsed_response', 'llm_response_time_ms'),
            'classes': ('collapse',)
        }),
        ('Action', {
            'fields': ('action_name', 'action_params', 'status', 'error_message')
        }),
        ('Execution', {
            'fields': ('execution_result', 'total_time_ms'),
            'classes': ('collapse',)
        }),
        ('Confirmation', {
            'fields': ('confirmation_token', 'confirmed_at'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at')
        }),
    )
