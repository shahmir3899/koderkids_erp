"""
Script to add test leads and activities for CRM testing
"""
import os
import django
from datetime import datetime, timedelta

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'school_management.settings')
django.setup()

from crm.models import Lead, Activity
from students.models import CustomUser

# Get the BDM user
bdm_user = CustomUser.objects.filter(role='BDM').first()
if not bdm_user:
    print("[ERROR] No BDM user found. Please create a BDM user first.")
    exit(1)

print(f"[OK] Using BDM user: {bdm_user.username}")

# Create 2 new leads
leads_data = [
    {
        'school_name': 'Green Valley School',
        'phone': '+923001234567',
        'email': 'info@greenvalley.edu.pk',
        'contact_person': 'Ahmad Khan',
        'address': '45 Garden Road',
        'city': 'Islamabad',
        'lead_source': 'Referral',
        'status': 'New',
        'estimated_students': 300,
        'notes': 'Interested in ERP for managing 300+ students',
    },
    {
        'school_name': 'Bright Future Academy',
        'phone': '+923119876543',
        'email': 'contact@brightfuture.edu.pk',
        'contact_person': 'Fatima Ahmed',
        'address': '123 University Avenue',
        'city': 'Lahore',
        'lead_source': 'Website',
        'status': 'Contacted',
        'estimated_students': 500,
        'notes': 'Looking for comprehensive school management solution',
    },
]

created_leads = []
for lead_data in leads_data:
    lead = Lead.objects.create(
        **lead_data,
        assigned_to=bdm_user,
        created_by=bdm_user
    )
    created_leads.append(lead)
    print(f"[OK] Created lead: {lead.school_name} (ID: {lead.id})")

# Create 4 activities (2 for each lead)
activities_data = [
    # Activities for first lead
    {
        'lead': created_leads[0],
        'activity_type': 'Call',
        'subject': 'Initial Discovery Call',
        'description': 'Discuss school requirements and ERP features',
        'scheduled_date': datetime.now() + timedelta(days=1),
        'status': 'Scheduled',
        'assigned_to': bdm_user,
    },
    {
        'lead': created_leads[0],
        'activity_type': 'Meeting',
        'subject': 'Product Demo Meeting',
        'description': 'Demonstrate ERP features and answer questions',
        'scheduled_date': datetime.now() + timedelta(days=3),
        'status': 'Scheduled',
        'assigned_to': bdm_user,
    },
    # Activities for second lead
    {
        'lead': created_leads[1],
        'activity_type': 'Call',
        'subject': 'Follow-up Call',
        'description': 'Follow up on initial inquiry from website',
        'scheduled_date': datetime.now() + timedelta(hours=2),
        'status': 'Scheduled',
        'assigned_to': bdm_user,
    },
    {
        'lead': created_leads[1],
        'activity_type': 'Meeting',
        'subject': 'On-site Visit',
        'description': 'Visit school campus to understand their workflow',
        'scheduled_date': datetime.now() + timedelta(days=2),
        'status': 'Scheduled',
        'assigned_to': bdm_user,
    },
]

created_activities = []
for activity_data in activities_data:
    activity = Activity.objects.create(**activity_data)
    created_activities.append(activity)
    print(f"[OK] Created activity: {activity.subject} for {activity.lead.school_name}")

# Delete one activity
if created_activities:
    activity_to_delete = created_activities[0]
    activity_name = activity_to_delete.subject
    lead_name = activity_to_delete.lead.school_name
    activity_to_delete.delete()
    print(f"[DELETED] Activity: '{activity_name}' for {lead_name}")

print("\n" + "="*60)
print("SUMMARY")
print("="*60)
print(f"[OK] Created 2 new leads")
print(f"[OK] Created 4 activities (2 for each lead)")
print(f"[DELETED] Deleted 1 activity")
print(f"[INFO] Remaining: 3 activities for you to test deletion from frontend")
print("="*60)

# Show all leads
print("\nALL LEADS:")
for lead in Lead.objects.all():
    print(f"  - {lead.school_name} (Status: {lead.status})")

print("\nALL ACTIVITIES:")
for activity in Activity.objects.all():
    print(f"  - {activity.subject} for {activity.lead.school_name} ({activity.status})")
