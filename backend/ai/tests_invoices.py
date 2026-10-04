"""
Fee agent + lumpsum school invoices.

Lumpsum (monthly_subscription) schools are billed with ONE SchoolInvoice per month
instead of per-student Fee rows. These tests cover how the AI fee agent creates,
queries, pays and deletes those invoices, and that per-student schools still behave
exactly as before. The LLM is mocked; no network.
"""
from datetime import date
from decimal import Decimal

from django.core.cache import cache
from django.test import TestCase

from students.models import CustomUser, Fee, School, SchoolInvoice, Student
from ai.actions import get_action_definition, is_delete_action
from ai.executor import ActionExecutor
from ai.prompts import get_fee_agent_prompt
from ai.service import AIAgentService

MONTH = "Oct-2026"


def make_student(school, n, cls="1", status="Active", fee=0):
    return Student.objects.create(name=f"Kid {school.id}-{n}", reg_num=f"AG-{school.id}-{n}-{cls}",
                                  school=school, student_class=cls, monthly_fee=fee, status=status)


class AgentInvoiceBase(TestCase):
    def setUp(self):
        cache.clear()
        self.admin = CustomUser.objects.create_user(username="ag_admin", password="x", role="Admin")
        self.lump = School.objects.create(name="The Lump School", payment_mode="monthly_subscription",
                                          monthly_subscription_amount=Decimal("35000"), address="Soan Garden")
        self.per = School.objects.create(name="Per Student School", payment_mode="per_student")
        for i, c in enumerate(["1A", "1A", "1B", "2", "10"]):
            make_student(self.lump, i, c)
        make_student(self.lump, 99, "3", status="Left")
        make_student(self.per, 1, "1", fee=500)
        make_student(self.per, 2, "1", fee=700)
        self.ex = ActionExecutor(self.admin)

    def run_action(self, name, params, user=None):
        ex = ActionExecutor(user) if user else self.ex
        return ex.execute("fee", get_action_definition("fee", name), params)

    def make_invoice(self, month=MONTH, paid=None):
        r = self.run_action("CREATE_MONTHLY_FEES", {"school_id": self.lump.id, "month": month})
        assert r["success"], r
        inv = SchoolInvoice.objects.get(school=self.lump, month=month)
        if paid is not None:
            self.run_action("UPDATE_INVOICE", {"school_id": self.lump.id, "month": month, "paid_amount": paid})
            inv.refresh_from_db()
        return inv


class ActionDefinitionTests(TestCase):
    def test_new_actions_are_registered(self):
        update = get_action_definition("fee", "UPDATE_INVOICE")
        delete = get_action_definition("fee", "DELETE_INVOICE")
        self.assertIsNotNone(update)
        self.assertIsNotNone(delete)
        self.assertFalse(is_delete_action(update))
        self.assertTrue(is_delete_action(delete))  # destructive: needs confirmation

    def test_prompt_teaches_the_llm_about_invoices(self):
        prompt = get_fee_agent_prompt({"current_month": MONTH, "schools": []})
        self.assertIn("UPDATE_INVOICE", prompt)
        self.assertIn("DELETE_INVOICE", prompt)
        self.assertIn("LUMPSUM SCHOOLS", prompt)


