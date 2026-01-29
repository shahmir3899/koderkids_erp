# ============================================
# EMPLOYEES URLS - Updated with Admin Profile Features
# ============================================

from django.urls import path
from .views import (
    # Teacher List (for Admin)
    TeacherListView,

    # Teacher Profile
    TeacherProfileView,
    TeacherProfilePhotoUploadView,
    TeacherProfilePhotoDeleteView,
    get_teacher_dashboard_data,

    # Self-Service Salary Data
    get_my_salary_data,

    # Admin Profile (NEW)
    AdminProfileView,
    AdminProfilePhotoUploadView,
    AdminProfilePhotoDeleteView,

    # BDM Profile (NEW)
    BDMProfileView,

    # Notifications
    NotificationListView,
    UnreadNotificationCountView,
    MarkNotificationReadView,
    MarkAllNotificationsReadView,
    CreateNotificationView,
    SendNotificationToAllView,
    SendNotificationToStudentsView,

    # Earnings & Deductions
    TeacherEarningsView,
    TeacherDeductionsView,

    # Salary Slips
    SalarySlipListView,
    SalarySlipCreateView,
    SalarySlipDetailView,
)

from .evaluation_views import (
    bdm_proforma_list,
    bdm_proforma_detail,
    teacher_evaluation_list,
    teacher_evaluation_detail,
    calculate_evaluation,
    my_evaluation,
)

app_name = 'employees'

urlpatterns = [
    # ============================================
    # Employee List (For Task Assignment Dropdown)
    # URL: /employees/teachers/
    # Returns: Teachers, Admins, BDMs with role field
    # ============================================
    path('teachers/', TeacherListView.as_view(), name='teacher-list'),
    
    # ============================================
    # Teacher Profile Endpoints
    # URLs: /employees/teacher/...
    # ============================================
    
    # GET/PUT - Get or update teacher profile (current user)
    path('teacher/profile/', TeacherProfileView.as_view(), name='teacher-profile'),
    
    # GET/PUT - Get or update teacher by ID (for admin)
    path('teacher/<int:teacher_id>/', TeacherProfileView.as_view(), name='teacher-profile-by-id'),
    
    # POST - Upload profile photo
    path('teacher/profile/photo/', TeacherProfilePhotoUploadView.as_view(), name='teacher-photo-upload'),
    
    # DELETE - Delete profile photo
    path('teacher/profile/photo/delete/', TeacherProfilePhotoDeleteView.as_view(), name='teacher-photo-delete'),
    
    # GET - Get all dashboard data in one call
    path('teacher/dashboard-data/', get_teacher_dashboard_data, name='teacher-dashboard-data'),
    
    # ============================================
    # Admin Profile Endpoints (NEW)
    # URLs: /employees/admin/...
    # ============================================
    
    # GET/PUT - Get or update admin profile (current user)
    path('admin/profile/', AdminProfileView.as_view(), name='admin-profile'),
    
    # POST - Upload admin profile photo
    path('admin/profile/photo/', AdminProfilePhotoUploadView.as_view(), name='admin-photo-upload'),
    
    # DELETE - Delete admin profile photo
    path('admin/profile/photo/delete/', AdminProfilePhotoDeleteView.as_view(), name='admin-photo-delete'),

    # ============================================
    # BDM Profile Endpoints (NEW)
    # URLs: /employees/bdm/...
    # ============================================

    # GET/PUT - Get or update BDM profile (current user)
    path('bdm/profile/', BDMProfileView.as_view(), name='bdm-profile'),

    # ============================================
    # Notification Endpoints
    # URLs: /employees/notifications/...
    # ============================================
    
    # GET - List all notifications for current user
    path('notifications/', NotificationListView.as_view(), name='notification-list'),
    
    # GET - Get unread notification count
    path('notifications/unread-count/', UnreadNotificationCountView.as_view(), name='notification-unread-count'),
    
    # POST - Mark single notification as read
    path('notifications/<int:notification_id>/read/', MarkNotificationReadView.as_view(), name='notification-mark-read'),
    
    # POST - Mark all notifications as read
    path('notifications/mark-all-read/', MarkAllNotificationsReadView.as_view(), name='notification-mark-all-read'),
    
    # POST - Create notification for single user (Admin only)
    path('notifications/create/', CreateNotificationView.as_view(), name='notification-create'),
    
    # POST - Send notification to all teachers (Admin only)
    path('notifications/send-to-all/', SendNotificationToAllView.as_view(), name='notification-send-to-all'),

    # POST - Send notification to students (Admin only, with optional school/class filter)
    path('notifications/send-to-students/', SendNotificationToStudentsView.as_view(), name='notification-send-to-students'),

    # ============================================
    # Earnings & Deductions Endpoints
    # ============================================
    path('teacher/earnings/', TeacherEarningsView.as_view(), name='teacher-earnings'),
    path('teacher/deductions/', TeacherDeductionsView.as_view(), name='teacher-deductions'),

    # ============================================
    # Self-Service: My Salary Data (For Salary Slip)
    # URL: /employees/my-salary-data/
    # Available to: Teacher, BDM, Admin
    # ============================================
    path('my-salary-data/', get_my_salary_data, name='my-salary-data'),

    # ============================================
    # Salary Slips
    # Admin: Generate, view all, delete
    # Teacher/BDM: View own only (read-only)
    # ============================================

    # GET - List salary slips (Admin: all or filtered, Others: own only)
    # POST - Create/save salary slip (Admin only)
    path('salary-slips/', SalarySlipListView.as_view(), name='salary-slip-list'),
    path('salary-slips/create/', SalarySlipCreateView.as_view(), name='salary-slip-create'),

    # GET - Retrieve specific slip (own only for non-admins)
    # DELETE - Delete slip (Admin only)
    path('salary-slips/<int:pk>/', SalarySlipDetailView.as_view(), name='salary-slip-detail'),

    # ============================================
    # BDM Proforma Endpoints (Teacher Attitude Evaluation)
    # URLs: /employees/bdm/proforma/...
    # ============================================

    # GET - List all proformas, POST - Create new proforma
    path('bdm/proforma/', bdm_proforma_list, name='bdm-proforma-list'),

    # GET/PUT - View or update specific proforma
    path('bdm/proforma/<int:proforma_id>/', bdm_proforma_detail, name='bdm-proforma-detail'),

    # ============================================
    # Teacher Evaluation Endpoints
    # URLs: /employees/teacher-evaluation/...
    # ============================================

    # GET - List all teacher evaluations (Admin only)
    path('teacher-evaluation/', teacher_evaluation_list, name='teacher-evaluation-list'),

    # GET - View specific teacher's evaluations
    path('teacher-evaluation/<int:teacher_id>/', teacher_evaluation_detail, name='teacher-evaluation-detail'),

    # POST - Calculate/recalculate evaluations
    path('teacher-evaluation/calculate/', calculate_evaluation, name='teacher-evaluation-calculate'),

    # GET - Get own evaluations (Teacher self-service)
    path('my-evaluation/', my_evaluation, name='my-evaluation'),
]