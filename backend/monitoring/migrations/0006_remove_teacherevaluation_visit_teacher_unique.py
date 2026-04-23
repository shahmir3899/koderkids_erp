from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('monitoring', '0005_fix_unique_together_add_bdm'),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name='teacherevaluation',
            unique_together=set(),
        ),
    ]
