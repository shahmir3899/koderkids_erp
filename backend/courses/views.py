# courses/views.py
import csv
from io import StringIO
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db.models import Sum, Avg, Count, Q
from django.http import HttpResponse
from django.utils import timezone

from .models import (
    CourseEnrollment, TopicProgress,
    Quiz, QuizQuestion, QuizChoice, QuizAttempt,
    ActivityProof, GuardianReview,
)
from .serializers import (
    CourseEnrollmentSerializer, CourseEnrollmentCreateSerializer,
    CourseListSerializer, CourseDetailSerializer,
    TopicContentSerializer, TopicProgressSerializer,
    QuizSerializer, QuizAttemptSerializer, QuizSubmissionSerializer,
    QuizCreateSerializer, QuizQuestionCreateSerializer,
    ProgressDashboardSerializer, ContinueLearningSerializer
)
from books.models import Book, Topic
from students.models import Student, LessonPlan


# =============================================
# Custom Permissions
# =============================================

from rest_framework import permissions


class IsStudent(permissions.BasePermission):
    """Permission for student-only actions."""
    message = "Only students can perform this action."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role == 'Student'


class IsAdminOrTeacher(permissions.BasePermission):
    """Permission for admin or teacher actions."""
    message = "Only administrators or teachers can perform this action."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in ['Admin', 'Teacher']


class IsEnrolledOrAdmin(permissions.BasePermission):
    """Permission for enrolled students or admins."""
    message = "You must be enrolled in this course."

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated

    def check_enrollment(self, user, course_id):
        """Check if user is enrolled in the course."""
        if user.role == 'Admin':
            return True

        try:
            student = Student.objects.get(user=user)
            return CourseEnrollment.objects.filter(
                student=student,
                course_id=course_id,
                status='active'
            ).exists()
        except Student.DoesNotExist:
            return False


# =============================================
# Helper Functions
# =============================================

def get_student_from_user(user):
    """Get student object from user."""
    try:
        return Student.objects.get(user=user)
    except Student.DoesNotExist:
        return None


def has_lessonplan_access(student, topic):
    """
    Check if student has access to a topic via LessonPlan.
    A student can access a topic if it appears in any LessonPlan
    for their school and class.
    """
    if not student:
        return False

    # Check if this topic (or its parent chapter/lesson) is in any LessonPlan
    # for the student's school and class
    topic_ids = [topic.id]

    # Also include parent topics (if activity, include parent lesson and chapter)
    if topic.parent:
        topic_ids.append(topic.parent.id)
        if topic.parent.parent:
            topic_ids.append(topic.parent.parent.id)

    # Also include all children (if this is a chapter/lesson, include all sub-topics)
    children = topic.get_descendants()
    topic_ids.extend(children.values_list('id', flat=True))

    return LessonPlan.objects.filter(
        school=student.school,
        student_class=student.student_class,
        planned_topics__id__in=topic_ids
    ).exists()


def get_accessible_books_for_student(student):
    """
    Get all books accessible to a student via LessonPlan.
    Returns books that have at least one topic in any LessonPlan
    for the student's school and class.
    """
    if not student:
        return Book.objects.none()

    # Get all topic IDs from LessonPlans for this student's school/class
    lesson_plans = LessonPlan.objects.filter(
        school=student.school,
        student_class=student.student_class
    )

    # Get books that have topics in these lesson plans
    accessible_book_ids = Topic.objects.filter(
        planned_lessons__in=lesson_plans
    ).values_list('book_id', flat=True).distinct()

    return Book.objects.filter(id__in=accessible_book_ids)


def get_accessible_topics_for_student(student, book=None):
    """
    Get all accessible topic IDs for a student via LessonPlan.
    If book is provided, filter to that book only.
    """
    if not student:
        return set()

    # Get all LessonPlans for this student's school/class
    lesson_plans = LessonPlan.objects.filter(
        school=student.school,
        student_class=student.student_class
    ).prefetch_related('planned_topics')

    accessible_topic_ids = set()

    for lp in lesson_plans:
        for topic in lp.planned_topics.all():
            # Add the topic itself
            accessible_topic_ids.add(topic.id)

            # Add all ancestors (chapter, parent lesson)
            for ancestor in topic.get_ancestors():
                accessible_topic_ids.add(ancestor.id)

            # Add all descendants (sub-lessons, activities)
            for descendant in topic.get_descendants():
                accessible_topic_ids.add(descendant.id)

    if book:
        # Filter to only topics from this book
        book_topic_ids = set(Topic.objects.filter(book=book).values_list('id', flat=True))
        accessible_topic_ids = accessible_topic_ids.intersection(book_topic_ids)

    return accessible_topic_ids


def get_or_create_auto_enrollment(student, book):
    """
    Get or create an enrollment for automatic LessonPlan-based access.
    This creates an enrollment record for tracking progress without
    requiring manual enrollment.
    """
    enrollment, created = CourseEnrollment.objects.get_or_create(
        student=student,
        course=book,
        defaults={'status': 'active'}
    )
    if enrollment.status == 'dropped':
        enrollment.status = 'active'
        enrollment.save()
    return enrollment


