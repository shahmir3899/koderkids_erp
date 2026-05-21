# Online Classes System Overview

School Management System
Last Updated: May 21, 2026

---

## Purpose

This document explains how the online classes system is structured in the codebase, how it connects to ONLINE and ONSITE student management, and how the frontend and backend flows are separated.

---

## Recent Implementation Update (This Chat)

The online classes scheduling and reliability flow was updated and validated in this session.

### Implemented scheduling and reliability updates

- Added loader reliability hardening for route changes and slow mobile networks:
  - route navigation now arms request lifecycle instead of forcing loader visible state
  - global loader watchdog auto-clears stuck state after a hard timeout
  - online class service calls now include fetch timeout/abort handling
  - teacher page session loading uses partial-tolerant `Promise.allSettled`
- Added bulk session creation support:
  - new backend endpoint: `POST /api/onlineclasses/sessions/bulk/`
  - dry-run support for generated schedule preview
  - frontend `CreateClassPage` now supports a bulk mode for monthly plans
- Added teacher ownership refinement for admin scheduling:
  - admin can create sessions under a selected teacher
  - selected teacher must be assigned to the chosen school
  - frontend `CreateClassPage` includes admin-only teacher selector

### Existing classroom features kept

- Background blur processing (`@livekit/track-processors`)
- Teacher to student remote-control actions over LiveKit data channel
- Screen-share request modal workflow
- Toast feedback for incoming teacher actions

### Validation outcome

- Backend targeted online classes view tests passed:
  - `SessionListCreateTest` and `SessionDetailTest`: all passing
  - new `SessionBulkCreateTest`: passing
- Frontend targeted online classes tests passed after test mock updates:
  - `onlineClassService.test.js`: passing
  - `CreateClassPage.test.js`: passing

---

## High-Level Finding

The online classes feature is not a completely isolated module. It is a connected system made of **6 parts**:

1. Student type and access routing
2. Student management split: ONSITE/general vs ONLINE admin management
3. Time slot and teacher assignment
4. Class session creation and scheduling
5. Live class join and participation
6. Post-class lifecycle: recordings, reminders, attendance

The core online class APIs live in `backend/onlineclasses`, but they depend on student subtype policy, school ownership, time slots, teacher assignment, and course/student admin flows from other modules.

---

## Part 1: Student Type and Access Routing

### What it does

This layer decides which student-facing pages a student can reach.

### Frontend

- Student subtype policy: `frontend/src/constants/studentSubtypePolicy.js`
- Main routes: `frontend/src/App.js`
- Menu gating: `frontend/src/config/menuConfig.js`
- Separate dashboards:
  - ONLINE students: `/online-student-dashboard`
  - ONSITE and HYBRID students: `/student-dashboard`

### Backend

- Student subtype lives on `Student.student_subtype`
- Login payload includes subtype for students
- Session list/detail access in `backend/onlineclasses/views.py` is based on:
  - authenticated user role
  - student profile existence
  - school matching

### Important connection

This layer does not create classes. It only controls who can see the feature and which dashboard/page they come from.

### Important mismatch found

The current frontend policy marks:

- ONSITE: `onlineClassesEnabled: false`
- ONLINE: `onlineClassesEnabled: true`
- HYBRID: `onlineClassesEnabled: true`

But the backend online class session APIs do not block ONSITE students by subtype. They allow any `Student` user to view/join sessions if the session belongs to the same school.

So currently:

- backend access is school-based for students
- frontend access is subtype-gated and currently excludes ONSITE

---

## Part 2: Student Management Split

### What it does

ONLINE and ONSITE students are managed from different frontend surfaces before they ever reach the online classes feature.

### ONSITE / general student management

- Main page: `frontend/src/pages/StudentsPage.js`
- Route: `/students`
- Used for general student administration
- Also supports `student_subtype === 'ONLINE'` fields in some places, but this is the broader student management surface

### ONLINE student management

