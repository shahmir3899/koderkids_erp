from django.db import models


class StudentSubtype(models.TextChoices):
    ONSITE = 'ONSITE', 'Onsite Student'
    ONLINE = 'ONLINE', 'Online Student'
    HYBRID = 'HYBRID', 'Hybrid Student'


DEFAULT_STUDENT_SUBTYPE = StudentSubtype.ONSITE

# Single source of truth for subtype capabilities.
STUDENT_SUBTYPE_POLICY = {
    StudentSubtype.ONSITE: {
        'lms_enabled': True,
    },
    StudentSubtype.ONLINE: {
        'lms_enabled': True,
    },
    StudentSubtype.HYBRID: {
        'lms_enabled': True,
    },
}


def is_lms_enabled_subtype(subtype):
    return bool(STUDENT_SUBTYPE_POLICY.get(subtype, {}).get('lms_enabled', False))
