# Generated manually - Fix email unique constraint for empty strings
from django.db import migrations, models


def convert_empty_emails_to_null(apps, schema_editor):
    """Convert all empty string emails to NULL to avoid unique constraint issues"""
    CustomUser = apps.get_model('students', 'CustomUser')
    # Update all users with empty string email to NULL
    updated = CustomUser.objects.filter(email='').update(email=None)
    print(f"Converted {updated} empty emails to NULL")


def reverse_convert_emails(apps, schema_editor):
    """Reverse migration - convert NULL emails back to empty strings"""
    CustomUser = apps.get_model('students', 'CustomUser')
    CustomUser.objects.filter(email__isnull=True).update(email='')


class Migration(migrations.Migration):

    dependencies = [
        ('students', '0017_school_deactivated_at_school_deactivated_by'),
    ]

    operations = [
        # First, run the data migration to convert empty strings to NULL
        migrations.RunPython(convert_empty_emails_to_null, reverse_convert_emails),

        # Then update the field to allow blank=True
        migrations.AlterField(
            model_name='customuser',
            name='email',
            field=models.EmailField(
                blank=True,  # Allow empty in forms
                error_messages={'unique': 'A user with this email already exists.'},
                max_length=254,
                null=True,  # Allow NULL in database
                unique=True,  # Unique constraint (NULL values are ignored by PostgreSQL)
                verbose_name='email address',
            ),
        ),
    ]
