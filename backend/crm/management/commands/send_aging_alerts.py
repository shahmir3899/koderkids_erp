# ============================================
# MANAGEMENT COMMAND: Send Aging Lead Alerts
# Sends email notifications to BDMs about leads
# that haven't been contacted recently
# ============================================

from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db.models import Max, Q
from datetime import timedelta
from collections import defaultdict
import logging

from crm.models import Lead
from crm.emails import send_aging_lead_alert_email
from students.models import CustomUser

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Send email alerts to BDMs about leads that have not been contacted recently'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=3,
            help='Number of days without activity to consider a lead as aging (default: 3)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview what would be sent without actually sending emails'
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
        days = options['days']
        dry_run = options['dry_run']

        self.log_info(f"Starting aging lead alert check (threshold: {days} days)")
        if dry_run:
            self.log_warning("DRY RUN MODE - No emails will be sent")

        # Calculate the aging threshold
        aging_threshold = timezone.now() - timedelta(days=days)

        # Find aging leads:
        # - Status is active (New, Contacted, Interested)
        # - Has assigned BDM
        # - Either no activities OR last activity is older than threshold
        # - Lead was created before threshold (give new leads time)
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
            self.log_info("No aging leads found. All leads are being actively managed.")
            return

        self.log_info(f"Found {aging_leads.count()} aging lead(s)")

        # Group leads by BDM
        leads_by_bdm = defaultdict(list)
        for lead in aging_leads:
            leads_by_bdm[lead.assigned_to].append(lead)

        # Send alerts to each BDM
        emails_sent = 0
        emails_failed = 0

        for bdm, leads in leads_by_bdm.items():
            self.log_info(f"Processing {len(leads)} aging lead(s) for {bdm.get_full_name() or bdm.username}")

            if dry_run:
                self.stdout.write(f"\n  [DRY RUN] Would send email to: {bdm.email}")
                self.stdout.write(f"  Leads to include:")
                for lead in leads:
                    lead_name = lead.school_name or lead.phone
                    days_old = (timezone.now() - lead.created_at).days
                    last_activity = lead.last_activity_date
                    if last_activity:
                        days_since_activity = (timezone.now() - last_activity).days
                        self.stdout.write(f"    - {lead_name} (Status: {lead.status}, "
                                        f"Created: {days_old} days ago, "
                                        f"Last activity: {days_since_activity} days ago)")
                    else:
                        self.stdout.write(f"    - {lead_name} (Status: {lead.status}, "
                                        f"Created: {days_old} days ago, "
                                        f"No activities)")
            else:
                try:
                    # Prepare lead data for email
                    leads_data = []
                    for lead in leads:
                        days_old = (timezone.now() - lead.created_at).days
                        last_activity = lead.last_activity_date
                        days_since_activity = None
                        if last_activity:
                            days_since_activity = (timezone.now() - last_activity).days

                        leads_data.append({
                            'id': lead.id,
                            'name': lead.school_name or lead.phone,
                            'status': lead.status,
                            'phone': lead.phone,
                            'city': lead.city,
                            'days_old': days_old,
                            'days_since_activity': days_since_activity,
                        })

                    email_sent = send_aging_lead_alert_email(leads_data, bdm, days)
                    if email_sent:
                        emails_sent += 1
                        self.log_success(f"Alert email sent to {bdm.email}")
                    else:
                        emails_failed += 1
                        self.log_warning(f"Failed to send email to {bdm.email}")
                except Exception as e:
                    emails_failed += 1
                    self.log_error(f"Error sending email to {bdm.email}: {str(e)}")

        # Summary
        self.stdout.write("")
        self.log_info("=" * 50)
        self.log_info("SUMMARY")
        self.log_info("=" * 50)
        self.log_info(f"Total aging leads found: {aging_leads.count()}")
        self.log_info(f"BDMs notified: {len(leads_by_bdm)}")

        if not dry_run:
            self.log_info(f"Emails sent successfully: {emails_sent}")
            if emails_failed > 0:
                self.log_warning(f"Emails failed: {emails_failed}")

        if dry_run:
            self.log_warning("This was a DRY RUN. Run without --dry-run to send actual emails.")
