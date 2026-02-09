"""
Check detailed status of the 54 orphan CustomUsers (role=Student, no Student row).
Read-only — no changes to the system.
"""
import os, sys, django
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'school_management.settings')
django.setup()

from students.models import Student, CustomUser
from django.utils import timezone

# IDs of orphan CustomUsers
orphan_ids = [
    627, 629, 630, 625, 626, 628, 421,  # test/junk/manual
    658, 18, 35, 25, 42, 48, 56, 75, 85, 87, 88, 90, 108, 111, 112, 114,
    151, 157, 159, 631, 489, 183, 314, 188, 484, 204, 234, 235, 245, 263,
    284, 287, 293, 500, 319, 332, 345, 357, 358, 624, 425, 420, 394, 395,
    494, 406, 423
]

orphans = CustomUser.objects.filter(id__in=orphan_ids).order_by('id')

# Categories
test_junk_ids = {624, 425, 420, 423, 625, 626}  # test, usman, yahya, zxc
duplicate_ids = {628, 629, 630}                   # M. Mustafa Bilal variants
manual_ids = {421, 627}                            # syedtaiq, yahya faisal gul
former_ids = set(orphan_ids) - test_junk_ids - duplicate_ids - manual_ids

def trunc(val, w):
    s = str(val) if val is not None else ''
    return s[:w].ljust(w)

SEP = '-'

print()
print('=' * 130)
print('  DETAILED STATUS OF 54 ORPHAN CustomUsers (role=Student, no Student row)')
print('=' * 130)

for category, ids, label in [
    ('TEST/JUNK', test_junk_ids, 'Test & Junk Accounts'),
    ('DUPLICATE', duplicate_ids, 'Duplicate Entries (M. Mustafa Bilal)'),
    ('MANUAL', manual_ids, 'Manual Signups'),
    ('FORMER', former_ids, 'Former Students'),
]:
    rows = orphans.filter(id__in=ids).order_by('username')
    print()
    print(f'  --- {label} ({len(rows)} rows) ---')
    hdr = f"  {'ID':<6} {'Username':<22} {'Name':<30} {'Email':<35} {'Active':<8} {'LastLogin':<22} {'Created':<22}"
    print(hdr)
    print('  ' + SEP * (len(hdr) - 2))
    for u in rows:
        full_name = f"{u.first_name} {u.last_name}".strip() or '(empty)'
        last_login = u.last_login.strftime('%Y-%m-%d %H:%M') if u.last_login else 'Never'
        created = u.created_at.strftime('%Y-%m-%d %H:%M') if u.created_at else '?'
        print(f"  {trunc(u.id,6)} {trunc(u.username,22)} {trunc(full_name,30)} {trunc(u.email,35)} {trunc(u.is_active,8)} {trunc(last_login,22)} {trunc(created,22)}")

# Summary
active_count = orphans.filter(is_active=True).count()
inactive_count = orphans.filter(is_active=False).count()
never_logged_in = orphans.filter(last_login__isnull=True).count()

print()
print('=' * 130)
print('  ORPHAN SUMMARY')
print('=' * 130)
print(f"  Total orphan CustomUsers       : {orphans.count()}")
print(f"  Currently is_active=True       : {active_count}")
print(f"  Currently is_active=False      : {inactive_count}")
print(f"  Never logged in (last_login=NULL): {never_logged_in}")
print()

# Check if any former student IDs have related data (e.g., attendance, fees)
from django.apps import apps
print('  --- Checking for related data on orphan users ---')
for model in apps.get_models():
    for field in model._meta.get_fields():
        if hasattr(field, 'related_model') and field.related_model == CustomUser:
            if hasattr(field, 'field'):  # reverse relation
                related_name = field.get_accessor_name()
                try:
                    count = model.objects.filter(**{field.field.name + '__in': orphan_ids}).count()
                    if count > 0:
                        print(f"  {model._meta.label:40s} via '{field.field.name}' => {count} related rows")
                except Exception:
                    pass

print()
print('Done.')
