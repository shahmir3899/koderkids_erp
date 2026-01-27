# books/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    BookViewSet, upload_csv,
    AdminBookViewSet, AdminTopicViewSet, upload_topic_image,
    download_book_pdf
)

# Public/Student router
router = DefaultRouter()
router.register(r'books', BookViewSet, basename='book')

# Admin router
admin_router = DefaultRouter()
admin_router.register(r'books', AdminBookViewSet, basename='admin-book')
admin_router.register(r'topics', AdminTopicViewSet, basename='admin-topic')

urlpatterns = [
    # Public endpoints
    path("", include(router.urls)),
    path('upload/', upload_csv),

    # Admin endpoints
    path("admin/", include(admin_router.urls)),
    path("admin/upload-image/", upload_topic_image, name='upload-topic-image'),

    # PDF Download endpoint
    path("books/<int:book_id>/download-pdf/", download_book_pdf, name='download-book-pdf'),
]
