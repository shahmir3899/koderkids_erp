# ============================================
# MONITORING VIEWS
# ============================================

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Count, Q, Prefetch
from decimal import Decimal

from .models import (
    MonitoringVisit,
    TeacherEvaluation,
    EvaluationQuestion,
)
from .serializers import (
    MonitoringVisitSerializer,
    MonitoringVisitDetailSerializer,
    TeacherEvaluationSerializer,
    TeacherEvaluationListSerializer,
)
from students.models import CustomUser, School

import logging
logger = logging.getLogger(__name__)


def parse_positive_int(value, default):
    try:
        parsed = int(value)
        return parsed if parsed >= 0 else default
    except (TypeError, ValueError):
        return default


# ============================================
# PERMISSION HELPERS
# ============================================

def is_bdm(user):
    return user.role == 'BDM'

def is_admin(user):
    return user.role == 'Admin'

def is_admin_or_bdm(user):
    return user.role in ['Admin', 'BDM']


# ============================================
# VISIT ENDPOINTS
# ============================================

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def visit_list(request):
    """
    GET  /api/monitoring/visits/        — List visits (BDM: own, Admin: all)
    POST /api/monitoring/visits/        — Start monitoring a school now
    """
    if not is_admin_or_bdm(request.user):
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'GET':
        visits = MonitoringVisit.objects.select_related('school', 'bdm')

        if is_bdm(request.user):
            visits = visits.filter(bdm=request.user)

        # Filters
        status_param = request.query_params.get('status')
        if status_param:
            visits = visits.filter(status=status_param)

        school_id = request.query_params.get('school')
        if school_id:
            visits = visits.filter(school_id=school_id)

        date_from = request.query_params.get('date_from')
        if date_from:
            visits = visits.filter(visit_date__gte=date_from)

        date_to = request.query_params.get('date_to')
        if date_to:
            visits = visits.filter(visit_date__lte=date_to)

        # Annotate counts to avoid N+1
        visits = visits.annotate(
            _evaluations_count=Count('evaluations', distinct=True),
        )

        paginate = request.query_params.get('paginate') == 'true'
        limit = parse_positive_int(request.query_params.get('limit'), 20)
        offset = parse_positive_int(request.query_params.get('offset'), 0)
        limit = min(max(limit, 1), 100)

        if paginate:
            total_count = visits.count()
            paged_visits = visits[offset:offset + limit]
            serializer = MonitoringVisitSerializer(paged_visits, many=True)
            next_offset = offset + limit if (offset + limit) < total_count else None
            previous_offset = max(offset - limit, 0) if offset > 0 else None
            return Response({
                'count': total_count,
                'limit': limit,
                'offset': offset,
                'next_offset': next_offset,
                'previous_offset': previous_offset,
                'results': serializer.data,
            })

        serializer = MonitoringVisitSerializer(visits, many=True)
        return Response(serializer.data)

    # POST — Start monitoring a school now (visit is created already in_progress,
    # always owned by whoever started it — Admin or BDM alike)
    serializer = MonitoringVisitSerializer(data=request.data, context={'request': request})
    serializer.is_valid(raise_exception=True)

    now = timezone.now()
    serializer.save(
        bdm=request.user,
        status='in_progress',
        visit_date=now.date(),
        start_time=now.time(),
    )
    logger.info(
        'Monitoring visit started: visit_id=%s actor_id=%s actor_role=%s school_id=%s',
        serializer.instance.id,
        request.user.id,
        request.user.role,
        serializer.instance.school_id,
    )

    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def visit_detail(request, visit_id):
    """
    GET    /api/monitoring/visits/<id>/   — Visit detail with evaluations
    PUT    /api/monitoring/visits/<id>/   — Update visit (purpose/notes)
    DELETE /api/monitoring/visits/<id>/   — Cancel visit
    """
    if not is_admin_or_bdm(request.user):
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

    try:
        visit = MonitoringVisit.objects.select_related(
            'school', 'bdm'
        ).prefetch_related(
            Prefetch(
                'evaluations',
                queryset=TeacherEvaluation.objects.select_related('teacher'),
            )
        ).get(id=visit_id)
    except MonitoringVisit.DoesNotExist:
        return Response({'error': 'Visit not found'}, status=status.HTTP_404_NOT_FOUND)

    # BDM can only access own visits
    if is_bdm(request.user) and visit.bdm != request.user:
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'GET':
        if request.query_params.get('compact') == 'true':
            evaluations_qs = visit.evaluations.all()
            evaluations_count = evaluations_qs.count()
            latest_evaluation = evaluations_qs.order_by('-submitted_at').values('submitted_at').first()
            return Response({
                'id': visit.id,
                'status': visit.status,
                'school_name': visit.school.name,
                'visit_date': visit.visit_date,
                'evaluations_count': evaluations_count,
                'evaluation_count': evaluations_count,
                'last_evaluation_submitted_at': latest_evaluation['submitted_at'] if latest_evaluation else None,
                'updated_at': visit.updated_at,
            })
        serializer = MonitoringVisitDetailSerializer(visit)
        return Response(serializer.data)

    if request.method == 'PUT':
        serializer = MonitoringVisitSerializer(visit, data=request.data, partial=True, context={'request': request})
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

    # DELETE — remove visit
    if visit.status == 'completed' and not is_admin(request.user):
        return Response(
            {'error': 'Only Admin can delete a completed visit'},
            status=status.HTTP_403_FORBIDDEN,
        )
    visit.delete()
    return Response({'message': 'Visit deleted'}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def visit_complete(request, visit_id):
    """POST /api/monitoring/visits/<id>/complete/ — Mark visit as completed"""
    if not is_admin_or_bdm(request.user):
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

    try:
        visit = MonitoringVisit.objects.get(id=visit_id)
    except MonitoringVisit.DoesNotExist:
        return Response({'error': 'Visit not found'}, status=status.HTTP_404_NOT_FOUND)

    if is_bdm(request.user) and visit.bdm != request.user:
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

    if visit.status != 'in_progress':
        return Response(
            {'error': f'Cannot complete a visit with status "{visit.status}"'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    visit.status = 'completed'
    visit.end_time = timezone.now().time()
    visit.save(update_fields=['status', 'end_time', 'updated_at'])

    return Response({
        'message': 'Visit completed',
        'visit': MonitoringVisitSerializer(visit).data,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def visit_teachers(request, visit_id):
    """GET /api/monitoring/visits/<id>/teachers/ — Active teachers at the visit's school"""
    if not is_admin_or_bdm(request.user):
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

    try:
        visit = MonitoringVisit.objects.select_related('school').get(id=visit_id)
    except MonitoringVisit.DoesNotExist:
        return Response({'error': 'Visit not found'}, status=status.HTTP_404_NOT_FOUND)

    if is_bdm(request.user) and visit.bdm != request.user:
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

    teachers = CustomUser.objects.filter(
        assigned_schools=visit.school,
        role='Teacher',
        is_active=True,
    ).distinct().values('id', 'username', 'first_name', 'last_name')

    # Check which teachers already have an evaluation for this visit
    evaluated_counts = {}
    for teacher_id in visit.evaluations.values_list('teacher_id', flat=True):
        evaluated_counts[teacher_id] = evaluated_counts.get(teacher_id, 0) + 1

    teacher_data = [
        {
            'id': t['id'],
            'name': f"{t['first_name']} {t['last_name']}".strip() or t['username'],
            'already_evaluated': t['id'] in evaluated_counts,
            'evaluation_count': evaluated_counts.get(t['id'], 0),
        }
        for t in teachers
    ]

    return Response(teacher_data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def school_teachers(request, school_id):
    """GET /api/monitoring/schools/<id>/teachers/ — Active teachers assigned to a school."""
    if not is_admin_or_bdm(request.user):
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

    try:
        school = School.objects.get(id=school_id, is_active=True)
    except School.DoesNotExist:
        return Response({'error': 'School not found'}, status=status.HTTP_404_NOT_FOUND)

    teachers = CustomUser.objects.filter(
        assigned_schools=school,
        role='Teacher',
        is_active=True,
    ).distinct().values('id', 'username', 'first_name', 'last_name')

    teacher_data = [
        {
            'id': t['id'],
            'name': f"{t['first_name']} {t['last_name']}".strip() or t['username'],
        }
        for t in teachers
    ]

    return Response(teacher_data)


# ============================================
# EVALUATION ENDPOINTS
# ============================================

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def visit_evaluations(request, visit_id):
    """
    GET  /api/monitoring/visits/<id>/evaluations/  — List evaluations for a visit
    POST /api/monitoring/visits/<id>/evaluations/  — Submit evaluation for a teacher
    """
    if not is_admin_or_bdm(request.user):
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

    try:
        visit = MonitoringVisit.objects.select_related('school').get(id=visit_id)
    except MonitoringVisit.DoesNotExist:
        return Response({'error': 'Visit not found'}, status=status.HTTP_404_NOT_FOUND)

    if is_bdm(request.user) and visit.bdm != request.user:
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'GET':
        evaluations = visit.evaluations.select_related('teacher')
        serializer = TeacherEvaluationListSerializer(evaluations, many=True)
        return Response(serializer.data)

    # POST — Submit evaluation
    if visit.status != 'in_progress':
        return Response(
            {'error': 'Visit must be in progress to submit evaluations'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    data = request.data
    teacher_id = data.get('teacher_id')
    questions_data = data.get('questions', [])

    # Validate teacher
    try:
        teacher = CustomUser.objects.get(id=teacher_id, role='Teacher', is_active=True)
    except CustomUser.DoesNotExist:
        return Response({'error': 'Teacher not found'}, status=status.HTTP_404_NOT_FOUND)

    if not teacher.assigned_schools.filter(id=visit.school_id).exists():
        return Response(
            {'error': 'Teacher is not assigned to this school'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not questions_data:
        return Response(
            {'error': 'Add at least one question before submitting.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Create evaluation
    evaluation = TeacherEvaluation.objects.create(
        visit=visit,
        teacher=teacher,
        remarks=data.get('remarks', ''),
        areas_of_improvement=data.get('areas_of_improvement', ''),
        teacher_strengths=data.get('teacher_strengths', ''),
    )

    # Create questions
    for i, q_data in enumerate(questions_data):
        question_text = (q_data.get('question_text') or '').strip()
        if not question_text:
            continue
        rating = q_data.get('rating')
        EvaluationQuestion.objects.create(
            evaluation=evaluation,
            question_text=question_text,
            answer_text=q_data.get('answer_text', ''),
            rating=rating if rating not in ('', None) else None,
            order=q_data.get('order', i),
        )

    # Calculate score
    evaluation.calculate_score()

    serializer = TeacherEvaluationSerializer(evaluation)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def evaluation_detail(request, evaluation_id):
    """
    GET    /api/monitoring/evaluations/<id>/  — Evaluation detail
    PUT    /api/monitoring/evaluations/<id>/  — Update evaluation
    DELETE /api/monitoring/evaluations/<id>/  — Delete evaluation (blocked if visit completed)
    """
    if not is_admin_or_bdm(request.user):
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

    try:
        evaluation = TeacherEvaluation.objects.select_related(
            'visit__bdm', 'teacher'
        ).prefetch_related(
            'questions'
        ).get(id=evaluation_id)
    except TeacherEvaluation.DoesNotExist:
        return Response({'error': 'Evaluation not found'}, status=status.HTTP_404_NOT_FOUND)

    if is_bdm(request.user) and evaluation.visit.bdm != request.user:
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'GET':
        serializer = TeacherEvaluationSerializer(evaluation)
        return Response(serializer.data)

    if request.method == 'DELETE':
        # Only Admin can delete; blocked if visit is completed
        if not is_admin(request.user):
            return Response({'error': 'Only Admin can delete evaluations'}, status=status.HTTP_403_FORBIDDEN)
        if evaluation.visit.status == 'completed':
            return Response(
                {'error': 'Cannot delete an evaluation from a completed visit'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        evaluation.delete()
        return Response({'message': 'Evaluation deleted'}, status=status.HTTP_200_OK)

    # PUT — update remarks and questions
    data = request.data

    # Update qualitative fields
    if 'remarks' in data:
        evaluation.remarks = data['remarks']
    if 'areas_of_improvement' in data:
        evaluation.areas_of_improvement = data['areas_of_improvement']
    if 'teacher_strengths' in data:
        evaluation.teacher_strengths = data['teacher_strengths']
    evaluation.save()

    # Replace questions wholesale if provided
    questions_data = data.get('questions')
    if questions_data is not None:
        evaluation.questions.all().delete()
        for i, q_data in enumerate(questions_data):
            question_text = (q_data.get('question_text') or '').strip()
            if not question_text:
                continue
            rating = q_data.get('rating')
            EvaluationQuestion.objects.create(
                evaluation=evaluation,
                question_text=question_text,
                answer_text=q_data.get('answer_text', ''),
                rating=rating if rating not in ('', None) else None,
                order=q_data.get('order', i),
            )

        evaluation.calculate_score()

    serializer = TeacherEvaluationSerializer(evaluation)
    return Response(serializer.data)


# ============================================
# DASHBOARD STATS
# ============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """
    GET /api/monitoring/dashboard/stats/
    Returns monitoring statistics for BDM or Admin dashboard.
    """
    if not is_admin_or_bdm(request.user):
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

    if is_bdm(request.user):
        visits = MonitoringVisit.objects.filter(bdm=request.user)
    else:
        visits = MonitoringVisit.objects.all()

    today = timezone.now().date()
    month_start = today.replace(day=1)

    # Single aggregated query
    stats = visits.aggregate(
        total=Count('id'),
        in_progress=Count('id', filter=Q(status='in_progress')),
        completed=Count('id', filter=Q(status='completed')),
        this_month=Count('id', filter=Q(visit_date__gte=month_start)),
        today=Count('id', filter=Q(visit_date=today)),
    )

    # Evaluation count
    eval_filter = Q()
    if is_bdm(request.user):
        eval_filter = Q(visit__bdm=request.user)

    eval_stats = TeacherEvaluation.objects.filter(eval_filter).aggregate(
        total_evaluations=Count('id'),
        this_month_evaluations=Count('id', filter=Q(submitted_at__date__gte=month_start)),
    )

    return Response({
        'total_visits': stats['total'],
        'in_progress': stats['in_progress'],
        'completed': stats['completed'],
        'this_month': stats['this_month'],
        'today': stats['today'],
        'evaluations_done': eval_stats['total_evaluations'],
        'this_month_evaluations': eval_stats['this_month_evaluations'],
    })
