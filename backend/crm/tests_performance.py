# ============================================
# PERFORMANCE REGRESSION TESTS - N+1 query fixes
# ============================================
# Location: backend/crm/tests_performance.py
#
# Guards against reintroducing the N+1 pattern fixed in ActivitySerializer:
# get_lead_activities_count/get_lead_days_since_last_activity called
# .count()/.exclude().order_by().first() on obj.lead.activities, which
# bypasses the prefetch_related('lead__activities') cache set up in
# ActivityViewSet.get_queryset() and re-queries per row anyway.

from datetime import timedelta

from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.utils import timezone
from rest_framework.test import APIClient, APITestCase

from students.models import CustomUser
from .models import Activity, Lead


class ActivityListPerformanceTests(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = CustomUser.objects.create_user(
            username='perf_admin_crm',
            password='pass1234',
            role='Admin',
        )
        self.client.force_authenticate(user=self.admin)

    def _seed_lead_with_activities(self, index, activity_count=2):
        lead = Lead.objects.create(
            school_name=f'Perf Lead School {index}',
            phone=f'0300000{index:04d}',
        )
        activities = []
        now = timezone.now()
        for a in range(activity_count):
            activities.append(Activity.objects.create(
                activity_type='Call',
                lead=lead,
                subject=f'Call {index}-{a}',
                assigned_to=self.admin,
                # Stagger so ordering (-scheduled_date) is meaningful.
                scheduled_date=now - timedelta(days=activity_count - a),
            ))
        return lead, activities

    def test_query_count_does_not_scale_with_activity_count(self):
        """Query count for /api/crm/activities/ must stay flat whether there
        are a handful of activities or many more — a regression to calling
        .count()/.order_by().first() directly (bypassing the prefetch cache)
        would make this grow linearly again."""
        for i in range(2):
            self._seed_lead_with_activities(i)

        with CaptureQueriesContext(connection) as small_queries:
            response_small = self.client.get('/api/crm/activities/')
        self.assertEqual(response_small.status_code, 200)

        for i in range(2, 10):
            self._seed_lead_with_activities(i)

        with CaptureQueriesContext(connection) as large_queries:
            response_large = self.client.get('/api/crm/activities/')
        self.assertEqual(response_large.status_code, 200)

        self.assertLessEqual(
            len(large_queries.captured_queries),
            len(small_queries.captured_queries) + 2,
            msg=(
                f"Query count grew with activity count "
                f"({len(small_queries.captured_queries)} -> {len(large_queries.captured_queries)}); "
                "this looks like ActivitySerializer is bypassing the prefetch cache again."
            ),
        )

    def test_lead_activities_count_correctness(self):
        """lead_activities_count must equal the true number of activities on
        that lead, matching what obj.lead.activities.count() would have
        returned via the original (slow) query."""
        lead, activities = self._seed_lead_with_activities(0, activity_count=3)

        response = self.client.get('/api/crm/activities/')
        self.assertEqual(response.status_code, 200)

        rows = [r for r in response.data['results'] if r['lead'] == lead.id] \
            if isinstance(response.data, dict) and 'results' in response.data \
            else [r for r in response.data if r['lead'] == lead.id]

        self.assertEqual(len(rows), 3)
        for row in rows:
            self.assertEqual(row['lead_activities_count'], 3)

    def test_lead_days_since_last_activity_correctness(self):
        """For a lead with multiple activities, every row must report the
        gap to the single most recent OTHER activity — matching the original
        `.exclude(id=obj.id).order_by('-scheduled_date').first()` query."""
        lead = Lead.objects.create(school_name='Days Since Perf Lead')
        now = timezone.now()
        oldest = Activity.objects.create(
            activity_type='Call', lead=lead, subject='Oldest',
            assigned_to=self.admin, scheduled_date=now - timedelta(days=10),
        )
        newest = Activity.objects.create(
            activity_type='Meeting', lead=lead, subject='Newest',
            assigned_to=self.admin, scheduled_date=now - timedelta(days=1),
        )

        response = self.client.get('/api/crm/activities/')
        self.assertEqual(response.status_code, 200)
        rows = {r['id']: r for r in (
            response.data['results'] if isinstance(response.data, dict) and 'results' in response.data
            else response.data
        )}

        # days_since_last_activity is `timezone.now() - <most recent OTHER
        # activity>.scheduled_date`, not a gap between the two activities.
        # For the oldest activity, the most recent OTHER activity is "newest"
        # (scheduled 1 day ago) -> ~1 day since.
        self.assertEqual(rows[oldest.id]['lead_days_since_last_activity'], 1)
        # For the newest activity, the most recent OTHER activity is "oldest"
        # (scheduled 10 days ago) -> ~10 days since.
        self.assertEqual(rows[newest.id]['lead_days_since_last_activity'], 10)

    def test_lead_with_single_activity_has_no_last_activity(self):
        """A lead with only one activity has no 'other' activity to compare
        against — must return None, not error."""
        lead, activities = self._seed_lead_with_activities(0, activity_count=1)

        response = self.client.get('/api/crm/activities/')
        self.assertEqual(response.status_code, 200)
        rows = (
            response.data['results'] if isinstance(response.data, dict) and 'results' in response.data
            else response.data
        )
        row = next(r for r in rows if r['lead'] == lead.id)
        self.assertIsNone(row['lead_days_since_last_activity'])
        self.assertEqual(row['lead_activities_count'], 1)
