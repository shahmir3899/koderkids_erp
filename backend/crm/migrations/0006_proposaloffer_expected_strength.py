from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('crm', '0005_proposaloffer_lumpsum_rates'),
    ]

    operations = [
        migrations.AddField(
            model_name='proposaloffer',
            name='expected_strength',
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
    ]
