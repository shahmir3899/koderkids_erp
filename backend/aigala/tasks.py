from celery import shared_task
from django.utils import timezone


@shared_task(name='aigala.tasks.auto_transition_galleries_task')
def auto_transition_galleries_task():
    """Periodically transition AI Gala statuses based on voting dates."""
    from .views import auto_transition_due_galleries

    auto_transition_due_galleries(today=timezone.now().date())
    return {'status': 'ok'}
