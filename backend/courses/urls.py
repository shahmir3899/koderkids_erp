# courses/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

# Router for ViewSets
router = DefaultRouter()
router.register(r'quiz-builder', views.QuizViewSet, basename='quiz-builder')

urlpatterns = [
    # Course Browsing
    path('', views.course_list, name='course-list'),
    path('<int:course_id>/', views.course_detail, name='course-detail'),
    path('<int:course_id>/preview/', views.course_preview, name='course-preview'),

    # Enrollment
    path('<int:course_id>/enroll/', views.enroll_in_course, name='course-enroll'),
    path('<int:course_id>/unenroll/', views.unenroll_from_course, name='course-unenroll'),
    path('my-courses/', views.my_courses, name='my-courses'),
    path('auto-enroll-all/', views.auto_enroll_all, name='auto-enroll-all'),
    path('continue/', views.continue_learning, name='continue-learning'),

    # Course Progress
    path('<int:course_id>/progress/', views.course_progress, name='course-progress'),

    # Topic Content & Progress
    path('topics/<int:topic_id>/content/', views.topic_content, name='topic-content'),
    path('topics/<int:topic_id>/siblings/', views.topic_siblings, name='topic-siblings'),
    path('topics/<int:topic_id>/quizzes/', views.topic_quizzes, name='topic-quizzes'),

    # Progress Tracking
    path('progress/topic/<int:topic_id>/start/', views.topic_start, name='topic-start'),
    path('progress/topic/<int:topic_id>/complete/', views.topic_complete, name='topic-complete'),
    path('progress/topic/<int:topic_id>/heartbeat/', views.topic_heartbeat, name='topic-heartbeat'),
    path('progress/dashboard/', views.progress_dashboard, name='progress-dashboard'),

    # Teacher Progress Views (NEW)
    path('teacher/students-progress/', views.teacher_students_progress, name='teacher-students-progress'),
    path('teacher/class-overview/', views.teacher_class_overview, name='teacher-class-overview'),
    path('teacher/student/<int:student_id>/progress/', views.student_detail_progress, name='student-detail-progress'),
    path('export/progress-csv/', views.export_progress_csv, name='export-progress-csv'),

    # Quiz Taking (Student)
    path('quizzes/<int:quiz_id>/', views.quiz_detail, name='quiz-detail'),
    path('quizzes/<int:quiz_id>/start/', views.quiz_start, name='quiz-start'),
    path('quizzes/<int:quiz_id>/submit/', views.quiz_submit, name='quiz-submit'),
    path('quizzes/attempts/<int:attempt_id>/', views.quiz_attempt_detail, name='quiz-attempt-detail'),

    # Quiz Builder (Admin/Teacher) - ViewSet routes
    path('', include(router.urls)),
]
