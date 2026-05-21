from unittest.mock import patch

from rest_framework import status
from rest_framework.test import APITestCase

from books.models import Book
from courses.models import CourseEnrollment
from students.models import CustomUser, School, Student
from students.subtypes import StudentSubtype


class LMSStudentSubtypeAccessTests(APITestCase):
    def setUp(self):
        self.school = School.objects.create(name='Subtype LMS School')

        self.online_user = CustomUser.objects.create_user(
            username='online_lms_user',
            password='LMSTest123!',
            role='Student',
            is_active=True,
        )
        self.online_student = Student.objects.create(
            reg_num='LMS-ONLINE-001',
            name='Online LMS Student',
            school=self.school,
            student_class='Class A',
            student_subtype=StudentSubtype.ONLINE,
            user=self.online_user,
        )

        self.onsite_user = CustomUser.objects.create_user(
            username='onsite_lms_user',
            password='LMSTest123!',
            role='Student',
            is_active=True,
        )
        self.onsite_student = Student.objects.create(
            reg_num='LMS-ONSITE-001',
            name='Onsite LMS Student',
            school=self.school,
            student_class='Class A',
            student_subtype=StudentSubtype.ONSITE,
            user=self.onsite_user,
        )

        self.teacher_user = CustomUser.objects.create_user(
            username='teacher_lms_user',
            password='LMSTest123!',
            role='Teacher',
            is_active=True,
        )

        self.student_without_profile = CustomUser.objects.create_user(
            username='no_profile_student',
            password='LMSTest123!',
            role='Student',
            is_active=True,
        )

    def test_online_subtype_can_access_lms_guardian_endpoint(self):
        self.client.force_authenticate(self.online_user)
        response = self.client.get('/api/courses/guardian/check-time/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_onsite_subtype_can_access_lms_guardian_endpoint(self):
        self.client.force_authenticate(self.onsite_user)
        response = self.client.get('/api/courses/guardian/check-time/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_non_student_user_is_blocked(self):
        self.client.force_authenticate(self.teacher_user)
        response = self.client.get('/api/courses/guardian/check-time/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_student_without_profile_is_blocked(self):
        self.client.force_authenticate(self.student_without_profile)
        response = self.client.get('/api/courses/guardian/check-time/')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_policy_driven_block_without_hardcoded_check(self):
        self.client.force_authenticate(self.onsite_user)

        policy_override = {
            StudentSubtype.ONSITE: {'lms_enabled': False},
            StudentSubtype.ONLINE: {'lms_enabled': True},
            StudentSubtype.HYBRID: {'lms_enabled': True},
        }

        with patch('students.subtypes.STUDENT_SUBTYPE_POLICY', policy_override):
            response = self.client.get('/api/courses/guardian/check-time/')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class AdminOnlineStudentProfileTests(APITestCase):
    def setUp(self):
        self.school = School.objects.create(name='Online Profile School')

        self.admin_user = CustomUser.objects.create_user(
            username='admin_online_profile',
            password='AdminPass123!',
            role='Admin',
            is_active=True,
            email='admin.online@example.com',
        )

        self.teacher_user = CustomUser.objects.create_user(
            username='teacher_online_profile',
            password='TeacherPass123!',
            role='Teacher',
            is_active=True,
            email='teacher.online@example.com',
        )

        self.online_user = CustomUser.objects.create_user(
            username='online_profile_user',
            password='StudentPass123!',
            role='Student',
            is_active=True,
            email='online.student@example.com',
        )

        self.online_student = Student.objects.create(
            reg_num='ONLINE-PROFILE-001',
            name='Online Profile Student',
            school=self.school,
            student_class='Class B',
            student_subtype=StudentSubtype.ONLINE,
            user=self.online_user,
            phone='03001234567',
            address='Old Address',
        )

        self.onsite_user = CustomUser.objects.create_user(
            username='onsite_profile_user',
            password='StudentPass123!',
            role='Student',
            is_active=True,
            email='onsite.student@example.com',
        )

        self.onsite_student = Student.objects.create(
            reg_num='ONSITE-PROFILE-001',
            name='Onsite Profile Student',
            school=self.school,
            student_class='Class B',
            student_subtype=StudentSubtype.ONSITE,
            user=self.onsite_user,
        )

    def _profile_url(self, student_id):
        return f'/api/courses/admin/online-students/{student_id}/profile/'

    def test_admin_can_get_online_student_profile(self):
        self.client.force_authenticate(self.admin_user)

        response = self.client.get(self._profile_url(self.online_student.id))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['id'], self.online_student.id)
        self.assertEqual(response.data['name'], self.online_student.name)
        self.assertEqual(response.data['email'], self.online_user.email)
        self.assertEqual(response.data['student_subtype'], StudentSubtype.ONLINE)

    def test_admin_can_patch_online_student_profile(self):
        self.client.force_authenticate(self.admin_user)

        payload = {
            'name': 'Updated Online Student',
            'email': 'updated.online.student@example.com',
            'phone': '03111222333',
            'address': 'New Address',
        }

        response = self.client.patch(self._profile_url(self.online_student.id), payload, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.online_student.refresh_from_db()
        self.online_user.refresh_from_db()

        self.assertEqual(self.online_student.name, payload['name'])
        self.assertEqual(self.online_student.phone, payload['phone'])
        self.assertEqual(self.online_student.address, payload['address'])
        self.assertEqual(self.online_user.email, payload['email'])
        self.assertEqual(self.online_user.first_name, 'Updated')
        self.assertEqual(self.online_user.last_name, 'Online Student')

    def test_non_admin_cannot_access_profile_endpoint(self):
        self.client.force_authenticate(self.teacher_user)

        response = self.client.get(self._profile_url(self.online_student.id))

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_profile_endpoint_rejects_non_online_student(self):
        self.client.force_authenticate(self.admin_user)

        response = self.client.get(self._profile_url(self.onsite_student.id))

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_patch_rejects_duplicate_email(self):
        existing_user = CustomUser.objects.create_user(
            username='duplicate_email_holder',
            password='DupPass123!',
            role='Teacher',
            is_active=True,
            email='duplicate@example.com',
        )
        self.assertIsNotNone(existing_user)

        self.client.force_authenticate(self.admin_user)
        response = self.client.patch(
            self._profile_url(self.online_student.id),
            {'email': 'duplicate@example.com'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)


class AdminOnlineStudentAssignmentTests(APITestCase):
    def setUp(self):
        self.school = School.objects.create(name='Online Assignment School')

        self.admin_user = CustomUser.objects.create_user(
            username='admin_online_assign',
            password='AdminAssign123!',
            role='Admin',
            is_active=True,
        )

        self.teacher_user = CustomUser.objects.create_user(
            username='teacher_online_assign',
            password='TeacherAssign123!',
            role='Teacher',
            is_active=True,
        )

        self.online_user = CustomUser.objects.create_user(
            username='online_assign_user',
            password='StudentAssign123!',
            role='Student',
            is_active=True,
        )

        self.online_student = Student.objects.create(
            reg_num='ONLINE-ASSIGN-001',
            name='Online Assignment Student',
            school=self.school,
            student_class='Class C',
            student_subtype=StudentSubtype.ONLINE,
            user=self.online_user,
        )

        self.book_one = Book.objects.create(title='Book One', school=self.school)
        self.book_two = Book.objects.create(title='Book Two', school=self.school)

    def _assign_url(self):
        return f'/api/courses/admin/online-students/{self.online_student.id}/assign-courses/'

    def _remove_url(self, enrollment_id):
        return f'/api/courses/admin/online-students/{self.online_student.id}/enrollments/{enrollment_id}/'

    def test_admin_can_assign_books_to_online_student(self):
        self.client.force_authenticate(self.admin_user)

        response = self.client.post(
            self._assign_url(),
            {'course_ids': [self.book_one.id, self.book_two.id], 'skip_existing': True},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['summary']['assigned_count'], 2)
        self.assertEqual(CourseEnrollment.objects.filter(student=self.online_student, status='active').count(), 2)

    def test_reassign_skips_existing_enrollment_when_skip_existing_true(self):
        CourseEnrollment.objects.create(
            student=self.online_student,
            course=self.book_one,
            status='active',
        )

        self.client.force_authenticate(self.admin_user)
        response = self.client.post(
            self._assign_url(),
            {'course_ids': [self.book_one.id], 'skip_existing': True},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['summary']['assigned_count'], 0)
        self.assertEqual(response.data['summary']['skipped_count'], 1)

    def test_admin_can_remove_course_as_dropped_status(self):
        enrollment = CourseEnrollment.objects.create(
            student=self.online_student,
            course=self.book_one,
            status='active',
        )

        self.client.force_authenticate(self.admin_user)
        response = self.client.delete(self._remove_url(enrollment.id))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        enrollment.refresh_from_db()
        self.assertEqual(enrollment.status, 'dropped')

    def test_non_admin_cannot_assign_books(self):
        self.client.force_authenticate(self.teacher_user)
        response = self.client.post(
            self._assign_url(),
            {'course_ids': [self.book_one.id], 'skip_existing': True},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
