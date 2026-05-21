from rest_framework import status
from rest_framework.test import APITestCase

from students.models import CustomUser, School, Student
from students.subtypes import StudentSubtype


class AuthStudentSubtypeTests(APITestCase):
	def setUp(self):
		self.school = School.objects.create(name='Subtype Auth School')

		self.online_user = CustomUser.objects.create_user(
			username='online_auth_student',
			password='AuthPass123!',
			role='Student',
			is_active=True,
		)
		Student.objects.create(
			reg_num='AUTH-ONLINE-001',
			name='Auth Online Student',
			school=self.school,
			student_class='Online-1',
			student_subtype=StudentSubtype.ONLINE,
			user=self.online_user,
		)

		self.admin_user = CustomUser.objects.create_user(
			username='admin_auth_user',
			password='AuthPass123!',
			role='Admin',
			is_active=True,
		)

	def test_student_login_includes_student_subtype(self):
		response = self.client.post(
			'/api/auth/token/',
			{'username': 'online_auth_student', 'password': 'AuthPass123!'},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data.get('role'), 'Student')
		self.assertEqual(response.data.get('studentSubtype'), StudentSubtype.ONLINE)

	def test_non_student_login_does_not_expose_student_subtype(self):
		response = self.client.post(
			'/api/auth/token/',
			{'username': 'admin_auth_user', 'password': 'AuthPass123!'},
			format='json',
		)

		self.assertEqual(response.status_code, status.HTTP_200_OK)
		self.assertEqual(response.data.get('role'), 'Admin')
		self.assertNotIn('studentSubtype', response.data)
