import hashlib
import hmac
import json
import logging
import os
import time
from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from students.models import School, Student
from .models import ClassParticipant, ClassRecording, OnlineClassSession
from .permissions import IsTeacherOrAdmin, IsSessionTeacherOrAdmin
from .serializers import (
    ClassParticipantSerializer,
    ClassRecordingSerializer,
    OnlineClassSessionSerializer,
)
from .tasks import auto_mark_attendance, auto_end_session, auto_start_session, send_class_reminder

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Helper: generate LiveKit token
# ---------------------------------------------------------------------------

import base64


def _generate_livekit_token(room_name, identity, display_name, is_teacher, can_publish_screen):
    """Generate a LiveKit access token (HS256 JWT) using stdlib only.

    LiveKit tokens are standard JWTs signed with HMAC-SHA256.  Building them
    with stdlib avoids the google-protobuf C-extension incompatibility on
    Python 3.14 that the livekit-api SDK triggers.
    """
    lk_api_key = os.getenv('LIVEKIT_API_KEY', '')
    lk_api_secret = os.getenv('LIVEKIT_API_SECRET', '')
    if not lk_api_key or not lk_api_secret:
        raise RuntimeError('LIVEKIT_API_KEY / LIVEKIT_API_SECRET not configured')

    now = int(time.time())
    payload = {
        'iss': lk_api_key,
        'sub': identity,
        'exp': now + 21600,   # 6-hour expiry
        'nbf': now - 5,
        'name': display_name,
        'video': {
            'roomJoin': True,
            'room': room_name,
            'canPublish': True,
            'canSubscribe': True,
            'canPublishData': True,
            'roomAdmin': is_teacher,
        },
    }

    def _b64url(data):
        if isinstance(data, dict):
            data = json.dumps(data, separators=(',', ':')).encode()
        return base64.urlsafe_b64encode(data).rstrip(b'=').decode()

    header = _b64url({'alg': 'HS256', 'typ': 'JWT'})
    body = _b64url(payload)
    signing_input = f'{header}.{body}'
    sig = hmac.new(
        lk_api_secret.encode(),
        signing_input.encode(),
        hashlib.sha256,
    ).digest()
    return f'{signing_input}.{_b64url(sig)}'


# ---------------------------------------------------------------------------
# 1. Session list + create
# ---------------------------------------------------------------------------

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def session_list_create(request):
    user = request.user

    if request.method == 'GET':
        status_filter = request.GET.get('status')  # optional filter
        school_filter = request.GET.get('school')  # optional filter

        if user.role == 'Teacher':
            qs = OnlineClassSession.objects.filter(teacher=user).select_related('teacher', 'school')
            if school_filter:
                if not user.assigned_schools.filter(id=school_filter).exists():
                    return Response({'error': 'You are not assigned to this school'}, status=403)
                qs = qs.filter(school_id=school_filter)
        elif user.role == 'Admin':
            qs = OnlineClassSession.objects.all().select_related('teacher', 'school')
            if school_filter:
                qs = qs.filter(school_id=school_filter)
        elif user.role == 'Student':
            try:
                student = Student.objects.get(user=user)
            except Student.DoesNotExist:
                return Response({'error': 'Student profile not found'}, status=404)

            if school_filter and str(student.school_id) != str(school_filter):
                return Response({'error': 'Permission denied'}, status=403)

            from django.db.models import Q, Exists, OuterRef
            # Sessions where student is explicitly invited OR (school matches AND no explicit invite list)
            # NOTE: selected_students__isnull=True is wrong on M2M — use Exists on the through-table instead
            _has_students = OnlineClassSession.selected_students.through.objects.filter(
                onlineclasssession_id=OuterRef('pk')
            )
            qs = OnlineClassSession.objects.filter(
                Q(selected_students=student)
                | Q(school=student.school) & ~Exists(_has_students)
            ).distinct().select_related('teacher', 'school')
        else:
            return Response({'error': 'Permission denied'}, status=403)

        if status_filter:
            qs = qs.filter(status=status_filter)

        serializer = OnlineClassSessionSerializer(qs, many=True)
        return Response(serializer.data)

    # POST — teacher / admin only
    if user.role not in ('Teacher', 'Admin'):
        return Response({'error': 'Only teachers or admins can create sessions'}, status=403)

    # Validate teacher is assigned to the school
    school_id = request.data.get('school')
    if not school_id:
        return Response({'error': 'School is required'}, status=400)

    try:
        school = School.objects.get(id=school_id)
    except School.DoesNotExist:
        return Response({'error': 'Invalid school'}, status=400)

    if user.role == 'Teacher' and not user.assigned_schools.filter(id=school.id).exists():
        return Response({'error': 'You are not assigned to this school'}, status=403)

    payload = request.data.copy()
    payload['teacher'] = user.id
    serializer = OnlineClassSessionSerializer(data=payload)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    session = serializer.save(teacher=user)

    # Validate teacher owns the time_slot they picked
    if session.time_slot and user.role == 'Teacher':
        try:
            teacher_profile = user.teacher_profile
            if session.time_slot.teacher and session.time_slot.teacher != teacher_profile:
                session.delete()
                return Response(
                    {'error': 'You do not own the selected time slot.'},
                    status=403,
                )
        except Exception:
            pass

    # Pre-seed ClassParticipant rows for all selected students
    for student in session.selected_students.all():
        ClassParticipant.objects.get_or_create(session=session, student=student)

    # Schedule reminder, auto-start, and auto-end via Celery
    try:
        eta_reminder = session.scheduled_at - timedelta(hours=1)
        if eta_reminder > timezone.now():
            send_class_reminder.apply_async(args=[session.id], eta=eta_reminder)
        auto_start_session.apply_async(args=[session.id], eta=session.scheduled_at)
        auto_end_session.apply_async(
            args=[session.id],
            eta=session.scheduled_at + timedelta(minutes=session.duration_mins),
        )
    except Exception as exc:
        logger.warning('Could not schedule auto tasks for session %s: %s', session.id, exc)

    return Response(OnlineClassSessionSerializer(session).data, status=201)


