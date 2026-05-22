# Online Classes System Overview

School Management System
Last Updated: May 22, 2026

---

## 1) What Is This About?

This document explains the actual online classes implementation in the current codebase.

The feature is a role-based scheduling and live-class system built around:

- session creation and management by Teacher/Admin
- student join flow (device check -> live room)
- LiveKit token + webhook integration
- participant tracking, reminders, recordings, and attendance automation

It is implemented mainly in:

- Backend: `backend/onlineclasses`
- Frontend: `frontend/src/pages/online-classes` and `frontend/src/services/onlineClassService.js`

Important architecture reality:

- frontend controls route/menu access by role and student subtype
- backend enforces access by role, ownership, school, and invite list

---

## 2) How Frontend Works For Each Role

## Route and role gates

Main online classes routes in `frontend/src/App.js`:

- Student page: `/online-classes`
- Device check: `/online-classes/check/:sessionId`
- Live room: `/online-classes/room/:sessionId`
- Recording playback: `/online-classes/recordings/:recordingId`
- Teacher/Admin dashboard: `/online-classes/teacher`
- Teacher/Admin create/edit: `/online-classes/teacher/create`, `/online-classes/teacher/edit/:sessionId`

Student subtype policy in `frontend/src/constants/studentSubtypePolicy.js`:

- ONSITE: `onlineClassesEnabled = true`
- ONLINE: `onlineClassesEnabled = true`
- HYBRID: `onlineClassesEnabled = true`

Menu visibility in `frontend/src/config/menuConfig.js` follows the same subtype gate for students.

### Student flow

Page: `OnlineClassesStudentPage.js`

1. Student opens `/online-classes`.
2. Upcoming tab loads two lists and merges them:
   - `listSessions({ status: 'scheduled' })`
   - `listSessions({ status: 'live' })`
3. Past Classes tab loads `listSessions({ status: 'ended' })`.
4. Recordings tab also loads ended sessions, then shows watch button only when `recording_enabled` is true.
5. Join button opens `DeviceCheckPage` (`/online-classes/check/:sessionId`).
6. Device check validates mic/camera and navigates to `ClassRoomPage`.
7. In room, frontend requests token and connects to LiveKit.

Student join button timing logic (frontend only):

- can join from 30 minutes before start until session end window
- live session always joinable

### Teacher flow

Page: `TeacherOnlineClassesPage.js`

1. Teacher loads assigned schools from `/api/users/me/assigned-schools/`.
2. Session table fetches status buckets via `listSessions`:
   - `scheduled`, `live`, `ended`, `cancelled`
3. Upcoming tab combines live + scheduled.
4. Past tab combines ended + cancelled.
5. Actions:
   - scheduled: Start, Edit, Cancel (DELETE scheduled endpoint)
   - live: Join
   - ended: View participants, optional recording button, Delete past
   - cancelled: Delete past

### Admin flow

Admin uses same pages as Teacher for online classes management:

- `/online-classes/teacher`
- `/online-classes/teacher/create`

Extra admin abilities in create page (`CreateClassPage.js`):

- choose any active school (`/api/schools/`)
- optionally assign ownership to a teacher via `/api/users/?role=Teacher&school=<id>&is_active=true`

The backend validates selected teacher belongs to selected school.

---

## 3) How Data Is Sent and Shown On Frontend

## Frontend API service layer

All online class requests are centralized in:

- `frontend/src/services/onlineClassService.js`

Implementation notes:

- uses `fetch` with auth headers
- has request timeout + abort (default 10s)
- normalizes API errors using `error`/`detail`

## Main request/response usage by page

### TeacherOnlineClassesPage

- reads session lists by status filter
- displays table columns from API fields:
  - `title`, `scheduled_at`, `duration_mins`, `status`, `participants_count`
- start class action:
  - `POST /sessions/{id}/start/`
  - then navigate to room
- cancel scheduled action:
  - `DELETE /sessions/{id}/`
- delete past action:
  - `POST /sessions/{id}/delete-past/`
- participants modal:
  - `GET /sessions/{id}/participants/`

### CreateClassPage (single + bulk)

Loads dependency data:

- schools: `/api/schools/` (admin) or `/api/users/me/assigned-schools/` (teacher)
- time slots: `/api/time-slots/?school_id=<id>`
- eligible students: `/api/onlineclasses/eligible-students/?school_id=<id>&time_slot_id=<optional>`

Single-create payload sent to `/api/onlineclasses/sessions/`:

- `title` (required)
- `school` (required)
- `scheduled_at` (required)
- optional: `description`, `teacher` (admin), `time_slot`, `selected_student_ids`, `duration_mins`, flags

Bulk-create payload sent to `/api/onlineclasses/sessions/bulk/`:

- required: `title`, `school`, `bulk_time`, `bulk_weekdays`
- optional with defaults: `bulk_start_date`, `bulk_classes_count`
- optional shared fields same as single create
- preview mode uses `dry_run: true`

### OnlineClassesStudentPage

- fetches sessions by status via list endpoints
- displays `teacher_name`, `scheduled_at`, `duration_mins`, `description`, `status`
- routes to device check before room

### ClassRoomPage

Sequence:

1. `getSession(sessionId)` for metadata
2. `getRoomToken(sessionId)` for `{ token, livekit_url, room_name }`
3. if Teacher/Admin, call `startSession(sessionId)` (best-effort)
4. connect to LiveKit room
5. when teacher ends class, call `endSession(sessionId)`

Realtime data inside room:

- chat and teacher controls use LiveKit data channel
- participant audio/video via LiveKit track subscriptions

### RecordingPlaybackPage

- calls `listRecordings()`
- finds matching record by URL param `recordingId`
- renders `recording.url` in HTML5 video

---

## 4) How Data Is Stored In Backend (Models and Relations)

## Core models in `backend/onlineclasses/models.py`

### `OnlineClassSession`

Key columns:

- `title`, `description`
- `teacher` -> `students.CustomUser`
- `school` -> `students.School`
- `time_slot` -> `students.TimeSlot` (nullable)
- `selected_students` -> many-to-many `students.Student`
- `scheduled_at`, `duration_mins`
- `room_name` (unique, auto-generated)
- recurrence fields: `is_recurring`, `recurrence_rule`
- feature flags: `recording_enabled`, `chat_enabled`, `screenshare_student_allowed`
- status lifecycle fields: `status`, `started_at`, `ended_at`
- timestamps: `created_at`, `updated_at`

Status constants:

- `scheduled`, `live`, `ended`, `cancelled`

### `ClassParticipant`

- `session` + `student` unique together
- tracks join/leave and computed duration:
  - `joined_at`, `left_at`, `duration_mins`
- `attendance_auto_marked` indicates attendance task already handled

### `ClassRecording`

- linked to `session`
- stores `url`, `duration_seconds`, `size_bytes`, plus `egress_id`

## Related models outside onlineclasses

From `backend/students/models.py`:

- `CustomUser.role` controls permissions
- `CustomUser.assigned_schools` used for teacher school ownership
- `Student.student_subtype` used by frontend policy and serializer validation
- `Student.time_slot` links ONLINE student to teacher scheduling group
- `TimeSlot.teacher` (TeacherProfile) and `TimeSlot.school`
- `Attendance` updated by auto-mark task

## Task side-effects (`backend/onlineclasses/tasks.py`)

At create/bulk-create time, backend schedules Celery tasks:

- `send_class_reminder` (1 hour before class)
- `auto_start_session` (at `scheduled_at`)
- `auto_end_session` (at `scheduled_at + duration_mins`)

When class ends (manual or auto-end):

- `auto_mark_attendance` marks attendance when participant duration >= 70% of class duration

---

## 5) Backend Endpoints With Required Parameters

Base prefix:

- `/api/onlineclasses/`

## Session list/create

### `GET /api/onlineclasses/sessions/`

Query params:

- optional `status`: `scheduled|live|ended|cancelled`
- optional `school`: school id

Role behavior:

- Teacher: own sessions only; optional school must be in `assigned_schools`
- Admin: all sessions (optionally school-filtered)
- Student: sessions where
  - student explicitly invited, OR
  - session has no explicit invite list and same school

### `POST /api/onlineclasses/sessions/`

Required body:

- `title` (string)
- `school` (int)
- `scheduled_at` (ISO datetime)

Optional body:

- `description` (string)
- `duration_mins` (int, default 60)
- `time_slot` (int or null)
- `selected_student_ids` (eligible student ids: ONLINE/HYBRID/ONSITE)
- `recording_enabled`, `chat_enabled`, `screenshare_student_allowed` (bool)
- `is_recurring` (bool), `recurrence_rule` (string)
- `teacher` (int, admin only override)

Validations:

- only Teacher/Admin
- Teacher must be assigned to school
- admin-provided teacher must be active Teacher assigned to school
- `time_slot` must belong to selected school
- `selected_student_ids` must be eligible subtype students of selected school
- if teacher picked a `time_slot`, it must belong to that teacher profile

## Bulk create

### `POST /api/onlineclasses/sessions/bulk/`

Required body:

- `title` (string)
- `school` (int)
- `bulk_weekdays` (non-empty list, e.g. `['Mon','Wed']`)
- `bulk_time` (`HH:MM`)

Optional body:

- `bulk_start_date` (`YYYY-MM-DD`, default today)
- `bulk_classes_count` (int, default 8, allowed 1..60)
- all single-create optional fields
- `dry_run` (bool-like)

Responses:

- dry-run: generated date preview only
- create: created sessions + generated dates

## Session detail/update/delete scheduled

### `GET /api/onlineclasses/sessions/{session_id}/`

- Student allowed only if session school matches student school
- Teacher/Admin allowed by normal auth

### `PATCH /api/onlineclasses/sessions/{session_id}/`

- only Admin or owning Teacher
- partial update on serializer fields

### `DELETE /api/onlineclasses/sessions/{session_id}/`

- only Admin or owning Teacher
- only allowed when session status is `scheduled`

## Delete past

### `POST /api/onlineclasses/sessions/{session_id}/delete-past/`

- only Admin or owning Teacher
- only allowed for status `ended` or `cancelled`

Success response includes:

- `deleted_session_id`
- `deleted_at`
- `deleted_by`
- `deleted_by_role`
- `participants_deleted`
- `recordings_deleted`

## Live class actions

### `POST /api/onlineclasses/sessions/{session_id}/token/`

- denies if session is `ended` or `cancelled`
- Teacher/Admin:
  - Teacher must own session
- Student:
  - if session has explicit invite list -> student must be invited
  - else must belong to same school

Response:

- `token`
- `livekit_url`
- `room_name`

### `POST /api/onlineclasses/sessions/{session_id}/start/`

- only Admin or owning Teacher
- sets `status = live`, sets `started_at`

### `POST /api/onlineclasses/sessions/{session_id}/end/`

- only Admin or owning Teacher
- sets `status = ended`, sets `ended_at`
- enqueues `auto_mark_attendance`

## Participants and recordings

### `GET /api/onlineclasses/sessions/{session_id}/participants/`

- only Admin or owning Teacher
- returns participant rows with:
  - `student_name`, `student_reg_num`, `joined_at`, `left_at`, `duration_mins`, `attendance_auto_marked`

### `GET /api/onlineclasses/recordings/`

Role behavior in current code:

- Teacher/Admin: recordings filtered by `session__teacher = request.user`
- Student: recordings filtered by same school and `session.recording_enabled = true`

Note:

- Admin currently sees only recordings for sessions owned by that admin user, not all teachers.

## Eligible students helper

### `GET /api/onlineclasses/eligible-students/?school_id=<id>&time_slot_id=<optional>`

Required query:

- `school_id`

Optional query:

- `time_slot_id` (must belong to same school)

Returns active eligible students (ONLINE/HYBRID/ONSITE) for picker UI.

## LiveKit webhook

### `POST /api/onlineclasses/webhook/`

Input:

- LiveKit event JSON payload
- optional signature check via `X-Livekit-Signature` if secret/header present

Handled events:

- `participant_joined` for identities `student-<id>` -> upserts `ClassParticipant.joined_at`
- `participant_left` for identities `student-<id>` -> sets `left_at`, computes `duration_mins`

Important behavior:

- `room_finished` is intentionally ignored in webhook

---

## Additional Integration Endpoints Used By Online Classes UI

These are outside `onlineclasses` but required by current frontend pages:

- `GET /api/schools/` (admin school list)
- `GET /api/users/me/assigned-schools/` (teacher/admin assigned schools)
- `GET /api/users/?role=Teacher&school=<id>&is_active=true` (admin teacher picker)
- `GET /api/time-slots/?school_id=<id>` (time slot picker)

---

## Current Implementation Notes (Code-Accurate)

1. Frontend student route is subtype-gated (ONLINE/HYBRID/ONSITE enabled), and backend student access is school/invite based.
2. Session lifecycle can move to `ended` in two ways in current code:
   - explicit end API (`/end/`)
   - scheduled Celery auto-end task
3. Scheduled-session delete and past-session delete are now separate flows/endpoints.
4. Invite list behavior is explicit:
   - with `selected_student_ids`: only invited students can join/view list results
   - without invites: school-level fallback
