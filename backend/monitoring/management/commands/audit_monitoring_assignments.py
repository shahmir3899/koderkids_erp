from django.core.management.base import BaseCommand, CommandError
from django.db.models import Q

from monitoring.models import MonitoringVisit
from students.models import CustomUser


class Command(BaseCommand):
    help = 'Audit and optionally backfill invalid monitoring visit BDM assignments.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--apply',
            action='store_true',
            help='Apply reassignment updates. Without this flag, command runs as dry-run.',
        )
        parser.add_argument(
            '--default-bdm-id',
            type=int,
            help='Optional BDM user ID to assign to all invalid visits when --apply is used.',
        )

    def handle(self, *args, **options):
        apply_changes = options['apply']
        default_bdm_id = options.get('default_bdm_id')

        invalid_visits = MonitoringVisit.objects.select_related('bdm', 'school').filter(
            Q(bdm__isnull=True) |
            ~Q(bdm__role='BDM') |
            Q(bdm__is_active=False)
        ).order_by('-visit_date', '-created_at')

        total_invalid = invalid_visits.count()
        self.stdout.write(self.style.WARNING(f'Invalid assignment visits found: {total_invalid}'))

        if total_invalid == 0:
            self.stdout.write(self.style.SUCCESS('All monitoring visits have valid active BDM assignments.'))
            return

        for visit in invalid_visits[:200]:
            current_bdm = visit.bdm
            current_bdm_label = (
                f'{current_bdm.id}:{current_bdm.username}:{current_bdm.role}:{"active" if current_bdm.is_active else "inactive"}'
                if current_bdm else
                'None'
            )
            self.stdout.write(
                f'- visit_id={visit.id} school={visit.school_id}:{visit.school.name} date={visit.visit_date} bdm={current_bdm_label}'
            )

        if total_invalid > 200:
            self.stdout.write(self.style.WARNING('Output truncated to first 200 invalid visits.'))

        if not apply_changes:
            self.stdout.write(self.style.WARNING('Dry-run mode: no records were updated.'))
            self.stdout.write('Use --apply --default-bdm-id <id> to backfill invalid assignments.')
            return

        if not default_bdm_id:
            raise CommandError('When using --apply, --default-bdm-id is required.')

        try:
            default_bdm = CustomUser.objects.get(id=default_bdm_id, role='BDM', is_active=True)
        except CustomUser.DoesNotExist as exc:
            raise CommandError('Provided --default-bdm-id does not belong to an active BDM.') from exc

        updated = invalid_visits.update(bdm=default_bdm)

        self.stdout.write(
            self.style.SUCCESS(
                f'Updated {updated} visits to BDM {default_bdm.id}:{default_bdm.username}.'
            )
        )