class CreationTests(AgentInvoiceBase):
    def test_create_monthly_fees_makes_an_invoice_with_a_clear_message_and_undo(self):
        r = self.run_action("CREATE_MONTHLY_FEES", {"school_id": self.lump.id, "month": MONTH})
        self.assertTrue(r["success"], r)
        self.assertIn("invoice", r["message"].lower())
        self.assertIn("5 students", r["message"])
        self.assertIn("4 classes", r["message"])
        self.assertEqual(r["data"]["invoices"][0]["total_amount"], 35000.0)
        self.assertEqual(Fee.objects.filter(school=self.lump).count(), 0)
        self.assertTrue(r["data"]["can_undo"])

        undo = ActionExecutor(self.admin).execute_undo()
        self.assertTrue(undo["success"], undo)
        self.assertEqual(SchoolInvoice.objects.count(), 0)

    def test_existing_invoice_asks_to_overwrite(self):
        self.make_invoice()
        r = self.run_action("CREATE_MONTHLY_FEES", {"school_id": self.lump.id, "month": MONTH})
        self.assertFalse(r["success"])
        self.assertTrue(r.get("needs_overwrite_confirmation"))
        self.assertIn("invoice", r["message"].lower())

        r2 = self.run_action("CREATE_MONTHLY_FEES", {"school_id": self.lump.id, "month": MONTH, "force_overwrite": True})
        self.assertTrue(r2["success"], r2)
        self.assertEqual(SchoolInvoice.objects.count(), 1)

    def test_per_student_school_is_unchanged(self):
        r = self.run_action("CREATE_MONTHLY_FEES", {"school_id": self.per.id, "month": MONTH})
        self.assertTrue(r["success"])
        self.assertIn("2 fee records", r["message"])
        self.assertEqual(Fee.objects.filter(school=self.per).count(), 2)
        self.assertEqual(SchoolInvoice.objects.count(), 0)

    def test_all_schools_mixes_fee_rows_and_invoices(self):
        r = self.run_action("CREATE_FEES_ALL_SCHOOLS", {"month": MONTH})
        self.assertTrue(r["success"], r)
        self.assertEqual(r["data"]["total_records_created"], 2)   # per-student rows only
        self.assertEqual(r["data"]["invoices_created"], 1)
        self.assertIn("1 school invoice", r["message"])
        by_name = {x["school_name"]: x for x in r["data"]["results"]}
        self.assertTrue(by_name["The Lump School"]["invoice_created"])
        self.assertFalse(by_name["Per Student School"]["invoice_created"])

    def test_multiple_schools(self):
        r = self.run_action("CREATE_FEES_MULTIPLE_SCHOOLS",
                            {"month": MONTH, "school_names": "The Lump School, Per Student School"})
        self.assertTrue(r["success"], r)
        self.assertEqual(r["data"]["invoices_created"], 1)
        self.assertEqual(r["data"]["total_records_created"], 2)

    def test_create_missing_creates_invoice_and_never_student_rows_for_lumpsum(self):
        # per-student school already billed; lumpsum school has nothing yet
        self.run_action("CREATE_MONTHLY_FEES", {"school_id": self.per.id, "month": MONTH})
        r = self.run_action("CREATE_MISSING_FEES", {"month": MONTH})
        self.assertTrue(r["success"], r)
        self.assertEqual(len(r["data"]["invoices_created"]), 1)
        self.assertEqual(Fee.objects.filter(school=self.lump).count(), 0)

        # a student who joins the lumpsum school later is NOT a "missing fee"
        make_student(self.lump, 50, "7")
        again = self.run_action("CREATE_MISSING_FEES", {"month": MONTH})
        self.assertIn("Nothing to create", again["message"])
        self.assertEqual(Fee.objects.filter(school=self.lump).count(), 0)

    def test_missing_fees_preview_ignores_lumpsum_students(self):
        from ai.resolver import ParameterResolver
        self.make_invoice()
        make_student(self.lump, 60, "8")
        res = ParameterResolver({"current_month": MONTH}).resolve("CREATE_MISSING_FEES", {"month": MONTH})
        # lumpsum school has an invoice; per-student school has none -> exactly 1 school, 0 students
        self.assertTrue(res["success"], res)
        self.assertEqual(res["info"]["schools_count"], 1)
        self.assertEqual(res["info"]["students_count"], 0)


