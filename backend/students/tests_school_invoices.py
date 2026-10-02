from decimal import Decimal
from datetime import date

from django.test import TestCase
from rest_framework.test import APIClient

from .models import CustomUser, Fee, School, SchoolInvoice, Student
from . import billing
from .serializers import SchoolSerializer


def _student(school, n, cls="1", status="Active", fee=0):
    return Student.objects.create(name=f"S{n}", reg_num=f"{school.id}-{n}-{cls}", school=school,
                                  student_class=cls, monthly_fee=fee, status=status)


class InvoiceBase(TestCase):
    def setUp(self):
        self.admin = CustomUser.objects.create_user(username="inv_adm", password="x", role="Admin")
        self.client = APIClient()
        self.client.force_authenticate(self.admin)
        self.lump = School.objects.create(name="The Lump School", address="Soan Garden",
                                          payment_mode="monthly_subscription",
                                          monthly_subscription_amount=Decimal("35000"))
        self.per = School.objects.create(name="Per School", payment_mode="per_student")
        # 5 active students in classes 1A, 1B, 2, 10 (+1 inactive in class 3)
        for i, c in enumerate(["1A", "1A", "1B", "2", "10"]):
            _student(self.lump, i, c)
        _student(self.lump, 99, "3", status="Left")

    def generate(self, month="Oct-2026", force=False, school=None):
        return self.client.post("/api/fees/create/", {
            "school_id": (school or self.lump).id, "month": month, "force_overwrite": force}, format="json")


class GenerationTests(InvoiceBase):
    def test_creates_single_invoice_with_snapshot_and_no_fee_rows(self):
        r = self.generate()
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(Fee.objects.count(), 0)
        inv = SchoolInvoice.objects.get()
        self.assertEqual(inv.total_amount, Decimal("35000"))
        self.assertEqual(inv.students_count, 5)           # active only
        self.assertEqual(inv.classes_count, 4)            # classes with an active student
        self.assertEqual(inv.class_names, ["1A", "1B", "2", "10"])  # natural order
        self.assertEqual(inv.balance_due, Decimal("35000"))
        self.assertEqual(inv.status, "Pending")
        self.assertEqual(inv.invoice_no, "KK-SUB-Oct2026-TheLumpSchool")
        self.assertEqual(r.data["invoice"]["students_count"], 5)

    def test_duplicate_needs_overwrite(self):
        self.generate()
        self.assertEqual(self.generate().status_code, 409)
        _student(self.lump, 50, "7")
        self.assertEqual(self.generate(force=True).status_code, 201)
        inv = SchoolInvoice.objects.get()
        self.assertEqual(SchoolInvoice.objects.count(), 1)
        self.assertEqual((inv.students_count, inv.classes_count), (6, 5))

    def test_overwrite_replaces_legacy_per_student_rows(self):
        Fee.objects.create(student_id=1, student_name="x", school=self.lump, month="Oct-2026",
                           total_fee=10, paid_amount=0, balance_due=10, monthly_fee=10)
        self.assertEqual(self.generate().status_code, 409)
        self.assertEqual(self.generate(force=True).status_code, 201)
        self.assertEqual(Fee.objects.filter(school=self.lump).count(), 0)

    def test_requires_subscription_amount(self):
        self.lump.monthly_subscription_amount = None
        self.lump.save()
        self.assertEqual(self.generate().status_code, 400)

    def test_no_active_students(self):
        Student.objects.filter(school=self.lump).update(status="Left")
        r = self.generate()
        self.assertEqual(r.status_code, 200)
        self.assertEqual(SchoolInvoice.objects.count(), 0)

    def test_per_student_school_unchanged(self):
        _student(self.per, 1, "1", fee=500)
        _student(self.per, 2, "1", fee=700)
        r = self.generate(school=self.per)
        self.assertEqual(r.status_code, 201)
        self.assertEqual(sorted(Fee.objects.filter(school=self.per).values_list("total_fee", flat=True)),
                         [Decimal("500"), Decimal("700")])
        self.assertEqual(SchoolInvoice.objects.count(), 0)


