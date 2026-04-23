from django.core.management.base import BaseCommand
from decimal import Decimal


class Command(BaseCommand):
    help = (
        'Seed the default BDM Standard Evaluation template that mirrors the '
        'legacy BDMVisitProforma 5-criteria format. Safe to run multiple times '
        '(idempotent — skips creation if the template already exists).'
    )

    TEMPLATE_NAME = 'BDM Standard Evaluation'

    FIELDS = [
        {
            'label': 'Discipline & Punctuality',
            'field_type': 'rating_1_5',
            'is_required': True,
            'order': 0,
            'weight': Decimal('1.00'),
        },
        {
            'label': 'Communication Skills',
            'field_type': 'rating_1_5',
            'is_required': True,
            'order': 1,
            'weight': Decimal('1.00'),
        },
        {
            'label': 'Child Handling & Patience',
            'field_type': 'rating_1_5',
            'is_required': True,
            'order': 2,
            'weight': Decimal('1.00'),
        },
        {
            'label': 'Professionalism & Dress Code',
            'field_type': 'rating_1_5',
            'is_required': True,
            'order': 3,
            'weight': Decimal('1.00'),
        },
        {
            'label': 'Subject Content Knowledge',
            'field_type': 'rating_1_5',
            'is_required': True,
            'order': 4,
            'weight': Decimal('1.00'),
        },
    ]

    def handle(self, *args, **options):
        from monitoring.models import EvaluationFormTemplate, EvaluationFormField

        template, created = EvaluationFormTemplate.objects.get_or_create(
            name=self.TEMPLATE_NAME,
            defaults={
                'description': (
                    'Standard BDM evaluation covering the 5 core teacher '
                    'attitude criteria: discipline, communication, child '
                    'handling, professionalism, and subject knowledge. '
                    'Each criterion is rated 1–5; scores are averaged and '
                    'normalized to 0–100 for the monthly teacher evaluation.'
                ),
                'is_active': True,
            },
        )

        if not created:
            self.stdout.write(
                self.style.WARNING(
                    f'Template "{self.TEMPLATE_NAME}" already exists (id={template.id}). '
                    'Skipping creation.'
                )
            )
            return

        for field_data in self.FIELDS:
            EvaluationFormField.objects.create(template=template, **field_data)

        self.stdout.write(
            self.style.SUCCESS(
                f'Created template "{self.TEMPLATE_NAME}" (id={template.id}) '
                f'with {len(self.FIELDS)} fields.'
            )
        )