- Main page: `frontend/src/pages/admin/OnlineStudentManager.jsx`
- Route: `/online-students`
- Admin-only surface focused on ONLINE subtype students
- Supports:
  - create ONLINE students
  - edit ONLINE student profiles
  - assign/remove books or courses
  - manage time slots from the same area

### Backend support

- ONLINE student admin APIs: `backend/courses/admin_online_views.py`
- Student creation/update flow: `backend/students/views.py`

### Important connection

The online classes system depends on this split because ONLINE students usually enter the system with extra scheduling data, especially `time_slot`, while ONSITE students are managed more traditionally by school/class.

---

## Part 3: Time Slot and Teacher Assignment

### What it does

This is the scheduling bridge between ONLINE students and teachers.

For ONLINE students, `TimeSlot` acts like the equivalent of `student_class` for ONSITE students.

### Backend

- Model: `TimeSlot` in `backend/students/models.py`
- APIs: `time_slot_list` and `time_slot_detail` in `backend/students/views.py`
- Teacher ownership rule:
  - teachers can only manage their own slots
  - teachers must be assigned to the school to create slots there
- Access check helper: `check_timeslot_access` in `backend/students/permissions.py`

### Frontend

- Admin time slot UI: `frontend/src/components/admin/TimeSlotTab.jsx`
- Time slot service: `frontend/src/services/timeSlotService.js`
- ONLINE student create/edit forms use time slot dropdowns

### Teacher assignment link

Teacher-to-online-student linkage is mainly indirect:

- a `TimeSlot` belongs to a teacher
- an ONLINE student is assigned to a `TimeSlot`
- teacher online student view reads students by `time_slot__teacher`

Teacher-facing endpoint:

- `GET /employees/my-online-students/` in `backend/employees/views.py`

Teacher-facing frontend:

- `frontend/src/components/teacher/OnlineStudentsTab.js`

### Important connection

This is the main ownership model for ONLINE students. It is how teachers become connected to ONLINE students before class sessions are even created.

---

## Part 4: Class Session Creation and Scheduling

### What it does

This is the core class creation module. It schedules the online session itself.

### Backend

- App: `backend/onlineclasses`
- Main model: `OnlineClassSession` in `backend/onlineclasses/models.py`
- Key fields:
  - `teacher`
  - `school`
  - `time_slot`
  - `selected_students`
  - `scheduled_at`
  - `duration_mins`
  - `room_name`
  - recurrence and recording settings

### API endpoints

- `GET/POST /api/onlineclasses/sessions/`
- `POST /api/onlineclasses/sessions/bulk/`
- `GET/PATCH/DELETE /api/onlineclasses/sessions/{id}/`
- `POST /api/onlineclasses/sessions/{id}/start/`
- `POST /api/onlineclasses/sessions/{id}/end/`

### Frontend

- Teacher list/manage page: `frontend/src/pages/online-classes/TeacherOnlineClassesPage.js`
- Create/edit page: `frontend/src/pages/online-classes/CreateClassPage.js`
- Service layer: `frontend/src/services/onlineClassService.js`

### Current implementation detail

The model supports:

- `time_slot`
- `selected_students`
- recurrence metadata fields

The current `CreateClassPage` exposes:

- school selection
- optional time slot selection
- optional selected-student invitation list
- single-session scheduling
- bulk monthly scheduling mode (date/time/weekdays/count)
- admin-only optional teacher assignment for ownership

That means:

- targeted class assignment is supported in both backend and active UI
- monthly class planning no longer requires one-by-one manual creation

### Important connection

Teacher assignment to school is enforced here:

- teachers can only create sessions for schools in `assigned_schools`
- admins can create across schools
- admins can assign ownership to a selected teacher (who must be assigned to that school)

So the ownership chain is:

- teacher assigned to school
- session created for school
- students of that school can see the session in backend logic

---

## Part 5: Live Class Join and Participation

### What it does

This is the real-time join flow for students and teachers.

### Frontend flow

Student side:

