# Online Students Access and Management Guide

School Management System
Last Updated: May 19, 2026

---

## Purpose

This document explains how Online Students are implemented in this codebase, including:
- Role and subtype model
- Login/auth payload behavior
- Frontend route and menu access rules
- Backend access enforcement
- Admin Online Student management APIs
- Known policy mismatches and operational notes

---

## Key Concept: Role vs Subtype

Online Student is not a separate user role.

- Role is still `Student` (from `CustomUser.role`)
- Online is a student subtype (from `Student.student_subtype`)

### Role values
Defined in `backend/students/models.py`:
- Admin
- Teacher
- Student
- BDM

### Student subtype values
Defined in `backend/students/subtypes.py`:
- ONSITE
- ONLINE
- HYBRID

The subtype is stored on `Student.student_subtype` (`backend/students/models.py`).

---

## End-to-End Flow

1. User logs in with username/password at `/api/auth/token/`.
2. Backend detects role `Student` and adds `studentSubtype` to token response.
3. Frontend stores `role` and `studentSubtype` in local storage.
4. `ProtectedRoute` checks:
   - role is allowed
   - if role is Student and route has subtype restrictions, subtype must be allowed
5. Sidebar/menu is filtered by role and student feature flags tied to subtype.
6. Backend enforces LMS access using student subtype policy for student-only LMS endpoints.

---

## Authentication Behavior

### Backend
`backend/authentication/views.py` (`CustomTokenObtainPairSerializer.validate`):
- Always returns `role` and `username`
- For students, also returns:
  - `fullName`
  - `studentSubtype` (from `user.student_profile.student_subtype`)

### Frontend
`frontend/src/pages/LoginPage.js` stores:
- `access`
- `refresh`
- `role`
- `username`
- `studentSubtype`

---

## Frontend Access Control

### Route guard
`frontend/src/components/ProtectedRoute.js`:
- If no token: redirect to `/login`
- If role not allowed: redirect to `/`
- If role is Student and subtype is not in `allowedStudentSubtypes`: redirect to `/student-dashboard`

### Route-level subtype gating
`frontend/src/App.js` uses policy-driven subtype lists:
- `LMS_ENABLED_STUDENT_SUBTYPES`
- `PROGRESS_ENABLED_STUDENT_SUBTYPES`
- `AI_GALA_ENABLED_STUDENT_SUBTYPES`

Source: `frontend/src/constants/studentSubtypePolicy.js`

Current frontend policy:
- ONSITE: LMS yes, Progress yes, AI Gala yes
- ONLINE: LMS yes, Progress no, AI Gala no
- HYBRID: LMS yes, Progress yes, AI Gala yes

### Menu gating
`frontend/src/config/menuConfig.js` filters menu items by:
- role
- `studentFeature` flags (for Student role)

---

## Backend LMS Access Enforcement

Student LMS checks use:
- `backend/students/access_policies.py`
- `backend/courses/views.py`

Important logic:
- Student role required
- Linked `student_profile` required
- Subtype must be LMS-eligible by policy (`is_student_lms_eligible`)

Backend subtype policy source:
`backend/students/subtypes.py`

Current backend policy marks LMS enabled for all subtypes (ONSITE, ONLINE, HYBRID).

---

## Admin Online Student Management Feature

This is an admin tool to manage courses for ONLINE subtype students.

### Frontend entry points
- Route: `/online-students` (Admin only) in `frontend/src/App.js`
- Sidebar item: Online Students (Admin only) in `frontend/src/config/menuConfig.js`
- Page: `frontend/src/pages/admin/OnlineStudentManager.jsx`
- API service: `frontend/src/services/onlineStudentAdminService.js`

### Backend endpoints
Registered in `backend/courses/urls.py` under `/api/courses/admin/online-students/...`:

- `GET /api/courses/admin/online-students/`
  - List ONLINE students with enrollment summary
- `GET /api/courses/admin/online-students/{student_id}/`
  - Detailed view of one ONLINE student
- `POST /api/courses/admin/online-students/{student_id}/assign-courses/`
  - Assign one or multiple courses
  - Body: `{ "course_ids": [1,2], "skip_existing": true }`
- `DELETE /api/courses/admin/online-students/{student_id}/enrollments/{enrollment_id}/`
  - Remove enrollment
- `GET /api/courses/admin/online-students/available-courses/`
  - List assignable courses
- `POST /api/courses/admin/online-students/bulk-assign-courses/`
  - Bulk assign courses
  - Body: `{ "student_ids": [...], "course_ids": [...], "skip_existing": true }`

Permission: `IsAdmin` in `backend/courses/admin_online_views.py` enforces `request.user.role == 'Admin'`.

---

## Student Creation and Subtype Assignment

Student subtype is accepted and normalized in student creation flows in `backend/students/views.py`:
- incoming subtype is uppercased
- validated against `StudentSubtype.choices`
- fallback to default subtype (`ONSITE`) if invalid or missing

Default subtype is defined in `backend/students/subtypes.py`.

---

## Tests Relevant to This Feature

- `backend/authentication/tests.py`
  - verifies login payload includes role and student subtype behavior
- `backend/courses/tests.py`
  - subtype-based LMS access tests (ONLINE and ONSITE coverage)

---

## Known Gaps and Notes

1. There is a policy mismatch between frontend and backend capabilities:
- Frontend restricts ONLINE students from Progress and AI Gala.
- Backend subtype policy currently models only LMS eligibility and does not enforce those two feature restrictions directly.

2. Some docstrings in backend admin-online views show `/api/admin/online-students/...`, but actual routed paths are `/api/courses/admin/online-students/...` (as configured in `backend/courses/urls.py`).

3. Because ONLINE is a subtype (not role), any role checks should remain `role == 'Student'`; subtype checks should be feature-specific.

---

## Recommended Maintenance Pattern

If new student capabilities are added:
1. Add feature flag to frontend subtype policy (`studentSubtypePolicy.js`)
2. Gate route/menu with `allowedStudentSubtypes` and `studentFeature`
3. Add backend policy check if endpoint must be protected server-side
4. Add/update tests for ONLINE, ONSITE, HYBRID behavior

This keeps behavior predictable and avoids role explosion.
