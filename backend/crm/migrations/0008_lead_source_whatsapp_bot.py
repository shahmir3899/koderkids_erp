from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('crm', '0007_proposalrateslab'),
    ]

    operations = [
        migrations.AlterField(
            model_name='lead',
            name='lead_source',
            field=models.CharField(
                choices=[
                    ('Website', 'Website'),
                    ('Referral', 'Referral'),
                    ('Cold Call', 'Cold Call'),
                    ('Walk-in', 'Walk-in'),
                    ('Social Media', 'Social Media'),
                    ('WhatsApp Bot', 'WhatsApp Bot'),
                    ('Other', 'Other'),
                ],
                default='Other',
                help_text='How did this lead come to us?',
                max_length=50,
            ),
        ),
    ]
