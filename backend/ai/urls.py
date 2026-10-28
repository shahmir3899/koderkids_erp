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
    AIUndoView,
    AIHistoryView,
    AIStatsView,
    AIFileUploadView,
    AIRewriteView,
)
from .reconcile_views import (
    ReconcileStartView,
    ReconcileOpenView,
    ReconcileDetailView,
    ReconcileLineActionView,
    ReconcileAdjustView,
    ReconcileCompleteView,
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
    path('undo/', AIUndoView.as_view(), name='ai-undo'),
    path('upload/', AIFileUploadView.as_view(), name='ai-upload'),

    # History and stats
    path('history/', AIHistoryView.as_view(), name='ai-history'),
    path('stats/', AIStatsView.as_view(), name='ai-stats'),

    # Text rewrite
    path('rewrite/', AIRewriteView.as_view(), name='ai-rewrite'),

    # Guided bank-statement reconciliation
    path('reconcile/start/', ReconcileStartView.as_view(), name='reconcile-start'),
    path('reconcile/open/', ReconcileOpenView.as_view(), name='reconcile-open'),
    path('reconcile/<int:pk>/', ReconcileDetailView.as_view(), name='reconcile-detail'),
    path('reconcile/<int:pk>/lines/<int:line_id>/<str:action>/', ReconcileLineActionView.as_view(),
         name='reconcile-line-action'),
    path('reconcile/<int:pk>/adjust/', ReconcileAdjustView.as_view(), name='reconcile-adjust'),
    path('reconcile/<int:pk>/complete/', ReconcileCompleteView.as_view(), name='reconcile-complete'),
]
