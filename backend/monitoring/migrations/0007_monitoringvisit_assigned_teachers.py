from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('monitoring', '0006_remove_teacherevaluation_visit_teacher_unique'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='monitoringvisit',
            name='assigned_teachers',
            field=models.ManyToManyField(
                blank=True,
                help_text='Teachers selected during visit planning for evaluation.',
                limit_choices_to={'is_active': True, 'role': 'Teacher'},
                related_name='assigned_monitoring_visits',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
    ]
