from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

from students.models import School, Student
from students.subtypes import StudentSubtype


class Command(BaseCommand):
    help = 'Seed one ONLINE subtype student for LMS testing (idempotent).'

    def add_arguments(self, parser):
        parser.add_argument('--username', default='online_student_seed')
        parser.add_argument('--password', default='SeedPass123!')
        parser.add_argument('--school', default='Online Seed School')
        parser.add_argument('--student-class', dest='student_class', default='Online-1')
        parser.add_argument('--name', default='Online Seed Student')
        parser.add_argument('--reg-num', dest='reg_num', default='ONLINE-SEED-001')

    def handle(self, *args, **options):
        username = options['username']
        password = options['password']
        school_name = options['school']
        student_class = options['student_class']
        student_name = options['name']
        reg_num = options['reg_num']

        User = get_user_model()

        school, _ = School.objects.get_or_create(name=school_name)

        user, user_created = User.objects.get_or_create(
            username=username,
            defaults={
                'role': 'Student',
                'first_name': student_name.split(' ')[0],
                'last_name': ' '.join(student_name.split(' ')[1:]),
                'is_active': True,
            },
        )

        if user_created:
            user.set_password(password)
            user.save(update_fields=['password'])
        elif user.role != 'Student':
            user.role = 'Student'
            user.save(update_fields=['role'])

        student_defaults = {
            'name': student_name,
            'school': school,
            'student_class': student_class,
            'student_subtype': StudentSubtype.ONLINE,
            'status': 'Active',
            'user': user,
        }

        student, student_created = Student.objects.get_or_create(
            reg_num=reg_num,
            defaults=student_defaults,
        )

        changed = []
        if not student_created:
            if student.user_id != user.id:
                student.user = user
                changed.append('user')
            if student.student_subtype != StudentSubtype.ONLINE:
                student.student_subtype = StudentSubtype.ONLINE
                changed.append('student_subtype')
            if student.school_id != school.id:
                student.school = school
                changed.append('school')
            if student.student_class != student_class:
                student.student_class = student_class
                changed.append('student_class')
            if student.name != student_name:
                student.name = student_name
                changed.append('name')
            if changed:
                student.save(update_fields=changed)

        status_text = 'created' if student_created else 'updated'
        self.stdout.write(
            self.style.SUCCESS(
                f'ONLINE subtype student {status_text}: username={user.username}, reg_num={student.reg_num}, subtype={student.student_subtype}'
            )
        )
