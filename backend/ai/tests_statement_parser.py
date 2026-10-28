from datetime import date
from decimal import Decimal

from django.test import SimpleTestCase

from .statement_parser import (
    parse_amount, parse_date, parse_table, parse_positioned_lines, rows_from_words,
    classify_header_cell,
)

D = Decimal


class ScalarParsingTests(SimpleTestCase):
    def test_amounts(self):
        self.assertEqual(parse_amount('1,234.50'), D('1234.50'))
        self.assertEqual(parse_amount('PKR 5,000'), D('5000'))
        self.assertEqual(parse_amount('Rs. 750.25'), D('750.25'))
        self.assertEqual(parse_amount('(1,000.00)'), D('-1000.00'))
        self.assertEqual(parse_amount('-500'), D('-500'))
        self.assertEqual(parse_amount('2,500.00 Dr'), D('-2500.00'))
        self.assertEqual(parse_amount('2,500.00 Cr'), D('2500.00'))
        self.assertEqual(parse_amount(1234.5), D('1234.5'))

    def test_not_amounts(self):
        for text in ['', '-', 'Salary Mar', '31-12-2025', '12/31/2025', None]:
            self.assertIsNone(parse_amount(text), text)

    def test_dates(self):
        self.assertEqual(parse_date('31/12/2025'), date(2025, 12, 31))
        self.assertEqual(parse_date('31-Dec-2025'), date(2025, 12, 31))
        self.assertEqual(parse_date('2025-12-31 00:00:00'), date(2025, 12, 31))
        self.assertEqual(parse_date('05 Jan 25'), date(2025, 1, 5))
        self.assertIsNone(parse_date('Opening Balance'))

    def test_header_synonyms(self):
        self.assertEqual(classify_header_cell('Amount Received'), 'deposit')
        self.assertEqual(classify_header_cell('Amount Deducted'), 'withdrawal')
        self.assertEqual(classify_header_cell('Net Balance'), 'balance')
        self.assertEqual(classify_header_cell('Narration'), 'description')
        self.assertEqual(classify_header_cell('Cr'), 'deposit')
        # 'description' must not be mistaken for a Cr/Dr column
        self.assertEqual(classify_header_cell('Description'), 'description')


class GridParsingTests(SimpleTestCase):
    def test_blank_columns_and_header(self):
        rows = [
            ['ABC Bank', '', '', '', ''],
            ['Date', 'Description', 'Amount Received', 'Amount Deducted', 'Net Balance'],
            ['01/03/2025', 'Fee Ali', '5,000.00', '', '105,000.00'],
            ['02/03/2025', 'Electricity', '', '2,500.50', '102,499.50'],
            ['03/03/2025', 'Fee Sara', '1,000', '', '103,499.50'],
        ]
        out = parse_table(rows)
        tx = out['transactions']
        self.assertEqual(len(tx), 3)
        self.assertEqual(tx[0]['deposit'], D('5000.00'))
        self.assertEqual(tx[1]['withdrawal'], D('2500.50'))
        self.assertEqual(out['opening_balance'], D('100000.00'))
        self.assertEqual(out['closing_balance'], D('103499.50'))
        self.assertEqual(out['mismatches'], 0)
        self.assertTrue(all(t['balance_ok'] in (True, None) for t in tx))

    def test_columns_in_different_order(self):
        rows = [
            ['Net Balance', 'Date', 'Credit', 'Particulars', 'Debit'],
            ['10,000', '01-Mar-2025', '10,000', 'Opening deposit', ''],
            ['9,000', '02-Mar-2025', '', 'Rent', '1,000'],
        ]
        tx = parse_table(rows)['transactions']
        self.assertEqual([t['deposit'] for t in tx], [D('10000'), D('0')])
        self.assertEqual([t['withdrawal'] for t in tx], [D('0'), D('1000')])

    def test_newest_first_is_reordered(self):
        rows = [
            ['Date', 'Description', 'Received', 'Deducted', 'Balance'],
            ['03/03/2025', 'C', '', '100', '800'],
            ['02/03/2025', 'B', '', '100', '900'],
            ['01/03/2025', 'A', '', '100', '1000'],
        ]
        out = parse_table(rows)
        self.assertEqual([t['description'] for t in out['transactions']], ['A', 'B', 'C'])
        self.assertEqual(out['mismatches'], 0)
        self.assertEqual(out['opening_balance'], D('1100'))

    def test_misread_number_is_flagged(self):
        rows = [
            ['Date', 'Description', 'Received', 'Deducted', 'Balance'],
            ['01/03/2025', 'A', '1,000', '', '11,000'],
            ['02/03/2025', 'B', '', '500', '10,000'],  # should be 10,500
        ]
        out = parse_table(rows)
        self.assertEqual(out['mismatches'], 1)
        self.assertFalse(out['transactions'][1]['balance_ok'])

    def test_no_header_direction_from_balance(self):
        rows = [
            ['01/03/2025', 'Opening', '', '10,000.00'],
            ['02/03/2025', 'Fee payment', '2,000.00', '12,000.00'],
            ['03/03/2025', 'Rent', '500.00', '11,500.00'],
        ]
        out = parse_table(rows)
        tx = out['transactions']
        self.assertEqual(len(tx), 3)
        self.assertEqual(tx[1]['deposit'], D('2000.00'))
        self.assertEqual(tx[2]['withdrawal'], D('500.00'))
        self.assertEqual(out['mismatches'], 0)

    def test_excel_native_types(self):
        rows = [
            ['Date', 'Description', 'Credit', 'Debit', 'Balance'],
            [date(2025, 3, 1), 'A', 1000.0, None, 6000.0],
            [date(2025, 3, 2), 'B', None, 250.5, 5749.5],
        ]
        out = parse_table(rows)
        self.assertEqual(out['transactions'][1]['withdrawal'], D('250.5'))
        self.assertEqual(out['mismatches'], 0)


