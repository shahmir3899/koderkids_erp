from django.db import migrations, models


def seed_proposal_rate_slabs(apps, schema_editor):
    ProposalRateSlab = apps.get_model('crm', 'ProposalRateSlab')

    per_student_rows = [
        {'min_students': 1, 'max_students': 30, 'standard': 2000, 'discounted': 1000, 'sort_order': 1},
        {'min_students': 31, 'max_students': 50, 'standard': 1300, 'discounted': 1000, 'sort_order': 2},
        {'min_students': 51, 'max_students': 80, 'standard': 800, 'discounted': 700, 'sort_order': 3},
        {'min_students': 81, 'max_students': 120, 'standard': 700, 'discounted': 600, 'sort_order': 4},
        {'min_students': 121, 'max_students': 150, 'standard': 700, 'discounted': 600, 'sort_order': 5},
    ]

    lumpsum_rows = [
        {'min_students': 1, 'max_students': 30, 'standard': 50000, 'discounted': 35000, 'sort_order': 1},
        {'min_students': 31, 'max_students': 50, 'standard': 50000, 'discounted': 35000, 'sort_order': 2},
        {'min_students': 51, 'max_students': 80, 'standard': 50000, 'discounted': 35000, 'sort_order': 3},
        {'min_students': 81, 'max_students': 120, 'standard': 50000, 'discounted': 35000, 'sort_order': 4},
        {'min_students': 121, 'max_students': 150, 'standard': 50000, 'discounted': 35000, 'sort_order': 5},
    ]

    for row in per_student_rows:
        ProposalRateSlab.objects.create(
            pricing_mode='per_student',
            min_students=row['min_students'],
            max_students=row['max_students'],
            suggested_standard_rate=row['standard'],
            suggested_discounted_rate=row['discounted'],
            sort_order=row['sort_order'],
            is_active=True,
        )

    for row in lumpsum_rows:
        ProposalRateSlab.objects.create(
            pricing_mode='lumpsum',
            min_students=row['min_students'],
            max_students=row['max_students'],
            suggested_standard_rate=row['standard'],
            suggested_discounted_rate=row['discounted'],
            sort_order=row['sort_order'],
            is_active=True,
        )


class Migration(migrations.Migration):

    dependencies = [
        ('crm', '0006_proposaloffer_expected_strength'),
    ]

    operations = [
        migrations.CreateModel(
            name='ProposalRateSlab',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('pricing_mode', models.CharField(choices=[('per_student', 'Per Student'), ('lumpsum', 'Lumpsum')], max_length=20)),
                ('min_students', models.PositiveIntegerField(default=1)),
                ('max_students', models.PositiveIntegerField()),
                ('suggested_standard_rate', models.PositiveIntegerField()),
                ('suggested_discounted_rate', models.PositiveIntegerField(blank=True, null=True)),
                ('is_active', models.BooleanField(default=True)),
                ('sort_order', models.PositiveIntegerField(default=0)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
            ],
            options={
                'verbose_name': 'Proposal Rate Slab',
                'verbose_name_plural': 'Proposal Rate Slabs',
                'ordering': ['pricing_mode', 'sort_order', 'min_students', 'max_students'],
            },
        ),
        migrations.RunPython(seed_proposal_rate_slabs, migrations.RunPython.noop),
    ]
