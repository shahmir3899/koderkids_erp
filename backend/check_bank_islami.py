"""
Check Bank Islami transactions against PDF statement.
Run: python manage.py shell < check_bank_islami.py
"""
import os
import sys
import django
from django.db.models import Q

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'school_management.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from finance.models import Transaction, Account

# Get Bank Islami account
bank_islami = Account.objects.get(id=3)
print(f"Account: {bank_islami.account_name} (ID: {bank_islami.id})")
print(f"Current Balance in DB: {bank_islami.current_balance}")
print(f"Expected Balance (PDF): 80,290.00")
print(f"Difference: {float(bank_islami.current_balance) - 80290}")
print()

# Get all transactions for Bank Islami (Nov-Dec 2025)
txns = Transaction.objects.filter(
    Q(from_account=bank_islami) | Q(to_account=bank_islami),
    date__gte='2025-11-01',
    date__lte='2025-12-31'
).order_by('-date', '-id')

print("Bank Islami Transactions (Nov-Dec 2025):")
print("="*90)
print(f"{'ID':>4} | {'Date':<12} | {'Type':<10} | {'Amount':>12} | {'Notes':<40}")
print("-"*90)

for t in txns:
    direction = ""
    if t.from_account == bank_islami:
        direction = "OUT"  # Withdrawal/Expense
    if t.to_account == bank_islami:
        direction = "IN"   # Deposit/Income
    notes = (t.notes or "")[:38]
    print(f"{t.id:>4} | {t.date} | {t.transaction_type:<6} {direction:<3} | {t.amount:>12} | {notes}")

print("="*90)
print(f"Total transactions found: {txns.count()}")
