from django.shortcuts import render

# Create your views here.
import logging
from datetime import datetime
from django.db import IntegrityError
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.http import JsonResponse

from students.models import LessonPlan, School, Student, Attendance
from .models import OnlineTimeSlotLessonPlan
from .serializers import LessonPlanSerializer, OnlineTimeSlotLessonPlanSerializer

logger = logging.getLogger(__name__)


def _lesson_to_suggestion(lesson, scope):
    planned_topic = (lesson.planned_topic or '').strip()
    return {
        'title': planned_topic.splitlines()[0][:120] if planned_topic else '',
        'description': planned_topic,
        'scope': scope,
        'lesson_plan_id': lesson.id,
    }

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_lesson_plan(request):
    teacher = request.user
    if teacher.role != 'Teacher':
        return Response({"error": "Only teachers can create lesson plans."}, status=403)

    data = request.data

    # CASE 1: Bulk array of lessons (each with school_id, student_class)
    if isinstance(data, list):
        lessons_data = data
        created_plans = []

        for lesson_data in lessons_data:
            school_id = lesson_data.get('school_id')
            student_class = lesson_data.get('student_class')
            session_date = lesson_data.get('session_date')
            planned_topic_ids = lesson_data.get('planned_topic_ids', [])
            planned_topic_id = lesson_data.get('planned_topic_id')  # backward compat
            planned_topic = lesson_data.get('planned_topic', '')  # Custom text topic

            if not all([school_id, student_class, session_date]):
                return Response({
                    "error": "Each lesson must include school_id, student_class, session_date."
                }, status=400)

            # School access check
            try:
                school = School.objects.get(id=school_id)
                if not teacher.assigned_schools.filter(id=school.id).exists():
                    return Response({"error": f"Not assigned to school {school_id}"}, status=403)
            except School.DoesNotExist:
                return Response({"error": f"Invalid school_id: {school_id}"}, status=400)

            # Duplicate check
            if LessonPlan.objects.filter(
                session_date=session_date,
                teacher=teacher,
                student_class=student_class,
                school=school
            ).exists():
                return Response({
                    "error": f"Duplicate lesson for {session_date}"
                }, status=400)

            # Build serializer data
            serializer_data = {
                'session_date': session_date,
                'student_class': student_class,
                'school': school_id,
                'teacher': teacher.id,
            }
            if planned_topic_ids:
                serializer_data['planned_topic_ids'] = planned_topic_ids
            elif planned_topic_id is not None:
                serializer_data['planned_topic_ids'] = [planned_topic_id]

            # Add custom text topic if provided
            if planned_topic:
                serializer_data['planned_topic'] = planned_topic

            serializer = LessonPlanSerializer(data=serializer_data)
            if serializer.is_valid():
                plan = serializer.save()
                created_plans.append(LessonPlanSerializer(plan).data)
            else:
                return Response(serializer.errors, status=400)

        return Response({
            "message": "Lesson plans created successfully!",
            "data": created_plans
        }, status=201)

    # CASE 2: Original format { school_id, student_class, lessons: [...] }
    else:
        school_id = data.get('school_id')
        student_class = data.get('student_class')
        lessons_data = data.get('lessons', [])

        if not all([school_id, student_class, lessons_data]):
            return Response({"error": "Missing required fields."}, status=400)

        try:
            school = School.objects.get(id=school_id)
            if not teacher.assigned_schools.filter(id=school.id).exists():
                return Response({"error": "You are not assigned to this school."}, status=403)
        except School.DoesNotExist:
            return Response({"error": "Invalid school ID."}, status=400)

        created_plans = []
        for lesson_data in lessons_data:
            session_date = lesson_data.get('session_date')
            planned_topic_ids = lesson_data.get('planned_topic_ids', [])
            planned_topic_id = lesson_data.get('planned_topic_id')
            planned_topic = lesson_data.get('planned_topic', '')  # Custom text topic

            if not session_date:
                return Response({"error": "session_date required."}, status=400)

            if LessonPlan.objects.filter(
                session_date=session_date,
                teacher=teacher,
                student_class=student_class,
                school=school
            ).exists():
                return Response({"error": f"Duplicate for {session_date}"}, status=400)

            serializer_data = {
                'session_date': session_date,
                'student_class': student_class,
                'school': school_id,
                'teacher': teacher.id,
            }
            if planned_topic_ids:
                serializer_data['planned_topic_ids'] = planned_topic_ids
            elif planned_topic_id is not None:
                serializer_data['planned_topic_ids'] = [planned_topic_id]

            # Add custom text topic if provided
            if planned_topic:
                serializer_data['planned_topic'] = planned_topic

            serializer = LessonPlanSerializer(data=serializer_data)
            if serializer.is_valid():
                plan = serializer.save()
                created_plans.append(LessonPlanSerializer(plan).data)
            else:
                return Response(serializer.errors, status=400)

        return Response({
            "message": "Lesson plans created successfully!",
            "data": created_plans
        }, status=201)
    
