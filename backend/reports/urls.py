from django.urls import path
from .views import generate_pdf_view

urlpatterns = [
    path('generate-pdf/', generate_pdf_view, name='generate_pdf'),
]