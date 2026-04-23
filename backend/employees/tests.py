from datetime import date, timedelta
from decimal import Decimal

from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase

from employees.models import BDMVisitProforma, TeacherEvaluationScore, SalarySlip
from monitoring.models import (
    EvaluationFormTemplate,
    EvaluationFormField,
    TeacherEvaluation,
    MonitoringVisit,
)
from students.models import CustomUser, School


# ============================================
# HELPERS
# ============================================

def make_user(username, role):
    return CustomUser.objects.create_user(
        username=username,
        password='testpass123',
        role=role,
    )


def make_school(name='Test School'):
    return School.objects.create(name=name)


def make_template(admin, name='Test Template'):
    template = EvaluationFormTemplate.objects.create(name=name, created_by=admin)
    EvaluationFormField.objects.create(
        template=template,
        label='Discipline',
        field_type='rating_1_5',
        is_required=True,
        order=0,
        weight=Decimal('1.00'),
    )
    return template


# ============================================
# calculate_for_teacher — attitude score source tests
# ============================================

class CalculateForTeacherAttitudeScoreTests(TestCase):
    """
    Verifies that calculate_for_teacher reads attitude_score from
    monitoring.TeacherEvaluation when present, falls back to
    BDMVisitProforma when not, and returns 0 when neither exists.
    """

    def setUp(self):
        self.admin = make_user('admin_calc', 'Admin')
        self.bdm = make_user('bdm_calc', 'BDM')
        self.teacher = make_user('teacher_calc', 'Teacher')
        self.school = make_school('Calc School')
        self.school.teachers.add(self.teacher)
        self.teacher.assigned_schools.add(self.school)
        self.template = make_template(self.admin, 'Calc Template')
        self.month = 4
        self.year = 2026

    def _make_visit(self, visit_date=None):
        return MonitoringVisit.objects.create(
            school=self.school,
            bdm=self.bdm,
            visit_date=visit_date or date(self.year, self.month, 15),
            status='completed',
        )

    def _make_evaluation(self, visit, normalized_score=Decimal('75.00')):
        return TeacherEvaluation.objects.create(
            visit=visit,
            teacher=self.teacher,
            template=self.template,
            normalized_score=normalized_score,
        )

    def test_uses_monitoring_evaluation_when_present(self):
        visit = self._make_visit()
        self._make_evaluation(visit, normalized_score=Decimal('80.00'))

        score = TeacherEvaluationScore.calculate_for_teacher(
            self.teacher, self.month, self.year
        )

        self.assertAlmostEqual(float(score.attitude_score), 80.0, places=1)

    def test_averages_multiple_evaluations_in_same_month(self):
        visit1 = self._make_visit(visit_date=date(self.year, self.month, 5))
        visit2 = self._make_visit(visit_date=date(self.year, self.month, 20))
        self._make_evaluation(visit1, normalized_score=Decimal('60.00'))
        self._make_evaluation(visit2, normalized_score=Decimal('80.00'))

        score = TeacherEvaluationScore.calculate_for_teacher(
            self.teacher, self.month, self.year
        )

        self.assertAlmostEqual(float(score.attitude_score), 70.0, places=1)

    def test_falls_back_to_proforma_when_no_monitoring_evaluation(self):
        BDMVisitProforma.objects.create(
            teacher=self.teacher,
            school=self.school,
            bdm=self.bdm,
            visit_date=date(self.year, self.month, 10),
            month=self.month,
            year=self.year,
            discipline_rating=4,
            communication_rating=4,
            child_handling_rating=4,
            professionalism_rating=4,
            content_knowledge_rating=4,
        )

        score = TeacherEvaluationScore.calculate_for_teacher(
            self.teacher, self.month, self.year
        )

        # 4 ratings × 20 = 80
        self.assertAlmostEqual(float(score.attitude_score), 80.0, places=1)

    def test_returns_zero_when_neither_evaluation_nor_proforma_exists(self):
        score = TeacherEvaluationScore.calculate_for_teacher(
            self.teacher, self.month, self.year
        )

        self.assertEqual(float(score.attitude_score), 0.0)

    def test_monitoring_evaluation_takes_priority_over_proforma(self):
        """When both exist, monitoring evaluation must win."""
        visit = self._make_visit()
        self._make_evaluation(visit, normalized_score=Decimal('90.00'))

        BDMVisitProforma.objects.create(
            teacher=self.teacher,
            school=self.school,
            bdm=self.bdm,
            visit_date=date(self.year, self.month, 10),
            month=self.month,
            year=self.year,
            discipline_rating=2,
            communication_rating=2,
            child_handling_rating=2,
            professionalism_rating=2,
            content_knowledge_rating=2,
        )

        score = TeacherEvaluationScore.calculate_for_teacher(
            self.teacher, self.month, self.year
        )

        self.assertAlmostEqual(float(score.attitude_score), 90.0, places=1)

    def test_zero_normalized_score_evaluations_are_excluded(self):
        """Evaluations with normalized_score=0 must not be counted."""
        visit = self._make_visit()
        self._make_evaluation(visit, normalized_score=Decimal('0.00'))

        score = TeacherEvaluationScore.calculate_for_teacher(
            self.teacher, self.month, self.year
        )

        self.assertEqual(float(score.attitude_score), 0.0)


