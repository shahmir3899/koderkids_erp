"""
Billing helpers shared by the fee views, dashboards and serializers.

Schools are billed in one of two ways (School.payment_mode):
  - per_student:          one Fee row per student per month
  - monthly_subscription: ONE SchoolInvoice per school per month (lumpsum)

Anything that totals fees across schools has to look at both sources; the
helpers here keep that logic in one place.
"""
import re
from datetime import datetime
from decimal import Decimal

from django.db.models import Count, Max, Sum

from .models import Fee, SchoolInvoice, Student

MONTH_FORMAT = "%b-%Y"


def month_key(month_str):
    """'Oct-2026' -> (2026, 10); unparsable values sort first."""
    try:
        d = datetime.strptime(month_str, MONTH_FORMAT)
        return (d.year, d.month)
    except (TypeError, ValueError):
        return (0, 0)


def _natural_key(name):
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r'(\d+)', str(name))]


def snapshot_school_counts(school):
    """
    Active students and the classes that currently have at least one active
    student. Returns (students_count, classes_count, sorted_class_names).
    """
    rows = (
        Student.objects.filter(school=school, status='Active')
        .values('student_class')
        .annotate(n=Count('id'))
    )
    names = sorted(
        {(r['student_class'] or '').strip() for r in rows if (r['student_class'] or '').strip()},
        key=_natural_key,
    )
    students = sum(r['n'] for r in rows)
    return students, len(names), names


def build_invoice_no(school, month):
    """e.g. KK-SUB-Oct2026-TheSmartSchoolSoanGarden"""
    school_part = re.sub(r'[^A-Za-z0-9]', '', school.name)[:40]
    return f"KK-SUB-{month.replace('-', '')}-{school_part}"


def apply_payment(invoice, paid_amount):
    """Recalculate balance/status from a received amount. Caller validates the amount."""
    invoice.paid_amount = paid_amount
    invoice.balance_due = invoice.total_amount - invoice.paid_amount
    invoice.status = "Paid" if invoice.balance_due == 0 else "Pending"


def invoice_to_dict(invoice):
    return {
        "id": invoice.id,
        "school_id": invoice.school_id,
        "school_name": invoice.school.name if invoice.school else "",
        "school_address": (invoice.school.address or invoice.school.location or "") if invoice.school else "",
        "month": invoice.month,
        "invoice_no": invoice.invoice_no,
        "total_amount": str(invoice.total_amount),
        "students_count": invoice.students_count,
        "classes_count": invoice.classes_count,
        "class_names": invoice.class_names or [],
        "paid_amount": str(invoice.paid_amount),
        "balance_due": str(invoice.balance_due),
        "date_received": invoice.date_received.isoformat() if invoice.date_received else None,
        "status": invoice.status,
        "created_at": invoice.created_at.isoformat() if invoice.created_at else None,
    }


def latest_billed_month(school_id):
    """
    Most recent month billed to a school, from either source.
    Returns (month_str | None, has_fee_rows, has_invoice) for that month.
    """
    fee_month = (
        Fee.objects.filter(school_id=school_id).order_by('-id').values_list('month', flat=True).first()
    )
    inv_months = list(SchoolInvoice.objects.filter(school_id=school_id).values_list('month', flat=True))
    inv_month = max(inv_months, key=month_key) if inv_months else None

    if not fee_month and not inv_month:
        return None, False, False
    if fee_month and not inv_month:
        return fee_month, True, False
    if inv_month and not fee_month:
        return inv_month, False, True

    fk, ik = month_key(fee_month), month_key(inv_month)
    if fk > ik:
        return fee_month, True, False
    if ik > fk:
        return inv_month, False, True
    return fee_month, True, True


