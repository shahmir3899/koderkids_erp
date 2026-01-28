# books/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    BookViewSet, upload_csv,
    AdminBookViewSet, AdminTopicViewSet, upload_topic_image,
    download_book_pdf,
    book_visibility_list, book_visibility_delete,
    topic_assignment_list, topic_assignment_detail,
    student_assignments
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

    # Visibility Management (Admin/Teacher)
    path("admin/books/<int:book_id>/visibility/", book_visibility_list, name='book-visibility-list'),
    path("admin/books/<int:book_id>/visibility/<int:rule_id>/", book_visibility_delete, name='book-visibility-delete'),

    # Assignment Management (Admin/Teacher)
    path("admin/assignments/", topic_assignment_list, name='topic-assignment-list'),
    path("admin/assignments/<int:assignment_id>/", topic_assignment_detail, name='topic-assignment-detail'),

    # Student Assignments
    path("student/assignments/", student_assignments, name='student-assignments'),

    # PDF Download endpoint
    path("books/<int:book_id>/download-pdf/", download_book_pdf, name='download-book-pdf'),
]
