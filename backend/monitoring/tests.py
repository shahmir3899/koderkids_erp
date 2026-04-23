from datetime import date, timedelta

from rest_framework import status
from rest_framework.test import APITestCase

from monitoring.models import MonitoringVisit, EvaluationFormTemplate, EvaluationFormField, TeacherEvaluation
from students.models import CustomUser, School


class MonitoringAssignmentTests(APITestCase):
    def setUp(self):
        self.admin = CustomUser.objects.create_user(
            username='admin_monitoring',
            password='testpass123',
            role='Admin',
        )
        self.bdm_1 = CustomUser.objects.create_user(
            username='bdm_monitoring_1',
            password='testpass123',
            role='BDM',
        )
        self.bdm_2 = CustomUser.objects.create_user(
            username='bdm_monitoring_2',
            password='testpass123',
            role='BDM',
        )
        self.school = School.objects.create(name='Monitoring Test School')
        self.list_url = '/api/monitoring/visits/'

    def test_admin_cannot_create_visit_without_bdm(self):
        self.client.force_authenticate(user=self.admin)

        payload = {
            'school': self.school.id,
            'visit_date': str(date.today()),
            'purpose': 'Monthly Review',
        }

        response = self.client.post(self.list_url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(MonitoringVisit.objects.count(), 0)

    def test_admin_create_with_bdm_is_visible_to_that_bdm(self):
        self.client.force_authenticate(user=self.admin)

        payload = {
            'school': self.school.id,
            'bdm': self.bdm_1.id,
            'visit_date': str(date.today()),
            'purpose': 'Assigned by Admin',
        }

        response = self.client.post(self.list_url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        visit = MonitoringVisit.objects.get(id=response.data['id'])
        self.assertEqual(visit.bdm_id, self.bdm_1.id)

        self.client.force_authenticate(user=self.bdm_1)
        bdm_response = self.client.get(self.list_url)
        self.assertEqual(bdm_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(bdm_response.data), 1)
        self.assertEqual(bdm_response.data[0]['id'], visit.id)

        self.client.force_authenticate(user=self.bdm_2)
        other_bdm_response = self.client.get(self.list_url)
        self.assertEqual(other_bdm_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(other_bdm_response.data), 0)

    def test_bdm_cannot_reassign_visit_to_another_bdm(self):
        visit = MonitoringVisit.objects.create(
            school=self.school,
            bdm=self.bdm_1,
            visit_date=date.today(),
            purpose='Ownership Test',
        )

        self.client.force_authenticate(user=self.bdm_1)

        detail_url = f'/api/monitoring/visits/{visit.id}/'
        response = self.client.put(detail_url, {'bdm': self.bdm_2.id}, format='json')

        self.assertIn(response.status_code, (status.HTTP_400_BAD_REQUEST, status.HTTP_403_FORBIDDEN))
        visit.refresh_from_db()
        self.assertEqual(visit.bdm_id, self.bdm_1.id)

    def test_admin_can_reassign_planned_visit(self):
        visit = MonitoringVisit.objects.create(
            school=self.school,
            bdm=self.bdm_1,
            visit_date=date.today(),
            purpose='Reassignment Test',
            status='planned',
        )

        self.client.force_authenticate(user=self.admin)

        detail_url = f'/api/monitoring/visits/{visit.id}/'
        response = self.client.put(detail_url, {'bdm': self.bdm_2.id}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        visit.refresh_from_db()
        self.assertEqual(visit.bdm_id, self.bdm_2.id)


# ============================================
# DELETE TESTS
# ============================================

class MonitoringDeleteTests(APITestCase):
    def setUp(self):
        self.admin = CustomUser.objects.create_user(
            username='admin_del',
            password='testpass123',
            role='Admin',
        )
        self.bdm = CustomUser.objects.create_user(
            username='bdm_del',
            password='testpass123',
            role='BDM',
        )
        self.teacher = CustomUser.objects.create_user(
            username='teacher_del',
            password='testpass123',
            role='Teacher',
        )
        self.school = School.objects.create(name='Delete Test School')
        self.school.teachers.add(self.teacher)

    def _make_visit(self, visit_status='planned'):
        return MonitoringVisit.objects.create(
            school=self.school,
            bdm=self.bdm,
            visit_date=date.today(),
            purpose='Delete Test',
            status=visit_status,
        )

    def _make_template(self):
        return EvaluationFormTemplate.objects.create(
            name='Delete Test Template',
            created_by=self.admin,
        )

    def _make_evaluation(self, visit):
        template = self._make_template()
        return TeacherEvaluation.objects.create(
            visit=visit,
            teacher=self.teacher,
            template=template,
        )

    # --- Visit DELETE ---

    def test_admin_can_delete_planned_visit(self):
        visit = self._make_visit(visit_status='planned')
        self.client.force_authenticate(user=self.admin)
        url = f'/api/monitoring/visits/{visit.id}/'
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(MonitoringVisit.objects.filter(id=visit.id).exists())

    def test_admin_can_delete_completed_visit(self):
        visit = self._make_visit(visit_status='completed')
        self.client.force_authenticate(user=self.admin)
        url = f'/api/monitoring/visits/{visit.id}/'
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(MonitoringVisit.objects.filter(id=visit.id).exists())

    def test_bdm_cannot_delete_completed_visit(self):
        visit = self._make_visit(visit_status='completed')
        self.client.force_authenticate(user=self.bdm)
        url = f'/api/monitoring/visits/{visit.id}/'
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(MonitoringVisit.objects.filter(id=visit.id).exists())

    # --- Evaluation DELETE ---

    def test_admin_can_delete_evaluation_on_in_progress_visit(self):
        visit = self._make_visit(visit_status='in_progress')
        evaluation = self._make_evaluation(visit)
        self.client.force_authenticate(user=self.admin)
        url = f'/api/monitoring/evaluations/{evaluation.id}/'
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(TeacherEvaluation.objects.filter(id=evaluation.id).exists())

    def test_admin_cannot_delete_evaluation_on_completed_visit(self):
        visit = self._make_visit(visit_status='completed')
        evaluation = self._make_evaluation(visit)
        self.client.force_authenticate(user=self.admin)
        url = f'/api/monitoring/evaluations/{evaluation.id}/'
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertTrue(TeacherEvaluation.objects.filter(id=evaluation.id).exists())

    def test_bdm_cannot_delete_evaluation(self):
        visit = self._make_visit(visit_status='in_progress')
        evaluation = self._make_evaluation(visit)
        self.client.force_authenticate(user=self.bdm)
        url = f'/api/monitoring/evaluations/{evaluation.id}/'
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(TeacherEvaluation.objects.filter(id=evaluation.id).exists())


class MonitoringListAndSummaryTests(APITestCase):
    def setUp(self):
        self.admin = CustomUser.objects.create_user(
            username='admin_list_summary',
            password='testpass123',
            role='Admin',
        )
        self.bdm = CustomUser.objects.create_user(
            username='bdm_list_summary',
            password='testpass123',
            role='BDM',
        )
        self.teacher = CustomUser.objects.create_user(
            username='teacher_list_summary',
            password='testpass123',
            role='Teacher',
        )
        self.school = School.objects.create(name='List Summary School')
        self.school.teachers.add(self.teacher)
        self.template = EvaluationFormTemplate.objects.create(
            name='List Summary Template',
            created_by=self.admin,
        )

    def test_paginated_visits_returns_metadata_and_results(self):
        for i in range(3):
            MonitoringVisit.objects.create(
                school=self.school,
                bdm=self.bdm,
                visit_date=date.today() + timedelta(days=i),
                purpose=f'Visit {i}',
                status='planned',
            )

        self.client.force_authenticate(user=self.admin)
        response = self.client.get('/api/monitoring/visits/?paginate=true&limit=2&offset=0')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('count', response.data)
        self.assertIn('results', response.data)
        self.assertEqual(response.data['count'], 3)
        self.assertEqual(len(response.data['results']), 2)
        self.assertEqual(response.data['limit'], 2)
        self.assertEqual(response.data['offset'], 0)


class MonitoringMultipleEvaluationsTests(APITestCase):
    def setUp(self):
        self.bdm = CustomUser.objects.create_user(
            username='bdm_multi_eval',
            password='testpass123',
            role='BDM',
        )
        self.teacher = CustomUser.objects.create_user(
            username='teacher_multi_eval',
            password='testpass123',
            role='Teacher',
            first_name='Multi',
            last_name='Teacher',
        )
        self.school = School.objects.create(name='Multiple Eval School')
        self.school.teachers.add(self.teacher)

        self.visit = MonitoringVisit.objects.create(
            school=self.school,
            bdm=self.bdm,
            visit_date=date.today(),
            purpose='Multiple evaluations test',
            status='in_progress',
        )

        self.template = EvaluationFormTemplate.objects.create(
            name='Multiple Eval Template',
            created_by=self.bdm,
        )
        self.field = EvaluationFormField.objects.create(
            template=self.template,
            label='Discipline',
            field_type='rating_1_5',
            is_required=True,
            order=0,
            weight=1,
        )

        self.url = f'/api/monitoring/visits/{self.visit.id}/evaluations/'

    def _payload(self, rating):
        return {
            'teacher_id': self.teacher.id,
            'template_id': self.template.id,
            'responses': [
                {
                    'field_id': self.field.id,
                    'value': str(rating),
                    'numeric_value': rating,
                }
            ],
            'remarks': f'Evaluation #{rating}',
        }

    def test_can_submit_multiple_evaluations_for_same_teacher_in_same_visit(self):
        self.client.force_authenticate(user=self.bdm)

        first = self.client.post(self.url, self._payload(4), format='json')
        self.assertEqual(first.status_code, status.HTTP_201_CREATED)

        second = self.client.post(self.url, self._payload(5), format='json')
        self.assertEqual(second.status_code, status.HTTP_201_CREATED)

        self.assertEqual(
            TeacherEvaluation.objects.filter(visit=self.visit, teacher=self.teacher).count(),
            2,
        )

    def test_compact_visit_summary_mode_returns_lightweight_payload(self):
        visit = MonitoringVisit.objects.create(
            school=self.school,
            bdm=self.bdm,
            visit_date=date.today() + timedelta(days=1),
            purpose='Compact summary check',
            status='in_progress',
        )
        TeacherEvaluation.objects.create(
            visit=visit,
            teacher=self.teacher,
            template=self.template,
        )

        self.client.force_authenticate(user=self.admin)
        response = self.client.get(f'/api/monitoring/visits/{visit.id}/?compact=true')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], visit.id)
        self.assertEqual(response.data['evaluations_count'], 1)
        self.assertEqual(response.data['evaluation_count'], 1)
        self.assertIn('teacher_count', response.data)
        self.assertNotIn('evaluations', response.data)


class MonitoringEvaluationUpdateOverflowTests(APITestCase):
    def setUp(self):
        self.admin = CustomUser.objects.create_user(
            username='admin_update_overflow',
            password='testpass123',
            role='Admin',
        )
        self.bdm = CustomUser.objects.create_user(
            username='bdm_update_overflow',
            password='testpass123',
            role='BDM',
        )
        self.teacher = CustomUser.objects.create_user(
            username='teacher_update_overflow',
            password='testpass123',
            role='Teacher',
        )

        self.school = School.objects.create(name='Overflow Regression School')
        self.school.teachers.add(self.teacher)

        self.visit = MonitoringVisit.objects.create(
            school=self.school,
            bdm=self.bdm,
            visit_date=date.today(),
            purpose='Overflow regression',
            status='in_progress',
        )

        self.template = EvaluationFormTemplate.objects.create(
            name='Overflow Regression Template',
            created_by=self.admin,
        )

        self.fields = []
        for idx in range(5):
            self.fields.append(
                EvaluationFormField.objects.create(
                    template=self.template,
                    label=f'Field {idx + 1}',
                    field_type='rating_1_5',
                    is_required=True,
                    order=idx,
                    weight=20,
                )
            )

        self.evaluation = TeacherEvaluation.objects.create(
            visit=self.visit,
            teacher=self.teacher,
            template=self.template,
        )

    def test_put_update_does_not_overflow_score_columns(self):
        self.client.force_authenticate(user=self.admin)

        payload = {
            'remarks': 'Updated after field review',
            'areas_of_improvement': 'None',
            'teacher_strengths': 'Excellent classroom control',
            'responses': [
                {
                    'field_id': field.id,
                    'value': '5',
                    'numeric_value': 5,
                }
                for field in self.fields
            ],
        }

        response = self.client.put(
            f'/api/monitoring/evaluations/{self.evaluation.id}/',
            payload,
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.evaluation.refresh_from_db()
        self.assertEqual(float(self.evaluation.total_score), 100.0)
        self.assertEqual(float(self.evaluation.normalized_score), 100.0)
