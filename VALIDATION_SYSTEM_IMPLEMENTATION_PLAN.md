# Validation System Implementation Plan

## Overview

This document outlines the comprehensive implementation plan for the Book & Section Validation Flow system based on the requirements document and clarifications.

---

## Key Clarifications Applied

| Original Requirement | Updated Approach |
|---------------------|------------------|
| Teacher uploads screenshot | **Student uploads** their own activity screenshot |
| Teacher tags screenshot | Teacher **bulk approves** with remarks |
| Separate Guardian login | **Student login outside school hours** = Guardian mode |
| 200m geofence radius | **2km geofence radius** |
| Teacher attitude rating (manual) | **BDM proforma** during monthly visits |

---

## Phase Overview

| Phase | Description | Priority | Estimated Models | Estimated Views |
|-------|-------------|----------|------------------|-----------------|
| **Phase 1** | Activity Proof & Teacher Approval | High | 2 | 6 |
| **Phase 2** | Guardian Review (School Hours Logic) | High | 1 | 3 |
| **Phase 3** | Student Score Calculation | Medium | 1 | 2 |
| **Phase 4** | Teacher Evaluation (BDM Proforma) | Medium | 3 | 5 |
| **Phase 5** | Geofence Updates | Low | 0 | 1 |
| **Phase 6** | Modified Unlock Logic | High | 0 | 3 |

---

## PHASE 1: Activity Proof & Teacher Approval

### 1.1 New Models

#### `ActivityProof` Model
```
Location: backend/courses/models.py

Fields:
- student (FK → Student)
- topic (FK → Topic)
- enrollment (FK → CourseEnrollment)
- screenshot (ImageField) - Supabase storage
- screenshot_url (URLField) - For Supabase URL
- software_used (CharField) - Scratch/Python/Canva/AI Tool
- student_notes (TextField) - Optional student comments
- uploaded_at (DateTimeField)
- status: pending | approved | rejected
- teacher_remarks (TextField) - Optional
- teacher_rating: basic | good | excellent
- approved_by (FK → CustomUser)
- approved_at (DateTimeField)
```

#### `ActivityProofBulkAction` Model (for audit)
```
Location: backend/courses/models.py

Fields:
- teacher (FK → CustomUser)
- action_type: approve | reject
- proof_ids (JSONField) - List of proof IDs
- remarks (TextField)
- created_at (DateTimeField)
```

### 1.2 New API Endpoints

| Endpoint | Method | Role | Description |
|----------|--------|------|-------------|
| `/api/courses/activity-proof/upload/` | POST | Student | Upload activity screenshot |
| `/api/courses/activity-proof/my-proofs/` | GET | Student | List student's uploaded proofs |
| `/api/courses/activity-proof/pending/` | GET | Teacher | List pending proofs for approval |
| `/api/courses/activity-proof/bulk-approve/` | POST | Teacher | Bulk approve with rating & remarks |
| `/api/courses/activity-proof/bulk-reject/` | POST | Teacher | Bulk reject with remarks |
| `/api/courses/activity-proof/{id}/` | GET/PUT | Teacher | View/update single proof |

### 1.3 Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `backend/courses/models.py` | MODIFY | Add ActivityProof, ActivityProofBulkAction |
| `backend/courses/proof_views.py` | CREATE | All proof-related views |
| `backend/courses/proof_serializers.py` | CREATE | Serializers for proof models |
| `backend/courses/urls.py` | MODIFY | Add proof endpoints |
| `backend/courses/admin.py` | MODIFY | Register new models |

---

## PHASE 2: Guardian Review (School Hours Logic)

### 2.1 New Models

#### `GuardianReview` Model
```
Location: backend/courses/models.py

Fields:
- student (FK → Student)
- topic (FK → Topic)
- activity_proof (FK → ActivityProof)
- reviewed_at (DateTimeField)
- is_approved (BooleanField)
- reviewer_ip (GenericIPAddressField) - For audit
- review_notes (TextField) - Optional
```

### 2.2 School Hours Logic

```python
# Utility function to check if outside school hours
def is_guardian_time(school):
    """
    Returns True if current time is outside school hours.
    Guardian review button only shows during this time.

    School timing fields needed:
    - school.start_time (TimeField)
    - school.end_time (TimeField)
    """
    now = timezone.localtime().time()

    # If no timing set, assume 8 AM - 3 PM
    start = school.start_time or time(8, 0)
    end = school.end_time or time(15, 0)

    # Outside school hours = Guardian time
    return now < start or now > end
```

### 2.3 New API Endpoints

