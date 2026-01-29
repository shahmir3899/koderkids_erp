# courses/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from . import proof_views
from . import guardian_views
from . import score_views
from . import unlock_views

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

    # Activity Proof Endpoints (Student)
    path('activity-proof/upload/', proof_views.upload_activity_proof, name='activity-proof-upload'),
    path('activity-proof/my-proofs/', proof_views.my_proofs, name='my-proofs'),
    path('activity-proof/my-proofs/<int:proof_id>/', proof_views.proof_detail_student, name='proof-detail-student'),

    # Activity Proof Endpoints (Teacher/Admin)
    path('activity-proof/pending/', proof_views.pending_proofs, name='pending-proofs'),
    path('activity-proof/all/', proof_views.all_proofs, name='all-proofs'),
    path('activity-proof/<int:proof_id>/', proof_views.proof_detail_teacher, name='proof-detail-teacher'),
    path('activity-proof/bulk-approve/', proof_views.bulk_approve, name='bulk-approve'),
    path('activity-proof/bulk-reject/', proof_views.bulk_reject, name='bulk-reject'),
    path('activity-proof/stats/', proof_views.proof_statistics, name='proof-statistics'),

    # Guardian Review Endpoints (Student - outside school hours)
    path('guardian/check-time/', guardian_views.check_guardian_time, name='guardian-check-time'),
    path('guardian/pending-reviews/', guardian_views.pending_guardian_reviews, name='guardian-pending-reviews'),
    path('guardian/review/<int:proof_id>/', guardian_views.submit_guardian_review, name='guardian-submit-review'),
    path('guardian/my-reviews/', guardian_views.my_guardian_reviews, name='guardian-my-reviews'),

    # Student Score Endpoints
    path('scores/my-scores/', score_views.my_scores, name='my-scores'),
    path('scores/my-scores/<int:topic_id>/', score_views.my_score_detail, name='my-score-detail'),
    path('scores/recalculate/<int:topic_id>/', score_views.recalculate_score, name='recalculate-score'),

    # Teacher/Admin Score Endpoints
    path('scores/class-report/', score_views.class_score_report, name='class-score-report'),
    path('scores/student/<int:student_id>/', score_views.student_score_detail, name='student-score-detail'),

    # Unlock Status Endpoints (5-Step Validation)
    path('topics/<int:topic_id>/unlock-status/', unlock_views.topic_unlock_status, name='topic-unlock-status'),
    path('topics/<int:topic_id>/validation-steps/', unlock_views.topic_validation_steps, name='topic-validation-steps'),
    path('topics/<int:topic_id>/can-access/', unlock_views.topic_access_check, name='topic-access-check'),
]
