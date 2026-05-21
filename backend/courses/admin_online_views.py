# courses/admin_online_views.py
"""
Admin views for managing online student course assignments.
Only accessible to Admin role users.
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Prefetch, Count

from students.models import Student
from students.subtypes import StudentSubtype
from books.models import Book
from .models import CourseEnrollment
from .serializers import AdminOnlineStudentProfileSerializer


# =============================================
# Permissions
# =============================================

class IsAdmin(IsAuthenticated):
    """Only Admin users can access online student management."""
    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        return request.user.role == 'Admin'


# =============================================
# Admin Online Student Management Views
# =============================================

@api_view(['GET'])
@permission_classes([IsAdmin])
def list_online_students(request):
    """
    List all ONLINE subtype students with their course enrollments.
    
    GET /api/admin/online-students/
    
    Response:
    [
        {
            "id": 1,
            "name": "John Doe",
            "email": "john@example.com",
            "student_subtype": "ONLINE",
            "enrollment_count": 3,
            "enrollments": [
                {
                    "id": 1,
                    "course_id": 5,
                    "course_title": "Python Basics",
                    "status": "active",
                    "enrolled_at": "2026-05-18T10:00:00Z",
                    "progress_percentage": 45
                }
            ]
        }
    ]
    """
    # Get all ONLINE students
    students = Student.objects.filter(
        student_subtype=StudentSubtype.ONLINE
    ).select_related('user', 'school').prefetch_related(
        Prefetch(
            'course_enrollments',
            CourseEnrollment.objects.select_related('course').order_by('-last_accessed_at')
        )
    )

    data = []
    for student in students:
        enrollments = list(student.course_enrollments.all())
        
        student_data = {
            'id': student.id,
            'name': student.name,
            'email': student.user.email if student.user else None,
            'student_subtype': student.student_subtype,
            'school_id': student.school_id,
            'school_name': student.school.name if student.school else 'No School',
            'enrollment_count': len(enrollments),
            'enrollments': []
        }

        for enrollment in enrollments:
            student_data['enrollments'].append({
                'id': enrollment.id,
                'course_id': enrollment.course_id,
                'course_title': enrollment.course.title,
                'course_cover': enrollment.course.cover.url if enrollment.course.cover else None,
                'status': enrollment.status,
                'enrolled_at': enrollment.enrolled_at,
                'progress_percentage': enrollment.get_progress_percentage(),
                'last_accessed_at': enrollment.last_accessed_at
            })

        data.append(student_data)

    return Response(data)


@api_view(['GET'])
@permission_classes([IsAdmin])
def get_online_student_detail(request, student_id):
    """
    Get detailed info for a single ONLINE student with all enrollments.
    
    GET /api/admin/online-students/{student_id}/
    """
    student = get_object_or_404(
        Student,
        id=student_id,
        student_subtype=StudentSubtype.ONLINE
    )

    enrollments = student.course_enrollments.select_related('course').order_by('-last_accessed_at')

    student_data = {
        'id': student.id,
        'name': student.name,
        'email': student.user.email if student.user else None,
        'username': student.user.username if student.user else None,
        'student_subtype': student.student_subtype,
        'school_id': student.school_id,
        'school_name': student.school.name if student.school else None,
        'enrollment_count': enrollments.count(),
        'enrollments': [
            {
                'id': enrollment.id,
                'course_id': enrollment.course_id,
                'course_title': enrollment.course.title,
                'course_cover': enrollment.course.cover.url if enrollment.course.cover else None,
                'status': enrollment.status,
                'enrolled_at': enrollment.enrolled_at,
                'progress_percentage': enrollment.get_progress_percentage(),
                'last_accessed_at': enrollment.last_accessed_at
            }
            for enrollment in enrollments
        ]
    }

    return Response(student_data)


@api_view(['GET', 'PATCH', 'PUT'])
@permission_classes([IsAdmin])
def online_student_profile(request, student_id):
    """
    Retrieve or update ONLINE student basic profile fields.

    GET/PATCH/PUT /api/courses/admin/online-students/{student_id}/profile/
    """
    student = get_object_or_404(
        Student,
        id=student_id,
        student_subtype=StudentSubtype.ONLINE
    )

    if request.method == 'GET':
        serializer = AdminOnlineStudentProfileSerializer(student)
        return Response(serializer.data)

    partial = request.method == 'PATCH'
    serializer = AdminOnlineStudentProfileSerializer(
        student,
        data=request.data,
        partial=partial,
    )

    if serializer.is_valid():
        serializer.save()
        return Response(AdminOnlineStudentProfileSerializer(student).data)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAdmin])
def assign_courses_to_student(request, student_id):
    """
    Assign one or more courses to an ONLINE student.
    Creates CourseEnrollment records for courses not already enrolled.
    
    POST /api/admin/online-students/{student_id}/assign-courses/
    
    Body:
    {
        "course_ids": [1, 2, 3],
        "skip_existing": true  # If true, skip courses student is already enrolled in
    }
    
    Response:
    {
        "assigned": [{"id": 1, "course_title": "Python Basics", ...}],
        "skipped": [{"id": 2, "course_title": "Web Dev", "reason": "already enrolled"}],
        "failed": []
    }
    """
    student = get_object_or_404(
        Student,
        id=student_id,
        student_subtype=StudentSubtype.ONLINE
    )

    # Validate request body
    course_ids = request.data.get('course_ids', [])
    skip_existing = request.data.get('skip_existing', True)

    if not course_ids:
        return Response(
            {'error': 'course_ids is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not isinstance(course_ids, list):
        return Response(
            {'error': 'course_ids must be a list'},
            status=status.HTTP_400_BAD_REQUEST
        )

    assigned = []
    skipped = []
    failed = []

    # Process each course
    for course_id in course_ids:
        try:
            course = get_object_or_404(Book, id=course_id)
        except:
            failed.append({
                'course_id': course_id,
                'reason': 'Course not found'
            })
            continue

        # Check if already enrolled
        existing = CourseEnrollment.objects.filter(
            student=student,
            course=course
        ).first()

        if existing:
            if skip_existing:
                skipped.append({
                    'course_id': course.id,
                    'course_title': course.title,
                    'reason': f'Already enrolled with status: {existing.status}'
                })
                continue
            elif existing.status == 'dropped':
                # Re-enroll dropped course
                existing.status = 'active'
                existing.save()
                assigned.append({
                    'id': existing.id,
                    'course_id': course.id,
                    'course_title': course.title,
                    'status': 'active',
                    'action': 'reactivated'
                })
            else:
                skipped.append({
                    'course_id': course.id,
                    'course_title': course.title,
                    'reason': f'Already enrolled with status: {existing.status}'
                })
                continue
        else:
            # Create new enrollment
            enrollment = CourseEnrollment.objects.create(
                student=student,
                course=course,
                status='active'
            )
            assigned.append({
                'id': enrollment.id,
                'course_id': course.id,
                'course_title': course.title,
                'status': 'active',
                'action': 'new'
            })

    return Response({
        'assigned': assigned,
        'skipped': skipped,
        'failed': failed,
        'summary': {
            'total_requested': len(course_ids),
            'assigned_count': len(assigned),
            'skipped_count': len(skipped),
            'failed_count': len(failed)
        }
    }, status=status.HTTP_200_OK)


@api_view(['DELETE'])
@permission_classes([IsAdmin])
def remove_course_from_student(request, student_id, enrollment_id):
    """
    Remove (drop) a course enrollment from an ONLINE student.
    
    DELETE /api/admin/online-students/{student_id}/enrollments/{enrollment_id}/
    
    Note: Soft delete - sets status to 'dropped' instead of hard delete.
    """
    student = get_object_or_404(
        Student,
        id=student_id,
        student_subtype=StudentSubtype.ONLINE
    )

    enrollment = get_object_or_404(
        CourseEnrollment,
        id=enrollment_id,
        student=student
    )

    enrollment.status = 'dropped'
    enrollment.save()

    return Response({
        'message': 'Course removed from student',
        'enrollment_id': enrollment.id,
        'course_title': enrollment.course.title,
        'status': 'dropped'
    })


@api_view(['GET'])
@permission_classes([IsAdmin])
def get_available_courses(request):
    """
    Get all available courses that can be assigned to online students.
    
    GET /api/admin/online-students/available-courses/
    
    Response:
    {
        "courses": [
            {
                "id": 1,
                "title": "Python Basics",
                "description": "...",
                "cover": "...",
                "topic_count": 10
            }
        ]
    }
    """
    courses = Book.objects.annotate(
        topic_count=Count('topics')
    ).values(
        'id', 'title', 'description', 'cover', 'topic_count'
    ).order_by('title')

    course_list = []
    for course in courses:
        course_data = {
            'id': course['id'],
            'title': course['title'],
            'description': course['description'] or '',
            'topic_count': course['topic_count'] or 0
        }
        if course['cover']:
            course_data['cover'] = course['cover']
        course_list.append(course_data)

    return Response({
        'courses': course_list,
        'total': len(course_list)
    })


@api_view(['POST'])
@permission_classes([IsAdmin])
def bulk_assign_courses(request):
    """
    Bulk assign courses to multiple ONLINE students at once.
    
    POST /api/admin/online-students/bulk-assign-courses/
    
    Body:
    {
        "student_ids": [1, 2, 3],
        "course_ids": [5, 6, 7],
        "skip_existing": true
    }
    
    Response:
    {
        "total_students": 3,
        "total_courses": 3,
        "results": [
            {
                "student_id": 1,
                "student_name": "John",
                "assigned_count": 3,
                "skipped_count": 0,
                "failed_count": 0
            }
        ]
    }
    """
    student_ids = request.data.get('student_ids', [])
    course_ids = request.data.get('course_ids', [])
    skip_existing = request.data.get('skip_existing', True)

    if not student_ids or not course_ids:
        return Response(
            {'error': 'student_ids and course_ids are required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    results = []
    
    for student_id in student_ids:
        try:
            student = Student.objects.get(
                id=student_id,
                student_subtype=StudentSubtype.ONLINE
            )
        except Student.DoesNotExist:
            results.append({
                'student_id': student_id,
                'error': 'Student not found or not ONLINE subtype'
            })
            continue

        assigned_count = 0
        skipped_count = 0
        failed_count = 0

        for course_id in course_ids:
            try:
                course = Book.objects.get(id=course_id)
            except Book.DoesNotExist:
                failed_count += 1
                continue

            existing = CourseEnrollment.objects.filter(
                student=student,
                course=course
            ).first()

            if existing:
                if existing.status == 'dropped':
                    existing.status = 'active'
                    existing.save()
                    assigned_count += 1
                else:
                    if skip_existing:
                        skipped_count += 1
                    else:
                        skipped_count += 1
            else:
                CourseEnrollment.objects.create(
                    student=student,
                    course=course,
                    status='active'
                )
                assigned_count += 1

        results.append({
            'student_id': student.id,
            'student_name': student.name,
            'assigned_count': assigned_count,
            'skipped_count': skipped_count,
            'failed_count': failed_count
        })

    return Response({
        'total_students': len(student_ids),
        'total_courses': len(course_ids),
        'results': results,
        'summary': {
            'total_assignments': len(student_ids) * len(course_ids),
            'successful_results': len([r for r in results if 'error' not in r])
        }
    })
