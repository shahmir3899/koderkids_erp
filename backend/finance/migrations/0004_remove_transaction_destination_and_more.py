# Generated by Django 5.1.6 on 2025-03-05 05:50

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('finance', '0003_alter_account_options_alter_transaction_options_and_more'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='transaction',
            name='destination',
        ),
        migrations.RemoveField(
            model_name='transaction',
            name='source',
        ),
        migrations.AddField(
            model_name='transaction',
            name='account',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, to='finance.account'),
        ),
    ]