class QueryTests(AgentInvoiceBase):
    def setUp(self):
        super().setUp()
        self.run_action("CREATE_MONTHLY_FEES", {"school_id": self.per.id, "month": MONTH})
        self.make_invoice(paid=5000)

    def test_get_fees_includes_invoices_without_polluting_fee_ids(self):
        r = self.run_action("GET_FEES", {"month": MONTH})
        d = r["data"]
        self.assertEqual(d["count"], 2)                 # fee rows only
        self.assertEqual(d["invoice_count"], 1)
        self.assertEqual(len(d["fee_ids"]), 2)          # invoices never appear as fee ids
        self.assertEqual(d["total_fee"], 1200.0 + 35000.0)
        self.assertEqual(d["total_paid"], 5000.0)
        self.assertEqual(d["invoices"][0]["students_count"], 5)
        self.assertEqual(d["invoices"][0]["status"], "Partial")
        self.assertIn("1 school invoice", r["message"])

    def test_get_fees_for_a_lumpsum_school_and_filters(self):
        r = self.run_action("GET_FEES", {"month": MONTH, "school_id": self.lump.id})
        self.assertEqual(r["data"]["count"], 0)
        self.assertEqual(r["data"]["invoice_count"], 1)
        # class / student filters are student-level -> no invoices
        r2 = self.run_action("GET_FEES", {"month": MONTH, "class": "1A"})
        self.assertEqual(r2["data"]["invoice_count"], 0)
        # status filter
        paid = self.run_action("GET_FEES", {"month": MONTH, "status": "Paid"})
        self.assertEqual(paid["data"]["invoice_count"], 0)
        partial = self.run_action("GET_FEES", {"month": MONTH, "status": "Partial"})
        self.assertEqual(partial["data"]["invoice_count"], 1)

    def test_get_fee_summary_includes_invoices(self):
        r = self.run_action("GET_FEE_SUMMARY", {"month": MONTH})
        d = r["data"]
        self.assertEqual(d["total_fee"], 36200.0)
        self.assertEqual(d["total_received"], 5000.0)
        self.assertEqual(d["total_pending"], 31200.0)
        self.assertEqual(d["invoice_count"], 1)
        self.assertEqual(d["partial_count"], 1)
        self.assertIn("school invoice", r["message"])

        only_lump = self.run_action("GET_FEE_SUMMARY", {"month": MONTH, "school_id": self.lump.id})["data"]
        self.assertEqual(only_lump["total_fee"], 35000.0)
        self.assertEqual(only_lump["total_records"], 1)

    def test_schools_without_fees_counts_a_lumpsum_school_with_an_invoice_as_billed(self):
        r = self.run_action("GET_SCHOOLS_WITHOUT_FEES", {"month": MONTH})
        self.assertIn("All schools have fee records", r["message"])   # the lumpsum school is NOT flagged as missing
        names_with = {s["name"] for s in r["data"]["schools_with_fees"]}
        self.assertIn("The Lump School", names_with)
        self.assertEqual(r["data"]["count_without"], 0)

    def test_recovery_report_includes_invoices(self):
        r = self.run_action("GET_RECOVERY_REPORT", {"month": MONTH})
        row = next(s for s in r["data"]["schools"] if s["school_name"] == "The Lump School")
        self.assertEqual(row["status"], "has_fees")
        self.assertEqual(row["total_fee"], 35000.0)
        self.assertEqual(row["collected"], 5000.0)
        self.assertEqual(row["invoices"], 1)
        self.assertEqual(r["data"]["summary"]["total_fee"], 36200.0)

    def test_defaulters_lists_unpaid_school_invoices(self):
        month = date.today().strftime("%b-%Y")
        SchoolInvoice.objects.filter(school=self.lump).update(month=month, paid_amount=0,
                                                              balance_due=Decimal("35000"), status="Pending")
        r = self.run_action("GET_DEFAULTERS", {"months": 1})
        self.assertTrue(r["success"], r)
        self.assertIn("school invoice", r["message"])
        self.assertIn("The Lump School", r["message"])
        self.assertEqual(len(r["data"]["school_defaulters"]), 1)

    def test_compare_months_includes_invoices(self):
        r = self.run_action("COMPARE_MONTHS", {"month1": "Sep-2026", "month2": MONTH})
        self.assertTrue(r["success"], r)
        self.assertEqual(float(r["data"]["month2"]["total_fee"]), 36200.0)


