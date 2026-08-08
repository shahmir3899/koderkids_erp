# ============================================
# PERFORMANCE REGRESSION TESTS - N+1 query fixes
# ============================================
# Location: backend/dashboards/tests_performance.py
#
# Guards against reintroducing the N+1 pattern fixed in get_login_activity():
# looping over every school and running 2 .count() queries per school, per
# day (x3 days). Verifies the query count stays flat as the number of
# schools grows, and that the per-school login counts are still correct.

from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.utils.timezone import now
from rest_framework.test import APIClient, APITestCase

from students.models import CustomUser, School, Student


class LoginActivityPerformanceTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = CustomUser.objects.create_user(
            username='perf_admin_dash',
            password='pass1234',
            role='Admin',
        )
        self.client.force_authenticate(user=self.admin)

    def _seed_school_with_logins(self, index):
        school = School.objects.create(name=f'Dash Perf School {index}')

        student_user = CustomUser.objects.create_user(
            username=f'dash_student_{index}',
            password='pass1234',
            role='Student',
        )
        student_user.last_login = now()
        student_user.save(update_fields=['last_login'])
        Student.objects.create(
            reg_num=f'DASH-{index}',
            name=f'Dash Student {index}',
            school=school,
            student_class='Grade 1',
            user=student_user,
            status='Active',
        )

        teacher_user = CustomUser.objects.create_user(
            username=f'dash_teacher_{index}',
            password='pass1234',
            role='Teacher',
        )
        teacher_user.assigned_schools.add(school)
        teacher_user.last_login = now()
        teacher_user.save(update_fields=['last_login'])

        return school

    def test_query_count_does_not_scale_with_school_count(self):
        """Query count for /api/dashboards/login-activity/ must stay flat
        whether there are 2 schools or 10 with today's logins — a regression
        to the old per-school-per-day loop would make this fail as data
        grows even if it looked fine with only 2 schools."""
        for i in range(2):
            self._seed_school_with_logins(i)

        with CaptureQueriesContext(connection) as small_queries:
            response_small = self.client.get('/api/dashboards/login-activity/')
        self.assertEqual(response_small.status_code, 200)

        for i in range(2, 10):
            self._seed_school_with_logins(i)

        with CaptureQueriesContext(connection) as large_queries:
            response_large = self.client.get('/api/dashboards/login-activity/')
        self.assertEqual(response_large.status_code, 200)

        self.assertLessEqual(
            len(large_queries.captured_queries),
            len(small_queries.captured_queries) + 2,
            msg=(
                f"Query count grew with school count "
                f"({len(small_queries.captured_queries)} -> {len(large_queries.captured_queries)}); "
                "this looks like the N+1 loop in get_login_activity() has come back."
            ),
        )

    def test_response_data_correctness(self):
        """Per-school student/teacher login counts for today must match
        exactly what was seeded."""
        schools = [self._seed_school_with_logins(i) for i in range(3)]

        response = self.client.get('/api/dashboards/login-activity/')
        self.assertEqual(response.status_code, 200)

        today_schools = {row['school_id']: row for row in response.data['today']['schools']}
        for school in schools:
            self.assertIn(school.id, today_schools)
            self.assertEqual(today_schools[school.id]['student_logins'], 1)
            self.assertEqual(today_schools[school.id]['teacher_logins'], 1)
            self.assertEqual(today_schools[school.id]['total'], 2)

        # Overall totals must equal the sum across all seeded schools.
        self.assertEqual(response.data['today']['student_logins'], 3)
        self.assertEqual(response.data['today']['teacher_logins'], 3)

    def test_teacher_assigned_to_multiple_schools_counts_in_each(self):
        """A teacher assigned to 2 schools should count toward each school's
        teacher_logins independently, but only once in the overall total —
        this is the exact semantic the aggregate-query rewrite had to
        preserve from the original per-school .count() loop."""
        school_a = School.objects.create(name='Multi Perf School A')
        school_b = School.objects.create(name='Multi Perf School B')

        teacher = CustomUser.objects.create_user(
            username='multi_school_teacher',
            password='pass1234',
            role='Teacher',
        )
        teacher.assigned_schools.add(school_a, school_b)
        teacher.last_login = now()
        teacher.save(update_fields=['last_login'])

        response = self.client.get('/api/dashboards/login-activity/')
        self.assertEqual(response.status_code, 200)

        today_schools = {row['school_id']: row for row in response.data['today']['schools']}
        self.assertEqual(today_schools[school_a.id]['teacher_logins'], 1)
        self.assertEqual(today_schools[school_b.id]['teacher_logins'], 1)
        # Overall count reflects one distinct teacher, not two.
        self.assertEqual(response.data['today']['teacher_logins'], 1)
