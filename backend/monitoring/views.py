# ============================================
# MONITORING VIEWS
# ============================================

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Count, Q, Prefetch
from datetime import datetime, timedelta
from decimal import Decimal

from .models import (
    MonitoringVisit,
    EvaluationFormTemplate,
    EvaluationFormField,
    TeacherEvaluation,
    EvaluationResponse,
)
from .serializers import (
    MonitoringVisitSerializer,
    MonitoringVisitDetailSerializer,
    EvaluationFormTemplateSerializer,
    EvaluationFormTemplateListSerializer,
    TeacherEvaluationSerializer,
    TeacherEvaluationListSerializer,
    EvaluationResponseWriteSerializer,
)
from students.models import CustomUser, School

import logging
logger = logging.getLogger(__name__)


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
    POST /api/monitoring/visits/        — Plan a new visit
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

        serializer = MonitoringVisitSerializer(visits, many=True)
        return Response(serializer.data)

    # POST — Plan a new visit
    serializer = MonitoringVisitSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)

    school = serializer.validated_data['school']
    visit_date = serializer.validated_data['visit_date']

    # Validate working day
    if hasattr(school, 'is_working_day') and not school.is_working_day(visit_date):
        return Response(
            {'error': f'{visit_date} is not a working day for {school.name}'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # BDM is always the requesting user
    bdm = request.user if is_bdm(request.user) else serializer.validated_data.get('bdm', request.user)

    try:
        serializer.save(bdm=bdm)
    except Exception as e:
        if 'unique' in str(e).lower():
            return Response(
                {'error': 'A visit already exists for this school on this date'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        raise

    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def visit_detail(request, visit_id):
    """
    GET    /api/monitoring/visits/<id>/   — Visit detail with evaluations
    PUT    /api/monitoring/visits/<id>/   — Update visit
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
                queryset=TeacherEvaluation.objects.select_related('teacher', 'template'),
            )
        ).get(id=visit_id)
    except MonitoringVisit.DoesNotExist:
        return Response({'error': 'Visit not found'}, status=status.HTTP_404_NOT_FOUND)

    # BDM can only access own visits
    if is_bdm(request.user) and visit.bdm != request.user:
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'GET':
        serializer = MonitoringVisitDetailSerializer(visit)
        return Response(serializer.data)

    if request.method == 'PUT':
        serializer = MonitoringVisitSerializer(visit, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)

        # Re-validate working day if date changed
        new_date = serializer.validated_data.get('visit_date')
        if new_date and new_date != visit.visit_date:
            if hasattr(visit.school, 'is_working_day') and not visit.school.is_working_day(new_date):
                return Response(
                    {'error': f'{new_date} is not a working day for {visit.school.name}'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        serializer.save()
        return Response(serializer.data)

    # DELETE — cancel
    if visit.status == 'completed':
        return Response(
            {'error': 'Cannot delete a completed visit'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    visit.delete()
    return Response({'message': 'Visit deleted'}, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def visit_start(request, visit_id):
    """POST /api/monitoring/visits/<id>/start/ — Mark visit as in_progress"""
    if not is_admin_or_bdm(request.user):
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

    try:
        visit = MonitoringVisit.objects.get(id=visit_id)
    except MonitoringVisit.DoesNotExist:
        return Response({'error': 'Visit not found'}, status=status.HTTP_404_NOT_FOUND)

    if is_bdm(request.user) and visit.bdm != request.user:
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

    if visit.status != 'planned':
        return Response(
            {'error': f'Cannot start a visit with status "{visit.status}"'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    visit.status = 'in_progress'
    visit.start_time = timezone.now().time()
    visit.save(update_fields=['status', 'start_time', 'updated_at'])

    return Response({
        'message': 'Visit started',
        'visit': MonitoringVisitSerializer(visit).data,
    })


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
    """GET /api/monitoring/visits/<id>/teachers/ — Teachers at the visit's school"""
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
    ).values('id', 'username', 'first_name', 'last_name')

    # Check which teachers already have an evaluation for this visit
    evaluated_ids = set(
        visit.evaluations.values_list('teacher_id', flat=True)
    )

    teacher_data = [
        {
            'id': t['id'],
            'name': f"{t['first_name']} {t['last_name']}".strip() or t['username'],
            'already_evaluated': t['id'] in evaluated_ids,
        }
        for t in teachers
    ]

    return Response(teacher_data)


# ============================================
# SCHOOL WORKING DAYS
# ============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def school_working_days(request, school_id):
    """
    GET /api/monitoring/schools/<id>/working-days/
    Returns the school's assigned_days and upcoming valid visit dates.
    """
    if not is_admin_or_bdm(request.user):
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

    try:
        school = School.objects.get(id=school_id, is_active=True)
    except School.DoesNotExist:
        return Response({'error': 'School not found'}, status=status.HTTP_404_NOT_FOUND)

    assigned_days = school.assigned_days or []

    # Generate next 30 valid working dates
    upcoming_dates = []
    current = timezone.now().date()
    for i in range(60):  # look ahead 60 days to find 30 valid ones
        check_date = current + timedelta(days=i)
        if check_date.weekday() in assigned_days:
            upcoming_dates.append(check_date.isoformat())
        if len(upcoming_dates) >= 30:
            break

    # Use provided times or default to 8:00 AM - 3:00 PM
    if school.start_time:
        start_time = school.start_time
    else:
        start_time = datetime.strptime("08:00", "%H:%M").time()
    
    if school.end_time:
        end_time = school.end_time
    else:
        end_time = datetime.strptime("15:00", "%H:%M").time()

    return Response({
        'school_id': school.id,
        'school_name': school.name,
        'assigned_days': assigned_days,
        'start_time': str(start_time),
        'end_time': str(end_time),
        'upcoming_working_dates': upcoming_dates,
    })


# ============================================
# TEMPLATE ENDPOINTS
# ============================================

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def template_list(request):
    """
    GET  /api/monitoring/templates/  — List form templates
    POST /api/monitoring/templates/  — Create template (Admin only)
    """
    if not is_admin_or_bdm(request.user):
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'GET':
        templates = EvaluationFormTemplate.objects.filter(is_active=True)
        if request.query_params.get('detail') == 'true':
            templates = templates.prefetch_related('fields')
            serializer = EvaluationFormTemplateSerializer(templates, many=True)
        else:
            serializer = EvaluationFormTemplateListSerializer(templates, many=True)
        return Response(serializer.data)

    # POST — Admin only
    if not is_admin(request.user):
        return Response({'error': 'Only Admin can create templates'}, status=status.HTTP_403_FORBIDDEN)

    data = request.data
    fields_data = data.pop('fields', [])

    serializer = EvaluationFormTemplateSerializer(data=data)
    serializer.is_valid(raise_exception=True)
    template = serializer.save(created_by=request.user)

    # Create fields
    for i, field_data in enumerate(fields_data):
        field_data['order'] = field_data.get('order', i)
        EvaluationFormField.objects.create(template=template, **field_data)

    # Re-fetch with fields
    template.refresh_from_db()
    return Response(
        EvaluationFormTemplateSerializer(template).data,
        status=status.HTTP_201_CREATED,
    )


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def template_detail(request, template_id):
    """
    GET    /api/monitoring/templates/<id>/  — Template detail with fields
    PUT    /api/monitoring/templates/<id>/  — Update template (Admin)
    DELETE /api/monitoring/templates/<id>/  — Deactivate template (Admin)
    """
    if not is_admin_or_bdm(request.user):
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

    try:
        template = EvaluationFormTemplate.objects.prefetch_related('fields').get(id=template_id)
    except EvaluationFormTemplate.DoesNotExist:
        return Response({'error': 'Template not found'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = EvaluationFormTemplateSerializer(template)
        return Response(serializer.data)

    if not is_admin(request.user):
        return Response({'error': 'Only Admin can modify templates'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'PUT':
        data = request.data
        fields_data = data.pop('fields', None)

        serializer = EvaluationFormTemplateSerializer(template, data=data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        # Update fields if provided
        if fields_data is not None:
            template.fields.all().delete()
            for i, field_data in enumerate(fields_data):
                field_data['order'] = field_data.get('order', i)
                EvaluationFormField.objects.create(template=template, **field_data)

        template.refresh_from_db()
        return Response(EvaluationFormTemplateSerializer(template).data)

    # DELETE — soft deactivate
    template.is_active = False
    template.save(update_fields=['is_active', 'updated_at'])
    return Response({'message': 'Template deactivated'})


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
        evaluations = visit.evaluations.select_related('teacher', 'template')
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
    template_id = data.get('template_id')
    responses_data = data.get('responses', [])

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

    # Validate template
    try:
        template = EvaluationFormTemplate.objects.prefetch_related('fields').get(
            id=template_id, is_active=True,
        )
    except EvaluationFormTemplate.DoesNotExist:
        return Response({'error': 'Template not found'}, status=status.HTTP_404_NOT_FOUND)

    # Check for duplicate
    if TeacherEvaluation.objects.filter(visit=visit, teacher=teacher).exists():
        return Response(
            {'error': 'Evaluation already exists for this teacher in this visit'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Validate required fields
    required_field_ids = set(
        template.fields.filter(is_required=True).values_list('id', flat=True)
    )
    provided_field_ids = {r['field_id'] for r in responses_data}
    missing = required_field_ids - provided_field_ids
    if missing:
        missing_labels = list(
            template.fields.filter(id__in=missing).values_list('label', flat=True)
        )
        return Response(
            {'error': f'Missing required fields: {", ".join(missing_labels)}'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Create evaluation
    evaluation = TeacherEvaluation.objects.create(
        visit=visit,
        teacher=teacher,
        template=template,
        remarks=data.get('remarks', ''),
        areas_of_improvement=data.get('areas_of_improvement', ''),
        teacher_strengths=data.get('teacher_strengths', ''),
    )

    # Create responses
    field_map = {f.id: f for f in template.fields.all()}
    for resp_data in responses_data:
        field = field_map.get(resp_data['field_id'])
        if not field:
            continue

        numeric_value = resp_data.get('numeric_value')
        if numeric_value is not None:
            numeric_value = Decimal(str(numeric_value))

        EvaluationResponse.objects.create(
            evaluation=evaluation,
            field=field,
            value=str(resp_data.get('value', '')),
            numeric_value=numeric_value,
        )

    # Calculate score
    evaluation.calculate_score()

    serializer = TeacherEvaluationSerializer(evaluation)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def evaluation_detail(request, evaluation_id):
    """
    GET /api/monitoring/evaluations/<id>/  — Evaluation detail
    PUT /api/monitoring/evaluations/<id>/  — Update evaluation
    """
    if not is_admin_or_bdm(request.user):
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

    try:
        evaluation = TeacherEvaluation.objects.select_related(
            'visit__bdm', 'teacher', 'template'
        ).prefetch_related(
            'responses__field'
        ).get(id=evaluation_id)
    except TeacherEvaluation.DoesNotExist:
        return Response({'error': 'Evaluation not found'}, status=status.HTTP_404_NOT_FOUND)

    if is_bdm(request.user) and evaluation.visit.bdm != request.user:
        return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'GET':
        serializer = TeacherEvaluationSerializer(evaluation)
        return Response(serializer.data)

    # PUT — update remarks and responses
    data = request.data

    # Update qualitative fields
    if 'remarks' in data:
        evaluation.remarks = data['remarks']
    if 'areas_of_improvement' in data:
        evaluation.areas_of_improvement = data['areas_of_improvement']
    if 'teacher_strengths' in data:
        evaluation.teacher_strengths = data['teacher_strengths']
    evaluation.save()

    # Update responses if provided
    responses_data = data.get('responses')
    if responses_data:
        for resp_data in responses_data:
            field_id = resp_data.get('field_id')
            if not field_id:
                continue

            numeric_value = resp_data.get('numeric_value')
            if numeric_value is not None:
                numeric_value = Decimal(str(numeric_value))

            EvaluationResponse.objects.update_or_create(
                evaluation=evaluation,
                field_id=field_id,
                defaults={
                    'value': str(resp_data.get('value', '')),
                    'numeric_value': numeric_value,
                },
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
        planned=Count('id', filter=Q(status='planned')),
        in_progress=Count('id', filter=Q(status='in_progress')),
        completed=Count('id', filter=Q(status='completed')),
        this_month=Count('id', filter=Q(visit_date__gte=month_start)),
        upcoming=Count('id', filter=Q(status='planned', visit_date__gte=today)),
        overdue=Count('id', filter=Q(status='planned', visit_date__lt=today)),
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
        **stats,
        **eval_stats,
    })
