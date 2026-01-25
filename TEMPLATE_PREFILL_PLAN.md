# Template Placeholder Auto-Fill Plan

## Overview

This plan outlines how to automatically prefill template placeholders with actual employee data from the database, reducing manual entry and errors.

---

## 1. All Placeholders Identified

### A. Auto-Fillable from Database

| Placeholder | Source | Model/Field |
|-------------|--------|-------------|
| `{employee_name}` | Target employee's full name | `CustomUser.get_full_name()` |
| `{employee_id}` | Employee ID | `TeacherProfile.employee_id` |
| `{position}` / `{designation}` | Job title | `TeacherProfile.title` |
| `{joining_date}` / `{start_date}` | Date of joining | `TeacherProfile.date_of_joining` |
| `{salary}` | Monthly salary | `TeacherProfile.basic_salary` |
| `{company_name}` | Company name | Static: "Koder Kids" or "EARLY BIRD KODER KIDS PVT LTD" |
| `{sender_name}` | Admin's name | `request.user.get_full_name()` |
| `{sender_title}` | Admin's title | `request.user.teacher_profile.title` |

### B. User-Provided (Custom Fields)

| Placeholder | Description | When Needed |
|-------------|-------------|-------------|
| `{recipient}` | Letter addressed to | All letters with specific recipient |
| `{purpose}` | Purpose of certificate | Salary/Employment certificates |
| `{end_date}` | Date of leaving | Experience letters |
| `{department}` | Employee's department | Offer letters |
| `{issue}` | Warning subject | Warning letters |
| `{incident_date}` | Date of incident | Warning letters |
| `{incident_details}` | Incident description | Warning letters |
| `{termination_date}` | Effective termination date | Termination letters |
| `{reason}` | Reason for termination | Termination letters |
| `{last_day}` | Final working day | Termination letters |
| `{project_or_achievement}` | What to appreciate | Appreciation letters |
| `{duration}` | How long known | Recommendation letters |
| `{relationship}` | Recommender's relationship | Recommendation letters |
| `{skills}` | Skills to highlight | Recommendation letters |

---

## 2. Implementation Plan

### Phase 1: Backend - Template Processing Service

Create a utility function to process templates and replace placeholders:

```python
# backend/reports/utils.py

def get_employee_data(user):
    """Extract all available data from a user/employee."""
    data = {
        'employee_name': user.get_full_name() or user.username,
        'company_name': 'Koder Kids',
    }

    if hasattr(user, 'teacher_profile') and user.teacher_profile:
        profile = user.teacher_profile
        data.update({
            'employee_id': profile.employee_id or '',
            'position': profile.title or '',
            'designation': profile.title or '',
            'joining_date': profile.date_of_joining.strftime('%B %d, %Y') if profile.date_of_joining else '',
            'start_date': profile.date_of_joining.strftime('%B %d, %Y') if profile.date_of_joining else '',
            'salary': f"PKR {profile.basic_salary:,.2f}" if profile.basic_salary else '',
        })

    return data


def get_sender_data(admin_user):
    """Get data for the person creating/approving the report."""
    data = {
        'sender_name': admin_user.get_full_name() or admin_user.username,
        'sender_title': 'Administrator',
    }

    if hasattr(admin_user, 'teacher_profile') and admin_user.teacher_profile:
        data['sender_title'] = admin_user.teacher_profile.title or 'Administrator'

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
        Processed template with placeholders replaced
    """
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
```

### Phase 2: API Endpoint for Prefilled Template

Add endpoint to get prefilled template:

```python
# In ReportTemplateViewSet

@action(detail=True, methods=['get', 'post'])
def prefill(self, request, pk=None):
    """
    Get a template with placeholders pre-filled.

    GET: Returns template with current user's data (self-request)
    POST: Returns template with specified employee's data

    POST body: { "target_employee_id": 123 }
    """
    template = self.get_object()

    # Determine target employee
    if request.method == 'POST':
        target_id = request.data.get('target_employee_id')
        if target_id:
            target_employee = CustomUser.objects.filter(id=target_id).first()
        else:
            target_employee = request.user
    else:
        target_employee = request.user

    # Prefill the template
    prefilled_body = prefill_template(
        template.default_body,
        target_employee=target_employee,
        sender=request.user,
    )

    # Identify remaining placeholders that need user input
    import re
    remaining_placeholders = re.findall(r'\{([a-z_]+)\}', prefilled_body)

    return Response({
        'template_id': template.id,
        'template_name': template.name,
        'prefilled_subject': template.default_subject,
        'prefilled_body': prefilled_body,
        'remaining_placeholders': remaining_placeholders,
        'auto_filled': {
            'employee_name': target_employee.get_full_name() if target_employee else None,
            'employee_id': getattr(target_employee.teacher_profile, 'employee_id', None) if hasattr(target_employee, 'teacher_profile') else None,
        }
    })
```

### Phase 3: Frontend - Template Selection with Prefill

