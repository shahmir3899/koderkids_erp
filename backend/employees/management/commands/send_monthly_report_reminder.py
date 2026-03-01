# ============================================
# MANAGEMENT COMMAND: Send Monthly Report Reminder
# Sends in-app notification to all teachers
# reminding them to submit monthly student reports
# ============================================

from django.core.management.base import BaseCommand
from django.utils import timezone
import logging

from employees.models import Notification
from students.models import CustomUser

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Send monthly student report reminder notification to all active teachers'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview what would be sent without actually creating notifications'
        )

    def log_info(self, message):
        timestamp = timezone.now().strftime('%Y-%m-%d %H:%M:%S')
        self.stdout.write(f"[{timestamp}] INFO: {message}")
        logger.info(message)

    def log_success(self, message):
        timestamp = timezone.now().strftime('%Y-%m-%d %H:%M:%S')
        self.stdout.write(self.style.SUCCESS(f"[{timestamp}] SUCCESS: {message}"))
        logger.info(message)

    def log_warning(self, message):
        timestamp = timezone.now().strftime('%Y-%m-%d %H:%M:%S')
        self.stdout.write(self.style.WARNING(f"[{timestamp}] WARNING: {message}"))
        logger.warning(message)

    def log_error(self, message):
        timestamp = timezone.now().strftime('%Y-%m-%d %H:%M:%S')
        self.stdout.write(self.style.ERROR(f"[{timestamp}] ERROR: {message}"))
        logger.error(message)

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        month_name = timezone.now().strftime('%B %Y')

        self.log_info(f"Starting monthly report reminder for {month_name}")
        if dry_run:
            self.log_warning("DRY RUN MODE - No notifications will be created")

        # Get all active teachers
        teachers = CustomUser.objects.filter(role='Teacher', is_active=True)

        if not teachers.exists():
            self.log_warning("No active teachers found. Exiting.")
            return

        self.log_info(f"Found {teachers.count()} active teacher(s)")

        if dry_run:
            self.stdout.write(f"\n  [DRY RUN] Would send notification to:")
            for teacher in teachers:
                name = teacher.get_full_name() or teacher.username
                self.stdout.write(f"    - {name} ({teacher.email or 'No email'})")
        else:
            try:
                # Create notifications using bulk_create (same pattern as crm/views.py)
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
                self.log_success(f"Notification sent to {len(notifications)} teacher(s)")
            except Exception as e:
                self.log_error(f"Failed to create notifications: {str(e)}")
                return

        # Summary
        self.stdout.write("")
        self.log_info("=" * 50)
        self.log_info("SUMMARY")
        self.log_info("=" * 50)
        self.log_info(f"Month: {month_name}")
        self.log_info(f"Teachers found: {teachers.count()}")

        if dry_run:
            self.log_warning("This was a DRY RUN. Run without --dry-run to send actual notifications.")
