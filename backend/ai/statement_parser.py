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
    text = _fix_separators(text)
    match = _AMOUNT_RE.match(text)
    if not match:
        return None
    whole, frac, suffix = match.group(1), match.group(2) or '', match.group(3)
    number = Decimal(whole.replace(',', '') + frac)
    negative = text.startswith('(') or text.lstrip('+( ').startswith('-') or (suffix or '').upper() == 'DR'
    return -number if negative else number


_MIXED_SEP_RE = re.compile(r'^(\D*?)(\d{1,3}(?:[.,]\d{3})+[.,]\d{2})(\D*)$')


def _fix_separators(text: str) -> str:
    """
    Scans often misread the thousands comma as a dot ("266.390.00"). When a number
    has thousands groups and ends in two decimals, rebuild it as 266390.00.
    """
    m = _MIXED_SEP_RE.match(text)
    if not m:
        return text
    core = m.group(2)
    whole = re.sub(r'[.,]', '', core[:-3])
    return f'{m.group(1)}{whole}.{core[-2:]}{m.group(3)}'


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


_DATE_PREFIX_RE = re.compile(
    r'^(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}|\d{1,2}[- ][A-Za-z]{3}[- ]\d{2,4})(?![\d])\s*(.*)$'
)
_OPENING_RE = re.compile(r'opening\s+balance', re.IGNORECASE)
_CLOSING_RE = re.compile(r'closing\s+balance', re.IGNORECASE)
_AVAILABLE_RE = re.compile(r'available\s+balance', re.IGNORECASE)
# Summary lines printed under the table; they contain numbers but are not transactions.
_FOOTER_RE = re.compile(
    r'transactions?\s+count|total\s+(debit|credit|withdrawal|deposit)|printed\s+by|end\s+of\s+statement|'
    r'this\s+is\s+a\s+computer',
    re.IGNORECASE,
)
_PAGE_LINE_RE = re.compile(r'page\s*\d+\s*of\s*\d+', re.IGNORECASE)


