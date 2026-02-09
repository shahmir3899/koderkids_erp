"""
Cleanup duplicate transactions created by bulk upload script.
Run from backend folder: python manage.py shell < cleanup_duplicates.py
"""
import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'school_management.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from finance.models import Transaction, Account

# Get Shah Mir account
shah_mir = Account.objects.get(id=2)
print(f"Account: {shah_mir.account_name}")
print(f"Current Balance BEFORE cleanup: {shah_mir.current_balance}")

# IDs to DELETE (duplicates - keeping the lower ID which was the original)
DUPLICATE_IDS_TO_DELETE = [
    # Triple duplicate: 35,000 smart school - keep 375, delete 383, 384
    383, 384,
    # Duplicate: 25,900 gen Nov Dec - keep 376, delete 385
    385,
    # Duplicate: 13,700 creative school - keep 381, delete 409
    409,
    # Duplicate: 42,000 49k Books - keep 378, delete 406
    406,
    # Duplicate: 7,000 49k Books - keep 379, delete 407
    407,
    # Duplicate: 8,500 creative fee - keep 380, delete 408
    408,
    # Duplicate: 20,000 generation fee - keep 377, delete 405
    405,
]

print(f"\nDuplicates to delete: {len(DUPLICATE_IDS_TO_DELETE)} transactions")
print("="*60)

# Show what will be deleted
total_amount = 0
for txn_id in DUPLICATE_IDS_TO_DELETE:
    try:
        txn = Transaction.objects.get(id=txn_id)
        total_amount += float(txn.amount)
        print(f"ID {txn_id}: {txn.date} | {txn.transaction_type:8} | {txn.amount:>12,} | {txn.notes[:30] if txn.notes else ''}")
    except Transaction.DoesNotExist:
        print(f"ID {txn_id}: NOT FOUND (already deleted?)")

print("="*60)
print(f"Total amount in duplicates: {total_amount:,.0f}")

# Confirm and delete
print("\nDeleting duplicates...")
deleted_count = 0
for txn_id in DUPLICATE_IDS_TO_DELETE:
    try:
        txn = Transaction.objects.get(id=txn_id)
        txn.delete()
        deleted_count += 1
        print(f"DELETED ID {txn_id}")
    except Transaction.DoesNotExist:
        print(f"SKIPPED ID {txn_id} (not found)")

print(f"\nDeleted {deleted_count} duplicate transactions")

# Refresh and show new balance
shah_mir.refresh_from_db()
print(f"\nFinal Balance AFTER cleanup: {shah_mir.current_balance}")