1. Student opens `OnlineClassesStudentPage`
2. Student sees Upcoming sessions from both `scheduled` and `live` statuses
3. Student clicks join
4. Student goes to `DeviceCheckPage`
5. Student goes to `ClassRoomPage`

Teacher side:

1. Teacher opens `TeacherOnlineClassesPage`
2. Teacher sees Upcoming as a combined `live + scheduled` list that auto-refreshes
3. Teacher starts or joins a scheduled session
4. Teacher goes directly to `ClassRoomPage`

Key pages:

- `frontend/src/pages/online-classes/OnlineClassesStudentPage.js`
- `frontend/src/pages/online-classes/DeviceCheckPage.js`
- `frontend/src/pages/online-classes/ClassRoomPage.js`

### Backend flow

1. Frontend requests session list from `/api/onlineclasses/sessions/`
2. User requests room token from `/api/onlineclasses/sessions/{id}/token/`
3. Backend generates a LiveKit-compatible HS256 JWT using Python stdlib only
4. Teacher may call `/start/`
5. LiveKit webhook later reports participant join/leave events

### Participation tracking

Backend tracks student attendance presence through:

- `ClassParticipant` model in `backend/onlineclasses/models.py`
- LiveKit webhook in `backend/onlineclasses/views.py`

When a student joins:

- backend creates or updates `ClassParticipant.joined_at`

When a student leaves:

- backend stores `left_at`
- backend computes `duration_mins`

### Important connection

This is where the online class session becomes an actual attended class. It connects the scheduling layer to attendance and recordings.

---

## Part 6: Post-Class Lifecycle

### What it does

After the live class ends, the system continues through reminders, attendance, and recordings.

### Reminders

Backend task: `send_class_reminder` in `backend/onlineclasses/tasks.py`

Triggered after session creation:

- schedules reminder for 1 hour before class
- sends email if student has email
- sends WhatsApp if bot key and phone are available

Important detail:

- reminder targets students in the same school
- reminder currently filters to `ONLINE` and `HYBRID`

### Attendance

Backend task: `auto_mark_attendance` in `backend/onlineclasses/tasks.py`

Triggered when:

- teacher ends session manually

Important current behavior:

- the LiveKit `room_finished` webhook is intentionally ignored for ending sessions
- closing the teacher browser/tab or a transient disconnect should not end the class
- only the explicit teacher/admin end action should move a session from `live` to `ended`

Attendance rule:

- student is auto-marked present if participation duration is at least 70% of class duration

### Recordings

Backend list endpoint:

- `GET /api/onlineclasses/recordings/`

Frontend playback page:

- `frontend/src/pages/online-classes/RecordingPlaybackPage.js`

### Important connection

This part converts the live session into durable outputs:

- attendance records
- recording access
- historical participant data

---

## How the 6 Parts Connect

### Connection summary

1. Student subtype policy decides which dashboard and menu a student sees.
2. Student management pages create or maintain student records.
3. ONLINE students can be assigned a time slot.
4. A time slot belongs to a teacher, which creates teacher ownership of ONLINE students.
5. Teachers and admins create class sessions in the online classes module.
6. Sessions are currently created mostly at school level in the UI, even though the model also supports time-slot and selected-student targeting.
7. Students fetch sessions from the online classes API and join through device check and classroom pages.
8. LiveKit webhook updates participants.
9. End-of-class tasks create attendance and expose recordings.

### Practical ownership chain

- ONSITE student: mainly managed by school and class
- ONLINE student: mainly managed by school, time slot, and teacher ownership
- Online class session: currently managed mainly by teacher plus school
- Participation: tracked per student through `ClassParticipant`

---

## Frontend Flow

### A. Student-facing flow

1. Login returns role and `studentSubtype`
2. `ProtectedRoute` and subtype policy decide if `/online-classes` is reachable
3. Student opens `OnlineClassesStudentPage`
4. Page loads sessions from `onlineClassService.listSessions()`
5. Student enters `DeviceCheckPage`
6. Student enters `ClassRoomPage`
7. Student can later watch recordings from `RecordingPlaybackPage`

