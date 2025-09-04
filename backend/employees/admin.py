from django.contrib import admin
from employees.models import TeacherProfile, TeacherEarning, TeacherDeduction

@admin.register(TeacherProfile)
class TeacherProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'title', 'basic_salary', 'date_of_joining', 'bank_name')
    list_filter = ('user__role',)
    search_fields = ('user__username', 'user__first_name', 'user__last_name')

@admin.register(TeacherEarning)
class TeacherEarningAdmin(admin.ModelAdmin):
    list_display = ('teacher', 'category', 'amount', 'created_at')
    list_filter = ('teacher__username',)
    search_fields = ('category',)

@admin.register(TeacherDeduction)
class TeacherDeductionAdmin(admin.ModelAdmin):
    list_display = ('teacher', 'category', 'amount', 'created_at')
    list_filter = ('teacher__username',)
    search_fields = ('category',)