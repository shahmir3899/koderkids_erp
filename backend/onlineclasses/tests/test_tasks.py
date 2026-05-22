"""
Tests for onlineclasses Celery tasks.
"""
from datetime import timedelta
from unittest.mock import MagicMock, patch

from django.test import TestCase
from django.utils import timezone

from students.models import Attendance, CustomUser, School, Student
from onlineclasses.models import ClassParticipant, OnlineClassSession


def _make_school():
    return School.objects.create(name='Task Test School')


def _make_teacher(username='task_teacher'):
    return CustomUser.objects.create_user(username=username, password='pass', role='Teacher')


def _make_student(school, name='Bob', reg_num='T001'):
    user = CustomUser.objects.create_user(username=reg_num, password='pass', role='Student')
    return Student.objects.create(
        name=name, reg_num=reg_num, school=school,
        user=user, student_class='1', monthly_fee=0, student_subtype='ONLINE',
    )


def _make_student_with_subtype(school, name='Bob', reg_num='T010', subtype='ONLINE'):
    user = CustomUser.objects.create_user(username=reg_num, password='pass', role='Student')
    return Student.objects.create(
        name=name,
        reg_num=reg_num,
        school=school,
        user=user,
        student_class='1',
        monthly_fee=0,
        student_subtype=subtype,
    )


def _make_session(teacher, school, duration=60):
    return OnlineClassSession.objects.create(
        title='Task Session',
        teacher=teacher,
        school=school,
        scheduled_at=timezone.now() - timedelta(hours=1),
        duration_mins=duration,
        status=OnlineClassSession.STATUS_ENDED,
        ended_at=timezone.now(),
    )


# ---------------------------------------------------------------------------
# auto_mark_attendance
# ---------------------------------------------------------------------------

class AutoMarkAttendanceTaskTest(TestCase):
    def setUp(self):
        self.school = _make_school()
        self.teacher = _make_teacher()
        self.session = _make_session(self.teacher, self.school, duration=60)
        self.student = _make_student(self.school)

    def _add_participant(self, duration_mins):
        return ClassParticipant.objects.create(
            session=self.session,
            student=self.student,
            joined_at=timezone.now() - timedelta(minutes=duration_mins),
            left_at=timezone.now(),
            duration_mins=duration_mins,
        )

    def test_participant_at_70_percent_gets_attendance(self):
        """42 min out of 60 = 70 % threshold → should be marked."""
        self._add_participant(42)
        from onlineclasses.tasks import auto_mark_attendance
        auto_mark_attendance(self.session.id)
        self.assertTrue(Attendance.objects.filter(student=self.student).exists())
        att = Attendance.objects.get(student=self.student)
        self.assertEqual(att.status, 'Present')

    def test_participant_below_threshold_not_marked(self):
        """41 min out of 60 = 68 % → below 70 %, should NOT be marked."""
        self._add_participant(41)
        from onlineclasses.tasks import auto_mark_attendance
        auto_mark_attendance(self.session.id)
        self.assertFalse(Attendance.objects.filter(student=self.student).exists())

    def test_task_is_idempotent(self):
        """Running the task twice must not create duplicate Attendance rows."""
        self._add_participant(60)
        from onlineclasses.tasks import auto_mark_attendance
        auto_mark_attendance(self.session.id)
        auto_mark_attendance(self.session.id)
        self.assertEqual(Attendance.objects.filter(student=self.student).count(), 1)

    def test_attendance_auto_marked_flag_set(self):
        p = self._add_participant(60)
        from onlineclasses.tasks import auto_mark_attendance
        auto_mark_attendance(self.session.id)
        p.refresh_from_db()
        self.assertTrue(p.attendance_auto_marked)

    def test_nonexistent_session_does_not_raise(self):
        from onlineclasses.tasks import auto_mark_attendance
        # Should log a warning and return, not raise
        auto_mark_attendance(99999)


# ---------------------------------------------------------------------------
# send_class_reminder
# ---------------------------------------------------------------------------

class SendClassReminderTaskTest(TestCase):
    def setUp(self):
        self.school = _make_school()
        self.teacher = _make_teacher('reminder_teacher')
        self.session = OnlineClassSession.objects.create(
            title='Reminder Session',
            teacher=self.teacher,
            school=self.school,
            scheduled_at=timezone.now() + timedelta(hours=1),
            duration_mins=60,
            status=OnlineClassSession.STATUS_SCHEDULED,
        )
        self.student = _make_student(self.school, 'Charlie', 'T002')
        self.student.user.email = 'charlie@test.com'
        self.student.user.save()

    @patch('onlineclasses.tasks.send_mail')
    @patch('onlineclasses.tasks.requests')
    def test_email_sent_to_student(self, mock_requests, mock_send_mail):
        from onlineclasses.tasks import send_class_reminder
        send_class_reminder(self.session.id)
        mock_send_mail.assert_called_once()
        args = mock_send_mail.call_args
        self.assertIn('charlie@test.com', args[0][3])  # recipient list

    @patch('onlineclasses.tasks.send_mail')
    @patch('onlineclasses.tasks.requests')
    def test_fallback_reminder_includes_onsite_students(self, mock_requests, mock_send_mail):
        onsite = _make_student_with_subtype(
            self.school,
            name='Onsite Learner',
            reg_num='T099',
            subtype='ONSITE',
        )
        onsite.user.email = 'onsite@test.com'
        onsite.user.save(update_fields=['email'])

        from onlineclasses.tasks import send_class_reminder

        send_class_reminder(self.session.id)
        self.assertEqual(mock_send_mail.call_count, 2)

        recipient_emails = {call.args[3][0] for call in mock_send_mail.call_args_list}
        self.assertIn('charlie@test.com', recipient_emails)
        self.assertIn('onsite@test.com', recipient_emails)

    @patch('onlineclasses.tasks.send_mail')
    @patch('onlineclasses.tasks.requests')
    def test_cancelled_session_skipped(self, mock_requests, mock_send_mail):
        self.session.status = OnlineClassSession.STATUS_CANCELLED
        self.session.save()
        from onlineclasses.tasks import send_class_reminder
        send_class_reminder(self.session.id)
        mock_send_mail.assert_not_called()

    @patch('onlineclasses.tasks.send_mail')
    @patch('onlineclasses.tasks.requests')
    def test_nonexistent_session_does_not_raise(self, mock_requests, mock_send_mail):
        from onlineclasses.tasks import send_class_reminder
        send_class_reminder(99999)
        mock_send_mail.assert_not_called()
