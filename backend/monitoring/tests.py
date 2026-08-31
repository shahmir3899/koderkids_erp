from datetime import date, timedelta

from rest_framework import status
from rest_framework.test import APITestCase

from monitoring.models import MonitoringVisit, TeacherEvaluation, EvaluationQuestion
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

    def test_admin_starting_visit_is_assigned_to_admin(self):
        self.client.force_authenticate(user=self.admin)

        payload = {
            'school': self.school.id,
            'purpose': 'Monthly Review',
            # Even if a bdm is sent, it must be ignored — the field is read-only.
            'bdm': self.bdm_1.id,
        }

        response = self.client.post(self.list_url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        visit = MonitoringVisit.objects.get(id=response.data['id'])
        self.assertEqual(visit.bdm_id, self.admin.id)
        self.assertEqual(visit.status, 'in_progress')
        self.assertEqual(visit.visit_date, date.today())

    def test_bdm_starting_visit_is_isolated_to_that_bdm(self):
        self.client.force_authenticate(user=self.bdm_1)

        payload = {
            'school': self.school.id,
            'purpose': 'Self-started visit',
        }

        response = self.client.post(self.list_url, payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        visit = MonitoringVisit.objects.get(id=response.data['id'])
        self.assertEqual(visit.bdm_id, self.bdm_1.id)

        bdm_response = self.client.get(self.list_url)
        self.assertEqual(bdm_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(bdm_response.data), 1)
        self.assertEqual(bdm_response.data[0]['id'], visit.id)

        self.client.force_authenticate(user=self.bdm_2)
        other_bdm_response = self.client.get(self.list_url)
        self.assertEqual(other_bdm_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(other_bdm_response.data), 0)

    def test_put_cannot_change_bdm(self):
        visit = MonitoringVisit.objects.create(
            school=self.school,
            bdm=self.bdm_1,
            visit_date=date.today(),
            purpose='Ownership Test',
        )

        self.client.force_authenticate(user=self.admin)

        detail_url = f'/api/monitoring/visits/{visit.id}/'
        response = self.client.put(detail_url, {'bdm': self.bdm_2.id, 'notes': 'Updated'}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        visit.refresh_from_db()
        self.assertEqual(visit.bdm_id, self.bdm_1.id)
        self.assertEqual(visit.notes, 'Updated')


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

    def _make_visit(self, visit_status='in_progress'):
        return MonitoringVisit.objects.create(
            school=self.school,
            bdm=self.bdm,
            visit_date=date.today(),
            purpose='Delete Test',
            status=visit_status,
        )

    def _make_evaluation(self, visit):
        return TeacherEvaluation.objects.create(
            visit=visit,
            teacher=self.teacher,
        )

    # --- Visit DELETE ---

    def test_admin_can_delete_in_progress_visit(self):
        visit = self._make_visit(visit_status='in_progress')
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

    def test_paginated_visits_returns_metadata_and_results(self):
        for i in range(3):
            MonitoringVisit.objects.create(
                school=self.school,
                bdm=self.bdm,
                visit_date=date.today() + timedelta(days=i),
                purpose=f'Visit {i}',
                status='in_progress',
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
        self.admin = CustomUser.objects.create_user(
            username='admin_multi_eval',
            password='testpass123',
            role='Admin',
        )
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

        self.url = f'/api/monitoring/visits/{self.visit.id}/evaluations/'

    def _payload(self, rating):
        return {
            'teacher_id': self.teacher.id,
            'questions': [
                {
                    'question_text': 'Classroom discipline?',
                    'answer_text': 'Well managed',
                    'rating': rating,
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

    def test_submitting_without_questions_is_rejected(self):
        self.client.force_authenticate(user=self.bdm)

        response = self.client.post(
            self.url,
            {'teacher_id': self.teacher.id, 'questions': []},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

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
        )

        self.client.force_authenticate(user=self.admin)
        response = self.client.get(f'/api/monitoring/visits/{visit.id}/?compact=true')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], visit.id)
        self.assertEqual(response.data['evaluations_count'], 1)
        self.assertEqual(response.data['evaluation_count'], 1)
        self.assertNotIn('evaluations', response.data)


class MonitoringEvaluationScoreTests(APITestCase):
    def setUp(self):
        self.admin = CustomUser.objects.create_user(
            username='admin_score',
            password='testpass123',
            role='Admin',
        )
        self.bdm = CustomUser.objects.create_user(
            username='bdm_score',
            password='testpass123',
            role='BDM',
        )
        self.teacher = CustomUser.objects.create_user(
            username='teacher_score',
            password='testpass123',
            role='Teacher',
        )

        self.school = School.objects.create(name='Score Regression School')
        self.school.teachers.add(self.teacher)

        self.visit = MonitoringVisit.objects.create(
            school=self.school,
            bdm=self.bdm,
            visit_date=date.today(),
            purpose='Score regression',
            status='in_progress',
        )

        self.evaluation = TeacherEvaluation.objects.create(
            visit=self.visit,
            teacher=self.teacher,
        )

    def test_put_update_scores_only_rated_questions(self):
        self.client.force_authenticate(user=self.admin)

        payload = {
            'remarks': 'Updated after field review',
            'areas_of_improvement': 'None',
            'teacher_strengths': 'Excellent classroom control',
            'questions': [
                {'question_text': 'Punctuality?', 'answer_text': 'On time', 'rating': 5},
                {'question_text': 'Uses whiteboard?', 'answer_text': 'Yes', 'rating': 5},
                {'question_text': 'Any incidents this month?', 'answer_text': 'None'},
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
        self.assertEqual(self.evaluation.questions.count(), 3)
        self.assertEqual(
            EvaluationQuestion.objects.filter(evaluation=self.evaluation, rating__isnull=True).count(),
            1,
        )
