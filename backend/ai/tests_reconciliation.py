"""
Tests for the guided reconciliation flow. Run against a throwaway database only:
    python manage.py test ai.tests_reconciliation --settings=<settings with sqlite>
"""

from datetime import date
from decimal import Decimal

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase
from rest_framework.test import APIClient

from finance.models import Account, Transaction
from students.models import CustomUser

from .models import ReconciliationLine

D = Decimal

STATEMENT = (
    "Date,Description,Amount Received,Amount Deducted,Net Balance\n"
    "01/03/2025,Fee Ali,5000.00,,15000.00\n"
    "02/03/2025,Electricity,,2000.00,13000.00\n"
    "03/03/2025,Fee Sara,1000.00,,14000.00\n"
    "04/03/2025,Rent,,3000.00,11000.00\n"
    "05/03/2025,Sent to Cash Box,,500.00,10500.00\n"
    "06/03/2025,Fee Omar,700.00,,11200.00\n"
)


class ReconciliationFlowTests(TestCase):
    def setUp(self):
        self.admin = CustomUser.objects.create_user(username='boss', password='x', role='Admin')
        self.teacher = CustomUser.objects.create_user(username='teach', password='x', role='Teacher')
        self.bank = Account.objects.create(account_name='Bank Test', account_type='Bank', current_balance=D('10000'))
        self.cash = Account.objects.create(account_name='Cash Box', account_type='Cash', current_balance=D('0'))
        # Entries already in the system (these move the balance via Transaction.save()).
        Transaction.objects.create(date=date(2025, 3, 1), transaction_type='Income', amount=D('5000'),
                                   category='Fee', to_account=self.bank, notes='Fee Ali')
        Transaction.objects.create(date=date(2025, 3, 2), transaction_type='Expense', amount=D('2000'),
                                   category='Utilities', from_account=self.bank, notes='Electricity')
        Transaction.objects.create(date=date(2025, 3, 3), transaction_type='Income', amount=D('1000'),
                                   category='Fee', to_account=self.bank, notes='Fee Sara')
        self.bank.refresh_from_db()
        self.assertEqual(self.bank.current_balance, D('14000'))  # 10000 + 5000 - 2000 + 1000

        self.client = APIClient()
        self.client.force_authenticate(self.admin)

    def _start(self, content=STATEMENT):
        upload = SimpleUploadedFile('statement.csv', content.encode(), content_type='text/csv')
        return self.client.post('/api/ai/reconcile/start/', {'file': upload, 'account_id': self.bank.id},
                                format='multipart')

    def _line(self, data, desc):
        return next(l for l in data['lines'] if l['description'] == desc)

    def _act(self, session_id, line_id, action, body=None):
        return self.client.post(f'/api/ai/reconcile/{session_id}/lines/{line_id}/{action}/', body or {},
                                format='json')

    def test_admin_only(self):
        self.client.force_authenticate(self.teacher)
        self.assertEqual(self._start().status_code, 403)

    def test_start_finds_anchor_and_missing_lines(self):
        res = self._start()
        self.assertEqual(res.status_code, 201, res.data)
        data = res.data
        self.assertEqual(data['counts']['matched'], 3)
        self.assertEqual(data['counts']['pending'], 3)
        self.assertEqual(data['anchor_index'], 2)
        self.assertEqual(data['statement_closing'], 11200.0)
        pending = [l['description'] for l in data['lines'] if l['status'] == 'pending']
        self.assertEqual(pending, ['Rent', 'Sent to Cash Box', 'Fee Omar'])
        # Transfer is suggested because the description names another of our accounts.
        sug = self._line(data, 'Sent to Cash Box')['suggestion']
        self.assertEqual(sug['type'], 'Transfer')
        self.assertEqual(sug['counter_account_id'], self.cash.id)
        # Nothing was written by starting.
        self.assertEqual(Transaction.objects.count(), 3)

    def test_approve_creates_transactions_and_moves_balance_once(self):
        data = self._start().data
        sid = data['id']
        rent = self._line(data, 'Rent')
        res = self._act(sid, rent['id'], 'approve', {'category': 'Rent'})
        self.assertEqual(res.status_code, 200, res.data)
        self.bank.refresh_from_db()
        self.assertEqual(self.bank.current_balance, D('11000'))
        # Approving twice does not create a second transaction or move the balance again.
        self._act(sid, rent['id'], 'approve')
        self.bank.refresh_from_db()
        self.assertEqual(self.bank.current_balance, D('11000'))
        self.assertEqual(Transaction.objects.filter(category='Rent').count(), 1)

    def test_transfer_hits_both_accounts(self):
        data = self._start().data
        line = self._line(data, 'Sent to Cash Box')
        res = self._act(data['id'], line['id'], 'approve')
        self.assertEqual(res.status_code, 200, res.data)
        self.bank.refresh_from_db()
        self.cash.refresh_from_db()
        self.assertEqual(self.bank.current_balance, D('13500'))
        self.assertEqual(self.cash.current_balance, D('500'))
        t = Transaction.objects.get(transaction_type='Transfer')
        self.assertEqual((t.from_account_id, t.to_account_id), (self.bank.id, self.cash.id))

    def test_skip_and_balance_explanation(self):
        data = self._start().data
        sid = data['id']
        self._act(sid, self._line(data, 'Rent')['id'], 'approve')
        self._act(sid, self._line(data, 'Sent to Cash Box')['id'], 'approve')
        res = self._act(sid, self._line(data, 'Fee Omar')['id'], 'skip')
        bal = res.data['balance']
        self.assertFalse(bal['matches'])
        self.assertEqual(bal['difference'], 700.0)
        self.assertIn('skipped', bal['explanations'][0])
        # Reopen and approve: balance now matches.
        self._act(sid, self._line(data, 'Fee Omar')['id'], 'reopen')
        res = self._act(sid, self._line(data, 'Fee Omar')['id'], 'approve')
        self.assertTrue(res.data['balance']['matches'])
        self.assertEqual(res.data['counts']['pending'], 0)

    def test_adjustment_needs_review_done_and_exact_confirmation(self):
        data = self._start().data
        sid = data['id']
        # Pending lines remain: adjustment refused.
        res = self.client.post(f'/api/ai/reconcile/{sid}/adjust/', {'confirm': True, 'expected_difference': '0'},
                               format='json')
        self.assertEqual(res.status_code, 400)
        for desc in ('Rent', 'Sent to Cash Box', 'Fee Omar'):
            self._act(sid, self._line(data, desc)['id'], 'skip')
        state = self.client.get(f'/api/ai/reconcile/{sid}/').data
        diff = state['balance']['difference']
        self.assertEqual(diff, -2800.0)  # 11200 statement vs 14000 system
        self.assertTrue(state['balance']['needs_adjustment'])
        # Missing confirm flag, then a stale number, are both refused.
        self.assertEqual(self.client.post(f'/api/ai/reconcile/{sid}/adjust/', {'expected_difference': str(diff)},
                                          format='json').status_code, 400)
        self.assertEqual(self.client.post(f'/api/ai/reconcile/{sid}/adjust/',
                                          {'confirm': True, 'expected_difference': '5'}, format='json').status_code, 400)
        ok = self.client.post(f'/api/ai/reconcile/{sid}/adjust/', {'confirm': True, 'expected_difference': str(diff)},
                              format='json')
        self.assertEqual(ok.status_code, 200, ok.data)
        self.bank.refresh_from_db()
        self.assertEqual(self.bank.current_balance, D('11200'))
        self.assertTrue(ok.data['balance']['matches'])
        adj = Transaction.objects.get(category='Reconciliation Adjustment')
        self.assertEqual(adj.transaction_type, 'Expense')
        self.assertIn('RECONCILIATION ADJUSTMENT', adj.notes)
        # A second adjustment is refused.
        again = self.client.post(f'/api/ai/reconcile/{sid}/adjust/',
                                 {'confirm': True, 'expected_difference': '0'}, format='json')
        self.assertEqual(again.status_code, 400)

    def test_entries_after_statement_end_do_not_count_as_a_gap(self):
        data = self._start().data
        sid = data['id']
        for desc in ('Rent', 'Sent to Cash Box', 'Fee Omar'):
            self._act(sid, self._line(data, desc)['id'], 'approve')
        Transaction.objects.create(date=date(2025, 3, 20), transaction_type='Expense', amount=D('999'),
                                   category='Later', from_account=self.bank, notes='after statement')
        state = self.client.get(f'/api/ai/reconcile/{sid}/').data
        self.assertTrue(state['balance']['matches'], state['balance'])

    def test_complete_requires_all_reviewed(self):
        data = self._start().data
        sid = data['id']
        self.assertEqual(self.client.post(f'/api/ai/reconcile/{sid}/complete/').status_code, 400)
        for l in ReconciliationLine.objects.filter(session_id=sid, status='pending'):
            self._act(sid, l.id, 'skip')
        self.assertEqual(self.client.post(f'/api/ai/reconcile/{sid}/complete/').status_code, 200)
        # A completed session accepts no more changes.
        line = ReconciliationLine.objects.filter(session_id=sid, status='skipped').first()
        self.assertEqual(self._act(sid, line.id, 'reopen').status_code, 400)

    def test_resume_open_session(self):
        data = self._start().data
        res = self.client.get(f'/api/ai/reconcile/open/?account_id={self.bank.id}')
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['id'], data['id'])
