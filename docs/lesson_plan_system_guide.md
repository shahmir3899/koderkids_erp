# Lesson Plan Management System - Technical Guide

## Overview

The lesson plan system allows **teachers** to create, manage, and track lesson plans for their assigned schools and classes. It supports both structured topic selection from books and free-form custom text input.

---

## 1. Database Model

**File:** `backend/students/models.py`

```
LessonPlan
├── session_date       (DateField)           — Date of the lesson
├── teacher            (FK → CustomUser)     — The teacher who owns this plan
├── school             (FK → School)         — Which school
├── student_class      (CharField)           — e.g. "Class 5A"
├── planned_topic      (TextField)           — Formatted display text of what's planned
├── planned_topics     (M2M → books.Topic)   — Structured topic references from books
├── achieved_topic     (TextField)           — What was actually taught (filled later)
├── created_at         (auto)
├── updated_at         (auto)
```

**Unique constraint:** One lesson plan per `(session_date, teacher, student_class, school)`.

---

## 2. How Lesson Plans Are Created

### Frontend Flow (5-Step Wizard)

**Component:** `frontend/src/components/lessons/LessonPlanWizard.js`

| Step | What Happens | Component |
|------|-------------|-----------|
| 1 | Teacher selects school, class, and month | SelectSchool, SelectClass, SelectMonth |
| 2 | Teacher picks session dates from the month | DateGrid |
| 3 | Teacher selects a book | BookGridSelector |
| 4 | For each date, teacher assigns topics (from book OR custom text) | SessionTopicAssigner |
| 5 | Review all plans, then submit | LessonReviewPanel |

### API Call

**Endpoint:** `POST /api/lessons/create/`
**Auth:** Teacher only

**Payload format:**
```json
{
  "school_id": 1,
  "student_class": "Class 5A",
  "lessons": [
    {
      "session_date": "2025-01-15",
      "planned_topic_ids": [10, 11, 12],
      "planned_topic": ""
    },
    {
      "session_date": "2025-01-16",
      "planned_topic_ids": [],
      "planned_topic": "Custom topic text here"
    }
  ]
}
```

- `planned_topic_ids` — array of Topic IDs from the books system (Book Mode)
- `planned_topic` — free-form text (Custom Mode)
- Either one or both can be provided per lesson

### Backend Logic

**File:** `backend/lessons/views.py` → `create_lesson_plan()`
**File:** `backend/lessons/serializers.py` → `LessonPlanSerializer.create()`

1. Validates teacher is authenticated and has access to the school
2. Checks for duplicates (same date/teacher/class/school)
3. Creates `LessonPlan` record
4. If topic IDs provided → sets M2M relationship and auto-formats `planned_topic` text (grouped by book → chapter → topic)
5. If custom text provided → saves it directly to `planned_topic`

---

## 3. How Lesson Plans Are Saved

### Database Storage

- The `LessonPlan` row is saved in the `students_lessonplan` table
- M2M topic links are stored in the `students_lessonplan_planned_topics` junction table
- The `planned_topic` text field stores a **formatted display string** like:

```
Mathematics
Chapter 5
• 5.1 Fractions
• 5.2 Decimals

Science
Chapter 3
• 3.1 Energy Sources
```

This formatting is done by the serializer's `_format_from_topics()` method so the display text is pre-computed at save time.

### Update Endpoints

| Action | Endpoint | Method |
|--------|----------|--------|
| Update planned topic | `PUT /api/lessons/<id>/update-planned/` | Updates `planned_topic` field |
| Update achieved topic | `PUT /api/lessons/<id>/update-achieved/` | Updates `achieved_topic` field |
| Delete lesson plan | `DELETE /api/lessons/<id>/` | Removes the record |

All updates are restricted to the teacher who owns the lesson plan.

---

## 4. How Lesson Plans Are Retrieved

### Main Retrieval Endpoint (Date Range)

**Endpoint:** `GET /api/lessons/range/?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD&school_id=1&student_class=Class 5A`
**Handler:** `backend/lessons/views.py` → `get_lesson_plan_range()`

**Query:**
```python
LessonPlan.objects.filter(
    session_date__range=[start_date, end_date],
    school_id=school_id,
    student_class=student_class
).order_by('session_date')
```

**Response:**
```json
[
  {
    "id": 1,
    "session_date": "2025-01-15",
    "teacher": 5,
    "teacher_name": "john_doe",
    "school": 1,
    "school_name": "ABC School",
    "student_class": "Class 5A",
    "planned_topic": "Mathematics\nChapter 5\n• 5.1 Fractions",
    "achieved_topic": ""
  }
]
```

Returns `[]` (empty array) if no lessons found — never 404.

### Other Retrieval Endpoints

| Endpoint | Purpose |
|----------|---------|
| `GET /api/lessons/<date>/<school_id>/<class>/` | Get lessons for a specific date |
| `GET /api/lessons/achieved/?student_id=&start_date=&end_date=` | Get achieved topics for a student |

### Frontend Display

**Page:** `frontend/src/pages/LessonsPage.js`

1. Teacher selects filters (date range, school, class) via `FilterBar`
2. A debounced fetch (500ms) calls the range API
3. Results display in a `DataTable` with columns: Date, School, Class, Planned Topic, Actions
4. Inline editing is available via `RichTextEditor`
5. Export options: PDF, Image, Print

---

## 5. File Map

```
BACKEND
├── backend/students/models.py          → LessonPlan model definition
├── backend/lessons/views.py            → All API endpoint handlers
├── backend/lessons/serializers.py      → LessonPlanSerializer (create, format, validate)
├── backend/lessons/urls.py             → URL routing (mounted at /api/lessons/)

FRONTEND
├── frontend/src/pages/LessonsPage.js                    → Main lesson plans page
├── frontend/src/components/lessons/LessonPlanWizard.js   → 5-step creation wizard
├── frontend/src/components/lessons/DateGrid.js           → Date picker grid
├── frontend/src/components/lessons/BookGridSelector.js   → Book selection
├── frontend/src/components/lessons/SessionTopicAssigner.js → Topic assignment per date
├── frontend/src/components/lessons/LessonReviewPanel.js  → Review before submit
├── frontend/src/api.js                                   → API helper functions
```

---

## 6. Key Design Decisions

- **Dual input mode:** Teachers can pick structured topics from books OR type custom text — both stored in `planned_topic`
- **Pre-formatted text:** The display string is computed at save time, not at read time, for faster retrieval
- **M2M + Text:** `planned_topics` (M2M) keeps the structured data; `planned_topic` (text) keeps the display version
- **Owner-only editing:** Teachers can only modify their own lesson plans
- **School access check:** Teachers can only create plans for schools they are assigned to
- **No 404 on empty:** Empty results return `[]` for cleaner frontend handling