class InvoiceActionTests(AgentInvoiceBase):
    def setUp(self):
        super().setUp()
        self.inv = self.make_invoice()

    def upd(self, **extra):
        return self.run_action("UPDATE_INVOICE", {"school_id": self.lump.id, "month": MONTH, **extra})

    def test_pay_in_full_then_undo(self):
        r = self.upd(paid_amount="full")
        self.assertTrue(r["success"], r)
        self.inv.refresh_from_db()
        self.assertEqual((self.inv.paid_amount, self.inv.balance_due, self.inv.status),
                         (Decimal("35000"), Decimal("0"), "Paid"))
        self.assertEqual(self.inv.date_received, date.today())
        self.assertIn("fully paid", r["message"])

        undo = ActionExecutor(self.admin).execute_undo()
        self.assertTrue(undo["success"], undo)
        self.inv.refresh_from_db()
        self.assertEqual((self.inv.paid_amount, self.inv.status, self.inv.date_received),
                         (Decimal("0"), "Pending", None))

    def test_partial_payment_sets_balance_and_partial_label(self):
        r = self.upd(paid_amount=12000)
        self.assertTrue(r["success"], r)
        self.inv.refresh_from_db()
        self.assertEqual(self.inv.balance_due, Decimal("23000"))
        self.assertEqual(r["data"]["status"], "Partial")

    def test_remaining_keyword_settles_the_invoice(self):
        self.upd(paid_amount=10000)
        r = self.upd(paid_amount="balance")
        self.assertTrue(r["success"])
        self.inv.refresh_from_db()
        self.assertEqual(self.inv.status, "Paid")

    def test_amount_validation(self):
        self.assertFalse(self.upd(paid_amount=36000)["success"])
        self.assertFalse(self.upd(paid_amount=-5)["success"])
        self.assertFalse(self.upd(paid_amount="lots")["success"])
        self.inv.refresh_from_db()
        self.assertEqual(self.inv.paid_amount, Decimal("0"))

    def test_date_received_only_and_parsing(self):
        r = self.upd(date_received="2026-10-09")
        self.assertTrue(r["success"], r)
        self.inv.refresh_from_db()
        self.assertEqual(self.inv.date_received, date(2026, 10, 9))
        self.assertEqual(self.inv.paid_amount, Decimal("0"))
        self.assertFalse(self.upd(date_received="not a date")["success"])

    def test_delete_invoice(self):
        r = self.run_action("DELETE_INVOICE", {"school_id": self.lump.id, "month": MONTH})
        self.assertTrue(r["success"], r)
        self.assertEqual(SchoolInvoice.objects.count(), 0)

    def test_teacher_cannot_touch_an_unassigned_schools_invoice(self):
        teacher = CustomUser.objects.create_user(username="ag_teacher", password="x", role="Teacher")
        r = self.run_action("UPDATE_INVOICE", {"school_id": self.lump.id, "month": MONTH, "paid_amount": "full"}, user=teacher)
        self.assertFalse(r["success"])
        self.assertIn("access", r["message"].lower())
        r2 = self.run_action("DELETE_INVOICE", {"school_id": self.lump.id, "month": MONTH}, user=teacher)
        self.assertFalse(r2["success"])
        self.assertEqual(SchoolInvoice.objects.count(), 1)
        self.assertEqual(self.run_action("GET_FEES", {"month": MONTH}, user=teacher)["data"]["invoice_count"], 0)