# =============================================
# Course Browsing Views
# =============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def course_list(request):
    """
    List all available courses.
    GET /api/courses/
    """
    student = get_student_from_user(request.user)
    courses = Book.objects.all().prefetch_related('topics', 'enrollments')

    # Optional filters
    search = request.query_params.get('search', '')
    if search:
        courses = courses.filter(
            Q(title__icontains=search) | Q(isbn__icontains=search)
        )

    serializer = CourseListSerializer(
        courses, many=True,
        context={'student': student}
    )
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def course_detail(request, course_id):
    """
    Get course details with topic tree and progress.
    GET /api/courses/{id}/
    """
    course = get_object_or_404(Book, id=course_id)
    student = get_student_from_user(request.user)

    enrollment = None
    if student:
        enrollment = CourseEnrollment.objects.filter(
            student=student, course=course
        ).first()

    serializer = CourseDetailSerializer(
        course,
        context={'enrollment': enrollment, 'student': student, 'user': request.user}
    )
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def course_preview(request, course_id):
    """
    Preview course without enrollment (limited content).
    GET /api/courses/{id}/preview/
    """
    course = get_object_or_404(Book, id=course_id)

    # Return basic info without full content
    data = {
        'id': course.id,
        'title': course.title,
        'cover': course.cover.url if course.cover else None,
        'chapters': [],
        'total_topics': course.topics.filter(is_required=True).count(),
        'total_duration_minutes': sum(
            t.estimated_time_minutes for t in course.topics.filter(is_required=True)
        )
    }

    # Add chapter titles only (no full content)
    chapters = course.topics.filter(parent=None, type='chapter')
    for chapter in chapters:
        chapter_data = {
            'id': chapter.id,
            'title': chapter.display_title,
            'lessons_count': chapter.get_descendant_count()
        }
        data['chapters'].append(chapter_data)

    return Response(data)


