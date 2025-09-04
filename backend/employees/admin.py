
# Register your models here.
from django.contrib import admin
from employees.models import TeacherProfile

@admin.register(TeacherProfile)
class TeacherProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'title', 'basic_salary', 'date_of_joining')
    list_filter = ('user__role',)
    search_fields = ('user__username', 'user__first_name', 'user__last_name')