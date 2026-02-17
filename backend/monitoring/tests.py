from datetime import date

from rest_framework import status
from rest_framework.test import APITestCase

from monitoring.models import MonitoringVisit
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

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
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
