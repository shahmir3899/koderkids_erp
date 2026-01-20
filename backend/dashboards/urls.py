from django.urls import path
from .views import (
    get_teacher_dashboard_lessons,
    TeacherLessonStatus,
    TeacherLessonsSummary,
    TeacherLessonsByMonth,
    TeacherUpcomingLessons,
    TeacherLessonsBySchool,
    TeacherStudentEngagement,
    get_login_activity,
)

urlpatterns = [
    path('teacher-lessons/', get_teacher_dashboard_lessons, name='get_teacher_dashboard_lessons'),
    path('teacher-lesson-status/', TeacherLessonStatus.as_view(), name='teacher_lesson_status'),
    path('teacher-lessons-summary/', TeacherLessonsSummary.as_view(), name='teacher_lessons_summary'),
    path('teacher-lessons-by-month/', TeacherLessonsByMonth.as_view(), name='teacher_lessons_by_month'),
    path('teacher-upcoming-lessons/', TeacherUpcomingLessons.as_view(), name='teacher_upcoming_lessons'),
    path('teacher-lessons-by-school/', TeacherLessonsBySchool.as_view(), name='teacher_lessons_by_school'),
    path('teacher-student-engagement/', TeacherStudentEngagement.as_view(), name='teacher_student_engagement'),
    path('login-activity/', get_login_activity, name='login_activity'),
]