"""
Compare student data between students_student and students_customuser tables.
Read-only script — no changes to the system.
Output written to compare_students_output.txt
"""
import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'school_management.settings')
django.setup()

from students.models import Student, CustomUser

OUTPUT_FILE = os.path.join(os.path.dirname(__file__), 'compare_students_output.txt')

# ── Fetch data ──────────────────────────────────────────────────────────
students = list(
    Student.objects.select_related('school', 'user')
    .values_list('id', 'name', 'reg_num', 'status', 'school__name', 'user__id', 'user__username')
    .order_by('name')
)

custom_users = list(
    CustomUser.objects.filter(role='Student')
    .values_list('id', 'first_name', 'last_name', 'username', 'email', 'is_active')
    .order_by('first_name', 'last_name')
)

# ── Helper ──────────────────────────────────────────────────────────────
def trunc(val, width):
    s = str(val) if val is not None else ''
    return s[:width].ljust(width)

SEP = '-'

with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
    def out(text=''):
        f.write(text + '\n')
        print(text)

    # ── Table 1: students_student ───────────────────────────────────────
    out()
    out('=' * 110)
    out(f'  TABLE: students_student   (total rows: {len(students)})')
    out('=' * 110)

    hdr = f"{'ID':<6} {'Name':<30} {'Reg#':<16} {'Status':<12} {'School':<22} {'UserID':<8} {'Username':<16}"
    out(hdr)
    out(SEP * len(hdr))
    for sid, name, reg, status, school, uid, uname in students:
        out(f"{trunc(sid,6)} {trunc(name,30)} {trunc(reg,16)} {trunc(status,12)} {trunc(school,22)} {trunc(uid,8)} {trunc(uname,16)}")

    # ── Table 2: students_customuser (role=Student) ─────────────────────
    out()
    out('=' * 110)
    out(f'  TABLE: students_customuser  WHERE role=Student   (total rows: {len(custom_users)})')
    out('=' * 110)

    hdr2 = f"{'ID':<6} {'First Name':<20} {'Last Name':<20} {'Username':<20} {'Email':<30} {'Active':<8}"
    out(hdr2)
    out(SEP * len(hdr2))
    for uid, fname, lname, uname, email, active in custom_users:
        out(f"{trunc(uid,6)} {trunc(fname,20)} {trunc(lname,20)} {trunc(uname,20)} {trunc(email,30)} {trunc(active,8)}")

    # ── Comparison ──────────────────────────────────────────────────────
    student_user_ids = {uid for *_, uid, _ in students if uid is not None}
    customuser_ids   = {uid for uid, *_ in custom_users}

    linked_students     = student_user_ids & customuser_ids
    unlinked_students   = [s for s in students if s[5] is None]
    orphan_customusers  = customuser_ids - student_user_ids

    out()
    out('=' * 110)
    out('  COMPARISON SUMMARY')
    out('=' * 110)
    out(f"  Students (students_student)              : {len(students)}")
    out(f"  CustomUsers with role=Student             : {len(custom_users)}")
    out(f"  Students linked to a CustomUser           : {len(student_user_ids)}")
    out(f"  Students WITHOUT a linked CustomUser      : {len(unlinked_students)}")
    out(f"  CustomUsers(Student) WITHOUT a Student row: {len(orphan_customusers)}")
    out()

    # ── Detail: unlinked students ───────────────────────────────────────
    if unlinked_students:
        out(SEP * 85)
        out(f'  Students with NO linked CustomUser  ({len(unlinked_students)} rows)')
        out(SEP * 85)
        hdr3 = f"{'ID':<6} {'Name':<30} {'Reg#':<16} {'Status':<12} {'School':<22}"
        out(hdr3)
        out(SEP * len(hdr3))
        for sid, name, reg, status, school, uid, uname in unlinked_students:
            out(f"{trunc(sid,6)} {trunc(name,30)} {trunc(reg,16)} {trunc(status,12)} {trunc(school,22)}")

    # ── Detail: orphan custom users ─────────────────────────────────────
    if orphan_customusers:
        orphan_rows = [cu for cu in custom_users if cu[0] in orphan_customusers]
        out()
        out(SEP * 85)
        out(f'  CustomUsers(Student) with NO Student row  ({len(orphan_rows)} rows)')
        out(SEP * 85)
        hdr4 = f"{'ID':<6} {'First Name':<20} {'Last Name':<20} {'Username':<20} {'Email':<30}"
        out(hdr4)
        out(SEP * len(hdr4))
        for uid, fname, lname, uname, email, active in orphan_rows:
            out(f"{trunc(uid,6)} {trunc(fname,20)} {trunc(lname,20)} {trunc(uname,20)} {trunc(email,30)}")

    out()
    out('Done.')

print(f'\nFull output saved to: {OUTPUT_FILE}')
