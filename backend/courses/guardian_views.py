# ============================================
# GUARDIAN REVIEW VIEWS
# ============================================
# Handles guardian review functionality
# Guardian review is only available OUTSIDE school hours
# using the same student login (no separate guardian account)

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone

from .models import ActivityProof, GuardianReview
from students.models import Student


# =============================================
# Helper Functions
# =============================================

def is_student(user):
    """Check if user is a student."""
    return user.role == 'Student'


def get_student_from_user(user):
    """Get student object from user."""
    try:
        return Student.objects.get(user=user)
    except Student.DoesNotExist:
        return None


def get_client_ip(request):
    """Get client IP address from request."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


# =============================================
# Guardian Endpoints
# =============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_guardian_time(request):
    """
    Check if current time is outside school hours (guardian mode available).

    GET /api/courses/guardian/check-time/
    Response:
    {
        "is_guardian_time": true,
        "school_name": "ABC School",
        "school_hours": "08:00 - 15:00",
        "current_time": "18:30",
        "message": "Guardian review mode is available"
    }
    """
    if not is_student(request.user):
        return Response(
            {'error': 'This endpoint is for students only'},
            status=status.HTTP_403_FORBIDDEN
        )

    student = get_student_from_user(request.user)
    if not student:
        return Response(
            {'error': 'Student profile not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    school = student.school
    if not school:
        return Response(
            {'error': 'Student is not assigned to a school'},
            status=status.HTTP_400_BAD_REQUEST
        )

    is_guardian_time = school.is_guardian_time()
    current_time = timezone.localtime().strftime('%H:%M')

    # Format school hours for display
    from datetime import time as datetime_time
    start = school.start_time or datetime_time(8, 0)
    end = school.end_time or datetime_time(15, 0)
    school_hours = f"{start.strftime('%H:%M')} - {end.strftime('%H:%M')}"

    message = (
        "Guardian review mode is available"
        if is_guardian_time
        else f"Guardian review is only available outside school hours ({school_hours})"
    )

    return Response({
        'is_guardian_time': is_guardian_time,
        'school_name': school.name,
        'school_hours': school_hours,
        'current_time': current_time,
        'message': message
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def pending_guardian_reviews(request):
    """
    Get list of approved activity proofs pending guardian review.

    GET /api/courses/guardian/pending-reviews/
    Response:
    {
        "is_guardian_time": true,
        "count": 3,
        "pending_reviews": [
            {
                "proof_id": 1,
                "topic_id": 123,
                "topic_title": "Scratch Animation",
                "chapter_title": "Chapter 1",
                "course_title": "Scratch Programming",
                "screenshot_url": "...",
                "teacher_rating": "good",
                "teacher_remarks": "Well done!",
                "approved_at": "2024-01-15T10:30:00"
            }
        ]
    }
    """
    if not is_student(request.user):
        return Response(
            {'error': 'This endpoint is for students only'},
            status=status.HTTP_403_FORBIDDEN
        )

    student = get_student_from_user(request.user)
    if not student:
        return Response(
            {'error': 'Student profile not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    school = student.school
    if not school:
        return Response(
            {'error': 'Student is not assigned to a school'},
            status=status.HTTP_400_BAD_REQUEST
        )

    is_guardian_time = school.is_guardian_time()

    # Get approved proofs that don't have guardian reviews yet
    approved_proofs = ActivityProof.objects.filter(
        student=student,
        status='approved'
    ).exclude(
        guardian_review__isnull=False  # Exclude proofs that already have guardian review
    ).select_related('topic', 'topic__parent', 'enrollment__course')

    pending_reviews = []
    for proof in approved_proofs:
        pending_reviews.append({
            'proof_id': proof.id,
            'topic_id': proof.topic.id,
            'topic_title': proof.topic.display_title,
            'chapter_title': proof.topic.parent.display_title if proof.topic.parent else None,
            'course_title': proof.enrollment.course.title,
            'screenshot_url': proof.screenshot_url,
            'software_used': proof.software_used,
            'student_notes': proof.student_notes,
            'teacher_rating': proof.teacher_rating,
            'teacher_remarks': proof.teacher_remarks,
            'approved_at': proof.approved_at,
        })

    return Response({
        'is_guardian_time': is_guardian_time,
        'count': len(pending_reviews),
        'pending_reviews': pending_reviews,
        'message': (
            None if is_guardian_time
            else "Guardian review is only available outside school hours"
        )
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_guardian_review(request, proof_id):
    """
    Submit guardian approval for an activity proof.
    Only available outside school hours.

    POST /api/courses/guardian/review/{proof_id}/
    Body:
    {
        "is_approved": true,  // Optional, defaults to true
        "review_notes": "Great work!"  // Optional
    }
    """
    if not is_student(request.user):
        return Response(
            {'error': 'This endpoint is for students only'},
            status=status.HTTP_403_FORBIDDEN
        )

    student = get_student_from_user(request.user)
    if not student:
        return Response(
            {'error': 'Student profile not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    school = student.school
    if not school:
        return Response(
            {'error': 'Student is not assigned to a school'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check if it's guardian time
    if not school.is_guardian_time():
        from datetime import time as datetime_time
        start = school.start_time or datetime_time(8, 0)
        end = school.end_time or datetime_time(15, 0)
        return Response(
            {
                'error': 'Guardian review is only available outside school hours',
                'school_hours': f"{start.strftime('%H:%M')} - {end.strftime('%H:%M')}"
            },
            status=status.HTTP_403_FORBIDDEN
        )

    # Get the activity proof
    try:
        proof = ActivityProof.objects.get(
            id=proof_id,
            student=student,
            status='approved'
        )
    except ActivityProof.DoesNotExist:
        return Response(
            {'error': 'Activity proof not found or not approved yet'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Check if already reviewed
    if hasattr(proof, 'guardian_review'):
        return Response(
            {'error': 'This activity has already been reviewed by guardian'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Create guardian review
    is_approved = request.data.get('is_approved', True)
    review_notes = request.data.get('review_notes', '')
    client_ip = get_client_ip(request)

    guardian_review = GuardianReview.objects.create(
        student=student,
        topic=proof.topic,
        activity_proof=proof,
        is_approved=is_approved,
        reviewer_ip=client_ip,
        review_notes=review_notes
    )

    return Response({
        'success': True,
        'message': 'Guardian review submitted successfully',
        'review': {
            'id': guardian_review.id,
            'topic_title': proof.topic.display_title,
            'is_approved': guardian_review.is_approved,
            'reviewed_at': guardian_review.reviewed_at,
        }
    }, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_guardian_reviews(request):
    """
    Get list of all guardian reviews for a student.

    GET /api/courses/guardian/my-reviews/
    Query params:
    - course_id: filter by course (optional)
    """
    if not is_student(request.user):
        return Response(
            {'error': 'This endpoint is for students only'},
            status=status.HTTP_403_FORBIDDEN
        )

    student = get_student_from_user(request.user)
    if not student:
        return Response(
            {'error': 'Student profile not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    reviews = GuardianReview.objects.filter(
        student=student
    ).select_related('topic', 'topic__parent', 'activity_proof__enrollment__course')

    # Filter by course
    course_id = request.query_params.get('course_id')
    if course_id:
        reviews = reviews.filter(activity_proof__enrollment__course_id=course_id)

    review_list = []
    for review in reviews:
        review_list.append({
            'id': review.id,
            'topic_id': review.topic.id,
            'topic_title': review.topic.display_title,
            'chapter_title': review.topic.parent.display_title if review.topic.parent else None,
            'course_title': review.activity_proof.enrollment.course.title,
            'is_approved': review.is_approved,
            'review_notes': review.review_notes,
            'reviewed_at': review.reviewed_at,
        })

    return Response({
        'count': len(review_list),
        'reviews': review_list
    })