# =============================================
# Enrollment Views
# =============================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def enroll_in_course(request, course_id):
    """
    Enroll in a course.
    POST /api/courses/{id}/enroll/
    """
    student = get_student_from_user(request.user)
    if not student:
        return Response(
            {'error': 'Student profile not found'},
            status=status.HTTP_400_BAD_REQUEST
        )

    course = get_object_or_404(Book, id=course_id)

    # Check if already enrolled
    existing = CourseEnrollment.objects.filter(
        student=student, course=course
    ).first()

    if existing:
        if existing.status == 'dropped':
            # Re-enroll
            existing.status = 'active'
            existing.save()
            serializer = CourseEnrollmentSerializer(existing)
            return Response(serializer.data)
        return Response(
            {'error': 'Already enrolled in this course'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Create enrollment
    enrollment = CourseEnrollment.objects.create(
        student=student,
        course=course
    )

    serializer = CourseEnrollmentSerializer(enrollment)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def unenroll_from_course(request, course_id):
    """
    Drop/unenroll from a course.
    DELETE /api/courses/{id}/unenroll/
    """
    student = get_student_from_user(request.user)
    if not student:
        return Response(
            {'error': 'Student profile not found'},
            status=status.HTTP_400_BAD_REQUEST
        )

    enrollment = get_object_or_404(
        CourseEnrollment,
        student=student,
        course_id=course_id
    )

    enrollment.status = 'dropped'
    enrollment.save()

    return Response({'message': 'Successfully unenrolled'})


def _build_topic_validations(student, enrollment, accessible_topic_ids, course):
    """Build per-topic validation status for course cards (batch queries)."""
    accessible_topics = course.topics.filter(
        id__in=accessible_topic_ids
    ).order_by('tree_id', 'lft')

    all_progress = {
        tp.topic_id: tp for tp in TopicProgress.objects.filter(
            enrollment=enrollment, topic_id__in=accessible_topic_ids
        )
    }
    all_proofs = {
        ap.topic_id: ap for ap in ActivityProof.objects.filter(
            student=student, topic_id__in=accessible_topic_ids
        )
    }
    all_reviews = {
        gr.topic_id: gr for gr in GuardianReview.objects.filter(
            student=student, topic_id__in=accessible_topic_ids
        )
    }

    validations = []
    for t in accessible_topics:
        progress = all_progress.get(t.id)
        proof = all_proofs.get(t.id)
        review = all_reviews.get(t.id)

        blocks = t.activity_blocks if isinstance(t.activity_blocks, list) else []
        has_home = any(b.get('type') == 'home_activity' for b in blocks)

        if not has_home:
            # Simple topic — just reading + complete
            if progress and progress.status == 'completed':
                val_status = 'complete'
            elif progress and progress.status == 'in_progress':
                val_status = 'in_progress'
            else:
                val_status = 'not_started'
        else:
            # 5-step topic
            if review and review.is_approved:
                val_status = 'complete'
            elif proof and proof.status == 'rejected':
                val_status = 'needs_action'
            elif proof and proof.status == 'approved' and not (review and review.is_approved):
                val_status = 'needs_action'  # needs guardian
            elif proof and proof.status == 'pending':
                val_status = 'in_progress'  # waiting for teacher
            elif progress and progress.status == 'completed':
                val_status = 'in_progress'  # needs screenshot
            elif progress and progress.status == 'in_progress':
                val_status = 'in_progress'
            else:
                val_status = 'not_started'

        validations.append({
            'topic_id': t.id,
            'status': val_status,
        })

    return validations


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_courses(request):
    """
    List student's accessible courses.
    For Admin/Teacher: returns all courses.
    For Students: returns courses accessible via LessonPlan (automatic)
                  plus any manual enrollments (legacy).
    GET /api/courses/my-courses/
    """
    # For Admin/Teacher - return all courses as mock enrollments
    if request.user.role in ['Admin', 'Teacher']:
        courses = Book.objects.all().prefetch_related('topics').distinct()
        data = []
        for course in courses:
            # Calculate topic stats
            topics = course.topics.filter(is_required=True)
            total_topics = topics.count()
            total_duration = sum(t.estimated_time_minutes for t in topics)

            data.append({
                'id': None,
                'student': None,
                'course': course.id,
                'course_title': course.title,
                'course_cover': course.cover.url if course.cover else None,
                'student_name': request.user.get_full_name() or request.user.username,
                'enrolled_at': None,
                'completed_at': None,
                'status': 'active',
                'last_accessed_at': None,
                'last_topic': None,
                'last_topic_title': None,
                'progress_percentage': 0,
                'total_topics': total_topics,
                'total_duration_minutes': total_duration,
                'access_type': 'admin',
                'topic_validations': [],
            })
        return Response(data)

    # For Students - return courses accessible via LessonPlan
    student = get_student_from_user(request.user)
    if not student:
        return Response([])

    # Get books accessible via LessonPlan
    accessible_books = get_accessible_books_for_student(student)

    # Also get any manual enrollments (legacy support)
    manual_enrollments = CourseEnrollment.objects.filter(
        student=student
    ).exclude(status='dropped').select_related('course', 'last_topic')

    manual_book_ids = set(e.course_id for e in manual_enrollments)

    data = []

    # Add LessonPlan-accessible courses
    for course in accessible_books:
        # Get or create enrollment for progress tracking
        enrollment = manual_enrollments.filter(course=course).first()
        if not enrollment:
            enrollment = get_or_create_auto_enrollment(student, course)

        # Calculate topic stats
        accessible_topic_ids = get_accessible_topics_for_student(student, course)
        total_topics = len(accessible_topic_ids)
        completed = TopicProgress.objects.filter(
            enrollment=enrollment,
            topic_id__in=accessible_topic_ids,
            status='completed'
        ).count()
        progress_pct = round((completed / total_topics) * 100, 1) if total_topics > 0 else 0

        topics = course.topics.filter(id__in=accessible_topic_ids, is_required=True)
        total_duration = sum(t.estimated_time_minutes for t in topics)

        data.append({
            'id': enrollment.id,
            'student': student.id,
            'course': course.id,
            'course_title': course.title,
            'course_cover': course.cover.url if course.cover else None,
            'student_name': student.name,
            'enrolled_at': enrollment.enrolled_at,
            'completed_at': enrollment.completed_at,
            'status': enrollment.status,
            'last_accessed_at': enrollment.last_accessed_at,
            'last_topic': enrollment.last_topic_id,
            'last_topic_title': enrollment.last_topic.display_title if enrollment.last_topic else None,
            'progress_percentage': progress_pct,
            'total_topics': total_topics,
            'total_duration_minutes': total_duration,
            'access_type': 'lessonplan',
            'accessible_topic_count': len(accessible_topic_ids),
            'topic_validations': _build_topic_validations(
                student, enrollment, accessible_topic_ids, course
            ),
        })

    # Add any manual enrollments not already covered by LessonPlan
    for enrollment in manual_enrollments:
        if enrollment.course_id not in [d['course'] for d in data]:
            course = enrollment.course
            topics = course.topics.filter(is_required=True)
            total_topics = topics.count()
            total_duration = sum(t.estimated_time_minutes for t in topics)

            data.append({
                'id': enrollment.id,
                'student': student.id,
                'course': course.id,
                'course_title': course.title,
                'course_cover': course.cover.url if course.cover else None,
                'student_name': student.name,
                'enrolled_at': enrollment.enrolled_at,
                'completed_at': enrollment.completed_at,
                'status': enrollment.status,
                'last_accessed_at': enrollment.last_accessed_at,
                'last_topic': enrollment.last_topic_id,
                'last_topic_title': enrollment.last_topic.display_title if enrollment.last_topic else None,
                'progress_percentage': enrollment.get_progress_percentage(),
                'total_topics': total_topics,
                'total_duration_minutes': total_duration,
                'access_type': 'manual',
                'topic_validations': _build_topic_validations(
                    student, enrollment,
                    set(topics.values_list('id', flat=True)),
                    course
                ),
            })

    return Response(data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def auto_enroll_all(request):
    """
    Auto-enroll student in all available courses.
    POST /api/courses/auto-enroll-all/
    """
    student = get_student_from_user(request.user)
    if not student:
        return Response(
            {'error': 'Student profile not found'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Get all published courses
    courses = Book.objects.filter(is_published=True)
    enrolled_count = 0

    for course in courses:
        enrollment, created = CourseEnrollment.objects.get_or_create(
            student=student,
            course=course,
            defaults={'status': 'active'}
        )
        if created:
            enrolled_count += 1
        elif enrollment.status == 'dropped':
            enrollment.status = 'active'
            enrollment.save()
            enrolled_count += 1

    return Response({
        'message': f'Enrolled in {enrolled_count} new courses',
        'total_courses': courses.count()
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def continue_learning(request):
    """
    Get last accessed course and topic for resume functionality.
    GET /api/courses/continue/
    """
    student = get_student_from_user(request.user)
    if not student:
        return Response(None)

    # Get most recently accessed active enrollment
    enrollment = CourseEnrollment.objects.filter(
        student=student,
        status='active'
    ).select_related('course', 'last_topic').first()

    if not enrollment:
        return Response(None)

    data = {
        'course_id': enrollment.course.id,
        'course_title': enrollment.course.title,
        'course_cover': enrollment.course.cover.url if enrollment.course.cover else None,
        'topic_id': enrollment.last_topic.id if enrollment.last_topic else None,
        'topic_title': enrollment.last_topic.display_title if enrollment.last_topic else None,
        'progress_percentage': enrollment.get_progress_percentage(),
        'last_accessed_at': enrollment.last_accessed_at
    }

    return Response(data)


# =============================================
# Progress Tracking Views
# =============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def course_progress(request, course_id):
    """
    Get full course progress summary.
    GET /api/courses/{id}/progress/
    """
    student = get_student_from_user(request.user)
    if not student:
        return Response({'error': 'Student not found'}, status=400)

    enrollment = get_object_or_404(
        CourseEnrollment,
        student=student,
        course_id=course_id
    )

    progress_records = TopicProgress.objects.filter(
        enrollment=enrollment
    ).select_related('topic')

    total_topics = enrollment.course.topics.filter(is_required=True).count()
    completed_topics = progress_records.filter(status='completed').count()
    in_progress_topics = progress_records.filter(status='in_progress').count()
    total_time = progress_records.aggregate(
        total=Sum('time_spent_seconds')
    )['total'] or 0

    data = {
        'enrollment_id': enrollment.id,
        'course_id': enrollment.course.id,
        'course_title': enrollment.course.title,
        'status': enrollment.status,
        'enrolled_at': enrollment.enrolled_at,
        'completed_at': enrollment.completed_at,
        'progress_percentage': enrollment.get_progress_percentage(),
        'total_topics': total_topics,
        'completed_topics': completed_topics,
        'in_progress_topics': in_progress_topics,
        'not_started_topics': total_topics - completed_topics - in_progress_topics,
        'total_time_spent_seconds': total_time,
        'topic_progress': TopicProgressSerializer(progress_records, many=True).data
    }

    return Response(data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def topic_start(request, topic_id):
    """
    Mark topic as started.
    POST /api/progress/topic/{id}/start/
    """
    # Skip tracking for Admin/Teacher - just return success
    if request.user.role in ['Admin', 'Teacher']:
        return Response({'status': 'in_progress', 'is_unlocked': True, 'skipped': True})

    student = get_student_from_user(request.user)
    if not student:
        return Response({'error': 'Student not found'}, status=400)

    topic = get_object_or_404(Topic, id=topic_id)

    # Check LessonPlan access first, then manual enrollment
    has_lp_access = has_lessonplan_access(student, topic)

    enrollment = CourseEnrollment.objects.filter(
        student=student,
        course=topic.book,
        status='active'
    ).first()

    if not has_lp_access and not enrollment:
        return Response(
            {'error': 'You do not have access to this topic'},
            status=status.HTTP_403_FORBIDDEN
        )

    # Auto-create enrollment for progress tracking
    if has_lp_access and not enrollment:
        enrollment = get_or_create_auto_enrollment(student, topic.book)

    # Get or create progress record
    progress, created = TopicProgress.objects.get_or_create(
        enrollment=enrollment,
        topic=topic
    )

    # Check if unlocked
    if not progress.is_unlocked():
        return Response(
            {'error': 'Topic is locked. Complete previous topics first.'},
            status=status.HTTP_403_FORBIDDEN
        )

    progress.mark_started()

    return Response(TopicProgressSerializer(progress).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def topic_complete(request, topic_id):
    """
    Mark topic as completed.
    POST /api/progress/topic/{id}/complete/
    """
    # Skip tracking for Admin/Teacher - just return success
    if request.user.role in ['Admin', 'Teacher']:
        return Response({'status': 'completed', 'skipped': True})

    student = get_student_from_user(request.user)
    if not student:
        return Response({'error': 'Student not found'}, status=400)

    topic = get_object_or_404(Topic, id=topic_id)

    # Check LessonPlan access first, then manual enrollment
    has_lp_access = has_lessonplan_access(student, topic)

    enrollment = CourseEnrollment.objects.filter(
        student=student,
        course=topic.book,
        status='active'
    ).first()

    if not has_lp_access and not enrollment:
        return Response(
            {'error': 'You do not have access to this topic'},
            status=status.HTTP_403_FORBIDDEN
        )

    # Auto-create enrollment for progress tracking
    if has_lp_access and not enrollment:
        enrollment = get_or_create_auto_enrollment(student, topic.book)

    progress, created = TopicProgress.objects.get_or_create(
        enrollment=enrollment,
        topic=topic
    )

    progress.mark_completed()

    # Check if course is complete (for LessonPlan, check accessible topics only)
    if has_lp_access:
        accessible_topic_ids = get_accessible_topics_for_student(student, topic.book)
        total_required = len(accessible_topic_ids)
        completed = TopicProgress.objects.filter(
            enrollment=enrollment,
            topic_id__in=accessible_topic_ids,
            status='completed'
        ).count()
    else:
        total_required = enrollment.course.topics.filter(is_required=True).count()
        completed = TopicProgress.objects.filter(
            enrollment=enrollment,
            status='completed'
        ).count()

    course_completed = completed >= total_required if total_required > 0 else False

    if course_completed and enrollment.status != 'completed':
        enrollment.mark_completed()

    return Response({
        'progress': TopicProgressSerializer(progress).data,
        'course_completed': course_completed
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def topic_heartbeat(request, topic_id):
    """
    Update time spent on topic (periodic heartbeat).
    POST /api/progress/topic/{id}/heartbeat/
    Body: { "seconds": 30 }
    """
    # Skip tracking for Admin/Teacher - just return success
    if request.user.role in ['Admin', 'Teacher']:
        return Response({'time_spent_seconds': 0, 'skipped': True})

    student = get_student_from_user(request.user)
    if not student:
        return Response({'error': 'Student not found'}, status=400)

    topic = get_object_or_404(Topic, id=topic_id)
    seconds = request.data.get('seconds', 30)

    # Check LessonPlan access first, then manual enrollment
    has_lp_access = has_lessonplan_access(student, topic)

    enrollment = CourseEnrollment.objects.filter(
        student=student,
        course=topic.book,
        status='active'
    ).first()

    if not has_lp_access and not enrollment:
        return Response(
            {'error': 'You do not have access to this topic'},
            status=status.HTTP_403_FORBIDDEN
        )

    # Auto-create enrollment for progress tracking
    if has_lp_access and not enrollment:
        enrollment = get_or_create_auto_enrollment(student, topic.book)

    progress, created = TopicProgress.objects.get_or_create(
        enrollment=enrollment,
        topic=topic
    )

    # Also update last position if provided
    position = request.data.get('position')
    if position:
        progress.last_position = position

    progress.add_time(seconds)

    # Update enrollment's last accessed time
    enrollment.last_topic = topic
    enrollment.save()

    return Response({'time_spent_seconds': progress.time_spent_seconds})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def topic_content(request, topic_id):
    """
    Get full topic content.
    GET /api/topics/{id}/content/

    Access is granted if:
    - User is Admin or Teacher (full access)
    - Student has LessonPlan access (topic appears in their school/class LessonPlan)
    - Student has manual enrollment (legacy support)
    """
    topic = get_object_or_404(Topic, id=topic_id)

    # Check access (if student)
    if request.user.role == 'Student':
        student = get_student_from_user(request.user)
        if not student:
            return Response({'error': 'Student not found'}, status=400)

        # Check LessonPlan-based access first (automatic)
        has_lp_access = has_lessonplan_access(student, topic)

        # Also check legacy manual enrollment
        manual_enrollment = CourseEnrollment.objects.filter(
            student=student,
            course=topic.book,
            status='active'
        ).first()

        if not has_lp_access and not manual_enrollment:
            return Response(
                {'error': 'You do not have access to this topic. It must be in your class lesson plan.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Auto-create enrollment for LessonPlan access (for progress tracking)
        if has_lp_access and not manual_enrollment:
            manual_enrollment = get_or_create_auto_enrollment(student, topic.book)

        # Check if topic is unlocked
        progress, _ = TopicProgress.objects.get_or_create(
            enrollment=manual_enrollment,
            topic=topic
        )
        if not progress.is_unlocked():
            return Response(
                {'error': 'Topic is locked'},
                status=status.HTTP_403_FORBIDDEN
            )

    serializer = TopicContentSerializer(topic)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def topic_siblings(request, topic_id):
    """
    Get previous and next topics for navigation.
    GET /api/topics/{id}/siblings/
    """
    topic = get_object_or_404(Topic, id=topic_id)

    prev_topic = topic.get_previous_sibling()
    next_topic = topic.get_next_sibling()

    # If no next sibling, try to get first child of next chapter
    if not next_topic and topic.parent:
        next_chapter = topic.parent.get_next_sibling()
        if next_chapter:
            children = next_chapter.get_children()
            next_topic = children.first() if children.exists() else None

    data = {
        'previous': {
            'id': prev_topic.id,
            'title': prev_topic.display_title
        } if prev_topic else None,
        'next': {
            'id': next_topic.id,
            'title': next_topic.display_title
        } if next_topic else None
    }

    return Response(data)


# =============================================
# Progress Dashboard
# =============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def progress_dashboard(request):
    """
    Get student's overall progress dashboard.
    GET /api/progress/dashboard/
    """
    student = get_student_from_user(request.user)
    if not student:
        return Response({'error': 'Student not found'}, status=400)

    enrollments = CourseEnrollment.objects.filter(student=student)

    total_courses = enrollments.count()
    completed_courses = enrollments.filter(status='completed').count()
    in_progress_courses = enrollments.filter(status='active').count()

    # Aggregate progress data
    progress_data = TopicProgress.objects.filter(
        enrollment__student=student
    )

    total_time = progress_data.aggregate(
        total=Sum('time_spent_seconds')
    )['total'] or 0

    total_topics_completed = progress_data.filter(status='completed').count()

    # Quiz stats
    quiz_attempts = QuizAttempt.objects.filter(
        enrollment__student=student,
        completed_at__isnull=False
    )

    total_quizzes_passed = quiz_attempts.filter(passed=True).count()
    avg_score = quiz_attempts.aggregate(avg=Avg('score'))['avg'] or 0

    # Recent activity (last 10 topic completions)
    recent = progress_data.filter(
        completed_at__isnull=False
    ).order_by('-completed_at')[:10]

    recent_activity = [
        {
            'topic_id': p.topic.id,
            'topic_title': p.topic.display_title,
            'course_title': p.enrollment.course.title,
            'completed_at': p.completed_at,
            'time_spent_seconds': p.time_spent_seconds
        }
        for p in recent
    ]

    data = {
        'total_courses': total_courses,
        'completed_courses': completed_courses,
        'in_progress_courses': in_progress_courses,
        'total_time_spent_seconds': total_time,
        'total_topics_completed': total_topics_completed,
        'total_quizzes_passed': total_quizzes_passed,
        'average_quiz_score': round(avg_score, 1),
        'recent_activity': recent_activity
    }

    return Response(data)


# =============================================
# Quiz Views (Student)
# =============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def quiz_detail(request, quiz_id):
    """
    Get quiz with questions (for taking).
    GET /api/quizzes/{id}/
    """
    quiz = get_object_or_404(Quiz, id=quiz_id, is_active=True)

    # Check enrollment
    if request.user.role == 'Student':
        student = get_student_from_user(request.user)
        if not student:
            return Response({'error': 'Student not found'}, status=400)

        enrollment = CourseEnrollment.objects.filter(
            student=student,
            course=quiz.topic.book,
            status='active'
        ).first()

        if not enrollment:
            return Response(
                {'error': 'You must be enrolled in this course'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Check attempt limit
        attempt_count = QuizAttempt.objects.filter(
            enrollment=enrollment,
            quiz=quiz
        ).count()

        if attempt_count >= quiz.max_attempts:
            return Response(
                {'error': f'Maximum attempts ({quiz.max_attempts}) reached'},
                status=status.HTTP_403_FORBIDDEN
            )

    serializer = QuizSerializer(quiz)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def quiz_start(request, quiz_id):
    """
    Start a quiz attempt.
    POST /api/quizzes/{id}/start/
    """
    quiz = get_object_or_404(Quiz, id=quiz_id, is_active=True)
    student = get_student_from_user(request.user)

    if not student:
        return Response({'error': 'Student not found'}, status=400)

    enrollment = get_object_or_404(
        CourseEnrollment,
        student=student,
        course=quiz.topic.book,
        status='active'
    )

    # Check attempt limit
    attempt_count = QuizAttempt.objects.filter(
        enrollment=enrollment,
        quiz=quiz
    ).count()

    if attempt_count >= quiz.max_attempts:
        return Response(
            {'error': f'Maximum attempts ({quiz.max_attempts}) reached'},
            status=status.HTTP_403_FORBIDDEN
        )

    # Create new attempt
    attempt = QuizAttempt.objects.create(
        enrollment=enrollment,
        quiz=quiz
    )

    return Response({
        'attempt_id': attempt.id,
        'attempt_number': attempt.get_attempt_number(),
        'started_at': attempt.started_at,
        'time_limit_minutes': quiz.time_limit_minutes
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def quiz_submit(request, quiz_id):
    """
    Submit quiz answers.
    POST /api/quizzes/{id}/submit/
    Body: { "attempt_id": 1, "answers": [{"question_id": 1, "selected_choices": [1, 2]}] }
    """
    quiz = get_object_or_404(Quiz, id=quiz_id)
    student = get_student_from_user(request.user)

    if not student:
        return Response({'error': 'Student not found'}, status=400)

    attempt_id = request.data.get('attempt_id')
    answers = request.data.get('answers', [])

    attempt = get_object_or_404(
        QuizAttempt,
        id=attempt_id,
        quiz=quiz,
        enrollment__student=student,
        completed_at__isnull=True  # Not already submitted
    )

    # Check time limit
    if quiz.time_limit_minutes:
        elapsed = (timezone.now() - attempt.started_at).total_seconds()
        if elapsed > (quiz.time_limit_minutes * 60 + 60):  # +60s grace period
            return Response(
                {'error': 'Time limit exceeded'},
                status=status.HTTP_400_BAD_REQUEST
            )

    # Submit and grade
    attempt.submit(answers)

    serializer = QuizAttemptSerializer(attempt)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def quiz_attempt_detail(request, attempt_id):
    """
    Get quiz attempt results.
    GET /api/quizzes/attempts/{id}/
    """
    student = get_student_from_user(request.user)

    if request.user.role == 'Student':
        if not student:
            return Response({'error': 'Student not found'}, status=400)

        attempt = get_object_or_404(
            QuizAttempt,
            id=attempt_id,
            enrollment__student=student
        )
    else:
        attempt = get_object_or_404(QuizAttempt, id=attempt_id)

    serializer = QuizAttemptSerializer(attempt)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def topic_quizzes(request, topic_id):
    """
    Get quizzes for a topic.
    GET /api/topics/{id}/quizzes/
    """
    topic = get_object_or_404(Topic, id=topic_id)
    quizzes = Quiz.objects.filter(topic=topic, is_active=True)

    student = get_student_from_user(request.user)

    data = []
    for quiz in quizzes:
        quiz_data = {
            'id': quiz.id,
            'title': quiz.title,
            'description': quiz.description,
            'passing_score': quiz.passing_score,
            'time_limit_minutes': quiz.time_limit_minutes,
            'max_attempts': quiz.max_attempts,
            'total_points': quiz.get_total_points(),
            'questions_count': quiz.questions.count()
        }

        if student:
            enrollment = CourseEnrollment.objects.filter(
                student=student,
                course=topic.book
            ).first()

            if enrollment:
                attempts = QuizAttempt.objects.filter(
                    enrollment=enrollment,
                    quiz=quiz
                )
                quiz_data['attempts_used'] = attempts.count()
                quiz_data['best_score'] = attempts.aggregate(
                    best=models.Max('score')
                )['best']
                quiz_data['passed'] = attempts.filter(passed=True).exists()

        data.append(quiz_data)

    return Response(data)


# =============================================
# Teacher Progress Views
# =============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminOrTeacher])
def teacher_students_progress(request):
    """
    Get progress for students in teacher's classes.
    Teachers see students from schools/classes they've created LessonPlans for.
    Admins see all students.
    GET /api/courses/teacher/students-progress/
    Query params:
        - school_id: Filter by school
        - student_class: Filter by class
        - book_id: Filter by book/course
    """
    # Get filter parameters
    school_id = request.query_params.get('school_id')
    student_class = request.query_params.get('student_class')
    book_id = request.query_params.get('book_id')

    # For teachers, get schools/classes from their LessonPlans
    if request.user.role == 'Teacher':
        teacher_lesson_plans = LessonPlan.objects.filter(teacher=request.user)
        school_class_pairs = teacher_lesson_plans.values_list(
            'school_id', 'student_class'
        ).distinct()

        # Build Q filter for students
        q_filter = Q()
        for school, cls in school_class_pairs:
            q_filter |= Q(school_id=school, student_class=cls)

        if not q_filter:
            return Response([])

        students = Student.objects.filter(q_filter)
    else:
        # Admin sees all students
        students = Student.objects.all()

    # Apply additional filters
    if school_id:
        students = students.filter(school_id=school_id)
    if student_class:
        students = students.filter(student_class=student_class)

    students = students.select_related('school', 'user')

    data = []
    for student in students:
        student_data = {
            'student_id': student.id,
            'student_name': student.name,
            'school_id': student.school_id,
            'school_name': student.school.name if student.school else None,
            'student_class': student.student_class,
            'courses': []
        }

        # Get enrollments
        enrollments = CourseEnrollment.objects.filter(
            student=student
        ).select_related('course', 'last_topic')

        if book_id:
            enrollments = enrollments.filter(course_id=book_id)

        for enrollment in enrollments:
            # Get progress stats
            progress_records = TopicProgress.objects.filter(enrollment=enrollment)
            total_topics = enrollment.course.topics.filter(is_required=True).count()
            completed = progress_records.filter(status='completed').count()
            in_progress = progress_records.filter(status='in_progress').count()
            total_time = progress_records.aggregate(total=Sum('time_spent_seconds'))['total'] or 0

            # Get quiz stats
            quiz_attempts = QuizAttempt.objects.filter(
                enrollment=enrollment,
                completed_at__isnull=False
            )
            quizzes_passed = quiz_attempts.filter(passed=True).count()
            avg_score = quiz_attempts.aggregate(avg=Avg('score'))['avg'] or 0

            student_data['courses'].append({
                'course_id': enrollment.course_id,
                'course_title': enrollment.course.title,
                'status': enrollment.status,
                'enrolled_at': enrollment.enrolled_at,
                'last_accessed_at': enrollment.last_accessed_at,
                'progress_percentage': enrollment.get_progress_percentage(),
                'total_topics': total_topics,
                'completed_topics': completed,
                'in_progress_topics': in_progress,
                'total_time_seconds': total_time,
                'quizzes_passed': quizzes_passed,
                'avg_quiz_score': round(avg_score, 1) if avg_score else 0,
            })

        data.append(student_data)

    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminOrTeacher])
def teacher_class_overview(request):
    """
    Get overview of classes the teacher is responsible for.
    GET /api/courses/teacher/class-overview/
    """
    if request.user.role == 'Teacher':
        # Get unique school/class combinations from teacher's LessonPlans
        lesson_plans = LessonPlan.objects.filter(
            teacher=request.user
        ).select_related('school')

        school_class_pairs = lesson_plans.values(
            'school_id', 'school__name', 'student_class'
        ).distinct()
    else:
        # Admin sees all school/class combinations
        from students.models import School
        school_class_pairs = Student.objects.values(
            'school_id', 'school__name', 'student_class'
        ).distinct()

    data = []
    for pair in school_class_pairs:
        # Count students in this school/class
        student_count = Student.objects.filter(
            school_id=pair['school_id'],
            student_class=pair['student_class']
        ).count()

        # Get topics planned for this class
        planned_topics = LessonPlan.objects.filter(
            school_id=pair['school_id'],
            student_class=pair['student_class']
        ).values_list('planned_topics', flat=True)

        topic_count = Topic.objects.filter(
            planned_lessons__school_id=pair['school_id'],
            planned_lessons__student_class=pair['student_class']
        ).distinct().count()

        data.append({
            'school_id': pair['school_id'],
            'school_name': pair['school__name'],
            'student_class': pair['student_class'],
            'student_count': student_count,
            'planned_topic_count': topic_count,
        })

    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminOrTeacher])
def export_progress_csv(request):
    """
    Export student progress as CSV.
    GET /api/courses/export/progress-csv/
    Query params:
        - school_id: Filter by school
        - student_class: Filter by class
        - book_id: Filter by book/course
    """
    # Get filter parameters
    school_id = request.query_params.get('school_id')
    student_class = request.query_params.get('student_class')
    book_id = request.query_params.get('book_id')

    # Build student queryset
    if request.user.role == 'Teacher':
        teacher_lesson_plans = LessonPlan.objects.filter(teacher=request.user)
        school_class_pairs = teacher_lesson_plans.values_list(
            'school_id', 'student_class'
        ).distinct()

        q_filter = Q()
        for school, cls in school_class_pairs:
            q_filter |= Q(school_id=school, student_class=cls)

        if not q_filter:
            return HttpResponse('No students found', content_type='text/plain')

        students = Student.objects.filter(q_filter)
    else:
        students = Student.objects.all()

    if school_id:
        students = students.filter(school_id=school_id)
    if student_class:
        students = students.filter(student_class=student_class)

    students = students.select_related('school', 'user')

    # Create CSV
    output = StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow([
        'Student Name', 'School', 'Class', 'Course', 'Status',
        'Progress %', 'Completed Topics', 'Total Topics',
        'Time Spent (minutes)', 'Quizzes Passed', 'Avg Quiz Score',
        'Last Accessed'
    ])

    # Data rows
    for student in students:
        enrollments = CourseEnrollment.objects.filter(
            student=student
        ).select_related('course')

        if book_id:
            enrollments = enrollments.filter(course_id=book_id)

        for enrollment in enrollments:
            progress_records = TopicProgress.objects.filter(enrollment=enrollment)
            total_topics = enrollment.course.topics.filter(is_required=True).count()
            completed = progress_records.filter(status='completed').count()
            total_time = progress_records.aggregate(total=Sum('time_spent_seconds'))['total'] or 0

            quiz_attempts = QuizAttempt.objects.filter(
                enrollment=enrollment,
                completed_at__isnull=False
            )
            quizzes_passed = quiz_attempts.filter(passed=True).count()
            avg_score = quiz_attempts.aggregate(avg=Avg('score'))['avg'] or 0

            writer.writerow([
                student.name,
                student.school.name if student.school else '',
                student.student_class,
                enrollment.course.title,
                enrollment.status,
                enrollment.get_progress_percentage(),
                completed,
                total_topics,
                round(total_time / 60, 1),
                quizzes_passed,
                round(avg_score, 1) if avg_score else 0,
                enrollment.last_accessed_at.strftime('%Y-%m-%d %H:%M') if enrollment.last_accessed_at else '',
            ])

    # Create response
    response = HttpResponse(output.getvalue(), content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="student_progress.csv"'
    return response


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminOrTeacher])
def student_detail_progress(request, student_id):
    """
    Get detailed progress for a specific student.
    GET /api/courses/teacher/student/{student_id}/progress/
    """
    student = get_object_or_404(Student, id=student_id)

    # Check teacher has access to this student
    if request.user.role == 'Teacher':
        has_access = LessonPlan.objects.filter(
            teacher=request.user,
            school=student.school,
            student_class=student.student_class
        ).exists()
        if not has_access:
            return Response(
                {'error': 'You do not have access to this student'},
                status=status.HTTP_403_FORBIDDEN
            )

    data = {
        'student_id': student.id,
        'student_name': student.name,
        'school': student.school.name if student.school else None,
        'student_class': student.student_class,
        'enrollments': []
    }

    enrollments = CourseEnrollment.objects.filter(
        student=student
    ).select_related('course', 'last_topic')

    for enrollment in enrollments:
        # Get all topic progress
        progress_records = TopicProgress.objects.filter(
            enrollment=enrollment
        ).select_related('topic')

        topic_progress = []
        for p in progress_records:
            topic_progress.append({
                'topic_id': p.topic_id,
                'topic_title': p.topic.display_title,
                'topic_type': p.topic.type,
                'status': p.status,
                'started_at': p.started_at,
                'completed_at': p.completed_at,
                'time_spent_seconds': p.time_spent_seconds,
            })

        # Get quiz attempts
        quiz_attempts = QuizAttempt.objects.filter(
            enrollment=enrollment
        ).select_related('quiz')

        quizzes = []
        for attempt in quiz_attempts:
            quizzes.append({
                'quiz_id': attempt.quiz_id,
                'quiz_title': attempt.quiz.title,
                'score': attempt.score,
                'passed': attempt.passed,
                'started_at': attempt.started_at,
                'completed_at': attempt.completed_at,
            })

        data['enrollments'].append({
            'enrollment_id': enrollment.id,
            'course_id': enrollment.course_id,
            'course_title': enrollment.course.title,
            'status': enrollment.status,
            'enrolled_at': enrollment.enrolled_at,
            'completed_at': enrollment.completed_at,
            'progress_percentage': enrollment.get_progress_percentage(),
            'topic_progress': topic_progress,
            'quiz_attempts': quizzes,
        })

    return Response(data)


# =============================================
# Quiz Builder Views (Admin/Teacher)
# =============================================

class QuizViewSet(viewsets.ModelViewSet):
    """ViewSet for quiz CRUD operations (Admin/Teacher only)."""
    serializer_class = QuizCreateSerializer
    permission_classes = [IsAuthenticated, IsAdminOrTeacher]

    def get_queryset(self):
        queryset = Quiz.objects.all().prefetch_related(
            'questions__choices'
        ).select_related('topic')

        # Filter by topic if provided
        topic_id = self.request.query_params.get('topic_id')
        if topic_id:
            queryset = queryset.filter(topic_id=topic_id)

        return queryset

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def add_question(self, request, pk=None):
        """Add a question to quiz."""
        quiz = self.get_object()
        serializer = QuizQuestionCreateSerializer(data=request.data)

        if serializer.is_valid():
            serializer.save(quiz=quiz)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['put', 'delete'], url_path='questions/(?P<question_id>[^/.]+)')
    def manage_question(self, request, pk=None, question_id=None):
        """Update or delete a question."""
        quiz = self.get_object()
        question = get_object_or_404(QuizQuestion, id=question_id, quiz=quiz)

        if request.method == 'DELETE':
            question.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

        serializer = QuizQuestionCreateSerializer(question, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], url_path='by-topic/(?P<topic_id>[^/.]+)')
    def by_topic(self, request, topic_id=None):
        """Get quizzes for a specific topic."""
        quizzes = self.get_queryset().filter(topic_id=topic_id)
        serializer = self.get_serializer(quizzes, many=True)
        return Response(serializer.data)


# Import models for aggregate query
from django.db import models
