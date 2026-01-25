from django.contrib import admin
from .models import CustomReport, ReportTemplate, ReportRequest, RequestStatusLog, GeneratedReport


# =============================================================================
# REPORT TEMPLATE ADMIN
# =============================================================================
@admin.register(ReportTemplate)
class ReportTemplateAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'category', 'allowed_self_request', 'allowed_other_request', 'is_active']
    list_filter = ['category', 'is_active', 'allowed_self_request', 'allowed_other_request']
    search_fields = ['code', 'name', 'description']
    ordering = ['category', 'name']
    fieldsets = (
        (None, {
            'fields': ('code', 'name', 'description', 'category')
        }),
        ('Permissions', {
            'fields': ('allowed_roles', 'allowed_self_request', 'allowed_other_request',
                       'requires_target_employee', 'requires_target_school')
        }),
        ('Default Content', {
            'fields': ('default_subject', 'default_body', 'background_image'),
            'classes': ('collapse',)
        }),
        ('Status', {
            'fields': ('is_active',)
        }),
    )


# =============================================================================
# REPORT REQUEST ADMIN
# =============================================================================
class RequestStatusLogInline(admin.TabularInline):
    model = RequestStatusLog
    extra = 0
    readonly_fields = ['previous_status', 'new_status', 'changed_by', 'changed_at', 'notes']
    can_delete = False

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(ReportRequest)
class ReportRequestAdmin(admin.ModelAdmin):
    list_display = ['request_number', 'subject', 'requested_by', 'target_employee', 'template', 'status', 'priority', 'created_at']
    list_filter = ['status', 'priority', 'template', 'created_at']
    search_fields = ['request_number', 'subject', 'requested_by__username', 'target_employee__username']
    readonly_fields = ['id', 'request_number', 'requested_by', 'requested_at', 'content_snapshot',
                       'approved_by', 'approved_at', 'created_at', 'updated_at']
    date_hierarchy = 'created_at'
    ordering = ['-created_at']
    inlines = [RequestStatusLogInline]

    fieldsets = (
        ('Request Info', {
            'fields': ('id', 'request_number', 'requested_by', 'requested_at', 'status', 'priority')
        }),
        ('Target', {
            'fields': ('target_employee', 'target_school', 'template')
        }),
        ('Content', {
            'fields': ('subject', 'recipient_text', 'body_text', 'line_spacing', 'custom_fields')
        }),
        ('Frozen Content', {
            'fields': ('content_snapshot',),
            'classes': ('collapse',)
        }),
        ('Approval', {
            'fields': ('approved_by', 'approved_at', 'rejection_reason', 'admin_notes')
        }),
        ('Timestamps', {
            'fields': ('expires_at', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'requested_by', 'target_employee', 'template', 'approved_by'
        )


# =============================================================================
# GENERATED REPORT ADMIN
# =============================================================================
@admin.register(GeneratedReport)
class GeneratedReportAdmin(admin.ModelAdmin):
    list_display = ['request', 'file_name', 'generated_by', 'generated_at', 'download_count', 'file_size']
    list_filter = ['generated_at', 'is_deleted']
    search_fields = ['file_name', 'request__request_number']
    readonly_fields = ['id', 'request', 'generated_by', 'generated_at', 'file_hash',
                       'download_count', 'last_downloaded_at', 'last_downloaded_by']
    ordering = ['-generated_at']


# =============================================================================
# REQUEST STATUS LOG ADMIN
# =============================================================================
@admin.register(RequestStatusLog)
class RequestStatusLogAdmin(admin.ModelAdmin):
    list_display = ['request', 'previous_status', 'new_status', 'changed_by', 'changed_at']
    list_filter = ['new_status', 'changed_at']
    search_fields = ['request__request_number', 'notes']
    readonly_fields = ['request', 'previous_status', 'new_status', 'changed_by', 'changed_at', 'notes', 'ip_address']
    ordering = ['-changed_at']

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


# =============================================================================
# CUSTOM REPORT ADMIN (Existing)
# =============================================================================
@admin.register(CustomReport)
class CustomReportAdmin(admin.ModelAdmin):
    list_display = ['subject', 'recipient', 'template_type', 'generated_by_name', 'created_at']
    list_filter = ['template_type', 'created_at']
    search_fields = ['subject', 'recipient', 'body_text']
    ordering = ['-created_at']
