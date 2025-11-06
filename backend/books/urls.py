# books/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BookViewSet
from .views import upload_csv

router = DefaultRouter()
router.register(r'books', BookViewSet, basename='book')   # <-- CHANGE THIS

urlpatterns = [path("", include(router.urls)),
               path('upload/', upload_csv),
               ]