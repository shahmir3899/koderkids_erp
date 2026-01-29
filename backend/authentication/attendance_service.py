"""
Teacher Attendance Service - Auto-marks attendance on login.
"""
import logging
from django.utils import timezone
from django.db import IntegrityError

from students.models import TeacherAttendance, LessonPlan, School
from .geo_utils import is_within_geofence, GEOFENCE_RADIUS_METERS

logger = logging.getLogger(__name__)


def mark_teacher_attendance(user, latitude=None, longitude=None):
    """
    Automatically mark teacher attendance on login.

    NEW Logic (Single School per Day):
    1. Only for users with role='Teacher'
    2. One attendance record per teacher per day (not per school)
    3. Determine the correct school for today using:
       a) assigned_days field on School model (primary)
       b) Fall back to LessonPlan if no assigned_days set
    4. Checks location against that school's geofence (200m)

    Update Rules (for existing records):
    - If status is 'location_unavailable' and new login has location: UPDATE
    - If status is 'out_of_range' and new login is within range: UPDATE to 'present'
    - Otherwise: Keep existing record unchanged

    Args:
        user: CustomUser instance (the logged-in teacher)
        latitude: Teacher's latitude at login (optional)
        longitude: Teacher's longitude at login (optional)

    Returns:
        dict: {
            'attendance_marked': bool,
            'records': list of created/existing records,
            'message': str
        }
    """
    # Only process teachers
    if user.role != 'Teacher':
        return {
            'attendance_marked': False,
            'records': [],
            'message': 'Not a teacher'
        }

    today = timezone.now().date()
    today_weekday = today.weekday()  # Monday=0, Sunday=6
    records = []

    # Get all active assigned schools
    assigned_schools = user.assigned_schools.filter(is_active=True)

    if not assigned_schools.exists():
        return {
            'attendance_marked': False,
            'records': [],
            'message': 'No assigned schools'
        }

    # Step 1: Find the ONE school for today
    # Priority: assigned_days field, then fall back to LessonPlan
    target_school = None

    # Check schools with assigned_days that include today
    schools_with_today = [
        school for school in assigned_schools
        if school.assigned_days and today_weekday in school.assigned_days
    ]

    if len(schools_with_today) == 1:
        # Exactly one school has today as assigned day
        target_school = schools_with_today[0]
        logger.info(f"School determined by assigned_days: {target_school.name}")
    elif len(schools_with_today) > 1:
        # Multiple schools have today - use location to determine
        if latitude is not None and longitude is not None:
            for school in schools_with_today:
                if school.latitude and school.longitude:
                    is_within, _ = is_within_geofence(
                        latitude, longitude,
                        school.latitude, school.longitude,
                        GEOFENCE_RADIUS_METERS
                    )
                    if is_within:
                        target_school = school
                        logger.info(f"School determined by location (multiple assigned): {target_school.name}")
                        break
        # If still no match, use the first one
        if not target_school:
            target_school = schools_with_today[0]
            logger.warning(f"Multiple schools for today, using first: {target_school.name}")
    else:
        # No schools have assigned_days set - fall back to LessonPlan
        schools_with_lessons = [
            school for school in assigned_schools
            if LessonPlan.objects.filter(school=school, session_date=today).exists()
        ]

        if len(schools_with_lessons) == 1:
            target_school = schools_with_lessons[0]
            logger.info(f"School determined by LessonPlan (no assigned_days): {target_school.name}")
        elif len(schools_with_lessons) > 1:
            # Multiple schools have lessons today - use location
            if latitude is not None and longitude is not None:
                for school in schools_with_lessons:
                    if school.latitude and school.longitude:
                        is_within, _ = is_within_geofence(
                            latitude, longitude,
                            school.latitude, school.longitude,
                            GEOFENCE_RADIUS_METERS
                        )
                        if is_within:
                            target_school = school
                            logger.info(f"School determined by location (multiple lessons): {target_school.name}")
                            break
            if not target_school:
                target_school = schools_with_lessons[0]
                logger.warning(f"Multiple schools with lessons today, using first: {target_school.name}")

    # No school found for today
    if not target_school:
        logger.debug(f"No school scheduled for {user.username} today")
        return {
            'attendance_marked': False,
            'records': [],
            'message': 'No school scheduled for today'
        }

    # Step 2: Check if attendance already exists for today (any school)
    existing = TeacherAttendance.objects.filter(
        teacher=user,
        date=today
    ).first()

    if existing:
        should_update = False
        new_status = existing.status
        new_distance = existing.distance_from_school
        update_school = existing.school

        # FIRST: Check if the school is WRONG (recorded for different school than today's target)
        # This can happen if old logic created record before assigned_days was implemented
        school_is_wrong = existing.school.id != target_school.id

        if school_is_wrong:
            # Correct the school to today's target school
            should_update = True
            update_school = target_school
            logger.info(f"Correcting school: {user.username} - was {existing.school.name}, should be {target_school.name}")

            # Recalculate status based on location against the CORRECT school
            if latitude is not None and longitude is not None:
                if target_school.latitude and target_school.longitude:
                    is_within, distance = is_within_geofence(
                        latitude, longitude,
                        target_school.latitude, target_school.longitude,
                        GEOFENCE_RADIUS_METERS
                    )
                    new_status = 'present' if is_within else 'out_of_range'
                    new_distance = distance
                else:
                    # Target school has no location - mark present
                    new_status = 'present'
                    new_distance = None
            else:
                # No location data - keep as location_unavailable or recalculate
                new_status = 'location_unavailable'
                new_distance = None

        # SECOND: Check if we can improve status with new location data (same school)
        elif latitude is not None and longitude is not None:
            if target_school.latitude and target_school.longitude:
                is_within, distance = is_within_geofence(
                    latitude, longitude,
                    target_school.latitude, target_school.longitude,
                    GEOFENCE_RADIUS_METERS
                )

                if existing.status == 'location_unavailable':
                    # Previously had no location, now we do
                    should_update = True
                    new_status = 'present' if is_within else 'out_of_range'
                    new_distance = distance
                    update_school = target_school
                    logger.info(f"Updating attendance: {user.username} - had no location, now at {target_school.name}")

                elif existing.status == 'out_of_range' and is_within:
                    # Previously out of range, now within range
                    should_update = True
                    new_status = 'present'
                    new_distance = distance
                    update_school = target_school
                    logger.info(f"Updating attendance: {user.username} - now within range at {target_school.name}")

        if should_update:
            existing.status = new_status
            existing.school = update_school
            existing.login_latitude = latitude
            existing.login_longitude = longitude
            existing.distance_from_school = new_distance
            existing.save(update_fields=['status', 'school', 'login_latitude', 'login_longitude', 'distance_from_school', 'updated_at'])

            records.append({
                'school_id': update_school.id,
                'school_name': update_school.name,
                'status': new_status,
                'already_marked': True,
                'updated': True,
                'login_time': existing.login_time.isoformat(),
                'distance': float(new_distance) if new_distance else None,
            })
            return {
                'attendance_marked': False,
                'records': records,
                'message': 'Attendance updated'
            }

        # No update needed - return existing record info
        logger.debug(f"Attendance already exists for {user.username} today")
        records.append({
            'school_id': existing.school.id,
            'school_name': existing.school.name,
            'status': existing.status,
            'already_marked': True,
            'updated': False,
            'login_time': existing.login_time.isoformat(),
        })
        return {
            'attendance_marked': False,
            'records': records,
            'message': 'Attendance already marked for today'
        }

    # Step 3: Create new attendance record
    status = 'location_unavailable'
    distance = None

    if latitude is not None and longitude is not None:
        if target_school.latitude and target_school.longitude:
            is_within, distance = is_within_geofence(
                latitude, longitude,
                target_school.latitude, target_school.longitude,
                GEOFENCE_RADIUS_METERS
            )
            status = 'present' if is_within else 'out_of_range'
        else:
            # School has no location - mark present (can't verify)
            logger.warning(f"School {target_school.name} has no location data. Marking as present.")
            status = 'present'

    try:
        attendance = TeacherAttendance.objects.create(
            teacher=user,
            school=target_school,
            date=today,
            status=status,
            login_latitude=latitude,
            login_longitude=longitude,
            distance_from_school=distance
        )
        records.append({
            'school_id': target_school.id,
            'school_name': target_school.name,
            'status': status,
            'already_marked': False,
            'login_time': attendance.login_time.isoformat(),
            'distance': float(distance) if distance else None,
        })
        logger.info(f"Attendance marked: {user.username} at {target_school.name} - {status}")

        return {
            'attendance_marked': True,
            'records': records,
            'message': f'Attendance marked at {target_school.name}'
        }

    except IntegrityError:
        # Race condition - record was created between check and create
        logger.warning(f"Race condition: attendance already exists for {user.username}")
        existing = TeacherAttendance.objects.filter(teacher=user, date=today).first()
        if existing:
            records.append({
                'school_id': existing.school.id,
                'school_name': existing.school.name,
                'status': existing.status,
                'already_marked': True,
                'login_time': existing.login_time.isoformat(),
            })
        return {
            'attendance_marked': False,
            'records': records,
            'message': 'Attendance already marked'
        }