### B. Teacher/admin flow

1. Teacher/admin opens `TeacherOnlineClassesPage`
2. Page loads sessions grouped by status
3. Teacher/admin creates or edits session in `CreateClassPage`
4. Teacher/admin starts class or joins live room
5. Teacher/admin can view participants after completion

### C. Admin ONLINE student operations flow

1. Admin opens `OnlineStudentManager`
2. Admin creates ONLINE students
3. Admin assigns time slots and books/courses
4. Time slots connect ONLINE students to teachers
5. Those students can then participate in the broader online class ecosystem

---

## Backend Flow

### A. Student and teacher setup flow

1. Student record is created in `students` module
2. Student subtype is stored on `Student.student_subtype`
3. ONLINE student may be assigned a `TimeSlot`
4. `TimeSlot.teacher` connects the student to a teacher

### B. Class creation flow

1. Teacher/admin calls `POST /api/onlineclasses/sessions/`
2. Optional bulk flow uses `POST /api/onlineclasses/sessions/bulk/`
3. Backend validates school access
4. For admin ownership override, backend validates selected teacher assignment to school
5. Backend saves one or multiple `OnlineClassSession` rows
6. Backend schedules reminder and auto start/end tasks

### C. Live class flow

1. Client calls token endpoint
2. Backend validates teacher or student access
3. Backend issues LiveKit token
4. Join/leave events return through webhook
5. Backend updates `ClassParticipant`

### D. Post-class flow

1. Session is ended manually through `POST /api/onlineclasses/sessions/{id}/end/`
2. Attendance auto-marking task runs
3. Recording list endpoint exposes saved recordings

---

## Current Design Reality

If you describe this system simply, the most accurate summary is:

- **Student administration is split** between general student management and dedicated ONLINE student management.
- **Teacher ownership of ONLINE students is mainly done through time slots.**
- **Online class scheduling now supports targeted assignment in active UI** via `time_slot` and `selected_students`, plus bulk monthly scheduling.
- **Admin scheduling ownership can now be delegated to a teacher**, with school-assignment validation.
- **Live class execution is centralized in the `onlineclasses` app** with stdlib JWT token generation, real LiveKit WebRTC connection on the frontend, participant tracking, reminders, recordings, and attendance automation.
- **Session status flow is currently `scheduled -> live -> ended`, with `ended` intended to happen only from an explicit end action, not from browser close or `room_finished`.**

---

## Implementation Checklist: Delete Past Sessions (Admin/Teacher)

Use this checklist to implement and validate safe deletion of past sessions.

### 1) Product Rules

- [ ] Finalize scope: "past session" means `ended` and `cancelled` only.
- [ ] Keep existing scheduled-session cancel flow separate from past delete flow.
- [ ] Confirm teacher rule: teacher can delete only own past sessions.
- [ ] Confirm admin rule: admin can delete any past session.
- [ ] Confirm guardrail rule: deletion blocked for `scheduled` and `live` sessions.
- [ ] Confirm confirmation UX: stronger warning when recordings/participants exist.

### 2) Backend API

- [ ] Add endpoint in `backend/onlineclasses/urls.py`:
  - [ ] `POST /api/onlineclasses/sessions/{id}/delete-past/` (or approved equivalent).
- [ ] Implement view in `backend/onlineclasses/views.py`:
  - [ ] fetch session by id
  - [ ] reject non-past statuses (`scheduled`, `live`)
  - [ ] allow admin
  - [ ] allow teacher only if `session.teacher_id == request.user.id`
  - [ ] return 403 for unauthorized role/ownership
- [ ] Decide deletion model:
  - [ ] hard delete now, or
  - [ ] soft delete (`is_deleted`, `deleted_at`, `deleted_by`) if audit retention is required.
- [ ] Ensure related data handling is explicit:
  - [ ] `ClassParticipant`
  - [ ] `ClassRecording`
  - [ ] reminder/task side-effects (if applicable)
