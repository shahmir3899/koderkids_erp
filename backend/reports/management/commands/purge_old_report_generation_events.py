from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from reports.models import StudentReportGenerationEvent


class Command(BaseCommand):
    help = 'Deletes StudentReportGenerationEvent rows older than 6 months.'

    def handle(self, *args, **options):
        cutoff = timezone.now() - timedelta(days=183)
        deleted_count, _ = StudentReportGenerationEvent.objects.filter(generated_at__lt=cutoff).delete()
        self.stdout.write(
            self.style.SUCCESS(
                f'Purged {deleted_count} analytics events older than {cutoff.isoformat()}'
            )
        )
