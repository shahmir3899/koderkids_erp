# Redesign: instant-start visits (no advance planning) + free-form
# ad-hoc Q&A evaluations (no admin-authored templates).
#
# Data preservation: before the old EvaluationFormTemplate/Field/Response
# models are dropped, existing EvaluationResponse rows are backfilled into
# the new EvaluationQuestion model so evaluation history survives the
# schema change.

import django.core.validators
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


def backfill_evaluation_questions(apps, schema_editor):
    EvaluationResponse = apps.get_model('monitoring', 'EvaluationResponse')
    EvaluationQuestion = apps.get_model('monitoring', 'EvaluationQuestion')

    for response in EvaluationResponse.objects.select_related('field').all():
        field = response.field
        rating = None
        if response.numeric_value is not None:
            if field.field_type == 'rating_1_5':
                rating = int(round(float(response.numeric_value)))
            elif field.field_type == 'rating_1_10':
                rating = int(round(float(response.numeric_value) / 2))
            # yes_no/text/select values carry no rating — kept as answer_text only.
            if rating is not None:
                rating = max(1, min(5, rating))

        EvaluationQuestion.objects.create(
            evaluation_id=response.evaluation_id,
            question_text=field.label[:500],
            answer_text=response.value,
            rating=rating,
            order=field.order,
        )


def noop_reverse(apps, schema_editor):
    # One-way backfill; the old template/response tables are gone by the
    # time this would run in reverse, so there's nothing to restore.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('monitoring', '0007_monitoringvisit_assigned_teachers'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # --- MonitoringVisit: drop advance-scheduling fields ---
        migrations.AlterUniqueTogether(
            name='monitoringvisit',
            unique_together=set(),
        ),
        migrations.RemoveField(
            model_name='monitoringvisit',
            name='assigned_teachers',
        ),
        migrations.RemoveField(
            model_name='monitoringvisit',
            name='planned_time',
        ),
        migrations.AlterField(
            model_name='monitoringvisit',
            name='status',
            field=models.CharField(
                choices=[
                    ('in_progress', 'In Progress'),
                    ('completed', 'Completed'),
                    ('cancelled', 'Cancelled'),
                ],
                default='in_progress',
                max_length=20,
            ),
        ),

        # --- New free-form question model ---
        migrations.CreateModel(
            name='EvaluationQuestion',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('question_text', models.CharField(max_length=500)),
                ('answer_text', models.TextField(blank=True)),
                ('rating', models.IntegerField(
                    blank=True,
                    null=True,
                    help_text='Optional 1-5 rating; only rated questions contribute to the score.',
                    validators=[
                        django.core.validators.MinValueValidator(1),
                        django.core.validators.MaxValueValidator(5),
                    ],
                )),
                ('order', models.IntegerField(default=0)),
                ('evaluation', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='questions',
                    to='monitoring.teacherevaluation',
                )),
            ],
            options={
                'verbose_name': 'Evaluation Question',
                'verbose_name_plural': 'Evaluation Questions',
                'ordering': ['order', 'id'],
            },
        ),

        # --- Backfill before the old tables are dropped ---
        migrations.RunPython(backfill_evaluation_questions, noop_reverse),

        # --- Drop the old template-driven response/template models ---
        migrations.RemoveField(
            model_name='teacherevaluation',
            name='template',
        ),
        migrations.RemoveField(
            model_name='evaluationresponse',
            name='evaluation',
        ),
        migrations.RemoveField(
            model_name='evaluationresponse',
            name='field',
        ),
        migrations.DeleteModel(
            name='EvaluationResponse',
        ),
        migrations.RemoveField(
            model_name='evaluationformfield',
            name='template',
        ),
        migrations.DeleteModel(
            name='EvaluationFormField',
        ),
        migrations.DeleteModel(
            name='EvaluationFormTemplate',
        ),
    ]