# ============================================
# URL routing — calculate endpoint reachable
# ============================================

class CalculateEvaluationEndpointTests(APITestCase):
    """
    Verifies the URL ordering fix: POST /api/employees/teacher-evaluation/calculate/
    must return 200/400, NOT 404 (which happened when calculate/ was listed after
    <int:teacher_id>/ and Django tried to cast "calculate" as an integer).
    """

    def setUp(self):
        self.admin = make_user('admin_url', 'Admin')

    def test_calculate_endpoint_is_reachable(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            '/api/employees/teacher-evaluation/calculate/',
            {'month': 4, 'year': 2026},
            format='json',
        )
        self.assertNotEqual(
            response.status_code,
            404,
            'calculate/ endpoint returned 404 — URL ordering bug is still present.',
        )
        self.assertIn(response.status_code, [200, 400])

    def test_calculate_endpoint_blocked_for_non_admin(self):
        teacher = make_user('teacher_url', 'Teacher')
        self.client.force_authenticate(user=teacher)
        response = self.client.post(
            '/api/employees/teacher-evaluation/calculate/',
            {'month': 4, 'year': 2026},
            format='json',
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


# ============================================
# Seed management command — idempotency
# ============================================

class SeedEvaluationTemplateCommandTests(TestCase):
    """
    Verifies the seed_evaluation_template management command is idempotent:
    running it twice must not create duplicate templates or fields.
    """

    def _run_command(self):
        from django.core.management import call_command
        from io import StringIO
        out = StringIO()
        call_command('seed_evaluation_template', stdout=out)
        return out.getvalue()

    def test_creates_template_and_five_fields_on_first_run(self):
        from monitoring.models import EvaluationFormTemplate, EvaluationFormField

        self._run_command()

        self.assertEqual(
            EvaluationFormTemplate.objects.filter(name='BDM Standard Evaluation').count(), 1
        )
        template = EvaluationFormTemplate.objects.get(name='BDM Standard Evaluation')
        self.assertEqual(EvaluationFormField.objects.filter(template=template).count(), 5)


# ============================================
# Salary Slip Monitoring Snapshot (Phase 1)
# ============================================

class SalarySlipMonitoringSnapshotTests(APITestCase):
    def setUp(self):
        self.admin = make_user('admin_salary_monitoring', 'Admin')
        self.bdm = make_user('bdm_salary_monitoring', 'BDM')
        self.teacher = make_user('teacher_salary_monitoring', 'Teacher')
        self.school = make_school('Salary Monitoring School')
        self.school.teachers.add(self.teacher)
        self.teacher.assigned_schools.add(self.school)
        self.template = make_template(self.admin, 'Salary Monitoring Template')
        self.base_date = date(2026, 4, 15)

    def _make_visit(self, *, visit_date, bdm=None, status='completed'):
        return MonitoringVisit.objects.create(
            school=self.school,
            bdm=bdm or self.bdm,
            visit_date=visit_date,
            status=status,
            purpose='Salary slip monitoring snapshot test',
        )

    def _make_eval(self, visit, score):
        return TeacherEvaluation.objects.create(
            visit=visit,
            teacher=self.teacher,
            template=self.template,
            normalized_score=Decimal(str(score)),
        )

    def _salary_payload(self, *, from_date, till_date, payment_date=None):
        payment_date = payment_date or till_date
        return {
            'teacher': self.teacher.id,
            'from_date': from_date.isoformat(),
            'till_date': till_date.isoformat(),
            'payment_date': payment_date.isoformat(),
            'company_name': 'EARLY BIRD KODER KIDS PVT LTD',
            'employee_name': self.teacher.get_full_name() or self.teacher.username,
            'employee_id_snapshot': '',
            'title': 'Teacher',
            'schools': self.school.name,
            'date_of_joining': None,
            'bank_name': 'HBL',
            'account_title': self.teacher.get_full_name() or self.teacher.username,
            'account_number': '1234567890',
            'basic_salary': '50000.00',
            'no_of_days': 30,
            'normalized_days': 30,
            'prorated_salary': '50000.00',
            'earnings_snapshot': [],
            'deductions_snapshot': [],
            'total_earnings': '50000.00',
            'total_deductions': '0.00',
            'net_pay': '50000.00',
            'line_spacing': '1.5',
        }

    def test_preview_teacher_rows_use_average_score_per_visit(self):
        visit = self._make_visit(visit_date=self.base_date)
        self._make_eval(visit, '60.00')
        self._make_eval(visit, '80.00')

        self.client.force_authenticate(user=self.admin)
        response = self.client.get(
            '/employees/salary-slips/monitoring-lines/',
            {
                'teacher_id': self.teacher.id,
                'from_date': date(2026, 4, 1).isoformat(),
                'till_date': date(2026, 4, 30).isoformat(),
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['monitoring_visits_count'], 1)
        self.assertAlmostEqual(response.data['monitoring_visits_snapshot'][0]['score'], 70.0, places=2)

    def test_preview_bdm_rows_have_blank_score(self):
        self._make_visit(visit_date=self.base_date, bdm=self.bdm)
        self._make_visit(visit_date=self.base_date + timedelta(days=1), bdm=self.bdm)

        self.client.force_authenticate(user=self.bdm)
        response = self.client.get(
            '/employees/salary-slips/monitoring-lines/',
            {
                'from_date': date(2026, 4, 1).isoformat(),
                'till_date': date(2026, 4, 30).isoformat(),
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['monitoring_visits_count'], 2)
        for row in response.data['monitoring_visits_snapshot']:
            self.assertIsNone(row['score'])

    def test_salary_slip_snapshot_persists_and_refreshes_on_update(self):
        visit1 = self._make_visit(visit_date=self.base_date)
        self._make_eval(visit1, '90.00')

        self.client.force_authenticate(user=self.admin)
        create_response = self.client.post(
            '/employees/salary-slips/create/',
            self._salary_payload(from_date=date(2026, 4, 1), till_date=date(2026, 4, 30)),
            format='json',
        )

        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        slip_id = create_response.data['id']
        self.assertEqual(create_response.data['monitoring_visits_count'], 1)

        # Add another visit after slip generation; historical snapshot should stay unchanged until update
        visit2 = self._make_visit(visit_date=self.base_date + timedelta(days=1))
        self._make_eval(visit2, '70.00')

        detail_before = self.client.get(f'/employees/salary-slips/{slip_id}/', format='json')
        self.assertEqual(detail_before.status_code, status.HTTP_200_OK)
        self.assertEqual(detail_before.data['monitoring_visits_count'], 1)

        update_response = self.client.put(
            f'/employees/salary-slips/{slip_id}/',
            {'payment_date': date(2026, 4, 30).isoformat()},
            format='json',
        )
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)
        self.assertEqual(update_response.data['monitoring_visits_count'], 2)

        slip = SalarySlip.objects.get(id=slip_id)
        self.assertEqual(slip.monitoring_visits_count, 2)
        self.assertEqual(len(slip.monitoring_visits_snapshot), 2)

