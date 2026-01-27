"""
AI Gala Admin Configuration.
Provides admin interface for managing galleries, projects, votes, and comments.
"""
from django.contrib import admin
from django.utils.html import format_html
from django.db.models import Count
from .models import Gallery, Project, Vote, Comment


@admin.register(Gallery)
class GalleryAdmin(admin.ModelAdmin):
    """Admin interface for AI Gala galleries."""

    list_display = [
        'title', 'month_label', 'theme', 'status', 'class_date',
        'voting_end_date', 'project_count', 'vote_count', 'created_at'
    ]
    list_filter = ['status', 'class_date', 'created_at']
    search_fields = ['title', 'theme', 'description']
    ordering = ['-class_date']
    readonly_fields = ['created_at', 'updated_at']

    fieldsets = (
        ('Basic Information', {
            'fields': ('title', 'month_label', 'theme', 'description', 'instructions')
        }),
        ('Cover Image', {
            'fields': ('cover_image_url', 'cover_image_path'),
            'classes': ('collapse',)
        }),
        ('Important Dates', {
            'fields': ('class_date', 'gallery_open_date', 'voting_start_date', 'voting_end_date')
        }),
        ('Settings', {
            'fields': ('status', 'max_votes_per_user', 'allow_comments', 'allow_downloads')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    actions = ['set_status_active', 'set_status_voting', 'set_status_closed', 'calculate_winners']

    def project_count(self, obj):
        """Display count of projects in this gallery."""
        return obj.projects.filter(is_approved=True).count()
    project_count.short_description = 'Projects'

    def vote_count(self, obj):
        """Display total votes in this gallery."""
        return Vote.objects.filter(project__gallery=obj).count()
    vote_count.short_description = 'Votes'

    def set_status_active(self, request, queryset):
        """Set selected galleries to 'active' status."""
        count = queryset.update(status='active')
        self.message_user(request, f'{count} galleries set to Active.')
    set_status_active.short_description = "Set status to Active (Accepting Submissions)"

    def set_status_voting(self, request, queryset):
        """Set selected galleries to 'voting' status."""
        count = queryset.update(status='voting')
        self.message_user(request, f'{count} galleries set to Voting.')
    set_status_voting.short_description = "Set status to Voting Open"

    def set_status_closed(self, request, queryset):
        """Set selected galleries to 'closed' status."""
        count = queryset.update(status='closed')
        self.message_user(request, f'{count} galleries set to Closed.')
    set_status_closed.short_description = "Set status to Closed"

    def calculate_winners(self, request, queryset):
        """Calculate winners for selected galleries."""
        from .views import calculate_gallery_winners
        for gallery in queryset:
            calculate_gallery_winners(gallery)
        self.message_user(request, f'Winners calculated for {queryset.count()} galleries.')
    calculate_winners.short_description = "Calculate Winners & Award Badges"


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    """Admin interface for AI Gala projects."""

    list_display = [
        'title', 'student_name', 'student_class', 'gallery_title',
        'vote_count', 'comment_count', 'is_winner', 'winner_rank',
        'is_approved', 'image_preview', 'created_at'
    ]
    list_filter = ['gallery', 'is_winner', 'is_approved', 'student__student_class', 'created_at']
    search_fields = ['title', 'student__name', 'description']
    ordering = ['-vote_count', '-created_at']
    readonly_fields = ['vote_count', 'comment_count', 'view_count', 'created_at', 'updated_at', 'image_preview_large']
    raw_id_fields = ['student', 'gallery']

    fieldsets = (
        ('Project Information', {
            'fields': ('gallery', 'student', 'title', 'description', 'metadata')
        }),
        ('Image', {
            'fields': ('image_url', 'image_path', 'thumbnail_url', 'image_preview_large')
        }),
        ('Statistics', {
            'fields': ('vote_count', 'comment_count', 'view_count'),
            'classes': ('collapse',)
        }),
        ('Status', {
            'fields': ('is_approved', 'is_winner', 'winner_rank')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    actions = ['approve_projects', 'unapprove_projects', 'set_as_winner']

    def student_name(self, obj):
        return obj.student.name
    student_name.short_description = 'Student'
    student_name.admin_order_field = 'student__name'

    def student_class(self, obj):
        return obj.student.student_class
    student_class.short_description = 'Class'
    student_class.admin_order_field = 'student__student_class'

    def gallery_title(self, obj):
        return obj.gallery.title
    gallery_title.short_description = 'Gallery'
    gallery_title.admin_order_field = 'gallery__title'

    def image_preview(self, obj):
        """Small image preview for list view."""
        if obj.image_url:
            return format_html(
                '<img src="{}" style="max-height: 50px; max-width: 80px; object-fit: cover; border-radius: 4px;" />',
                obj.image_url
            )
        return '-'
    image_preview.short_description = 'Preview'

    def image_preview_large(self, obj):
        """Large image preview for detail view."""
        if obj.image_url:
            return format_html(
                '<img src="{}" style="max-height: 300px; max-width: 400px; object-fit: contain; border-radius: 8px;" />',
                obj.image_url
            )
        return 'No image'
    image_preview_large.short_description = 'Image Preview'

    def approve_projects(self, request, queryset):
        count = queryset.update(is_approved=True)
        self.message_user(request, f'{count} projects approved.')
    approve_projects.short_description = "Approve selected projects"

    def unapprove_projects(self, request, queryset):
        count = queryset.update(is_approved=False)
        self.message_user(request, f'{count} projects hidden.')
    unapprove_projects.short_description = "Hide selected projects"

    def set_as_winner(self, request, queryset):
        count = queryset.update(is_winner=True)
        self.message_user(request, f'{count} projects marked as winners.')
    set_as_winner.short_description = "Mark as winners"


@admin.register(Vote)
class VoteAdmin(admin.ModelAdmin):
    """Admin interface for AI Gala votes."""

    list_display = ['voter_name', 'project_title', 'gallery_title', 'created_at']
    list_filter = ['project__gallery', 'created_at']
    search_fields = ['voter__name', 'project__title']
    ordering = ['-created_at']
    raw_id_fields = ['voter', 'project']
    readonly_fields = ['created_at']

    def voter_name(self, obj):
        return obj.voter.name
    voter_name.short_description = 'Voter'
    voter_name.admin_order_field = 'voter__name'

    def project_title(self, obj):
        return obj.project.title
    project_title.short_description = 'Project'
    project_title.admin_order_field = 'project__title'

    def gallery_title(self, obj):
        return obj.project.gallery.title
    gallery_title.short_description = 'Gallery'


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    """Admin interface for AI Gala comments."""

    list_display = ['commenter_name', 'project_title', 'content_preview', 'is_approved', 'created_at']
    list_filter = ['is_approved', 'project__gallery', 'created_at']
    search_fields = ['content', 'commenter__name', 'project__title']
    ordering = ['-created_at']
    raw_id_fields = ['commenter', 'project']
    readonly_fields = ['created_at']

    actions = ['approve_comments', 'unapprove_comments']

    def commenter_name(self, obj):
        return obj.commenter.name
    commenter_name.short_description = 'Commenter'
    commenter_name.admin_order_field = 'commenter__name'

    def project_title(self, obj):
        return obj.project.title
    project_title.short_description = 'Project'
    project_title.admin_order_field = 'project__title'

    def content_preview(self, obj):
        """Truncated content for list view."""
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
    content_preview.short_description = 'Comment'

    def approve_comments(self, request, queryset):
        count = queryset.update(is_approved=True)
        self.message_user(request, f'{count} comments approved.')
    approve_comments.short_description = "Approve selected comments"

    def unapprove_comments(self, request, queryset):
        count = queryset.update(is_approved=False)
        self.message_user(request, f'{count} comments hidden.')
    unapprove_comments.short_description = "Hide selected comments"
