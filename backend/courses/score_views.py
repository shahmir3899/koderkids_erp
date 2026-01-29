# ============================================
# STUDENT SCORE VIEWS
# ============================================
# Handles student score calculation and retrieval

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Avg, Count, Q
from django.utils import timezone

from .models import SectionScore, CourseEnrollment, TopicProgress
from students.models import Student


# =============================================
# Helper Functions
# =============================================

def is_student(user):
    """Check if user is a student."""
    return user.role == 'Student'


def is_teacher_or_admin(user):
    """Check if user is a teacher or admin."""
    return user.role in ['Teacher', 'Admin']


def get_student_from_user(user):
    """Get student object from user."""
    try:
        return Student.objects.get(user=user)
    except Student.DoesNotExist:
        return None


# =============================================
# Student Endpoints
# =============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_scores(request):
    """
    Get all section scores for the logged-in student.

    GET /api/courses/scores/my-scores/
    Query params:
    - course_id: filter by course (optional)
    - rating: filter by rating (optional)
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

    scores = SectionScore.objects.filter(
        student=student
    ).select_related('topic', 'topic__parent', 'enrollment__course')

    # Filter by course
    course_id = request.query_params.get('course_id')
    if course_id:
        scores = scores.filter(enrollment__course_id=course_id)

    # Filter by rating
    rating = request.query_params.get('rating')
    if rating in ['excellent', 'good', 'average', 'needs_support']:
        scores = scores.filter(rating=rating)

    # Calculate summary stats
    summary = scores.aggregate(
        average_score=Avg('total_score'),
        total_sections=Count('id'),
        excellent_count=Count('id', filter=Q(rating='excellent')),
        good_count=Count('id', filter=Q(rating='good')),
        average_count=Count('id', filter=Q(rating='average')),
        needs_support_count=Count('id', filter=Q(rating='needs_support')),
    )

    score_list = []
    for score in scores:
        score_list.append({
            'id': score.id,
            'topic_id': score.topic.id,
            'topic_title': score.topic.display_title,
            'chapter_title': score.topic.parent.display_title if score.topic.parent else None,
            'course_title': score.enrollment.course.title,
            'reading_score': score.reading_score,
            'activity_score': score.activity_score,
            'teacher_rating_score': score.teacher_rating_score,
            'guardian_review_score': score.guardian_review_score,
            'total_score': float(score.total_score),
            'rating': score.rating,
            'calculated_at': score.calculated_at,
        })

    return Response({
        'summary': summary,
        'count': len(score_list),
        'scores': score_list
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_score_detail(request, topic_id):
    """
    Get detailed score for a specific topic.

    GET /api/courses/scores/my-scores/{topic_id}/
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
        score = SectionScore.objects.select_related(
            'topic', 'topic__parent', 'enrollment__course'
        ).get(student=student, topic_id=topic_id)
    except SectionScore.DoesNotExist:
        return Response(
            {'error': 'Score not found for this topic'},
            status=status.HTTP_404_NOT_FOUND
        )

    return Response({
        'id': score.id,
        'topic_id': score.topic.id,
        'topic_title': score.topic.display_title,
        'chapter_title': score.topic.parent.display_title if score.topic.parent else None,
        'course_title': score.enrollment.course.title,
        'components': {
            'reading': {
                'score': score.reading_score,
                'weight': 20,
                'weighted_score': score.reading_score * 0.20
            },
            'activity': {
                'score': score.activity_score,
                'weight': 30,
                'weighted_score': score.activity_score * 0.30
            },
            'teacher_rating': {
                'score': score.teacher_rating_score,
                'weight': 30,
                'weighted_score': score.teacher_rating_score * 0.30
            },
            'guardian_review': {
                'score': score.guardian_review_score,
                'weight': 20,
                'weighted_score': score.guardian_review_score * 0.20
            },
        },
        'total_score': float(score.total_score),
        'rating': score.rating,
        'rating_display': score.get_rating_display(),
        'calculated_at': score.calculated_at,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def recalculate_score(request, topic_id):
    """
    Recalculate score for a specific topic.

    POST /api/courses/scores/recalculate/{topic_id}/
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

    from books.models import Topic
    try:
        topic = Topic.objects.get(id=topic_id)
    except Topic.DoesNotExist:
        return Response(
            {'error': 'Topic not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    score = SectionScore.calculate_for_topic(student, topic)
    if not score:
        return Response(
            {'error': 'Could not calculate score. Student may not be enrolled.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    return Response({
        'success': True,
        'message': 'Score recalculated successfully',
        'total_score': float(score.total_score),
        'rating': score.rating
    })


# =============================================
# Teacher/Admin Endpoints
# =============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def class_score_report(request):
    """
    Get score report for a class (teacher view).

    GET /api/courses/scores/class-report/
    Query params:
    - school_id: filter by school (required for teacher)
    - class_id: filter by class (optional)
    - course_id: filter by course (optional)
    """
    if not is_teacher_or_admin(request.user):
        return Response(
            {'error': 'Only teachers and admins can view class reports'},
            status=status.HTTP_403_FORBIDDEN
        )

    scores = SectionScore.objects.select_related(
        'student', 'student__school', 'student__current_class',
        'topic', 'enrollment__course'
    )

    # Filter by teacher's schools
    if request.user.role == 'Teacher':
        teacher_schools = request.user.assigned_schools.all()
        scores = scores.filter(student__school__in=teacher_schools)

    # Additional filters
    school_id = request.query_params.get('school_id')
    if school_id:
        scores = scores.filter(student__school_id=school_id)

    class_id = request.query_params.get('class_id')
    if class_id:
        scores = scores.filter(student__current_class_id=class_id)

    course_id = request.query_params.get('course_id')
    if course_id:
        scores = scores.filter(enrollment__course_id=course_id)

    # Group by student for summary
    student_summaries = {}
    for score in scores:
        student_id = score.student.id
        if student_id not in student_summaries:
            student_summaries[student_id] = {
                'student_id': student_id,
                'student_name': score.student.name,
                'school_name': score.student.school.name if score.student.school else None,
                'class_name': score.student.current_class.name if score.student.current_class else None,
                'total_sections': 0,
                'average_score': 0,
                'scores_sum': 0,
                'rating_breakdown': {
                    'excellent': 0,
                    'good': 0,
                    'average': 0,
                    'needs_support': 0
                }
            }

        summary = student_summaries[student_id]
        summary['total_sections'] += 1
        summary['scores_sum'] += float(score.total_score)
        summary['rating_breakdown'][score.rating] += 1

    # Calculate averages
    for student_id, summary in student_summaries.items():
        if summary['total_sections'] > 0:
            summary['average_score'] = round(
                summary['scores_sum'] / summary['total_sections'], 2
            )
        del summary['scores_sum']  # Remove internal tracking field

    # Convert to list and sort by average score
    report = list(student_summaries.values())
    report.sort(key=lambda x: x['average_score'], reverse=True)

    # Overall class stats
    class_stats = scores.aggregate(
        overall_average=Avg('total_score'),
        total_scores=Count('id'),
        excellent_count=Count('id', filter=Q(rating='excellent')),
        good_count=Count('id', filter=Q(rating='good')),
        average_count=Count('id', filter=Q(rating='average')),
        needs_support_count=Count('id', filter=Q(rating='needs_support')),
    )

    return Response({
        'class_stats': class_stats,
        'student_count': len(report),
        'students': report
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_score_detail(request, student_id):
    """
    Get detailed scores for a specific student (teacher/admin view).

    GET /api/courses/scores/student/{student_id}/
    """
    if not is_teacher_or_admin(request.user):
        return Response(
            {'error': 'Only teachers and admins can view student scores'},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        student = Student.objects.get(id=student_id)
    except Student.DoesNotExist:
        return Response(
            {'error': 'Student not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Check teacher has access to this student's school
    if request.user.role == 'Teacher':
        teacher_schools = request.user.assigned_schools.all()
        if student.school not in teacher_schools:
            return Response(
                {'error': 'You do not have access to this student'},
                status=status.HTTP_403_FORBIDDEN
            )

    scores = SectionScore.objects.filter(
        student=student
    ).select_related('topic', 'topic__parent', 'enrollment__course')

    # Summary stats
    summary = scores.aggregate(
        average_score=Avg('total_score'),
        total_sections=Count('id'),
        excellent_count=Count('id', filter=Q(rating='excellent')),
        good_count=Count('id', filter=Q(rating='good')),
        average_count=Count('id', filter=Q(rating='average')),
        needs_support_count=Count('id', filter=Q(rating='needs_support')),
    )

    score_list = []
    for score in scores:
        score_list.append({
            'id': score.id,
            'topic_id': score.topic.id,
            'topic_title': score.topic.display_title,
            'chapter_title': score.topic.parent.display_title if score.topic.parent else None,
            'course_title': score.enrollment.course.title,
            'reading_score': score.reading_score,
            'activity_score': score.activity_score,
            'teacher_rating_score': score.teacher_rating_score,
            'guardian_review_score': score.guardian_review_score,
            'total_score': float(score.total_score),
            'rating': score.rating,
            'calculated_at': score.calculated_at,
        })

    return Response({
        'student': {
            'id': student.id,
            'name': student.name,
            'school': student.school.name if student.school else None,
            'class': student.current_class.name if student.current_class else None,
        },
        'summary': summary,
        'count': len(score_list),
        'scores': score_list
    })
