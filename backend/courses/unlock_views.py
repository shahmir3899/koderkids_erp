# ============================================
# UNLOCK STATUS VIEWS
# ============================================
# Endpoints for checking section unlock status

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .unlock_service import (
    get_section_unlock_status,
    get_topic_validation_steps,
    can_access_topic
)
from books.models import Topic
from students.models import Student


def is_student(user):
    """Check if user is a student."""
    return user.role == 'Student'


def get_student_from_user(user):
    """Get student object from user."""
    try:
        return Student.objects.get(user=user)
    except Student.DoesNotExist:
        return None


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def topic_unlock_status(request, topic_id):
    """
    Get the 5-step unlock validation status for a topic.

    GET /api/courses/topics/{topic_id}/unlock-status/
    Response:
    {
        "is_unlocked": false,
        "current_step": 4,
        "message": "Waiting for teacher to review your activity",
        "details": {
            "reading": {"completed": true, "time_spent": 600},
            "activity": {"completed": true, "status": "completed"},
            "screenshot": {"uploaded": true, "proof_id": 123},
            "teacher_approval": {"approved": false, "status": "pending"},
            "guardian_review": {"reviewed": false, "approved": false}
        }
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

    try:
        topic = Topic.objects.get(id=topic_id)
    except Topic.DoesNotExist:
        return Response(
            {'error': 'Topic not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    unlock_status = get_section_unlock_status(student, topic)
    return Response(unlock_status.to_dict())


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def topic_validation_steps(request, topic_id):
    """
    Get detailed validation steps for a topic.

    GET /api/courses/topics/{topic_id}/validation-steps/
    Response:
    {
        "is_complete": false,
        "current_step": 3,
        "message": "Upload a screenshot of your completed activity",
        "steps": [
            {
                "step": 1,
                "name": "Reading",
                "description": "Spend time reading the content",
                "completed": true,
                "is_current": false
            },
            ...
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

    try:
        topic = Topic.objects.get(id=topic_id)
    except Topic.DoesNotExist:
        return Response(
            {'error': 'Topic not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    steps = get_topic_validation_steps(student, topic)
    return Response(steps)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def topic_access_check(request, topic_id):
    """
    Check if a student can access a topic (based on sequential unlock rules).

    GET /api/courses/topics/{topic_id}/can-access/
    Response:
    {
        "can_access": true,
        "reason": "Previous section completed"
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

    try:
        topic = Topic.objects.get(id=topic_id)
    except Topic.DoesNotExist:
        return Response(
            {'error': 'Topic not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    can_access, reason = can_access_topic(student, topic)
    return Response({
        'can_access': can_access,
        'reason': reason
    })
