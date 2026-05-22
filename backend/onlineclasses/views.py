import hashlib
import hmac
import json
import logging
import os
import time
from datetime import datetime, timedelta

from django.utils import timezone
from django.utils.dateparse import parse_date, parse_time
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response

from students.models import CustomUser, School, Student
from .models import ClassParticipant, ClassRecording, OnlineClassSession
from .permissions import IsTeacherOrAdmin, IsSessionTeacherOrAdmin
from .serializers import (
    ClassParticipantSerializer,
    ClassRecordingSerializer,
    OnlineClassSessionSerializer,
)
from .constants import ONLINE_CLASS_ELIGIBLE_STUDENT_SUBTYPES
from .tasks import auto_mark_attendance, auto_end_session, auto_start_session, send_class_reminder

logger = logging.getLogger(__name__)


def _resolve_target_teacher(user, request_data, school):
    """
    Resolve the teacher owner for a session create request.
    - Teacher users always create for themselves.
    - Admins may optionally pass teacher=<teacher_user_id>.
    """
    if user.role != 'Admin':
        return user, None

    teacher_id = request_data.get('teacher')
    if not teacher_id:
        return user, None

    try:
        teacher_user = CustomUser.objects.get(id=teacher_id, role='Teacher', is_active=True)
    except CustomUser.DoesNotExist:
        return None, Response({'error': 'Invalid teacher selected'}, status=400)

    if not teacher_user.assigned_schools.filter(id=school.id).exists():
        return None, Response({'error': 'Selected teacher is not assigned to this school'}, status=400)

    return teacher_user, None

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

    target_teacher, teacher_error = _resolve_target_teacher(user, request.data, school)
    if teacher_error:
        return teacher_error

    payload = request.data.copy()
    payload['teacher'] = target_teacher.id
    serializer = OnlineClassSessionSerializer(data=payload)
    if not serializer.is_valid():
        return Response(serializer.errors, status=400)

    session = serializer.save(teacher=target_teacher)

    # Validate teacher owns the time_slot they picked
    if session.time_slot and target_teacher.role == 'Teacher':
        try:
            teacher_profile = target_teacher.teacher_profile
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
# 1b. Bulk session create
# ---------------------------------------------------------------------------

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def session_bulk_create(request):
    """
    POST /api/onlineclasses/sessions/bulk/

    Required fields:
    - school: int
    - title: string
    - bulk_classes_count: int (default 8)
    - bulk_weekdays: list[str] (Mon..Sun)
    - bulk_start_date: YYYY-MM-DD (default today)
    - bulk_time: HH:MM

    Optional fields mirror single-create fields:
    - description, time_slot, selected_student_ids, duration_mins,
      recording_enabled, chat_enabled, screenshare_student_allowed,
      is_recurring, recurrence_rule
    - dry_run: bool (if true, only preview generated schedule)
    """
    user = request.user
    if user.role not in ('Teacher', 'Admin'):
        return Response({'error': 'Only teachers or admins can create sessions'}, status=403)

    school_id = request.data.get('school')
    if not school_id:
        return Response({'error': 'School is required'}, status=400)

    try:
        school = School.objects.get(id=school_id)
    except School.DoesNotExist:
        return Response({'error': 'Invalid school'}, status=400)

    if user.role == 'Teacher' and not user.assigned_schools.filter(id=school.id).exists():
        return Response({'error': 'You are not assigned to this school'}, status=403)

    target_teacher, teacher_error = _resolve_target_teacher(user, request.data, school)
    if teacher_error:
        return teacher_error

    title = (request.data.get('title') or '').strip()
    if not title:
        return Response({'error': 'Title is required'}, status=400)

    bulk_classes_count = request.data.get('bulk_classes_count', 8)
    try:
        bulk_classes_count = int(bulk_classes_count)
    except (TypeError, ValueError):
        return Response({'error': 'bulk_classes_count must be an integer'}, status=400)
    if bulk_classes_count < 1 or bulk_classes_count > 60:
        return Response({'error': 'bulk_classes_count must be between 1 and 60'}, status=400)

    weekday_tokens = request.data.get('bulk_weekdays') or []
    if not isinstance(weekday_tokens, list) or len(weekday_tokens) == 0:
        return Response({'error': 'bulk_weekdays must be a non-empty list'}, status=400)

    weekday_map = {
        'mon': 0, 'monday': 0,
        'tue': 1, 'tues': 1, 'tuesday': 1,
        'wed': 2, 'wednesday': 2,
        'thu': 3, 'thur': 3, 'thurs': 3, 'thursday': 3,
        'fri': 4, 'friday': 4,
        'sat': 5, 'saturday': 5,
        'sun': 6, 'sunday': 6,
    }
    selected_weekdays = set()
    for token in weekday_tokens:
        norm = str(token).strip().lower()
        if norm not in weekday_map:
            return Response({'error': f'Invalid weekday: {token}'}, status=400)
        selected_weekdays.add(weekday_map[norm])

    start_date_str = request.data.get('bulk_start_date')
    if start_date_str:
        start_date = parse_date(str(start_date_str))
        if not start_date:
            return Response({'error': 'bulk_start_date must be YYYY-MM-DD'}, status=400)
    else:
        start_date = timezone.localdate()

    time_str = request.data.get('bulk_time')
    if not time_str:
        return Response({'error': 'bulk_time is required (HH:MM)'}, status=400)
    bulk_time = parse_time(str(time_str))
    if not bulk_time:
        return Response({'error': 'bulk_time must be HH:MM'}, status=400)

    dry_run_raw = request.data.get('dry_run', False)
    if isinstance(dry_run_raw, bool):
        dry_run = dry_run_raw
    else:
        dry_run = str(dry_run_raw).strip().lower() in ('1', 'true', 'yes', 'y')

    generated = []
    cursor = start_date
    max_scan_days = 730
    scanned_days = 0
    while len(generated) < bulk_classes_count and scanned_days < max_scan_days:
        if cursor.weekday() in selected_weekdays:
            naive_dt = datetime.combine(cursor, bulk_time)
            aware_dt = timezone.make_aware(naive_dt, timezone.get_current_timezone())
            generated.append(aware_dt)
        cursor = cursor + timedelta(days=1)
        scanned_days += 1

    if len(generated) < bulk_classes_count:
        return Response(
            {'error': 'Could not generate enough dates with given bulk settings'},
            status=400,
        )

    preview = [d.isoformat() for d in generated]
    if dry_run:
        return Response({
            'dry_run': True,
            'count': len(preview),
            'generated_dates': preview,
        })

    from django.db import transaction
    created_sessions = []
    with transaction.atomic():
        for scheduled_at in generated:
            payload = request.data.copy()
            payload['teacher'] = target_teacher.id
            payload['scheduled_at'] = scheduled_at.isoformat()
            serializer = OnlineClassSessionSerializer(data=payload)
            if not serializer.is_valid():
                return Response(
                    {
                        'error': 'Validation failed during bulk creation',
                        'scheduled_at': scheduled_at.isoformat(),
                        'details': serializer.errors,
                    },
                    status=400,
                )

            session = serializer.save(teacher=target_teacher)

            if session.time_slot and target_teacher.role == 'Teacher':
                try:
                    teacher_profile = target_teacher.teacher_profile
                    if session.time_slot.teacher and session.time_slot.teacher != teacher_profile:
                        return Response(
                            {'error': 'You do not own the selected time slot.'},
                            status=403,
                        )
                except Exception:
                    pass

            for student in session.selected_students.all():
                ClassParticipant.objects.get_or_create(session=session, student=student)

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

            created_sessions.append(session)

    return Response(
        {
            'dry_run': False,
            'count': len(created_sessions),
            'generated_dates': preview,
            'sessions': OnlineClassSessionSerializer(created_sessions, many=True).data,
        },
        status=201,
    )


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

    # DELETE (scheduled cancel path)
    if session.status != OnlineClassSession.STATUS_SCHEDULED:
        return Response(
            {
                'error': 'Only scheduled sessions can be deleted here. Use delete-past for ended/cancelled sessions.'
            },
            status=400,
        )

    session.delete()
    return Response(status=204)


