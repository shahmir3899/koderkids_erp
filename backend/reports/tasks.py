from celery import shared_task
from django.core.management import call_command


@shared_task
def purge_old_student_report_generation_events():
    call_command('purge_old_report_generation_events')
