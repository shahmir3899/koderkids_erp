"""
API tests for onlineclasses views.
"""
import json
from unittest.mock import patch, MagicMock
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from students.models import CustomUser, School, Student
from onlineclasses.models import ClassParticipant, ClassRecording, OnlineClassSession


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_school(name='Test School'):
    return School.objects.create(name=name)


def _make_teacher(username='teacher1', school=None):
    user = CustomUser.objects.create_user(username=username, password='pass', role='Teacher')
    if school:
        user.assigned_schools.add(school)
    return user


def _make_admin(username='admin1'):
    return CustomUser.objects.create_user(username=username, password='pass', role='Admin')


def _make_student_user(school, name='Alice', reg_num='S001', subtype='ONLINE'):
    user = CustomUser.objects.create_user(username=reg_num, password='pass', role='Student')
    student = Student.objects.create(
        name=name, reg_num=reg_num, school=school, user=user,
        student_class='1', monthly_fee=0, student_subtype=subtype,
    )
    return user, student


def _make_session(teacher, school, **kwargs):
    defaults = dict(title='Test Session', scheduled_at=timezone.now(), duration_mins=60)
    defaults.update(kwargs)
    return OnlineClassSession.objects.create(teacher=teacher, school=school, **defaults)


def _auth(client, user):
    client.force_authenticate(user=user)


# ---------------------------------------------------------------------------
# Session list / create
# ---------------------------------------------------------------------------

class SessionListCreateTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.school = _make_school()
        self.other_school = _make_school('Other School')
        self.teacher = _make_teacher('t1', self.school)
        self.other_teacher = _make_teacher('t2', self.other_school)
        self.admin = _make_admin('admin-main')
        self.student_user, self.student = _make_student_user(self.school)
        self.url = '/api/onlineclasses/sessions/'

    def test_teacher_can_list_own_sessions(self):
        _make_session(self.teacher, self.school)
        _auth(self.client, self.teacher)
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 1)

    def test_student_can_list_school_sessions(self):
        _make_session(self.teacher, self.school)
        _auth(self.client, self.student_user)
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 1)

    def test_student_cannot_see_other_school_sessions(self):
        _make_session(self.other_teacher, self.other_school)
        _auth(self.client, self.student_user)
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 0)

    def test_teacher_can_create_session(self):
        _auth(self.client, self.teacher)
        data = {
            'title': 'New Class',
            'school': self.school.id,
            'scheduled_at': (timezone.now()).isoformat(),
            'duration_mins': 45,
            'recording_enabled': False,
            'chat_enabled': True,
        }
        with patch('onlineclasses.views.send_class_reminder') as mock_task:
            mock_task.apply_async = MagicMock()
            resp = self.client.post(self.url, data, format='json')
        self.assertEqual(resp.status_code, 201)
        self.assertIn('room_name', resp.data)
        self.assertTrue(resp.data['room_name'].startswith('session-'))

    def test_student_cannot_create_session(self):
        _auth(self.client, self.student_user)
        data = {'title': 'X', 'school': self.school.id, 'scheduled_at': timezone.now().isoformat(), 'duration_mins': 60}
        resp = self.client.post(self.url, data, format='json')
        self.assertEqual(resp.status_code, 403)

    def test_unauthenticated_returns_401(self):
        resp = self.client.get(self.url)
        self.assertEqual(resp.status_code, 401)

    def test_status_filter(self):
        _make_session(self.teacher, self.school, status='live')
        _make_session(self.teacher, self.school, status='ended')
        _auth(self.client, self.teacher)
        resp = self.client.get(self.url + '?status=live')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(resp.data[0]['status'], 'live')

    def test_teacher_can_filter_by_assigned_school(self):
        _make_session(self.teacher, self.school, title='School A Class')
        _auth(self.client, self.teacher)
        resp = self.client.get(self.url + f'?school={self.school.id}')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(resp.data[0]['school'], self.school.id)

    def test_teacher_cannot_filter_unassigned_school(self):
        _auth(self.client, self.teacher)
        resp = self.client.get(self.url + f'?school={self.other_school.id}')
        self.assertEqual(resp.status_code, 403)

    def test_admin_can_filter_by_school(self):
        _make_session(self.teacher, self.school, title='School A Class')
        _make_session(self.other_teacher, self.other_school, title='School B Class')
        _auth(self.client, self.admin)
        resp = self.client.get(self.url + f'?school={self.other_school.id}')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(len(resp.data), 1)
        self.assertEqual(resp.data[0]['school'], self.other_school.id)

    def test_admin_can_create_session_for_selected_teacher(self):
        _auth(self.client, self.admin)
        data = {
            'title': 'Admin Planned Class',
            'teacher': self.teacher.id,
            'school': self.school.id,
            'scheduled_at': timezone.now().isoformat(),
            'duration_mins': 45,
            'recording_enabled': False,
            'chat_enabled': True,
        }
        with patch('onlineclasses.views.send_class_reminder') as mock_task:
            mock_task.apply_async = MagicMock()
            resp = self.client.post(self.url, data, format='json')

        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data['teacher'], self.teacher.id)


class SessionBulkCreateTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.school = _make_school()
        self.teacher = _make_teacher('bulk-teacher', self.school)
        self.admin = _make_admin('bulk-admin')
        self.url = '/api/onlineclasses/sessions/bulk/'

    def test_teacher_bulk_dry_run_returns_generated_dates(self):
        _auth(self.client, self.teacher)
        data = {
            'title': 'Bulk Plan',
            'school': self.school.id,
            'duration_mins': 60,
            'bulk_classes_count': 8,
            'bulk_weekdays': ['Mon', 'Wed'],
            'bulk_start_date': timezone.localdate().isoformat(),
            'bulk_time': '10:00',
            'dry_run': True,
        }

        resp = self.client.post(self.url, data, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['dry_run'], True)
        self.assertEqual(resp.data['count'], 8)
        self.assertEqual(len(resp.data['generated_dates']), 8)

    def test_teacher_bulk_create_persists_sessions(self):
        _auth(self.client, self.teacher)
        data = {
            'title': 'Bulk Live Plan',
            'school': self.school.id,
            'duration_mins': 45,
            'bulk_classes_count': 4,
            'bulk_weekdays': ['Tue', 'Thu'],
            'bulk_start_date': timezone.localdate().isoformat(),
            'bulk_time': '09:30',
            'dry_run': False,
        }

        with patch('onlineclasses.views.send_class_reminder') as reminder_task, patch(
            'onlineclasses.views.auto_start_session'
        ) as start_task, patch('onlineclasses.views.auto_end_session') as end_task:
            reminder_task.apply_async = MagicMock()
            start_task.apply_async = MagicMock()
            end_task.apply_async = MagicMock()
            resp = self.client.post(self.url, data, format='json')

        self.assertEqual(resp.status_code, 201)
        self.assertEqual(resp.data['count'], 4)
        self.assertEqual(len(resp.data['sessions']), 4)
        self.assertEqual(OnlineClassSession.objects.filter(teacher=self.teacher).count(), 4)

    def test_admin_bulk_create_for_selected_teacher(self):
        _auth(self.client, self.admin)
        data = {
            'title': 'Admin Bulk Plan',
            'teacher': self.teacher.id,
            'school': self.school.id,
            'duration_mins': 45,
            'bulk_classes_count': 2,
            'bulk_weekdays': ['Fri'],
            'bulk_start_date': timezone.localdate().isoformat(),
            'bulk_time': '11:00',
        }

        with patch('onlineclasses.views.send_class_reminder') as reminder_task, patch(
            'onlineclasses.views.auto_start_session'
        ) as start_task, patch('onlineclasses.views.auto_end_session') as end_task:
            reminder_task.apply_async = MagicMock()
            start_task.apply_async = MagicMock()
            end_task.apply_async = MagicMock()
            resp = self.client.post(self.url, data, format='json')

        self.assertEqual(resp.status_code, 201)
        self.assertTrue(all(s['teacher'] == self.teacher.id for s in resp.data['sessions']))


# ---------------------------------------------------------------------------
# Session detail
# ---------------------------------------------------------------------------

class SessionDetailTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.school = _make_school()
        self.teacher = _make_teacher('t1', self.school)
        self.other_teacher = _make_teacher('t2', self.school)
        self.session = _make_session(self.teacher, self.school)
        self.url = f'/api/onlineclasses/sessions/{self.session.id}/'

    def test_owner_teacher_can_patch(self):
        _auth(self.client, self.teacher)
        resp = self.client.patch(self.url, {'title': 'Updated'}, format='json')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['title'], 'Updated')

    def test_other_teacher_cannot_patch(self):
        _auth(self.client, self.other_teacher)
        resp = self.client.patch(self.url, {'title': 'Hack'}, format='json')
        self.assertEqual(resp.status_code, 403)

    def test_admin_can_patch(self):
        admin = _make_admin()
        _auth(self.client, admin)
        resp = self.client.patch(self.url, {'title': 'Admin Edit'}, format='json')
        self.assertEqual(resp.status_code, 200)

    def test_owner_teacher_can_delete(self):
        _auth(self.client, self.teacher)
        resp = self.client.delete(self.url)
        self.assertEqual(resp.status_code, 204)
        self.assertEqual(OnlineClassSession.objects.count(), 0)

    def test_delete_non_scheduled_session_is_blocked(self):
        self.session.status = OnlineClassSession.STATUS_ENDED
        self.session.save(update_fields=['status'])
        _auth(self.client, self.teacher)
        resp = self.client.delete(self.url)
        self.assertEqual(resp.status_code, 400)


class SessionDeletePastTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.school = _make_school()
        self.teacher = _make_teacher('past-teacher', self.school)
        self.other_teacher = _make_teacher('past-other-teacher', self.school)
        self.admin = _make_admin('past-admin')
        self.ended_session = _make_session(
            self.teacher,
            self.school,
            title='Ended Session',
            status=OnlineClassSession.STATUS_ENDED,
        )
        self.cancelled_session = _make_session(
            self.teacher,
            self.school,
            title='Cancelled Session',
            status=OnlineClassSession.STATUS_CANCELLED,
        )
        self.scheduled_session = _make_session(
            self.teacher,
            self.school,
            title='Scheduled Session',
            status=OnlineClassSession.STATUS_SCHEDULED,
        )
        self.live_session = _make_session(
            self.teacher,
            self.school,
            title='Live Session',
            status=OnlineClassSession.STATUS_LIVE,
        )

    def _url(self, session_id):
        return f'/api/onlineclasses/sessions/{session_id}/delete-past/'

    def test_admin_can_delete_ended_session(self):
        _auth(self.client, self.admin)
        resp = self.client.post(self._url(self.ended_session.id))
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['deleted_session_id'], self.ended_session.id)
        self.assertFalse(OnlineClassSession.objects.filter(id=self.ended_session.id).exists())

    def test_admin_can_delete_cancelled_session(self):
        _auth(self.client, self.admin)
        resp = self.client.post(self._url(self.cancelled_session.id))
        self.assertEqual(resp.status_code, 200)
        self.assertFalse(OnlineClassSession.objects.filter(id=self.cancelled_session.id).exists())

    def test_teacher_can_delete_own_ended_session(self):
        _auth(self.client, self.teacher)
        resp = self.client.post(self._url(self.ended_session.id))
        self.assertEqual(resp.status_code, 200)
        self.assertFalse(OnlineClassSession.objects.filter(id=self.ended_session.id).exists())

    def test_teacher_cannot_delete_other_teachers_ended_session(self):
        session = _make_session(
            self.other_teacher,
            self.school,
            title='Other Ended',
            status=OnlineClassSession.STATUS_ENDED,
        )
        _auth(self.client, self.teacher)
        resp = self.client.post(self._url(session.id))
        self.assertEqual(resp.status_code, 403)

    def test_delete_past_denied_for_scheduled(self):
        _auth(self.client, self.admin)
        resp = self.client.post(self._url(self.scheduled_session.id))
        self.assertEqual(resp.status_code, 400)

    def test_delete_past_denied_for_live(self):
        _auth(self.client, self.admin)
        resp = self.client.post(self._url(self.live_session.id))
        self.assertEqual(resp.status_code, 400)


# ---------------------------------------------------------------------------
# Token generation
# ---------------------------------------------------------------------------

class SessionTokenTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.school = _make_school()
        self.teacher = _make_teacher('t1', self.school)
        self.session = _make_session(self.teacher, self.school)
        self.url = f'/api/onlineclasses/sessions/{self.session.id}/token/'

    def test_teacher_gets_token(self):
        _auth(self.client, self.teacher)
        with patch('onlineclasses.views._generate_livekit_token', return_value='fake-jwt'):
            resp = self.client.post(self.url)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['token'], 'fake-jwt')
        self.assertIn('livekit_url', resp.data)
        self.assertIn('room_name', resp.data)

    def test_enrolled_student_gets_token(self):
        student_user, _ = _make_student_user(self.school, 'Bob', 'S002')
        _auth(self.client, student_user)
        with patch('onlineclasses.views._generate_livekit_token', return_value='student-jwt'):
            resp = self.client.post(self.url)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data['token'], 'student-jwt')

    def test_non_enrolled_student_denied(self):
        other_school = _make_school('Other')
        other_user, _ = _make_student_user(other_school, 'Eve', 'S999')
        _auth(self.client, other_user)
        with patch('onlineclasses.views._generate_livekit_token', return_value='x'):
            resp = self.client.post(self.url)
        self.assertEqual(resp.status_code, 403)

    def test_livekit_error_returns_503(self):
        _auth(self.client, self.teacher)
        with patch('onlineclasses.views._generate_livekit_token', side_effect=RuntimeError('SDK missing')):
            resp = self.client.post(self.url)
        self.assertEqual(resp.status_code, 503)


