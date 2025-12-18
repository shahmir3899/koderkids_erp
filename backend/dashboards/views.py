from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db.models import Count, Case, When, IntegerField, FloatField
from django.db.models.functions import Round
from django.contrib.postgres.aggregates import ArrayAgg
from datetime import datetime, timedelta
from django.utils.timezone import now
import logging

from students.models import LessonPlan, Student, StudentImage
from students.serializers import (
    MonthlyLessonsSerializer, UpcomingLessonsSerializer,
    LessonStatusSerializer, SchoolLessonsSerializer, StudentEngagementSerializer
)

logger = logging.getLogger(__name__)

# Create your views here.
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_teacher_dashboard_lessons(request):
    """
    Fetch lessons for the next 4 days (Yesterday, Today, Tomorrow, Day After Tomorrow)
    for all assigned schools and classes of the logged-in teacher.
    """
    user = request.user
    
    if user.role != "Teacher":
        return Response({"error": "Unauthorized access."}, status=403)
    
    # Get all assigned schools
    assigned_schools = user.assigned_schools.all()
    
    if not assigned_schools.exists():
        return Response({"lessons": []})
    
    # Generate the required 4 dates
    today = now().date()
    date_range = [today - timedelta(days=1), today, today + timedelta(days=1), today + timedelta(days=2)]
    
    # Fetch all classes in assigned schools
    classes_per_school = {}
    for school in assigned_schools:
        classes = Student.objects.filter(school=school).values_list("student_class", flat=True).distinct()
        classes_per_school[school.id] = list(classes)
    
    # Fetch lessons for these schools, classes, and dates
    lessons = LessonPlan.objects.filter(
        session_date__in=date_range,
        school__in=assigned_schools,
        student_class__in=[cls for classes in classes_per_school.values() for cls in classes]  # Flatten classes list
    ).select_related("school")
    
    # Format response
    lessons_data = []
    for lesson in lessons:
        lessons_data.append({
            "date": lesson.session_date,
            "school_name": lesson.school.name,
            "class_name": lesson.student_class,
            "topic": lesson.planned_topic
        })
    
    return Response({"lessons": lessons_data})

