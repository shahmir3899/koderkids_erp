# Online Students Feature Enhancement Plan

Project: School Management System
Date: May 19, 2026
Status: Proposed implementation plan

---

## 1. Goal

Enhance the Admin Online Students page with:
1. Student profile editing (basic information and contact details)
2. Course/Book assignment improvements
3. Automated test coverage for all new behavior

Note: In this codebase, LMS course assignment is based on the Book model, so "course assignment" and "book assignment" refer to the same assignment flow.

---

## 2. Current State Summary

What already exists:
- Admin page to list ONLINE subtype students
- Modal to assign/remove courses
- Admin-only backend endpoints for list/detail/assign/remove/bulk assignment

Current gaps:
- No admin UI/API for editing ONLINE student basic profile fields from Online Students page
- Assignment workflow is modal-only and tightly coupled to student list payload
- Limited test coverage specifically for admin online-student management and profile editing flow

---

## 3. Scope

In scope:
- Admin can view and update ONLINE student profile data from Online Students management area
- Admin can assign books/courses (single and bulk) with clearer UX and validations
- New backend and frontend tests covering permissions, validation, and success/error flows

Out of scope (for this phase):
- Non-ONLINE student subtype management in this module
- Parent/guardian profile features
- Deep academic history editing
- Rework of unrelated student modules

---

## 4. Proposed Functional Requirements

### 4.1 Profile Editing

Admin should be able to edit for ONLINE student:
- name
- email (linked user account)
- phone
- address
- date_of_birth
- gender (optional for this phase; include if business wants parity with Student record)
- status (optional in phase 2 if governance concerns exist)

Read-only in this module:
- reg_num
- school (unless explicit requirement to move student across school)
- student_class (optional phase 2)
- student_subtype (ONLINE only in this view)

Validation:
- email uniqueness and format
- phone length/format rule (existing serializer already has minimum length rule)
- required fields as per business rules (at minimum: name should not be empty)

### 4.2 Course/Book Assignment

Enhance assignment behavior:
- Keep existing single-student assign/remove flow
- Add explicit "Books" terminology in UI labels (or dual label: "Courses/Books")
- Add "select all filtered" for fast assignment
- Add optional status filter for current enrollments (active/dropped)
- Show assignment result summary clearly (assigned/skipped/failed)
- Keep bulk assignment endpoint for future multi-select UI (phase 2 UI)

---

## 5. Technical Design

### 5.1 Backend Changes

#### 5.1.1 New serializer for admin online student profile updates
Create a focused serializer in courses module (or students module if preferred) for admin update use:
- Suggested name: AdminOnlineStudentProfileSerializer
- Model: Student (plus nested user.email support)
- Enforce ONLINE subtype context from view
- Reuse validation patterns from StudentProfileSerializer

#### 5.1.2 New endpoints under existing admin online-students namespace
Add endpoints:
- GET /api/courses/admin/online-students/{student_id}/profile/
- PATCH /api/courses/admin/online-students/{student_id}/profile/
- PUT /api/courses/admin/online-students/{student_id}/profile/ (optional)

Behavior:
- Admin-only permission
- 404 if student not ONLINE subtype
- Returns updated student profile payload consistent with list/detail shape

#### 5.1.3 Response contract normalization
Standardize payload keys across list/detail/profile APIs:
- id, name, email, school_name, student_subtype
- phone, address, date_of_birth
- enrollments and enrollment_count where relevant

#### 5.1.4 Assignment API quality improvements
Optional but recommended while touching this area:
- Ensure consistent error key format (detail/error)
- Improve input validation messages
- Add serializer-based request validation for assign and bulk assign payloads

### 5.2 Frontend Changes

#### 5.2.1 Split concerns on admin page
Current Manage button opens course assignment modal only.
Proposed:
- Add separate actions:
  - Edit Profile
  - Manage Books
- Or convert existing modal to tabbed modal:
  - Tab 1: Profile
  - Tab 2: Books/Courses

Recommended approach: Separate modals/components for lower complexity.

#### 5.2.2 New service methods
In onlineStudentAdminService add:
- getOnlineStudentProfile(studentId)
- updateOnlineStudentProfile(studentId, payload)

#### 5.2.3 New profile modal/component
Add component:
- OnlineStudentProfileEditModal

Capabilities:
- fetch latest profile on open
- form validation and submit state
- success/error toast
- refresh list after save

