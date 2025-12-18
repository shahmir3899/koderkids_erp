from django.urls import path
from .views import generate_pdf, delete_student_image, generate_bulk_pdf_zip, students_progress, get_student_achieved_topics_count, get_student_image_uploads_count, get_student_progress_images
app_name = 'reports'
urlpatterns = [
    
    path('api/generate-pdf/', generate_pdf, name='generate_pdf'),  # Updated path
    # reports/urls.py
    path('reports/api/generate-bulk-pdf-zip/', generate_bulk_pdf_zip, name='generate_bulk_pdf_zip'),    
    path('api/student-progress-images/<int:student_id>/<str:filename>/', delete_student_image, name='delete_student_image'),
    path('students-progress/', students_progress, name='students_progress'),
    path('student-achieved-topics-count/', get_student_achieved_topics_count, name='get_student_achieved_topics_count'),
    path('student-image-uploads-count/', get_student_image_uploads_count, name='get_student_image_uploads_count'),
    path('student-progress-images/', get_student_progress_images, name='get_student_progress_images'),
]
  