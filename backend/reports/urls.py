from django.urls import path
from .views import GeneratePDFView

urlpatterns = [
    path('generate-pdf/', GeneratePDFView, name='generate_pdf'),
]