| Endpoint | Method | Role | Description |
|----------|--------|------|-------------|
| `/api/courses/guardian/pending-reviews/` | GET | Student | Get sections pending guardian review |
| `/api/courses/guardian/review/{proof_id}/` | POST | Student | Submit guardian approval |
| `/api/courses/guardian/check-time/` | GET | Student | Check if guardian mode available |

### 2.4 Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `backend/courses/models.py` | MODIFY | Add GuardianReview |
| `backend/courses/guardian_views.py` | CREATE | Guardian review views |
| `backend/courses/urls.py` | MODIFY | Add guardian endpoints |
| `backend/students/models.py` | MODIFY | Add school timing fields |

---

## PHASE 3: Student Score Calculation

### 3.1 New Models

#### `SectionScore` Model
```
Location: backend/courses/models.py

Fields:
- student (FK → Student)
- topic (FK → Topic) - Section/Activity level
- enrollment (FK → CourseEnrollment)

# Component scores (0-100)
- reading_score (IntegerField) - Based on time spent
- activity_score (IntegerField) - Based on completion
- teacher_rating_score (IntegerField) - Based on proof rating
- guardian_review_score (IntegerField) - 100 if approved, 0 if not

# Weighted total
- total_score (DecimalField) - Auto-calculated
- rating (CharField) - Excellent/Good/Average/Needs Support

- calculated_at (DateTimeField)
```

### 3.2 Score Formula

```python
def calculate_section_score(self):
    """
    Reading: 20%
    Activity Completion: 30%
    Teacher Quality Rating: 30%
    Guardian Review: 20%
    """
    self.total_score = (
        (self.reading_score * 0.20) +
        (self.activity_score * 0.30) +
        (self.teacher_rating_score * 0.30) +
        (self.guardian_review_score * 0.20)
    )

    # Assign rating
    if self.total_score >= 90:
        self.rating = 'excellent'
    elif self.total_score >= 75:
        self.rating = 'good'
    elif self.total_score >= 60:
        self.rating = 'average'
    else:
        self.rating = 'needs_support'
```

### 3.3 New API Endpoints

| Endpoint | Method | Role | Description |
|----------|--------|------|-------------|
| `/api/courses/scores/my-scores/` | GET | Student | Get all section scores |
| `/api/courses/scores/class-report/` | GET | Teacher | Class-wide score report |

### 3.4 Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `backend/courses/models.py` | MODIFY | Add SectionScore |
| `backend/courses/score_views.py` | CREATE | Score calculation views |
| `backend/courses/score_service.py` | CREATE | Score calculation logic |
| `backend/courses/urls.py` | MODIFY | Add score endpoints |

---

## PHASE 4: Teacher Evaluation (BDM Proforma)

### 4.1 New Models

#### `BDMVisitProforma` Model
```
Location: backend/employees/models.py

Fields:
- teacher (FK → CustomUser)
- school (FK → School)
- bdm (FK → CustomUser) - The BDM who filled this
- visit_date (DateField)
- month (IntegerField) - 1-12
- year (IntegerField)

# Rating parameters (1-5 scale)
- discipline_rating (IntegerField)
- communication_rating (IntegerField)
- child_handling_rating (IntegerField)
- professionalism_rating (IntegerField)
- punctuality_rating (IntegerField)

# Calculated
- overall_attitude_score (DecimalField) - Average of above

- remarks (TextField)
- created_at (DateTimeField)
- updated_at (DateTimeField)

class Meta:
    unique_together = ('teacher', 'school', 'month', 'year')
```

#### `TeacherEvaluationScore` Model
```
Location: backend/employees/models.py

Fields:
- teacher (FK → CustomUser)
- month (IntegerField)
- year (IntegerField)

# Component scores (0-100)
- attendance_score (DecimalField) - From TeacherAttendance
- attitude_score (DecimalField) - From BDMVisitProforma
- student_interest_score (DecimalField) - From TopicProgress completion rates
- enrollment_impact_score (DecimalField) - From new student admissions

# Weighted total
- total_score (DecimalField)
- rating (CharField) - Master Trainer / Certified Trainer / Needs Improvement / Performance Review

- calculated_at (DateTimeField)
```

#### `StudentEnrollmentRecord` Model (for tracking new admissions)
```
Location: backend/students/models.py

Fields:
- student (FK → Student)
- enrolled_by_teacher (FK → CustomUser) - Teacher linked to this admission
- school (FK → School)
- enrolled_at (DateTimeField)
- referral_source (CharField) - parent_referral | marketing | other
```

