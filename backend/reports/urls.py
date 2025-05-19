from django.urls import path
from .views import generate_pdf, student_report_data, generate_pdf_batch

app_name = 'reports'
urlpatterns = [
    path('student-report-data/', student_report_data, name='student_report_data'),
    path('/generate-pdf/', generate_pdf, name='generate_pdf'),
    path('generate-pdf-batch/', generate_pdf_batch, name='generate-pdf-batch'),
]