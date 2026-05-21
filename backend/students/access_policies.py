from .subtypes import is_lms_enabled_subtype


def is_student_user(user):
    return bool(user and user.is_authenticated and user.role == 'Student')


def get_student_from_user(user):
    if not is_student_user(user):
        return None
    try:
        return user.student_profile
    except Exception:
        return None


def get_student_subtype(student):
    return getattr(student, 'student_subtype', None)


def is_student_lms_eligible(student):
    subtype = get_student_subtype(student)
    return is_lms_enabled_subtype(subtype)


def is_student_lms_enabled_user(user):
    student = get_student_from_user(user)
    if not student:
        return False
    return is_student_lms_eligible(student)
