"""
Layout-independent bank statement parsing.

Every supported bank statement has the same five things: date, description,
amount received, amount deducted and net balance. Only their position, font and
header wording vary. So this module never relies on a fixed column order or a
bank-specific template. It works in this order:

1. Find the header (synonym match) to learn which column is which.
2. If there is no usable header, fall back to the running-balance chain: the
   rightmost number on a row is the balance, and whether the other number was
   received or deducted follows from how the balance moved.
3. Verify the result. Every row's balance must equal the previous balance plus
   received minus deducted. Rows that break the chain are flagged, so a misread
   number is caught here instead of reaching the user's review panel.

Input is either a grid of strings (Excel, CSV, PDF tables) via ``parse_table``
or positioned text lines (PDF words, OCR) via ``parse_positioned_lines``.
Output rows use the keys the rest of the ``ai`` app already expects:
``date, description, deposit, withdrawal, balance`` plus ``balance_ok``.
"""

import re
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, List, Optional

TOLERANCE = Decimal('0.01')
ZERO = Decimal('0')

# ---------------------------------------------------------------------------
# Scalar parsing
# ---------------------------------------------------------------------------

_DATE_FORMATS = (
    '%d/%m/%Y', '%d-%m-%Y', '%Y-%m-%d', '%d-%b-%Y', '%d/%b/%Y', '%d %b %Y',
    '%d-%B-%Y', '%d %B %Y', '%d.%m.%Y', '%d/%m/%y', '%d-%m-%y', '%d-%b-%y',
    '%d %b %y', '%d-%b-%Y', '%b %d, %Y', '%d %b, %Y',
)

_AMOUNT_RE = re.compile(
    r'^\(?-?\+?\s*(?:PKR|RS\.?|₨)?\s*-?\s*(\d{1,3}(?:,\d{3})+|\d+)(\.\d+)?\s*\)?\s*(DR|CR)?\.?$',
    re.IGNORECASE,
)


def parse_date(value: Any) -> Optional[date]:
    """Parse a date cell. Day-first is assumed (Pakistani bank statements)."""
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if not isinstance(value, str):
        return None
    text = value.strip()
    if not text or len(text) > 20:
        return None
    # Some banks print "31-Dec-2025 10:42" or "2025-12-31 00:00:00".
    text = re.sub(r'\s+\d{1,2}:\d{2}(:\d{2})?(\s*[AP]M)?$', '', text, flags=re.IGNORECASE)
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(text, fmt).date()
        except ValueError:
            continue
    return None


def parse_amount(value: Any) -> Optional[Decimal]:
    """
    Parse an amount cell. Returns None when the cell is not a number.
    Handles commas, decimals, (negative) brackets, leading minus, currency
    prefixes and trailing Dr/Cr. A trailing Dr or a bracket makes it negative.
    """
    if value is None:
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float, Decimal)):
        try:
            return Decimal(str(value))
        except InvalidOperation:
            return None
    text = str(value).strip()
    if not text or text in ('-', '--', '—', 'N/A', 'n/a', 'nan', 'None'):
        return None
    match = _AMOUNT_RE.match(text)
    if not match:
        return None
    whole, frac, suffix = match.group(1), match.group(2) or '', match.group(3)
    number = Decimal(whole.replace(',', '') + frac)
    negative = text.startswith('(') or text.lstrip('+( ').startswith('-') or (suffix or '').upper() == 'DR'
    return -number if negative else number


def _is_amount_like(text: str) -> bool:
    """Stricter than parse_amount: used where plain integers could be IDs."""
    value = parse_amount(text)
    if value is None:
        return False
    return True


# ---------------------------------------------------------------------------
# Header detection
# ---------------------------------------------------------------------------

_SYNONYMS = {
    'date': ['date', 'txn date', 'transaction date', 'value date', 'posting date', 'tran date', 'trans date'],
    'description': ['description', 'narration', 'particulars', 'details', 'remarks', 'transaction details',
                    'memo', 'narrative', 'transaction description'],
    'deposit': ['amount received', 'received', 'credit', 'credits', 'deposit', 'deposits', 'money in',
                'paid in', 'receipts', 'cr', 'credit amount', 'cr amount'],
    'withdrawal': ['amount deducted', 'deducted', 'debit', 'debits', 'withdrawal', 'withdrawals', 'money out',
                   'paid out', 'payments', 'dr', 'debit amount', 'dr amount'],
    'balance': ['net balance', 'running balance', 'closing balance', 'available balance', 'balance', 'bal'],
}


def _norm(text: Any) -> str:
    return re.sub(r'[^a-z ]+', ' ', str(text or '').lower()).strip()


