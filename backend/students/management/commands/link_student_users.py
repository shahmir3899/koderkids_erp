# students/management/commands/link_student_users.py
from django.core.management.base import BaseCommand
from students.models import Student, CustomUser
from django.contrib.auth.hashers import make_password

class Command(BaseCommand):
    help = 'Create CustomUser for every Student and link them'

    def handle(self, *args, **options):
        created = 0
        skipped = 0

        for student in Student.objects.filter(user__isnull=True):
            username = student.reg_num
            if CustomUser.objects.filter(username=username).exists():
                skipped += 1
                continue

            user = CustomUser.objects.create(
                username=username,
                password=make_password('1234'),  # Default password
                first_name=student.name.split()[0],
                role='Student'
            )
            student.user = user
            student.save()
            created += 1

        self.stdout.write(
            self.style.SUCCESS(f"Created {created} users, skipped {skipped} (already exist)")
        )