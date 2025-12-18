# ============================================
# LESSONS URL PATTERNS
# ============================================

from django.urls import path
from .views import (
    create_lesson_plan,
    get_lesson_plan,
    get_lesson_plan_range,
    update_planned_topic,
    update_achieved_topic,
    delete_lesson_plan,
    get_lessons_achieved,
)

urlpatterns = [
    # Create lesson plan(s)
    path('create/', create_lesson_plan, name='create_lesson_plan'),
    
    # Get lesson plans
    path('<str:session_date>/<int:school_id>/<str:student_class>/', get_lesson_plan, name='get_lesson_plan'),
    path('range/', get_lesson_plan_range, name='get_lesson_plan_range'),
    path('achieved/', get_lessons_achieved, name='get_lessons_achieved'),
    
    # Update lesson plans
    path('<int:lesson_plan_id>/update-planned/', update_planned_topic, name='update_planned_topic'),
    path('<int:lesson_plan_id>/update-achieved/', update_achieved_topic, name='update_achieved_topic'),
    
    # Delete lesson plan
    path('<int:lesson_plan_id>/', delete_lesson_plan, name='delete_lesson_plan'),
]