import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'school_management.settings')

app = Celery('school_management')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

# Beat schedule — periodic tasks
app.conf.beat_schedule = {
    'send-monthly-report-reminder': {
        'task': 'employees.tasks.send_monthly_report_reminder',
        'schedule': crontab(day_of_month=28, hour=9, minute=0),
    },
}
