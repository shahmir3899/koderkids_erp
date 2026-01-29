# ============================================
# UNLOCK VALIDATION SERVICE
# ============================================
# Centralized logic for the 5-step section unlock validation:
# 1. Reading completed (time tracked >= minimum)
# 2. Activity completed (TopicProgress.status = 'completed')
# 3. Screenshot uploaded (ActivityProof exists)
# 4. Teacher approved (ActivityProof.status = 'approved')
# 5. Guardian reviewed (GuardianReview.is_approved = True)

from .models import TopicProgress, ActivityProof, GuardianReview, CourseEnrollment


class UnlockStatus:
    """
    Container for unlock validation result.
    """
    def __init__(self, is_unlocked, step, message, details=None):
        self.is_unlocked = is_unlocked
        self.step = step  # Current step number (1-5) or 6 if complete
        self.message = message
        self.details = details or {}

    def to_dict(self):
        return {
            'is_unlocked': self.is_unlocked,
            'current_step': self.step,
            'message': self.message,
            'details': self.details
        }


def get_section_unlock_status(student, topic, enrollment=None):
    """
    Check if a section/topic is unlocked for a student.

    The 5-step validation process:
    1. Reading: Time spent on topic >= minimum (e.g., 5 minutes)
    2. Activity: TopicProgress status is 'completed'
    3. Screenshot: ActivityProof exists for this topic
    4. Teacher Approval: ActivityProof.status is 'approved'
    5. Guardian Review: GuardianReview exists and is_approved is True

    Returns:
        UnlockStatus with current step and message
    """
    if not enrollment:
        enrollment = CourseEnrollment.objects.filter(
            student=student,
            course=topic.book,
            status='active'
        ).first()

    if not enrollment:
        return UnlockStatus(
            is_unlocked=False,
            step=0,
            message="Not enrolled in this course",
            details={'enrolled': False}
        )

    # Get topic progress
    progress = TopicProgress.objects.filter(
        enrollment=enrollment,
        topic=topic
    ).first()

    details = {
        'enrolled': True,
        'reading': {
            'completed': False,
            'time_spent': 0,
            'minimum_required': 300,  # 5 minutes
        },
        'activity': {
            'completed': False,
            'status': 'not_started'
        },
        'screenshot': {
            'uploaded': False,
            'proof_id': None
        },
        'teacher_approval': {
            'approved': False,
            'rating': None,
            'remarks': ''
        },
        'guardian_review': {
            'reviewed': False,
            'approved': False
        }
    }

    # Step 1: Reading Completion
    if not progress:
        return UnlockStatus(
            is_unlocked=False,
            step=1,
            message="Start reading this topic",
            details=details
        )

    details['reading']['time_spent'] = progress.time_spent_seconds
    min_reading_time = 300  # 5 minutes in seconds

    if progress.time_spent_seconds < min_reading_time:
        details['reading']['completed'] = False
        return UnlockStatus(
            is_unlocked=False,
            step=1,
            message=f"Keep reading! {max(0, min_reading_time - progress.time_spent_seconds)} seconds remaining",
            details=details
        )

    details['reading']['completed'] = True

    # Step 2: Activity Completion
    details['activity']['status'] = progress.status

    if progress.status != 'completed':
        details['activity']['completed'] = False
        return UnlockStatus(
            is_unlocked=False,
            step=2,
            message="Complete the activity for this topic",
            details=details
        )

    details['activity']['completed'] = True

    # Step 3: Screenshot Upload
    proof = ActivityProof.objects.filter(
        student=student,
        topic=topic
    ).first()

    if not proof:
        return UnlockStatus(
            is_unlocked=False,
            step=3,
            message="Upload a screenshot of your completed activity",
            details=details
        )

    details['screenshot']['uploaded'] = True
    details['screenshot']['proof_id'] = proof.id

    # Step 4: Teacher Approval
    details['teacher_approval']['status'] = proof.status

    if proof.status == 'rejected':
        details['screenshot']['uploaded'] = False  # Reset to prompt re-upload
        return UnlockStatus(
            is_unlocked=False,
            step=3,
            message=f"Your screenshot was rejected. {proof.teacher_remarks or 'Please re-upload.'}",
            details=details
        )

    if proof.status == 'pending':
        return UnlockStatus(
            is_unlocked=False,
            step=4,
            message="Waiting for teacher to review your activity",
            details=details
        )

    # Proof is approved
    details['teacher_approval']['approved'] = True
    details['teacher_approval']['rating'] = proof.teacher_rating
    details['teacher_approval']['remarks'] = proof.teacher_remarks

    # Step 5: Guardian Review
    guardian_review = GuardianReview.objects.filter(
        student=student,
        topic=topic
    ).first()

    if not guardian_review:
        # Check if it's guardian time
        school = student.school
        is_guardian_time = school.is_guardian_time() if school else True

        return UnlockStatus(
            is_unlocked=False,
            step=5,
            message=(
                "Ask your guardian to review this activity"
                if is_guardian_time
                else "Guardian review available outside school hours"
            ),
            details=details
        )

    details['guardian_review']['reviewed'] = True
    details['guardian_review']['approved'] = guardian_review.is_approved

    if not guardian_review.is_approved:
        return UnlockStatus(
            is_unlocked=False,
            step=5,
            message="Guardian has not approved this activity yet",
            details=details
        )

    # All steps completed!
    return UnlockStatus(
        is_unlocked=True,
        step=6,
        message="Section complete! Next section unlocked.",
        details=details
    )


