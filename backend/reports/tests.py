from datetime import date, timedelta
from io import BytesIO
from unittest.mock import patch

from django.core.management import call_command
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from rest_framework.test import APITestCase

from reports.models import ReportRequest, ReportTemplate, StudentReportGenerationEvent
from students.models import Attendance, CustomUser, LessonPlan, School, Student


class StudentsProgressQueryTests(APITestCase):
    """students_progress and get_student_achieved_topics_count must not issue per-student queries."""

    def setUp(self):
        self.teacher = CustomUser.objects.create_user(
            username='teacher_progress', password='testpass123', role='Teacher',
        )
        self.school = School.objects.create(name='Progress School')
        self.teacher.assigned_schools.add(self.school)
        self.date = date(2026, 3, 12)
        self.students = [
            Student.objects.create(
                reg_num=f'PRG-{i:02d}', name=f'Pupil {i:02d}', school=self.school,
                student_class='Class 5', status='Active',
            )
            for i in range(10)
        ]
        # Inactive / other-class students must be excluded.
        Student.objects.create(reg_num='PRG-X1', name='Inactive', school=self.school,
                               student_class='Class 5', status='Inactive')
        Student.objects.create(reg_num='PRG-X2', name='Other class', school=self.school,
                               student_class='Class 6', status='Active')
        self.lesson_plan = LessonPlan.objects.create(
            session_date=self.date, teacher=self.teacher, school=self.school,
            student_class='Class 5', planned_topic='Loops',
        )
        # 0-3 Present with topics, 4-5 Absent, 6-9 no attendance row.
        self.attendance = {}
        for i, s in enumerate(self.students[:6]):
            self.attendance[s.id] = Attendance.objects.create(
                student=s, session_date=self.date, teacher=self.teacher,
                status='Present' if i < 4 else 'Absent',
                achieved_topic=f'Topic {i}' if i < 4 else None,
            )
        self.client.force_authenticate(self.teacher)

    def _get_progress(self):
        return self.client.get(
            '/api/reports/students-progress/',
            {'school_id': self.school.id, 'class_id': 'Class 5', 'session_date': '03/12/2026'},
        )

    def test_students_progress_query_count_is_constant(self):
        # lesson plan + students + attendance + lesson plan serializer lookups (fixed, not per student)
        with CaptureQueriesContext(connection) as ctx:
            response = self._get_progress()
        self.assertEqual(response.status_code, 200)
        attendance_queries = [q for q in ctx.captured_queries if 'students_attendance' in q['sql']]
        self.assertEqual(len(attendance_queries), 1)
        self.assertLessEqual(len(ctx.captured_queries), 6, [q['sql'] for q in ctx.captured_queries])

    def test_students_progress_response_unchanged(self):
        response = self._get_progress()
        self.assertEqual(response.status_code, 200)
        expected = []
        for s in self.students:  # Student ordering is by name, matching creation order
            att = self.attendance.get(s.id)
            expected.append({
                'id': s.id,
                'name': s.name,
                'class_id': 'Class 5',
                'school_id': self.school.id,
                'attendance_id': att.id if att else None,
                'status': att.status if att else 'N/A',
                'achieved_topic': att.achieved_topic if att else '',
                'lesson_plan_id': self.lesson_plan.id,
            })
        self.assertEqual(response.data['students'], expected)
        self.assertEqual(response.data['lesson_plan']['id'], self.lesson_plan.id)
        # None achieved_topic on an Absent row is returned as None, as before.
        self.assertIsNone(response.data['students'][4]['achieved_topic'])

    def test_students_progress_does_not_log_student_details(self):
        with self.assertLogs('reports.views', level='INFO') as logs:
            self._get_progress()
        joined = '\n'.join(logs.output)
        self.assertIn('Found 10 active students', joined)
        for s in self.students:
            self.assertNotIn(s.name, joined)

    def test_achieved_topics_count_query_count_and_output(self):
        # Extra topic rows on a different date for student 0, so distinct count is 2.
        Attendance.objects.create(
            student=self.students[0], session_date=date(2026, 3, 13), teacher=self.teacher,
            status='Present', achieved_topic='Topic extra',
        )
        with CaptureQueriesContext(connection) as ctx:
            response = self.client.get(
                '/api/reports/student-achieved-topics-count/',
                {'month': '2026-03', 'school_id': self.school.id, 'student_class': 'Class 5'},
            )
        self.assertEqual(response.status_code, 200)
        # assigned_schools check + students + aggregate; never per student
        self.assertLessEqual(len(ctx.captured_queries), 3, [q['sql'] for q in ctx.captured_queries])
        expected_counts = [2, 1, 1, 1] + [0] * 6
        self.assertEqual(
            response.data,
            [{'student_id': s.id, 'name': s.name, 'topics_achieved': c}
             for s, c in zip(self.students, expected_counts)],
        )


