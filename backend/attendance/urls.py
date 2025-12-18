from django.urls import path
from .views import (
    mark_attendance,
    get_attendance,
    update_attendance,
    get_attendance_count,
    get_student_attendance_counts,
)

urlpatterns = [
    # Mark/submit attendance
    path('mark/', mark_attendance, name='mark_attendance'),
    
    # Get attendance
    
    path('count/', get_attendance_count, name='get_attendance_count'),
    path('student-counts/', get_student_attendance_counts, name='get_student_attendance_counts'),
    
    # Update attendance
    path('<int:attendance_id>/update/', update_attendance, name='update_attendance'),
    path('<str:session_date>/', get_attendance, name='get_attendance'),

]