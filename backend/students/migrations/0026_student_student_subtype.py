from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('students', '0025_add_gallery_targeting'),
    ]

    operations = [
        migrations.AddField(
            model_name='student',
            name='student_subtype',
            field=models.CharField(
                choices=[
                    ('ONSITE', 'Onsite Student'),
                    ('ONLINE', 'Online Student'),
                    ('HYBRID', 'Hybrid Student'),
                ],
                db_index=True,
                default='ONSITE',
                help_text='Delivery subtype used for LMS access policy (e.g. ONLINE/ONSITE/HYBRID).',
                max_length=20,
            ),
        ),
    ]