def _split_leading_dates(cells: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """OCR often glues the date to the description ("31/01/2026RaastPTP..."): split them."""
    out: List[Dict[str, Any]] = []
    for cell in cells:
        text = cell['text'].strip()
        m = _DATE_PREFIX_RE.match(text)
        if m and parse_date(m.group(1)) and m.group(2):
            width = cell['x1'] - cell['x0']
            cut = cell['x0'] + width * len(m.group(1)) / max(len(text), 1)
            out.append({'text': m.group(1), 'x0': cell['x0'], 'x1': cut})
            out.append({'text': m.group(2), 'x0': cut, 'x1': cell['x1']})
        else:
            out.append(cell)
    return out


def _header_fields(cells: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    found: Dict[str, Dict[str, Any]] = {}
    for cell in cells:
        if parse_date(cell['text']) or _looks_numeric(cell['text']):
            return {}
        field = classify_header_cell(cell['text'])
        if field and field not in found:
            found[field] = cell
    return found


def _money_fields(fields: Dict[str, Any]) -> int:
    return len({'deposit', 'withdrawal', 'balance'} & set(fields))


def parse_positioned_lines(lines: List[List[Dict[str, Any]]]) -> Dict[str, Any]:
    """
    Parse lines of positioned cells (PDF words or OCR).

    The header is re-detected wherever it appears, so each scanned page uses its
    own column positions (photographed pages are rarely aligned). A header split
    over two lines is merged. A row whose date sits on a different line from its
    amounts is stitched together, and an amounts-only line reuses the previous date.
    """
    notes: List[str] = []
    header_cols: Dict[str, Dict[str, Any]] = {}
    saw_header = False
    parsed: List[Dict[str, Any]] = []
    last: Optional[Dict[str, Any]] = None
    pending: Optional[Dict[str, Any]] = None   # a dated line that has no amounts yet
    opening_hint: Optional[Decimal] = None
    closing_hint: Optional[Decimal] = None
    inferred_dates = 0
    in_footer = False

    i = 0
    while i < len(lines):
        cells = _split_leading_dates(lines[i])
        i += 1
        if not cells:
            continue

        # Header (possibly split over two lines).
        fields = _header_fields(cells)
        if len(fields) >= 2:
            if _money_fields(fields) < 2 and i < len(lines):
                extra = _header_fields(_split_leading_dates(lines[i]))
                if extra and len(extra) >= 1:
                    merged = {**extra, **fields}
                    if _money_fields(merged) >= 2:
                        fields = merged
                        i += 1
            if _money_fields(fields) >= 2:
                header_cols, saw_header = fields, True
                pending, in_footer = None, False
                continue

        texts = [c['text'].strip() for c in cells]
        joined = ' '.join(texts)

        if _OPENING_RE.search(joined) or _CLOSING_RE.search(joined) or _AVAILABLE_RE.search(joined):
            amount = next((parse_amount(t) for t in reversed(texts) if parse_amount(t) is not None), None)
            if amount is not None and _OPENING_RE.search(joined) and opening_hint is None:
                opening_hint = amount
            elif amount is not None and (_CLOSING_RE.search(joined) or _AVAILABLE_RE.search(joined)):
                closing_hint = amount
                in_footer = True
            last, pending = None, None
            continue

        if _PAGE_LINE_RE.search(joined):
            continue
        if _FOOTER_RE.search(joined):
            in_footer, last, pending = True, None, None
            continue
        if in_footer and not any(parse_date(t) for t in texts):
            continue

        date_idx = next((k for k, t in enumerate(texts) if parse_date(t)), None)
        txn_date = parse_date(texts[date_idx]) if date_idx is not None else None
        right = cells[date_idx + 1:] if date_idx is not None else cells
        desc_parts = [c['text'] for c in right if not _looks_numeric(c['text'])]
        num_cells = [c for c in right if _looks_numeric(c['text'])]

        if txn_date is not None and not num_cells:
            pending = {'date': txn_date, 'description': ' '.join(desc_parts)}
            last = None
            continue

        if not num_cells:
            # Continuation of a wrapped description.
            extra = ' '.join(texts)
            if pending is not None:
                pending['description'] = (pending['description'] + ' ' + extra).strip()
            elif last is not None:
                last['description'] = (last['description'] + ' ' + extra).strip()
            continue

        description = ' '.join(desc_parts)
        date_was_inferred = False
        if txn_date is None:
            if pending is not None:
                txn_date, description = pending['date'], (pending['description'] + ' ' + description).strip()
                pending = None
            elif last is not None:
                txn_date = last['date']
                inferred_dates += 1
                date_was_inferred = True
            else:
                continue  # numbers above the first transaction (account details, totals)
        else:
            pending = None
            in_footer = False

        if header_cols and _money_fields(header_cols) >= 2:
            row = _assign_by_header(txn_date, description, num_cells, header_cols)
        else:
            row = _from_numbers(txn_date, description, [parse_amount(c['text']) for c in num_cells])
        if row:
            if date_was_inferred:
                row['date_inferred'] = True
            parsed.append(row)
            last = row

    if not saw_header:
        notes.append('No header row found; columns were inferred from the data.')
    if inferred_dates:
        notes.append(f'{inferred_dates} row(s) had no date of their own and use the previous row date.')
    return _finish(parsed, 'header' if saw_header else 'content', notes, opening_hint, closing_hint)


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

def _finish(parsed: List[Optional[Dict[str, Any]]], mode: str, notes: List[str],
            opening_hint: Optional[Decimal] = None, closing_hint: Optional[Decimal] = None) -> Dict[str, Any]:
    rows = [r for r in parsed if r]
    if not rows:
        return {'transactions': [], 'opening_balance': None, 'closing_balance': None,
                'mode': mode, 'notes': notes + ['No transaction rows were found.'],
                'verified': 0, 'mismatches': 0}

    descending = _is_descending(rows)
    if descending:
        rows.reverse()
        notes.append('Statement was newest-first; rows were put in date order.')

    _infer_directions(rows, opening_hint)
    verified, mismatches, flipped = _verify_chain(rows, opening_hint)
    if flipped:
        notes.append(f'{flipped} row(s) had received/deducted swapped; fixed using the running balance.')

    opening = opening_hint
    first = rows[0]
    if opening is None and first['balance'] is not None:
        opening = first['balance'] - first['deposit'] + first['withdrawal']
    closing = closing_hint if closing_hint is not None else next(
        (r['balance'] for r in reversed(rows) if r['balance'] is not None), None)
    _add_date_ranges(rows)

    for i, r in enumerate(rows):
        r['row_no'] = i + 1
        r.pop('_ambiguous', None)
    if mismatches:
        notes.append(f'{mismatches} row(s) do not follow the running balance and need a manual check.')
    return {'transactions': rows, 'opening_balance': opening, 'closing_balance': closing,
            'mode': mode, 'notes': notes, 'verified': verified, 'mismatches': mismatches}


def _add_date_ranges(rows: List[Dict[str, Any]]) -> None:
    """A row with no printed date happened between its neighbours' dates; record that range."""
    for i, r in enumerate(rows):
        if not r.get('date_inferred'):
            continue
        lo = next((rows[j]['date'] for j in range(i - 1, -1, -1) if not rows[j].get('date_inferred')), r['date'])
        hi = next((rows[j]['date'] for j in range(i + 1, len(rows)) if not rows[j].get('date_inferred')), r['date'])
        r['date_range'] = (min(lo, hi), max(lo, hi))


def _is_descending(rows: List[Dict[str, Any]]) -> bool:
    asc = sum(1 for a, b in zip(rows, rows[1:]) if b['date'] >= a['date'])
    desc = sum(1 for a, b in zip(rows, rows[1:]) if b['date'] <= a['date'])
    if asc == desc:
        return False
    return desc > asc


def _infer_directions(rows: List[Dict[str, Any]], opening_hint: Optional[Decimal] = None) -> None:
    """For rows with one amount plus a balance, decide received vs deducted from the balance move."""
    for i, r in enumerate(rows):
        amount = r.get('_ambiguous')
        if amount is None or r['balance'] is None:
            continue
        prev_balance = rows[i - 1]['balance'] if i > 0 else opening_hint
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


def _verify_chain(rows: List[Dict[str, Any]], opening_hint: Optional[Decimal] = None):
    """
    Check every row against the running balance. When a row only fits with
    received and deducted swapped (a number read under the wrong column), swap it.
    """
    verified = mismatches = flipped = 0
    known = opening_hint      # last balance we trust
    drift = ZERO              # net movement of rows since then whose balance was unreadable
    for i, r in enumerate(rows):
        if r.get('needs_direction'):
            known, drift = r['balance'], ZERO
            continue
        if r['balance'] is None:
            # The balance cell was not read; carry this row's movement into the next check.
            r.setdefault('balance_ok', None)
            drift += r['deposit'] - r['withdrawal']
            continue
        if known is None:
            r.setdefault('balance_ok', None)
            known, drift = r['balance'], ZERO
            continue
        prev = known + drift
        expected = prev + r['deposit'] - r['withdrawal']
        ok = abs(expected - r['balance']) <= TOLERANCE
        if not ok and (r['deposit'] or r['withdrawal']):
            swapped = prev + r['withdrawal'] - r['deposit']
            if abs(swapped - r['balance']) <= TOLERANCE:
                r['deposit'], r['withdrawal'] = r['withdrawal'], r['deposit']
                ok = True
                flipped += 1
        known, drift = r['balance'], ZERO
        r['balance_ok'] = ok
        if ok:
            verified += 1
        else:
            mismatches += 1
    return verified, mismatches, flipped


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