def get_teacher_attendance_summary(user, month=None, year=None):
    """
    Get attendance summary for a teacher.

    Args:
        user: CustomUser instance
        month: Month number (1-12), defaults to current month
        year: Year, defaults to current year

    Returns:
        dict with attendance statistics per school
    """
    if user.role != 'Teacher':
        return {'error': 'Not a teacher'}

    today = timezone.now().date()
    month = month or today.month
    year = year or today.year

    summary = []
    assigned_schools = user.assigned_schools.filter(is_active=True)

    for school in assigned_schools:
        # Count total working days (days with lesson plans)
        total_working_days = LessonPlan.objects.filter(
            school=school,
            session_date__year=year,
            session_date__month=month
        ).values('session_date').distinct().count()

        # Count present days
        present_days = TeacherAttendance.objects.filter(
            teacher=user,
            school=school,
            date__year=year,
            date__month=month,
            status='present'
        ).count()

        # Count out of range days
        out_of_range_days = TeacherAttendance.objects.filter(
            teacher=user,
            school=school,
            date__year=year,
            date__month=month,
            status='out_of_range'
        ).count()

        # Count location unavailable days
        location_unavailable_days = TeacherAttendance.objects.filter(
            teacher=user,
            school=school,
            date__year=year,
            date__month=month,
            status='location_unavailable'
        ).count()

        # Calculate attendance percentage (present + out_of_range counts as attended)
        attendance_rate = 0
        if total_working_days > 0:
            attendance_rate = round(((present_days + out_of_range_days) / total_working_days) * 100, 1)

        summary.append({
            'school_id': school.id,
            'school_name': school.name,
            'total_working_days': total_working_days,
            'present_days': present_days,
            'out_of_range_days': out_of_range_days,
            'location_unavailable_days': location_unavailable_days,
            'absent_days': total_working_days - (present_days + out_of_range_days + location_unavailable_days),
            'attendance_rate': attendance_rate,
        })

    return {
        'month': month,
        'year': year,
        'schools': summary
    }
