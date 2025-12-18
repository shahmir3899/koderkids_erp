from django.shortcuts import render
from students.models import Student, Attendance, LessonPlan, School
from students.serializers import AttendanceSerializer
from django.http import JsonResponse
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db import IntegrityError
from datetime import datetime, timedelta
from django.db.models import Count, Sum, Q, Case, When, IntegerField

import logging

logger = logging.getLogger(__name__)





# Create your views here.
@api_view(['POST'])  # ✅ Only allow attendance submission
@permission_classes([IsAuthenticated])
def submit_attendance(request):
    user = request.user
    if user.role != "Teacher":
        return Response({"error": "Unauthorized"}, status=403)

    attendance_data = request.data.get("attendance", [])
    
    for entry in attendance_data:
        student_id = entry.get("student_id")
        status = entry.get("status")  # "Present" or "Absent"
        date = entry.get("date")

        student = Student.objects.filter(id=student_id, school__in=user.assigned_schools.all()).first()
        if not student:
            return Response({"error": f"Unauthorized for student ID {student_id}"}, status=403)

        Attendance.objects.update_or_create(
            student=student, date=date,
            defaults={"status": status}
        )

    return Response({"message": "Attendance recorded successfully!"})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_attendance(request):
    """Allows teachers to mark attendance for active students and update achieved topics"""
    teacher = request.user

    if teacher.role != 'Teacher':
        return Response({"error": "Only teachers can mark attendance."}, status=403)

    session_date = request.data.get('session_date')
    attendance_records = request.data.get('attendance', [])

    if not session_date or not attendance_records:
        return Response({"error": "Invalid data provided."}, status=400)

    created_entries = []
    for record in attendance_records:
        student_id = record.get('student_id')
        status = record.get('status', "N/A")
        achieved_topic = record.get('achieved_topic', "")

        try:
            student = Student.objects.get(id=student_id, status="Active")  # Only active students

            # Fetch the correct lesson plan for this student
            lesson_plan = LessonPlan.objects.filter(
                session_date=session_date,
                student_class=student.student_class,
                school_id=student.school_id
            ).first()

            # Update the lesson plan's achieved_topic if it exists
            if lesson_plan and achieved_topic:
                lesson_plan.achieved_topic = achieved_topic
                lesson_plan.save()

            attendance, created = Attendance.objects.update_or_create(
                student=student, session_date=session_date,
                defaults={
                    "status": status,
                    "teacher": teacher,
                    "achieved_topic": achieved_topic,
                    "lesson_plan": lesson_plan if lesson_plan else None
                }
            )
            created_entries.append(attendance)

        except Student.DoesNotExist:
            return Response({"error": f"Student ID {student_id} not found or not active."}, status=400)
        except IntegrityError:
            return Response({"error": "Duplicate attendance record detected."}, status=400)

    return Response({"message": "Attendance recorded successfully!", "data": AttendanceSerializer(created_entries, many=True).data})

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def get_attendance(request, session_date):
    """Retrieve attendance records for a given session date"""
    attendance_records = Attendance.objects.filter(session_date=session_date)
    
    if not attendance_records.exists():
        return Response({"message": "No attendance records found for this date."}, status=200)

    serializer = AttendanceSerializer(attendance_records, many=True)
    return Response(serializer.data)

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_attendance(request, attendance_id):
    """Allows admins and teachers to edit attendance records"""
    user = request.user

    if user.role not in ['Admin', 'Teacher']:
        return Response({"error": "Only admins and teachers can edit attendance."}, status=403)

    try:
        attendance = Attendance.objects.get(id=attendance_id)

        # ✅ Teachers can only update their own records
        if user.role == 'Teacher' and attendance.teacher != user:
            return Response({"error": "You can only update attendance records you created."}, status=403)

        new_status = request.data.get('status')
        achieved_topic = request.data.get('achieved_topic')
        lesson_plan_id = request.data.get('lesson_plan_id')  # ✅ Get lesson plan from request

        if new_status not in ['Present', 'Absent', 'N/A']:
            return Response({"error": "Invalid status."}, status=400)

        # ✅ If lesson_plan_id is missing, fetch it from the database
        if not lesson_plan_id:
            lesson_plan = LessonPlan.objects.filter(
                session_date=attendance.session_date,
                student_class=attendance.student.student_class,
                school_id=attendance.student.school_id
            ).first()
            lesson_plan_id = lesson_plan.id if lesson_plan else None

        attendance.status = new_status
        attendance.achieved_topic = achieved_topic
        attendance.lesson_plan_id = lesson_plan_id  # ✅ Ensure lesson_plan_id is stored
        attendance.save()

        return Response({"message": "Attendance updated successfully!", "data": AttendanceSerializer(attendance).data})

    except Attendance.DoesNotExist:
        return Response({"error": "Attendance record not found."}, status=404)

