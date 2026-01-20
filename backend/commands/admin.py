"""
Django Admin Configuration for Staff Commands
"""

from django.contrib import admin
from .models import Command, QuickAction, StaffAttendance


@admin.register(Command)
class CommandAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'raw_input_short',
        'agent',
        'parsed_intent',
        'status',
        'executed_by',
        'created_at',
    ]
    list_filter = ['agent', 'status', 'created_at']
    search_fields = ['raw_input', 'executed_by__username', 'parsed_intent']
    readonly_fields = [
        'raw_input',
        'parsed_intent',
        'parsed_entities',
        'agent',
        'executed_by',
        'source_page',
        'school',
        'clarification_type',
        'clarification_options',
        'selected_option',
        'api_endpoint',
        'api_method',
        'api_params',
        'response_message',
        'response_data',
        'error_message',
        'created_at',
        'completed_at',
    ]
    ordering = ['-created_at']
    date_hierarchy = 'created_at'

    def raw_input_short(self, obj):
        return obj.raw_input[:50] + '...' if len(obj.raw_input) > 50 else obj.raw_input
    raw_input_short.short_description = 'Command'


@admin.register(QuickAction)
class QuickActionAdmin(admin.ModelAdmin):
    list_display = [
        'name',
        'agent',
        'icon',
        'command_template',
        'is_active',
        'order',
    ]
    list_filter = ['agent', 'is_active']
    search_fields = ['name', 'command_template']
    list_editable = ['is_active', 'order']
    ordering = ['order', 'name']


@admin.register(StaffAttendance)
class StaffAttendanceAdmin(admin.ModelAdmin):
    list_display = [
        'staff',
        'date',
        'status',
        'school',
        'marked_by',
        'substitute',
        'created_at',
    ]
    list_filter = ['status', 'date', 'school']
    search_fields = [
        'staff__first_name',
        'staff__last_name',
        'staff__username',
        'school__name',
    ]
    raw_id_fields = ['staff', 'marked_by', 'substitute']
    date_hierarchy = 'date'
    ordering = ['-date', 'staff__first_name']
