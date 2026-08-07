# LMS Progression Guidelines (User Expectations)

This page explains what users should expect in LMS after the progression improvements.

## Who this is for

- Students using Book Viewer
- Teachers supporting student learning flow
- Admins reviewing course progress behavior

## What students will notice now

1. Course opens at a real learning topic
- Students are taken to the first unlocked lesson/activity.
- Chapter heading pages are treated as structure, not as completion steps.

2. Chapter pages are no longer manually completed
- On a chapter page, students should use the "Start First Lesson" action.
- The system no longer treats chapter intro as a topic to complete.

3. Next/Previous navigation is content-first
- Next and Previous move between lessons/activities.
- Navigation no longer jumps into chapter containers as destination topics.

4. Completing a lesson unlocks the next one immediately
- After marking a lesson complete, the next eligible lesson unlocks without needing reload.
- Auto-advance should continue through lessons in order.

5. Chapter completion is automatic
- A chapter is marked complete when all required lessons inside that chapter are complete.
- Students do not need to manually complete the chapter itself.

6. Progress percentages are more accurate
- Only content topics (lessons/activities) count toward progress.
- Chapter structure nodes are excluded from completion percentage math.

## Celebration behavior

- Topic celebration appears when a lesson/activity is completed.
- Chapter celebration appears only when chapter completion criteria are met automatically.
- Course celebration appears only when all required content topics are completed.

## Teacher/Admin expectations

1. Student flow should be sequential and predictable
- Students move through unlocked content topics in order.
- Random jumps to next chapter after one lesson should no longer happen.

2. Progress reporting should align better with actual learning completion
- Course completion is based on required learning content, not structural chapter nodes.

3. Sidebar chapter checkmarks
- Chapters show complete after all required child lessons are complete.
- In most cases this appears immediately after the final required lesson in that chapter.

## Known behavior to keep in mind

1. Existing historical data
- Legacy progress records created before this change may still contain chapter-level statuses.
- Current navigation/completion logic prioritizes content-topic progression.

2. Required vs optional topics
- Only required content topics count toward course completion.
- Optional topics can still be learned but do not block course completion.

## Quick support checklist (if a user reports odd progression)

1. Confirm the student is in the intended course and topic path.
2. Check whether the reported topic is a chapter node or a lesson/activity.
3. Verify topic required flags are configured correctly.
4. Re-open the course once to refresh any stale client state.
5. If issue persists, capture student ID, course ID, topic ID, and timestamp for backend trace.

## Change intent summary

These changes were designed to make progression production-safe by enforcing:

- Structural chapter nodes for organization
- Content nodes for completion and sequencing
- Consistent completion counting logic across APIs and UI