### 4.2 Teacher Score Formula

```python
def calculate_teacher_score(self):
    """
    ERP Attendance (login-based): 30%
    Attitude Rating (BDM proforma): 30%
    Student Interest & Engagement: 20%
    New Enrollment Impact: 20%
    """
    self.total_score = (
        (self.attendance_score * 0.30) +
        (self.attitude_score * 0.30) +
        (self.student_interest_score * 0.20) +
        (self.enrollment_impact_score * 0.20)
    )

    # Assign rating
    if self.total_score >= 85:
        self.rating = 'master_trainer'
    elif self.total_score >= 70:
        self.rating = 'certified_trainer'
    elif self.total_score >= 55:
        self.rating = 'needs_improvement'
    else:
        self.rating = 'performance_review'
```

### 4.3 New API Endpoints

| Endpoint | Method | Role | Description |
|----------|--------|------|-------------|
| `/api/employees/bdm/proforma/` | GET/POST | BDM | List/create visit proformas |
| `/api/employees/bdm/proforma/{id}/` | GET/PUT | BDM | View/update proforma |
| `/api/employees/teacher-evaluation/` | GET | Admin | All teachers' evaluation scores |
| `/api/employees/teacher-evaluation/{id}/` | GET | Admin/Teacher | Single teacher evaluation |
| `/api/employees/teacher-evaluation/calculate/` | POST | Admin | Trigger monthly calculation |

### 4.4 Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `backend/employees/models.py` | MODIFY | Add BDMVisitProforma, TeacherEvaluationScore |
| `backend/employees/evaluation_views.py` | CREATE | BDM proforma & evaluation views |
| `backend/employees/evaluation_serializers.py` | CREATE | Serializers |
| `backend/employees/evaluation_service.py` | CREATE | Score calculation logic |
| `backend/employees/urls.py` | MODIFY | Add evaluation endpoints |
| `backend/students/models.py` | MODIFY | Add StudentEnrollmentRecord |

---

## PHASE 5: Geofence Updates

### 5.1 Changes Required

#### Update Geofence Radius
```
File: backend/authentication/geo_utils.py

Change:
- GEOFENCE_RADIUS = 200  # meters
+ GEOFENCE_RADIUS = 2000  # meters (2km)
```

#### Clear Location on Logout
```
File: backend/authentication/views.py

Add logout handler that:
1. Gets current TeacherAttendance for today
2. Sets logout_time field
3. Optionally clears lat/long for privacy
```

### 5.2 New Fields for TeacherAttendance

```python
# Add to TeacherAttendance model
logout_time = models.DateTimeField(null=True, blank=True)
logout_latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
logout_longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
```

### 5.3 Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `backend/authentication/geo_utils.py` | MODIFY | Change radius to 2km |
| `backend/authentication/views.py` | MODIFY | Add logout location clearing |
| `backend/authentication/attendance_service.py` | MODIFY | Add logout handling |
| `backend/students/models.py` | MODIFY | Add logout fields to TeacherAttendance |

---

## PHASE 6: Modified Unlock Logic

### 6.1 New Unlock Validation

```python
def is_section_unlocked(student, topic):
    """
    Section unlock requires ALL conditions:
    1. Reading completed (time tracked >= minimum)
    2. Activity completed (TopicProgress.status = 'completed')
    3. Screenshot uploaded (ActivityProof exists)
    4. Teacher approved (ActivityProof.status = 'approved')
    5. Guardian reviewed (GuardianReview.is_approved = True)
    """

    # Check reading completion
    progress = TopicProgress.objects.filter(
        enrollment__student=student,
        topic=topic
    ).first()

    if not progress or progress.status != 'completed':
        return False, "Complete the reading first"

    # Check activity proof
    proof = ActivityProof.objects.filter(
        student=student,
        topic=topic
    ).first()

    if not proof:
        return False, "Upload your activity screenshot"

    if proof.status != 'approved':
        return False, "Waiting for teacher approval"

    # Check guardian review
    guardian_review = GuardianReview.objects.filter(
        student=student,
        topic=topic,
        is_approved=True
    ).first()

    if not guardian_review:
        return False, "Waiting for guardian review"

    return True, "Section complete!"
```

### 6.2 Files to Modify

| File | Action | Description |
|------|--------|-------------|
| `backend/courses/views.py` | MODIFY | Update topic_content unlock check |
| `backend/courses/models.py` | MODIFY | Update TopicProgress.is_unlocked() |
| `backend/courses/unlock_service.py` | CREATE | Centralized unlock validation |