```javascript
// In RequestCertificateModal.js or similar

const handleTemplateSelect = async (template) => {
  try {
    // Get prefilled template
    const response = await reportRequestService.getPrefillTemplate(template.id, {
      target_employee_id: targetEmployee?.id // null for self
    });

    // Set the prefilled body
    setBodyText(response.prefilled_body);
    setSubject(response.prefilled_subject);

    // Show which fields still need input
    if (response.remaining_placeholders.length > 0) {
      setRequiredFields(response.remaining_placeholders);
      toast.info(`Please fill in: ${response.remaining_placeholders.join(', ')}`);
    }
  } catch (error) {
    // Fallback to raw template
    setBodyText(template.default_body);
  }
};
```

---

## 3. Logic by Role

### For Regular Users (Teachers, BDM)

| Scenario | Auto-Fill | Manual Entry |
|----------|-----------|--------------|
| Requesting for self | Own employee data | Purpose, recipient if needed |
| Template: Salary Certificate | name, id, position, salary, joining_date | purpose |
| Template: Employment Certificate | name, position, joining_date | - |
| Template: Experience Letter | Not allowed (admin only) | - |

**User Flow:**
1. Select template
2. System auto-fills with their data
3. User fills remaining fields (if any)
4. User reviews and submits
5. Admin approves/edits/rejects

### For Admins

| Scenario | Auto-Fill | Manual Entry |
|----------|-----------|--------------|
| Creating for any employee | Target employee's data | Custom fields based on template |
| Approving request | Employee data already in request | Can edit any field before approving |
| All templates accessible | sender_name, sender_title from admin | Varies by template |

**Admin Flow:**
1. Select template + target employee
2. System prefills with employee data
3. Admin fills remaining fields
4. Admin can edit any field
5. Generate PDF directly (no approval needed for admins)

---

## 4. Required Database/Model Fields

### Ensure TeacherProfile has all needed fields:

```python
# Already in employees/models.py - verify these exist:
class TeacherProfile(models.Model):
    employee_id = models.CharField(max_length=20)          # ✓ Exists
    title = models.CharField(max_length=100)               # ✓ Exists
    date_of_joining = models.DateField()                   # ✓ Exists
    basic_salary = models.DecimalField(...)                # ✓ Exists

    # Consider adding:
    department = models.CharField(max_length=100, blank=True, null=True)
```

---

## 5. Template-Specific Required Fields

| Template | Auto-Filled | Required from User |
|----------|-------------|-------------------|
| **Salary Certificate** | employee_name, employee_id, position, salary, joining_date, company_name, sender_name, sender_title | `purpose` |
| **Employment Certificate** | employee_name, position, joining_date, company_name, sender_name, sender_title | - |
| **Experience Letter** | employee_name, company_name, position, start_date, sender_name, sender_title | `end_date` |
| **Offer Letter** | company_name, sender_name, sender_title | `recipient`, `position`, `start_date`, `salary`, `department` |
| **Warning Letter** | sender_name, sender_title | `recipient`, `issue`, `incident_date`, `incident_details` |
| **Termination Letter** | company_name, sender_name, sender_title | `recipient`, `termination_date`, `reason`, `last_day` |
| **Appreciation Letter** | sender_name, sender_title | `recipient`, `project_or_achievement` |
| **Recommendation Letter** | sender_name, sender_title | `employee_name`, `purpose`, `duration`, `relationship`, `skills` |

---

## 6. Implementation Priority

### Phase 1 (High Priority - Self Service)
1. Create `prefill_template()` utility function
2. Add `/prefill/` endpoint to ReportTemplateViewSet
3. Update frontend to use prefilled templates for self-requests
4. Auto-fill: Salary Certificate, Employment Certificate

### Phase 2 (Medium Priority - Admin Features)
1. Add target employee selector for admins
2. Prefill when admin selects employee
3. Add custom_fields input for remaining placeholders

### Phase 3 (Enhancement)
1. Add `department` field to TeacherProfile
2. Create UI for dynamic custom field entry based on template
3. Validate that all placeholders are filled before submission

---

## 7. Example API Response

```json
{
  "template_id": "salary_certificate",
  "template_name": "Salary Certificate",
  "prefilled_subject": "Salary Certificate",
  "prefilled_body": "To Whom It May Concern,\n\nThis is to certify that Muhammad Ali (Employee ID: KK-T-025) is employed with Koder Kids as Senior Teacher.\n\n*Monthly Salary:* PKR 85,000.00\n*Employee ID:* KK-T-025\n*Date of Joining:* January 15, 2023\n\nThis certificate is issued upon request for {purpose}.\n\nSincerely,\nShah Gul\nDirector",
  "remaining_placeholders": ["purpose"],
  "auto_filled": {
    "employee_name": "Muhammad Ali",
    "employee_id": "KK-T-025",
    "position": "Senior Teacher",
    "salary": "PKR 85,000.00",
    "joining_date": "January 15, 2023",
    "company_name": "Koder Kids",
    "sender_name": "Shah Gul",
    "sender_title": "Director"
  }
}
```

---

## Summary

| Role | Can Request | Auto-Filled Data | Must Provide |
|------|-------------|------------------|--------------|
| **Teacher/BDM** | Self-certificates only | Own profile data | Purpose (if needed) |
| **Admin** | Any employee, any template | Selected employee's data | Template-specific fields |

This approach minimizes manual data entry, ensures accuracy, and provides clear guidance on what users need to fill in.
