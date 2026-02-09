"""
Fix Bank Islami account balance.
The 25,000 deposit on 14-12-2025 (ID 357) was recorded but balance wasn't updated.

Run: python manage.py shell < fix_bank_islami_balance.py
"""
import os
import sys
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'school_management.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from finance.models import Account
from decimal import Decimal

# Get Bank Islami account
bank_islami = Account.objects.get(id=3)

print("="*50)
print("BANK ISLAMI BALANCE FIX")
print("="*50)
print(f"Account: {bank_islami.account_name} (ID: {bank_islami.id})")
print(f"Current Balance: {bank_islami.current_balance}")
print(f"Expected Balance (from PDF 18-Dec-2025): 165,290.00")
print()

# Calculate difference
current = float(bank_islami.current_balance)
expected = 165290.00
difference = expected - current

print(f"Difference: {difference:+,.2f}")
print()

if abs(difference) > 0:
    print("Updating balance...")
    bank_islami.current_balance = Decimal("165290.00")
    bank_islami.save()

    # Verify
    bank_islami.refresh_from_db()
    print(f"NEW Balance: {bank_islami.current_balance}")
    print()
    print("SUCCESS: Balance updated!")
else:
    print("Balance already correct. No update needed.")

print("="*50)
