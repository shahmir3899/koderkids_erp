import logging
import os

from celery import shared_task
from django.utils import timezone
from .constants import ONLINE_CLASS_ELIGIBLE_STUDENT_SUBTYPES

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def auto_mark_attendance(self, session_id):
    """
    After a session ends, automatically create Attendance records for
    students who attended >= 70 % of the session duration.
    """
    from students.models import Attendance
    from .models import ClassParticipant, OnlineClassSession

    try:
        session = OnlineClassSession.objects.select_related('teacher').get(id=session_id)
    except OnlineClassSession.DoesNotExist:
        logger.warning('auto_mark_attendance: session %s not found', session_id)
        return

    threshold = int(session.duration_mins * 0.70)
    session_date = (session.ended_at or session.scheduled_at).date()

    participants = ClassParticipant.objects.filter(
        session=session,
        attendance_auto_marked=False,
        duration_mins__gte=threshold,
    ).select_related('student')

    marked = 0
    for participant in participants:
        try:
            Attendance.objects.update_or_create(
                student=participant.student,
                session_date=session_date,
                defaults={
                    'status': 'Present',
                    'teacher': session.teacher,
                    'lesson_plan': None,
                    'achieved_topic': f'Online class: {session.title}',
                },
            )
            participant.attendance_auto_marked = True
            participant.save(update_fields=['attendance_auto_marked'])
            marked += 1
        except Exception as exc:
            logger.error(
                'Failed to mark attendance for student %s session %s: %s',
                participant.student_id, session_id, exc
            )

    logger.info(
        'auto_mark_attendance: session %s — marked %d/%d participants',
        session_id, marked, participants.count()
    )
    return {'session_id': session_id, 'marked': marked}


@shared_task(bind=True, max_retries=2, default_retry_delay=300)
def send_class_reminder(self, session_id):
    """
    Send email + WhatsApp reminder to all students 1 hour before class.
    Scheduled via apply_async(eta=...) at session creation time.
    """
    import requests
    from django.core.mail import send_mail
    from django.conf import settings
    from students.models import Student
    from .models import OnlineClassSession

    try:
        session = OnlineClassSession.objects.select_related('teacher', 'school').get(id=session_id)
    except OnlineClassSession.DoesNotExist:
        return

    # Only send if session is still scheduled (not cancelled/ended)
    if session.status != OnlineClassSession.STATUS_SCHEDULED:
        return

    if session.selected_students.exists():
        students = session.selected_students.filter(status='Active').select_related('user')
    else:
        students = Student.objects.filter(
            school=session.school,
            status='Active',
            student_subtype__in=ONLINE_CLASS_ELIGIBLE_STUDENT_SUBTYPES,
        ).select_related('user')

    subject = f"Reminder: Online Class '{session.title}' starts in 1 hour"
    scheduled_str = session.scheduled_at.strftime('%d %b %Y at %I:%M %p')
    body = (
        f"Dear Student,\n\n"
        f"Your online class '{session.title}' is scheduled for {scheduled_str}.\n"
        f"Teacher: {session.teacher.get_full_name() or session.teacher.username}\n"
        f"Duration: {session.duration_mins} minutes\n\n"
        f"Please join 5 minutes early to set up your camera and microphone.\n\n"
        f"KoderKids ERP"
    )

    wa_bot_key = os.getenv('WHATSAPP_BOT_KEY', '')
    ngrok_url = os.getenv('NGROK_URL', 'http://127.0.0.1:8000')

    for student in students:
        # Email
        if student.user and student.user.email:
            try:
                send_mail(
                    subject,
                    body,
                    settings.DEFAULT_FROM_EMAIL,
                    [student.user.email],
                    fail_silently=True,
                )
            except Exception as exc:
                logger.warning('Email reminder failed for student %s: %s', student.id, exc)

        # WhatsApp via existing bot (optional — skip silently if phone not set)
        if wa_bot_key and student.phone:
            try:
                requests.post(
                    f'{ngrok_url}/api/crm/leads/whatsapp/',
                    json={
                        'phone': student.phone,
                        'message': body,
                    },
                    headers={'X-Bot-Key': wa_bot_key},
                    timeout=10,
                )
            except Exception as exc:
                logger.warning('WhatsApp reminder failed for student %s: %s', student.id, exc)

    logger.info('send_class_reminder: sent reminders for session %s to %d students', session_id, students.count())


@shared_task(bind=True, max_retries=1, default_retry_delay=60)
def auto_start_session(self, session_id):
    """
    Mark a session as LIVE at its scheduled_at time.
    Idempotent — skips if the session is already live, ended, or cancelled.
    """
    from .models import OnlineClassSession

    try:
        session = OnlineClassSession.objects.get(id=session_id)
    except OnlineClassSession.DoesNotExist:
        logger.warning('auto_start_session: session %s not found', session_id)
        return

    if session.status != OnlineClassSession.STATUS_SCHEDULED:
        return  # already transitioned — skip

    session.status = OnlineClassSession.STATUS_LIVE
    session.started_at = timezone.now()
    session.save(update_fields=['status', 'started_at'])
    logger.info('auto_start_session: session %s marked live', session_id)


@shared_task(bind=True, max_retries=1, default_retry_delay=60)
def auto_end_session(self, session_id):
    """
    Mark a session as ENDED when its scheduled duration expires.
    Idempotent — skips if already ended or cancelled.
    Triggers auto_mark_attendance after ending.
    """
    from .models import OnlineClassSession

    try:
        session = OnlineClassSession.objects.get(id=session_id)
    except OnlineClassSession.DoesNotExist:
        logger.warning('auto_end_session: session %s not found', session_id)
        return

    if session.status in (OnlineClassSession.STATUS_ENDED, OnlineClassSession.STATUS_CANCELLED):
        return  # already handled — skip

    session.status = OnlineClassSession.STATUS_ENDED
    session.ended_at = timezone.now()
    session.save(update_fields=['status', 'ended_at'])
    logger.info('auto_end_session: session %s marked ended', session_id)

    try:
        auto_mark_attendance.delay(session_id)
    except Exception as exc:
        logger.warning('auto_end_session: could not enqueue attendance for %s: %s', session_id, exc)
