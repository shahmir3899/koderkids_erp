from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('employees', '0006_notificationsettings_alter_teacherprofile_user'),
    ]

    operations = [
        migrations.AddField(
            model_name='salaryslip',
            name='monitoring_visits_count',
            field=models.IntegerField(default=0, help_text='Number of monitoring visit rows included in this slip'),
        ),
        migrations.AddField(
            model_name='salaryslip',
            name='monitoring_visits_snapshot',
            field=models.JSONField(blank=True, default=list, help_text='JSON array of monitoring visits for this salary period'),
        ),
    ]
