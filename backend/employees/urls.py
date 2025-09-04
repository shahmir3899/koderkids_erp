from django.urls import path
from employees.views import TeacherListView, TeacherProfileView, DefaultDatesView

app_name = 'employees'

urlpatterns = [
    path('api/teachers/', TeacherListView.as_view(), name='teacher-list'),
    path('api/teacher/<int:teacher_id>/', TeacherProfileView.as_view(), name='teacher-profile'),
    path('api/default-dates/', DefaultDatesView.as_view(), name='default-dates'),
]