def _norm_header(text: Any) -> str:
    return re.sub(r'\s+', ' ', _norm(text))


def classify_header_cell(text: Any) -> Optional[str]:
    """Return 'date' | 'description' | 'deposit' | 'withdrawal' | 'balance' or None."""
    cell = _norm_header(text)
    if not cell or len(cell) > 40:
        return None
    # Exact match first (covers short forms like cr / dr).
    for field, words in _SYNONYMS.items():
        if cell in words:
            return field
    # Phrase containment for longer synonyms, balance first so "net balance" wins.
    for field in ('balance', 'deposit', 'withdrawal', 'date', 'description'):
        for word in _SYNONYMS[field]:
            if len(word) > 3 and re.search(r'\b' + re.escape(word) + r'\b', cell):
                return field
    return None


def find_header(rows: List[List[Any]], max_scan: int = 40) -> Optional[Dict[str, Any]]:
    """Find the header row in a grid. Returns {'index': i, 'columns': {field: col}}."""
    for i, row in enumerate(rows[:max_scan]):
        columns: Dict[str, int] = {}
        for col, cell in enumerate(row):
            field = classify_header_cell(cell)
            if field and field not in columns:
                columns[field] = col
        # A usable header needs a date and at least two of the money columns.
        if 'date' in columns and len({'deposit', 'withdrawal', 'balance'} & set(columns)) >= 2:
            return {'index': i, 'columns': columns}
    return None


# ---------------------------------------------------------------------------
# Grid parsing (Excel, CSV, PDF tables)
# ---------------------------------------------------------------------------

def parse_table(rows: List[List[Any]]) -> Dict[str, Any]:
    """Parse a grid of cells into transactions (see module docstring)."""
    rows = [list(r) for r in rows if r and any(str(c or '').strip() for c in r)]
    header = find_header(rows)
    notes: List[str] = []

    if header:
        cols = header['columns']
        data_rows = rows[header['index'] + 1:]
        parsed = [_row_with_columns(r, cols) for r in data_rows]
        mode = 'header'
    else:
        parsed = [_row_without_header(r) for r in rows]
        mode = 'content'
        notes.append('No header row found; columns were inferred from the data.')

    return _finish(parsed, mode, notes)


def _cell(row: List[Any], col: Optional[int]) -> Any:
    if col is None or col >= len(row):
        return None
    return row[col]


def _row_with_columns(row: List[Any], cols: Dict[str, int]) -> Optional[Dict[str, Any]]:
    txn_date = parse_date(_cell(row, cols.get('date')))
    if not txn_date:
        return None
    deposit = parse_amount(_cell(row, cols.get('deposit')))
    withdrawal = parse_amount(_cell(row, cols.get('withdrawal')))
    balance = parse_amount(_cell(row, cols.get('balance')))
    desc = str(_cell(row, cols.get('description')) or '').strip()
    if deposit is None and withdrawal is None and balance is None:
        return None
    return {
        'date': txn_date,
        'description': re.sub(r'\s+', ' ', desc),
        'deposit': abs(deposit) if deposit else ZERO,
        'withdrawal': abs(withdrawal) if withdrawal else ZERO,
        'balance': balance,
        '_ambiguous': None,
    }


def _row_without_header(row: List[Any]) -> Optional[Dict[str, Any]]:
    """Content-based: first date cell, then numbers to its right; last number is the balance."""
    texts = [str(c if c is not None else '').strip() for c in row]
    date_idx = next((i for i, t in enumerate(texts) if parse_date(t)), None)
    if date_idx is None:
        return None
    nums = [(i, parse_amount(t)) for i, t in enumerate(texts) if i > date_idx and _looks_numeric(t)]
    desc = ' '.join(t for i, t in enumerate(texts) if i > date_idx and t and not _looks_numeric(t))
    return _from_numbers(parse_date(texts[date_idx]), desc, [v for _, v in nums])


def _looks_numeric(text: str) -> bool:
    # In header-less grids a bare integer is far more likely an id than an amount.
    value = parse_amount(text)
    return value is not None and (',' in text or '.' in text or len(text.replace('-', '')) <= 9)


def _from_numbers(txn_date: date, description: str, numbers: List[Decimal]) -> Optional[Dict[str, Any]]:
    """Build a row from the numbers found right of the description."""
    desc = re.sub(r'\s+', ' ', description).strip()
    if not numbers:
        return None
    if len(numbers) >= 3:
        credit, debit, balance = numbers[-3], numbers[-2], numbers[-1]
        return {'date': txn_date, 'description': desc, 'deposit': abs(credit), 'withdrawal': abs(debit),
                'balance': balance, '_ambiguous': None}
    if len(numbers) == 2:
        # One amount plus balance: direction is decided later from the balance chain.
        return {'date': txn_date, 'description': desc, 'deposit': ZERO, 'withdrawal': ZERO,
                'balance': numbers[1], '_ambiguous': abs(numbers[0])}
    return {'date': txn_date, 'description': desc, 'deposit': ZERO, 'withdrawal': ZERO,
            'balance': numbers[0], '_ambiguous': None}


