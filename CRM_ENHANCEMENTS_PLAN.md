# CRM Enhancements Implementation Plan

## Overview
Implement three features:
1. **Duplicate Detection** - Warn when creating lead with existing phone number
2. **Lead Aging Alerts** - Management command to email BDMs about stale leads
3. **Activity Improvements** - Add outcome tracking and quick-log capability

---

## 1. Duplicate Detection (Phone-based)

### Backend Changes

**File: `backend/crm/serializers.py`**
- Add `check_duplicates()` method in `LeadSerializer.validate()`
- Check if phone number exists in another lead
- Return warning with duplicate lead info (not error - allow creation)

**File: `backend/crm/views.py`**
- Modify `LeadViewSet.perform_create()` to check duplicates before saving
- Return duplicate warning in response if found
- Add new endpoint `POST /api/crm/leads/check-duplicate/` for frontend pre-check

### Frontend Changes

**File: `frontend/src/components/crm/CreateLeadModal.js`**
- Add `duplicates` state and `showDuplicateWarning` state
- On phone blur or submit: call check-duplicate API
- Show warning banner with duplicate lead details
- Add "Create Anyway" confirmation flow

### API Response Format
```json
{
  "id": 123,
  "...lead_data...",
  "duplicate_warning": {
    "found": true,
    "leads": [
      {"id": 5, "school_name": "ABC School", "phone": "123456", "status": "Contacted"}
    ]
  }
}
```

---

## 2. Lead Aging Alerts

### New Files to Create

**File: `backend/crm/management/commands/send_aging_alerts.py`**
- Django management command to run via cron/scheduler
- Query leads where:
  - Status is 'New' or 'Contacted' (not Converted/Lost)
  - No activity in last X days (configurable, default 3 days)
  - Has assigned BDM
- Send email to BDM with aging lead details
- Support `--dry-run` flag for testing
- Support `--days` argument (default: 3)

**File: Add to `backend/crm/emails.py`**
- Add `send_aging_lead_alert_email(leads, bdm_user, days_threshold)`
- HTML email listing all aging leads for that BDM
- Include lead details, days since last contact, suggested actions

### Command Usage
```bash
# Preview what would be sent
python manage.py send_aging_alerts --dry-run

# Send alerts for leads with no activity in 5 days
python manage.py send_aging_alerts --days=5

# Production: Run daily via cron
0 9 * * * cd /path/to/project && python manage.py send_aging_alerts --days=3
```

### Aging Logic
```python
# Find aging leads
from django.db.models import Max
from datetime import timedelta

aging_threshold = timezone.now() - timedelta(days=days)

# Leads with no recent activity
aging_leads = Lead.objects.filter(
    status__in=['New', 'Contacted', 'Interested'],
    assigned_to__isnull=False,
).annotate(
    last_activity=Max('activities__scheduled_date')
).filter(
    Q(last_activity__lt=aging_threshold) | Q(last_activity__isnull=True),
    created_at__lt=aging_threshold
)
```

---

## 3. Activity Improvements

### Model Changes

**File: `backend/crm/models.py` - Activity model**

Add new fields:
```python
# Outcome/Result of the activity
outcome = models.CharField(
    max_length=30,
    choices=[
        ('Interested', 'Interested'),
        ('Not Interested', 'Not Interested'),
        ('Follow-up Required', 'Follow-up Required'),
        ('No Answer', 'No Answer'),
        ('Wrong Number', 'Wrong Number'),
        ('Callback Requested', 'Callback Requested'),
        ('Other', 'Other'),
    ],
    blank=True,
    null=True,
    help_text="Outcome of the activity"
)

# Duration for calls
duration_minutes = models.PositiveIntegerField(
    blank=True,
    null=True,
    help_text="Duration of call in minutes"
)

# Quick log mode (activity logged after it happened)
is_logged = models.BooleanField(
    default=False,
    help_text="True if this activity was logged after completion (not scheduled in advance)"
)
```

### Serializer Changes

**File: `backend/crm/serializers.py`**
- Add `outcome`, `duration_minutes`, `is_logged` to ActivitySerializer fields
- Update validation: if `is_logged=True`, auto-set status to 'Completed' and completed_date to now

### View Changes

**File: `backend/crm/views.py`**
- Modify `ActivityViewSet.perform_create()`:
  - If `is_logged=True`: don't send "scheduled" email, auto-complete
  - Update lead status based on outcome (if outcome is 'Not Interested' → suggest status change)

### Frontend Changes

**File: `frontend/src/components/crm/CreateActivityModal.js`**

Add:
- Toggle: "Log completed activity" vs "Schedule future activity"
- When logging: show outcome dropdown, duration field, hide scheduled_date (use now)
- When scheduling: keep current behavior

**New form fields:**
```javascript
const [formData, setFormData] = useState({
  activity_type: 'Call',
  lead: '',
  subject: '',
  description: '',
  assigned_to: '',
  scheduled_date: '',
  status: 'Scheduled',
  // NEW FIELDS
  is_logged: false,      // Toggle for quick-log mode
  outcome: '',           // Result of call/meeting
  duration_minutes: '',  // Call duration
});
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `backend/crm/models.py` | Add outcome, duration_minutes, is_logged to Activity |
| `backend/crm/serializers.py` | Add new Activity fields, add duplicate check in LeadSerializer |
| `backend/crm/views.py` | Add check-duplicate endpoint, modify activity creation logic |
| `backend/crm/emails.py` | Add send_aging_lead_alert_email() |
| `backend/crm/management/commands/send_aging_alerts.py` | NEW FILE - aging alert command |
| `frontend/src/components/crm/CreateLeadModal.js` | Add duplicate warning UI |
| `frontend/src/components/crm/CreateActivityModal.js` | Add quick-log toggle, outcome, duration |
| `frontend/src/api/services/crmService.js` | Add checkDuplicate() API call |

---

## Migration Required
```bash
python manage.py makemigrations crm
python manage.py migrate
```

---

## Verification Steps

1. **Duplicate Detection**
   - Create lead with phone "123456"
   - Try creating another lead with phone "123456"
   - Verify warning appears with existing lead info
   - Confirm "Create Anyway" works

2. **Lead Aging Alerts**
   - Create lead assigned to BDM, don't add any activity
   - Run: `python manage.py send_aging_alerts --dry-run --days=0`
   - Verify email preview shows the lead
   - Run without `--dry-run` and check BDM receives email

3. **Activity Improvements**
   - Open Create Activity modal
   - Toggle "Log completed activity"
   - Verify outcome dropdown appears
   - Verify scheduled_date becomes optional/hidden
   - Create activity and verify it's saved as Completed with outcome