# ---------------------------------------------------------------------------
# 2b. Delete past session (ENDED/CANCELLED)
# ---------------------------------------------------------------------------

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def session_delete_past(request, session_id):
    try:
        session = OnlineClassSession.objects.select_related('teacher', 'school').get(id=session_id)
    except OnlineClassSession.DoesNotExist:
        return Response({'error': 'Session not found'}, status=404)

    user = request.user
    if user.role not in ('Teacher', 'Admin'):
        return Response({'error': 'Permission denied'}, status=403)
    if user.role == 'Teacher' and session.teacher_id != user.id:
        return Response({'error': 'Permission denied'}, status=403)

    if session.status not in (OnlineClassSession.STATUS_ENDED, OnlineClassSession.STATUS_CANCELLED):
        return Response(
            {'error': 'Only ended or cancelled sessions can be deleted from past sessions.'},
            status=400,
        )

    participants_count = session.participants.count()
    recordings_count = session.recordings.count()
    deleted_session_id = session.id

    logger.info(
        'Past session deletion: session=%s status=%s by user=%s role=%s participants=%s recordings=%s',
        deleted_session_id,
        session.status,
        user.id,
        user.role,
        participants_count,
        recordings_count,
    )

    session.delete()
    return Response(
        {
            'deleted_session_id': deleted_session_id,
            'deleted_at': timezone.now(),
            'deleted_by': user.id,
            'deleted_by_role': user.role,
            'participants_deleted': participants_count,
            'recordings_deleted': recordings_count,
        },
        status=200,
    )


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

    Returns active students eligible for online classes in the given school,
    optionally narrowed by time slot.
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
        student_subtype__in=ONLINE_CLASS_ELIGIBLE_STUDENT_SUBTYPES,
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
            'student_class': s.student_class,
            'time_slot_id': s.time_slot_id,
            'time_slot_label': s.time_slot.label if s.time_slot else None,
        }
        for s in qs.order_by('name')
    ]
    return Response(data)