# views.py (replace the existing function)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_lesson_plan(request, session_date, school_id, student_class):
    """
    Fetch lesson plans for a specific date.
    If no lessons exist, return an empty list instead of 404.
    """
    try:
        logger.info(f"🔍 Fetching lessons for date: {session_date}, school: {school_id}, class: {student_class}")

        lessons = LessonPlan.objects.filter(
            session_date=session_date,
            school_id=school_id,
            student_class=student_class
        )

        if not lessons.exists():
            logger.warning(f"⚠️ No lessons found for {session_date}, school {school_id}, class {student_class}. Returning empty list.")
            return JsonResponse({"lessons": []}, safe=False, status=200)

        # CHANGED: Use serializer (outputs display_title for planned_topic)
        serializer = LessonPlanSerializer(lessons, many=True)
        return JsonResponse({"lessons": serializer.data}, safe=False, status=200)

    except Exception as e:
        logger.error(f"❌ Error fetching lessons: {str(e)}")
        return JsonResponse({"error": str(e)}, status=500)

@permission_classes([IsAuthenticated])
def update_achieved_topic(request, lesson_plan_id):
    """Allows teachers to update the achieved lesson topic"""
    teacher = request.user

    if teacher.role != 'Teacher':
        return Response({"error": "Only teachers can update achieved topics."}, status=403)

    try:
        lesson_plan = LessonPlan.objects.get(id=lesson_plan_id)

        if lesson_plan.teacher != teacher:
            return Response({"error": "You can only update your own lesson plans."}, status=403)

        achieved_topic = request.data.get('achieved_topic')
        if not achieved_topic:
            return Response({"error": "Achieved topic cannot be empty."}, status=400)

        lesson_plan.achieved_topic = achieved_topic
        lesson_plan.save()

        # CHANGED: Use serializer for response (includes display_title for planned_topic)
        return Response({"message": "Achieved topic updated successfully!", "data": LessonPlanSerializer(lesson_plan).data})

    except LessonPlan.DoesNotExist:
        return Response({"error": "Lesson plan not found."}, status=404)



