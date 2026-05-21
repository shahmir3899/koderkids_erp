"""
Tests for the TimeSlot system.

Run with:
    python manage.py test students.tests_timeslot
"""

from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status

from students.models import CustomUser, School, Student, TimeSlot
from employees.models import TeacherProfile


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

import uuid as _uuid


def make_school(name=None):
    return School.objects.create(name=name or f"School-{_uuid.uuid4().hex[:6]}", payment_mode="per_student")


def make_user(username_prefix, role="Teacher", password="pass1234"):
    username = f"{username_prefix}_{_uuid.uuid4().hex[:8]}"
    user = CustomUser.objects.create_user(username=username, password=password, role=role)
    return user


def make_teacher(user, school=None):
    profile, _ = TeacherProfile.objects.get_or_create(user=user)
    if school:
        user.assigned_schools.add(school)
    return profile


def make_student(name, school, subtype="ONLINE", time_slot=None):
    return Student.objects.create(
        name=name,
        reg_num=_uuid.uuid4().hex[:10],
        school=school,
        student_subtype=subtype,
        time_slot=time_slot,
    )


# ---------------------------------------------------------------------------
# Model tests
# ---------------------------------------------------------------------------

class TimeSlotModelTest(TestCase):

    def setUp(self):
        self.school = make_school()
        self.user = make_user("teacher1")
        self.teacher = make_teacher(self.user, self.school)

    def test_create_timeslot(self):
        ts = TimeSlot.objects.create(
            label="Mon/Wed 4-5pm",
            school=self.school,
            teacher=self.teacher,
            days="Mon,Wed",
            start_time="16:00",
            end_time="17:00",
        )
        self.assertEqual(str(ts.label), "Mon/Wed 4-5pm")
        self.assertEqual(ts.school, self.school)
        self.assertEqual(ts.teacher, self.teacher)
        self.assertTrue(ts.is_active)

    def test_student_assigned_to_timeslot(self):
        ts = TimeSlot.objects.create(
            label="Sat 10am",
            school=self.school,
            teacher=self.teacher,
            days="Sat",
            start_time="10:00",
            end_time="11:00",
        )
        student = make_student("Ali", self.school, subtype="ONLINE", time_slot=ts)
        self.assertEqual(student.time_slot, ts)
        self.assertIn(student, ts.students.all())

    def test_timeslot_str(self):
        ts = TimeSlot.objects.create(
            label="Fri 3pm",
            school=self.school,
            teacher=self.teacher,
            days="Fri",
            start_time="15:00",
            end_time="16:00",
        )
        self.assertIn("Fri 3pm", str(ts))
        self.assertIn(self.school.name, str(ts))


# ---------------------------------------------------------------------------
# Permission helper tests
# ---------------------------------------------------------------------------

class TimeslotAccessPermissionTest(TestCase):

    def setUp(self):
        self.school = make_school()
        self.user1 = make_user("teacher_a")
        self.user2 = make_user("teacher_b")
        self.teacher1 = make_teacher(self.user1, self.school)
        self.teacher2 = make_teacher(self.user2, self.school)
        self.admin_user = make_user("adminx", role="Admin")

        self.ts = TimeSlot.objects.create(
            label="Test Slot",
            school=self.school,
            teacher=self.teacher1,
            days="Mon",
            start_time="09:00",
            end_time="10:00",
        )
        self.student = make_student("Zara", self.school, subtype="ONLINE", time_slot=self.ts)

    def test_admin_always_has_access(self):
        from students.permissions import check_timeslot_access
        self.assertTrue(check_timeslot_access(self.admin_user, self.student))

    def test_owner_teacher_has_access(self):
        from students.permissions import check_timeslot_access
        self.assertTrue(check_timeslot_access(self.user1, self.student))

    def test_other_teacher_denied(self):
        from students.permissions import check_timeslot_access
        self.assertFalse(check_timeslot_access(self.user2, self.student))

    def test_student_without_timeslot_denied(self):
        from students.permissions import check_timeslot_access
        onsite_student = make_student("ONSITE kid", self.school, subtype="ONSITE")
        self.assertFalse(check_timeslot_access(self.user1, onsite_student))


# ---------------------------------------------------------------------------
# API endpoint tests
# ---------------------------------------------------------------------------

