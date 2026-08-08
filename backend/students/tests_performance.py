# ============================================
# PERFORMANCE REGRESSION TESTS - N+1 query fixes
# ============================================
# Location: backend/students/tests_performance.py
#
# Guards against reintroducing the N+1 pattern fixed in SchoolViewSet /
# SchoolSerializer for GET /api/schools/ (served by the router-registered
# SchoolViewSet, NOT the get_schools() function view — that route is
# commented out in school_management/urls.py). Per school, the serializer
# used to run 5 separate queries (total_students, total_classes,
# monthly_revenue x2, and capacity_utilization re-counting total_students
# again) instead of one annotated query for the whole list plus 2 batched
# queries for revenue.

from decimal import Decimal

from django.db import connection
from django.test.utils import CaptureQueriesContext
from rest_framework.test import APIClient, APITestCase

from .models import CustomUser, Fee, School, Student


class SchoolListPerformanceTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = CustomUser.objects.create_user(
            username='perf_admin',
            password='pass1234',
            role='Admin',
        )
        self.client.force_authenticate(user=self.admin)

    def _seed_school_with_activity(self, index):
        school = School.objects.create(
            name=f'Perf School {index}',
            total_capacity=100,
        )
        for c, cls in enumerate(['Grade 1', 'Grade 2']):
            Student.objects.create(
                reg_num=f'PERF-{school.id}-{c}',
                name=f'Student {school.id}{c}',
                school=school,
                student_class=cls,
                status='Active',
            )
        # Two fee months, so get_monthly_revenue has to pick the "latest" one.
        Fee.objects.create(student_id=1, school=school, month='2026-06', total_fee=Decimal('1000.00'), paid_amount=Decimal('1000.00'))
        Fee.objects.create(student_id=1, school=school, month='2026-07', total_fee=Decimal('1500.00'), paid_amount=Decimal('500.00'))
        return school

    def test_query_count_does_not_scale_with_school_count(self):
        """The number of queries for /api/schools/ must stay flat whether
        there are 2 schools or 10 — a regression to the old per-school
        SerializerMethodField queries would make this fail as data grows,
        even if it happened to look fine with only 2 schools."""
        for i in range(2):
            self._seed_school_with_activity(i)

        with CaptureQueriesContext(connection) as small_queries:
            response_small = self.client.get('/api/schools/')
        self.assertEqual(response_small.status_code, 200)

        for i in range(2, 10):
            self._seed_school_with_activity(i)

        with CaptureQueriesContext(connection) as large_queries:
            response_large = self.client.get('/api/schools/')
        self.assertEqual(response_large.status_code, 200)

        self.assertLessEqual(
            len(large_queries.captured_queries),
            len(small_queries.captured_queries) + 2,
            msg=(
                f"Query count grew with school count "
                f"({len(small_queries.captured_queries)} -> {len(large_queries.captured_queries)}); "
                "this looks like the N+1 in SchoolSerializer has come back."
            ),
        )

    def test_response_data_correctness(self):
        """total_students/total_classes/monthly_revenue/capacity_utilization
        must match what the original per-object queries would have returned."""
        school = self._seed_school_with_activity(0)

        response = self.client.get('/api/schools/')
        self.assertEqual(response.status_code, 200)

        row = next(r for r in response.data if r['id'] == school.id)
        self.assertEqual(row['total_students'], 2)
        self.assertEqual(row['total_classes'], 2)
        # Latest fee record by id is the '2026-07' one -> revenue = 1500.
        self.assertEqual(row['monthly_revenue'], 1500.0)
        self.assertEqual(row['capacity_utilization'], 2.0)  # 2/100 * 100

    def test_school_with_no_students_or_fees(self):
        """A school with no students/fees must return zeros, not error."""
        empty_school = School.objects.create(name='Empty Perf School', total_capacity=50)

        response = self.client.get('/api/schools/')
        self.assertEqual(response.status_code, 200)

        row = next(r for r in response.data if r['id'] == empty_school.id)
        self.assertEqual(row['total_students'], 0)
        self.assertEqual(row['total_classes'], 0)
        self.assertEqual(row['monthly_revenue'], 0.0)
        self.assertEqual(row['capacity_utilization'], 0.0)
