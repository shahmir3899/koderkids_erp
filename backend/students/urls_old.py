from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import mark_attendance, get_attendance, update_attendance
from django.shortcuts import render
from .views import (
    StudentViewSet, get_fees, get_students, 
    create_new_month_fees, update_fees, get_classes,
    students_per_school, fee_received_per_month, 
    new_registrations, schools_list, create_lesson_plan, get_lesson_plan, update_achieved_topic, 
)

# ✅ Register ViewSet-based routes
router = DefaultRouter()
router.register(r'students', StudentViewSet)

def home(request):
    return render(request, 'index.html')

urlpatterns = [
    path('', include(router.urls)),  # ✅ Default Router URLs
    path('fees/', get_fees, name='get_fees'),
    path('students/', get_students, name='get_students'),
    path('fees/create/', create_new_month_fees, name='create_new_month_fees'),
    path('fees/update/', update_fees, name='update_fees'),
    path('students-per-school/', students_per_school, name='students_per_school'),
    path('fee-per-month/', fee_received_per_month, name='fee_received_per_month'),
    path('new-registrations/', new_registrations, name='new_registrations'),
    path("classes/", get_classes, name="get_classes"),  # ✅ Add this line
    #path('schools/', schools_list, name="schools_list"),  # ✅ Ensure only one schools route
    path('attendance/', mark_attendance, name="mark_attendance"),  # ✅ POST
    path('attendance/<str:session_date>/', get_attendance, name="get_attendance"),  # ✅ GET
    path('attendance/update/<int:attendance_id>/', update_attendance, name="update_attendance"),  # ✅ PUT (Admin only)
    path('lesson-plan/', create_lesson_plan, name="create_lesson_plan"),  # ✅ POST
    path('lesson-plan/<str:session_date>/<str:student_class>/', get_lesson_plan, name="get_lesson_plan"),  # ✅ GET
    path('lesson-plan/update/<int:lesson_plan_id>/', update_achieved_topic, name="update_achieved_topic"),  # ✅ PUT
    

    # ❌ REMOVE THIS LINE TO AVOID RECURSION
    # path('api/', include('students.urls')),
]
