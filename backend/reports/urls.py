from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    generate_pdf,
    delete_student_image,
    generate_bulk_pdf_zip,
    students_progress,
    get_student_achieved_topics_count,
    get_student_image_uploads_count,
    get_student_progress_images,
    CustomReportViewSet,
    ReportTemplateViewSet,
    ReportRequestViewSet,
)

app_name = 'reports'

# Router for ViewSets
router = DefaultRouter()
router.register(r'custom-reports', CustomReportViewSet, basename='custom-report')
router.register(r'templates', ReportTemplateViewSet, basename='report-template')
router.register(r'requests', ReportRequestViewSet, basename='report-request')

urlpatterns = [
    # Existing routes
    path('api/generate-pdf/', generate_pdf, name='generate_pdf'),
    path('reports/api/generate-bulk-pdf-zip/', generate_bulk_pdf_zip, name='generate_bulk_pdf_zip'),
    path('api/student-progress-images/<int:student_id>/<str:filename>/', delete_student_image, name='delete_student_image'),
    path('students-progress/', students_progress, name='students_progress'),
    path('student-achieved-topics-count/', get_student_achieved_topics_count, name='get_student_achieved_topics_count'),
    path('student-image-uploads-count/', get_student_image_uploads_count, name='get_student_image_uploads_count'),
    path('student-progress-images/', get_student_progress_images, name='get_student_progress_images'),

    # Custom Reports API (ViewSet routes)
    # This creates:
    #   GET    /custom-reports/           - list
    #   POST   /custom-reports/           - create
    #   GET    /custom-reports/{id}/      - retrieve
    #   PUT    /custom-reports/{id}/      - update
    #   PATCH  /custom-reports/{id}/      - partial_update
    #   DELETE /custom-reports/{id}/      - destroy
    #   GET    /custom-reports/templates/ - templates action
    #
    # Self-Service Report Templates:
    #   GET    /templates/                - list available templates
    #   GET    /templates/{id}/           - get template details
    #   GET    /templates/available/      - get templates for current user
    #   POST   /templates/                - create template (admin only)
    #   PUT    /templates/{id}/           - update template (admin only)
    #   DELETE /templates/{id}/           - delete template (admin only)
    #
    # Self-Service Report Requests:
    #   GET    /requests/                 - list requests
    #   POST   /requests/                 - create request (DRAFT)
    #   GET    /requests/{id}/            - get request details
    #   PUT    /requests/{id}/            - update draft request
    #   DELETE /requests/{id}/            - delete request
    #   POST   /requests/{id}/submit/     - submit for approval
    #   POST   /requests/{id}/approve/    - approve (admin only)
    #   POST   /requests/{id}/reject/     - reject (admin only)
    #   POST   /requests/{id}/cancel/     - cancel request
    #   GET    /requests/pending/         - list pending (admin only)
    #   GET    /requests/my-requests/     - list user's own requests
    #   GET    /requests/stats/           - statistics (admin only)
    path('', include(router.urls)),
]
