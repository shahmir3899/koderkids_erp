# Validation System User Manual

## Table of Contents

1. [Overview](#overview)
2. [Student Guide](#student-guide)
3. [Teacher Guide](#teacher-guide)
4. [BDM Guide](#bdm-guide)
5. [Admin Guide](#admin-guide)
6. [Score Calculation Details](#score-calculation-details)
7. [API Reference](#api-reference)

---

## Overview

The Validation System implements a comprehensive 5-step learning validation pipeline that ensures quality learning outcomes through:

- **Student Activity Tracking** - Reading time, activity completion, screenshot uploads
- **Teacher Oversight** - Bulk approval of student work with quality ratings
- **Guardian Involvement** - Parent/guardian review outside school hours
- **Score Calculation** - Weighted scoring for both students and teachers

### Key Features

| Feature | Description |
|---------|-------------|
| 5-Step Unlock | Sequential validation before unlocking next section |
| Student Scores | Weighted calculation (Reading + Activity + Teacher Rating + Guardian Review) |
| Teacher Evaluation | Monthly scores (Attendance + Attitude + Student Interest + Enrollment) |
| Guardian Mode | Available only outside school hours using student login |
| Geofence | 2km radius for teacher attendance validation |

---

## Student Guide

### How Learning Works

As a student, you progress through course content following a **5-step validation process** for each section:

```
Step 1: Reading     -->  Spend time reading the content (minimum 5 minutes)
Step 2: Activity    -->  Complete the activity/exercise
Step 3: Screenshot  -->  Upload proof of your completed work
Step 4: Teacher     -->  Wait for teacher to approve your work
Step 5: Guardian    -->  Get guardian approval (outside school hours)
        |
        v
    NEXT SECTION UNLOCKED!
```

### Step-by-Step Guide

#### Step 1: Reading the Content

1. Open a topic/section in your course
2. Read through the content carefully
3. The system tracks your reading time automatically
4. **Minimum required**: 5 minutes of reading time
5. You can see your progress in the topic view

**Tip**: Take your time! Quality reading helps you understand the material better.

#### Step 2: Completing the Activity

1. After reading, complete the associated activity
2. This could be:
   - A Scratch project
   - Python code
   - Canva design
   - AI tool creation
   - Other creative work
3. Mark the activity as complete when finished

#### Step 3: Uploading Your Screenshot

1. Take a screenshot of your completed work
2. Go to **Activity Proof Upload**
3. Fill in the form:
   - Select the topic
   - Upload your screenshot (Supabase URL)
   - Choose the software you used (Scratch, Python, Canva, AI Tool, Other)
   - Add notes about your work (optional)
4. Submit your proof

**API Endpoint**: `POST /api/courses/activity-proof/upload/`

```json
{
  "topic": 123,
  "screenshot_url": "https://supabase.../my-screenshot.png",
  "software_used": "scratch",
  "student_notes": "I created an animation of a dancing cat!"
}
```

#### Step 4: Waiting for Teacher Approval

1. Your teacher will review your screenshot
2. They will rate your work:
   - **Excellent** (100 points)
   - **Good** (75 points)
   - **Basic** (50 points)
3. If rejected, you'll need to re-upload a better screenshot
4. Check your proof status: `GET /api/courses/activity-proof/my-proofs/`

#### Step 5: Guardian Review

1. Guardian review is **ONLY available outside school hours**
2. Check if guardian mode is available: `GET /api/courses/guardian/check-time/`
3. At home (outside school hours), your parent/guardian can:
   - View your completed work
   - Approve the activity
4. This is done through **YOUR student login** - no separate guardian account needed

**How to Submit Guardian Review**:

```
POST /api/courses/guardian/review/{proof_id}/
{
  "is_approved": true,
  "review_notes": "Great work!"  // optional
}
```

### Viewing Your Scores

Check your section scores anytime:

```
GET /api/courses/scores/my-scores/
```

Response includes:
- Individual component scores (Reading, Activity, Teacher Rating, Guardian Review)
- Total weighted score
- Rating (Excellent, Good, Average, Needs Support)

### Checking Unlock Status

To see where you are in the 5-step process:

```
GET /api/courses/topics/{topic_id}/validation-steps/
```

This shows which steps are completed and what you need to do next.

---

## Teacher Guide

### Your Responsibilities

As a teacher, you are responsible for:

1. **Reviewing student activity proofs** - Approve or reject with feedback
2. **Rating student work** - Assign quality ratings
3. **Monitoring class progress** - View score reports
4. **Maintaining attendance** - Login within school geofence

### Reviewing Student Proofs

#### Viewing Pending Proofs

```
GET /api/courses/activity-proof/pending/
```

Filter options:
- `school_id` - Filter by specific school
- `class_id` - Filter by specific class
- `course_id` - Filter by specific course

#### Approving a Single Proof

```
PUT /api/courses/activity-proof/{proof_id}/
{
  "status": "approved",
  "teacher_rating": "good",
  "teacher_remarks": "Well done! Nice animation."
}
```

Rating options:
- `excellent` - Outstanding work (100 points)
- `good` - Good quality work (75 points)
- `basic` - Meets minimum requirements (50 points)

#### Bulk Approval (Recommended)

For efficiency, approve multiple proofs at once:

```
POST /api/courses/activity-proof/bulk-approve/
{
  "proof_ids": [1, 2, 3, 4, 5],
  "rating": "good",
  "remarks": "Good progress this week!"
}
```

#### Rejecting Proofs

When work doesn't meet standards:

```
POST /api/courses/activity-proof/bulk-reject/
{
  "proof_ids": [6, 7],
  "remarks": "Screenshot is unclear. Please re-upload with better quality."
}
```

**Important**: Always provide helpful feedback when rejecting so students know how to improve.

### Viewing Class Reports

Get an overview of your class performance:

```
GET /api/courses/scores/class-report/
```

Query parameters:
- `school_id` - Required for teachers
- `class_id` - Optional filter
- `course_id` - Optional filter

Response includes:
- Class average score
- Rating distribution
- Per-student breakdown

### Viewing Individual Student Progress

```
GET /api/courses/scores/student/{student_id}/
```

### Teacher Attendance

Your attendance is tracked automatically when you login:

1. **Geofence Validation**: You must be within 2km of your assigned school
2. **Login Location**: Your location is recorded at login
3. **Logout**: Location is cleared on logout for privacy

Check your attendance:
```
GET /api/auth/teacher-attendance/
```

### Viewing Your Evaluation

See your monthly evaluation scores:

```
GET /api/employees/my-evaluation/
```

---

## BDM Guide

### Monthly School Visits

As a BDM, you conduct monthly school visits and evaluate teacher performance.

### Creating a Proforma

After visiting a school, fill out the teacher evaluation proforma:

```
POST /api/employees/bdm/proforma/
{
  "teacher_id": 123,
  "school_id": 456,
  "visit_date": "2024-01-15",
  "month": 1,
  "year": 2024,
  "discipline_rating": 4,
  "communication_rating": 4,
  "child_handling_rating": 5,
  "professionalism_rating": 4,
  "content_knowledge_rating": 4,
  "remarks": "Teacher shows great improvement",
  "areas_of_improvement": "Time management could be better",
  "teacher_strengths": "Excellent student engagement"
}
```

### Rating Scale (1-5)

| Rating | Description |
|--------|-------------|
| 1 | Poor - Significant improvement needed |
| 2 | Below Average - Needs improvement |
| 3 | Average - Meets basic expectations |
| 4 | Good - Exceeds expectations |
| 5 | Excellent - Outstanding performance |

### Rating Categories

1. **Discipline Rating** - Punctuality, classroom management
2. **Communication Rating** - Clarity, student interaction
3. **Child Handling Rating** - Patience, engagement techniques
4. **Professionalism Rating** - Dress code, conduct
5. **Content Knowledge Rating** - Subject expertise

### Viewing Your Proformas

```
GET /api/employees/bdm/proforma/
```

Filter by teacher, school, month, or year.

### Updating a Proforma

```
PUT /api/employees/bdm/proforma/{proforma_id}/
{
  "discipline_rating": 5,
  "remarks": "Updated after follow-up visit"
}
```

---

## Admin Guide

### Dashboard Overview

Admins have access to:

1. All student scores across schools
2. All teacher evaluations
3. Evaluation calculation triggers
4. System-wide reports

### Viewing All Teacher Evaluations

```
GET /api/employees/teacher-evaluation/
```

Filter options:
- `month` - Specific month
- `year` - Specific year
- `rating` - Filter by rating category

### Calculating Teacher Evaluations

Trigger monthly evaluation calculation:

```
POST /api/employees/teacher-evaluation/calculate/
{
  "month": 1,
  "year": 2024
}
```

For a specific teacher:

```
POST /api/employees/teacher-evaluation/calculate/
{
  "teacher_id": 123,
  "month": 1,
  "year": 2024
}
```

### Viewing Specific Teacher Evaluation

```
GET /api/employees/teacher-evaluation/{teacher_id}/
```

### Managing School Hours

Set school timing for guardian mode:

Update the School model with:
- `start_time` - School start time (default: 08:00)
- `end_time` - School end time (default: 15:00)

Guardian review is only available outside these hours.

---

## Score Calculation Details

### Student Section Score

Each completed section receives a weighted score:

```
STUDENT SECTION SCORE =
    (Reading Score × 20%) +
    (Activity Score × 30%) +
    (Teacher Rating Score × 30%) +
    (Guardian Review Score × 20%)
```

#### Component Breakdown

| Component | Weight | How It's Calculated |
|-----------|--------|---------------------|
| Reading | 20% | Time spent ÷ 5 minutes × 100 (max 100) |
| Activity | 30% | Completed = 100, In Progress = 50, Not Started = 0 |
| Teacher Rating | 30% | Excellent = 100, Good = 75, Basic = 50 |
| Guardian Review | 20% | Approved = 100, Not Reviewed = 0 |

#### Student Rating Thresholds

| Total Score | Rating |
|-------------|--------|
| 90-100 | Excellent |
| 75-89 | Good |
| 60-74 | Average |
| 0-59 | Needs Support |

#### Example Calculation

```
Student completes a section:
- Reading: Spent 8 minutes (8/5 × 100 = 160, capped at 100) = 100
- Activity: Completed = 100
- Teacher Rating: "Good" = 75
- Guardian Review: Approved = 100

Total Score = (100 × 0.20) + (100 × 0.30) + (75 × 0.30) + (100 × 0.20)
            = 20 + 30 + 22.5 + 20
            = 92.5%

Rating: Excellent
```

---

### Teacher Evaluation Score

Teachers receive monthly evaluation scores:

```
TEACHER EVALUATION SCORE =
    (Attendance Score × 30%) +
    (Attitude Score × 30%) +
    (Student Interest Score × 20%) +
    (Enrollment Impact Score × 20%)
```

#### Component Breakdown

| Component | Weight | How It's Calculated |
|-----------|--------|---------------------|
| Attendance | 30% | (Present Days ÷ Working Days) × 100 |
| Attitude | 30% | BDM Proforma average × 20 (1-5 scale to 0-100) |
| Student Interest | 20% | (Completed Topics ÷ Total Topics) × 100 |
| Enrollment Impact | 20% | Student count × 5 (max 100) |

#### Teacher Rating Thresholds

| Total Score | Rating |
|-------------|--------|
| 85-100 | Master Trainer |
| 70-84 | Certified Trainer |
| 55-69 | Needs Improvement |
| 0-54 | Performance Review |

#### Example Calculation

```
Teacher monthly evaluation:
- Attendance: 22 present out of 24 working days = (22/24) × 100 = 91.67
- Attitude: BDM rated average 4.2 out of 5 = 4.2 × 20 = 84
- Student Interest: 150 completed out of 200 topics = 75%
- Enrollment Impact: 18 students = 18 × 5 = 90

Total Score = (91.67 × 0.30) + (84 × 0.30) + (75 × 0.20) + (90 × 0.20)
            = 27.5 + 25.2 + 15 + 18
            = 85.7%

Rating: Master Trainer
```

---

### BDM Attitude Score Calculation

The BDM proforma converts 1-5 ratings to a 0-100 score:

```
ATTITUDE SCORE = (Average of all 5 ratings) × 20
```

#### Example

```
Ratings given:
- Discipline: 4
- Communication: 4
- Child Handling: 5
- Professionalism: 4
- Content Knowledge: 4

Average = (4 + 4 + 5 + 4 + 4) ÷ 5 = 4.2
Attitude Score = 4.2 × 20 = 84%
```

---

## API Reference

### Student APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/courses/activity-proof/upload/` | POST | Upload activity screenshot |
| `/api/courses/activity-proof/my-proofs/` | GET | List my uploaded proofs |
| `/api/courses/activity-proof/my-proofs/{id}/` | GET | Get specific proof detail |
| `/api/courses/guardian/check-time/` | GET | Check if guardian mode available |
| `/api/courses/guardian/pending-reviews/` | GET | Get sections pending guardian review |
| `/api/courses/guardian/review/{proof_id}/` | POST | Submit guardian approval |
| `/api/courses/guardian/my-reviews/` | GET | List all guardian reviews |
| `/api/courses/scores/my-scores/` | GET | Get all my section scores |
| `/api/courses/scores/my-scores/{topic_id}/` | GET | Get specific topic score |
| `/api/courses/scores/recalculate/{topic_id}/` | POST | Recalculate topic score |
| `/api/courses/topics/{id}/unlock-status/` | GET | Get 5-step unlock status |
| `/api/courses/topics/{id}/validation-steps/` | GET | Get detailed validation steps |
| `/api/courses/topics/{id}/can-access/` | GET | Check if topic is accessible |

### Teacher APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/courses/activity-proof/pending/` | GET | List pending proofs for approval |
| `/api/courses/activity-proof/all/` | GET | List all proofs |
| `/api/courses/activity-proof/{id}/` | GET/PUT | View or update single proof |
| `/api/courses/activity-proof/bulk-approve/` | POST | Bulk approve proofs |
| `/api/courses/activity-proof/bulk-reject/` | POST | Bulk reject proofs |
| `/api/courses/activity-proof/stats/` | GET | Get proof statistics |
| `/api/courses/scores/class-report/` | GET | Get class score report |
| `/api/courses/scores/student/{id}/` | GET | Get specific student's scores |
| `/api/employees/my-evaluation/` | GET | Get own evaluation scores |
| `/api/auth/teacher-attendance/` | GET | Get own attendance records |
| `/api/auth/teacher-logout/` | POST | Logout and clear location |

### BDM APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/employees/bdm/proforma/` | GET | List all proformas |
| `/api/employees/bdm/proforma/` | POST | Create new proforma |
| `/api/employees/bdm/proforma/{id}/` | GET | Get specific proforma |
| `/api/employees/bdm/proforma/{id}/` | PUT | Update proforma |

### Admin APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/employees/teacher-evaluation/` | GET | List all teacher evaluations |
| `/api/employees/teacher-evaluation/{teacher_id}/` | GET | Get specific teacher's evaluations |
| `/api/employees/teacher-evaluation/calculate/` | POST | Calculate/recalculate evaluations |

---

## Troubleshooting

### Common Issues

**Q: My topic won't unlock even though I completed everything.**

A: Check each step:
1. Did you spend at least 5 minutes reading?
2. Did you mark the activity as complete?
3. Did you upload a screenshot?
4. Has the teacher approved your screenshot?
5. Did your guardian approve (outside school hours)?

Use `/api/courses/topics/{id}/validation-steps/` to see exactly where you are.

**Q: Guardian review button is not showing.**

A: Guardian review is only available OUTSIDE school hours. Check:
- `/api/courses/guardian/check-time/`
- School hours are typically 8 AM - 3 PM

**Q: Teacher can't see my proofs.**

A: Make sure:
- You uploaded the proof successfully
- The teacher is assigned to your school
- Check `/api/courses/activity-proof/my-proofs/` to verify upload

**Q: My teacher evaluation score seems wrong.**

A: The score is calculated from:
- Your attendance records
- BDM proforma (if submitted)
- Student progress in your schools
- Student enrollment numbers

Ask admin to recalculate: `/api/employees/teacher-evaluation/calculate/`

---

## Support

For technical issues, contact your system administrator.

For questions about scores or evaluations, contact your school coordinator.

---

*Document Version: 1.0*
*Last Updated: January 2024*
*System: KoderKids ERP Validation System*