class ReportAnalyticsTests(APITestCase):
    def setUp(self):
        self.admin = CustomUser.objects.create_user(
            username='admin_reports',
            password='testpass123',
            role='Admin',
        )
        self.teacher = CustomUser.objects.create_user(
            username='teacher_reports',
            password='testpass123',
            role='Teacher',
        )
        self.school = School.objects.create(name='Test School')
        self.teacher.assigned_schools.add(self.school)
        self.student = Student.objects.create(
            reg_num='RPT-001',
            name='Student One',
            school=self.school,
            student_class='Class 1',
            status='Active',
        )
        self.template = ReportTemplate.objects.create(
            code='salary_certificate_test',
            name='Salary Certificate',
            category='hr',
            allowed_roles=['Admin', 'Teacher'],
            allowed_self_request=True,
            allowed_other_request=True,
            requires_target_employee=False,
            is_active=True,
        )

    @patch('reports.views.generate_pdf_content')
    @patch('reports.views.fetch_student_images')
    @patch('reports.views.fetch_student_data')
    def test_single_pdf_generation_logs_event(self, mock_fetch_student_data, mock_fetch_images, mock_generate_pdf_content):
        self.client.force_authenticate(self.teacher)
        mock_fetch_student_data.return_value = (
            self.student,
            {'present': 10, 'total_days': 12, 'percentage': 83.3},
            [],
        )
        mock_fetch_images.return_value = []
        mock_generate_pdf_content.return_value = BytesIO(b'%PDF-1.4 test')

        response = self.client.post(
            '/api/generate-pdf/',
            data={
                'studentData': {
                    'student_id': self.student.id,
                    'school_id': self.school.id,
                    'student_class': self.student.student_class,
                },
                'mode': 'month',
                'month': '2026-04',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        event = StudentReportGenerationEvent.objects.get(event_type='single_pdf')
        self.assertEqual(event.generated_by_id, self.teacher.id)
        self.assertEqual(event.student_id, self.student.id)
        self.assertEqual(event.period_month, '2026-04')

    @patch('reports.views.generate_pdf_content')
    @patch('reports.views.fetch_student_images')
    @patch('reports.views.fetch_student_data')
    def test_bulk_pdf_generation_logs_per_student_event(self, mock_fetch_student_data, mock_fetch_images, mock_generate_pdf_content):
        self.client.force_authenticate(self.teacher)
        mock_fetch_student_data.return_value = (
            self.student,
            {'present': 8, 'total_days': 10, 'percentage': 80.0},
            [],
        )
        mock_fetch_images.return_value = []
        mock_generate_pdf_content.return_value = BytesIO(b'%PDF-1.4 bulk')

        response = self.client.post(
            '/reports/api/generate-bulk-pdf-zip/',
            data={
                'student_ids': [self.student.id],
                'mode': 'month',
                'month': '2026-04',
                'school_id': self.school.id,
                'student_class': self.student.student_class,
            },
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        events = StudentReportGenerationEvent.objects.filter(event_type='bulk_pdf_item')
        self.assertEqual(events.count(), 1)
        self.assertIsNotNone(events.first().request_id)

    def test_teacher_scoped_analytics_endpoint(self):
        StudentReportGenerationEvent.objects.create(
            event_type='single_pdf',
            generated_by=self.teacher,
            student=self.student,
            school=self.school,
            student_class='Class 1',
            period_mode='month',
            period_month='2026-04',
            period_start=timezone.now().date().replace(day=1),
            period_end=timezone.now().date(),
            source='reports_page',
        )
        self.client.force_authenticate(self.teacher)
        response = self.client.get('/api/reports/analytics/student-reports/user-summary/?month=2026-04')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['user_id'], self.teacher.id)

    def test_monthly_breakdown_returns_class_user_and_timeline_data(self):
        StudentReportGenerationEvent.objects.create(
            event_type='single_pdf',
            generated_by=self.teacher,
            student=self.student,
            school=self.school,
            student_class='Class 1',
            period_mode='month',
            period_month='2026-04',
            period_start=timezone.now().date().replace(day=1),
            period_end=timezone.now().date(),
            source='reports_page',
        )
        self.client.force_authenticate(self.teacher)
        response = self.client.get('/api/reports/analytics/student-reports/monthly-breakdown/?month=2026-04')

        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(response.data['total'], 1)
        self.assertTrue(any(row['student_class'] == 'Class 1' for row in response.data['by_class']))
        self.assertTrue(any(row['user_id'] == self.teacher.id for row in response.data['by_user']))
        user_row = next((row for row in response.data['by_user'] if row['user_id'] == self.teacher.id), None)
        self.assertIsNotNone(user_row)
        self.assertTrue(any(s['id'] == self.school.id for s in user_row.get('assigned_schools', [])))
        self.assertIn('by_school', response.data)
        school_row = next((row for row in response.data['by_school'] if row['school_id'] == self.school.id), None)
        self.assertIsNotNone(school_row)
        self.assertTrue(any(cls['class_name'] == 'Class 1' for cls in school_row.get('classes', [])))
        self.assertGreaterEqual(len(response.data['timeline']), 1)

    def test_monthly_breakdown_includes_zero_count_classes(self):
        Student.objects.create(
            reg_num='RPT-002',
            name='Student Two',
            school=self.school,
            student_class='Class 2',
            status='Active',
        )
        StudentReportGenerationEvent.objects.create(
            event_type='single_pdf',
            generated_by=self.teacher,
            student=self.student,
            school=self.school,
            student_class='Class 1',
            period_mode='month',
            period_month='2026-04',
            period_start=timezone.now().date().replace(day=1),
            period_end=timezone.now().date(),
            source='reports_page',
        )
        self.client.force_authenticate(self.teacher)
        response = self.client.get('/api/reports/analytics/student-reports/monthly-breakdown/?month=2026-04')
        self.assertEqual(response.status_code, 200)

        school_row = next((row for row in response.data['by_school'] if row['school_id'] == self.school.id), None)
        self.assertIsNotNone(school_row)
        class_map = {cls['class_name']: cls['generated_count'] for cls in school_row.get('classes', [])}
        self.assertEqual(class_map.get('Class 1'), 1)
        self.assertEqual(class_map.get('Class 2'), 0)

    def test_timeline_endpoint_returns_bucketed_results(self):
        StudentReportGenerationEvent.objects.create(
            event_type='bulk_pdf_item',
            generated_by=self.teacher,
            student=self.student,
            school=self.school,
            student_class='Class 1',
            period_mode='month',
            period_month='2026-04',
            period_start=timezone.now().date().replace(day=1),
            period_end=timezone.now().date(),
            source='reports_page',
        )
        self.client.force_authenticate(self.teacher)
        response = self.client.get('/api/reports/analytics/student-reports/timeline/?month=2026-04&bucket=day')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['bucket'], 'day')
        self.assertGreaterEqual(len(response.data['results']), 1)
        self.assertGreaterEqual(response.data['results'][0]['generated_count'], 1)

    def test_admin_monitoring_endpoint(self):
        ReportRequest.objects.create(
            requested_by=self.teacher,
            target_employee=self.teacher,
            template=self.template,
            subject='Test Subject',
            recipient_text='To whom',
            body_text='Body',
            line_spacing='single',
            status='DRAFT',
        )

        self.client.force_authenticate(self.admin)
        response = self.client.get('/api/reports/requests/admin-monitoring/')
        self.assertEqual(response.status_code, 200)
        self.assertIn('totals', response.data)
        self.assertIn('by_template', response.data)

    def test_purge_old_report_generation_events_command(self):
        old_event = StudentReportGenerationEvent.objects.create(
            event_type='single_pdf',
            generated_by=self.teacher,
            student=self.student,
            school=self.school,
            student_class='Class 1',
            period_mode='month',
            period_month='2025-01',
            period_start=timezone.now().date().replace(day=1),
            period_end=timezone.now().date(),
            source='reports_page',
        )
        StudentReportGenerationEvent.objects.filter(id=old_event.id).update(
            generated_at=timezone.now() - timedelta(days=190)
        )

        call_command('purge_old_report_generation_events')
        self.assertFalse(StudentReportGenerationEvent.objects.filter(id=old_event.id).exists())
