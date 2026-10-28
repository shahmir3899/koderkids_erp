"""
Guided bank-statement reconciliation: start a session, review lines, check the balance.

Parsing lives in ``statement_parser``, matching in ``statement_matcher``. This
module saves the result as a ``ReconciliationSession`` and performs the writes.
Balances are never overwritten: approving a line creates an ordinary Transaction
(whose ``save()`` moves the account balance), and the balance check only reads.
"""

from datetime import timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional

from django.db import transaction as db_transaction
from django.db.models import Q

from finance.models import Account, Transaction

from .models import ReconciliationLine, ReconciliationSession
from .statement_matcher import (
    TOLERANCE, analyse, check_balance, system_entries_for_account,
)

ZERO = Decimal('0')
DEFAULT_CATEGORY = 'Reconciliation'
ADJUSTMENT_CATEGORY = 'Reconciliation Adjustment'


class ReconciliationError(Exception):
    """A user-facing problem (bad request, stale confirmation, wrong state)."""


# ---------------------------------------------------------------------------
# Start
# ---------------------------------------------------------------------------

def _statement_rows(parsed: Dict[str, Any]) -> List[Dict[str, Any]]:
    return [
        {
            'date': t['date'],
            'description': t.get('description') or '',
            'deposit': t.get('deposit') or ZERO,
            'withdrawal': t.get('withdrawal') or ZERO,
            'balance': t.get('balance'),
            'balance_ok': t.get('balance_ok'),
            'row_no': t.get('row_no'),
            'date_inferred': t.get('date_inferred', False),
            'date_range': t.get('date_range'),
        }
        for t in parsed.get('transactions', [])
    ]


@db_transaction.atomic
def start_session(user, account: Account, parsed: Dict[str, Any], file_name: str = '') -> ReconciliationSession:
    """Save a parsed statement for ``account`` and sort its rows into matched / new / earlier."""
    rows = _statement_rows(parsed)
    if not rows:
        raise ReconciliationError('No transactions could be read from this statement.')

    period = parsed.get('statement_period') or {}
    date_from = period.get('from') or rows[0]['date']
    date_to = period.get('to') or rows[-1]['date']

    system = system_entries_for_account(account, date_from, date_to)
    accounts = [{'id': a.id, 'name': a.account_name} for a in Account.objects.all()]
    result = analyse(rows, system, accounts, account.id)

    mismatches = sum(1 for r in rows if r['balance_ok'] is False)
    session = ReconciliationSession.objects.create(
        user=user, account=account, file_name=file_name[:255],
        statement_opening=parsed.get('opening_balance'), statement_closing=parsed.get('closing_balance'),
        period_from=date_from, period_to=date_to,
        anchor_index=result['anchor_index'], anchor_note=result['anchor_note'][:255],
        parse_notes=list(parsed.get('parse_notes') or []), parse_mismatches=mismatches,
    )

    by_index = {e['statement_index']: ('new', e) for e in result['new_entries']}
    by_index.update({e['statement_index']: ('earlier', e) for e in result['earlier_unmatched']})
    by_index.update({e['statement_index']: ('unreadable', e) for e in result['unreadable']})

    lines = []
    for i, row in enumerate(rows):
        bucket, entry = by_index.get(i, ('matched', None))
        lines.append(ReconciliationLine(
            session=session, index=i, date=row['date'], description=row['description'][:300],
            deposit=row['deposit'], withdrawal=row['withdrawal'], balance=row['balance'],
            balance_ok=row['balance_ok'], bucket=bucket,
            status='matched' if bucket == 'matched' else ('skipped' if bucket == 'unreadable' else 'pending'),
            suggestion=_json_safe(entry['suggestion']) if entry else {},
        ))
    ReconciliationLine.objects.bulk_create(lines)
    return session


def _json_safe(value):
    if isinstance(value, dict):
        return {k: _json_safe(v) for k, v in value.items()}
    if isinstance(value, Decimal):
        return str(value)
    return value


# ---------------------------------------------------------------------------
# Review actions
# ---------------------------------------------------------------------------

def _line_for_update(session: ReconciliationSession, line_id: int) -> ReconciliationLine:
    try:
        line = ReconciliationLine.objects.select_for_update().get(pk=line_id, session=session)
    except ReconciliationLine.DoesNotExist:
        raise ReconciliationError('That statement line does not belong to this reconciliation.')
    return line