# ---------------------------------------------------------------------------
# 2. Session detail (GET / PATCH / DELETE)
# ---------------------------------------------------------------------------

@api_view(['GET', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def session_detail(request, session_id):
    try:
        session = OnlineClassSession.objects.select_related('teacher', 'school').get(id=session_id)
    except OnlineClassSession.DoesNotExist:
        return Response({'error': 'Session not found'}, status=404)

    user = request.user

    if request.method == 'GET':
        # Students can view sessions belonging to their school
        if user.role == 'Student':
            try:
                student = Student.objects.get(user=user)
                if session.school_id != student.school_id:
                    return Response({'error': 'Permission denied'}, status=403)
            except Student.DoesNotExist:
                return Response({'error': 'Student profile not found'}, status=404)
        serializer = OnlineClassSessionSerializer(session)
        return Response(serializer.data)

    # PATCH / DELETE — session teacher or Admin only
    if user.role != 'Admin' and session.teacher_id != user.id:
        return Response({'error': 'Permission denied'}, status=403)

    if request.method == 'PATCH':
        serializer = OnlineClassSessionSerializer(session, data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=400)
        serializer.save()
        # Re-schedule auto tasks with updated times (old tasks are idempotent no-ops)
        try:
            auto_start_session.apply_async(args=[session.id], eta=session.scheduled_at)
            auto_end_session.apply_async(
                args=[session.id],
                eta=session.scheduled_at + timedelta(minutes=session.duration_mins),
            )
        except Exception as exc:
            logger.warning('Could not reschedule auto tasks for session %s: %s', session.id, exc)
        return Response(serializer.data)

    # DELETE
    session.delete()
    return Response(status=204)


# ---------------------------------------------------------------------------
# 3. Token — student or teacher joins a room
# ---------------------------------------------------------------------------

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def session_token(request, session_id):
    try:
        session = OnlineClassSession.objects.select_related('teacher', 'school').get(id=session_id)
    except OnlineClassSession.DoesNotExist:
        return Response({'error': 'Session not found'}, status=404)

    if session.status in (OnlineClassSession.STATUS_ENDED, OnlineClassSession.STATUS_CANCELLED):
        return Response({'error': 'This session has ended'}, status=403)

    user = request.user
    is_teacher = user.role in ('Teacher', 'Admin')

    if is_teacher:
        if user.role == 'Teacher' and session.teacher_id != user.id:
            return Response({'error': 'You are not the teacher of this session'}, status=403)
        identity = f"teacher-{user.id}"
        display_name = user.get_full_name() or user.username
    else:
        # Student must belong to the session's school
        try:
            student = Student.objects.get(user=user)
        except Student.DoesNotExist:
            return Response({'error': 'Student profile not found'}, status=404)

        # Participant-level check: if session has an explicit invite list, student must be in it;
        # otherwise fall back to school-level access (backward-compatible for admin sessions).
        if session.selected_students.exists():
            if not session.selected_students.filter(id=student.id).exists():
                return Response({'error': 'You are not invited to this session'}, status=403)
        elif student.school_id != session.school_id:
            return Response({'error': 'You are not enrolled in this session'}, status=403)

        identity = f"student-{student.id}"
        display_name = student.name

    try:
        token = _generate_livekit_token(
            room_name=session.room_name,
            identity=identity,
            display_name=display_name,
            is_teacher=is_teacher,
            can_publish_screen=is_teacher or session.screenshare_student_allowed,
        )
    except RuntimeError as exc:
        logger.error('LiveKit token generation failed: %s', exc)
        return Response({'error': str(exc)}, status=503)

    livekit_url = os.getenv('LIVEKIT_URL', '')
    return Response({'token': token, 'livekit_url': livekit_url, 'room_name': session.room_name})


# ---------------------------------------------------------------------------
# 4. Start session
# ---------------------------------------------------------------------------

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def session_start(request, session_id):
    try:
        session = OnlineClassSession.objects.get(id=session_id)
    except OnlineClassSession.DoesNotExist:
        return Response({'error': 'Session not found'}, status=404)

    if request.user.role not in ('Teacher', 'Admin'):
        return Response({'error': 'Permission denied'}, status=403)
    if request.user.role == 'Teacher' and session.teacher_id != request.user.id:
        return Response({'error': 'Permission denied'}, status=403)

    session.status = OnlineClassSession.STATUS_LIVE
    session.started_at = timezone.now()
    session.save(update_fields=['status', 'started_at'])
    return Response({'status': session.status, 'started_at': session.started_at})


# ---------------------------------------------------------------------------
# 5. End session
# ---------------------------------------------------------------------------

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def session_end(request, session_id):
    try:
        session = OnlineClassSession.objects.get(id=session_id)
    except OnlineClassSession.DoesNotExist:
        return Response({'error': 'Session not found'}, status=404)

    if request.user.role not in ('Teacher', 'Admin'):
        return Response({'error': 'Permission denied'}, status=403)
    if request.user.role == 'Teacher' and session.teacher_id != request.user.id:
        return Response({'error': 'Permission denied'}, status=403)

    session.status = OnlineClassSession.STATUS_ENDED
    session.ended_at = timezone.now()
    session.save(update_fields=['status', 'ended_at'])

    try:
        auto_mark_attendance.delay(session.id)
    except Exception as exc:
        logger.warning('Could not enqueue auto_mark_attendance for session %s: %s', session.id, exc)

    return Response({'status': session.status, 'ended_at': session.ended_at})


# ---------------------------------------------------------------------------
# 6. Participants list
# ---------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def session_participants(request, session_id):
    try:
        session = OnlineClassSession.objects.get(id=session_id)
    except OnlineClassSession.DoesNotExist:
        return Response({'error': 'Session not found'}, status=404)

    if request.user.role not in ('Teacher', 'Admin'):
        return Response({'error': 'Permission denied'}, status=403)
    if request.user.role == 'Teacher' and session.teacher_id != request.user.id:
        return Response({'error': 'Permission denied'}, status=403)

    participants = session.participants.select_related('student').all()
    serializer = ClassParticipantSerializer(participants, many=True)
    return Response(serializer.data)


# ---------------------------------------------------------------------------
# 7. Recordings list
# ---------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def recording_list(request):
    user = request.user
    if user.role in ('Teacher', 'Admin'):
        recordings = ClassRecording.objects.filter(
            session__teacher=user
        ).select_related('session').order_by('-created_at')
    elif user.role == 'Student':
        try:
            student = Student.objects.get(user=user)
        except Student.DoesNotExist:
            return Response({'error': 'Student profile not found'}, status=404)
        recordings = ClassRecording.objects.filter(
            session__school=student.school,
            session__recording_enabled=True,
        ).select_related('session').order_by('-created_at')
    else:
        return Response({'error': 'Permission denied'}, status=403)

    serializer = ClassRecordingSerializer(recordings, many=True)
    return Response(serializer.data)


# ---------------------------------------------------------------------------
# 8. LiveKit Webhook receiver
# ---------------------------------------------------------------------------

@api_view(['POST'])
@permission_classes([AllowAny])
def livekit_webhook(request):
    """
    Receives LiveKit webhook events.
    Validates HMAC-SHA256 signature from X-Livekit-Signature header.
    """
    lk_api_secret = os.getenv('LIVEKIT_API_SECRET', '').encode()

    # Validate signature
    sig_header = request.META.get('HTTP_X_LIVEKIT_SIGNATURE', '')
    if lk_api_secret and sig_header:
        body = request.body
        expected = hmac.new(lk_api_secret, body, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, sig_header):
            return Response({'error': 'Invalid signature'}, status=400)

    try:
        payload = json.loads(request.body)
    except json.JSONDecodeError:
        return Response({'error': 'Invalid JSON'}, status=400)

    event = payload.get('event', '')
    room_name = payload.get('room', {}).get('name', '')

    try:
        session = OnlineClassSession.objects.get(room_name=room_name)
    except OnlineClassSession.DoesNotExist:
        # Unknown room — ignore silently
        return Response({'ok': True})

    participant_identity = payload.get('participant', {}).get('identity', '')

    if event == 'participant_joined' and participant_identity.startswith('student-'):
        try:
            student_id = int(participant_identity.split('-', 1)[1])
            student = Student.objects.get(id=student_id)
            ClassParticipant.objects.update_or_create(
                session=session,
                student=student,
                defaults={'joined_at': timezone.now()},
            )
        except (ValueError, Student.DoesNotExist):
            pass

    elif event == 'participant_left' and participant_identity.startswith('student-'):
        try:
            student_id = int(participant_identity.split('-', 1)[1])
            student = Student.objects.get(id=student_id)
            participant, _ = ClassParticipant.objects.get_or_create(
                session=session, student=student
            )
            if participant.joined_at and not participant.left_at:
                participant.left_at = timezone.now()
                delta = participant.left_at - participant.joined_at
                participant.duration_mins = int(delta.total_seconds() / 60)
                participant.save(update_fields=['left_at', 'duration_mins'])
        except (ValueError, Student.DoesNotExist):
            pass

    # 'room_finished' is intentionally ignored here.
    # Sessions are ended only when the teacher explicitly clicks "End Class"
    # (which calls the session_end API endpoint). Closing the browser or a
    # network disconnect should NOT end the session for everyone else.

    return Response({'ok': True})


# ---------------------------------------------------------------------------
# 9. Eligible students for a school + time-slot combination
# ---------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def eligible_students(request):
    """
    GET /api/onlineclasses/eligible-students/?school_id=X&time_slot_id=Y

    Returns Active ONLINE students enrolled in the given time slot (and school).
    Teacher must be assigned to the school; time_slot must belong to that school.
    """
    user = request.user
    if user.role not in ('Teacher', 'Admin'):
        return Response({'error': 'Permission denied'}, status=403)

    school_id = request.GET.get('school_id')
    time_slot_id = request.GET.get('time_slot_id')

    if not school_id:
        return Response({'error': 'school_id is required'}, status=400)

    try:
        school = School.objects.get(id=school_id)
    except School.DoesNotExist:
        return Response({'error': 'School not found'}, status=404)

    if user.role == 'Teacher' and not user.assigned_schools.filter(id=school.id).exists():
        return Response({'error': 'You are not assigned to this school'}, status=403)

    qs = Student.objects.filter(
        school=school,
        status='Active',
        student_subtype='ONLINE',
    ).select_related('user')

    if time_slot_id:
        from students.models import TimeSlot
        try:
            slot = TimeSlot.objects.get(id=time_slot_id, school=school)
        except TimeSlot.DoesNotExist:
            return Response({'error': 'Time slot not found for this school'}, status=404)
        qs = qs.filter(time_slot=slot)

    data = [
        {
            'id': s.id,
            'name': s.name,
            'student_id': s.student_id,
            'student_subtype': s.student_subtype,
        }
        for s in qs.order_by('name')
    ]
    return Response(data)
