from decimal import Decimal
from datetime import date

from django.test import TestCase
from rest_framework.test import APIClient

from .models import School, Student, Fee, CustomUser


class LumpsumAndPayInFullTests(TestCase):
    def setUp(self):
        self.admin = CustomUser.objects.create_user(username="adm", password="x", role="Admin")
        self.client = APIClient()
        self.client.force_authenticate(self.admin)
        self.lump = School.objects.create(
            name="Lump School", payment_mode="monthly_subscription",
            monthly_subscription_amount=Decimal("3000"),
        )
        self.per = School.objects.create(name="Per School", payment_mode="per_student")

    def _student(self, school, n, fee=0):
        return Student.objects.create(name=f"S{n}", reg_num=f"R{school.id}{n}", school=school,
                                      student_class="1", monthly_fee=fee)

    def test_add_student_lumpsum_ignores_fee(self):
        r = self.client.post("/api/students/", {"name": "New Kid", "school": self.lump.id,
                                                "student_class": "1", "monthly_fee": 999,
                                                "password": "Passw0rd!"}, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(Student.objects.get(id=r.data["id"]).monthly_fee, 0)

    def test_add_student_per_student_keeps_fee(self):
        r = self.client.post("/api/students/", {"name": "New Kid", "school": self.per.id,
                                                "student_class": "1", "monthly_fee": 500,
                                                "password": "Passw0rd!"}, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(Student.objects.get(id=r.data["id"]).monthly_fee, 500)

    def test_single_fee_lumpsum_uses_share(self):
        for i in range(3):
            self._student(self.lump, i)
        s = Student.objects.filter(school=self.lump).first()
        r = self.client.post("/api/fees/create-single/", {"student_id": s.id, "month": "Sep-2026"}, format="json")
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(Decimal(r.data["fee"]["total_fee"]), Decimal("1000.00"))

    def test_late_joiner_does_not_resplit_existing_fees(self):
        for i in range(2):
            self._student(self.lump, i)
        self.client.post("/api/fees/create/", {"school_id": self.lump.id, "month": "Sep-2026"}, format="json")
        before = sorted(Fee.objects.filter(school=self.lump).values_list("id", "total_fee"))
        self._student(self.lump, 9)
        self.assertEqual(before, sorted(Fee.objects.filter(school=self.lump).values_list("id", "total_fee")))

    def test_pay_in_full(self):
        s = self._student(self.per, 1, fee=700)
        fee = Fee.objects.create(student_id=s.id, student_name=s.name, school=self.per, month="Sep-2026",
                                 total_fee=700, paid_amount=100, balance_due=600, monthly_fee=700)
        r = self.client.post("/api/fees/update/", {"fees": [{"id": fee.id, "pay_in_full": True}]}, format="json")
        self.assertEqual(r.status_code, 200, r.data)
        fee.refresh_from_db()
        self.assertEqual(fee.paid_amount, fee.total_fee)
        self.assertEqual(fee.balance_due, 0)
        self.assertEqual(fee.status, "Paid")
        self.assertEqual(fee.date_received, date.today())

    def test_date_received_alone_keeps_paid_amount(self):
        s = self._student(self.per, 2, fee=700)
        fee = Fee.objects.create(student_id=s.id, student_name=s.name, school=self.per, month="Sep-2026",
                                 total_fee=700, paid_amount=100, balance_due=600, monthly_fee=700)
        r = self.client.post("/api/fees/update/", {"fees": [{"id": fee.id, "date_received": "2026-09-10"}]}, format="json")
        self.assertEqual(r.status_code, 200, r.data)
        fee.refresh_from_db()
        self.assertEqual(fee.paid_amount, 100)
        self.assertEqual(fee.date_received, date(2026, 9, 10))