# ---------------------------------------------------------------------------
# Positioned lines (PDF words, OCR)
# ---------------------------------------------------------------------------

def rows_from_words(words: List[Dict[str, Any]], line_tol: float = 3.0, gap: float = 9.0) -> List[List[Dict[str, Any]]]:
    """
    Group positioned words into lines, and words in a line into cells.
    Each word is {'text', 'x0', 'x1', 'top'}. Each returned line is a list of
    cells {'text', 'x0', 'x1'} sorted left to right. A gap wider than ``gap``
    points starts a new cell, so multi-word descriptions stay in one cell.
    """
    ordered = sorted(words, key=lambda w: (round(w['top']), w['x0']))
    lines: List[List[Dict[str, Any]]] = []
    current: List[Dict[str, Any]] = []
    current_top: Optional[float] = None
    for word in ordered:
        if current_top is None or abs(word['top'] - current_top) <= line_tol:
            current.append(word)
            current_top = word['top'] if current_top is None else current_top
        else:
            lines.append(current)
            current, current_top = [word], word['top']
    if current:
        lines.append(current)

    result = []
    for line in lines:
        line.sort(key=lambda w: w['x0'])
        cells: List[Dict[str, Any]] = []
        for w in line:
            if cells and w['x0'] - cells[-1]['x1'] <= gap:
                cells[-1]['text'] += ' ' + w['text']
                cells[-1]['x1'] = w['x1']
            else:
                cells.append({'text': w['text'], 'x0': w['x0'], 'x1': w['x1']})
        result.append(cells)
    return result


def parse_positioned_lines(lines: List[List[Dict[str, Any]]]) -> Dict[str, Any]:
    """Parse lines of positioned cells. Uses header x-positions when a header exists."""
    notes: List[str] = []
    header_idx = None
    header_cols: Dict[str, Dict[str, float]] = {}

    for i, cells in enumerate(lines[:60]):
        found: Dict[str, Dict[str, float]] = {}
        for cell in cells:
            field = classify_header_cell(cell['text'])
            if field and field not in found:
                found[field] = cell
        if 'date' in found and len({'deposit', 'withdrawal', 'balance'} & set(found)) >= 2:
            header_idx, header_cols = i, found
            break

    parsed: List[Optional[Dict[str, Any]]] = []
    last: Optional[Dict[str, Any]] = None
    start = (header_idx + 1) if header_idx is not None else 0

    for cells in lines[start:]:
        texts = [c['text'].strip() for c in cells]
        date_idx = next((i for i, t in enumerate(texts) if parse_date(t)), None)
        if date_idx is None:
            # A continuation line of a wrapped description.
            if last is not None and texts and not any(_looks_numeric(t) for t in texts):
                if classify_header_cell(' '.join(texts)) is None:
                    last['description'] = (last['description'] + ' ' + ' '.join(texts)).strip()
            continue

        txn_date = parse_date(texts[date_idx])
        right = cells[date_idx + 1:]
        desc_parts = [c['text'] for c in right if not _looks_numeric(c['text'])]
        num_cells = [c for c in right if _looks_numeric(c['text'])]

        if header_cols and any(f in header_cols for f in ('deposit', 'withdrawal', 'balance')):
            row = _assign_by_header(txn_date, ' '.join(desc_parts), num_cells, header_cols)
        else:
            row = _from_numbers(txn_date, ' '.join(desc_parts), [parse_amount(c['text']) for c in num_cells])
        if row:
            parsed.append(row)
            last = row

    if header_idx is None:
        notes.append('No header row found; columns were inferred from the data.')
    return _finish(parsed, 'header' if header_idx is not None else 'content', notes)


