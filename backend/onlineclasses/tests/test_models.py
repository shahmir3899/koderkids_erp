"""
Tests for onlineclasses models.
"""
from django.test import TestCase
from django.utils import timezone

from students.models import CustomUser, School, Student
from onlineclasses.models import (
    ClassParticipant,
    ClassRecording,
    OnlineClassSession,
    _generate_room_name,
)


def _make_school(name='Test School'):
    return School.objects.create(name=name)


def _make_teacher(username='teacher1'):
    return CustomUser.objects.create_user(
        username=username, password='pass', role='Teacher'
    )


def _make_student(school, name='Alice', reg_num='S001'):
    user = CustomUser.objects.create_user(
        username=reg_num, password='pass', role='Student'
    )
    return Student.objects.create(
        name=name,
        reg_num=reg_num,
        school=school,
        user=user,
        student_class='1',
        monthly_fee=0,
    )


def _make_session(teacher, school, **kwargs):
    defaults = dict(
        title='Test Session',
        scheduled_at=timezone.now(),
        duration_mins=60,
    )
    defaults.update(kwargs)
    return OnlineClassSession.objects.create(teacher=teacher, school=school, **defaults)


class RoomNameGenerationTest(TestCase):
    def test_room_name_format(self):
        name = _generate_room_name()
        self.assertTrue(name.startswith('session-'))
        self.assertEqual(len(name), len('session-') + 12)

    def test_room_names_are_unique(self):
        names = {_generate_room_name() for _ in range(50)}
        self.assertEqual(len(names), 50)


class OnlineClassSessionModelTest(TestCase):
    def setUp(self):
        self.school = _make_school()
        self.teacher = _make_teacher()

    def test_create_session(self):
        session = _make_session(self.teacher, self.school)
        self.assertEqual(session.status, OnlineClassSession.STATUS_SCHEDULED)
        self.assertTrue(session.chat_enabled)
        self.assertFalse(session.recording_enabled)
        self.assertFalse(session.screenshare_student_allowed)

    def test_room_name_auto_generated(self):
        session = _make_session(self.teacher, self.school)
        self.assertTrue(session.room_name.startswith('session-'))

    def test_room_name_is_unique(self):
        s1 = _make_session(self.teacher, self.school, title='S1')
        s2 = _make_session(self.teacher, self.school, title='S2')
        self.assertNotEqual(s1.room_name, s2.room_name)

    def test_str_representation(self):
        session = _make_session(self.teacher, self.school, title='My Class')
        self.assertIn('My Class', str(session))

    def test_status_choices(self):
        valid = {c[0] for c in OnlineClassSession.STATUS_CHOICES}
        self.assertIn('scheduled', valid)
        self.assertIn('live', valid)
        self.assertIn('ended', valid)
        self.assertIn('cancelled', valid)


class ClassParticipantModelTest(TestCase):
    def setUp(self):
        self.school = _make_school()
        self.teacher = _make_teacher()
        self.session = _make_session(self.teacher, self.school)
        self.student = _make_student(self.school)

    def test_create_participant(self):
        p = ClassParticipant.objects.create(
            session=self.session, student=self.student
        )
        self.assertFalse(p.attendance_auto_marked)
        self.assertEqual(p.duration_mins, 0)

    def test_unique_together_constraint(self):
        from django.db import IntegrityError
        ClassParticipant.objects.create(session=self.session, student=self.student)
        with self.assertRaises(IntegrityError):
            ClassParticipant.objects.create(session=self.session, student=self.student)

    def test_str_representation(self):
        p = ClassParticipant.objects.create(session=self.session, student=self.student)
        self.assertIn(self.student.name, str(p))


class ClassRecordingModelTest(TestCase):
    def setUp(self):
        self.school = _make_school()
        self.teacher = _make_teacher()
        self.session = _make_session(self.teacher, self.school)

    def test_create_recording(self):
        rec = ClassRecording.objects.create(
            session=self.session,
            url='https://example.com/rec.mp4',
            duration_seconds=3600,
        )
        self.assertEqual(rec.session, self.session)

    def test_cascade_delete(self):
        ClassRecording.objects.create(
            session=self.session, url='https://example.com/r.mp4'
        )
        self.session.delete()
        self.assertEqual(ClassRecording.objects.count(), 0)