---

## Database Migrations Summary

| Phase | Migration Name | Models |
|-------|---------------|--------|
| Phase 1 | `0007_activity_proof` | ActivityProof, ActivityProofBulkAction |
| Phase 2 | `0008_guardian_review` | GuardianReview + School timing fields |
| Phase 3 | `0009_section_score` | SectionScore |
| Phase 4 | `0010_teacher_evaluation` | BDMVisitProforma, TeacherEvaluationScore, StudentEnrollmentRecord |
| Phase 5 | `0011_attendance_logout` | TeacherAttendance logout fields |

---

## File Structure After Implementation

```
backend/
├── authentication/
│   ├── geo_utils.py          # MODIFY - 2km radius
│   ├── attendance_service.py # MODIFY - logout handling
│   └── views.py              # MODIFY - logout endpoint
│
├── courses/
│   ├── models.py             # MODIFY - Add 4 new models
│   ├── proof_views.py        # NEW - Activity proof endpoints
│   ├── proof_serializers.py  # NEW - Proof serializers
│   ├── guardian_views.py     # NEW - Guardian review endpoints
│   ├── score_views.py        # NEW - Score endpoints
│   ├── score_service.py      # NEW - Score calculation
│   ├── unlock_service.py     # NEW - Unlock validation
│   ├── urls.py               # MODIFY - Add new endpoints
│   └── admin.py              # MODIFY - Register models
│
├── employees/
│   ├── models.py             # MODIFY - Add evaluation models
│   ├── evaluation_views.py   # NEW - BDM proforma & evaluation
│   ├── evaluation_serializers.py # NEW
│   ├── evaluation_service.py # NEW - Score calculation
│   └── urls.py               # MODIFY - Add endpoints
│
└── students/
    └── models.py             # MODIFY - School timing, enrollment tracking
```

---

## Implementation Order (Recommended)

```
Week 1: Phase 1 (Activity Proof) + Phase 5 (Geofence)
        - Student can upload screenshots
        - Teacher can bulk approve
        - Geofence updated to 2km

Week 2: Phase 2 (Guardian Review) + Phase 6 (Unlock Logic)
        - Guardian review outside school hours
        - Full 5-step unlock validation

Week 3: Phase 3 (Student Scores)
        - Weighted score calculation
        - Student dashboard scores

Week 4: Phase 4 (Teacher Evaluation)
        - BDM proforma system
        - Monthly teacher scores
```

---

## API Summary

### Student APIs
| Endpoint | Description |
|----------|-------------|
| `POST /api/courses/activity-proof/upload/` | Upload screenshot |
| `GET /api/courses/activity-proof/my-proofs/` | My uploaded proofs |
| `GET /api/courses/guardian/pending-reviews/` | Sections needing guardian review |
| `POST /api/courses/guardian/review/{id}/` | Submit guardian approval |
| `GET /api/courses/scores/my-scores/` | My section scores |

### Teacher APIs
| Endpoint | Description |
|----------|-------------|
| `GET /api/courses/activity-proof/pending/` | Pending proofs for approval |
| `POST /api/courses/activity-proof/bulk-approve/` | Bulk approve proofs |
| `GET /api/courses/scores/class-report/` | Class score report |

### BDM APIs
| Endpoint | Description |
|----------|-------------|
| `GET/POST /api/employees/bdm/proforma/` | Visit proformas |
| `PUT /api/employees/bdm/proforma/{id}/` | Update proforma |

### Admin APIs
| Endpoint | Description |
|----------|-------------|
| `GET /api/employees/teacher-evaluation/` | All teacher evaluations |
| `POST /api/employees/teacher-evaluation/calculate/` | Trigger monthly calculation |

---

## Frontend Components Needed

| Component | Role | Description |
|-----------|------|-------------|
| `ActivityProofUpload` | Student | Screenshot upload form |
| `ProofApprovalList` | Teacher | Bulk approval interface |
| `GuardianReviewPanel` | Student/Guardian | Review & approve section |
| `StudentScoreDashboard` | Student | View section scores |
| `BDMProformaForm` | BDM | Monthly teacher rating form |
| `TeacherEvaluationDashboard` | Admin | Teacher performance overview |

---

## Notes

1. **Supabase Storage**: Activity screenshots will use existing Supabase storage integration
2. **School Timing**: Schools need `start_time` and `end_time` fields for guardian mode
3. **BDM Role**: Ensure BDM users have proper role assignment in CustomUser
4. **Cron Jobs**: Consider adding monthly cron for auto-calculating teacher scores