@db_transaction.atomic
def approve_line(session: ReconciliationSession, line_id: int, edits: Optional[Dict[str, Any]] = None) -> ReconciliationLine:
    """
    Create the transaction for a pending line. Safe to call twice: an already
    approved line is returned unchanged, so a double click cannot duplicate it.
    ``edits`` may set transaction_type, category, notes, counter_account_id, date.
    """
    _require_open(session)
    line = _line_for_update(session, line_id)
    if line.status == 'approved':
        return line
    if line.bucket not in ('new', 'earlier') or line.status not in ('pending', 'skipped'):
        raise ReconciliationError('This line cannot be approved.')

    edits = edits or {}
    suggestion = line.suggestion or {}
    into = line.deposit > 0 and line.withdrawal == 0
    out = line.withdrawal > 0 and line.deposit == 0
    if not (into or out):
        raise ReconciliationError('This line has no single clear amount.')
    amount = line.deposit if into else line.withdrawal

    txn_type = edits.get('transaction_type') or suggestion.get('type') or ('Income' if into else 'Expense')
    if txn_type not in ('Income', 'Expense', 'Transfer'):
        raise ReconciliationError('Transaction type must be Income, Expense or Transfer.')
    if txn_type == 'Income' and not into or txn_type == 'Expense' and not out:
        raise ReconciliationError(f'{txn_type} does not fit a line with money {"out" if out else "in"}.')

    category = (edits.get('category') or suggestion.get('category') or '').strip() or DEFAULT_CATEGORY
    notes = (edits.get('notes') if edits.get('notes') is not None else line.description) or ''
    txn_date = edits.get('date') or line.date

    fields = dict(date=txn_date, transaction_type=txn_type, amount=amount, category=category, notes=notes)
    if txn_type == 'Income':
        fields['to_account'] = session.account
    elif txn_type == 'Expense':
        fields['from_account'] = session.account
    else:
        counter_id = edits.get('counter_account_id') or suggestion.get('counter_account_id')
        if not counter_id:
            raise ReconciliationError('Choose the other account for this transfer.')
        if int(counter_id) == session.account_id:
            raise ReconciliationError('A transfer needs a different account on the other side.')
        try:
            counter = Account.objects.get(pk=counter_id)
        except Account.DoesNotExist:
            raise ReconciliationError('The other account for this transfer was not found.')
        fields['category'] = 'Transfer'
        if into:
            fields['from_account'], fields['to_account'] = counter, session.account
        else:
            fields['from_account'], fields['to_account'] = session.account, counter

    created = Transaction.objects.create(**fields)  # save() moves the balance
    line.transaction = created
    line.status = 'approved'
    line.save(update_fields=['transaction', 'status'])
    return line


@db_transaction.atomic
def skip_line(session: ReconciliationSession, line_id: int) -> ReconciliationLine:
    _require_open(session)
    line = _line_for_update(session, line_id)
    if line.status == 'approved':
        raise ReconciliationError('This line was already approved and entered.')
    if line.bucket not in ('new', 'earlier'):
        raise ReconciliationError('This line cannot be skipped.')
    line.status = 'skipped'
    line.save(update_fields=['status'])
    return line


@db_transaction.atomic
def reopen_line(session: ReconciliationSession, line_id: int) -> ReconciliationLine:
    """Put a skipped line back to pending (an approved line is never undone here)."""
    _require_open(session)
    line = _line_for_update(session, line_id)
    if line.status != 'skipped' or line.bucket not in ('new', 'earlier'):
        raise ReconciliationError('Only a skipped line can be reopened.')
    line.status = 'pending'
    line.save(update_fields=['status'])
    return line


def _require_open(session: ReconciliationSession) -> None:
    if session.status != 'open':
        raise ReconciliationError('This reconciliation is already completed.')


# ---------------------------------------------------------------------------
# Balance check and adjustment
# ---------------------------------------------------------------------------

def system_balance_as_of(account: Account, as_of) -> Decimal:
    """
    The account's balance at the end of ``as_of``: today's balance with later
    entries taken back out, so entries made after the statement date don't show as a gap.
    """
    account.refresh_from_db(fields=['current_balance'])
    balance = account.current_balance
    if not as_of:
        return balance
    later = Transaction.objects.filter(Q(from_account=account) | Q(to_account=account), date__gt=as_of)
    for t in later:
        if t.to_account_id == account.id:
            balance -= t.amount
        if t.from_account_id == account.id:
            balance += t.amount
    return balance


def _rows(lines) -> List[Dict[str, Any]]:
    return [{'date': l.date, 'description': l.description, 'deposit': l.deposit, 'withdrawal': l.withdrawal}
            for l in lines]


