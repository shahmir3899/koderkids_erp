"""
URL Configuration for Staff Commands
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    CommandExecuteView,
    CommandViewSet,
    QuickActionViewSet,
    StaffAttendanceViewSet,
)

# Create router for ViewSets
router = DefaultRouter()
router.register(r'history', CommandViewSet, basename='command')
router.register(r'quick-actions', QuickActionViewSet, basename='quick-action')
router.register(r'staff-attendance', StaffAttendanceViewSet, basename='staff-attendance')

urlpatterns = [
    # Main command execution endpoint
    path('execute/', CommandExecuteView.as_view(), name='command-execute'),

    # Include router URLs
    path('', include(router.urls)),
]