#### 5.2.4 Improve assignment modal UX
Enhancements:
- clearer copy: "Assign Books (Courses)"
- show count of selected and already assigned
- optional "Select all filtered"
- preserve search and selected state until successful submit

---

## 6. Database and Migration Impact

Expected migration impact: none (if only using existing Student and CustomUser fields).

If new profile fields are requested later, create a separate migration plan.

---

## 7. Security and Permissions

Must enforce server-side:
- Admin-only access for all admin online-student endpoints
- Student must belong to ONLINE subtype for these profile endpoints

Must verify:
- no teacher/student access to admin endpoints
- no profile update via list endpoint side effects

---

## 8. Test Plan

### 8.1 Backend Tests (Django/DRF)

Create/extend tests in backend/courses/tests.py or a dedicated backend/courses/test_admin_online_students.py.

Profile API tests:
1. Admin can GET online student profile
2. Admin can PATCH valid profile fields
3. Admin PATCH updates nested user email and student fields atomically
4. Non-admin receives 403
5. PATCH invalid email returns 400
6. PATCH duplicate email returns 400
7. ONLINE subtype enforcement: ONSITE student returns 404
8. Missing student returns 404

Assignment API tests (existing + new assertions):
1. Assign books success (new enrollments)
2. Assign with existing active enrollment -> skipped
3. Assign with dropped enrollment -> reactivated
4. Remove enrollment sets dropped status
5. Bulk assign handles mixed valid/invalid student IDs
6. Non-admin cannot assign/remove/bulk assign
7. Validation errors for missing course_ids/student_ids

### 8.2 Frontend Tests

Add tests for:
- OnlineStudentManager page actions rendering
- Profile edit modal open/load/save success
- Validation errors displayed in form
- Manage Books modal still works after refactor
- Assignment result summary and state reset behavior

Tools (based on existing frontend setup):
- React Testing Library + Jest/Vitest (use project standard)
- Service layer mocked responses for deterministic tests

### 8.3 Integration / E2E Smoke Tests

Minimum smoke scenarios:
1. Admin login -> Online Students page -> Edit profile -> save -> visible in table/detail
2. Admin assigns books -> counts update
3. Admin removes assigned book -> enrollment status reflected
4. Unauthorized role attempts direct endpoint URL -> denied

If Cypress/Playwright exists, add scripts; otherwise keep as manual QA checklist initially.

---

## 9. Delivery Phases

Phase 1: Backend foundation
- Add serializer + profile GET/PATCH endpoints
- Add backend tests for profile endpoints and permission checks

Phase 2: Frontend profile editing
- Add profile edit modal and service methods
- Integrate into OnlineStudentManager actions
- Add frontend component tests

Phase 3: Assignment UX improvement
- Improve Books assignment modal UX and labeling
- Add/extend assignment tests (backend + frontend)

Phase 4: Hardening and QA
- Run full test suite for impacted modules
- Manual smoke pass with Admin and non-Admin users
- Update docs and release notes

---

## 10. Acceptance Criteria

Feature acceptance:
1. Admin can edit ONLINE student basic profile from Online Students area
2. Updated profile persists and displays correctly on refresh
3. Admin can assign and remove books/courses with clear feedback
4. Unauthorized roles cannot access or modify data via API
5. Automated tests cover success, validation, and permission paths

Quality acceptance:
1. No regression in existing online-student list/assign flow
2. All new tests pass in CI/local
3. No new lint/type errors in touched frontend/backend modules

---

## 11. Risks and Mitigation

Risk: Duplicate logic between students module and courses admin-online views
- Mitigation: keep profile serializer focused and reusable; centralize shared validators

Risk: Inconsistent payload shapes across endpoints
- Mitigation: define a common response contract and assert it in tests

Risk: UI complexity from mixing profile and assignment workflows
- Mitigation: separate modals/components and keep state isolated

---

## 12. Effort Estimate

Estimated total: 2 to 4 development days
- Backend + tests: 1 to 1.5 days
- Frontend + tests: 1 to 1.5 days
- QA + polish + docs: 0.5 to 1 day

---

## 13. Implementation Checklist

- [ ] Finalize editable profile fields with product owner
- [ ] Add backend profile serializer and endpoints
- [ ] Add backend permission/validation tests
- [ ] Add frontend profile edit modal and actions
- [ ] Add frontend tests for profile and assignment workflows
- [ ] Improve assignment modal labels and selection UX
- [ ] Run impacted test suites and fix regressions
- [ ] Update docs for new endpoint contracts and UI behavior