class TeacherLessonStatus(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'Teacher':
            return Response({"error": "Only teachers can access this endpoint."}, status=status.HTTP_403_FORBIDDEN)
        month = request.query_params.get('month', datetime.today().strftime('%Y-%m'))
        try:
            year, month_num = map(int, month.split('-'))
            lessons = LessonPlan.objects.filter(
                teacher=request.user,
                session_date__year=year,
                session_date__month=month_num
            ).values('student_class', 'school__name').annotate(
                planned_lessons=Count('id', distinct=True),
                completed_lessons=Count(
                    Case(
                        When(achieved_topic__isnull=False, achieved_topic__gt='', then=1),
                        output_field=IntegerField()
                    ),
                    distinct=True
                ),
                completion_rate=Round(
                    Case(
                        When(planned_lessons__gt=0, then=(
                            1.0 * Count(
                                Case(
                                    When(achieved_topic__isnull=False, achieved_topic__gt='', then=1),
                                    output_field=IntegerField()
                                )
                            ) / Count('id') * 100.0
                        )),
                        default=0.0,
                        output_field=FloatField()
                    ), 2
                )
            ).order_by('student_class')

            if not lessons.exists():
                return Response([], status=status.HTTP_200_OK)

            serializer = LessonStatusSerializer(lessons, many=True)
            return Response(serializer.data, status=status.HTTP_200_OK)
        except ValueError:
            return Response({"error": "Invalid month format. Use YYYY-MM"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error processing request: {str(e)}")
            return Response({"error": "Internal server error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class TeacherLessonsSummary(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'Teacher':
            return Response({"error": "Only teachers can access this endpoint."}, status=status.HTTP_403_FORBIDDEN)

        month = request.query_params.get('month')  # e.g., "2025-04"
        school_id = request.query_params.get('school_id')  # Optional filter
        student_class = request.query_params.get('student_class')  # Optional filter

        if not month:
            return Response({"error": "Month parameter is required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            year, month_num = map(int, month.split('-'))
            # Base query
            lessons_query = LessonPlan.objects.filter(
                teacher=request.user,
                session_date__year=year,
                session_date__month=month_num
            )

            # Apply filters if provided
            if school_id:
                lessons_query = lessons_query.filter(school_id=school_id)
            if student_class:
                lessons_query = lessons_query.filter(student_class=student_class)

            # Aggregate data
            lessons = lessons_query.values('school__name', 'student_class').annotate(
                planned_lessons=Count('id'),
                completed_lessons=Count(Case(
                    When(achieved_topic__isnull=False, achieved_topic__gt='', then=1),
                    output_field=IntegerField()
                )),
                completion_rate=Round(
                    Case(
                        When(planned_lessons__gt=0, then=(
                            Count(Case(
                                When(achieved_topic__isnull=False, achieved_topic__gt='', then=1),
                                output_field=IntegerField()
                            )) * 100.0) / Count('id')
                        ),
                        default=0.0,
                        output_field=FloatField()
                    )
                )
            ).order_by('school__name', 'student_class')

            # Serialize data (reusing MonthlyLessonsSerializer and adding fields)
            data = [
                {
                    "school_name": entry['school__name'],
                    "student_class": entry['student_class'],
                    "lesson_count": entry['planned_lessons'],  # Match existing naming
                    "planned_lessons": entry['planned_lessons'],
                    "completed_lessons": entry['completed_lessons'],
                    "completion_rate": entry['completion_rate']
                }
                for entry in lessons
            ]

            return Response(data, status=status.HTTP_200_OK)

        except ValueError:
            return Response({"error": "Invalid month format. Use YYYY-MM"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            logger.error(f"Error in TeacherLessonsSummary: {str(e)}")
            return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class TeacherLessonsByMonth(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'Teacher':
            return Response({"error": "Only teachers can access this endpoint."}, status=status.HTTP_403_FORBIDDEN)
        try:
            month = request.query_params.get('month')  # e.g., "2025-04"
            if not month:
                return Response({"error": "Month parameter is required"}, status=status.HTTP_400_BAD_REQUEST)
            year, month = map(int, month.split('-'))
            lessons = LessonPlan.objects.filter(
                teacher=request.user,
                session_date__year=year,
                session_date__month=month
            ).values('student_class', 'school__name').annotate(
                lesson_count=Count('id')
            ).order_by('student_class')
            serializer = MonthlyLessonsSerializer(lessons, many=True)
            return Response(serializer.data)
        except ValueError:
            return Response({"error": "Invalid month format. Use YYYY-MM"}, status=status.HTTP_400_BAD_REQUEST)

class TeacherUpcomingLessons(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'Teacher':
            return Response({"error": "Only teachers can access this endpoint."}, status=status.HTTP_403_FORBIDDEN)
        today = datetime.today()
        next_week = today + timedelta(days=7)
        lessons = LessonPlan.objects.filter(
            teacher=request.user,
            session_date__range=[today, next_week]
        ).select_related('school').order_by('session_date', 'student_class')
        serializer = UpcomingLessonsSerializer(lessons, many=True)
        return Response({"lessons": serializer.data})  # Wrap in "lessons" to match existing API


class TeacherLessonsBySchool(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'Teacher':
            return Response({"error": "Only teachers can access this endpoint."}, status=status.HTTP_403_FORBIDDEN)
        month = request.query_params.get('month')
        if not month:
            return Response({"error": "Month parameter is required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            year, month = map(int, month.split('-'))
            lessons = LessonPlan.objects.filter(
                teacher=request.user,
                session_date__year=year,
                session_date__month=month
            ).values('school__name').annotate(
                total_lessons=Count('id'),
                classes_covered=ArrayAgg('student_class', distinct=True)
            ).order_by('school__name')
            serializer = SchoolLessonsSerializer(lessons, many=True)
            return Response(serializer.data)
        except ValueError:
            return Response({"error": "Invalid month format. Use YYYY-MM"}, status=status.HTTP_400_BAD_REQUEST)

class TeacherStudentEngagement(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):


        if request.user.role != 'Teacher':
            return Response({"error": "Only teachers can access this endpoint."}, status=status.HTTP_403_FORBIDDEN)
        month = request.query_params.get('month')
        if not month:
            return Response({"error": "Month parameter is required"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            year, month = map(int, month.split('-'))
            engagement = StudentImage.objects.filter(
                session_date__year=year,
                session_date__month=month,
                student__school__in=request.user.assigned_schools.all()
            ).values('student__student_class').annotate(
                image_count=Count('id'),
                student_count=Count('student_id', distinct=True)
            ).order_by('student__student_class')
            serializer = StudentEngagementSerializer(engagement, many=True)
            return Response(serializer.data)
        except ValueError:
            return Response({"error": "Invalid month format. Use YYYY-MM"}, status=status.HTTP_400_BAD_REQUEST)
        
