from django.urls import path
from .views import generate_pdf, delete_student_image, generate_bulk_pdf_zip
app_name = 'reports'
urlpatterns = [
    
    path('api/generate-pdf/', generate_pdf, name='generate_pdf'),  # Updated path
    # reports/urls.py
    path('reports/api/generate-bulk-pdf-zip/', generate_bulk_pdf_zip, name='generate_bulk_pdf_zip'),    
    path('api/student-progress-images/<int:student_id>/<str:filename>/', delete_student_image, name='delete_student_image'),
  
]