@permission_classes([IsAuthenticated])
def get_attendance_count(request):
    student_id = request.GET.get('student_id')
    start_date = request.GET.get('start_date')
    end_date = request.GET.get('end_date')

    if not student_id or not start_date or not end_date:
        return JsonResponse({"error": "student_id, start_date, and end_date are required"}, status=400)

    try:
        # Fetch the student's school
        student = Student.objects.get(id=student_id)
        school = student.school

        # Total days in the range for the student's school
        total_days = Attendance.objects.filter(
            session_date__range=[start_date, end_date],
            student__school=school  # Filter by the student's school
        ).values('session_date').distinct().count()

        # Days student was marked as "Present"
        present_days = Attendance.objects.filter(
            student_id=student_id,
            status="Present",
            session_date__range=[start_date, end_date]
        ).count()

        return JsonResponse({"present_days": present_days, "total_days": total_days})

    except Student.DoesNotExist:
        return JsonResponse({"error": "Student not found"}, status=404)
    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_attendance_counts(request):
    """
    Fetch attendance counts (Present, Absent, Not Marked) for students in a given month, school, and class.
    Parameters: month (YYYY-MM), school_id, student_class
    """
    user = request.user
    month = request.GET.get('month')  # Format: YYYY-MM
    school_id = request.GET.get('school_id')
    student_class = request.GET.get('student_class')

    # Validate parameters
    if not all([month, school_id, student_class]):
        return Response({"error": "month, school_id, and student_class are required"}, status=400)

    try:
        # Parse month to get date range
        year, month_num = map(int, month.split('-'))
        start_date = datetime(year, month_num, 1).date()
        end_date = (datetime(year, month_num + 1, 1) - timedelta(days=1)).date() if month_num < 12 else datetime(year, 12, 31).date()

        # Filter students by school and class
        students = Student.objects.filter(
            school_id=school_id,
            student_class=student_class,
            status="Active"
        )

        # Restrict to teacher's assigned schools if role is Teacher
        if user.role == "Teacher":
            assigned_schools = user.assigned_schools.values_list("id", flat=True)
            if int(school_id) not in assigned_schools:
                return Response({"error": "Unauthorized access to this school"}, status=403)

        # Fetch attendance records for the month
        attendance_records = Attendance.objects.filter(
            student__in=students,
            session_date__range=[start_date, end_date]
        ).values('student_id', 'status').annotate(count=Count('id'))

        # Prepare response data
        student_data = []
        for student in students:
            student_attendance = {entry['status']: entry['count'] for entry in attendance_records if entry['student_id'] == student.id}
            student_data.append({
                "student_id": student.id,
                "name": student.name,
                "present": student_attendance.get("Present", 0),
                "absent": student_attendance.get("Absent", 0),
                "not_marked": student_attendance.get("N/A", 0)
            })

        return Response(student_data, status=200)

    except ValueError:
        return Response({"error": "Invalid month format. Use YYYY-MM (e.g., 2025-03)"}, status=400)
    except Exception as e:
        logger.error(f"Error in get_student_attendance_counts: {str(e)}")
        return Response({"error": str(e)}, status=500)

