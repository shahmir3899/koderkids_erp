from datetime import date
from decimal import Decimal

from django.test import SimpleTestCase

from .statement_matcher import analyse, check_balance, match_rows

D = Decimal


def row(day, desc, dep=0, wd=0, bal=None, n=0):
    return {'date': date(2025, 3, day), 'description': desc, 'deposit': D(dep), 'withdrawal': D(wd),
            'balance': D(bal) if bal is not None else None, 'row_no': n}


def sysrow(i, day, amount, direction, notes='', category='Misc', typ=None):
    return {'id': i, 'date': date(2025, 3, day), 'amount': D(amount), 'direction': direction,
            'type': typ or ('Income' if direction == 'in' else 'Expense'), 'category': category,
            'notes': notes, 'counter_account_id': None, 'counter_account_name': None}


class MatcherTests(SimpleTestCase):
    def setUp(self):
        self.statement = [
            row(1, 'Fee Ali', dep=5000, bal=15000),
            row(2, 'Electricity bill', wd=2000, bal=13000),
            row(3, 'Fee Sara', dep=1000, bal=14000),
            row(4, 'Rent', wd=3000, bal=11000),       # not in system
            row(5, 'Fee Omar', dep=700, bal=11700),   # not in system
        ]
        self.system = [
            sysrow(1, 1, 5000, 'in', 'Fee Ali', 'Fee'),
            sysrow(2, 2, 2000, 'out', 'Electricity', 'Utilities'),
            sysrow(3, 3, 1000, 'in', 'Fee Sara', 'Fee'),
        ]

    def test_anchor_and_missing(self):
        out = analyse(self.statement, self.system)
        self.assertEqual(out['anchor_index'], 2)
        self.assertEqual(out['matched'], 3)
        self.assertEqual([e['description'] for e in out['new_entries']], ['Rent', 'Fee Omar'])
        self.assertEqual(out['earlier_unmatched'], [])

    def test_bank_posting_delay_still_matches(self):
        system = [sysrow(1, 1, 5000, 'in', 'Fee Ali'), sysrow(2, 1, 2000, 'out', 'Electricity'),
                  sysrow(3, 2, 1000, 'in', 'Fee Sara')]
        out = analyse(self.statement, system)
        self.assertEqual(out['matched'], 3)

    def test_same_day_same_amount_counts_twice(self):
        statement = [row(1, 'Fee A', dep=500), row(1, 'Fee B', dep=500), row(2, 'Fee C', dep=500)]
        system = [sysrow(1, 1, 500, 'in', 'Fee A'), sysrow(2, 2, 500, 'in', 'Fee C')]
        out = analyse(statement, system)
        # Only two of the three 500 receipts are in the system, so one is missing.
        self.assertEqual(out['matched'], 2)
        self.assertEqual(len(out['new_entries']) + len(out['earlier_unmatched']), 1)

    def test_direction_matters(self):
        statement = [row(1, 'x', wd=500)]
        system = [sysrow(1, 1, 500, 'in')]
        self.assertEqual(analyse(statement, system)['matched'], 0)

    def test_no_anchor_lists_everything(self):
        out = analyse(self.statement, [])
        self.assertIsNone(out['anchor_index'])
        self.assertEqual(len(out['new_entries']), 5)

    def test_gap_before_anchor_is_separate(self):
        system = [sysrow(1, 1, 5000, 'in', 'Fee Ali'),
                  sysrow(3, 3, 1000, 'in', 'Fee Sara'),
                  sysrow(4, 4, 3000, 'out', 'Rent'),
                  sysrow(5, 5, 700, 'in', 'Fee Omar')]
        out = analyse(self.statement, system)
        self.assertEqual(out['anchor_index'], 4)
        self.assertEqual(out['new_entries'], [])
        self.assertEqual([e['description'] for e in out['earlier_unmatched']], ['Electricity bill'])

    def test_suggestions(self):
        statement = [row(1, 'Fee Zara', dep=900), row(2, 'Fee Ali', dep=5000),
                     row(3, 'Sent to Shah Mir', wd=4000)]
        system = [sysrow(1, 2, 5000, 'in', 'Fee Ali'), sysrow(2, 1, 100, 'in', 'Fee Zaid', 'Fee')]
        accounts = [{'id': 1, 'name': 'Bank Islami'}, {'id': 2, 'name': 'Shah Mir'}]
        out = analyse(statement, system, accounts, this_account_id=1)
        by_desc = {e['description']: e for e in out['new_entries'] + out['earlier_unmatched']}
        self.assertEqual(by_desc['Fee Zara']['suggestion']['category'], 'Fee')
        self.assertEqual(by_desc['Sent to Shah Mir']['suggestion']['type'], 'Transfer')
        self.assertEqual(by_desc['Sent to Shah Mir']['suggestion']['counter_account_id'], 2)

    def test_balance_check(self):
        new = [row(4, 'Rent', wd=3000), row(5, 'Fee Omar', dep=700)]
        ok = check_balance(D('14000'), D('11700'), new, [])
        self.assertTrue(ok['matches'])
        skipped = check_balance(D('14000'), D('11700'), [new[0]], [new[1]])
        self.assertFalse(skipped['matches'])
        self.assertEqual(skipped['difference'], D('700'))
        self.assertIn('skipped', skipped['explanations'][0])
        unexplained = check_balance(D('14000'), D('9999'), new, [])
        self.assertFalse(unexplained['matches'])
