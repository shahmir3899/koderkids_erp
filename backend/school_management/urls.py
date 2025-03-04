from django.conf import settings
from django.conf.urls.static import static
from django.urls import path, include
from django.contrib import admin
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from students.views import (
    CustomTokenObtainPairView, StudentViewSet, get_attendance_count, get_fees, get_lesson_plan, get_lesson_plan_range, get_lessons_achieved, get_school_details, get_student_details, get_student_images, get_student_progress_images, get_students,
    create_new_month_fees, get_teacher_dashboard_lessons, students_progress, update_fees, students_per_school, fee_received_per_month,
    new_registrations, get_schools, get_logged_in_user, mark_attendance, get_attendance,
    update_attendance, create_lesson_plan, update_achieved_topic, add_student, get_classes, upload_student_image, register_user
)

# ✅ Register ViewSet-based routes
router = DefaultRouter()
router.register(r'students', StudentViewSet)
from django.http import JsonResponse

def home(request):
    return JsonResponse({"message": "Welcome to the School Management API"}, status=200)


urlpatterns = [
    # Admin Panel
    path('admin/', admin.site.urls),

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
    


    # Fees Management
    path('api/fees/', get_fees, name='get_fees'),
    path('api/fees/create/', create_new_month_fees, name='create_new_month_fees'),
    path('api/fees/update/', update_fees, name='update_fees'),
    path('api/fee-per-month/', fee_received_per_month, name='fee_received_per_month'),

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

    # Misc
    path('api/classes/', get_classes, name="get_classes"),
    path("api/upload-student-image/", upload_student_image, name="upload_student_image"),
    path("api/student-images/", get_student_images, name="get_student_images"),
    # Routes for Reports
    path('api/student-details/', get_student_details, name='get_student_details'),
    path('api/attendance-count/', get_attendance_count, name='get_attendance_count'),
    path('api/lessons-achieved/', get_lessons_achieved, name='get_lessons_achieved'),
    path('api/student-progress-images/', get_student_progress_images, name='get_student_progress_images'),
    # Teacher dahbord
    path('api/teacher-dashboard-lessons/', get_teacher_dashboard_lessons, name='teacher_dashboard_lessons'),



    # DRF Router URLs (For ViewSets)
    path('api/', include(router.urls)),
]
urlpatterns = [
    path("", home),  # Add this for the root URL
] + urlpatterns  # Keep existing routes
# ✅ Move static media handling outside `urlpatterns`
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
