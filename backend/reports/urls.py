from django.urls import path
from .views import generate_pdf, student_report_data, preview_pdf_html
app_name = 'reports'
urlpatterns = [
    path('student-report-data/', student_report_data, name='student_report_data'),
    path('api/generate-pdf/', generate_pdf, name='generate_pdf'),  # Updated path
    path('api/preview-pdf-html/', preview_pdf_html, name='preview_pdf_html'),
  
]