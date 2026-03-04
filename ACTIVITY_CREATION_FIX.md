# Activity Creation Error Fix

## Problem Identified

**Error Message:** "Please fix the errors and try again" when creating a new activity in the CRM

## Root Cause

The backend validation was **missing critical field validations** for activity creation. The Activity model requires certain fields to be non-null, but the serializer didn't explicitly validate them before attempting to save to the database.

### Missing Validations:

1. **`scheduled_date`** - Required for scheduled activities (not logged)
   - Model: `DateTimeField` (no `null=True`)
   - Serializer: Marked as `required=False` but not validated
   - Issue: Frontend allows submitting scheduled activities without a date, causing database integrity error

2. **`activity_type`** - Always required
   - Model: `CharField` with choices
   - Serializer: Not explicitly validated

3. **`lead`** - Always required
   - Model: `ForeignKey` to Lead
   - Serializer: Not explicitly validated

4. **`subject`** - Always required
   - Model: `CharField`
   - Serializer: Not explicitly validated

## Solution Applied

**File Modified:** `backend/crm/serializers.py`

Updated the `ActivitySerializer.validate()` method to include comprehensive field validation:

```python
def validate(self, data):
    """Validate activity data and handle quick-log mode"""
    from django.utils import timezone
    from rest_framework import serializers as drf_serializers

    # Validate required fields
    if not data.get('activity_type'):
        raise drf_serializers.ValidationError({
            'activity_type': 'Activity type (Call or Meeting) is required'
        })
    
    if not data.get('lead'):
        raise drf_serializers.ValidationError({
            'lead': 'Lead must be selected'
        })
    
    if not data.get('subject'):
        raise drf_serializers.ValidationError({
            'subject': 'Subject is required'
        })

    is_logged = data.get('is_logged', False)
    status = data.get('status', self.instance.status if self.instance else 'Scheduled')
    completed_date = data.get('completed_date')

    # CRITICAL: For scheduled activities (not logged), scheduled_date is REQUIRED
    if not is_logged and not data.get('scheduled_date'):
        raise drf_serializers.ValidationError({
            'scheduled_date': 'Scheduled date and time is required for scheduled activities. For quick-logging completed activities, toggle "Log Completed Activity" mode.'
        })

    # Quick-log mode: auto-complete the activity
    if is_logged:
        data['status'] = 'Completed'
        data['completed_date'] = timezone.now()
        # If no scheduled_date provided for logged activity, use now
        if not data.get('scheduled_date'):
            data['scheduled_date'] = timezone.now()

    # If status is Completed, completed_date should be set
    if status == 'Completed' and not completed_date and not (self.instance and self.instance.completed_date):
        data['completed_date'] = timezone.now()

    return data
```

## Expected Behavior After Fix

### For Scheduled Activities (📅 Schedule Activity mode):
- All required fields must be filled:
  - Activity Type (Call/Meeting) ✓
  - Lead ✓
  - Subject ✓
  - Scheduled Date & Time ✓ **[NOW VALIDATED]**
  - Assign To BDM (Admin only) ✓
- If any field is missing, user sees a specific error message

### For Quick-Logged Activities (✓ Log Completed Activity mode):
- Only required fields must be filled:
  - Activity Type ✓
  - Lead ✓
  - Subject ✓
  - Scheduled Date & Time is auto-filled with current time
- Activity is immediately marked as Completed

## User Impact

Users will now see **specific, actionable error messages** instead of the generic "Please fix the errors and try again" message. For example:
- "Scheduled date and time is required for scheduled activities..."
- "Lead must be selected"
- "Subject is required"

## Testing Steps

1. Open the activity creation form
2. Try to create a scheduled activity without filling in all required fields
3. Should see specific validation error messages
4. Fill in all required fields
5. Activity should be created successfully

## Files Changed

- `backend/crm/serializers.py` - Enhanced `ActivitySerializer.validate()` method with comprehensive field validation