def is_section_unlocked(student, topic, enrollment=None):
    """
    Simple boolean check if section is unlocked.
    """
    status = get_section_unlock_status(student, topic, enrollment)
    return status.is_unlocked


def get_next_section(topic):
    """
    Get the next sibling topic after this one.
    """
    return topic.get_next_sibling()


def can_access_topic(student, topic, enrollment=None):
    """
    Check if a student can access a topic.

    Rules:
    - Chapters are always accessible
    - First lesson in a chapter is always accessible
    - Other lessons require previous lesson to be fully unlocked (5 steps)
    """
    # Chapters are always accessible
    if topic.type == 'chapter' or topic.parent is None:
        return True, "Chapter is accessible"

    # First lesson in chapter (no previous sibling) is accessible
    previous = topic.get_previous_sibling()
    if not previous:
        return True, "First lesson in chapter"

    # Check if previous topic is fully unlocked
    if is_section_unlocked(student, previous, enrollment):
        return True, "Previous section completed"

    return False, "Complete the previous section first"


def get_topic_validation_steps(student, topic, enrollment=None):
    """
    Get the 5-step validation status for a topic.
    Returns a list of steps with their completion status.
    """
    status = get_section_unlock_status(student, topic, enrollment)

    steps = [
        {
            'step': 1,
            'name': 'Reading',
            'description': 'Spend time reading the content',
            'completed': status.details.get('reading', {}).get('completed', False),
            'is_current': status.step == 1
        },
        {
            'step': 2,
            'name': 'Activity',
            'description': 'Complete the activity',
            'completed': status.details.get('activity', {}).get('completed', False),
            'is_current': status.step == 2
        },
        {
            'step': 3,
            'name': 'Screenshot',
            'description': 'Upload proof of completion',
            'completed': status.details.get('screenshot', {}).get('uploaded', False),
            'is_current': status.step == 3
        },
        {
            'step': 4,
            'name': 'Teacher Review',
            'description': 'Wait for teacher approval',
            'completed': status.details.get('teacher_approval', {}).get('approved', False),
            'is_current': status.step == 4
        },
        {
            'step': 5,
            'name': 'Guardian Review',
            'description': 'Get guardian approval',
            'completed': status.details.get('guardian_review', {}).get('approved', False),
            'is_current': status.step == 5
        }
    ]

    return {
        'is_complete': status.is_unlocked,
        'current_step': status.step,
        'message': status.message,
        'steps': steps
    }
