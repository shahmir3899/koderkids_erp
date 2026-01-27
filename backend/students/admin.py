from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, School, Student, Fee, Attendance, LessonPlan, Badge, StudentBadge


class CustomUserAdmin(UserAdmin):
    """Enhanced admin for CustomUser model with new fields"""
    
    # Add new fields to the display
    list_display = ('id', 'username', 'email', 'role', 'is_active', 'is_super_admin', 'is_staff', 'created_at')
    
    # Add new filters
    list_filter = ('role', 'is_active', 'is_super_admin', 'is_staff', 'assigned_schools')
    
    # Keep your existing search
    search_fields = ('username', 'email', 'role', 'first_name', 'last_name')
    
    ordering = ('id',)

    # Add new fields to fieldsets
    fieldsets = UserAdmin.fieldsets + (
        ('Custom Fields', {
            'fields': ('role', 'is_super_admin', 'assigned_schools', 'created_by', 'updated_by')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)  # Collapsible section
        }),
    )

    # Make timestamp fields read-only
    readonly_fields = ['created_at', 'updated_at', 'last_login', 'date_joined']
    
    # Keep your existing multi-select for schools
    filter_horizontal = ('assigned_schools',)
    
    # Add bulk actions
    actions = ['activate_users', 'deactivate_users']
    
    def activate_users(self, request, queryset):
        """Bulk activate users"""
        queryset.update(is_active=True)
        self.message_user(request, f"{queryset.count()} users activated")
    activate_users.short_description = "Activate selected users"
    
    def deactivate_users(self, request, queryset):
        """Bulk deactivate users (except super admins)"""
        if queryset.filter(is_super_admin=True).exists():
            self.message_user(request, "Cannot deactivate super admins", level='ERROR')
            return
        queryset.update(is_active=False)
        self.message_user(request, f"{queryset.count()} users deactivated")
    deactivate_users.short_description = "Deactivate selected users"
    
admin.site.register(CustomUser, CustomUserAdmin)
admin.site.register(School)
admin.site.register(Student)
admin.site.register(Fee)
admin.site.register(Attendance)
admin.site.register(LessonPlan)


@admin.register(Badge)
class BadgeAdmin(admin.ModelAdmin):
    list_display = ('icon', 'name', 'badge_type', 'criteria_value', 'created_at')
    list_filter = ('badge_type',)
    search_fields = ('name', 'description')
    ordering = ('criteria_value',)


@admin.register(StudentBadge)
class StudentBadgeAdmin(admin.ModelAdmin):
    list_display = ('student', 'badge', 'earned_at')
    list_filter = ('badge', 'earned_at')
    search_fields = ('student__name', 'badge__name')
    ordering = ('-earned_at',)
    raw_id_fields = ['student']  # Use raw_id instead of autocomplete