# ---------------------------------------------------------------------------
# Session start / end
# ---------------------------------------------------------------------------

class SessionStartEndTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.school = _make_school()
        self.teacher = _make_teacher('t1', self.school)
        self.session = _make_session(self.teacher, self.school)

    def test_teacher_can_start(self):
        _auth(self.client, self.teacher)
        resp = self.client.post(f'/api/onlineclasses/sessions/{self.session.id}/start/')
        self.assertEqual(resp.status_code, 200)
        self.session.refresh_from_db()
        self.assertEqual(self.session.status, 'live')

    def test_student_cannot_start(self):
        student_user, _ = _make_student_user(self.school)
        _auth(self.client, student_user)
        resp = self.client.post(f'/api/onlineclasses/sessions/{self.session.id}/start/')
        self.assertEqual(resp.status_code, 403)

    def test_teacher_can_end_and_task_fires(self):
        _auth(self.client, self.teacher)
        with patch('onlineclasses.views.auto_mark_attendance') as mock_task:
            mock_task.delay = MagicMock()
            resp = self.client.post(f'/api/onlineclasses/sessions/{self.session.id}/end/')
        self.assertEqual(resp.status_code, 200)
        self.session.refresh_from_db()
        self.assertEqual(self.session.status, 'ended')
        mock_task.delay.assert_called_once_with(self.session.id)


# ---------------------------------------------------------------------------
# Webhook
# ---------------------------------------------------------------------------

class WebhookTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.school = _make_school()
        self.teacher = _make_teacher('t1', self.school)
        self.session = _make_session(self.teacher, self.school)
        self.student_user, self.student = _make_student_user(self.school)
        self.url = '/api/onlineclasses/webhook/'

    def _payload(self, event, identity=''):
        return json.dumps({
            'event': event,
            'room': {'name': self.session.room_name},
            'participant': {'identity': identity},
        }).encode()

    def test_participant_joined_creates_record(self):
        body = self._payload('participant_joined', f'student-{self.student.id}')
        # No secret configured in test → signature skipped
        resp = self.client.post(self.url, body, content_type='application/json')
        self.assertEqual(resp.status_code, 200)
        self.assertTrue(ClassParticipant.objects.filter(
            session=self.session, student=self.student
        ).exists())

    def test_participant_left_records_duration(self):
        from datetime import timedelta
        ClassParticipant.objects.create(
            session=self.session,
            student=self.student,
            joined_at=timezone.now() - timedelta(minutes=45),
        )
        body = self._payload('participant_left', f'student-{self.student.id}')
        resp = self.client.post(self.url, body, content_type='application/json')
        self.assertEqual(resp.status_code, 200)
        p = ClassParticipant.objects.get(session=self.session, student=self.student)
        self.assertIsNotNone(p.left_at)
        self.assertGreater(p.duration_mins, 0)

    def test_unknown_room_returns_ok(self):
        body = json.dumps({'event': 'participant_joined', 'room': {'name': 'nonexistent'}, 'participant': {'identity': 'x'}}).encode()
        resp = self.client.post(self.url, body, content_type='application/json')
        self.assertEqual(resp.status_code, 200)

    def test_invalid_json_returns_400(self):
        resp = self.client.post(self.url, b'not-json', content_type='application/json')
        self.assertEqual(resp.status_code, 400)

    def test_invalid_signature_returns_400(self):
        import os
        with patch.dict(os.environ, {'LIVEKIT_API_SECRET': 'supersecret'}):
            body = self._payload('participant_joined', f'student-{self.student.id}')
            resp = self.client.post(
                self.url, body, content_type='application/json',
                HTTP_X_LIVEKIT_SIGNATURE='badhash'
            )
        self.assertEqual(resp.status_code, 400)
