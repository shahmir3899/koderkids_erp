# ============================================
# MONITORING URLS
# ============================================

from django.urls import path
from . import views

app_name = 'monitoring'

urlpatterns = [
    # Visit CRUD
    path('visits/', views.visit_list, name='visit-list'),
    path('visits/<int:visit_id>/', views.visit_detail, name='visit-detail'),
    path('visits/<int:visit_id>/start/', views.visit_start, name='visit-start'),
    path('visits/<int:visit_id>/complete/', views.visit_complete, name='visit-complete'),
    path('visits/<int:visit_id>/teachers/', views.visit_teachers, name='visit-teachers'),
    path('visits/<int:visit_id>/evaluations/', views.visit_evaluations, name='visit-evaluations'),

    # School working days
    path('schools/<int:school_id>/working-days/', views.school_working_days, name='school-working-days'),

    # Form templates
    path('templates/', views.template_list, name='template-list'),
    path('templates/<int:template_id>/', views.template_detail, name='template-detail'),

    # Evaluation detail
    path('evaluations/<int:evaluation_id>/', views.evaluation_detail, name='evaluation-detail'),

    # Dashboard
    path('dashboard/stats/', views.dashboard_stats, name='dashboard-stats'),
]
