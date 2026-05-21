import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('onlineclasses', '0001_initial'),
        ('students', '0029_add_timeslot_model'),
    ]

    operations = [
        migrations.AddField(
            model_name='onlineclasssession',
            name='time_slot',
            field=models.ForeignKey(
                to='students.timeslot',
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='online_sessions',
                help_text='Teacher time-slot this session targets (ONLINE student flow)',
            ),
        ),
        migrations.AddField(
            model_name='onlineclasssession',
            name='selected_students',
            field=models.ManyToManyField(
                to='students.student',
                blank=True,
                related_name='scheduled_sessions',
                help_text='Students explicitly invited to this session',
            ),
        ),
    ]
