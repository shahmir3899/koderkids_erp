# Generated data migration to seed Badge table

from django.db import migrations


def seed_badges(apps, schema_editor):
    """Seed the Badge table with initial achievement badges."""
    Badge = apps.get_model('students', 'Badge')

    badges = [
        {
            'name': '5 Day Streak',
            'description': 'Achieved a 5-day attendance streak! Keep up the momentum!',
            'icon': '⭐',
            'badge_type': 'streak_5',
            'criteria_value': 5,
        },
        {
            'name': '10 Day Streak',
            'description': 'Amazing! You maintained a 10-day attendance streak!',
            'icon': '🌟',
            'badge_type': 'streak_10',
            'criteria_value': 10,
        },
        {
            'name': '30 Day Streak',
            'description': 'Incredible! A full month of consistent attendance!',
            'icon': '🏆',
            'badge_type': 'streak_30',
            'criteria_value': 30,
        },
        {
            'name': 'Perfect Week',
            'description': 'Attended all classes in a week! Perfect attendance!',
            'icon': '🎯',
            'badge_type': 'perfect_week',
            'criteria_value': 5,
        },
        {
            'name': 'First Month Complete',
            'description': 'Congratulations on completing your first month!',
            'icon': '🎉',
            'badge_type': 'first_month',
            'criteria_value': 30,
        },
    ]

    for badge_data in badges:
        Badge.objects.get_or_create(
            badge_type=badge_data['badge_type'],
            defaults=badge_data
        )


def remove_badges(apps, schema_editor):
    """Remove seeded badges (for rollback)."""
    Badge = apps.get_model('students', 'Badge')
    Badge.objects.filter(badge_type__in=[
        'streak_5', 'streak_10', 'streak_30', 'perfect_week', 'first_month'
    ]).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('students', '0023_badge_studentbadge'),
    ]

    operations = [
        migrations.RunPython(seed_badges, remove_badges),
    ]
