# students/management/commands/sync_student_names.py
from django.core.management.base import BaseCommand
from students.models import Student

class Command(BaseCommand):
    help = 'Sync Student.name → CustomUser.first_name + last_name'

    def handle(self, *args, **options):
        updated = 0
        for student in Student.objects.filter(user__isnull=False):
            user = student.user
            name_parts = student.name.strip().split()
            first_name = name_parts[0]
            last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""

            if user.first_name != first_name or user.last_name != last_name:
                user.first_name = first_name
                user.last_name = last_name
                user.save(update_fields=['first_name', 'last_name'])
                updated += 1

            if updated % 50 == 0:
                self.stdout.write(f"Updated {updated} users...")

        self.stdout.write(self.style.SUCCESS(f"Done! Updated {updated} users."))