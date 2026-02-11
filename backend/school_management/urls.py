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
    FeeSummaryView, StudentProfileViewSet,  debug_cors,

    # Students Management
    StudentViewSet, add_student,  get_students, get_student_details,
    get_student_images,  students_per_school, new_registrations,

    # Schools and Classes
    get_schools, get_schools_with_classes, get_classes, get_school_details, schools_list,

    # Lessons and Attendance

    SchoolViewSet,    create_school,    update_school,  delete_school, get_school_stats, get_schools_overview,
    # Fee Management
    get_fees, create_new_month_fees, update_fees, fee_received_per_month,

    # Progress and Performance
     upload_student_image, get_class_image_count,


    my_student_data, create_single_fee, delete_fees, my_progress,
    get_fee_defaulters, compare_fee_months,

    StudentProfilePhotoUploadView,      # ← ADD
    StudentProfilePhotoDeleteView,      # ← ADD
    StudentProfileViewSet,            # ← ADD

)
from authentication.views import get_my_assigned_schools

# Register ViewSet-based routes
router = DefaultRouter()
router.register(r'students', StudentViewSet)
router.register(r'schools', SchoolViewSet, basename='school')


from django.http import JsonResponse

def home(request):
    return JsonResponse({"message": "Welcome to the School Management API"}, status=200)

urlpatterns = [
    # Admin Panel
    path('admin/', admin.site.urls),
    path('api/', include('finance.urls')),  # Include finance URLs
    path('employees/', include('employees.urls')),

    # ✅ NEW: Authentication endpoints
    path('api/auth/', include('authentication.urls')),

    path('api/lessons/', include('lessons.urls')),
    path('api/attendance/', include('attendance.urls')),
    path('api/dashboards/', include('dashboards.urls')),
    path('api/reports/', include('reports.urls')),
    path('api/crm/', include('crm.urls')),
    path('api/tasks/', include('tasks.urls')),
    path('api/commands/', include('commands.urls')),
    path('api/ai/', include('ai.urls')),
    path('api/courses/', include('courses.urls')),
    path('api/aigala/', include('aigala.urls')),




    # Student & School APIs
    path('api/students/', get_students, name='get_students'),
    path('api/students/<int:pk>/', StudentViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='student-detail'),
    path('api/students/add/', add_student, name='add_student'),
    #path('api/schools/', get_schools, name="schools_list"),
    path('api/students-per-school/', students_per_school, name='students_per_school'),
    path('api/new-registrations/', new_registrations, name='new_registrations'),
    path('api/students/my-data/', my_student_data, name='my_student_data'),  # ← NEW
    path('api/students/my-progress/', my_progress, name='my_progress'),  # Student progress dashboard data
    path('api/schools-with-classes/', get_schools_with_classes, name='schools_with_classes'),

    # Fees Management
    path('api/fees/', get_fees, name='get_fees'),
    path('api/fees/create/', create_new_month_fees, name='create_new_month_fees'),
    path('api/fees/update/', update_fees, name='update_fees'),
    path('api/fee-per-month/', fee_received_per_month, name='fee_received_per_month'),
    path('api/fees/create-single/', create_single_fee, name='create-single-fee'),
    path('api/fees/delete/', delete_fees, name='delete-fees'),
    path('api/fees/defaulters/', get_fee_defaulters, name='fee-defaulters'),
    path('api/fees/compare/', compare_fee_months, name='compare-fee-months'),

    
    path('api/school-details/', get_school_details, name="get_school_details"),
    

    # Misc
    path('api/classes/', get_classes, name="get_classes"),
    path("api/upload-student-image/", upload_student_image, name="upload_student_image"),
    path("api/student-images/", get_student_images, name="get_student_images"),

    # Routes for Reports
    path('api/student-details/', get_student_details, name='get_student_details'),
    
    path('api/class-image-count/', get_class_image_count, name='get_class_image_count'),
   
    path('api/fee-summary/', FeeSummaryView.as_view(), name='fee-summary'),
    # Includes robot chat APIs
    path("api/", include("robotchat.urls")),
     path('api/students/profile/', StudentProfileViewSet.as_view({
            'get': 'retrieve',
            'put': 'update',
            'patch': 'partial_update'
        }), name='student-profile'),
    # Inventory
    path('api/inventory/', include('inventory.urls')),

    path('', include('reports.urls')),

    # DRF Router URLs (For ViewSets)
    path('api/', include(router.urls)),
    # Books 
    path('api/books/', include('books.urls')),
    #School Management
    
    path('api/schools/overview/', get_schools_overview, name='schools_overview'),
    path('api/schools/stats/<int:pk>/', get_school_stats, name='school_stats'),
   

    path('api/students/profile/photo/', StudentProfilePhotoUploadView.as_view(), name='student-photo-upload'),
    path('api/students/profile/photo/delete/', StudentProfilePhotoDeleteView.as_view(), name='student-photo-delete'),

    # User assigned schools (for teachers creating contests)
    path('api/users/me/assigned-schools/', get_my_assigned_schools, name='my-assigned-schools'),

    
   
        
        path('my-data/', my_student_data, name='my-student-data'),
 ]



# Remove the duplicate router and urlpatterns redefinition
# Move static media handling outside urlpatterns
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)