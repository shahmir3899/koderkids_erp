# ============================================
# CRM URL CONFIGURATION
# ============================================

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    LeadViewSet,
    ActivityViewSet,
    BDMTargetViewSet,
    dashboard_stats,
    lead_sources_breakdown,
    conversion_metrics,
    upcoming_activities,
    target_progress,
)

# Create router for ViewSets
router = DefaultRouter()
router.register(r'leads', LeadViewSet, basename='lead')
router.register(r'activities', ActivityViewSet, basename='activity')
router.register(r'targets', BDMTargetViewSet, basename='target')

urlpatterns = [
    # Router URLs (ViewSets)
    path('', include(router.urls)),
    
    # Dashboard endpoints
    path('dashboard/stats/', dashboard_stats, name='dashboard_stats'),
    path('dashboard/lead-sources/', lead_sources_breakdown, name='lead_sources'),
    path('dashboard/conversion-rate/', conversion_metrics, name='conversion_rate'),
    path('dashboard/upcoming/', upcoming_activities, name='upcoming_activities'),
    path('dashboard/targets/', target_progress, name='target_progress'),
]

"""
API ENDPOINTS SUMMARY:

LEADS:
- GET    /api/crm/leads/                    # List all leads (filtered by role)
- POST   /api/crm/leads/                    # Create new lead
- GET    /api/crm/leads/{id}/               # Get lead details with activities
- PUT    /api/crm/leads/{id}/               # Update lead
- PATCH  /api/crm/leads/{id}/               # Partial update
- DELETE /api/crm/leads/{id}/               # Delete lead
- POST   /api/crm/leads/{id}/convert/       # Convert lead to school
- PATCH  /api/crm/leads/{id}/assign/        # Assign lead to BDM

ACTIVITIES:
- GET    /api/crm/activities/               # List activities
- POST   /api/crm/activities/               # Create activity
- GET    /api/crm/activities/{id}/          # Get activity details
- PUT    /api/crm/activities/{id}/          # Update activity
- PATCH  /api/crm/activities/{id}/          # Partial update
- DELETE /api/crm/activities/{id}/          # Delete activity
- PATCH  /api/crm/activities/{id}/complete/ # Mark activity as completed

TARGETS:
- GET    /api/crm/targets/                  # List targets (Admin: all, BDM: own)
- POST   /api/crm/targets/                  # Create target (Admin only)
- GET    /api/crm/targets/{id}/             # Get target details
- PUT    /api/crm/targets/{id}/             # Update target (Admin only)
- PATCH  /api/crm/targets/{id}/             # Partial update (Admin only)
- DELETE /api/crm/targets/{id}/             # Delete target (Admin only)
- GET    /api/crm/targets/{id}/refresh/     # Refresh actuals

DASHBOARD:
- GET    /api/crm/dashboard/stats/          # Overall stats
- GET    /api/crm/dashboard/lead-sources/   # Lead source breakdown
- GET    /api/crm/dashboard/conversion-rate/ # Conversion metrics over time
- GET    /api/crm/dashboard/upcoming/       # Upcoming activities
- GET    /api/crm/dashboard/targets/        # Active target progress
"""
