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
    
    # Admin Profile (NEW)
    AdminProfileView,
    AdminProfilePhotoUploadView,
    AdminProfilePhotoDeleteView,
    
    # Notifications
    NotificationListView,
    UnreadNotificationCountView,
    MarkNotificationReadView,
    MarkAllNotificationsReadView,
    CreateNotificationView,
    SendNotificationToAllView,
    
    # Earnings & Deductions
    TeacherEarningsView,
    TeacherDeductionsView,
)

app_name = 'employees'

urlpatterns = [
    # ============================================
    # Teacher List (For Admin Dropdown)
    # URL: /employees/teachers/
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
    
    # ============================================
    # Earnings & Deductions Endpoints
    # ============================================
    path('teacher/earnings/', TeacherEarningsView.as_view(), name='teacher-earnings'),
    path('teacher/deductions/', TeacherDeductionsView.as_view(), name='teacher-deductions'),
]