@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_lesson_plan(request, lesson_plan_id):
    """Allows teachers to delete their own lesson plans"""
    teacher = request.user

    if teacher.role != 'Teacher':
        logger.warning(f"Unauthorized attempt to delete lesson plan by {teacher.username} (role: {teacher.role})")
        return Response({"error": "Only teachers can delete lesson plans."}, status=status.HTTP_403_FORBIDDEN)

    try:
        lesson_plan = LessonPlan.objects.get(id=lesson_plan_id)

        if lesson_plan.teacher != teacher:
            logger.warning(f"Teacher {teacher.username} attempted to delete lesson plan {lesson_plan_id} not assigned to them")
            return Response({"error": "You can only delete your own lesson plans."}, status=status.HTTP_403_FORBIDDEN)

        lesson_plan.delete()
        logger.info(f"Lesson plan {lesson_plan_id} deleted by {teacher.username}")

        return Response({"message": "Lesson plan deleted successfully"}, status=status.HTTP_204_NO_CONTENT)

    except LessonPlan.DoesNotExist:
        logger.error(f"Lesson plan {lesson_plan_id} not found")
        return Response({"error": "Lesson plan not found."}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Unexpected error deleting lesson plan {lesson_plan_id}: {str(e)}")
        return Response({"error": f"Failed to delete lesson plan: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_lessons_achieved(request):
    student_id = request.GET.get("student_id")
    start_date = request.GET.get("start_date")
    end_date = request.GET.get("end_date")

    if not student_id or not start_date or not end_date:
        return Response({"error": "student_id, start_date, and end_date are required"}, status=400)

    try:
        # 1️⃣ Fetch the student's class and school
        student = Student.objects.get(id=student_id)
        student_class = student.student_class
        student_school = student.school

        # 2️⃣ Fetch Planned Lessons from LessonPlan
        planned_lessons = LessonPlan.objects.filter(
            session_date__range=[start_date, end_date],
            school=student_school,
            student_class=student_class
        ).values("session_date", "planned_topic")

        # Convert planned lessons to dictionary {date: topic}
        planned_dict = {lesson["session_date"]: lesson["planned_topic"] for lesson in planned_lessons}

        # 3️⃣ Fetch Achieved Topics from Attendance (for this student)
        achieved_lessons = Attendance.objects.filter(
            session_date__range=[start_date, end_date],
            student=student
        ).values("session_date", "achieved_topic")

        # Convert achieved lessons to dictionary {date: topic}
        achieved_dict = {lesson["session_date"]: lesson["achieved_topic"] for lesson in achieved_lessons}

        # 4️⃣ Combine Planned & Achieved Topics by Date
        lessons = []
        for session_date in sorted(planned_dict.keys()):  # Ensure chronological order
            lessons.append({
                "date": session_date,
                "planned_topic": planned_dict[session_date],
                "achieved_topic": achieved_dict.get(session_date, "N/A")  # Default to "N/A" if missing
            })

        return Response({"lessons": lessons}, status=200)

    except Student.DoesNotExist:
        return Response({"error": "Student not found"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_lesson_plan_range(request):
    start_date = request.GET.get("start_date")
    end_date = request.GET.get("end_date")
    school_id = request.GET.get("school_id")
    student_class = request.GET.get("student_class")

    if not (start_date and end_date and school_id and student_class):
        return Response({"error": "Missing required parameters"}, status=400)

    # Fetch lessons for the given date range
    lessons = LessonPlan.objects.filter(
        session_date__range=[start_date, end_date],
        school_id=school_id,
        student_class=student_class
    ).order_by("session_date")

    serialized_data = LessonPlanSerializer(lessons, many=True)
    
    return Response(serialized_data.data)

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_planned_topic(request, lesson_plan_id):
    """Allows teachers to update the planned lesson topic"""
    teacher = request.user

    if teacher.role != 'Teacher':
        logger.warning(f"Unauthorized attempt to update lesson plan by {teacher.username} (role: {teacher.role})")
        return Response({"error": "Only teachers can update planned topics."}, status=status.HTTP_403_FORBIDDEN)

    try:
        lesson_plan = LessonPlan.objects.get(id=lesson_plan_id)

        if lesson_plan.teacher != teacher:
            logger.warning(f"Teacher {teacher.username} attempted to update lesson plan {lesson_plan_id} not assigned to them")
            return Response({"error": "You can only update your own lesson plans."}, status=status.HTTP_403_FORBIDDEN)

        planned_topic = request.data.get('planned_topic')
        if not planned_topic:
            logger.error(f"Empty planned_topic received for lesson plan {lesson_plan_id}")
            return Response({"error": "Planned topic cannot be empty."}, status=status.HTTP_400_BAD_REQUEST)

        lesson_plan.planned_topic = planned_topic
        lesson_plan.save()
        logger.info(f"Lesson plan {lesson_plan_id} updated by {teacher.username}: planned_topic={planned_topic}")

        return Response({
            "message": "Planned topic updated successfully!",
            "data": LessonPlanSerializer(lesson_plan).data
        }, status=status.HTTP_200_OK)

    except LessonPlan.DoesNotExist:
        logger.error(f"Lesson plan {lesson_plan_id} not found")
        return Response({"error": "Lesson plan not found."}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        logger.error(f"Unexpected error updating lesson plan {lesson_plan_id}: {str(e)}")
        return Response({"error": f"Failed to update lesson plan: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_create_lesson_plans(request):
    """Bulk create lesson plans (for multiple dates/topics)"""
    teacher = request.user

    if teacher.role != 'Teacher':
        return Response({"error": "Only teachers can create lesson plans."}, status=403)

    school_id = request.data.get('school_id')
    student_class = request.data.get('student_class')
    lessons = request.data.get('lessons', [])  # List of {'session_date': date, 'planned_topic_id': id (nullable)}

    if not school_id or not student_class or not lessons:
        return Response({"error": "School ID, class, and lessons list required."}, status=400)

    try:
        school = School.objects.get(id=school_id)
        if not teacher.assigned_schools.filter(id=school.id).exists():
            return Response({"error": "You are not assigned to this school."}, status=403)

        created = []
        for lesson_data in lessons:
            serializer = LessonPlanSerializer(data={
                'session_date': lesson_data.get('session_date'),
                'student_class': student_class,
                'planned_topic_id': lesson_data.get('planned_topic_id'),
                'school': school_id,
                'teacher': teacher.id,
            })
            if serializer.is_valid():
                plan = serializer.save()
                created.append(LessonPlanSerializer(plan).data)
            else:
                return Response(serializer.errors, status=400)

        return Response({"message": "Lesson plans created successfully!", "data": created}, status=200)

    except School.DoesNotExist:
        return Response({"error": "Invalid school ID."}, status=400)
    except IntegrityError:
        return Response({"error": "Duplicate lesson plan detected."}, status=400)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_online_lesson_plan(request):
    teacher = request.user
    if teacher.role != 'Teacher':
        return Response({"error": "Only teachers can create online lesson plans."}, status=403)

    school_id = request.data.get('school') or request.data.get('school_id')
    time_slot_id = request.data.get('time_slot') or request.data.get('time_slot_id')
    session_date = request.data.get('session_date')

    if not all([school_id, time_slot_id, session_date]):
        return Response({"error": "school_id, time_slot_id, and session_date are required."}, status=400)

    if not teacher.assigned_schools.filter(id=school_id).exists():
        return Response({"error": "You are not assigned to this school."}, status=403)

    if OnlineTimeSlotLessonPlan.objects.filter(
        session_date=session_date,
        teacher=teacher,
        school_id=school_id,
        time_slot_id=time_slot_id,
    ).exists():
        return Response({"error": "Duplicate online lesson plan for this date and time slot."}, status=400)

    serializer = OnlineTimeSlotLessonPlanSerializer(data={
        **request.data,
        'school': school_id,
        'time_slot': time_slot_id,
        'teacher': teacher.id,
    })
    if serializer.is_valid():
        instance = serializer.save()
        return Response(OnlineTimeSlotLessonPlanSerializer(instance).data, status=201)
    return Response(serializer.errors, status=400)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_create_online_lesson_plans(request):
    """
    Bulk create ONLINE lesson plans (time-slot based) in one request.

    Request body can be either:
    1) { "lessons": [ {school_id, time_slot_id, session_date, planned_topic_ids?, planned_topic?}, ... ] }
    2) [ {school_id, time_slot_id, session_date, planned_topic_ids?, planned_topic?}, ... ]
    """
    teacher = request.user
    if teacher.role != 'Teacher':
        return Response({"error": "Only teachers can create online lesson plans."}, status=403)

    payload = request.data.get('lessons') if isinstance(request.data, dict) else request.data
    if not isinstance(payload, list) or not payload:
        return Response({"error": "A non-empty lessons list is required."}, status=400)

    created = []
    seen = set()

    for idx, lesson in enumerate(payload):
        school_id = lesson.get('school') or lesson.get('school_id')
        time_slot_id = lesson.get('time_slot') or lesson.get('time_slot_id')
        session_date = lesson.get('session_date')

        if not all([school_id, time_slot_id, session_date]):
            return Response({
                "error": f"Missing required fields at index {idx}. school_id, time_slot_id, and session_date are required."
            }, status=400)

        if not teacher.assigned_schools.filter(id=school_id).exists():
            return Response({"error": f"You are not assigned to school {school_id}."}, status=403)

        key = (str(school_id), str(time_slot_id), str(session_date))
        if key in seen:
            return Response({"error": f"Duplicate lesson in payload for school={school_id}, slot={time_slot_id}, date={session_date}."}, status=400)
        seen.add(key)

        if OnlineTimeSlotLessonPlan.objects.filter(
            session_date=session_date,
            teacher=teacher,
            school_id=school_id,
            time_slot_id=time_slot_id,
        ).exists():
            return Response({
                "error": f"Duplicate online lesson plan for school={school_id}, slot={time_slot_id}, date={session_date}."
            }, status=400)

        serializer = OnlineTimeSlotLessonPlanSerializer(data={
            **lesson,
            'school': school_id,
            'time_slot': time_slot_id,
            'teacher': teacher.id,
        })
        if serializer.is_valid():
            instance = serializer.save()
            created.append(OnlineTimeSlotLessonPlanSerializer(instance).data)
        else:
            return Response({"index": idx, "errors": serializer.errors}, status=400)

    return Response({
        "message": "Online lesson plans created successfully!",
        "count": len(created),
        "data": created,
    }, status=201)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_online_lesson_plan(request):
    session_date = request.GET.get('session_date')
    school_id = request.GET.get('school_id')
    time_slot_id = request.GET.get('time_slot_id')

    if not all([session_date, school_id, time_slot_id]):
        return Response({"error": "session_date, school_id, and time_slot_id are required."}, status=400)

    lessons = OnlineTimeSlotLessonPlan.objects.filter(
        session_date=session_date,
        school_id=school_id,
        time_slot_id=time_slot_id,
    ).order_by('-id')

    return Response({'lessons': OnlineTimeSlotLessonPlanSerializer(lessons, many=True).data}, status=200)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_online_lesson_plan_range(request):
    start_date = request.GET.get('start_date')
    end_date = request.GET.get('end_date')
    school_id = request.GET.get('school_id')
    time_slot_id = request.GET.get('time_slot_id')

    if not (start_date and end_date and school_id):
        return Response({"error": "start_date, end_date, and school_id are required."}, status=400)

    queryset = OnlineTimeSlotLessonPlan.objects.filter(
        session_date__range=[start_date, end_date],
        school_id=school_id,
    )
    if time_slot_id:
        queryset = queryset.filter(time_slot_id=time_slot_id)

    lessons = queryset.order_by('session_date', 'time_slot_id')
    return Response(OnlineTimeSlotLessonPlanSerializer(lessons, many=True).data, status=200)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_online_planned_topic(request, lesson_plan_id):
    teacher = request.user
    if teacher.role != 'Teacher':
        return Response({"error": "Only teachers can update online planned topics."}, status=403)

    try:
        lesson_plan = OnlineTimeSlotLessonPlan.objects.get(id=lesson_plan_id)
    except OnlineTimeSlotLessonPlan.DoesNotExist:
        return Response({"error": "Online lesson plan not found."}, status=404)

    if lesson_plan.teacher != teacher:
        return Response({"error": "You can only update your own online lesson plans."}, status=403)

    planned_topic = request.data.get('planned_topic')
    if planned_topic is None or not str(planned_topic).strip():
        return Response({"error": "Planned topic cannot be empty."}, status=400)

    lesson_plan.planned_topic = str(planned_topic).strip()
    lesson_plan.save(update_fields=['planned_topic'])
    return Response({
        "message": "Online planned topic updated successfully!",
        "data": OnlineTimeSlotLessonPlanSerializer(lesson_plan).data,
    }, status=200)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_online_lesson_plan(request, lesson_plan_id):
    teacher = request.user
    if teacher.role != 'Teacher':
        return Response({"error": "Only teachers can delete online lesson plans."}, status=403)

    try:
        lesson_plan = OnlineTimeSlotLessonPlan.objects.get(id=lesson_plan_id)
    except OnlineTimeSlotLessonPlan.DoesNotExist:
        return Response({"error": "Online lesson plan not found."}, status=404)

    if lesson_plan.teacher != teacher:
        return Response({"error": "You can only delete your own online lesson plans."}, status=403)

    lesson_plan.delete()
    return Response({"message": "Online lesson plan deleted successfully"}, status=204)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_lesson_suggestion(request):
    """
    Return one best-effort suggestion for class title/description.
    ONSITE path: session_date + school_id + student_class
    ONLINE path: session_date + school_id + time_slot_id
    """
    session_date = request.GET.get('session_date')
    school_id = request.GET.get('school_id')
    student_class = request.GET.get('student_class')
    time_slot_id = request.GET.get('time_slot_id')

    if not session_date or not school_id:
        return Response({"error": "session_date and school_id are required."}, status=400)

    if not request.user.assigned_schools.filter(id=school_id).exists():
        return Response({"error": "You are not assigned to this school."}, status=403)

    if time_slot_id:
        online_lesson = OnlineTimeSlotLessonPlan.objects.filter(
            session_date=session_date,
            school_id=school_id,
            time_slot_id=time_slot_id,
        ).order_by('-id').first()
        if online_lesson:
            return Response({'suggestion': _lesson_to_suggestion(online_lesson, 'ONLINE_TIMESLOT')}, status=200)

    if student_class:
        onsite_lesson = LessonPlan.objects.filter(
            session_date=session_date,
            school_id=school_id,
            student_class=student_class,
        ).order_by('-id').first()
        if onsite_lesson:
            return Response({'suggestion': _lesson_to_suggestion(onsite_lesson, 'ONSITE_CLASS')}, status=200)

    return Response({'suggestion': None}, status=200)

