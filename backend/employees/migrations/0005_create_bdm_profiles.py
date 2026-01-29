# Generated migration to create TeacherProfile for existing BDM users

from django.db import migrations


def create_bdm_profiles(apps, schema_editor):
    """
    Create TeacherProfile for existing BDM users who don't have one.
    """
    CustomUser = apps.get_model('students', 'CustomUser')
    TeacherProfile = apps.get_model('employees', 'TeacherProfile')

    # Find all BDM users without a TeacherProfile
    bdm_users = CustomUser.objects.filter(role='BDM')

    created_count = 0
    for user in bdm_users:
        # Check if profile already exists
        if not TeacherProfile.objects.filter(user=user).exists():
            # Generate employee ID for BDM
            prefix = 'KK-BDM'
            start_number = 1

            # Get the last BDM employee ID
            last_profile = TeacherProfile.objects.filter(
                employee_id__startswith=prefix
            ).order_by('-employee_id').first()

            if last_profile and last_profile.employee_id:
                try:
                    last_number = int(last_profile.employee_id.split('-')[-1])
                    new_number = last_number + 1
                except (ValueError, IndexError):
                    new_number = start_number
            else:
                new_number = start_number

            employee_id = f"{prefix}-{new_number:03d}"

            # Create the profile
            TeacherProfile.objects.create(
                user=user,
                employee_id=employee_id
            )
            created_count += 1
            print(f"Created TeacherProfile for BDM user: {user.username} with ID: {employee_id}")

    print(f"Created {created_count} TeacherProfile(s) for BDM users.")


def reverse_bdm_profiles(apps, schema_editor):
    """
    Reverse migration - delete TeacherProfiles for BDM users
    (only those with KK-BDM prefix to be safe)
    """
    TeacherProfile = apps.get_model('employees', 'TeacherProfile')
    TeacherProfile.objects.filter(employee_id__startswith='KK-BDM').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('employees', '0004_validation_system_final'),
    ]

    operations = [
        migrations.RunPython(create_bdm_profiles, reverse_bdm_profiles),
    ]