- [ ] Return structured response:
  - [ ] `deleted_session_id`
  - [ ] `deleted_at`
  - [ ] `deleted_by`
  - [ ] optional related-row counts.

### 3) Frontend Service + UI

- [ ] Add service method in `frontend/src/services/onlineClassService.js` for past delete endpoint.
- [ ] Update actions in `frontend/src/pages/online-classes/TeacherOnlineClassesPage.js`:
  - [ ] show "Delete" only in Past tab for `ended`/`cancelled`
  - [ ] keep "Cancel" on scheduled sessions only
  - [ ] hide/disable delete for unauthorized state
- [ ] Add two-step confirm dialog/modal:
  - [ ] confirm delete intent
  - [ ] show impact warning if recording/participants exist
- [ ] On success:
  - [ ] remove deleted row from list
  - [ ] show success toast
- [ ] On failure:
  - [ ] show backend error message in toast/inline alert.

### 4) Security + Audit

- [ ] Enforce authorization server-side regardless of UI state.
- [ ] Add server log/audit entry for every past delete action.
- [ ] Verify no student-accessible endpoint allows deletion.

### 5) Test Coverage

#### Backend tests (`backend/onlineclasses/tests/test_views.py`)

- [ ] admin can delete ended session
- [ ] admin can delete cancelled session
- [ ] teacher can delete own ended session
- [ ] teacher cannot delete another teacher's ended session
- [ ] deletion denied for scheduled session
- [ ] deletion denied for live session
- [ ] response payload includes required metadata

#### Frontend tests

- [ ] delete button appears only in valid statuses
- [ ] delete confirmation flow works
- [ ] successful delete removes row
- [ ] error path shows message
- [ ] scheduled cancel flow still works (no regression)

### 6) Rollout + QA

- [ ] Implement backend + tests first.
- [ ] Implement frontend + tests second.
- [ ] Run targeted regression on online classes pages.
- [ ] Validate role behavior with real Teacher/Admin accounts.
- [ ] Validate desktop + mobile flows.
- [ ] Ship behind a feature flag if required by release policy.

### 7) Acceptance Criteria

- [ ] Teacher can delete only own `ended`/`cancelled` sessions.
- [ ] Admin can delete any `ended`/`cancelled` session.
- [ ] `scheduled` and `live` cannot be deleted via past-delete endpoint.
- [ ] UI updates immediately after successful deletion.
- [ ] New backend and frontend tests pass.

---

## Main Files To Know

### Frontend

- `frontend/src/App.js`
- `frontend/src/constants/studentSubtypePolicy.js`
- `frontend/src/pages/StudentsPage.js`
- `frontend/src/pages/admin/OnlineStudentManager.jsx`
- `frontend/src/components/admin/TimeSlotTab.jsx`
- `frontend/src/pages/online-classes/TeacherOnlineClassesPage.js`
- `frontend/src/pages/online-classes/CreateClassPage.js`
- `frontend/src/pages/online-classes/OnlineClassesStudentPage.js`
- `frontend/src/pages/online-classes/DeviceCheckPage.js`
- `frontend/src/pages/online-classes/ClassRoomPage.js`
- `frontend/src/pages/online-classes/ClassRoomPage.test.js`
- `frontend/src/pages/online-classes/RecordingPlaybackPage.js`
- `frontend/src/services/onlineClassService.js`
- `frontend/src/contexts/LoadingContext.js`
- `frontend/src/utils/axiosInterceptor.js`
- `frontend/src/services/onlineStudentAdminService.js`
- `frontend/src/services/teacherOnlineStudentsService.js`
- `frontend/package.json` (Jest moduleNameMapper compatibility for react-router v7 in CRA/Jest 27)

### Backend

- `backend/onlineclasses/models.py`
- `backend/onlineclasses/views.py`
- `backend/onlineclasses/urls.py`
- `backend/onlineclasses/tasks.py`
- `backend/students/models.py`
- `backend/students/views.py`
- `backend/students/permissions.py`
- `backend/courses/admin_online_views.py`
- `backend/employees/views.py`
