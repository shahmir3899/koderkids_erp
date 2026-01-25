# Self-Service Reports Module — Architecture & Implementation Plan

## Executive Summary

This document outlines the architecture and implementation plan for introducing a **Self-Service Reports Module** with an **approval workflow** to the existing School Management System. The design ensures that admin functionality remains unaffected while enabling employees, BDMs, and managers to request reports that require approval before generation.

### Key Self-Service Features
1. **Salary Slips** — Employees can view/download their own salary slips directly (no approval needed for own data). Only previous salary slips.
2. **Certificates & Letters** — Experience letters, salary certificates, etc. require admin approval


---

## Phase 1: Codebase Discovery — Analysis Results

### 1.1 Frontend Report System Overview

| Component | Location | Purpose |
|-----------|----------|---------|
| ReportsPage.js | [ReportsPage.js](frontend/src/pages/ReportsPage.js) | Monthly student progress reports (Admin/Teacher) |
| CustomReport.js | [CustomReport.js](frontend/src/pages/CustomReport.js) | Letter-style custom reports (Admin only) |
| SalarySlip.js | [SalarySlip.js](frontend/src/pages/SalarySlip.js) | Salary slip generation (Admin only → **Self-Service Candidate**) |
| useSalarySlip.js | [useSalarySlip.js](frontend/src/hooks/useSalarySlip.js) | Salary slip state & PDF generation hook |
| StudentReportModal.js | [StudentReportModal.js](frontend/src/components/StudentReportModal%20.js) | Individual student report modal |
| useReportGeneration.js | [useReportGeneration.js](frontend/src/hooks/useReportGeneration.js) | PDF generation hook |
| pdfGenerator.js | [pdfGenerator.js](frontend/src/utils/pdfGenerator.js) | PDF utility class (pdf-lib) |
| reportService.js | [reportService.js](frontend/src/services/reportService.js) | Custom report API service |

**Key Frontend Findings:**
- PDF generation uses both frontend (pdf-lib, html2canvas) and backend (WeasyPrint)
- Background images loaded from `/bg.png` and embedded in PDFs
- Template system with 9 pre-defined templates
- Role-based routing via `ProtectedRoute` component
- Authentication state stored in localStorage (`role`, `access`, `username`)

### 1.2 Backend Report System Overview