def _words(line_top, items):
    """items: list of (text, x1_right_edge, width). Builds words right-aligned to x1."""
    return [{'text': t, 'x0': x1 - w, 'x1': x1, 'top': line_top} for t, x1, w in items]


class PositionedParsingTests(SimpleTestCase):
    def _statement(self):
        words = []
        # Header: columns far apart so cells split.
        words += _words(100, [('Date', 80, 30), ('Description', 220, 70),
                              ('Amount', 330, 40), ('Received', 380, 45),
                              ('Amount', 450, 40), ('Deducted', 500, 45),
                              ('Net', 560, 20), ('Balance', 610, 45)])
        words += _words(120, [('01/03/2025', 90, 60), ('Fee', 160, 20), ('Ali', 190, 20),
                              ('5,000.00', 380, 55), ('105,000.00', 610, 65)])
        words += _words(140, [('02/03/2025', 90, 60), ('Electricity', 200, 55),
                              ('bill', 225, 20), ('2,500.50', 500, 55), ('102,499.50', 610, 65)])
        words += _words(150, [('March', 200, 35)])  # wrapped description line
        return words

    def test_header_positions_resolve_blank_columns(self):
        lines = rows_from_words(self._statement())
        out = parse_positioned_lines(lines)
        tx = out['transactions']
        self.assertEqual(len(tx), 2)
        self.assertEqual(tx[0]['deposit'], D('5000.00'))
        self.assertEqual(tx[0]['withdrawal'], D('0'))
        self.assertEqual(tx[1]['withdrawal'], D('2500.50'))
        self.assertEqual(tx[1]['deposit'], D('0'))
        self.assertIn('March', tx[1]['description'])
        self.assertEqual(out['mismatches'], 0)
        self.assertEqual(out['opening_balance'], D('100000.00'))


class ScannedStatementTests(SimpleTestCase):
    """Shapes seen in photographed (OCR) statements."""

    def _cells(self, *items):
        return [{'text': t, 'x0': x - 60, 'x1': x} for t, x in items]

    def _page(self):
        header = [self._cells(('Date', 80), ('Description', 220), ('Withdrawal', 360)),
                  self._cells(('Deposit', 450), ('Balance', 560))]
        rows = [
            self._cells(('Opening Balance :', 100), ('PKR 100,000.00', 560)),
            # date glued to the description, one amount under Withdrawal
            self._cells(('01/03/2026Inward Clearing To 123', 220), ('5,000.00', 360), ('95,000.00', 560)),
            # wrapped description, then a row with no date of its own (deposit), thousands comma misread as dot
            self._cells(('CHQ00024269', 220)),
            self._cells(('From:SOMEONE', 220), ('10,000.00', 450), ('105.000.00', 560)),
            self._cells(('Printed By : X | Page 1 of 2', 400)),
            header[0], header[1],
            self._cells(('02/03/2026 Raast From 9', 220), ('2,500.00', 450), ('107,500.00', 560)),
            self._cells(('DEBIT TRANSACTIONS COUNT: 1', 300), ('TOTAL DEBIT AMOUNT', 450), ('5,000.00', 560)),
            self._cells(('AVAILABLE BALANCE AS ON 02-Mar-2026 :', 300), ('PKR 107,500.00', 560)),
        ]
        return header + rows

    def test_scanned_page(self):
        out = parse_positioned_lines(self._page())
        tx = out['transactions']
        self.assertEqual(len(tx), 3, tx)
        self.assertEqual(out['mismatches'], 0)
        self.assertEqual(out['opening_balance'], D('100000.00'))
        self.assertEqual(out['closing_balance'], D('107500.00'))
        self.assertEqual(tx[0]['withdrawal'], D('5000.00'))
        self.assertEqual(tx[1]['deposit'], D('10000.00'))        # no date of its own
        self.assertTrue(tx[1]['date_inferred'])
        self.assertEqual(tx[1]['date_range'], (date(2026, 3, 1), date(2026, 3, 2)))
        self.assertEqual(tx[1]['balance'], D('105000.00'))       # 105.000.00 repaired
        self.assertIn('CHQ00024269', tx[0]['description'])
        self.assertEqual(tx[2]['deposit'], D('2500.00'))         # the totals line is not a row

    def test_missing_balance_is_bridged(self):
        rows = [
            ['Date', 'Description', 'Received', 'Deducted', 'Balance'],
            ['01/03/2026', 'A', '', '1,000', '9,000'],
            ['02/03/2026', 'B (balance unreadable)', '', '500', ''],
            ['03/03/2026', 'C', '200', '', '8,700'],
        ]
        out = parse_table(rows)
        self.assertEqual(out['mismatches'], 0)

    def test_swapped_columns_are_repaired_from_balance(self):
        rows = [
            ['Date', 'Description', 'Received', 'Deducted', 'Balance'],
            ['01/03/2026', 'A', '', '1,000', '9,000'],
            ['02/03/2026', 'B', '', '500', '9,500'],   # actually received 500
        ]
        out = parse_table(rows)
        self.assertEqual(out['mismatches'], 0)
        self.assertEqual(out['transactions'][1]['deposit'], D('500'))

    def test_mixed_separator_amounts(self):
        self.assertEqual(parse_amount('266.390.00'), D('266390.00'))
        self.assertEqual(parse_amount('20.130.00'), D('20130.00'))
        self.assertEqual(parse_amount('1,234.50'), D('1234.50'))
