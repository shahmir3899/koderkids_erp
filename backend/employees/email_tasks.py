"""
Celery async email tasks.
Wraps all synchronous email functions so they run in background.
Each task accepts primitive args (IDs, strings) — not model objects.
"""

import logging
from celery import shared_task

logger = logging.getLogger(__name__)


def is_notification_enabled(setting_name):
    """Check if a notification type is enabled. Fail-open on errors."""
    try:
        from employees.models import NotificationSettings
        return getattr(NotificationSettings.load(), setting_name, True)
    except Exception:
        return True


# ============================================
# CRM EMAIL TASKS
# ============================================

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_lead_assignment_email_task(self, lead_id, bdm_user_id, assigned_by_name):
    """Async: Send email to BDM when lead is assigned."""
    try:
        from crm.models import Lead
        from students.models import CustomUser
        from crm.emails import send_lead_assignment_email

        lead = Lead.objects.get(id=lead_id)
        bdm_user = CustomUser.objects.get(id=bdm_user_id)
        send_lead_assignment_email(lead, bdm_user, assigned_by_name)
        logger.info(f"Lead assignment email sent to {bdm_user.email}")
    except Exception as exc:
        logger.error(f"Lead assignment email failed: {exc}")
        self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_activity_scheduled_email_task(self, activity_id, bdm_user_id):
    """Async: Send email to BDM when activity is scheduled."""
    try:
        if not is_notification_enabled('email_activity_scheduled'):
            return 'Notification disabled'
        from crm.models import Activity
        from students.models import CustomUser
        from crm.emails import send_activity_scheduled_email

        activity = Activity.objects.get(id=activity_id)
        bdm_user = CustomUser.objects.get(id=bdm_user_id)
        send_activity_scheduled_email(activity, bdm_user)
        logger.info(f"Activity scheduled email sent to {bdm_user.email}")
    except Exception as exc:
        logger.error(f"Activity scheduled email failed: {exc}")
        self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_aging_alerts_task(self):
    """Async: Send aging lead alerts to all BDMs (daily scheduled)."""
    try:
        if not is_notification_enabled('email_aging_lead_alert'):
            return 'Notification disabled'
        from django.utils import timezone
        from django.db.models import Max, Q
        from datetime import timedelta
        from collections import defaultdict
        from crm.models import Lead
        from crm.emails import send_aging_lead_alert_email

        days = 3
        aging_threshold = timezone.now() - timedelta(days=days)

        aging_leads = Lead.objects.filter(
            status__in=['New', 'Contacted', 'Interested'],
            assigned_to__isnull=False,
            created_at__lt=aging_threshold
        ).annotate(
            last_activity_date=Max('activities__scheduled_date')
        ).filter(
            Q(last_activity_date__lt=aging_threshold) | Q(last_activity_date__isnull=True)
        ).select_related('assigned_to')

        if not aging_leads.exists():
            return 'No aging leads found'

        leads_by_bdm = defaultdict(list)
        for lead in aging_leads:
            leads_by_bdm[lead.assigned_to].append(lead)

        emails_sent = 0
        for bdm, leads in leads_by_bdm.items():
            leads_data = []
            for lead in leads:
                days_old = (timezone.now() - lead.created_at).days
                last_activity = lead.last_activity_date
                days_since_activity = (timezone.now() - last_activity).days if last_activity else None
                leads_data.append({
                    'id': lead.id,
                    'name': lead.school_name or lead.phone,
                    'status': lead.status,
                    'phone': lead.phone,
                    'city': lead.city,
                    'days_old': days_old,
                    'days_since_activity': days_since_activity,
                })
            if send_aging_lead_alert_email(leads_data, bdm, days):
                emails_sent += 1

        result = f'Aging alerts sent to {emails_sent} BDM(s)'
        logger.info(result)
        return result
    except Exception as exc:
        logger.error(f"Aging alerts failed: {exc}")
        self.retry(exc=exc)


# ============================================
# TASK EMAIL TASKS
# ============================================

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_task_assignment_email_task(self, task_id):
    """Async: Send email to assignee when task is assigned."""
    try:
        from tasks.models import Task
        from tasks.emails import send_task_assignment_email

        task = Task.objects.get(id=task_id)
        send_task_assignment_email(task)
        logger.info(f"Task assignment email sent for task {task.id}")
    except Exception as exc:
        logger.error(f"Task assignment email failed: {exc}")
        self.retry(exc=exc)


# ============================================
# AUTHENTICATION EMAIL TASKS
# ============================================

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_welcome_email_task(self, user_id, password):
    """Async: Send welcome email to newly created user."""
    try:
        if not is_notification_enabled('email_welcome'):
            return 'Notification disabled'
        from students.models import CustomUser
        from authentication.email_utils import send_welcome_email

        user = CustomUser.objects.get(id=user_id)
        send_welcome_email(user, password)
        logger.info(f"Welcome email sent to {user.email}")
    except Exception as exc:
        logger.error(f"Welcome email failed: {exc}")
        self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_password_reset_email_task(self, user_id, new_password):
    """Async: Send password reset email."""
    try:
        if not is_notification_enabled('email_password_reset'):
            return 'Notification disabled'
        from students.models import CustomUser
        from authentication.email_utils import send_password_reset_email

        user = CustomUser.objects.get(id=user_id)
        send_password_reset_email(user, new_password)
        logger.info(f"Password reset email sent to {user.email}")
    except Exception as exc:
        logger.error(f"Password reset email failed: {exc}")
        self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_school_assignment_email_task(self, user_id, school_names):
    """Async: Send school assignment email to teacher."""
    try:
        if not is_notification_enabled('email_school_assignment'):
            return 'Notification disabled'
        from students.models import CustomUser
        from authentication.email_utils import send_school_assignment_email

        user = CustomUser.objects.get(id=user_id)
        send_school_assignment_email(user, school_names)
        logger.info(f"School assignment email sent to {user.email}")
    except Exception as exc:
        logger.error(f"School assignment email failed: {exc}")
        self.retry(exc=exc)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_account_update_email_task(self, user_id, changes, updated_by_name):
    """Async: Send account update notification email."""
    try:
        if not is_notification_enabled('email_account_update'):
            return 'Notification disabled'
        from students.models import CustomUser
        from authentication.email_utils import send_account_update_email

        user = CustomUser.objects.get(id=user_id)
        send_account_update_email(user, changes, updated_by_name)
        logger.info(f"Account update email sent to {user.email}")
    except Exception as exc:
        logger.error(f"Account update email failed: {exc}")
        self.retry(exc=exc)


# ============================================
# STUDENT EMAIL TASKS
# ============================================

@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_student_progress_email_task(self, student_id, session_date, image_url, lesson_plan_id=None):
    """Async: Send student progress email."""
    try:
        if not is_notification_enabled('email_student_progress'):
            return 'Notification disabled'
        from students.models import Student, LessonPlan
        from authentication.email_utils import send_student_progress_email

        student = Student.objects.get(id=student_id)
        lesson_plan = None
        if lesson_plan_id:
            lesson_plan = LessonPlan.objects.filter(id=lesson_plan_id).first()
        send_student_progress_email(student, session_date, image_url, lesson_plan)
        logger.info(f"Student progress email sent for student {student_id}")
    except Exception as exc:
        logger.error(f"Student progress email failed: {exc}")
        self.retry(exc=exc)
