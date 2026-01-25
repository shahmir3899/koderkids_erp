# ============================================
# TEMPLATE PREFILL UTILITIES
# Auto-fill template placeholders with employee data
# ============================================

import re
from datetime import date


def get_employee_data(user):
    """
    Extract all available data from a user/employee.

    Args:
        user: CustomUser instance

    Returns:
        dict of placeholder values
    """
    if not user:
        return {}

    data = {
        'employee_name': user.get_full_name() or user.username,
        'company_name': 'Koder Kids',
    }

    # Get profile data if available
    if hasattr(user, 'teacher_profile') and user.teacher_profile:
        profile = user.teacher_profile

        # Employee ID
        if profile.employee_id:
            data['employee_id'] = profile.employee_id

        # Position/Title/Designation
        if profile.title:
            data['position'] = profile.title
            data['designation'] = profile.title

        # Date of joining
        if profile.date_of_joining:
            formatted_date = profile.date_of_joining.strftime('%B %d, %Y')
            data['joining_date'] = formatted_date
            data['start_date'] = formatted_date
            data['date_of_joining'] = formatted_date

        # Salary
        if profile.basic_salary:
            data['salary'] = f"PKR {profile.basic_salary:,.2f}"

    return data


def get_sender_data(admin_user):
    """
    Get data for the person creating/approving the report.

    Args:
        admin_user: CustomUser instance (the admin)

    Returns:
        dict with sender_name and sender_title
    """
    if not admin_user:
        return {
            'sender_name': 'Administrator',
            'sender_title': 'Administrator',
        }

    data = {
        'sender_name': admin_user.get_full_name() or admin_user.username,
        'sender_title': 'Administrator',
    }

    # Get admin's title from profile
    if hasattr(admin_user, 'teacher_profile') and admin_user.teacher_profile:
        if admin_user.teacher_profile.title:
            data['sender_title'] = admin_user.teacher_profile.title

    return data


def prefill_template(template_body, target_employee=None, sender=None, custom_fields=None):
    """
    Replace placeholders in template with actual data.

    Args:
        template_body: The template text with {placeholders}
        target_employee: CustomUser instance (employee the report is about)
        sender: CustomUser instance (admin creating the report)
        custom_fields: dict of additional fields to replace

    Returns:
        str: Processed template with placeholders replaced
    """
    if not template_body:
        return ''

    replacements = {}

    # Add employee data if available
    if target_employee:
        replacements.update(get_employee_data(target_employee))

    # Add sender data if available
    if sender:
        replacements.update(get_sender_data(sender))

    # Add custom fields (these override auto-filled ones)
    if custom_fields:
        replacements.update(custom_fields)

    # Replace placeholders
    result = template_body
    for key, value in replacements.items():
        result = result.replace(f'{{{key}}}', str(value))

    return result


def get_remaining_placeholders(text):
    """
    Find placeholders that still need to be filled.

    Args:
        text: The template text with some {placeholders} still present

    Returns:
        list of placeholder names without braces
    """
    if not text:
        return []

    # Find all {placeholder} patterns
    pattern = r'\{([a-z_]+)\}'
    matches = re.findall(pattern, text)

    # Return unique placeholders in order of appearance
    seen = set()
    result = []
    for match in matches:
        if match not in seen:
            seen.add(match)
            result.append(match)

    return result


def get_template_required_fields(template_code):
    """
    Get list of fields that must be provided by user for each template.

    Args:
        template_code: The template identifier

    Returns:
        list of required field names
    """
    required_by_template = {
        'salary_certificate': ['purpose'],
        'employment_certificate': [],
        'experience_letter': ['end_date'],
        'offer_letter': ['recipient', 'position', 'start_date', 'salary', 'department'],
        'warning_letter': ['recipient', 'issue', 'incident_date', 'incident_details'],
        'termination_letter': ['recipient', 'termination_date', 'reason', 'last_day'],
        'appreciation_letter': ['recipient', 'project_or_achievement'],
        'recommendation_letter': ['employee_name', 'purpose', 'duration', 'relationship', 'skills'],
    }

    return required_by_template.get(template_code, [])