def _assign_by_header(txn_date: date, description: str, num_cells: List[Dict[str, Any]],
                      header_cols: Dict[str, Dict[str, float]]) -> Optional[Dict[str, Any]]:
    """Put each number into the header column it is closest to (right-edge or centre)."""
    slots = {f: header_cols[f] for f in ('deposit', 'withdrawal', 'balance') if f in header_cols}
    values: Dict[str, Decimal] = {}
    for cell in num_cells:
        cx = (cell['x0'] + cell['x1']) / 2

        def distance(h: Dict[str, float]) -> float:
            hx = (h['x0'] + h['x1']) / 2
            return min(abs(cell['x1'] - h['x1']), abs(cx - hx))

        field = min(slots, key=lambda f: distance(slots[f]))
        values.setdefault(field, parse_amount(cell['text']))
    if not values:
        return None
    deposit, withdrawal, balance = values.get('deposit'), values.get('withdrawal'), values.get('balance')
    return {
        'date': txn_date,
        'description': re.sub(r'\s+', ' ', description).strip(),
        'deposit': abs(deposit) if deposit else ZERO,
        'withdrawal': abs(withdrawal) if withdrawal else ZERO,
        'balance': balance,
        '_ambiguous': None,
    }


# ---------------------------------------------------------------------------
# Ordering, direction inference and verification
# ---------------------------------------------------------------------------

def _finish(parsed: List[Optional[Dict[str, Any]]], mode: str, notes: List[str]) -> Dict[str, Any]:
    rows = [r for r in parsed if r]
    if not rows:
        return {'transactions': [], 'opening_balance': None, 'closing_balance': None,
                'mode': mode, 'notes': notes + ['No transaction rows were found.'],
                'verified': 0, 'mismatches': 0}

    descending = _is_descending(rows)
    if descending:
        rows.reverse()
        notes.append('Statement was newest-first; rows were put in date order.')

    _infer_directions(rows)
    verified, mismatches = _verify_chain(rows)

    opening = None
    first = rows[0]
    if first['balance'] is not None:
        opening = first['balance'] - first['deposit'] + first['withdrawal']
    closing = next((r['balance'] for r in reversed(rows) if r['balance'] is not None), None)

    for i, r in enumerate(rows):
        r['row_no'] = i + 1
        r.pop('_ambiguous', None)
    if mismatches:
        notes.append(f'{mismatches} row(s) do not follow the running balance and need a manual check.')
    return {'transactions': rows, 'opening_balance': opening, 'closing_balance': closing,
            'mode': mode, 'notes': notes, 'verified': verified, 'mismatches': mismatches}


def _is_descending(rows: List[Dict[str, Any]]) -> bool:
    asc = sum(1 for a, b in zip(rows, rows[1:]) if b['date'] >= a['date'])
    desc = sum(1 for a, b in zip(rows, rows[1:]) if b['date'] <= a['date'])
    if asc == desc:
        return False
    return desc > asc


def _infer_directions(rows: List[Dict[str, Any]]) -> None:
    """For rows with one amount plus a balance, decide received vs deducted from the balance move."""
    for i, r in enumerate(rows):
        amount = r.get('_ambiguous')
        if amount is None or r['balance'] is None:
            continue
        prev_balance = rows[i - 1]['balance'] if i > 0 else None
        if prev_balance is None:
            r['balance_ok'] = None
            r['needs_direction'] = True
            r['deposit'] = amount  # best guess; flagged for review
            continue
        delta = r['balance'] - prev_balance
        if abs(delta - amount) <= TOLERANCE:
            r['deposit'] = amount
        elif abs(delta + amount) <= TOLERANCE:
            r['withdrawal'] = amount
        else:
            # Neither fits: keep the sign of the move as a guess and let verification flag it.
            if delta >= 0:
                r['deposit'] = amount
            else:
                r['withdrawal'] = amount


def _verify_chain(rows: List[Dict[str, Any]]):
    verified = mismatches = 0
    for i, r in enumerate(rows):
        if r.get('needs_direction'):
            continue
        if i == 0 or r['balance'] is None or rows[i - 1]['balance'] is None:
            r.setdefault('balance_ok', None)
            continue
        expected = rows[i - 1]['balance'] + r['deposit'] - r['withdrawal']
        ok = abs(expected - r['balance']) <= TOLERANCE
        r['balance_ok'] = ok
        if ok:
            verified += 1
        else:
            mismatches += 1
    return verified, mismatches


def chain_mismatches(rows: List[Dict[str, Any]]):
    """
    (checked, bad) for rows with deposit/withdrawal/balance keys, in either file order.
    Used to choose between two parsers' results for the same statement.
    """
    def count(seq):
        checked = bad = 0
        for prev, cur in zip(seq, seq[1:]):
            if prev.get('balance') is None or cur.get('balance') is None:
                continue
            checked += 1
            expected = prev['balance'] + (cur.get('deposit') or ZERO) - (cur.get('withdrawal') or ZERO)
            if abs(expected - cur['balance']) > TOLERANCE:
                bad += 1
        return checked, bad

    forward, backward = count(rows), count(list(reversed(rows)))
    return min(forward, backward, key=lambda cb: (cb[1], -cb[0]))
