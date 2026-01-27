"""
AI Gala URL Configuration.
All endpoints are prefixed with /api/aigala/
"""
from django.urls import path
from . import views

app_name = 'aigala'

urlpatterns = [
    # ============== GALLERY ENDPOINTS ==============
    # List all galleries
    path('galleries/', views.list_galleries, name='gallery-list'),

    # Get active/voting gallery
    path('active/', views.active_gallery, name='active-gallery'),

    # Gallery detail
    path('galleries/<int:gallery_id>/', views.gallery_detail, name='gallery-detail'),

    # Create gallery (admin)
    path('galleries/create/', views.create_gallery, name='gallery-create'),

    # Update gallery (admin)
    path('galleries/<int:gallery_id>/update/', views.update_gallery, name='gallery-update'),

    # Update gallery status (admin)
    path('galleries/<int:gallery_id>/status/', views.update_gallery_status, name='gallery-status'),

    # Upload project to gallery
    path('galleries/<int:gallery_id>/upload/', views.upload_project, name='upload-project'),

    # ============== PROJECT ENDPOINTS ==============
    # Project detail
    path('projects/<int:project_id>/', views.project_detail, name='project-detail'),

    # Update project
    path('projects/<int:project_id>/update/', views.update_project, name='project-update'),

    # Delete project
    path('projects/<int:project_id>/delete/', views.delete_project, name='project-delete'),

    # ============== VOTING ENDPOINTS ==============
    # Cast vote
    path('projects/<int:project_id>/vote/', views.vote_for_project, name='vote-project'),

    # Remove vote (same URL, DELETE method)
    path('projects/<int:project_id>/unvote/', views.remove_vote, name='unvote-project'),

    # ============== COMMENT ENDPOINTS ==============
    # List comments for project
    path('projects/<int:project_id>/comments/', views.list_comments, name='list-comments'),

    # Add comment (same URL, POST method handled in view)
    path('projects/<int:project_id>/comments/add/', views.add_comment, name='add-comment'),

    # Delete comment
    path('comments/<int:comment_id>/delete/', views.delete_comment, name='delete-comment'),

    # ============== DASHBOARD DATA ==============
    # My gala data (for student dashboard)
    path('my-data/', views.my_gala_data, name='my-gala-data'),

    # ============== TEACHER/ADMIN ENDPOINTS ==============
    # Teacher upload project for student (teachers can only upload for their assigned schools)
    path('teacher/galleries/<int:gallery_id>/upload/', views.teacher_upload_project, name='teacher-upload-project'),

    # ============== ADMIN ENDPOINTS ==============
    # Admin upload project for student
    path('admin/galleries/<int:gallery_id>/upload/', views.admin_upload_project, name='admin-upload-project'),

    # Admin calculate winners
    path('admin/galleries/<int:gallery_id>/calculate-winners/', views.admin_calculate_winners, name='admin-calculate-winners'),

    # Admin gallery stats
    path('admin/galleries/<int:gallery_id>/stats/', views.admin_gallery_stats, name='admin-gallery-stats'),

    # ============== PDF ENDPOINTS ==============
    # Participation report PDF (admin only)
    path('admin/galleries/<int:gallery_id>/participation-report/', views.participation_report_pdf, name='participation-report-pdf'),

    # Download all certificates as ZIP (admin only)
    path('admin/galleries/<int:gallery_id>/certificates/', views.download_all_certificates, name='download-all-certificates'),

    # Download single certificate (project owner or admin)
    path('projects/<int:project_id>/certificate/', views.download_certificate, name='download-certificate'),
]