def latest_revenue_for_schools(school_ids):
    """
    {school_id: total billed in the school's latest billed month} using a fixed
    number of queries regardless of how many schools there are.
    """
    school_ids = list(school_ids)
    if not school_ids:
        return {}

    # Latest Fee month per school = month of the highest-id Fee row (as before)
    last_ids = list(
        Fee.objects.filter(school_id__in=school_ids)
        .values('school_id').annotate(last_id=Max('id')).values_list('last_id', flat=True)
    )
    fee_month = {
        r['school_id']: r['month']
        for r in Fee.objects.filter(id__in=last_ids).values('school_id', 'month')
    }
    fee_totals = {
        (r['school_id'], r['month']): r['total']
        for r in Fee.objects.filter(school_id__in=school_ids)
        .values('school_id', 'month').annotate(total=Sum('total_fee'))
    }

    inv_rows = list(
        SchoolInvoice.objects.filter(school_id__in=school_ids)
        .values('school_id', 'month', 'total_amount')
    )
    inv_latest = {}
    for r in inv_rows:
        cur = inv_latest.get(r['school_id'])
        if cur is None or month_key(r['month']) > month_key(cur['month']):
            inv_latest[r['school_id']] = r

    result = {}
    for sid in set(fee_month) | set(inv_latest):
        fm = fee_month.get(sid)
        im = inv_latest.get(sid)
        fee_amt = float(fee_totals.get((sid, fm), 0) or 0) if fm else 0.0
        inv_amt = float(im['total_amount'] or 0) if im else 0.0
        if fm and im:
            fk, ik = month_key(fm), month_key(im['month'])
            result[sid] = fee_amt if fk > ik else inv_amt if ik > fk else fee_amt + inv_amt
        else:
            result[sid] = fee_amt if fm else inv_amt
    return result


def invoice_totals_by_school(month, school_id=None):
    """Aggregate invoices for a month: [{school_id, total, paid, balance, students, count}]"""
    qs = SchoolInvoice.objects.filter(month=month)
    if school_id:
        qs = qs.filter(school_id=school_id)
    return list(
        qs.values('school_id').annotate(
            total=Sum('total_amount'),
            paid=Sum('paid_amount'),
            balance=Sum('balance_due'),
            students=Sum('students_count'),
            count=Count('id'),
        )
    )


def school_month_stats(month, school_ids=None):
    """
    Per-school totals for a month across per-student Fee rows AND lumpsum invoices.

    {school_id: {fee_count, invoice_count, total_fee_sum, paid_amount_sum, balance_due_sum}}
    fee_count is the number of billing records (fee rows + invoices); the *_sum keys
    match the shape the AI fee agent already used for Fee-only aggregates.
    """
    fee_qs = Fee.objects.filter(month=month)
    inv_qs = SchoolInvoice.objects.filter(month=month)
    if school_ids is not None:
        fee_qs = fee_qs.filter(school_id__in=school_ids)
        inv_qs = inv_qs.filter(school_id__in=school_ids)

    stats = {}

    def bucket(school_id):
        return stats.setdefault(school_id, {
            'fee_count': 0, 'invoice_count': 0,
            'total_fee_sum': Decimal('0'), 'paid_amount_sum': Decimal('0'), 'balance_due_sum': Decimal('0'),
        })

    for r in fee_qs.values('school_id').annotate(
        n=Count('id'), total=Sum('total_fee'), paid=Sum('paid_amount'), balance=Sum('balance_due')
    ):
        b = bucket(r['school_id'])
        b['fee_count'] += r['n']
        b['total_fee_sum'] += r['total'] or 0
        b['paid_amount_sum'] += r['paid'] or 0
        b['balance_due_sum'] += r['balance'] or 0

    for r in inv_qs.values('school_id').annotate(
        n=Count('id'), total=Sum('total_amount'), paid=Sum('paid_amount'), balance=Sum('balance_due')
    ):
        b = bucket(r['school_id'])
        b['fee_count'] += r['n']
        b['invoice_count'] += r['n']
        b['total_fee_sum'] += r['total'] or 0
        b['paid_amount_sum'] += r['paid'] or 0
        b['balance_due_sum'] += r['balance'] or 0

    return stats


def schools_with_records(month):
    """IDs of schools that already have any billing record (fee row or invoice) for the month."""
    ids = set(Fee.objects.filter(month=month).values_list('school_id', flat=True).distinct())
    ids |= set(SchoolInvoice.objects.filter(month=month).values_list('school_id', flat=True))
    return ids


def decimal(value):
    return Decimal(str(value))
