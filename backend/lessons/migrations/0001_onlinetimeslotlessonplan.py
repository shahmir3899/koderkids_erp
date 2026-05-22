from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('books', '0006_add_visibility_and_assignments'),
        ('students', '0029_add_timeslot_model'),
    ]

    operations = [
        migrations.CreateModel(
            name='OnlineTimeSlotLessonPlan',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('session_date', models.DateField()),
                ('planned_topic', models.TextField(blank=True, null=True)),
                ('achieved_topic', models.TextField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('school', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='students.school')),
                ('teacher', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='students.customuser')),
                ('time_slot', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='online_lesson_plans', to='students.timeslot')),
                ('planned_topics', models.ManyToManyField(blank=True, related_name='planned_online_lessons', to='books.topic')),
            ],
            options={
                'unique_together': {('session_date', 'teacher', 'school', 'time_slot')},
            },
        ),
    ]
