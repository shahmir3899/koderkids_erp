from django.contrib import admin
from mptt.admin import MPTTModelAdmin
from .models import Book, Topic, BookClassVisibility, TopicAssignment


@admin.register(Book)
class BookAdmin(admin.ModelAdmin):
    list_display = ['title', 'school', 'is_published', 'difficulty_level']
    list_filter = ['is_published', 'difficulty_level', 'school']
    search_fields = ['title', 'isbn', 'description']


@admin.register(Topic)
class TopicAdmin(MPTTModelAdmin):
    list_display = ['title', 'code', 'book', 'type', 'parent', 'is_required']
    list_filter = ['book', 'type', 'is_required']
    search_fields = ['title', 'code', 'content']


@admin.register(BookClassVisibility)
class BookClassVisibilityAdmin(admin.ModelAdmin):
    list_display = ['book', 'school', 'student_class', 'is_visible', 'created_at']
    list_filter = ['is_visible', 'school', 'book']
    search_fields = ['book__title', 'school__name', 'student_class']


@admin.register(TopicAssignment)
class TopicAssignmentAdmin(admin.ModelAdmin):
    list_display = ['topic', 'school', 'student_class', 'deadline', 'is_mandatory', 'assigned_at']
    list_filter = ['is_mandatory', 'school', 'student_class']
    search_fields = ['topic__title', 'school__name', 'notes']
    date_hierarchy = 'deadline'
