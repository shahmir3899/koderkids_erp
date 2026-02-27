# ============================================
# CRM DJANGO ADMIN CONFIGURATION
# ============================================

from django.contrib import admin
from .models import Lead, Activity, BDMTarget, ProposalOffer


@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):
    """Admin interface for Lead model"""
    
    list_display = [
        'id',
        'school_name',
        'phone',
        'status',
        'lead_source',
        'assigned_to',
        'conversion_date',
        'created_at',
    ]
    
    list_filter = [
        'status',
        'lead_source',
        'assigned_to',
        'created_at',
        'conversion_date',
    ]
    
    search_fields = [
        'school_name',
        'phone',
        'contact_person',
        'email',
        'city',
    ]
    
    readonly_fields = [
        'created_at',
        'updated_at',
        'conversion_date',
        'converted_to_school',
    ]
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('school_name', 'phone', 'contact_person', 'email')
        }),
        ('Location', {
            'fields': ('address', 'city')
        }),
        ('Lead Details', {
            'fields': ('lead_source', 'status', 'estimated_students', 'notes')
        }),
        ('Assignment', {
            'fields': ('assigned_to', 'created_by')
        }),
        ('Conversion', {
            'fields': ('converted_to_school', 'conversion_date'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['mark_as_contacted', 'mark_as_interested']
    
    def mark_as_contacted(self, request, queryset):
        """Bulk action to mark leads as contacted"""
        updated = queryset.filter(status='New').update(status='Contacted')
        self.message_user(request, f'{updated} leads marked as contacted')
    mark_as_contacted.short_description = 'Mark as Contacted'
    
    def mark_as_interested(self, request, queryset):
        """Bulk action to mark leads as interested"""
        updated = queryset.update(status='Interested')
        self.message_user(request, f'{updated} leads marked as interested')
    mark_as_interested.short_description = 'Mark as Interested'


@admin.register(Activity)
class ActivityAdmin(admin.ModelAdmin):
    """Admin interface for Activity model"""
    
    list_display = [
        'id',
        'activity_type',
        'lead',
        'subject',
        'assigned_to',
        'status',
        'scheduled_date',
        'completed_date',
    ]
    
    list_filter = [
        'activity_type',
        'status',
        'scheduled_date',
        'assigned_to',
    ]
    
    search_fields = [
        'subject',
        'description',
        'lead__school_name',
        'lead__phone',
    ]
    
    readonly_fields = [
        'created_at',
        'updated_at',
    ]
    
    fieldsets = (
        ('Activity Details', {
            'fields': ('activity_type', 'lead', 'subject', 'description')
        }),
        ('Assignment & Schedule', {
            'fields': ('assigned_to', 'scheduled_date')
        }),
        ('Status', {
            'fields': ('status', 'completed_date')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    date_hierarchy = 'scheduled_date'
    
    actions = ['mark_as_completed', 'mark_as_cancelled']
    
    def mark_as_completed(self, request, queryset):
        """Bulk action to mark activities as completed"""
        from django.utils import timezone
        updated = queryset.filter(status='Scheduled').update(
            status='Completed',
            completed_date=timezone.now()
        )
        self.message_user(request, f'{updated} activities marked as completed')
    mark_as_completed.short_description = 'Mark as Completed'
    
    def mark_as_cancelled(self, request, queryset):
        """Bulk action to cancel activities"""
        updated = queryset.filter(status='Scheduled').update(status='Cancelled')
        self.message_user(request, f'{updated} activities cancelled')
    mark_as_cancelled.short_description = 'Cancel Activities'


@admin.register(BDMTarget)
class BDMTargetAdmin(admin.ModelAdmin):
    """Admin interface for BDM Target model"""
    
    list_display = [
        'id',
        'bdm',
        'period_type',
        'start_date',
        'end_date',
        'leads_target',
        'leads_achieved',
        'conversions_target',
        'conversions_achieved',
        'revenue_target',
        'revenue_achieved',
    ]
    
    list_filter = [
        'period_type',
        'bdm',
        'start_date',
    ]
    
    search_fields = [
        'bdm__username',
        'bdm__first_name',
        'bdm__last_name',
    ]
    
    readonly_fields = [
        'leads_achieved',
        'conversions_achieved',
        'revenue_achieved',
        'created_at',
        'updated_at',
    ]
    
    fieldsets = (
        ('Target Information', {
            'fields': ('bdm', 'period_type', 'start_date', 'end_date')
        }),
        ('Target Goals', {
            'fields': ('leads_target', 'conversions_target', 'revenue_target')
        }),
        ('Actual Achievements (Auto-calculated)', {
            'fields': ('leads_achieved', 'conversions_achieved', 'revenue_achieved'),
            'classes': ('collapse',)
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    date_hierarchy = 'start_date'
    
    actions = ['refresh_actuals']
    
    def refresh_actuals(self, request, queryset):
        """Bulk action to refresh target actuals"""
        count = 0
        for target in queryset:
            target.refresh_actuals()
            count += 1
        self.message_user(request, f'{count} target actuals refreshed')
    refresh_actuals.short_description = 'Refresh Actuals'


@admin.register(ProposalOffer)
class ProposalOfferAdmin(admin.ModelAdmin):
    list_display = ['id', 'school_name', 'contact_person', 'standard_rate', 'discounted_rate', 'generated_by_name', 'created_at']
    list_filter = ['created_at', 'generated_by']
    search_fields = ['school_name', 'contact_person']
    readonly_fields = ['created_at', 'updated_at']