class ServiceFlowTests(AgentInvoiceBase):
    """Whole pipeline (LLM output -> resolver -> confirmation/execution) with the LLM mocked."""

    def say(self, parsed, user=None, context=None):
        service = AIAgentService(user or self.admin)
        service.llm.get_available_provider = lambda: "ollama"
        service.llm.generate_sync = lambda prompt, system_prompt=None, max_tokens=None: {
            "success": True, "response": "{}", "parsed": parsed, "response_time_ms": 1, "error": None}
        ctx = {"current_month": MONTH, "schools": [{"id": self.lump.id, "name": self.lump.name},
                                                   {"id": self.per.id, "name": self.per.name}]}
        ctx.update(context or {})
        return service, service.process_message("test message", "fee", ctx, [])

    def test_create_fees_for_lumpsum_school_creates_invoice(self):
        _, r = self.say({"action": "CREATE_MONTHLY_FEES", "school_name": "The Lump School", "month": MONTH})
        self.assertTrue(r["success"], r)
        self.assertEqual(r["action"], "CREATE_MONTHLY_FEES")
        self.assertEqual(SchoolInvoice.objects.count(), 1)

    def test_mark_invoice_paid(self):
        self.make_invoice()
        _, r = self.say({"action": "UPDATE_INVOICE", "school_name": "The Lump School", "paid_amount": "full"})
        self.assertTrue(r["success"], r)
        self.assertEqual(SchoolInvoice.objects.get().status, "Paid")

    def test_llm_alias_names_are_mapped(self):
        self.make_invoice()
        _, r = self.say({"action": "MARK_INVOICE_PAID", "school_name": "The Lump School", "paid_amount": "full"})
        self.assertEqual(r["action"], "UPDATE_INVOICE")
        self.assertTrue(r["success"], r)

    def test_bulk_mark_school_paid_is_redirected_to_the_invoice(self):
        self.make_invoice()
        _, r = self.say({"action": "BULK_UPDATE_FEES", "school_name": "The Lump School",
                         "month": MONTH, "paid_amount": "full"})
        self.assertEqual(r["action"], "UPDATE_INVOICE")
        self.assertTrue(r["success"], r)
        self.assertEqual(SchoolInvoice.objects.get().status, "Paid")

    def test_bulk_update_still_works_for_per_student_schools(self):
        self.run_action("CREATE_MONTHLY_FEES", {"school_id": self.per.id, "month": MONTH})
        _, r = self.say({"action": "BULK_UPDATE_FEES", "school_name": "Per Student School",
                         "month": MONTH, "paid_amount": "full"})
        self.assertTrue(r["needs_confirmation"], r)
        self.assertEqual(r["action"], "BULK_UPDATE_FEES")

    def test_delete_invoice_needs_confirmation_then_deletes(self):
        self.make_invoice()
        service, r = self.say({"action": "DELETE_INVOICE", "school_name": "The Lump School", "month": MONTH})
        self.assertTrue(r["needs_confirmation"], r)
        self.assertIn("The Lump School", r["message"])
        self.assertEqual(SchoolInvoice.objects.count(), 1)       # nothing deleted yet

        done = service.confirm_action(r["confirmation_token"])
        self.assertTrue(done["success"], done)
        self.assertEqual(SchoolInvoice.objects.count(), 0)

    def test_update_invoice_without_an_invoice_explains_how_to_create_it(self):
        _, r = self.say({"action": "UPDATE_INVOICE", "school_name": "The Lump School", "paid_amount": "full"})
        self.assertEqual(r["action"], "CLARIFY")
        self.assertIn("create fees", r["message"])

    def test_invoice_action_on_per_student_school_is_explained(self):
        _, r = self.say({"action": "UPDATE_INVOICE", "school_name": "Per Student School", "paid_amount": "full"})
        self.assertEqual(r["action"], "CLARIFY")
        self.assertIn("billed per student", r["message"])

    def test_update_invoice_asks_what_to_update(self):
        self.make_invoice()
        _, r = self.say({"action": "UPDATE_INVOICE", "school_name": "The Lump School"})
        self.assertEqual(r["action"], "CLARIFY")
        self.assertIn("What would you like to update", r["message"])

    def test_student_fee_update_in_lumpsum_school_points_to_the_invoice(self):
        self.make_invoice()
        student = Student.objects.filter(school=self.lump, status="Active").first()
        _, r = self.say({"action": "UPDATE_FEE", "student_id": student.id, "paid_amount": "full", "month": MONTH})
        self.assertEqual(r["action"], "CLARIFY")
        self.assertIn("invoice", r["message"].lower())
