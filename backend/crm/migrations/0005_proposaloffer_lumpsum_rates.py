from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('crm', '0004_add_page_selection_feature_items'),
    ]

    operations = [
        migrations.AddField(
            model_name='proposaloffer',
            name='lumpsum_discounted_rate',
            field=models.CharField(default='PKR 35,000', max_length=50),
        ),
        migrations.AddField(
            model_name='proposaloffer',
            name='lumpsum_standard_rate',
            field=models.CharField(default='PKR 50,000', max_length=50),
        ),
    ]