class InvoiceActionTests(InvoiceBase):
    def setUp(self):
        super().setUp()
        self.generate()
        self.inv = SchoolInvoice.objects.get()

    def upd(self, **payload):
        return self.client.post("/api/fees/invoices/update/", {"id": self.inv.id, **payload}, format="json")

    def test_list(self):
        r = self.client.get(f"/api/fees/invoices/?school_id={self.lump.id}&month=Oct-2026")
        self.assertEqual(len(r.data), 1)
        self.assertEqual(r.data[0]["school_name"], "The Lump School")
        self.assertEqual(r.data[0]["classes_count"], 4)

    def test_pay_in_full(self):
        r = self.upd(pay_in_full=True)
        self.assertEqual(r.status_code, 200, r.data)
        self.inv.refresh_from_db()
        self.assertEqual((self.inv.paid_amount, self.inv.balance_due, self.inv.status),
                         (Decimal("35000"), Decimal("0"), "Paid"))
        self.assertEqual(self.inv.date_received, date.today())

    def test_partial_payment_and_validation(self):
        self.assertEqual(self.upd(paid_amount=10000).status_code, 200)
        self.inv.refresh_from_db()
        self.assertEqual((self.inv.balance_due, self.inv.status), (Decimal("25000"), "Pending"))
        self.assertEqual(self.upd(paid_amount=35001).status_code, 400)
        self.assertEqual(self.upd(paid_amount=-1).status_code, 400)

    def test_date_only_keeps_amount(self):
        self.upd(paid_amount=5000)
        self.upd(date_received="2026-10-09")
        self.inv.refresh_from_db()
        self.assertEqual(self.inv.paid_amount, Decimal("5000"))
        self.assertEqual(self.inv.date_received, date(2026, 10, 9))

    def test_delete(self):
        self.assertEqual(self.client.post("/api/fees/invoices/delete/", {"id": self.inv.id}, format="json").status_code, 200)
        self.assertEqual(SchoolInvoice.objects.count(), 0)

    def test_teacher_without_school_access_is_denied(self):
        teacher = CustomUser.objects.create_user(username="t1", password="x", role="Teacher")
        c = APIClient()
        c.force_authenticate(teacher)
        r = c.post("/api/fees/invoices/update/", {"id": self.inv.id, "pay_in_full": True}, format="json")
        self.assertEqual(r.status_code, 403)
        self.assertEqual(c.get(f"/api/fees/invoices/?school_id={self.lump.id}").data, [])
        teacher.assigned_schools.add(self.lump)
        self.assertEqual(c.post("/api/fees/invoices/update/", {"id": self.inv.id, "pay_in_full": True},
                                format="json").status_code, 200)


class DashboardTotalsTests(InvoiceBase):
    def setUp(self):
        super().setUp()
        _student(self.per, 1, "1", fee=500)
        self.generate(school=self.per)                  # per-student rows, Oct-2026
        self.generate()                                  # lumpsum invoice, Oct-2026
        self.inv = SchoolInvoice.objects.get()
        self.client.post("/api/fees/invoices/update/", {"id": self.inv.id, "paid_amount": 5000}, format="json")

    def test_fee_summary_includes_invoice(self):
        r = self.client.get("/api/fee-summary/?month=Oct-2026")
        by = {e["school_id"]: e for e in r.data}
        self.assertEqual(by[self.lump.id]["total_fee"], 35000.0)
        self.assertEqual(by[self.lump.id]["paid_amount"], 5000.0)
        self.assertEqual(by[self.lump.id]["balance_due"], 30000.0)
        self.assertEqual(by[self.per.id]["total_fee"], 500.0)

    def test_fee_per_month_includes_invoice(self):
        r = self.client.get("/api/fee-per-month/")
        rows = {(int(x["school"]), x["month"]): float(x["total_fee"]) for x in r.data}
        self.assertEqual(rows[(self.lump.id, "Oct-2026")], 5000.0)
        self.assertEqual(rows[(self.per.id, "Oct-2026")], 0.0)

    def test_compare_months_includes_invoice(self):
        r = self.client.get("/api/fees/compare/?month1=Sep-2026&month2=Oct-2026")
        m2 = r.data["month2"]
        self.assertEqual(float(m2["total_fee"]), 35500.0)
        self.assertEqual(float(m2["total_paid"]), 5000.0)
        self.assertEqual(m2["total_records"], 1 + 5)      # 1 fee row + 5 enrolled students

    def test_defaulters_include_school_invoices(self):
        month = date.today().strftime("%b-%Y")
        SchoolInvoice.objects.filter(id=self.inv.id).update(month=month)
        r = self.client.get("/api/fees/defaulters/?months=1")
        self.assertEqual([d["school_id"] for d in r.data["school_defaulters"]], [self.lump.id])

    def test_school_monthly_revenue_uses_latest_month_across_sources(self):
        # Fee row in Oct, invoice in Oct -> both counted
        self.assertEqual(billing.latest_revenue_for_schools([self.lump.id, self.per.id]),
                         {self.lump.id: 35000.0, self.per.id: 500.0})
        # newer invoice beats an older per-student month
        Fee.objects.create(student_id=1, student_name="x", school=self.lump, month="Aug-2026",
                           total_fee=999, paid_amount=0, balance_due=999, monthly_fee=999)
        self.assertEqual(billing.latest_revenue_for_schools([self.lump.id])[self.lump.id], 35000.0)
        self.assertEqual(SchoolSerializer(self.lump).data["monthly_revenue"], 35000.0)
        # a newer per-student month beats an older invoice
        Fee.objects.create(student_id=1, student_name="y", school=self.lump, month="Dec-2026",
                           total_fee=1234, paid_amount=0, balance_due=1234, monthly_fee=1234)
        self.assertEqual(billing.latest_revenue_for_schools([self.lump.id])[self.lump.id], 1234.0)
