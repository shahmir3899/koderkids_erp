# ============================================
# ACTIVITY PROOF VIEWS
# ============================================
# Handles student screenshot uploads and teacher bulk approval

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q
from django.utils import timezone

from .models import ActivityProof, ActivityProofBulkAction, CourseEnrollment
from .proof_serializers import (
    ActivityProofUploadSerializer,
    ActivityProofStudentSerializer,
    ActivityProofTeacherSerializer,
    BulkApproveSerializer,
    BulkRejectSerializer,
)
from students.models import Student


# =============================================
# Permission Helpers
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

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_activity_proof(request):
    """
    Student uploads a screenshot proof of activity completion.

    POST /api/courses/activity-proof/upload/
    Body:
    {
        "topic": 123,
        "screenshot_url": "https://supabase.../screenshot.png",
        "software_used": "scratch",  // scratch, python, canva, ai_tool, other
        "student_notes": "I completed the Scratch animation project"
    }
    """
    if not is_student(request.user):
        return Response(
            {'error': 'Only students can upload activity proofs'},
            status=status.HTTP_403_FORBIDDEN
        )

    student = get_student_from_user(request.user)
    if not student:
        return Response(
            {'error': 'Student profile not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    serializer = ActivityProofUploadSerializer(
        data=request.data,
        context={'request': request}
    )

    if serializer.is_valid():
        proof = serializer.save()
        return Response(
            {
                'success': True,
                'message': 'Activity proof uploaded successfully',
                'proof': ActivityProofStudentSerializer(proof).data
            },
            status=status.HTTP_201_CREATED
        )

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_proofs(request):
    """
    Get list of student's uploaded proofs.

    GET /api/courses/activity-proof/my-proofs/
    Query params:
    - status: pending, approved, rejected (optional)
    - course_id: filter by course (optional)
    """
    if not is_student(request.user):
        return Response(
            {'error': 'Only students can view their proofs'},
            status=status.HTTP_403_FORBIDDEN
        )

    student = get_student_from_user(request.user)
    if not student:
        return Response(
            {'error': 'Student profile not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    proofs = ActivityProof.objects.filter(student=student)

    # Filter by status
    proof_status = request.query_params.get('status')
    if proof_status in ['pending', 'approved', 'rejected']:
        proofs = proofs.filter(status=proof_status)

    # Filter by course
    course_id = request.query_params.get('course_id')
    if course_id:
        proofs = proofs.filter(enrollment__course_id=course_id)

    serializer = ActivityProofStudentSerializer(proofs, many=True)
    return Response({
        'count': proofs.count(),
        'proofs': serializer.data
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def proof_detail_student(request, proof_id):
    """
    Get single proof detail for student.

    GET /api/courses/activity-proof/my-proofs/{proof_id}/
    """
    if not is_student(request.user):
        return Response(
            {'error': 'Only students can view their proofs'},
            status=status.HTTP_403_FORBIDDEN
        )

    student = get_student_from_user(request.user)
    if not student:
        return Response(
            {'error': 'Student profile not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    try:
        proof = ActivityProof.objects.get(id=proof_id, student=student)
    except ActivityProof.DoesNotExist:
        return Response(
            {'error': 'Proof not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    serializer = ActivityProofStudentSerializer(proof)
    return Response(serializer.data)


# =============================================
# Teacher Endpoints
# =============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def pending_proofs(request):
    """
    Get list of proofs pending approval for teacher.

    GET /api/courses/activity-proof/pending/
    Query params:
    - school_id: filter by school (optional)
    - course_id: filter by course (optional)
    - class_id: filter by class (optional)
    """
    if not is_teacher_or_admin(request.user):
        return Response(
            {'error': 'Only teachers and admins can view pending proofs'},
            status=status.HTTP_403_FORBIDDEN
        )

    proofs = ActivityProof.objects.filter(status='pending')

    # Filter by schools the teacher is assigned to
    if request.user.role == 'Teacher':
        teacher_schools = request.user.assigned_schools.all()
        proofs = proofs.filter(student__school__in=teacher_schools)

    # Additional filters
    school_id = request.query_params.get('school_id')
    if school_id:
        proofs = proofs.filter(student__school_id=school_id)

    course_id = request.query_params.get('course_id')
    if course_id:
        proofs = proofs.filter(enrollment__course_id=course_id)

    class_id = request.query_params.get('class_id')
    if class_id:
        proofs = proofs.filter(student__current_class_id=class_id)

    # Order by oldest first (FIFO)
    proofs = proofs.order_by('uploaded_at')

    serializer = ActivityProofTeacherSerializer(proofs, many=True)
    return Response({
        'count': proofs.count(),
        'proofs': serializer.data
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def all_proofs(request):
    """
    Get all proofs (not just pending) for teacher/admin.

    GET /api/courses/activity-proof/all/
    Query params:
    - status: pending, approved, rejected (optional)
    - school_id: filter by school (optional)
    - course_id: filter by course (optional)
    - class_id: filter by class (optional)
    - student_id: filter by student (optional)
    """
    if not is_teacher_or_admin(request.user):
        return Response(
            {'error': 'Only teachers and admins can view all proofs'},
            status=status.HTTP_403_FORBIDDEN
        )

    proofs = ActivityProof.objects.all()

    # Filter by schools the teacher is assigned to
    if request.user.role == 'Teacher':
        teacher_schools = request.user.assigned_schools.all()
        proofs = proofs.filter(student__school__in=teacher_schools)

    # Status filter
    proof_status = request.query_params.get('status')
    if proof_status in ['pending', 'approved', 'rejected']:
        proofs = proofs.filter(status=proof_status)

    # Additional filters
    school_id = request.query_params.get('school_id')
    if school_id:
        proofs = proofs.filter(student__school_id=school_id)

    course_id = request.query_params.get('course_id')
    if course_id:
        proofs = proofs.filter(enrollment__course_id=course_id)

    class_id = request.query_params.get('class_id')
    if class_id:
        proofs = proofs.filter(student__current_class_id=class_id)

    student_id = request.query_params.get('student_id')
    if student_id:
        proofs = proofs.filter(student_id=student_id)

    serializer = ActivityProofTeacherSerializer(proofs, many=True)
    return Response({
        'count': proofs.count(),
        'proofs': serializer.data
    })


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def proof_detail_teacher(request, proof_id):
    """
    Get or update single proof for teacher.

    GET /api/courses/activity-proof/{proof_id}/
    PUT /api/courses/activity-proof/{proof_id}/
    Body for PUT:
    {
        "status": "approved",
        "teacher_rating": "good",
        "teacher_remarks": "Well done!"
    }
    """
    if not is_teacher_or_admin(request.user):
        return Response(
            {'error': 'Only teachers and admins can manage proofs'},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        proof = ActivityProof.objects.get(id=proof_id)
    except ActivityProof.DoesNotExist:
        return Response(
            {'error': 'Proof not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Check teacher has access to this student's school
    if request.user.role == 'Teacher':
        teacher_schools = request.user.assigned_schools.all()
        if proof.student.school not in teacher_schools:
            return Response(
                {'error': 'You do not have access to this student'},
                status=status.HTTP_403_FORBIDDEN
            )

    if request.method == 'GET':
        serializer = ActivityProofTeacherSerializer(proof)
        return Response(serializer.data)

    elif request.method == 'PUT':
        new_status = request.data.get('status')
        rating = request.data.get('teacher_rating')
        remarks = request.data.get('teacher_remarks', '')

        if new_status == 'approved':
            if not rating:
                return Response(
                    {'error': 'Rating is required when approving'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            proof.approve(request.user, rating, remarks)
        elif new_status == 'rejected':
            proof.reject(request.user, remarks)
        else:
            return Response(
                {'error': 'Invalid status. Use approved or rejected'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = ActivityProofTeacherSerializer(proof)
        return Response({
            'success': True,
            'message': f'Proof {new_status} successfully',
            'proof': serializer.data
        })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_approve(request):
    """
    Bulk approve multiple proofs with same rating and remarks.

    POST /api/courses/activity-proof/bulk-approve/
    Body:
    {
        "proof_ids": [1, 2, 3, 4, 5],
        "rating": "good",
        "remarks": "Well done!"
    }
    """
    if not is_teacher_or_admin(request.user):
        return Response(
            {'error': 'Only teachers and admins can approve proofs'},
            status=status.HTTP_403_FORBIDDEN
        )

    serializer = BulkApproveSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    proof_ids = serializer.validated_data['proof_ids']
    rating = serializer.validated_data['rating']
    remarks = serializer.validated_data.get('remarks', '')

    # Get proofs and filter by teacher's schools if teacher
    proofs = ActivityProof.objects.filter(id__in=proof_ids, status='pending')

    if request.user.role == 'Teacher':
        teacher_schools = request.user.assigned_schools.all()
        proofs = proofs.filter(student__school__in=teacher_schools)

    # Approve each proof
    approved_count = 0
    approved_ids = []
    for proof in proofs:
        proof.approve(request.user, rating, remarks)
        approved_count += 1
        approved_ids.append(proof.id)

    # Create audit log
    if approved_count > 0:
        ActivityProofBulkAction.objects.create(
            teacher=request.user,
            action_type='approve',
            proof_ids=approved_ids,
            count=approved_count,
            rating=rating,
            remarks=remarks
        )

    return Response({
        'success': True,
        'message': f'Successfully approved {approved_count} proofs',
        'approved_count': approved_count,
        'approved_ids': approved_ids
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_reject(request):
    """
    Bulk reject multiple proofs with remarks.

    POST /api/courses/activity-proof/bulk-reject/
    Body:
    {
        "proof_ids": [1, 2, 3],
        "remarks": "Please re-upload with better quality screenshot"
    }
    """
    if not is_teacher_or_admin(request.user):
        return Response(
            {'error': 'Only teachers and admins can reject proofs'},
            status=status.HTTP_403_FORBIDDEN
        )

    serializer = BulkRejectSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    proof_ids = serializer.validated_data['proof_ids']
    remarks = serializer.validated_data['remarks']

    # Get proofs and filter by teacher's schools if teacher
    proofs = ActivityProof.objects.filter(id__in=proof_ids, status='pending')

    if request.user.role == 'Teacher':
        teacher_schools = request.user.assigned_schools.all()
        proofs = proofs.filter(student__school__in=teacher_schools)

    # Reject each proof
    rejected_count = 0
    rejected_ids = []
    for proof in proofs:
        proof.reject(request.user, remarks)
        rejected_count += 1
        rejected_ids.append(proof.id)

    # Create audit log
    if rejected_count > 0:
        ActivityProofBulkAction.objects.create(
            teacher=request.user,
            action_type='reject',
            proof_ids=rejected_ids,
            count=rejected_count,
            remarks=remarks
        )

    return Response({
        'success': True,
        'message': f'Successfully rejected {rejected_count} proofs',
        'rejected_count': rejected_count,
        'rejected_ids': rejected_ids
    })


# =============================================
# Statistics Endpoints
# =============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def proof_statistics(request):
    """
    Get proof statistics for teacher dashboard.

    GET /api/courses/activity-proof/stats/
    """
    if not is_teacher_or_admin(request.user):
        return Response(
            {'error': 'Only teachers and admins can view statistics'},
            status=status.HTTP_403_FORBIDDEN
        )

    proofs = ActivityProof.objects.all()

    # Filter by teacher's schools
    if request.user.role == 'Teacher':
        teacher_schools = request.user.assigned_schools.all()
        proofs = proofs.filter(student__school__in=teacher_schools)

    # Calculate statistics
    stats = {
        'total': proofs.count(),
        'pending': proofs.filter(status='pending').count(),
        'approved': proofs.filter(status='approved').count(),
        'rejected': proofs.filter(status='rejected').count(),
        'approved_today': proofs.filter(
            status='approved',
            approved_at__date=timezone.localdate()
        ).count(),
    }

    # Rating distribution
    approved_proofs = proofs.filter(status='approved')
    stats['ratings'] = {
        'excellent': approved_proofs.filter(teacher_rating='excellent').count(),
        'good': approved_proofs.filter(teacher_rating='good').count(),
        'basic': approved_proofs.filter(teacher_rating='basic').count(),
    }

    return Response(stats)
