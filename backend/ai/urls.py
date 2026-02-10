"""
AI Agent URL Configuration
==========================
"""

from django.urls import path
from .views import (
    AIHealthView,
    AITestView,
    AIExecuteView,
    AIConfirmView,
    AIOverwriteView,
    AIHistoryView,
    AIStatsView,
    AIFileUploadView,
    AIRewriteView,
)

urlpatterns = [
    # Health check
    path('health/', AIHealthView.as_view(), name='ai-health'),

    # Debug/test endpoint
    path('test/', AITestView.as_view(), name='ai-test'),

    # Main endpoints
    path('execute/', AIExecuteView.as_view(), name='ai-execute'),
    path('confirm/', AIConfirmView.as_view(), name='ai-confirm'),
    path('overwrite/', AIOverwriteView.as_view(), name='ai-overwrite'),
    path('upload/', AIFileUploadView.as_view(), name='ai-upload'),

    # History and stats
    path('history/', AIHistoryView.as_view(), name='ai-history'),
    path('stats/', AIStatsView.as_view(), name='ai-stats'),

    # Text rewrite
    path('rewrite/', AIRewriteView.as_view(), name='ai-rewrite'),
]
