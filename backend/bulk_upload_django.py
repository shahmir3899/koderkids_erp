"""
Django-based bulk upload script.
Run from backend folder: python manage.py shell < bulk_upload_django.py
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'school_management.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from finance.models import Transaction, Account
from students.models import School
from datetime import datetime
from decimal import Decimal

# Get accounts and schools
shah_mir = Account.objects.get(id=2)
print(f"Account: {shah_mir.account_name}, Current Balance: {shah_mir.current_balance}")

# Schools
GENERATION_SCHOOL_ID = 1
CREATIVE_SCHOOL_ID = 2
SMART_SCHOOL_ID = 11

# Transactions to create (excluding duplicates and the test one we just created)
TRANSACTIONS = [
    # DEC 2025 - INCOMES
    ("2025-12-31", "Income", 35000, "School Invoice", None, SMART_SCHOOL_ID, "smart school soan garden fee"),
    ("2025-12-17", "Income", 25900, "School Invoice", None, GENERATION_SCHOOL_ID, "gen Nov and Dec fee"),

    # DEC 2025 - EXPENSES (excluding 400 already created as test)
    ("2025-12-20", "Expense", 500, "Other Expense", shah_mir.id, None, "bykea extension boards"),
    ("2025-12-15", "Expense", 300, "Other Expense", shah_mir.id, None, "bykea mouse to maaz"),
    ("2025-12-15", "Expense", 2000, "Other Expense", shah_mir.id, None, "extension board baqaya"),
    ("2025-12-13", "Expense", 5000, "Other Expense", shah_mir.id, None, "extension board"),
    ("2025-12-12", "Expense", 1000, "Other Expense", shah_mir.id, None, ""),
    ("2025-12-11", "Expense", 1000, "Salaries", shah_mir.id, None, "usman"),

    # JAN-FEB 2026 - EXPENSES
    ("2026-02-04", "Expense", 5000, "Salaries", shah_mir.id, None, "anees"),
    ("2026-02-01", "Expense", 25000, "Salaries", shah_mir.id, None, "Usman BDM salary"),
    ("2026-01-31", "Expense", 30000, "Books", shah_mir.id, None, "numan book 1 baqay 500copies"),
    ("2026-01-28", "Expense", 800, "Books", shah_mir.id, None, "delivery books book 1 494 copies"),
    ("2026-01-28", "Expense", 200, "Marketing", shah_mir.id, None, "bdm"),
    ("2026-01-27", "Expense", 800, "Marketing", shah_mir.id, None, ""),
    ("2026-01-24", "Expense", 1000, "Marketing", shah_mir.id, None, ""),
    ("2026-01-21", "Expense", 1200, "Marketing", shah_mir.id, None, "monitoring visit"),
    ("2026-01-19", "Expense", 1000, "Other Expense", shah_mir.id, None, "monitoring visit"),
    ("2026-01-13", "Expense", 29125, "Utilities", shah_mir.id, None, "Claude AI"),
    ("2026-01-10", "Expense", 7000, "Utilities", shah_mir.id, None, "calender"),
    ("2026-01-05", "Expense", 7324, "Other Expense", shah_mir.id, None, "render"),
    ("2026-01-05", "Expense", 1000, "Marketing", shah_mir.id, None, "phone package"),

    # JAN-FEB 2026 - INCOMES
    ("2026-01-28", "Income", 20000, "School Invoice", None, GENERATION_SCHOOL_ID, "generation fee"),
    ("2026-01-21", "Income", 42000, "Books", None, SMART_SCHOOL_ID, "49k Books"),
    ("2026-01-21", "Income", 7000, "Books", None, SMART_SCHOOL_ID, "49k Books"),
    ("2026-01-21", "Income", 8500, "School Invoice", None, CREATIVE_SCHOOL_ID, "creative fee"),
    ("2026-01-09", "Income", 13700, "School Invoice", None, CREATIVE_SCHOOL_ID, "the creative school"),
]

created = 0
errors = 0

for date_str, txn_type, amount, category, from_acc_id, school_id, notes in TRANSACTIONS:
    try:
        txn = Transaction(
            date=datetime.strptime(date_str, '%Y-%m-%d').date(),
            transaction_type=txn_type,
            amount=Decimal(str(amount)),
            category=category,
            from_account_id=from_acc_id if txn_type == 'Expense' else None,
            to_account_id=shah_mir.id if txn_type == 'Income' else None,
            school_id=school_id,
            notes=notes
        )
        txn.save()
        created += 1
        print(f"OK {date_str} | {txn_type:8} | {amount:>10,} | {category}")
    except Exception as e:
        errors += 1
        print(f"ERR {date_str} | {amount} | {e}")

print(f"\n{'='*50}")
print(f"Created: {created}, Errors: {errors}")

# Final balance
shah_mir.refresh_from_db()
print(f"Final Balance: {shah_mir.current_balance}")
