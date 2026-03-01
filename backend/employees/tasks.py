import logging
from celery import shared_task
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(name='employees.tasks.send_monthly_report_reminder')
def send_monthly_report_reminder():
    """
    Auto-send monthly student report reminder to all active teachers.
    Scheduled via Celery Beat on the 28th of each month at 9 AM.
    """
    from employees.models import Notification
    from students.models import CustomUser

    month_name = timezone.now().strftime('%B %Y')
    teachers = CustomUser.objects.filter(role='Teacher', is_active=True)

    if not teachers.exists():
        logger.warning(f"[{month_name}] No active teachers found. Skipping.")
        return 'No active teachers found'

    notifications = [
        Notification(
            recipient=teacher,
            sender=None,
            title='Students Report',
            message=(
                'Dear Teachers,\n\n'
                'Please generate and submit monthly student reports to your '
                'respective schools so that salary slips can be generated.\n\n'
                'Please update in Teacher group when task is completed.\n\n'
                'Thank You'
            ),
            notification_type='reminder',
        )
        for teacher in teachers
    ]
    Notification.objects.bulk_create(notifications)

    result = f'[{month_name}] Notification sent to {len(notifications)} teacher(s)'
    logger.info(result)
    return result


@shared_task(name='employees.tasks.send_test_notification')
def send_test_notification():
    """
    Test task — sends a notification to all admins to verify Celery is working.
    Trigger manually: send_test_notification.delay()
    """
    from employees.models import Notification
    from students.models import CustomUser

    admins = CustomUser.objects.filter(role='Admin', is_active=True)

    if not admins.exists():
        return 'No active admins found'

    notifications = [
        Notification(
            recipient=admin,
            sender=None,
            title='Celery Test',
            message='This is a test notification sent via Celery. If you see this, Celery is working correctly.',
            notification_type='success',
        )
        for admin in admins
    ]
    Notification.objects.bulk_create(notifications)

    result = f'Test notification sent to {len(notifications)} admin(s)'
    logger.info(result)
    return result
