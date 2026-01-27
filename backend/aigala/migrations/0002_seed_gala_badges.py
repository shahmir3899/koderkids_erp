# Data migration to seed AI Gala badges

from django.db import migrations


def seed_gala_badges(apps, schema_editor):
    """Create AI Gala badges."""
    Badge = apps.get_model('students', 'Badge')

    gala_badges = [
        {
            'badge_type': 'gala_champion',
            'name': 'AI Gala Champion',
            'description': 'Won 1st place in an AI Gala competition! You are a true AI creative master.',
            'icon': '🏆',
            'criteria_value': 1,
        },
        {
            'badge_type': 'gala_innovator',
            'name': 'AI Innovator',
            'description': 'Won 2nd place in an AI Gala! Your innovative ideas shine through.',
            'icon': '🥈',
            'criteria_value': 1,
        },
        {
            'badge_type': 'gala_creator',
            'name': 'AI Creator',
            'description': 'Won 3rd place in an AI Gala! Your creativity is remarkable.',
            'icon': '🥉',
            'criteria_value': 1,
        },
        {
            'badge_type': 'gala_participant',
            'name': 'Gala Participant',
            'description': 'Participated in an AI Gala and showcased your AI creation to the world!',
            'icon': '⭐',
            'criteria_value': 1,
        },
        {
            'badge_type': 'gala_veteran',
            'name': 'Gala Veteran',
            'description': 'Participated in 5 or more AI Galas! You are a dedicated AI artist.',
            'icon': '🎖️',
            'criteria_value': 5,
        },
        {
            'badge_type': 'gala_superstar',
            'name': 'Gala Superstar',
            'description': 'Won 3 or more AI Gala competitions! You are an AI superstar!',
            'icon': '🌟',
            'criteria_value': 3,
        },
    ]

    for badge_data in gala_badges:
        Badge.objects.get_or_create(
            badge_type=badge_data['badge_type'],
            defaults=badge_data
        )


def reverse_seed(apps, schema_editor):
    """Remove AI Gala badges."""
    Badge = apps.get_model('students', 'Badge')
    Badge.objects.filter(badge_type__startswith='gala_').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('aigala', '0001_initial'),
        ('students', '0024_seed_badges'),
    ]

    operations = [
        migrations.RunPython(seed_gala_badges, reverse_seed),
    ]
