# ============================================
# TEACHER EVALUATION VIEWS
# ============================================
# BDM Proforma and Teacher Evaluation endpoints

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.utils import timezone
from django.db.models import Avg

from .models import BDMVisitProforma, TeacherEvaluationScore
from students.models import CustomUser, School


# =============================================
# Permission Helpers
# =============================================

def is_bdm(user):
    """Check if user is a BDM."""
    return user.role == 'BDM'


def is_admin(user):
    """Check if user is an admin."""
    return user.role == 'Admin'


def is_admin_or_bdm(user):
    """Check if user is admin or BDM."""
    return user.role in ['Admin', 'BDM']


def is_teacher(user):
    """Check if user is a teacher."""
    return user.role == 'Teacher'


# =============================================
# BDM Proforma Endpoints
# =============================================

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def bdm_proforma_list(request):
    """
    List or create BDM visit proformas.

    GET /api/employees/bdm/proforma/
    Query params:
    - teacher_id: filter by teacher (optional)
    - school_id: filter by school (optional)
    - month: filter by month (optional)
    - year: filter by year (optional)

    POST /api/employees/bdm/proforma/
    Body:
    {
        "teacher_id": 123,
        "school_id": 456,
        "visit_date": "2024-01-15",
        "month": 1,
        "year": 2024,
        "discipline_rating": 4,
        "communication_rating": 4,
        "child_handling_rating": 5,
        "professionalism_rating": 4,
        "content_knowledge_rating": 4,
        "remarks": "Good progress",
        "areas_of_improvement": "Time management",
        "teacher_strengths": "Student engagement"
    }
    """
    if not is_admin_or_bdm(request.user):
        return Response(
            {'error': 'Only BDM and Admin users can access this endpoint'},
            status=status.HTTP_403_FORBIDDEN
        )

    if request.method == 'GET':
        proformas = BDMVisitProforma.objects.select_related(
            'teacher', 'school', 'bdm'
        ).all()

        # Apply filters
        teacher_id = request.query_params.get('teacher_id')
        if teacher_id:
            proformas = proformas.filter(teacher_id=teacher_id)

        school_id = request.query_params.get('school_id')
        if school_id:
            proformas = proformas.filter(school_id=school_id)

        month = request.query_params.get('month')
        if month:
            proformas = proformas.filter(month=month)

        year = request.query_params.get('year')
        if year:
            proformas = proformas.filter(year=year)

        # If BDM, only show their own proformas
        if is_bdm(request.user):
            proformas = proformas.filter(bdm=request.user)

        proforma_list = []
        for p in proformas:
            proforma_list.append({
                'id': p.id,
                'teacher_id': p.teacher.id,
                'teacher_name': p.teacher.get_full_name(),
                'school_id': p.school.id,
                'school_name': p.school.name,
                'bdm_name': p.bdm.get_full_name(),
                'visit_date': p.visit_date,
                'month': p.month,
                'year': p.year,
                'ratings': {
                    'discipline': p.discipline_rating,
                    'communication': p.communication_rating,
                    'child_handling': p.child_handling_rating,
                    'professionalism': p.professionalism_rating,
                    'content_knowledge': p.content_knowledge_rating,
                },
                'overall_score': float(p.overall_attitude_score),
                'remarks': p.remarks,
                'created_at': p.created_at,
            })

        return Response({
            'count': len(proforma_list),
            'proformas': proforma_list
        })

    elif request.method == 'POST':
        # Validate required fields
        required_fields = ['teacher_id', 'school_id', 'visit_date', 'month', 'year']
        for field in required_fields:
            if field not in request.data:
                return Response(
                    {'error': f'Missing required field: {field}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        try:
            teacher = CustomUser.objects.get(id=request.data['teacher_id'], role='Teacher')
        except CustomUser.DoesNotExist:
            return Response(
                {'error': 'Teacher not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            school = School.objects.get(id=request.data['school_id'])
        except School.DoesNotExist:
            return Response(
                {'error': 'School not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Check for existing proforma
        month = request.data['month']
        year = request.data['year']
        existing = BDMVisitProforma.objects.filter(
            teacher=teacher,
            school=school,
            month=month,
            year=year
        ).first()

        if existing:
            return Response(
                {'error': 'Proforma already exists for this teacher/school/month'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Create proforma
        proforma = BDMVisitProforma.objects.create(
            teacher=teacher,
            school=school,
            bdm=request.user,
            visit_date=request.data['visit_date'],
            month=month,
            year=year,
            discipline_rating=request.data.get('discipline_rating', 3),
            communication_rating=request.data.get('communication_rating', 3),
            child_handling_rating=request.data.get('child_handling_rating', 3),
            professionalism_rating=request.data.get('professionalism_rating', 3),
            content_knowledge_rating=request.data.get('content_knowledge_rating', 3),
            remarks=request.data.get('remarks', ''),
            areas_of_improvement=request.data.get('areas_of_improvement', ''),
            teacher_strengths=request.data.get('teacher_strengths', ''),
        )

        return Response({
            'success': True,
            'message': 'Proforma created successfully',
            'proforma': {
                'id': proforma.id,
                'teacher_name': proforma.teacher.get_full_name(),
                'school_name': proforma.school.name,
                'overall_score': float(proforma.overall_attitude_score),
            }
        }, status=status.HTTP_201_CREATED)


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def bdm_proforma_detail(request, proforma_id):
    """
    Get or update a specific proforma.

    GET /api/employees/bdm/proforma/{id}/
    PUT /api/employees/bdm/proforma/{id}/
    """
    if not is_admin_or_bdm(request.user):
        return Response(
            {'error': 'Only BDM and Admin users can access this endpoint'},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        proforma = BDMVisitProforma.objects.select_related(
            'teacher', 'school', 'bdm'
        ).get(id=proforma_id)
    except BDMVisitProforma.DoesNotExist:
        return Response(
            {'error': 'Proforma not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    # BDM can only edit their own proformas
    if is_bdm(request.user) and proforma.bdm != request.user:
        return Response(
            {'error': 'You can only edit your own proformas'},
            status=status.HTTP_403_FORBIDDEN
        )

    if request.method == 'GET':
        return Response({
            'id': proforma.id,
            'teacher_id': proforma.teacher.id,
            'teacher_name': proforma.teacher.get_full_name(),
            'school_id': proforma.school.id,
            'school_name': proforma.school.name,
            'bdm_id': proforma.bdm.id,
            'bdm_name': proforma.bdm.get_full_name(),
            'visit_date': proforma.visit_date,
            'month': proforma.month,
            'year': proforma.year,
            'ratings': {
                'discipline': proforma.discipline_rating,
                'communication': proforma.communication_rating,
                'child_handling': proforma.child_handling_rating,
                'professionalism': proforma.professionalism_rating,
                'content_knowledge': proforma.content_knowledge_rating,
            },
            'overall_score': float(proforma.overall_attitude_score),
            'remarks': proforma.remarks,
            'areas_of_improvement': proforma.areas_of_improvement,
            'teacher_strengths': proforma.teacher_strengths,
            'created_at': proforma.created_at,
            'updated_at': proforma.updated_at,
        })

    elif request.method == 'PUT':
        # Update ratings
        if 'discipline_rating' in request.data:
            proforma.discipline_rating = request.data['discipline_rating']
        if 'communication_rating' in request.data:
            proforma.communication_rating = request.data['communication_rating']
        if 'child_handling_rating' in request.data:
            proforma.child_handling_rating = request.data['child_handling_rating']
        if 'professionalism_rating' in request.data:
            proforma.professionalism_rating = request.data['professionalism_rating']
        if 'content_knowledge_rating' in request.data:
            proforma.content_knowledge_rating = request.data['content_knowledge_rating']

        # Update text fields
        if 'remarks' in request.data:
            proforma.remarks = request.data['remarks']
        if 'areas_of_improvement' in request.data:
            proforma.areas_of_improvement = request.data['areas_of_improvement']
        if 'teacher_strengths' in request.data:
            proforma.teacher_strengths = request.data['teacher_strengths']

        proforma.save()  # This will recalculate overall_attitude_score

        return Response({
            'success': True,
            'message': 'Proforma updated successfully',
            'overall_score': float(proforma.overall_attitude_score)
        })


# =============================================
# Teacher Evaluation Endpoints
# =============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def teacher_evaluation_list(request):
    """
    Get all teacher evaluations (admin view).

    GET /api/employees/teacher-evaluation/
    Query params:
    - month: filter by month (optional)
    - year: filter by year (optional)
    - rating: filter by rating (optional)
    """
    if not is_admin(request.user):
        return Response(
            {'error': 'Only admins can view all evaluations'},
            status=status.HTTP_403_FORBIDDEN
        )

    evaluations = TeacherEvaluationScore.objects.select_related('teacher').all()

    # Apply filters
    month = request.query_params.get('month')
    if month:
        evaluations = evaluations.filter(month=month)

    year = request.query_params.get('year')
    if year:
        evaluations = evaluations.filter(year=year)

    rating = request.query_params.get('rating')
    if rating:
        evaluations = evaluations.filter(rating=rating)

    eval_list = []
    for e in evaluations:
        eval_list.append({
            'id': e.id,
            'teacher_id': e.teacher.id,
            'teacher_name': e.teacher.get_full_name(),
            'month': e.month,
            'year': e.year,
            'scores': {
                'attendance': float(e.attendance_score),
                'attitude': float(e.attitude_score),
                'student_interest': float(e.student_interest_score),
                'enrollment_impact': float(e.enrollment_impact_score),
            },
            'total_score': float(e.total_score),
            'rating': e.rating,
            'rating_display': e.get_rating_display(),
            'calculated_at': e.calculated_at,
        })

    # Summary stats
    summary = evaluations.aggregate(
        average_score=Avg('total_score'),
    )
    summary['total_evaluations'] = evaluations.count()
    summary['rating_breakdown'] = {
        'master_trainer': evaluations.filter(rating='master_trainer').count(),
        'certified_trainer': evaluations.filter(rating='certified_trainer').count(),
        'needs_improvement': evaluations.filter(rating='needs_improvement').count(),
        'performance_review': evaluations.filter(rating='performance_review').count(),
    }

    return Response({
        'summary': summary,
        'count': len(eval_list),
        'evaluations': eval_list
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def teacher_evaluation_detail(request, teacher_id):
    """
    Get evaluation details for a specific teacher.

    GET /api/employees/teacher-evaluation/{teacher_id}/
    Query params:
    - month: specific month (optional)
    - year: specific year (optional)
    """
    # Teachers can view their own evaluations
    if is_teacher(request.user) and request.user.id != teacher_id:
        return Response(
            {'error': 'You can only view your own evaluations'},
            status=status.HTTP_403_FORBIDDEN
        )

    if not (is_admin(request.user) or (is_teacher(request.user) and request.user.id == teacher_id)):
        return Response(
            {'error': 'Access denied'},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        teacher = CustomUser.objects.get(id=teacher_id, role='Teacher')
    except CustomUser.DoesNotExist:
        return Response(
            {'error': 'Teacher not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    evaluations = TeacherEvaluationScore.objects.filter(teacher=teacher)

    # Apply filters
    month = request.query_params.get('month')
    if month:
        evaluations = evaluations.filter(month=month)

    year = request.query_params.get('year')
    if year:
        evaluations = evaluations.filter(year=year)

    eval_list = []
    for e in evaluations:
        eval_list.append({
            'id': e.id,
            'month': e.month,
            'year': e.year,
            'scores': {
                'attendance': {
                    'value': float(e.attendance_score),
                    'weight': 30,
                    'weighted': float(e.attendance_score) * 0.30
                },
                'attitude': {
                    'value': float(e.attitude_score),
                    'weight': 30,
                    'weighted': float(e.attitude_score) * 0.30
                },
                'student_interest': {
                    'value': float(e.student_interest_score),
                    'weight': 20,
                    'weighted': float(e.student_interest_score) * 0.20
                },
                'enrollment_impact': {
                    'value': float(e.enrollment_impact_score),
                    'weight': 20,
                    'weighted': float(e.enrollment_impact_score) * 0.20
                },
            },
            'total_score': float(e.total_score),
            'rating': e.rating,
            'rating_display': e.get_rating_display(),
            'calculated_at': e.calculated_at,
        })

    # Summary
    summary = evaluations.aggregate(average_score=Avg('total_score'))

    return Response({
        'teacher': {
            'id': teacher.id,
            'name': teacher.get_full_name(),
            'username': teacher.username,
        },
        'summary': summary,
        'count': len(eval_list),
        'evaluations': eval_list
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def calculate_evaluation(request):
    """
    Calculate/recalculate teacher evaluation for a specific month.

    POST /api/employees/teacher-evaluation/calculate/
    Body:
    {
        "teacher_id": 123,  // Optional - if not provided, calculates for all teachers
        "month": 1,
        "year": 2024
    }
    """
    if not is_admin(request.user):
        return Response(
            {'error': 'Only admins can trigger evaluation calculation'},
            status=status.HTTP_403_FORBIDDEN
        )

    month = request.data.get('month')
    year = request.data.get('year')

    if not month or not year:
        return Response(
            {'error': 'Month and year are required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    teacher_id = request.data.get('teacher_id')

    if teacher_id:
        # Calculate for specific teacher
        try:
            teacher = CustomUser.objects.get(id=teacher_id, role='Teacher')
        except CustomUser.DoesNotExist:
            return Response(
                {'error': 'Teacher not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        score = TeacherEvaluationScore.calculate_for_teacher(teacher, month, year)
        return Response({
            'success': True,
            'message': 'Evaluation calculated successfully',
            'evaluation': {
                'teacher_name': teacher.get_full_name(),
                'total_score': float(score.total_score),
                'rating': score.rating
            }
        })
    else:
        # Calculate for all teachers
        teachers = CustomUser.objects.filter(role='Teacher', is_active=True)
        results = []

        for teacher in teachers:
            score = TeacherEvaluationScore.calculate_for_teacher(teacher, month, year)
            results.append({
                'teacher_id': teacher.id,
                'teacher_name': teacher.get_full_name(),
                'total_score': float(score.total_score),
                'rating': score.rating
            })

        return Response({
            'success': True,
            'message': f'Calculated evaluations for {len(results)} teachers',
            'count': len(results),
            'evaluations': results
        })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_evaluation(request):
    """
    Get current teacher's own evaluation scores.

    GET /api/employees/my-evaluation/
    """
    if not is_teacher(request.user):
        return Response(
            {'error': 'This endpoint is for teachers only'},
            status=status.HTTP_403_FORBIDDEN
        )

    evaluations = TeacherEvaluationScore.objects.filter(
        teacher=request.user
    ).order_by('-year', '-month')

    eval_list = []
    for e in evaluations:
        eval_list.append({
            'month': e.month,
            'year': e.year,
            'scores': {
                'attendance': float(e.attendance_score),
                'attitude': float(e.attitude_score),
                'student_interest': float(e.student_interest_score),
                'enrollment_impact': float(e.enrollment_impact_score),
            },
            'total_score': float(e.total_score),
            'rating': e.rating,
            'rating_display': e.get_rating_display(),
        })

    return Response({
        'teacher_name': request.user.get_full_name(),
        'count': len(eval_list),
        'evaluations': eval_list
    })
