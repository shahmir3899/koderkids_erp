# school_management/urls.py
from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from finance import views as finance_views  # Corrected import
from employees import views as employee_views  # Corrected import
from students.views import (
    # Authentication
    CustomTokenObtainPairView, FeeSummaryView, register_user, debug_cors, TeacherLessonsSummary,

    # Students Management
    StudentViewSet, add_student, submit_attendance, update_student, delete_student, get_students, get_student_details,
    get_student_images, get_student_progress_images, students_per_school, new_registrations, 

    # Schools and Classes
    get_schools, get_schools_with_classes, get_classes, get_school_details, schools_list,

    # Lessons and Attendance
    get_lesson_plan, get_lesson_plan_range, create_lesson_plan, update_planned_topic,
    get_lessons_achieved, update_achieved_topic, get_teacher_dashboard_lessons,
    mark_attendance, get_attendance, update_attendance, get_attendance_count,
    TeacherLessonsByMonth, TeacherUpcomingLessons, TeacherLessonStatus,
    TeacherLessonsBySchool, TeacherStudentEngagement,

    # Fee Management
    get_fees, create_new_month_fees, update_fees, fee_received_per_month,

    # Progress and Performance
    students_progress, upload_student_image, get_class_image_count,

    # Logged-in User
    get_logged_in_user,

    # New APIs
    get_student_attendance_counts, get_student_achieved_topics_count, get_student_image_uploads_count,
    delete_lesson_plan,

    my_student_data,

    create_single_fee, delete_fees,
)

# Register ViewSet-based routes
router = DefaultRouter()
router.register(r'students', StudentViewSet)

from django.http import JsonResponse

def home(request):
    return JsonResponse({"message": "Welcome to the School Management API"}, status=200)

urlpatterns = [
    # Admin Panel
    path('admin/', admin.site.urls),
    path('api/', include('finance.urls')),  # Include finance URLs
    path('employees/', include('employees.urls')),

    # JWT Authentication
    path('api/token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # User Management
    path('api/register/', register_user, name='register_user'),
    path('api/user/', get_logged_in_user, name='get_logged_in_user'),

    # Student & School APIs
    path('api/students/', get_students, name='get_students'),
    path('api/students/<int:pk>/', StudentViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='student-detail'),
    path('api/students/add/', add_student, name='add_student'),
    path('api/schools/', get_schools, name="schools_list"),
    path('api/students-per-school/', students_per_school, name='students_per_school'),
    path('api/new-registrations/', new_registrations, name='new_registrations'),
    path('api/students/my-data/', my_student_data, name='my_student_data'),  # ← NEW
    path('api/schools-with-classes/', get_schools_with_classes, name='schools_with_classes'),

    # Fees Management
    path('api/fees/', get_fees, name='get_fees'),
    path('api/fees/create/', create_new_month_fees, name='create_new_month_fees'),
    path('api/fees/update/', update_fees, name='update_fees'),
    path('api/fee-per-month/', fee_received_per_month, name='fee_received_per_month'),
    path('api/fees/create-single/', create_single_fee, name='create-single-fee'),
    path('api/fees/delete/', delete_fees, name='delete-fees'),

    # Attendance Management
    path('api/attendance/', mark_attendance, name="mark_attendance"),
    path('api/attendance/<str:session_date>/', get_attendance, name="get_attendance"),
    path('api/attendance/update/<int:attendance_id>/', update_attendance, name="update_attendance"),
    path('api/school-details/', get_school_details, name="get_school_details"),
    path('api/students-prog/', students_progress, name='students_progress'),

    # Lesson Plan Management
    path('api/lesson-plan/', create_lesson_plan, name="create_lesson_plan"),
    path("api/lesson-plan-range/", get_lesson_plan_range, name="get_lesson_plan_range"),
    path('api/lesson-plan/update/<int:lesson_plan_id>/', update_achieved_topic, name="update_achieved_topic"),
    path("api/lesson-plan/<str:session_date>/<int:school_id>/<int:student_class>/", get_lesson_plan, name="get_lesson_plan"),
    path('api/lesson-plans/<int:lesson_plan_id>/update-planned-topic/', update_planned_topic, name='update_planned_topic'),
    path('api/teacher-lessons-summary/', TeacherLessonsSummary.as_view(), name='teacher-lessons-summary'),    # Lesson Plan Deletion
    path('api/lesson-plans/<int:lesson_plan_id>/', delete_lesson_plan, name='delete_lesson_plan'),

    # Misc
    path('api/classes/', get_classes, name="get_classes"),
    path("api/upload-student-image/", upload_student_image, name="upload_student_image"),
    path("api/student-images/", get_student_images, name="get_student_images"),

    # Routes for Reports
    path('api/student-details/', get_student_details, name='get_student_details'),
    path('api/attendance-count/', get_attendance_count, name='get_attendance_count'),
    path('api/lessons-achieved/', get_lessons_achieved, name='get_lessons_achieved'),
    path('api/student-progress-images/', get_student_progress_images, name='get_student_progress_images'),

    # Teacher Dashboard
    path('api/teacher-dashboard-lessons/', get_teacher_dashboard_lessons, name='teacher_dashboard_lessons'),
    path('api/class-image-count/', get_class_image_count, name='get_class_image_count'),
    path('api/teacher-lessons-by-month/', TeacherLessonsByMonth.as_view(), name='teacher-lessons-by-month'),
    path('api/teacher-upcoming-lessons/', TeacherUpcomingLessons.as_view(), name='teacher-upcoming-lessons'),
    path('api/teacher-lesson-status/', TeacherLessonStatus.as_view(), name='teacher-lesson-status'),
    path('api/teacher-lessons-by-school/', TeacherLessonsBySchool.as_view(), name='teacher-lessons-by-school'),
    path('api/teacher-student-engagement/', TeacherStudentEngagement.as_view(), name='teacher-student-engagement'),

    # New yeacher APIs
    path('api/student-attendance-counts/', get_student_attendance_counts, name='student-attendance-counts'),
    path('api/student-achieved-topics-count/', get_student_achieved_topics_count, name='student-achieved-topics-count'),
    path('api/student-image-uploads-count/', get_student_image_uploads_count, name='student-image-uploads-count'),
    path('api/fee-summary/', FeeSummaryView.as_view(), name='fee-summary'),
    # Includes robot chat APIs
    path("api/", include("robotchat.urls")),

    # Inventory
    path('api/inventory/', include('inventory.urls')),

    path('', include('reports.urls')),

    # DRF Router URLs (For ViewSets)
    path('api/', include(router.urls)),
    # Books 
    path('api/books/', include('books.urls')),




    
]

# Remove the duplicate router and urlpatterns redefinition
# Move static media handling outside urlpatterns
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)