class TimeSlotAPITest(TestCase):

    def setUp(self):
        self.client = APIClient()
        self.school = make_school()
        self.admin_user = make_user("admin99", role="Admin")

        self.teacher_user = make_user("teacher99")
        self.teacher = make_teacher(self.teacher_user, self.school)

        self.other_teacher_user = make_user("other_teacher")
        self.other_teacher = make_teacher(self.other_teacher_user, self.school)

    def _auth(self, user):
        self.client.force_authenticate(user=user)

    def test_admin_can_create_timeslot(self):
        self._auth(self.admin_user)
        resp = self.client.post("/api/time-slots/", {
            "label": "Tue/Thu 2pm",
            "school": self.school.id,
            "teacher": self.teacher.id,
            "days": "Tue,Thu",
            "start_time": "14:00:00",
            "end_time": "15:00:00",
        }, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data["label"], "Tue/Thu 2pm")

    def test_teacher_can_create_timeslot_for_assigned_school(self):
        self._auth(self.teacher_user)
        resp = self.client.post("/api/time-slots/", {
            "label": "Mon 6pm",
            "school": self.school.id,
            "days": "Mon",
            "start_time": "18:00:00",
            "end_time": "19:00:00",
        }, format="json")
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        # Teacher auto-assigned
        self.assertEqual(resp.data["teacher"], self.teacher.id)

    def test_teacher_cannot_create_for_unassigned_school(self):
        other_school = make_school("Other School")
        self._auth(self.teacher_user)
        resp = self.client.post("/api/time-slots/", {
            "label": "Wed 4pm",
            "school": other_school.id,
            "days": "Wed",
            "start_time": "16:00:00",
            "end_time": "17:00:00",
        }, format="json")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_teacher_sees_only_own_timeslots(self):
        ts1 = TimeSlot.objects.create(label="Slot A", school=self.school,
                                       teacher=self.teacher, days="Mon",
                                       start_time="09:00", end_time="10:00")
        ts2 = TimeSlot.objects.create(label="Slot B", school=self.school,
                                       teacher=self.other_teacher, days="Tue",
                                       start_time="10:00", end_time="11:00")
        self._auth(self.teacher_user)
        resp = self.client.get("/api/time-slots/")
        self.assertEqual(resp.status_code, 200)
        labels = [t["label"] for t in resp.data]
        self.assertIn("Slot A", labels)
        self.assertNotIn("Slot B", labels)

    def test_admin_can_delete_timeslot(self):
        ts = TimeSlot.objects.create(label="Delete Me", school=self.school,
                                      teacher=self.teacher, days="Fri",
                                      start_time="08:00", end_time="09:00")
        self._auth(self.admin_user)
        resp = self.client.delete(f"/api/time-slots/{ts.id}/")
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)

    def test_teacher_cannot_delete_timeslot(self):
        ts = TimeSlot.objects.create(label="Keep Me", school=self.school,
                                      teacher=self.teacher, days="Fri",
                                      start_time="08:00", end_time="09:00")
        self._auth(self.teacher_user)
        resp = self.client.delete(f"/api/time-slots/{ts.id}/")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_other_teacher_cannot_update_slot(self):
        ts = TimeSlot.objects.create(label="My Slot", school=self.school,
                                      teacher=self.teacher, days="Mon",
                                      start_time="09:00", end_time="10:00")
        self._auth(self.other_teacher_user)
        resp = self.client.patch(f"/api/time-slots/{ts.id}/", {"label": "Hacked"}, format="json")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)


# ---------------------------------------------------------------------------
# Student validation test
# ---------------------------------------------------------------------------

class StudentTimeslotValidationTest(TestCase):

    def setUp(self):
        self.school = make_school()
        self.admin = make_user("admin_v", role="Admin")
        self.teacher_user = make_user("teacher_v")
        self.teacher = make_teacher(self.teacher_user, self.school)
        self.ts = TimeSlot.objects.create(
            label="Validation Slot", school=self.school,
            teacher=self.teacher, days="Mon",
            start_time="09:00", end_time="10:00",
        )
        self.client = APIClient()

    def test_cannot_assign_timeslot_to_onsite_student(self):
        """
        Validate that the serializer rejects time_slot on a non-ONLINE student.
        """
        from students.serializers import StudentSerializer
        data = {
            "name": "Onsite Kid",
            "reg_num": "TST-001",
            "school": self.school.id,
            "student_subtype": "ONSITE",
            "time_slot": self.ts.id,
        }
        serializer = StudentSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn("time_slot", serializer.errors)


# ---------------------------------------------------------------------------
# Regression: teacher list endpoint must expose profile_id == TeacherProfile.id
# so the frontend dropdown sends the correct FK for TimeSlot.teacher
# ---------------------------------------------------------------------------

class TeacherListProfileIdTest(TestCase):
    """
    Verify that /employees/teachers/ returns profile_id (TeacherProfile.pk)
    not just the user's pk.  The TimeSlot.teacher FK uses TeacherProfile.pk,
    so mismatching the two IDs causes the wrong teacher to be saved.
    """

    def setUp(self):
        self.client = APIClient()
        self.admin_user = make_user("admin_tl", role="Admin")
        self.teacher_user = make_user("tl_teacher1")
        self.teacher_profile = make_teacher(self.teacher_user)

    def _auth(self, user):
        self.client.force_authenticate(user=user)

    def test_profile_id_equals_teacher_profile_pk(self):
        self._auth(self.admin_user)
        resp = self.client.get("/employees/teachers/")
        self.assertEqual(resp.status_code, 200)

        # Find our teacher in the list
        matched = [t for t in resp.data if t["id"] == self.teacher_user.id]
        self.assertEqual(len(matched), 1, "Teacher not found in list")

        entry = matched[0]
        self.assertIn("profile_id", entry, "profile_id must be present in the teachers list response")
        self.assertEqual(
            entry["profile_id"],
            self.teacher_profile.id,
            "profile_id must equal TeacherProfile.pk so the TimeSlot teacher FK is correct"
        )

    def test_admin_creates_timeslot_using_profile_id(self):
        """End-to-end: use profile_id from /employees/teachers/ to create a time slot."""
        school = make_school()
        self._auth(self.admin_user)

        # Step 1: get teachers list
        resp = self.client.get("/employees/teachers/")
        self.assertEqual(resp.status_code, 200)
        matched = [t for t in resp.data if t["id"] == self.teacher_user.id]
        profile_id = matched[0]["profile_id"]

        # Step 2: create time slot with that profile_id as teacher
        ts_resp = self.client.post("/api/time-slots/", {
            "label": "E2E Slot",
            "school": school.id,
            "teacher": profile_id,
            "days": "Mon",
            "start_time": "09:00:00",
            "end_time": "10:00:00",
        }, format="json")
        self.assertEqual(ts_resp.status_code, 201, ts_resp.data)
        self.assertEqual(ts_resp.data["teacher"], self.teacher_profile.id)

        # Step 3: teacher name must be correct
        self.assertEqual(
            ts_resp.data["teacher_name"],
            self.teacher_user.get_full_name() or self.teacher_user.username
        )
