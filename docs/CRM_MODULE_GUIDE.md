# CRM Module Guide

**Purpose:** Reference for the BDM/Lead-management CRM built into the ERP — models, endpoints, permissions, and how to debug it.

---

## What It Is

A lead-tracking and school-conversion CRM for Business Development Managers (BDMs), separate from the school-facing modules. BDMs manage leads through to conversion into an actual `School` record in the system.

## Backend

- **App:** `backend/crm/` (`models.py`, `serializers.py`, `views.py`, `urls.py`, `permissions.py`, `admin.py`)
- **Models:** `Lead`, `Activity`, `BDMTarget`
- **Role:** `BDM` role added to `CustomUser` (`backend/students/models.py`)

### API Endpoints

```
# Leads
GET    /api/crm/leads/                    List leads
POST   /api/crm/leads/                    Create lead
GET    /api/crm/leads/{id}/               Lead details
PUT    /api/crm/leads/{id}/               Update lead
DELETE /api/crm/leads/{id}/               Delete lead
POST   /api/crm/leads/{id}/convert/       Convert to school
PATCH  /api/crm/leads/{id}/assign/        Assign to BDM

# Dashboard
GET    /api/crm/dashboard/stats/          Overview stats
GET    /api/crm/dashboard/lead-sources/   Lead sources breakdown
GET    /api/crm/dashboard/conversion-rate/ Conversion metrics
GET    /api/crm/dashboard/upcoming/       Upcoming activities
GET    /api/crm/dashboard/targets/        Target progress

# Activities
GET    /api/crm/activities/               List activities
POST   /api/crm/activities/               Create activity
PATCH  /api/crm/activities/{id}/complete/ Mark completed
DELETE /api/crm/activities/{id}/          Delete activity

# Targets
GET    /api/crm/targets/                  List targets
POST   /api/crm/targets/                  Create target (Admin)
GET    /api/crm/targets/{id}/refresh/     Refresh actuals
```

### Permissions

| Feature | Admin | BDM | Teacher | Student |
|---------|-------|-----|---------|---------|
| View CRM Dashboard | ✅ | ✅ | ❌ | ❌ |
| View All Leads | ✅ | ✅ (own only) | ❌ | ❌ |
| Create/Edit/Delete Leads | ✅ | ✅ (own only) | ❌ | ❌ |
| Convert to School | ✅ | ✅ | ❌ | ❌ |
| View Activities | ✅ (all) | ✅ (own) | ❌ | ❌ |
| Create Targets | ✅ | ❌ | ❌ | ❌ |
| View Targets | ✅ (all) | ✅ (own) | ❌ | ❌ |

BDMs are scoped to their own leads/activities/targets; Admins see everything and manage targets.

### Lead Conversion

Converting a lead creates an actual `School` record: pre-fills school name/phone/email/address/city from the lead, supports Per-Student or Monthly-Subscription payment mode with fee configuration, marks the lead `Converted`, and auto-completes its scheduled activities.

## Frontend

```
frontend/src/
├── api/services/crmService.js       # All CRM API functions
├── utils/constants.js               # BDM role, LEAD_STATUS, LEAD_SOURCES, ACTIVITY_TYPES, TARGET_PERIODS
├── pages/crm/
│   ├── BDMDashboard.js              # Stats, charts (Recharts), upcoming activities, target progress
│   └── LeadsListPage.js             # Leads table with filters (status/source/search), CRUD
└── components/crm/
    ├── LeadStatusBadge.js
    ├── CreateLeadModal.js
    └── ConvertLeadModal.js
```

Routes: `/crm/dashboard`, `/crm/leads` (Admin + BDM only, gated via `ProtectedRoute`). Sidebar shows a "CRM" section only for those roles.

**Lead status colors:** New=blue, Contacted=yellow, Interested=green, Not Interested=gray, Converted=purple, Lost=red.

Only `BDMDashboard.js` and `LeadsListPage.js` were built as dedicated pages — lead detail, an activities calendar page, and a full targets page were scoped but intentionally skipped in favor of inline modals/dashboard sections (see "Not Implemented" below).

## Test Account

- **Username:** `bdm_test`
- **Password:** `Test@1234`

## Not Implemented (scoped but never built)

- `LeadDetailPage.js` (dedicated view/edit page — editing happens via modal in `LeadsListPage` instead)
- `ActivitiesPage.js` (calendar view — activities currently only surface in the dashboard's "upcoming" section)
- `TargetsPage.js` (full target management page — targets currently only surface in the dashboard)
- Duplicate lead detection (phone-based), lead-aging email alerts, CSV export, email integration, bulk actions

If any of these get picked up, check the backend `crm/views.py` and `crm/permissions.py` first — the endpoints above already exist for most of it (targets, activities) and just need frontend pages.

## Troubleshooting

- **"CRM menu not showing in sidebar":** confirm user role is `Admin` or `BDM` (stored in `localStorage`); clear cache and reload.
- **403 on CRM endpoints:** confirm the JWT belongs to an Admin/BDM user, not just any authenticated user.
- **Charts not rendering:** the dashboard sections lazy-load on expand — confirm the collapsible section was actually opened, then check the Network tab for the stats/dashboard calls.
