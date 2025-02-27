from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, School, Student, Fee, Attendance, LessonPlan    # ✅ Import the models

class CustomUserAdmin(UserAdmin):
    list_display = ('id', 'username', 'role', 'is_active', 'is_staff')
    search_fields = ('username', 'email', 'role')
    list_filter = ('role', 'is_active', 'is_staff')
    ordering = ('id',)

    fieldsets = UserAdmin.fieldsets + (
        ('Custom Fields', {'fields': ('role', 'assigned_schools')}),
    )

    filter_horizontal = ('assigned_schools',)  # Enables multi-selection for schools

admin.site.register(CustomUser, CustomUserAdmin)
admin.site.register(School)
admin.site.register(Student)
admin.site.register(Fee)
admin.site.register(Attendance)
admin.site.register(LessonPlan)