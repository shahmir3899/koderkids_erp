"""
Match a parsed bank statement against the transactions already in the system.

The reconciliation flow is:

1. Match statement rows to system entries (date, amount, direction, wording).
2. Find the sync anchor: the newest place where 2-3 consecutive statement rows
   matched system entries. Everything after it is "not entered yet".
3. For each missing row, suggest a type (Income, Expense or Transfer) and a
   category from similar past entries.
4. After the user reviews, report whether the balances line up.

Everything here works on plain dicts so it can be tested without a database;
``system_entries_for_account`` is the one thin adapter to the Django models.

Statement row:  {date, description, deposit, withdrawal, balance, row_no}
System entry:   {id, date, amount, direction ('in'|'out'), type, category,
                 notes, counter_account_id, counter_account_name}
"""

import re
from datetime import timedelta
from decimal import Decimal
from difflib import SequenceMatcher
from typing import Any, Dict, List, Optional

TOLERANCE = Decimal('0.01')
DATE_WINDOW_DAYS = 2        # banks often post a day or two after the entry date
ANCHOR_RUN = 3              # try to anchor on up to this many consecutive matches
CATEGORY_MIN_SIMILARITY = 0.6


def _direction(row: Dict[str, Any]) -> Optional[str]:
    if row['deposit'] and not row['withdrawal']:
        return 'in'
    if row['withdrawal'] and not row['deposit']:
        return 'out'
    return None


def _amount(row: Dict[str, Any]) -> Decimal:
    return row['deposit'] or row['withdrawal']


def _date_gap(row: Dict[str, Any], entry_date) -> int:
    """
    Days between a statement row and a system entry. A row with no printed date
    carries the range it must fall in; inside that range the gap is zero.
    """
    if not entry_date or not row.get('date'):
        return 99
    rng = row.get('date_range')
    if rng:
        lo, hi = rng
        if lo <= entry_date <= hi:
            return 0
        return min(abs((entry_date - lo).days), abs((entry_date - hi).days))
    return abs((entry_date - row['date']).days)


def _words(text: Optional[str]) -> str:
    return re.sub(r'[^a-z0-9 ]+', ' ', (text or '').lower()).strip()


def _similarity(a: Optional[str], b: Optional[str]) -> float:
    a, b = _words(a), _words(b)
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, a, b).ratio()


# ---------------------------------------------------------------------------
# 1. Matching
# ---------------------------------------------------------------------------

def match_rows(statement: List[Dict[str, Any]], system: List[Dict[str, Any]],
               window_days: int = DATE_WINDOW_DAYS) -> Dict[int, int]:
    """
    One-to-one match: returns {statement_index: system_index}.
    Two same-day payments of the same amount match two system entries, not one.
    Exact-date matches are taken before near-date ones so neighbours don't steal each other's partner.
    """
    candidates = []
    for si, row in enumerate(statement):
        direction = _direction(row)
        if direction is None:
            continue
        for yi, entry in enumerate(system):
            if entry['direction'] != direction:
                continue
            if abs(entry['amount'] - _amount(row)) > TOLERANCE:
                continue
            days = _date_gap(row, entry['date'])
            if days > window_days:
                continue
            text = _similarity(row['description'], entry.get('notes'))
            # Lower is better: date gap dominates, wording breaks ties.
            candidates.append((days, -text, si, yi))

    candidates.sort()
    matched: Dict[int, int] = {}
    used_system = set()
    for _days, _neg_text, si, yi in candidates:
        if si in matched or yi in used_system:
            continue
        matched[si] = yi
        used_system.add(yi)
    return matched


# ---------------------------------------------------------------------------
# 2. Sync anchor
# ---------------------------------------------------------------------------

def find_anchor(statement: List[Dict[str, Any]], matched: Dict[int, int],
                system_count: int) -> Optional[int]:
    """
    Index (in the statement) of the last row of the newest run of consecutive
    matched rows. A run of up to ANCHOR_RUN rows is required; with fewer system
    entries available, a shorter run is accepted. Returns None when there is no anchor.
    """
    need = max(1, min(ANCHOR_RUN, system_count, 2 if system_count >= 2 else 1))
    best = None
    run = 0
    for i in range(len(statement)):
        if i in matched:
            run += 1
            if run >= need:
                best = i
        else:
            run = 0
    return best


# ---------------------------------------------------------------------------
# 3. Suggestions
# ---------------------------------------------------------------------------

def suggest_category(description: str, direction: str, system: List[Dict[str, Any]]) -> Optional[str]:
    """Category of the most similar past entry in the same direction, if similar enough."""
    best_score, best = 0.0, None
    for entry in system:
        if entry['direction'] != direction or not entry.get('category'):
            continue
        score = _similarity(description, entry.get('notes'))
        if score > best_score:
            best_score, best = score, entry
    if best and best_score >= CATEGORY_MIN_SIMILARITY:
        return best['category']
    return None


def suggest_type(row: Dict[str, Any], accounts: List[Dict[str, Any]], this_account_id: int) -> Dict[str, Any]:
    """
    Income/Expense by default; Transfer when the description names another of
    our accounts. ``accounts`` is [{id, name}].
    """
    direction = _direction(row)
    text = _words(row['description'])
    for acc in accounts:
        name = _words(acc['name'])
        if acc['id'] == this_account_id or len(name) < 3:
            continue
        if re.search(r'\b' + re.escape(name) + r'\b', text):
            return {'type': 'Transfer', 'counter_account_id': acc['id'], 'counter_account_name': acc['name']}
    return {'type': 'Income' if direction == 'in' else 'Expense', 'counter_account_id': None,
            'counter_account_name': None}


