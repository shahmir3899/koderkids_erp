# ============================================
# DATA MIGRATION: Seed default evaluation form template
# ============================================
# Creates the "Standard Attitude Proforma" template
# with 5 fields matching the legacy BDMVisitProforma criteria.

from django.db import migrations


def seed_default_template(apps, schema_editor):
    EvaluationFormTemplate = apps.get_model('monitoring', 'EvaluationFormTemplate')
    EvaluationFormField = apps.get_model('monitoring', 'EvaluationFormField')

    # Create default template
    template, created = EvaluationFormTemplate.objects.get_or_create(
        name='Standard Attitude Proforma',
        defaults={
            'description': 'Default teacher attitude evaluation matching the 5-criteria BDM proforma.',
            'is_active': True,
        },
    )

    if created:
        fields = [
            {
                'label': 'Discipline & Punctuality',
                'field_type': 'rating_1_5',
                'is_required': True,
                'order': 1,
                'weight': 20.00,
            },
            {
                'label': 'Communication Skills',
                'field_type': 'rating_1_5',
                'is_required': True,
                'order': 2,
                'weight': 20.00,
            },
            {
                'label': 'Child Handling & Patience',
                'field_type': 'rating_1_5',
                'is_required': True,
                'order': 3,
                'weight': 20.00,
            },
            {
                'label': 'Professionalism & Dress Code',
                'field_type': 'rating_1_5',
                'is_required': True,
                'order': 4,
                'weight': 20.00,
            },
            {
                'label': 'Subject Content Knowledge',
                'field_type': 'rating_1_5',
                'is_required': True,
                'order': 5,
                'weight': 20.00,
            },
        ]

        for field_data in fields:
            EvaluationFormField.objects.create(template=template, **field_data)


def reverse_seed(apps, schema_editor):
    EvaluationFormTemplate = apps.get_model('monitoring', 'EvaluationFormTemplate')
    EvaluationFormTemplate.objects.filter(name='Standard Attitude Proforma').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('monitoring', '0001_initial'),
    ]

    operations = [
        migrations.RunPython(seed_default_template, reverse_seed),
    ]