def balance_status(session: ReconciliationSession) -> Dict[str, Any]:
    """Compare the statement's closing balance with the system (approved entries are already in it)."""
    lines = list(session.lines.all())
    skipped = [l for l in lines if l.status == 'skipped' and l.bucket in ('new', 'earlier')]
    earlier_open = [l for l in lines if l.bucket == 'earlier' and l.status != 'approved']
    system_balance = system_balance_as_of(session.account, session.period_to)
    result = check_balance(system_balance, session.statement_closing, [], _rows(skipped), _rows(earlier_open))
    pending = sum(1 for l in lines if l.status == 'pending')
    return {
        'system_balance': system_balance,
        'statement_closing': session.statement_closing,
        'difference': result['difference'],
        'matches': result['matches'],
        'explanations': result['explanations'],
        'pending_lines': pending,
        'needs_adjustment': result['matches'] is False and pending == 0,
    }


@db_transaction.atomic
def create_adjustment(session: ReconciliationSession, expected_difference: Decimal) -> Transaction:
    """
    Last resort when the balance still differs after every line is decided.
    ``expected_difference`` must equal the current difference, so a stale
    confirmation (the numbers moved since the user looked) is refused.
    """
    _require_open(session)
    if session.adjustment_transaction_id:
        raise ReconciliationError('An adjustment was already made for this reconciliation.')
    status = balance_status(session)
    if status['pending_lines']:
        raise ReconciliationError('Review every line before adjusting the balance.')
    difference = status['difference']
    if difference is None:
        raise ReconciliationError('The statement has no closing balance to adjust to.')
    if abs(difference) <= TOLERANCE:
        raise ReconciliationError('The balances already match; no adjustment is needed.')
    if abs(difference - expected_difference) > TOLERANCE:
        raise ReconciliationError('The difference changed since you confirmed. Please review it again.')

    note = (f'RECONCILIATION ADJUSTMENT: balance corrected by {difference:,.2f} to match the statement '
            f'closing balance (session #{session.pk}).')
    if difference > 0:
        txn = Transaction.objects.create(date=session.period_to, transaction_type='Income', amount=difference,
                                         category=ADJUSTMENT_CATEGORY, to_account=session.account, notes=note)
    else:
        txn = Transaction.objects.create(date=session.period_to, transaction_type='Expense', amount=-difference,
                                         category=ADJUSTMENT_CATEGORY, from_account=session.account, notes=note)
    session.adjustment_transaction = txn
    session.save(update_fields=['adjustment_transaction', 'updated_at'])
    return txn


def complete_session(session: ReconciliationSession) -> ReconciliationSession:
    _require_open(session)
    if session.lines.filter(status='pending').exists():
        raise ReconciliationError('Some lines are still waiting for review.')
    session.status = 'completed'
    session.save(update_fields=['status', 'updated_at'])
    return session


# ---------------------------------------------------------------------------
# Serialisation
# ---------------------------------------------------------------------------

def _num(value) -> Optional[float]:
    return None if value is None else float(value)


def serialize_line(line: ReconciliationLine) -> Dict[str, Any]:
    return {
        'id': line.id, 'index': line.index,
        'date': line.date.isoformat() if line.date else None,
        'description': line.description,
        'deposit': _num(line.deposit), 'withdrawal': _num(line.withdrawal), 'balance': _num(line.balance),
        'balance_ok': line.balance_ok, 'bucket': line.bucket, 'status': line.status,
        'suggestion': line.suggestion or {}, 'transaction_id': line.transaction_id,
    }


def serialize_session(session: ReconciliationSession) -> Dict[str, Any]:
    lines = list(session.lines.all())
    status = balance_status(session)
    counts = {
        'matched': sum(1 for l in lines if l.bucket == 'matched'),
        'pending': sum(1 for l in lines if l.status == 'pending'),
        'approved': sum(1 for l in lines if l.status == 'approved'),
        'skipped': sum(1 for l in lines if l.status == 'skipped' and l.bucket in ('new', 'earlier')),
        'unreadable': sum(1 for l in lines if l.bucket == 'unreadable'),
    }
    return {
        'id': session.id,
        'status': session.status,
        'account': {'id': session.account_id, 'name': session.account.account_name,
                    'current_balance': _num(session.account.current_balance)},
        'file_name': session.file_name,
        'period': {'from': session.period_from.isoformat() if session.period_from else None,
                   'to': session.period_to.isoformat() if session.period_to else None},
        'statement_opening': _num(session.statement_opening),
        'statement_closing': _num(session.statement_closing),
        'anchor_index': session.anchor_index, 'anchor_note': session.anchor_note,
        'parse_notes': session.parse_notes, 'parse_mismatches': session.parse_mismatches,
        'counts': counts,
        'balance': {
            'system_balance': _num(status['system_balance']), 'statement_closing': _num(status['statement_closing']),
            'difference': _num(status['difference']), 'matches': status['matches'],
            'explanations': status['explanations'], 'needs_adjustment': status['needs_adjustment'],
        },
        'adjustment_transaction_id': session.adjustment_transaction_id,
        'lines': [serialize_line(l) for l in lines],
    }
