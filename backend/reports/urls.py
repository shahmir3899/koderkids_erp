from django.urls import path
from .views import generate_pdf, delete_student_image
app_name = 'reports'
urlpatterns = [
    
    path('api/generate-pdf/', generate_pdf, name='generate_pdf'),  # Updated path
    path('api/student-progress-images/<int:student_id>/<str:filename>/', delete_student_image, name='delete_student_image'),
  
]