# ---------------------------------------------------------------------------
# Orchestration
# ---------------------------------------------------------------------------

def analyse(statement: List[Dict[str, Any]], system: List[Dict[str, Any]],
            accounts: Optional[List[Dict[str, Any]]] = None,
            this_account_id: Optional[int] = None) -> Dict[str, Any]:
    """
    Compare a chronological statement with the system's entries for one account.

    Returns:
      anchor_index / anchor_note   where the two sides last agreed
      matched                      count of statement rows already in the system
      new_entries                  unmatched rows AFTER the anchor, with suggestions
      earlier_unmatched            unmatched rows BEFORE the anchor (lower priority)
      unreadable                   rows with neither/both amounts (cannot be entered)
    """
    accounts = accounts or []
    matched = match_rows(statement, system)
    anchor = find_anchor(statement, matched, len(system))

    new_entries, earlier, unreadable = [], [], []
    for si, row in enumerate(statement):
        if si in matched:
            continue
        direction = _direction(row)
        if direction is None:
            unreadable.append({**row, 'statement_index': si})
            continue
        entry = {
            **row,
            'statement_index': si,
            'direction': direction,
            'amount': _amount(row),
            'suggestion': {
                **suggest_type(row, accounts, this_account_id),
                'category': suggest_category(row['description'], direction, system),
                **({'date_inferred': True,
                    'date_min': row['date_range'][0].isoformat() if row.get('date_range') else None,
                    'date_max': row['date_range'][1].isoformat() if row.get('date_range') else None}
                   if row.get('date_inferred') else {}),
            },
        }
        if anchor is None or si > anchor:
            new_entries.append(entry)
        else:
            earlier.append(entry)

    if anchor is None:
        note = 'No synced point found. Every statement row without a match is listed as not entered.'
    else:
        last = statement[anchor]
        note = f"Synced up to {last['date'].isoformat()} (row {anchor + 1}); {len(matched)} statement rows already in the system."

    return {
        'anchor_index': anchor,
        'anchor_note': note,
        'matched': len(matched),
        'new_entries': new_entries,
        'earlier_unmatched': earlier,
        'unreadable': unreadable,
    }


# ---------------------------------------------------------------------------
# 4. Balance check
# ---------------------------------------------------------------------------

def check_balance(system_balance: Decimal, statement_closing: Optional[Decimal],
                  approved: List[Dict[str, Any]], skipped: List[Dict[str, Any]],
                  earlier_unmatched: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
    """
    Projected system balance after the approved entries vs the statement's closing balance.
    ``difference`` > 0 means the statement is higher than the system.
    When it does not match, ``explanations`` lists likely causes.
    """
    def net(rows):
        return sum((r['deposit'] - r['withdrawal'] for r in rows), Decimal('0'))

    projected = system_balance + net(approved)
    if statement_closing is None:
        return {'projected_balance': projected, 'statement_closing': None, 'difference': None,
                'matches': None, 'explanations': ['The statement has no closing balance to compare with.']}

    difference = statement_closing - projected
    matches = abs(difference) <= TOLERANCE
    explanations: List[str] = []
    if not matches:
        skipped_net = net(skipped)
        if skipped and abs(difference - skipped_net) <= TOLERANCE:
            explanations.append(f'The difference equals the {len(skipped)} skipped entr'
                                f'{"y" if len(skipped) == 1 else "ies"}.')
        for row in (earlier_unmatched or []):
            if abs(difference - (row['deposit'] - row['withdrawal'])) <= TOLERANCE:
                explanations.append(f"The difference equals one earlier unmatched row ({row['date']}, {row['description']}).")
                break
        if earlier_unmatched and abs(difference - net(earlier_unmatched)) <= TOLERANCE:
            explanations.append('The difference equals all earlier unmatched rows together.')
        if not explanations:
            explanations.append('The difference is not explained by skipped or earlier entries. '
                                'Check the opening balance and any entries made outside this account.')
    return {'projected_balance': projected, 'statement_closing': statement_closing,
            'difference': difference, 'matches': matches, 'explanations': explanations}


# ---------------------------------------------------------------------------
# Database adapter
# ---------------------------------------------------------------------------

def system_entries_for_account(account, date_from=None, date_to=None, pad_days: int = 7) -> List[Dict[str, Any]]:
    """Read-only: the account's transactions as plain dicts, oldest first."""
    from django.db.models import Q
    from finance.models import Transaction

    qs = Transaction.objects.filter(Q(from_account=account) | Q(to_account=account)).select_related(
        'from_account', 'to_account')
    if date_from:
        qs = qs.filter(date__gte=date_from - timedelta(days=pad_days))
    if date_to:
        qs = qs.filter(date__lte=date_to + timedelta(days=pad_days))

    entries = []
    for t in qs.order_by('date', 'id'):
        into = t.to_account_id == account.id
        counter = t.from_account if into else t.to_account
        entries.append({
            'id': t.id, 'date': t.date, 'amount': t.amount,
            'direction': 'in' if into else 'out',
            'type': t.transaction_type, 'category': t.category, 'notes': t.notes,
            'counter_account_id': counter.id if counter else None,
            'counter_account_name': counter.account_name if counter else None,
        })
    return entries
