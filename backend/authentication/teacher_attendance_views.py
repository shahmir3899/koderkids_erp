"""
Teacher Attendance API Endpoints
"""
import logging
from datetime import datetime, timedelta
from django.utils import timezone
from django.db.models import Count, Q
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from students.models import TeacherAttendance, LessonPlan, CustomUser, School
from .attendance_service import get_teacher_attendance_summary

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_attendance(request):
    """
    Get current teacher's attendance records.

    Query params:
        - month: Month number (1-12), defaults to current
        - year: Year, defaults to current
        - school_id: Filter by specific school (optional)
    """
    user = request.user

    if user.role != 'Teacher':
        return Response({'error': 'Only teachers can view their attendance'}, status=403)

    # Get query params
    today = timezone.now().date()
    month = request.GET.get('month', today.month)
    year = request.GET.get('year', today.year)
    school_id = request.GET.get('school_id')

    try:
        month = int(month)
        year = int(year)
    except ValueError:
        return Response({'error': 'Invalid month or year'}, status=400)

    # Get attendance records
    filters = {
        'teacher': user,
        'date__year': year,
        'date__month': month,
    }
    if school_id:
        filters['school_id'] = school_id

    records = TeacherAttendance.objects.filter(**filters).select_related('school').order_by('-date')

    # Get summary
    summary = get_teacher_attendance_summary(user, month, year)

    # Format records
    attendance_list = [{
        'id': r.id,
        'date': r.date.isoformat(),
        'school_id': r.school.id,
        'school_name': r.school.name,
        'status': r.status,
        'login_time': r.login_time.isoformat() if r.login_time else None,
        'distance': float(r.distance_from_school) if r.distance_from_school else None,
    } for r in records]

    return Response({
        'records': attendance_list,
        'summary': summary,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_attendance_calendar(request):
    """
    Get teacher's attendance in calendar format for a month.
    Returns data structured for calendar display.

    Query params:
        - month: Month number (1-12)
        - year: Year
        - school_id: Filter by school (optional)
    """
    user = request.user

    if user.role != 'Teacher':
        return Response({'error': 'Only teachers can view their attendance'}, status=403)

    today = timezone.now().date()
    month = int(request.GET.get('month', today.month))
    year = int(request.GET.get('year', today.year))
    school_id = request.GET.get('school_id')

    # Get all working days (days with lesson plans) for the month
    working_days_filter = {
        'session_date__year': year,
        'session_date__month': month,
        'school__in': user.assigned_schools.all()
    }
    if school_id:
        working_days_filter['school_id'] = school_id

    working_days = LessonPlan.objects.filter(
        **working_days_filter
    ).values('session_date', 'school_id', 'school__name').distinct()

    # Get attendance records
    attendance_filter = {
        'teacher': user,
        'date__year': year,
        'date__month': month,
    }
    if school_id:
        attendance_filter['school_id'] = school_id

    attendance_records = TeacherAttendance.objects.filter(
        **attendance_filter
    ).values('date', 'school_id', 'status')

    # Create attendance lookup
    attendance_lookup = {
        (r['date'], r['school_id']): r['status']
        for r in attendance_records
    }

    # Build calendar data
    calendar_data = []
    for wd in working_days:
        date = wd['session_date']
        school_id_val = wd['school_id']
        status_val = attendance_lookup.get((date, school_id_val), 'absent')

        calendar_data.append({
            'date': date.isoformat(),
            'school_id': school_id_val,
            'school_name': wd['school__name'],
            'status': status_val,
            'is_working_day': True,
        })

    return Response({
        'month': month,
        'year': year,
        'calendar': calendar_data,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_admin_teacher_attendance(request):
    """
    Admin view: Get attendance overview for all teachers.

    Query params:
        - month: Month number (1-12)
        - year: Year
        - school_id: Filter by school (optional)
    """
    user = request.user

    if user.role != 'Admin':
        return Response({'error': 'Only admins can view all teacher attendance'}, status=403)

    today = timezone.now().date()
    month = int(request.GET.get('month', today.month))
    year = int(request.GET.get('year', today.year))
    school_id = request.GET.get('school_id')

    # Get all teachers
    teachers = CustomUser.objects.filter(role='Teacher', is_active=True)

    if school_id:
        teachers = teachers.filter(assigned_schools__id=school_id)

    teachers = teachers.distinct()

    result = []
    for teacher in teachers:
        # Get schools for this teacher
        schools = teacher.assigned_schools.filter(is_active=True)
        if school_id:
            schools = schools.filter(id=school_id)

        for school in schools:
            # Total working days
            total_working_days = LessonPlan.objects.filter(
                school=school,
                session_date__year=year,
                session_date__month=month
            ).values('session_date').distinct().count()

            # Attendance counts
            attendance_counts = TeacherAttendance.objects.filter(
                teacher=teacher,
                school=school,
                date__year=year,
                date__month=month
            ).values('status').annotate(count=Count('status'))

            counts = {item['status']: item['count'] for item in attendance_counts}
            present = counts.get('present', 0)
            out_of_range = counts.get('out_of_range', 0)
            location_unavailable = counts.get('location_unavailable', 0)

            attendance_rate = 0
            if total_working_days > 0:
                attendance_rate = round((present / total_working_days) * 100, 1)

            result.append({
                'teacher_id': teacher.id,
                'teacher_name': teacher.username,
                'school_id': school.id,
                'school_name': school.name,
                'total_working_days': total_working_days,
                'present_days': present,
                'out_of_range_days': out_of_range,
                'location_unavailable_days': location_unavailable,
                'absent_days': total_working_days - (present + out_of_range + location_unavailable),
                'attendance_rate': attendance_rate,
            })

    # Sort by attendance rate (lowest first so admin can focus on issues)
    result.sort(key=lambda x: x['attendance_rate'])

    return Response({
        'month': month,
        'year': year,
        'teachers': result,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_teacher_attendance_detail(request, teacher_id):
    """
    Admin view: Get detailed attendance for a specific teacher.

    Query params:
        - month: Month number (1-12)
        - year: Year
        - school_id: Filter by school (optional)
    """
    user = request.user

    if user.role != 'Admin':
        return Response({'error': 'Only admins can view teacher attendance details'}, status=403)

    try:
        teacher = CustomUser.objects.get(id=teacher_id, role='Teacher')
    except CustomUser.DoesNotExist:
        return Response({'error': 'Teacher not found'}, status=404)

    today = timezone.now().date()
    month = int(request.GET.get('month', today.month))
    year = int(request.GET.get('year', today.year))
    school_id = request.GET.get('school_id')

    # Get attendance records
    filters = {
        'teacher': teacher,
        'date__year': year,
        'date__month': month,
    }
    if school_id:
        filters['school_id'] = school_id

    records = TeacherAttendance.objects.filter(**filters).select_related('school').order_by('-date')

    attendance_list = [{
        'id': r.id,
        'date': r.date.isoformat(),
        'school_id': r.school.id,
        'school_name': r.school.name,
        'status': r.status,
        'login_time': r.login_time.isoformat() if r.login_time else None,
        'latitude': float(r.login_latitude) if r.login_latitude else None,
        'longitude': float(r.login_longitude) if r.login_longitude else None,
        'distance': float(r.distance_from_school) if r.distance_from_school else None,
    } for r in records]

    # Get summary
    summary = get_teacher_attendance_summary(teacher, month, year)

    return Response({
        'teacher_id': teacher.id,
        'teacher_name': teacher.username,
        'month': month,
        'year': year,
        'records': attendance_list,
        'summary': summary,
    })
