"""
Cleanup orphan CustomUser accounts (role=Student, no Student row).
Deletes 10 accounts: 6 test/junk, 2 manual signups, 2 duplicate Mustafa Bilal.
"""
import os, sys, django
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'school_management.settings')
django.setup()

from students.models import CustomUser
from django.db import transaction

DELETE_IDS = {
    # Test & Junk
    624,  # test        (25-KK-TCS-027)
    425,  # test        (25-KK-TSSSG-001)
    420,  # test        (25-KK-TGPCS-031)
    423,  # zxc         (25-KK-T-016)
    625,  # usman
    626,  # yahya
    # Manual signups
    421,  # syedtaiq
    627,  # yahya faisal gul
    # Duplicate Mustafa Bilal (keeping 628)
    629,  # M.Mustafa Bilal
    630,  # M_Mustafa_Bilal
}

# ── Dry run: show what will be deleted ──────────────────────────────────
users = CustomUser.objects.filter(id__in=DELETE_IDS)
print()
print(f'Will delete {users.count()} CustomUser accounts:')
print(f"{'ID':<6} {'Username':<24} {'Email':<35} {'Role':<10}")
print('-' * 75)
for u in users.order_by('id'):
    print(f"{str(u.id):<6} {str(u.username):<24} {str(u.email or ''):<35} {u.role:<10}")

# Safety check
if users.count() != len(DELETE_IDS):
    print(f"\nERROR: Expected {len(DELETE_IDS)} users but found {users.count()}. Aborting.")
    sys.exit(1)

non_student = users.exclude(role='Student')
if non_student.exists():
    print(f"\nERROR: Found non-Student roles in the list: {[u.username for u in non_student]}. Aborting.")
    sys.exit(1)

# ── Confirm ─────────────────────────────────────────────────────────────
print()
answer = input('Type "yes" to proceed with deletion: ').strip().lower()
if answer != 'yes':
    print('Aborted.')
    sys.exit(0)

# ── Delete ──────────────────────────────────────────────────────────────
with transaction.atomic():
    count, details = users.delete()
    print(f'\nDeleted {count} object(s): {details}')

print('Done.')