| Component | Location | Purpose |
|-----------|----------|---------|
| CustomReport model | [models.py:5-70](backend/reports/models.py#L5-L70) | Stores custom reports with templates |
| CustomReportViewSet | [views.py:936-1135](backend/reports/views.py#L936-L1135) | CRUD + templates endpoint |
| generate_pdf() | [views.py:554-620](backend/reports/views.py#L554-L620) | Single student PDF generation |
| generate_bulk_pdf_zip() | [views.py:251-316](backend/reports/views.py#L251-L316) | Bulk PDF ZIP generation |
| generate_pdf_content() | [views.py:623-933](backend/reports/views.py#L623-L933) | HTML-to-PDF via WeasyPrint |

**Key Backend Findings:**
- WeasyPrint used for HTML-to-PDF conversion
- Supabase for image storage with signed URLs
- CustomReport tracks `generated_by` and `generated_by_name` for audit
- Template types: offer_letter, experience_letter, warning_letter, etc.

### 1.3 Authentication & Authorization System

| Component | Location | Purpose |
|-----------|----------|---------|
| CustomUser | [students/models.py:92-156](backend/students/models.py#L92-L156) | User model with role field |
| TeacherProfile | [employees/models.py:15-138](backend/employees/models.py#L15-L138) | Employee profile with employee_id |
| IsAdminUser | [permissions.py:8-20](backend/authentication/permissions.py#L8-L20) | Admin-only permission |
| IsAdminOrSelf | [permissions.py:23-41](backend/authentication/permissions.py#L23-L41) | Admin or self permission |
| IsAdminOrOwner | [crm/permissions.py:33-59](backend/crm/permissions.py#L33-L59) | Object-level permission |
| ProtectedRoute | [ProtectedRoute.js](frontend/src/components/ProtectedRoute.js) | Frontend route protection |

**Roles Defined:**
- `Admin` — Full system access
- `Teacher` — Assigned schools access
- `Student` — Self-only access
- `BDM` — CRM module access

### 1.4 Existing Workflow Patterns

The system already implements status-based workflows:

| Feature | Statuses | Location |
|---------|----------|----------|
| Tasks | pending → in_progress → completed/overdue | [tasks/models.py:51-55](backend/tasks/models.py#L51-L55) |
| Leads | New → Contacted → Interested → Converted/Lost | [crm/models.py](backend/crm/models.py) |
| Fee Payments | Pending → Paid/Overdue | [students/models.py:221-226](backend/students/models.py#L221-L226) |

### 1.5 Reusability Assessment

#### ✅ Can Be Reused As-Is:
1. **PDF generation infrastructure** — WeasyPrint backend, pdf-lib frontend
2. **Template system** — 9 templates with default content
3. **Background image rendering** — `/bg.png` embedding logic
4. **Permission class patterns** — IsAdminUser, IsAdminOrOwner
5. **ProtectedRoute component** — Role-based routing
6. **reportService.js** — Extendable for new endpoints
7. **UserContext** — User profile loading

#### ⚠️ Tightly Coupled to Admin-Only Access:
1. **CustomReport.js page** — Currently Admin-only route (`allowedRoles={["Admin"]}`)
2. **CustomReportCreateSerializer** — Auto-sets `generated_by` without approval
3. **CustomReportViewSet** — No request/approval logic
4. **generate_pdf endpoint** — No pre-approval check

#### 🔧 Integration Points for Approval Logic:
1. New `ReportRequest` model with status workflow
2. New permission class: `IsRequestOwnerOrAdmin`
3. Extend `CustomReportViewSet` with request-based actions
4. New frontend pages: RequestReportPage, ApprovalQueuePage
5. Conditional PDF generation based on approval status

---

## Phase 1.5: Salary Slip Self-Service (Special Case)

### Current State
- **Route:** `/salary-slip` — Admin only ([App.js:153](frontend/src/App.js#L153))
- **Component:** [SalarySlip.js](frontend/src/pages/SalarySlip.js) — Full salary slip generation with earnings/deductions
- **Hook:** [useSalarySlip.js](frontend/src/hooks/useSalarySlip.js) — Fetches employee data, calculates salary, generates PDF
- **PDF Generation:** Client-side using [pdfGenerator.js](frontend/src/utils/pdfGenerator.js)

### Self-Service Strategy for Salary Slips

Salary slips are **different** from other reports because they contain the employee's **own financial data**. Two access modes are proposed:

#### Mode 1: Direct Self-Service (No Approval Required)
Only for Old Data or Previous Months
Employees can view and download their **own** salary slips directly.

| Feature | Description |
|---------|-------------|
| **Who** | Any authenticated employee (Teacher, BDM) |
| **What** | View/download their own salary slips for any month |
| **Why No Approval** | It's their own data; no sensitive third-party information |
| **Implementation** | Modify route to allow `["Admin", "Teacher", "BDM"]`, add backend filter for `user=self` |

#### Mode 2: Official Salary Certificate (Approval Required)
For bank loans, visa applications, etc., an **official** salary certificate requires admin approval.

| Feature | Description |
|---------|-------------|
| **Who** | Employee requests, Admin approves |
| **What** | Formal salary certificate with company letterhead |
| **Why Approval** | Official document for external use; admin verification required |
| **Implementation** | Uses the standard approval workflow with `salary_certificate` template |

### Salary Slip Permission Changes

```
CURRENT STATE:
┌─────────────────────────────────────────────────────────────┐
│  /salary-slip → Admin ONLY                                  │
│  Admin selects any employee → generates salary slip         │
└─────────────────────────────────────────────────────────────┘

PROPOSED STATE:
┌─────────────────────────────────────────────────────────────┐
│  /salary-slip → Admin, Teacher, BDM                         │
│                                                             │
│  IF Admin:                                                  │
│    └─ Can select any employee                               │
│    └─ Full access to all salary data                        │
│                                                             │
│  IF Teacher/BDM:                                            │
│    └─ Automatically locked to SELF only                     │
│    └─ Employee dropdown hidden or shows only self           │
│    └─ Can view/download own salary slips                    │
│    └─ Historical salary slip access for own records         │
└─────────────────────────────────────────────────────────────┘
```

### Backend Changes Required

| Change | Description |
|--------|-------------|
| **New Endpoint** | `GET /api/employees/my-salary-data/` — Returns logged-in user's salary info |
| **Permission** | `IsAuthenticated` + automatic filter to `request.user` |
| **Existing Endpoint** | `GET /api/employees/{id}/salary-data/` — Admin only (unchanged) |

### Frontend Changes Required

| Change | File | Description |
|--------|------|-------------|
| Update Route | [App.js:153](frontend/src/App.js#L153) | Change `allowedRoles={["Admin"]}` to `["Admin", "Teacher", "BDM"]` |
| Conditional UI | [SalarySlip.js](frontend/src/pages/SalarySlip.js) | Hide employee selector for non-admins; auto-load own data |
| Hook Update | [useSalarySlip.js](frontend/src/hooks/useSalarySlip.js) | Add role check; use `/my-salary-data/` for non-admins |

### Salary Slip vs Salary Certificate Comparison

| Aspect | Salary Slip (Self-Service) | Salary Certificate (Approval) |
|--------|---------------------------|------------------------------|
| **Access** | Direct (own data) | Approval workflow |
| **Content** | Monthly breakdown, earnings, deductions | Formal letter certifying employment & salary |
| **Use Case** | Personal records, tax filing | Bank loans, visa, rentals |
| **Template** | Standard slip format | Letter format with letterhead |
| **Approval** | ❌ Not required | ✅ Required |

---

## Phase 2: Roles, Permissions & Workflow

### 2.1 Role Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                          ADMIN                                  │
│  • Full access to all features                                  │
│  • Can approve/reject any request                               │
│  • Can generate reports directly (no approval needed)           │
│  • Can view all requests across the system                      │
└─────────────────────────────────────────────────────────────────┘
                              │
          ┌───────────────────┼───────────────────┐
          ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│    TEACHER      │  │      BDM        │  │    STUDENT      │
│ (Manager scope) │  │ (Manager scope) │  │  (Self only)    │
├─────────────────┤  ├─────────────────┤  ├─────────────────┤
│ • Request for   │  │ • Request for   │  │ • Request for   │
│   assigned      │  │   assigned      │  │   self only     │
│   schools'      │  │   leads/clients │  │ • Cannot view   │
│   employees     │  │ • Cannot        │  │   others'       │
│ • Cannot        │  │   approve       │  │   requests      │
│   approve       │  │                 │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

### 2.2 Permission Matrix

#### Self-Service Report Requests

| Action | Admin | Teacher | BDM | Student |
|--------|-------|---------|-----|---------|
| **Create Request (Self)** | N/A (direct) | ✅ | ✅ | ✅ |
| **Create Request (Others)** | N/A (direct) | ✅ (assigned) | ✅ (assigned) | ❌ |
| **View Own Requests** | ✅ | ✅ | ✅ | ✅ |
| **View All Requests** | ✅ | ❌ | ❌ | ❌ |
| **View Assigned Requests** | ✅ | ✅ | ✅ | ❌ |
| **Edit Draft Request** | ✅ | ✅ (own) | ✅ (own) | ✅ (own) |
| **Submit Request** | N/A | ✅ | ✅ | ✅ |
| **Cancel Request** | ✅ | ✅ (own) | ✅ (own) | ✅ (own) |
| **Approve Request** | ✅ | ❌ | ❌ | ❌ |
| **Reject Request** | ✅ | ❌ | ❌ | ❌ |
| **Generate Report (Direct)** | ✅ | ❌ | ❌ | ❌ |
| **Generate Report (Approved)** | ✅ | ❌ | ❌ | ❌ |
| **Download Report** | ✅ | ✅ (approved own) | ✅ (approved own) | ✅ (approved own) |
| **View Report Templates** | ✅ | ✅ | ✅ | ✅ (limited) |

#### Salary Slip Direct Access (No Approval Needed)

| Action | Admin | Teacher | BDM | Student |
|--------|-------|---------|-----|---------|
| **View Own Salary Slip** | ✅ | ✅ | ✅ | ❌ |
| **Download Own Salary Slip** | ✅ | ✅ | ✅ | ❌ |
| **View Any Employee's Salary** | ✅ | ❌ | ❌ | ❌ |
| **Generate Salary Slip (Any)** | ✅ | ❌ | ❌ | ❌ |
| **View Historical Slips (Own)** | ✅ | ✅ | ✅ | ❌ |
| **View Historical Slips (Any)** | ✅ | ❌ | ❌ | ❌ |

### 2.3 Scope Rules

**Teacher Scope:**
- Can request reports for employees in their `assigned_schools`
- Can request for themselves
- Cannot request for employees outside assigned schools

**BDM Scope:**
- Can request reports for themselves
- Can request salary certificates, experience letters for self
- Cannot request reports for other employees

**Student Scope:**
- Can ONLY request reports for themselves
- Limited to: Progress reports, enrollment certificates
- Cannot see or request reports for other students

---

## Phase 3: Request & Approval Lifecycle

### 3.1 State Machine Diagram

```
                                    ┌─────────────────┐
                                    │                 │
                           ┌────────│    ARCHIVED     │
                           │        │                 │
                           │        └─────────────────┘
                           │                 ▲
                           │                 │ (auto after 90 days
                           │                 │  or manual archive)
                           │                 │
┌─────────────┐      ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
│             │      │             │      │             │      │             │
│    DRAFT    │─────▶│  SUBMITTED  │─────▶│  APPROVED   │─────▶│  GENERATED  │
│             │      │             │      │             │      │             │
└─────────────┘      └─────────────┘      └─────────────┘      └─────────────┘
      │                    │                                          │
      │                    │                                          │
      │                    ▼                                          │
      │              ┌─────────────┐                                   │
      │              │             │                                   │
      └─────────────▶│  CANCELLED  │◀──────────────────────────────────┘
                     │             │    (if generation fails)
                     └─────────────┘
                           │
                           ▼
                     ┌─────────────┐
                     │             │
                     │  REJECTED   │
                     │             │
                     └─────────────┘
```

### 3.2 Status Definitions

| Status | Description | Allowed Transitions |
|--------|-------------|---------------------|
| **DRAFT** | Request created but not submitted. Content can be edited. | → SUBMITTED, → CANCELLED |
| **SUBMITTED** | Request submitted for approval. Content is frozen. | → APPROVED, → REJECTED, → CANCELLED |
| **APPROVED** | Admin approved the request. Ready for generation. | → GENERATED, → CANCELLED |
| **REJECTED** | Admin rejected the request with reason. Terminal state. | (none — must create new request) |
| **GENERATED** | Report PDF has been generated and is downloadable. | → ARCHIVED |
| **CANCELLED** | Request was cancelled by requester or system. Terminal state. | (none) |
| **ARCHIVED** | Report archived for long-term storage. Downloadable but not editable. | (none) |

### 3.3 Lifecycle Rules

| Rule | Description |
|------|-------------|
| **Content Immutability** | Once status = SUBMITTED, `content_snapshot` cannot be modified |
| **Single Approver** | Only one admin can approve a request (tracked via `approved_by`) |
| **Rejection Requires Reason** | Moving to REJECTED requires non-empty `rejection_reason` |
| **Auto-Archive** | GENERATED requests auto-archive after configurable period (default: 90 days) |
| **Generation Lock** | Report can only be generated if status = APPROVED |
| **Cancellation Window** | Can cancel from DRAFT, SUBMITTED, or APPROVED (before generation) |

### 3.4 Audit Trail Requirements

All state transitions must record:
- `transitioned_at` — Timestamp
- `transitioned_by` — User who triggered the transition
- `previous_status` — Status before transition
- `new_status` — Status after transition
- `notes` — Optional notes/reason

---

## Phase 4: Data Model Design

### 4.1 Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  ┌─────────────────┐         ┌─────────────────┐         ┌───────────────┐  │
│  │   CustomUser    │         │ ReportTemplate  │         │    School     │  │
│  │   (existing)    │         │     (NEW)       │         │  (existing)   │  │
│  ├─────────────────┤         ├─────────────────┤         └───────────────┘  │
│  │ id              │         │ id              │                            │
│  │ username        │         │ code            │                            │
│  │ role            │◀───┐    │ name            │                            │
│  │ assigned_schools│    │    │ description     │                            │
│  └─────────────────┘    │    │ category        │                            │
│          ▲    ▲         │    │ allowed_roles   │                            │
│          │    │         │    │ default_subject │                            │
│          │    │         │    │ default_body    │                            │
│          │    │         │    │ requires_target │                            │
│          │    │         │    │ background_img  │                            │
│          │    │         │    │ is_active       │                            │
│          │    │         │    └─────────────────┘                            │
│          │    │         │            ▲                                      │
│          │    │         │            │                                      │
│          │    │         │            │ template_id                          │
│          │    │         │            │                                      │
│          │    │    ┌────┴────────────┴─────────────────────┐                │
│          │    │    │           ReportRequest               │                │
│          │    │    │              (NEW)                    │                │
│          │    │    ├───────────────────────────────────────┤                │
│          │    │    │ id (UUID)                             │                │
│          │    │    │ request_number (auto: REQ-2024-0001)  │                │
│          │    └────│ requested_by (FK → CustomUser)        │                │
│          │         │ requested_at                          │                │
│          │         │ target_employee (FK → CustomUser,null)│                │
│          │         │ target_school (FK → School, nullable) │                │
│          │         │ template (FK → ReportTemplate)        │                │
│          │         │ subject                               │                │
│          │         │ content_snapshot (JSON, immutable)    │                │
│          │         │ line_spacing                          │                │
│          │         │ status                                │                │
│          │         │ approved_by (FK → CustomUser, null)   │────────────────┘
│          │         │ approved_at                           │
│          │         │ rejection_reason                      │
│          │         │ admin_notes                           │
│          │         │ priority (normal/high/urgent)         │
│          │         │ expires_at                            │
│          │         │ created_at                            │
│          │         │ updated_at                            │
│          │         └───────────────────────────────────────┘
│          │                        │
│          │                        │ 1:1 (after generation)
│          │                        ▼
│          │         ┌───────────────────────────────────────┐
│          │         │         GeneratedReport               │
│          │         │              (NEW)                    │
│          │         ├───────────────────────────────────────┤
│          │         │ id (UUID)                             │
│          │         │ request (OneToOne → ReportRequest)    │
│          └─────────│ generated_by (FK → CustomUser)        │
│                    │ generated_at                          │
│                    │ file_path (storage path)              │
│                    │ file_size                             │
│                    │ file_hash (SHA256 for integrity)      │
│                    │ download_count                        │
│                    │ last_downloaded_at                    │
│                    │ expires_at                            │
│                    └───────────────────────────────────────┘
│                                   │
│                                   │ 1:N
│                                   ▼
│                    ┌───────────────────────────────────────┐
│                    │       RequestStatusLog                │
│                    │           (NEW - Audit)               │
│                    ├───────────────────────────────────────┤
│                    │ id                                    │
│                    │ request (FK → ReportRequest)          │
│                    │ previous_status                       │
│                    │ new_status                            │
│                    │ changed_by (FK → CustomUser)          │
│                    │ changed_at                            │
│                    │ notes                                 │
│                    │ ip_address                            │
│                    └───────────────────────────────────────┘
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Model Definitions (Conceptual)

#### ReportTemplate Model
**Purpose:** Defines available report types and their constraints.

| Field | Type | Description |
|-------|------|-------------|
| `id` | AutoField | Primary key |
| `code` | CharField(50), unique | Machine-readable identifier (e.g., `salary_certificate`) |
| `name` | CharField(100) | Human-readable name (e.g., "Salary Certificate") |
| `description` | TextField | Template purpose and usage guidelines |
| `category` | CharField(50) | Grouping: `hr`, `academic`, `financial`, `custom` |
| `allowed_roles` | JSONField | List of roles that can request: `["Admin", "Teacher", "BDM"]` |
| `allowed_self_request` | BooleanField | Can users request this for themselves? |
| `allowed_other_request` | BooleanField | Can users request this for other employees? |
| `requires_target_employee` | BooleanField | Does this template need a target employee? |
| `requires_target_school` | BooleanField | Does this template need a target school? |
| `default_subject` | CharField(200) | Default subject line |
| `default_body` | TextField | Default body content with placeholders |
| `background_image` | URLField, nullable | Custom background image URL |
| `is_active` | BooleanField | Whether template is currently available |
| `created_at` | DateTimeField | Auto timestamp |
| `updated_at` | DateTimeField | Auto timestamp |

**Why this model exists:**
- Centralizes template configuration (currently hardcoded in views.py)
- Enables admin to manage templates without code changes
- Allows role-based template visibility
- Supports future template customization

**Initial Template Types (from existing system + new):**

| Code | Name | Category | Self-Request | Other-Request | Approval |
|------|------|----------|--------------|---------------|----------|
| `salary_certificate` | Salary Certificate | HR | ✅ | ✅ | ✅ Required |
| `experience_letter` | Experience Letter | HR | ✅ | ✅ | ✅ Required |
| `offer_letter` | Offer Letter | HR | ❌ | ✅ | ✅ Required |
| `warning_letter` | Warning Letter | HR | ❌ | ✅ | ✅ Required |
| `termination_letter` | Termination Letter | HR | ❌ | ✅ | ✅ Required |
| `appreciation_letter` | Appreciation Letter | HR | ❌ | ✅ | ✅ Required |
| `employment_certificate` | Employment Certificate | HR | ✅ | ✅ | ✅ Required |
| `recommendation_letter` | Recommendation Letter | HR | ✅ | ✅ | ✅ Required |
| `custom` | Custom Report | Other | ❌ | ✅ | ✅ Required |

**Note:** Salary Slip (monthly breakdown) is handled separately via direct self-service access, NOT through the approval workflow.

---

#### ReportRequest Model
**Purpose:** Stores report requests with their approval status and content snapshot.

| Field | Type | Description | Immutable After Submit? |
|-------|------|-------------|------------------------|
| `id` | UUIDField | Primary key | Yes |
| `request_number` | CharField(20) | Auto-generated: `REQ-YYYY-NNNN` | Yes |
| `requested_by` | ForeignKey(CustomUser) | User who created the request | Yes |
| `requested_at` | DateTimeField | When request was created | Yes |
| `target_employee` | ForeignKey(CustomUser), null | Employee the report is about (null = self) | Yes |
| `target_school` | ForeignKey(School), null | For school-specific reports | Yes |
| `template` | ForeignKey(ReportTemplate) | Selected report template | Yes |
| `subject` | CharField(200) | Report subject/title | Yes |
| `recipient_text` | TextField | Formatted recipient (To: field) | Yes |
| `body_text` | TextField | Editable body content (DRAFT only) | **Yes** |
| `content_snapshot` | JSONField | Frozen content after submission | Yes |
| `line_spacing` | CharField(10) | single, 1.5, double | Yes |
| `custom_fields` | JSONField | Template-specific custom data | Yes |
| `status` | CharField(20) | Current status (see lifecycle) | No |
| `priority` | CharField(10) | normal, high, urgent | No (admin) |
| `approved_by` | ForeignKey(CustomUser), null | Admin who approved | No |
| `approved_at` | DateTimeField, null | When approved | No |
| `rejection_reason` | TextField, null | Why request was rejected | No |
| `admin_notes` | TextField, null | Internal admin notes | No |
| `expires_at` | DateTimeField, null | When request expires | No |
| `created_at` | DateTimeField | Auto timestamp | Yes |
| `updated_at` | DateTimeField | Auto timestamp | No |

**Why each field is important:**

1. **`content_snapshot`**: Frozen JSON of all content at submission time. This ensures:
   - Admin approves exactly what they see
   - No post-approval modifications
   - Audit trail of exact approved content
   - Content format: `{ subject, recipient, body, line_spacing, template_code, custom_fields }`

2. **`request_number`**: Human-readable identifier for:
   - Communication between requester and admin
   - Printed on reports for traceability
   - Easy reference in UI

3. **`target_employee` vs `requested_by`**:
   - `requested_by`: Always the logged-in user who created request
   - `target_employee`: The employee the report is ABOUT
   - If null, report is for the requester themselves
   - Enables managers to request reports for their team

4. **`priority`**: Allows:
   - Urgent requests to surface in approval queue
   - Filtering and sorting for admins
   - SLA tracking (future enhancement)

---

#### GeneratedReport Model
**Purpose:** Stores generated PDF metadata and file reference.

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUIDField | Primary key |
| `request` | OneToOneField(ReportRequest) | Link to approved request |
| `generated_by` | ForeignKey(CustomUser) | Admin who generated the PDF |
| `generated_at` | DateTimeField | Generation timestamp |
| `file_path` | CharField(500) | Storage path (Supabase or local) |
| `file_name` | CharField(200) | Original filename |
| `file_size` | PositiveIntegerField | File size in bytes |
| `file_hash` | CharField(64) | SHA256 hash for integrity verification |
| `mime_type` | CharField(50) | Always `application/pdf` |
| `download_count` | PositiveIntegerField | Number of times downloaded |
| `last_downloaded_at` | DateTimeField, null | Last download timestamp |
| `last_downloaded_by` | ForeignKey(CustomUser), null | Who downloaded last |
| `expires_at` | DateTimeField, null | When file will be deleted |
| `is_deleted` | BooleanField | Soft delete flag |

**Why this model exists:**
- Separates request from generated artifact
- Enables download tracking and analytics
- Supports file expiration policies
- Allows re-generation from approved request if needed

---

#### RequestStatusLog Model
**Purpose:** Audit trail for all status transitions.

| Field | Type | Description |
|-------|------|-------------|
| `id` | AutoField | Primary key |
| `request` | ForeignKey(ReportRequest) | Related request |
| `previous_status` | CharField(20) | Status before transition |
| `new_status` | CharField(20) | Status after transition |
| `changed_by` | ForeignKey(CustomUser) | User who triggered change |
| `changed_at` | DateTimeField | Transition timestamp |
| `notes` | TextField, null | Optional notes (e.g., rejection reason) |
| `ip_address` | GenericIPAddressField | Client IP for security audit |

**Why this model exists:**
- Complete audit trail for compliance
- Enables investigation of disputes
- Tracks who did what and when
- Required for HR/legal documentation

---

## Phase 5: Backend API & Permission Design

### 5.1 API Endpoints Overview

#### Report Templates API

| Endpoint | Method | Permission | Description |
|----------|--------|------------|-------------|
| `/api/reports/templates/` | GET | IsAuthenticated | List available templates (filtered by role) |
| `/api/reports/templates/{code}/` | GET | IsAuthenticated | Get template details |
| `/api/reports/templates/` | POST | IsAdminUser | Create new template |
| `/api/reports/templates/{code}/` | PUT | IsAdminUser | Update template |
| `/api/reports/templates/{code}/` | DELETE | IsAdminUser | Deactivate template |

#### Report Requests API

| Endpoint | Method | Permission | Description |
|----------|--------|------------|-------------|
| `/api/reports/requests/` | GET | IsAuthenticated | List requests (filtered by ownership/role) |
| `/api/reports/requests/` | POST | IsAuthenticated | Create new request (DRAFT) |
| `/api/reports/requests/{id}/` | GET | IsRequestOwnerOrAdmin | Get request details |
| `/api/reports/requests/{id}/` | PUT | IsRequestOwnerAndDraft | Update draft request |
| `/api/reports/requests/{id}/` | DELETE | IsRequestOwnerOrAdmin | Cancel/delete request |
| `/api/reports/requests/{id}/submit/` | POST | IsRequestOwnerAndDraft | Submit for approval |
| `/api/reports/requests/{id}/cancel/` | POST | IsRequestOwnerOrAdmin | Cancel request |
| `/api/reports/requests/{id}/approve/` | POST | IsAdminUser | Approve request |
| `/api/reports/requests/{id}/reject/` | POST | IsAdminUser | Reject request with reason |
| `/api/reports/requests/{id}/generate/` | POST | IsAdminUser | Generate PDF for approved request |
| `/api/reports/requests/{id}/download/` | GET | IsRequestOwnerOrAdmin | Download generated PDF |
| `/api/reports/requests/pending/` | GET | IsAdminUser | List pending approvals |
| `/api/reports/requests/stats/` | GET | IsAdminUser | Request statistics |

### 5.2 Permission Class Definitions

```
┌─────────────────────────────────────────────────────────────────┐
│                    Permission Classes                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  IsRequestOwnerOrAdmin                                           │
│  ────────────────────                                            │
│  • Admin: Always has access                                      │
│  • Others: Only if request.requested_by == user                  │
│                                                                  │
│  IsRequestOwnerAndDraft                                          │
│  ─────────────────────                                           │
│  • Must be request owner                                         │
│  • Request status must be DRAFT                                  │
│                                                                  │
│  CanRequestForEmployee                                           │
│  ─────────────────────                                           │
│  • Admin: Can request for any employee                           │
│  • Teacher: Can request for employees in assigned schools        │
│  • BDM: Can only request for self                                │
│  • Student: Can only request for self                            │
│                                                                  │
│  CanUseTemplate                                                  │
│  ─────────────────                                               │
│  • User role must be in template.allowed_roles                   │
│  • If requesting for self: template.allowed_self_request = true  │
│  • If requesting for other: template.allowed_other_request = true│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 Endpoint Details

#### POST `/api/reports/requests/` — Create Request

**Request Body:**
```json
{
  "template_code": "salary_certificate",
  "target_employee_id": 123,  // null for self
  "target_school_id": 5,      // null if not required
  "subject": "Salary Certificate - January 2024",
  "recipient_text": "To Whom It May Concern",
  "body_text": "This is to certify that...",
  "line_spacing": "1.5",
  "custom_fields": {
    "salary_month": "January 2024",
    "include_breakdown": true
  }
}
```

**Validation Rules:**
1. Template must exist and be active
2. User role must be in `template.allowed_roles`
3. If `target_employee_id` is set:
   - User must have permission to request for that employee
   - Template must have `allowed_other_request = true`
4. If `target_employee_id` is null:
   - Template must have `allowed_self_request = true`
5. If template requires school, `target_school_id` must be provided
6. Subject and body_text are required

**Response:** 201 Created with request object

---

#### POST `/api/reports/requests/{id}/submit/` — Submit for Approval

**Pre-conditions:**
- Request status must be DRAFT
- User must be request owner

**Actions:**
1. Validate all required fields are filled
2. Freeze content into `content_snapshot`:
   ```json
   {
     "subject": "...",
     "recipient_text": "...",
     "body_text": "...",
     "line_spacing": "...",
     "template_code": "...",
     "template_name": "...",
     "target_employee": { "id": 123, "name": "John Doe", "employee_id": "KK-T-025" },
     "custom_fields": {...},
     "submitted_at": "2024-01-15T10:30:00Z"
   }
   ```
3. Update status to SUBMITTED
4. Create status log entry
5. Send notification to admins (optional)

**Response:** 200 OK with updated request

---

#### POST `/api/reports/requests/{id}/approve/` — Approve Request

**Permission:** Admin only

**Pre-conditions:**
- Request status must be SUBMITTED

**Request Body (optional):**
```json
{
  "admin_notes": "Verified employee details",
  "priority": "high"
}
```

**Actions:**
1. Set status to APPROVED
2. Set `approved_by` to current admin
3. Set `approved_at` to current timestamp
4. Create status log entry
5. Send notification to requester (optional)

**Response:** 200 OK with updated request

---

#### POST `/api/reports/requests/{id}/reject/` — Reject Request

**Permission:** Admin only

**Pre-conditions:**
- Request status must be SUBMITTED

**Request Body:**
```json
{
  "rejection_reason": "Employee name spelling is incorrect. Please submit a new request with corrected name.",
  "admin_notes": "Checked against HR records"
}
```

**Validation:**
- `rejection_reason` is required and must be non-empty

**Actions:**
1. Set status to REJECTED
2. Set `rejection_reason`
3. Create status log entry
4. Send notification to requester with reason

**Response:** 200 OK with updated request

---

#### POST `/api/reports/requests/{id}/generate/` — Generate Report

**Permission:** Admin only

**Pre-conditions:**
- Request status must be APPROVED

**Actions:**
1. Load `content_snapshot` from request
2. Load template configuration
3. Fetch target employee details (if applicable)
4. Generate PDF using existing `generate_pdf_content()` logic
5. Upload to storage (Supabase or local)
6. Calculate file hash
7. Create `GeneratedReport` record
8. Update request status to GENERATED
9. Create status log entry

**Response:** 200 OK with generated report metadata including download URL

---

#### GET `/api/reports/requests/{id}/download/` — Download Report

**Permission:** Request owner or Admin

**Pre-conditions:**
- Request status must be GENERATED
- GeneratedReport must exist

**Actions:**
1. Verify permissions
2. Fetch file from storage
3. Increment download_count
4. Update last_downloaded_at and last_downloaded_by
5. Return file with proper headers

**Response:** File download (application/pdf)

---

### 5.4 Security Considerations

| Risk | Mitigation |
|------|------------|
| **Unauthorized request for others** | CanRequestForEmployee permission checks assigned_schools |
| **Content tampering after submit** | content_snapshot is immutable; body_text updates ignored after SUBMITTED |
| **Admin impersonation** | Only users with role='Admin' can approve/reject/generate |
| **Download unauthorized reports** | IsRequestOwnerOrAdmin checks ownership before download |
| **Information disclosure** | List endpoints filter by ownership unless Admin |
| **Rate limiting** | Implement request rate limits (e.g., 10 requests/day per user) |
| **Large file attacks** | Limit body_text length, image count, custom_fields size |
| **IDOR attacks** | Use UUIDs for request IDs; always verify ownership |

---

## Phase 6: Frontend UX Flow

### 6.1 User Journey Maps

#### 6.1.1 Employee/BDM Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        EMPLOYEE/BDM JOURNEY                                  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  1. ENTRY POINT                                                             │
│  ─────────────                                                              │
│  • Sidebar menu: "Self Services" button                                    │
│  • Dashboard widget: "My Report Requests" card                              │
│  • Profile page: "Request Certificate" button                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  2. TEMPLATE SELECTION                                                      │
│  ─────────────────────                                                      │
│  • Grid of available templates (filtered by user role)                      │
│  • Each card shows: icon, name, description, "Select" button                │
│  • Categories: HR Documents, Academic, Financial                            │
│  • Search/filter bar                                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  3. REQUEST FORM                                                            │
│  ──────────────                                                             │
│  • Target selection: "For myself" or "For another employee" (if allowed)    │
│  • If other: Employee dropdown (filtered by permissions)                    │
│  • Subject field (pre-filled from template)                                 │
│  • Recipient field (auto-filled based on target)                            │
│  • Body editor with formatting toolbar                                      │
│  • Template placeholders highlighted for editing                            │
│  • Preview pane (optional)                                                  │
│  • Actions: "Save Draft" | "Submit for Approval"                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                      ┌─────────────┴─────────────┐
                      ▼                           ▼
            ┌─────────────────┐         ┌─────────────────┐
            │   SAVE DRAFT    │         │     SUBMIT      │
            │   ───────────   │         │   ───────────   │
            │ • Toast: Saved  │         │ • Confirm modal │
            │ • Stay on form  │         │ • Content freeze│
            │ • Can edit later│         │ • Toast: Sent   │
            └─────────────────┘         └─────────────────┘
                                                  │
                                                  ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  4. MY REQUESTS PAGE                                                        │
│  ──────────────────                                                         │
│  • Table/list of all user's requests                                        │
│  • Columns: Request #, Type, Target, Status, Submitted, Actions             │
│  • Status badges with colors:                                               │
│    ○ DRAFT (gray)                                                           │
│    ○ SUBMITTED (blue, pulsing)                                              │
│    ○ APPROVED (green)                                                       │
│    ○ REJECTED (red)                                                         │
│    ○ GENERATED (teal, with download icon)                                   │
│  • Actions per status:                                                      │
│    ○ DRAFT: Edit, Submit, Delete                                            │
│    ○ SUBMITTED: View, Cancel                                                │
│    ○ APPROVED: View (waiting for generation)                                │
│    ○ REJECTED: View (see reason), New Request                               │
│    ○ GENERATED: View, Download                                              │
│  • Filter by status, date range                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  5. REQUEST DETAIL PAGE                                                     │
│  ─────────────────────                                                      │
│  • Full request content (read-only after submit)                            │
│  • Status timeline showing all transitions                                  │
│  • If REJECTED: rejection reason prominently displayed                      │
│  • If GENERATED: Download button (prominent)                                │
│  • Activity log: who did what when                                          │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  6. MY SALARY SLIPS (Direct Self-Service — No Approval)                     │
│  ──────────────────────────────────────────────────────                     │
│  • Entry: Sidebar → "My Salary Slips" (for Teacher/BDM only)                │
│  • Auto-loads current user's salary data                                    │
│  • Month selector to view different periods                                 │
│  • Earnings breakdown (basic salary + bonuses)                              │
│  • Deductions breakdown (advances, loans)                                   │
│  • Net salary calculation                                                   │
│  • "Download PDF" button (immediate, no approval)                           │
│  • Historical slips accessible via month dropdown                           │
│  • Note: This is SEPARATE from approval workflow                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 6.1.2 Admin Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           ADMIN JOURNEY                                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  1. APPROVAL QUEUE (Dashboard Widget + Dedicated Page)                      │
│  ─────────────────────────────────────────────────────                      │
│  • Badge count on sidebar: "Pending Approvals (5)"                          │
│  • Dashboard card: "5 reports awaiting approval"                            │
│  • Table with columns:                                                      │
│    Request # | Requested By | Type | Target | Submitted | Priority | Action │
│  • Sort by: submitted date, priority                                        │
│  • Filter by: template type, requester, date range                          │
│  • Bulk actions: Approve selected (with confirmation)                       │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  2. REQUEST REVIEW PAGE                                                     │
│  ─────────────────────                                                      │
│  • Split view: Request details | PDF Preview                                │
│  • Request info card:                                                       │
│    ○ Requester name, role, employee ID                                      │
│    ○ Target employee (if different)                                         │
│    ○ Template used                                                          │
│    ○ Submitted timestamp                                                    │
│  • Content preview (exactly as will be generated)                           │
│  • Background image toggle for preview                                      │
│  • Action buttons:                                                          │
│    ○ [Approve] - Green, primary                                             │
│    ○ [Reject] - Red, secondary                                              │
│    ○ [Request Changes] - Orange (optional future)                           │
│  • Admin notes field (internal only)                                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                      ┌─────────────┴─────────────┐
                      ▼                           ▼
            ┌─────────────────┐         ┌─────────────────┐
            │    APPROVE      │         │     REJECT      │
            │   ───────────   │         │   ───────────   │
            │ • Confirm modal │         │ • Reason modal  │
            │ • Toast: Done   │         │   (required)    │
            │ • Move to gen.  │         │ • Toast: Sent   │
            └─────────────────┘         └─────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  3. GENERATE REPORT (Post-Approval)                                         │
│  ──────────────────────────────────                                         │
│  • "Approved Requests" tab/section                                          │
│  • [Generate PDF] button per request                                        │
│  • Or: Auto-generate on approval (configurable)                             │
│  • Progress indicator during generation                                     │
│  • Toast: "Report generated successfully"                                   │
│  • Download button immediately available                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  4. DIRECT REPORT GENERATION (Admin Bypass)                                 │
│  ──────────────────────────────────────────                                 │
│  • Existing CustomReport page remains unchanged                             │
│  • No approval workflow for admin-created reports                           │
│  • Option to create request on behalf of user (optional)                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 6.2 Component Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        NEW FRONTEND COMPONENTS                               │
└─────────────────────────────────────────────────────────────────────────────┘

Pages (src/pages/reports/)
├── RequestReportPage.js          # Template selection + request form
├── MyReportRequestsPage.js       # User's request list
├── ReportRequestDetailPage.js    # Single request view
├── ApprovalQueuePage.js          # Admin: pending approvals list
└── ReviewRequestPage.js          # Admin: review & approve/reject

Components (src/components/reports/)
├── TemplateGrid.js               # Grid of available templates
├── TemplateCard.js               # Single template card
├── RequestForm.js                # Report request form
├── RequestStatusBadge.js         # Status indicator badge
├── RequestStatusTimeline.js      # Visual status history
├── RequestTable.js               # Table of requests
├── RequestPreview.js             # Live preview of report
├── ApprovalActions.js            # Approve/Reject buttons
├── RejectionModal.js             # Modal for rejection reason
└── DownloadButton.js             # Download with tracking

Hooks (src/hooks/)
├── useReportTemplates.js         # Fetch available templates
├── useReportRequests.js          # CRUD for requests
├── useRequestApproval.js         # Approval actions (admin)
└── useRequestStatus.js           # Real-time status updates

Services (src/services/)
└── reportRequestService.js       # API calls for request workflow

Context (src/contexts/)
└── ReportRequestContext.js       # Request form state management

┌─────────────────────────────────────────────────────────────────────────────┐
│                    MODIFIED EXISTING COMPONENTS                              │
│                    (Salary Slip Self-Service)                                │
└─────────────────────────────────────────────────────────────────────────────┘

Pages (src/pages/)
└── SalarySlip.js                 # MODIFIED: Add role-based conditional UI
    ├── If Admin: Show employee selector (existing behavior)
    └── If Teacher/BDM: Hide selector, auto-load own data

Hooks (src/hooks/)
└── useSalarySlip.js              # MODIFIED: Add self-service mode
    ├── Detect user role from auth context
    ├── If non-admin: Call /api/employees/my-salary-data/
    └── If admin: Keep existing /api/employees/{id}/salary-data/

App.js
└── Route change: /salary-slip allowedRoles → ["Admin", "Teacher", "BDM"]
```

### 6.3 UI States & Indicators

| State | Visual Indicator | User Message |
|-------|------------------|--------------|
| **Loading** | Skeleton loaders, spinner | "Loading..." |
| **Empty (no requests)** | Illustration + CTA | "No requests yet. Create your first report request." |
| **DRAFT** | Gray badge, edit icon | "Draft - Continue editing" |
| **SUBMITTED** | Blue badge, clock icon, pulse animation | "Pending Approval - Waiting for admin review" |
| **APPROVED** | Green badge, checkmark | "Approved - Awaiting generation" |
| **REJECTED** | Red badge, X icon | "Rejected - See reason below" |
| **GENERATING** | Teal badge, spinner | "Generating PDF..." |
| **GENERATED** | Teal badge, download icon | "Ready - Download your report" |
| **Error** | Red banner | Specific error message |

### 6.4 Disabled Actions Matrix

| Status | Edit | Submit | Cancel | Download | Approve | Reject |
|--------|------|--------|--------|----------|---------|--------|
| DRAFT | ✅ | ✅ | ✅ | ❌ (gray) | ❌ | ❌ |
| SUBMITTED | ❌ (gray) | ❌ | ✅ | ❌ (gray) | ✅ (admin) | ✅ (admin) |
| APPROVED | ❌ | ❌ | ✅ | ❌ (gray) | ❌ | ❌ |
| REJECTED | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| GENERATED | ❌ | ❌ | ❌ | ✅ | ❌ | ❌ |

### 6.5 Notification Hooks (Optional Enhancement)

| Event | Notify | Method |
|-------|--------|--------|
| Request Submitted | All Admins | In-app notification + optional email |
| Request Approved | Requester | In-app notification + optional email |
| Request Rejected | Requester | In-app notification + email with reason |
| Report Generated | Requester | In-app notification with download link |
| Request Expiring | Requester | Email reminder 3 days before expiry |

---

## Phase 7: Acceptance Criteria & Edge Cases

### 7.1 Definition of "Approved"

A request is considered **technically approved** when ALL of the following are true:

1. `status` field equals `'APPROVED'`
2. `approved_by` is not null and references a valid Admin user
3. `approved_at` is not null and is a valid timestamp
4. `content_snapshot` is not null and contains valid JSON
5. A corresponding `RequestStatusLog` entry exists with `new_status='APPROVED'`
6. The approving admin's role was 'Admin' at the time of approval

### 7.2 Edge Cases & Handling

| Edge Case | Handling Strategy |
|-----------|-------------------|
| **User role changes mid-request** | Request remains valid. Permissions checked at action time, not request time. If user loses role, they can still view their historical requests but cannot create new ones for that scope. |
| **Template changes after submission** | `content_snapshot` preserves original template content. Generation uses snapshot, not current template. Template changes do not affect pending requests. |
| **Template deactivated after submission** | Request can still be approved and generated using snapshot. New requests cannot use deactivated template. |
| **Employee becomes inactive** | Request can still be processed. Generated report reflects employee status at generation time. Consider adding employee status to snapshot. |
| **Admin who approved is deactivated** | No impact. `approved_by` preserves historical record. Another admin can generate the report. |
| **Requester is deactivated** | Request remains in system. Admin can still approve/reject. Generated reports are accessible to admins. |
| **Concurrent approval attempts** | Use database-level locking (select_for_update). First approval wins. Second attempt returns error: "Request already approved." |
| **Request expires before approval** | Auto-transition to CANCELLED with reason "Expired". Notify requester. |
| **Generation fails** | Keep status as APPROVED. Admin can retry generation. Log error for debugging. |
| **Storage upload fails** | Retry up to 3 times. If all fail, mark as error state. Admin notified to retry manually. |
| **Very long body text** | Enforce max length (e.g., 50,000 characters). PDF generation handles multi-page. |
| **Special characters in content** | Sanitize for PDF generation. Preserve in database. Test Unicode support. |
| **Duplicate requests** | Allow duplicates. Each request is independent. Future: optional duplicate detection warning. |

### 7.3 Regression Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Breaking existing CustomReport page** | High - Admin loses direct report capability | Keep existing page completely separate. New endpoints use `/reports/requests/` prefix. No changes to existing `/reports/custom-reports/` endpoints. |
| **Performance impact on reports list** | Medium - Slow page loads | Add database indexes on status, requested_by, created_at. Implement pagination. |
| **PDF generation conflicts** | Medium - Resource contention | Use queue-based generation (Celery). Limit concurrent generations. |
| **Migration data loss** | High - Existing reports inaccessible | Existing CustomReport model unchanged. New models are additive. Run migrations in staging first. |
| **Frontend routing conflicts** | Medium - Broken navigation | Use distinct route paths: `/report-requests/` vs existing `/reports/` and `/custom-report/`. |
| **Permission escalation** | High - Security breach | Comprehensive permission tests. Code review for all permission checks. |

---

## Phase 8: Implementation Roadmap

### 8.1 Phased Delivery Plan

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     IMPLEMENTATION PHASES                                    │
└─────────────────────────────────────────────────────────────────────────────┘

PHASE 1: Foundation (Backend Core)
═══════════════════════════════════
├── Create ReportTemplate model and migrations
├── Create ReportRequest model and migrations
├── Create RequestStatusLog model and migrations
├── Create GeneratedReport model and migrations
├── Implement new permission classes
├── Seed initial templates from existing hardcoded data
├── Write model unit tests
└── Deliverable: Models ready, no API yet

PHASE 2: Backend API (Core Workflow)
════════════════════════════════════
├── Implement ReportTemplateViewSet (list, retrieve for all; CRUD for admin)
├── Implement ReportRequestViewSet (create, list, retrieve, update, delete)
├── Implement submit action with content snapshot
├── Implement approve/reject actions
├── Implement permission checks per endpoint
├── Write API integration tests
└── Deliverable: Full API functional, testable via Postman/curl

PHASE 3: Backend API (Generation)
═════════════════════════════════
├── Implement generate action (reuse existing PDF logic)
├── Implement download action with tracking
├── Connect to existing WeasyPrint generation
├── Implement file storage (Supabase or local)
├── Write generation tests
└── Deliverable: End-to-end backend workflow complete

PHASE 4: Frontend - Employee Flow
═════════════════════════════════
├── Create RequestReportPage (template selection + form)
├── Create MyReportRequestsPage (request list)
├── Create ReportRequestDetailPage (single view)
├── Implement useReportRequests hook
├── Implement reportRequestService
├── Add routes and navigation
├── Style with existing design system
├── **SALARY SLIP SELF-SERVICE:**
│   ├── Update App.js route: allowedRoles → ["Admin", "Teacher", "BDM"]
│   ├── Add role-based UI in SalarySlip.js (hide employee selector for non-admins)
│   ├── Update useSalarySlip hook for self-service mode
│   ├── Create GET /api/employees/my-salary-data/ endpoint
│   └── Add "My Salary Slips" link to employee sidebar
└── Deliverable: Employees can create requests AND view own salary slips

PHASE 5: Frontend - Admin Flow
══════════════════════════════
├── Create ApprovalQueuePage
├── Create ReviewRequestPage with preview
├── Implement approval/rejection modals
├── Add approval queue badge/notification
├── Implement download functionality
├── Add admin dashboard widget
└── Deliverable: Admins can approve, reject, generate, download

PHASE 6: Integration & Polish
═════════════════════════════
├── End-to-end testing (Cypress/Playwright)
├── Performance optimization
├── Error handling improvements
├── Loading states and skeleton loaders
├── Mobile responsiveness
├── Accessibility audit
└── Deliverable: Production-ready feature

PHASE 7: Optional Enhancements
══════════════════════════════
├── Email notifications (SendGrid/SES integration)
├── In-app notifications
├── Request expiration scheduler
├── Auto-archive old requests
├── Analytics dashboard
├── Bulk approval feature
└── Deliverable: Enhanced feature set
```

### 8.2 Task Breakdown

#### Phase 1: Foundation (Backend Core)

| Task | Priority | Dependencies | Complexity |
|------|----------|--------------|------------|
| 1.1 Create ReportTemplate model | High | None | Low |
| 1.2 Create ReportRequest model | High | 1.1 | Medium |
| 1.3 Create RequestStatusLog model | High | 1.2 | Low |
| 1.4 Create GeneratedReport model | High | 1.2 | Low |
| 1.5 Create and run migrations | High | 1.1-1.4 | Low |
| 1.6 Create IsRequestOwnerOrAdmin permission | High | 1.2 | Low |
| 1.7 Create CanRequestForEmployee permission | High | 1.2 | Medium |
| 1.8 Create CanUseTemplate permission | High | 1.1 | Low |
| 1.9 Seed templates from existing data | Medium | 1.1, 1.5 | Low |
| 1.10 Write model unit tests | High | 1.1-1.4 | Medium |

#### Phase 2: Backend API (Core Workflow)

| Task | Priority | Dependencies | Complexity |
|------|----------|--------------|------------|
| 2.1 Create ReportTemplateSerializer | High | 1.1 | Low |
| 2.2 Create ReportRequestSerializer | High | 1.2 | Medium |
| 2.3 Create ReportTemplateViewSet | High | 2.1 | Low |
| 2.4 Create ReportRequestViewSet (basic CRUD) | High | 2.2 | Medium |
| 2.5 Implement submit action | High | 2.4 | Medium |
| 2.6 Implement approve action | High | 2.4 | Medium |
| 2.7 Implement reject action | High | 2.4 | Low |
| 2.8 Implement cancel action | Medium | 2.4 | Low |
| 2.9 Register URL routes | High | 2.3, 2.4 | Low |
| 2.10 Write API integration tests | High | 2.1-2.9 | High |

#### Phase 3: Backend API (Generation)

| Task | Priority | Dependencies | Complexity |
|------|----------|--------------|------------|
| 3.1 Create GeneratedReportSerializer | High | 1.4 | Low |
| 3.2 Implement generate action | High | 2.5 | High |
| 3.3 Integrate with existing PDF generation | High | 3.2 | Medium |
| 3.4 Implement file storage upload | High | 3.2 | Medium |
| 3.5 Implement download action | High | 3.4 | Medium |
| 3.6 Implement download tracking | Medium | 3.5 | Low |
| 3.7 Write generation tests | High | 3.1-3.6 | Medium |

#### Phase 4: Frontend - Employee Flow

| Task | Priority | Dependencies | Complexity |
|------|----------|--------------|------------|
| 4.1 Create reportRequestService.js | High | Phase 2 | Low |
| 4.2 Create useReportTemplates hook | High | 4.1 | Low |
| 4.3 Create useReportRequests hook | High | 4.1 | Medium |
| 4.4 Create TemplateGrid component | High | 4.2 | Low |
| 4.5 Create TemplateCard component | High | None | Low |
| 4.6 Create RequestForm component | High | 4.2, 4.3 | High |
| 4.7 Create RequestStatusBadge component | High | None | Low |
| 4.8 Create RequestTable component | High | 4.7 | Medium |
| 4.9 Create RequestReportPage | High | 4.4, 4.6 | Medium |
| 4.10 Create MyReportRequestsPage | High | 4.8 | Medium |
| 4.11 Create ReportRequestDetailPage | High | 4.7 | Medium |
| 4.12 Add routes to App.js | High | 4.9-4.11 | Low |
| 4.13 Add navigation menu items | High | 4.12 | Low |

#### Phase 4B: Salary Slip Self-Service (Quick Win)

| Task | Priority | Dependencies | Complexity |
|------|----------|--------------|------------|
| 4B.1 Create `/api/employees/my-salary-data/` endpoint | High | None | Low |
| 4B.2 Add `IsSelfOrAdmin` permission for salary data | High | 4B.1 | Low |
| 4B.3 Update App.js route for salary-slip | High | None | Low |
| 4B.4 Add role detection in SalarySlip.js | High | 4B.3 | Medium |
| 4B.5 Conditionally hide employee selector | High | 4B.4 | Low |
| 4B.6 Update useSalarySlip for self-service mode | High | 4B.1, 4B.4 | Medium |
| 4B.7 Auto-load current user's salary data | High | 4B.6 | Low |
| 4B.8 Add "My Salary Slips" to sidebar navigation | Medium | 4B.3 | Low |
| 4B.9 Write tests for self-service salary slip | High | 4B.1-4B.7 | Medium |

**Note:** Phase 4B can be implemented **in parallel** with Phase 4 or even earlier as a "quick win" since it requires minimal new code—mostly route and UI conditional changes.

#### Phase 5: Frontend - Admin Flow

| Task | Priority | Dependencies | Complexity |
|------|----------|--------------|------------|
| 5.1 Create useRequestApproval hook | High | Phase 3 | Medium |
| 5.2 Create ApprovalActions component | High | 5.1 | Low |
| 5.3 Create RejectionModal component | High | None | Low |
| 5.4 Create RequestPreview component | High | None | Medium |
| 5.5 Create ApprovalQueuePage | High | 4.8, 5.2 | Medium |
| 5.6 Create ReviewRequestPage | High | 5.2, 5.3, 5.4 | High |
| 5.7 Create DownloadButton component | High | Phase 3 | Low |
| 5.8 Add approval badge to sidebar | Medium | 5.1 | Low |
| 5.9 Add dashboard widget | Medium | 5.1 | Medium |
| 5.10 Add admin routes | High | 5.5, 5.6 | Low |

#### Phase 6: Integration & Polish

| Task | Priority | Dependencies | Complexity |
|------|----------|--------------|------------|
| 6.1 End-to-end test: Employee creates request | High | Phase 4, 5 | Medium |
| 6.2 End-to-end test: Admin approves request | High | Phase 5 | Medium |
| 6.3 End-to-end test: Full workflow | High | 6.1, 6.2 | Medium |
| 6.4 Performance profiling | Medium | 6.3 | Medium |
| 6.5 Add database indexes | Medium | 6.4 | Low |
| 6.6 Implement loading skeletons | Medium | Phase 4, 5 | Low |
| 6.7 Mobile responsiveness pass | Medium | Phase 4, 5 | Medium |
| 6.8 Accessibility audit | Medium | Phase 4, 5 | Medium |
| 6.9 Error boundary implementation | Medium | Phase 4, 5 | Low |
| 6.10 Documentation update | Low | All | Low |

---

## Phase 9: Risks, Assumptions & Constraints

### 9.1 Assumptions

| # | Assumption | Impact if Wrong |
|---|------------|-----------------|
| A1 | Existing PDF generation (WeasyPrint) can handle self-service volume | Need to implement queuing or optimize |
| A2 | Supabase storage has sufficient capacity and performance | May need to evaluate alternative storage |
| A3 | Users have valid email addresses for notifications | Email notifications may fail |
| A4 | Existing auth system (JWT) will remain unchanged | May need to update permission checks |
| A5 | Template content format remains compatible | Migration of existing templates needed |
| A6 | Admins will review requests within reasonable time | Need SLA tracking or auto-escalation |

### 9.2 Constraints

| # | Constraint | Mitigation |
|---|------------|------------|
| C1 | Must not break existing admin report functionality | Completely separate endpoints and pages |
| C2 | Must use existing tech stack (React + Django) | No new frameworks; leverage existing patterns |
| C3 | Must follow existing code style and patterns | Code review enforcement |
| C4 | Must support existing user roles | Extend, don't replace role system |
| C5 | Must work with existing Supabase setup | Use existing connection/credentials |

### 9.3 Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Scope creep** | High | Medium | Strict phase boundaries; MVP first |
| **Permission bugs** | Medium | High | Comprehensive permission tests; security review |
| **Performance degradation** | Medium | Medium | Load testing before release; pagination |
| **User adoption challenges** | Medium | Low | Clear UI/UX; user documentation |
| **Integration issues** | Medium | Medium | Early integration testing; feature flags |
| **Data migration errors** | Low | High | Backup before migration; rollback plan |

---

## Appendix A: End-to-End Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    COMPLETE WORKFLOW DIAGRAM                                 │
└─────────────────────────────────────────────────────────────────────────────┘

 EMPLOYEE/BDM                           SYSTEM                            ADMIN
 ════════════                           ══════                            ═════
      │                                    │                                │
      │  1. Select template                │                                │
      │─────────────────────────────────▶│                                │
      │                                    │                                │
      │  2. Fill form, save draft          │                                │
      │─────────────────────────────────▶│                                │
      │                                    │                                │
      │  3. Submit for approval            │                                │
      │─────────────────────────────────▶│                                │
      │                                    │                                │
      │                                    │  4. Freeze content_snapshot    │
      │                                    │─────────────────────────────▶│
      │                                    │                                │
      │                                    │  5. Notify admin              │
      │                                    │─────────────────────────────▶│
      │                                    │                                │
      │                                    │                                │  6. Review request
      │                                    │◀─────────────────────────────│
      │                                    │                                │
      │                                    │  7a. APPROVE                   │
      │                                    │◀─────────────────────────────│
      │                                    │                                │
      │  8. Receive approval notification  │                                │
      │◀─────────────────────────────────│                                │
      │                                    │                                │
      │                                    │  9. GENERATE PDF               │
      │                                    │◀─────────────────────────────│
      │                                    │                                │
      │                                    │  10. Store file, update status │
      │                                    │─────────────────────────────▶│
      │                                    │                                │
      │  11. Download notification         │                                │
      │◀─────────────────────────────────│                                │
      │                                    │                                │
      │  12. Download PDF                  │                                │
      │─────────────────────────────────▶│                                │
      │                                    │                                │
      │◀─────────────────────────────────│                                │
      │       PDF File                     │                                │
      │                                    │                                │
      ▼                                    ▼                                ▼


                          ─── OR (REJECTION PATH) ───


      │                                    │                                │
      │                                    │  7b. REJECT (with reason)      │
      │                                    │◀─────────────────────────────│
      │                                    │                                │
      │  8. Receive rejection notification │                                │
      │◀─────────────────────────────────│                                │
      │      (includes reason)             │                                │
      │                                    │                                │
      │  9. View rejection, create new     │                                │
      │─────────────────────────────────▶│                                │
      │      request if needed             │                                │
      ▼                                    ▼                                ▼
```

---

## Appendix B: Database Schema (SQL Reference)

```sql
-- Note: This is conceptual SQL for reference only.
-- Actual implementation will use Django ORM migrations.

-- Report Templates
CREATE TABLE reports_reporttemplate (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    allowed_roles JSONB NOT NULL DEFAULT '[]',
    allowed_self_request BOOLEAN DEFAULT true,
    allowed_other_request BOOLEAN DEFAULT false,
    requires_target_employee BOOLEAN DEFAULT true,
    requires_target_school BOOLEAN DEFAULT false,
    default_subject VARCHAR(200),
    default_body TEXT,
    background_image VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Report Requests
CREATE TABLE reports_reportrequest (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_number VARCHAR(20) UNIQUE NOT NULL,
    requested_by_id INTEGER REFERENCES students_customuser(id),
    requested_at TIMESTAMP DEFAULT NOW(),
    target_employee_id INTEGER REFERENCES students_customuser(id),
    target_school_id INTEGER REFERENCES students_school(id),
    template_id INTEGER REFERENCES reports_reporttemplate(id),
    subject VARCHAR(200) NOT NULL,
    recipient_text TEXT,
    body_text TEXT NOT NULL,
    content_snapshot JSONB,
    line_spacing VARCHAR(10) DEFAULT 'single',
    custom_fields JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'DRAFT',
    priority VARCHAR(10) DEFAULT 'normal',
    approved_by_id INTEGER REFERENCES students_customuser(id),
    approved_at TIMESTAMP,
    rejection_reason TEXT,
    admin_notes TEXT,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_request_status ON reports_reportrequest(status);
CREATE INDEX idx_request_requested_by ON reports_reportrequest(requested_by_id);
CREATE INDEX idx_request_created_at ON reports_reportrequest(created_at);
CREATE INDEX idx_request_template ON reports_reportrequest(template_id);

-- Generated Reports
CREATE TABLE reports_generatedreport (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID UNIQUE REFERENCES reports_reportrequest(id),
    generated_by_id INTEGER REFERENCES students_customuser(id),
    generated_at TIMESTAMP DEFAULT NOW(),
    file_path VARCHAR(500) NOT NULL,
    file_name VARCHAR(200) NOT NULL,
    file_size INTEGER NOT NULL,
    file_hash VARCHAR(64) NOT NULL,
    mime_type VARCHAR(50) DEFAULT 'application/pdf',
    download_count INTEGER DEFAULT 0,
    last_downloaded_at TIMESTAMP,
    last_downloaded_by_id INTEGER REFERENCES students_customuser(id),
    expires_at TIMESTAMP,
    is_deleted BOOLEAN DEFAULT false
);

-- Status Audit Log
CREATE TABLE reports_requeststatuslog (
    id SERIAL PRIMARY KEY,
    request_id UUID REFERENCES reports_reportrequest(id),
    previous_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    changed_by_id INTEGER REFERENCES students_customuser(id),
    changed_at TIMESTAMP DEFAULT NOW(),
    notes TEXT,
    ip_address INET
);

CREATE INDEX idx_statuslog_request ON reports_requeststatuslog(request_id);
CREATE INDEX idx_statuslog_changed_at ON reports_requeststatuslog(changed_at);
```

---

## Appendix C: API Response Examples

### List Templates Response
```json
{
  "count": 5,
  "results": [
    {
      "code": "salary_certificate",
      "name": "Salary Certificate",
      "description": "Official salary certificate for bank loans, visa applications, etc.",
      "category": "hr",
      "allowed_self_request": true,
      "allowed_other_request": true,
      "requires_target_employee": true
    },
    {
      "code": "experience_letter",
      "name": "Experience Letter",
      "description": "Letter confirming employment duration and role.",
      "category": "hr",
      "allowed_self_request": true,
      "allowed_other_request": true,
      "requires_target_employee": true
    }
  ]
}
```

### Create Request Response
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "request_number": "REQ-2024-0042",
  "status": "DRAFT",
  "template": {
    "code": "salary_certificate",
    "name": "Salary Certificate"
  },
  "requested_by": {
    "id": 15,
    "username": "john.teacher",
    "full_name": "John Smith"
  },
  "target_employee": {
    "id": 15,
    "username": "john.teacher",
    "full_name": "John Smith",
    "employee_id": "KK-T-025"
  },
  "subject": "Salary Certificate - January 2024",
  "body_text": "This is to certify that...",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

### Submit Response (with frozen snapshot)
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "request_number": "REQ-2024-0042",
  "status": "SUBMITTED",
  "content_snapshot": {
    "subject": "Salary Certificate - January 2024",
    "recipient_text": "To Whom It May Concern",
    "body_text": "This is to certify that Mr. John Smith...",
    "line_spacing": "1.5",
    "template_code": "salary_certificate",
    "template_name": "Salary Certificate",
    "target_employee": {
      "id": 15,
      "name": "John Smith",
      "employee_id": "KK-T-025"
    },
    "submitted_at": "2024-01-15T11:00:00Z"
  },
  "requested_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T11:00:00Z"
}
```

### Approval Response
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "request_number": "REQ-2024-0042",
  "status": "APPROVED",
  "approved_by": {
    "id": 1,
    "username": "admin",
    "full_name": "System Admin"
  },
  "approved_at": "2024-01-15T14:30:00Z",
  "admin_notes": "Verified against HR records",
  "updated_at": "2024-01-15T14:30:00Z"
}
```

### Generated Report Response
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "request": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "request_number": "REQ-2024-0042"
  },
  "status": "GENERATED",
  "generated_by": {
    "id": 1,
    "username": "admin"
  },
  "generated_at": "2024-01-15T14:35:00Z",
  "file_name": "Salary_Certificate_John_Smith_REQ-2024-0042.pdf",
  "file_size": 125432,
  "download_url": "/api/reports/requests/550e8400-e29b-41d4-a716-446655440000/download/",
  "download_count": 0
}
```

---

*Document Version: 1.0*
*Created: January 2024*
*Status: Ready for Review*
