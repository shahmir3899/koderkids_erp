# LMS Progression — Production Fix Plan

## Identified Bugs (Root Cause Analysis)

| # | Bug | Root Cause | Impact |
|---|-----|-----------|--------|
| B1 | Student lands on chapter intro page instead of first lesson | `findFirstUnlockedTopic` does not skip `type='chapter'` nodes | Immediate wrong-screen on book open |
| B2 | Completing "first topic" shows Chapter Complete celebration | When student completes the chapter node (B1), `currentTopic.type === 'chapter'` → `celebType = 'chapter'` | Confusing UX — student thinks chapter is done after 0 lessons |
| B3 | Auto-navigation skips lessons and jumps to next chapter | `markTopicComplete` only updates `[topicId].status`; next sibling's `is_unlocked` stays stale in local state → `findNextTopic` sees it as locked and skips past to the next chapter node (always unlocked) | Student misses lessons in the middle of a chapter |
| B4 | `findNextTopic` and `findPreviousTopic` include chapter nodes | Neither function filters `type !== 'chapter'` before returning | Prev/Next buttons navigate into structural chapter pages |
| B5 | `course_completed` fires incorrectly | `total_required = topics.filter(is_required=True).count()` (includes chapters) but `completed = TopicProgress.filter(status='completed').count()` (no `is_required` filter) — they use different sets | Course marked complete at wrong time; wrong % shown |
| B6 | `get_progress_percentage()` shows wrong % | Same mismatch as B5 in the model method | Progress bar inaccurate on My Courses page |
| B7 | Chapters never auto-complete in sidebar | No backend logic marks a chapter as complete when all its required children are done | Sidebar never shows a chapter checkmark even after completing all lessons |

---

## Production-Standard Behaviour to Implement

1. **Chapters are structural containers.** Students never manually complete a chapter. There is no "Mark Complete" button on a chapter page; instead it shows a "Start First Lesson →" button.
2. **Navigation skips chapter nodes.** `findFirstUnlockedTopic` and `findNextTopic` and `findPreviousTopic` only return lesson/activity nodes.
3. **Unlock propagates immediately.** When a lesson is completed the very next sibling's `is_unlocked` is updated in local state without a page reload.
4. **Chapter auto-completes.** Backend detects when all required children of a chapter are done and marks the chapter `TopicProgress.status = 'completed'`. The API response includes this event so the sidebar checkmark appears immediately.
5. **Progress counts are consistent.** Only lessons and activities (not chapter nodes) count toward `total_required` and `completed`. The same filter applies to both sides of every calculation.

---

## Phase 1 — Navigation Fixes (Frontend) ★ Highest Priority

### 1-A. Skip chapters in `findFirstUnlockedTopic`

**File:** `frontend/src/contexts/LMSContext.js`

**Current behaviour:** Returns the first node where `is_unlocked && status !== 'completed'` — which is the first chapter, because chapters have `is_unlocked: true` and start as `not_started`.

**Change:**
```js
// BEFORE
const findFirstUnlockedTopic = useCallback((topics) => {
  for (const topic of topics) {
    const status = getTopicStatus(topic.id);
    if (status.is_unlocked && status.status !== 'completed') {
      return topic;
    }
    if (topic.children?.length) {
      const found = findFirstUnlockedTopic(topic.children);
      if (found) return found;
    }
  }
  return topics[0]; // Fallback — can return a chapter
}, [getTopicStatus]);

// AFTER
const findFirstUnlockedTopic = useCallback((topics) => {
  for (const topic of topics) {
    if (topic.children?.length) {
      // Recurse into chapter first (don't return the chapter itself)
      const found = findFirstUnlockedTopic(topic.children);
      if (found) return found;
    } else {
      // Leaf node (lesson / activity)
      const status = getTopicStatus(topic.id);
      if (status.is_unlocked && status.status !== 'completed') {
        return topic;
      }
    }
  }
  return null; // All complete or no accessible topic
}, [getTopicStatus]);
```

**Why:** Always descend into children before considering the node itself. Chapters have children; lessons and activities do not. This guarantees chapters are never returned.

---

### 1-B. Skip chapters in `findNextTopic`

**File:** `frontend/src/contexts/LMSContext.js`

**Change:**
```js
// BEFORE
if (found.value) {
  const status = getTopicStatus(topic.id);
  if (status.is_unlocked) {
    return topic;  // Can return a chapter
  }
}

// AFTER
if (found.value) {
  // Only return leaf topics (lessons / activities), never chapters
  if (topic.type !== 'chapter') {
    const status = getTopicStatus(topic.id);
    if (status.is_unlocked) {
      return topic;
    }
  }
}
```

---

### 1-C. Skip chapters in `findPreviousTopic`

**File:** `frontend/src/contexts/LMSContext.js`

**Change:**
```js
// BEFORE
const status = getTopicStatus(topic.id);
if (status.is_unlocked || status.status === 'completed') {
  prev.value = topic;  // Can store a chapter as "previous"
}

// AFTER
// Only track leaf nodes as valid "previous" destinations
if (topic.type !== 'chapter') {
  const status = getTopicStatus(topic.id);
  if (status.is_unlocked || status.status === 'completed') {
    prev.value = topic;
  }
}
```

---

### 1-D. Block Mark Complete on chapter nodes — BookViewerPage

**File:** `frontend/src/pages/lms/BookViewerPage.js`

The `SmartCompleteButton` (or equivalent) should not render when `currentTopic.type === 'chapter'`. Instead, show a "Go to First Lesson →" button.

**Change in the JSX render section:**
```jsx
{/* BEFORE — button always shows */}
<SmartCompleteButton ... />

{/* AFTER — chapters get a navigation button, lessons get the complete button */}
{currentTopic?.type === 'chapter' ? (
  <button onClick={handleNext} style={styles.startLessonBtn}>
    Start First Lesson →
  </button>
) : (
  <SmartCompleteButton ... />
)}
```

Also guard the `handleComplete` callback itself as a safety net:
```js
const handleComplete = useCallback(async () => {
  if (!currentTopic || isCompleting) return;
  if (currentTopic.type === 'chapter') return;  // ← guard
  // ... rest of existing logic
```

---

## Phase 2 — Local State: Propagate Unlock After Completion (Frontend + Backend)

### 2-A. Backend: Return `next_unlocked_topic_id` in `topic_complete` response

**File:** `backend/courses/views.py`, function `topic_complete` (~line 745)

After marking the topic complete, look up the next sibling in MPTT order and include its ID in the response.

**Add before the `return Response(...)` at the end:**
```python
# Find the next sibling that just became unlocked
next_unlocked_topic_id = None
next_sibling = topic.get_next_sibling()
if next_sibling:
    next_unlocked_topic_id = next_sibling.id

# Also check if the parent chapter auto-completed (Phase 3 logic goes here)
chapter_completed_id = None

return Response({
    'progress': TopicProgressSerializer(progress).data,
    'course_completed': course_completed,
    'next_unlocked_topic_id': next_unlocked_topic_id,  # ← new
    'chapter_completed_id': chapter_completed_id,       # ← new (Phase 3)
})
```

---

### 2-B. Frontend: Apply `next_unlocked_topic_id` to local state

**File:** `frontend/src/contexts/LMSContext.js`, `markTopicComplete`

```js
// BEFORE
setTopicProgress((prev) => ({
  ...prev,
  [topicId]: { ...prev[topicId], status: 'completed' },
}));

// AFTER
setTopicProgress((prev) => {
  const updated = {
    ...prev,
    [topicId]: { ...prev[topicId], status: 'completed' },
  };
  // Immediately unlock the next sibling so findNextTopic finds it
  if (result.next_unlocked_topic_id) {
    const nid = result.next_unlocked_topic_id;
    updated[nid] = { ...prev[nid], status: prev[nid]?.status || 'not_started', is_unlocked: true };
  }
  return updated;
});
```

This eliminates the stale `is_unlocked: false` for the next lesson so auto-navigation finds it correctly.

---

## Phase 3 — Chapter Auto-Completion (Backend + Frontend)

### 3-A. Backend: Auto-mark chapter complete when all required children are done

**File:** `backend/courses/views.py`, function `topic_complete`

Insert after `progress.mark_completed()`:

```python
# Auto-complete parent chapter if all its required children are now done
chapter_completed_id = None
parent = topic.parent
if parent and parent.type == 'chapter':
    required_children = parent.get_children().filter(is_required=True)
    required_child_ids = list(required_children.values_list('id', flat=True))
    if required_child_ids:
        completed_child_count = TopicProgress.objects.filter(
            enrollment=enrollment,
            topic_id__in=required_child_ids,
            status='completed'
        ).count()
        if completed_child_count >= len(required_child_ids):
            # All required lessons in this chapter are done → mark chapter complete
            chapter_progress, _ = TopicProgress.objects.get_or_create(
                enrollment=enrollment,
                topic=parent
            )
            if chapter_progress.status != 'completed':
                chapter_progress.status = 'completed'
                chapter_progress.completed_at = timezone.now()
                chapter_progress.save()
                chapter_completed_id = parent.id
```

Then include `chapter_completed_id` in the response (already added in 2-A).

---

### 3-B. Frontend: Reflect chapter auto-completion in local state

**File:** `frontend/src/contexts/LMSContext.js`, `markTopicComplete`

Extend the state update from 2-B:
```js
if (result.chapter_completed_id) {
  const cid = result.chapter_completed_id;
  updated[cid] = { ...prev[cid], status: 'completed', is_unlocked: true };
}
```

The sidebar's `getTopicStatus` reads from `topicProgress` directly, so the chapter checkmark appears immediately after the lesson-complete response returns — no reload required.

---

## Phase 4 — Progress Accuracy (Backend)

### 4-A. Fix count mismatch in `topic_complete` view

**File:** `backend/courses/views.py` (~line 796)

Chapters (structural containers) must be excluded from both sides of the completion check. Apply a consistent `type__in=['lesson', 'activity']` filter.

```python
# BEFORE (manual enrollment path)
total_required = enrollment.course.topics.filter(is_required=True).count()
completed = TopicProgress.objects.filter(
    enrollment=enrollment,
    status='completed'
).count()

# AFTER
CONTENT_TYPES = ['lesson', 'activity']
total_required = enrollment.course.topics.filter(
    is_required=True, type__in=CONTENT_TYPES
).count()
completed = TopicProgress.objects.filter(
    enrollment=enrollment,
    topic__type__in=CONTENT_TYPES,
    status='completed'
).count()
```

Apply the same `CONTENT_TYPES` filter to the LessonPlan access path (the `accessible_topic_ids` block above it).

---

### 4-B. Fix `get_progress_percentage()` in model

**File:** `backend/courses/models.py` (~line 56)

```python
# BEFORE
def get_progress_percentage(self):
    total_topics = self.course.topics.filter(is_required=True).count()
    completed = self.topic_progress.filter(status='completed').count()
    return round((completed / total_topics) * 100, 1)

# AFTER
CONTENT_TYPES = ['lesson', 'activity']
def get_progress_percentage(self):
    total_topics = self.course.topics.filter(
        is_required=True, type__in=CONTENT_TYPES
    ).count()
    if total_topics == 0:
        return 0
    completed = self.topic_progress.filter(
        status='completed', topic__type__in=CONTENT_TYPES
    ).count()
    return round((completed / total_topics) * 100, 1)
```

---

### 4-C. Fix `course_progress` view (B5 applies there too)

**File:** `backend/courses/views.py`, `course_progress` view (~line 663)

```python
# BEFORE
total_topics = enrollment.course.topics.filter(is_required=True).count()
completed_topics = progress_records.filter(status='completed').count()

# AFTER
CONTENT_TYPES = ['lesson', 'activity']
total_topics = enrollment.course.topics.filter(
    is_required=True, type__in=CONTENT_TYPES
).count()
completed_topics = progress_records.filter(
    status='completed', topic__type__in=CONTENT_TYPES
).count()
```

---

## Phase 5 — Sidebar: Derive Chapter Status from Children (Frontend, optional polish)

Currently the sidebar reads `topicProgress[chapterId].status` directly. After Phase 3 this is updated via the API. However, as a belt-and-suspenders fallback (e.g. if a student loads a course mid-way through), the sidebar can also derive chapter completion from children.

**File:** `frontend/src/components/book/BookSidebar.js`

Extend `getTopicStatus` to optionally derive chapter status:
```js
const getTopicStatus = useCallback((topicId, childTopics = []) => {
  const progress = topicProgress[topicId];
  let status = progress?.status || 'not_started';

  // Derive chapter completion from children if backend hasn't confirmed it yet
  if (status !== 'completed' && childTopics.length > 0) {
    const allChildrenDone = childTopics.every(
      (child) => topicProgress[child.id]?.status === 'completed'
    );
    if (allChildrenDone) status = 'completed';
  }

  return {
    status,
    is_unlocked: progress?.is_unlocked !== false,
  };
}, [topicProgress]);
```

Pass `topic.children` when calling for chapter nodes in `renderTopicNode`.

---

## Implementation Order

```
Phase 1-A  findFirstUnlockedTopic   LMSContext.js          30 min
Phase 1-B  findNextTopic            LMSContext.js          15 min
Phase 1-C  findPreviousTopic        LMSContext.js          10 min
Phase 1-D  Block complete on chapter BookViewerPage.js     20 min
─────────────────────────────────────────────────────────────────
Phase 2-A  next_unlocked in API     views.py               20 min
Phase 2-B  Apply unlock locally     LMSContext.js          15 min
─────────────────────────────────────────────────────────────────
Phase 3-A  Chapter auto-complete    views.py               30 min
Phase 3-B  Reflect in local state   LMSContext.js          10 min
─────────────────────────────────────────────────────────────────
Phase 4-A  Fix course_completed     views.py               15 min
Phase 4-B  Fix progress_percentage  models.py              10 min
Phase 4-C  Fix course_progress view views.py               10 min
─────────────────────────────────────────────────────────────────
Phase 5    Sidebar derived status   BookSidebar.js         20 min
```

**Total estimated effort:** ~3 hours for all phases.

---

## Files Changed Summary

| File | Changes |
|------|---------|
| `frontend/src/contexts/LMSContext.js` | Phase 1-A, 1-B, 1-C, 2-B, 3-B |
| `frontend/src/pages/lms/BookViewerPage.js` | Phase 1-D |
| `frontend/src/components/book/BookSidebar.js` | Phase 5 |
| `backend/courses/views.py` | Phase 2-A, 3-A, 4-A, 4-C |
| `backend/courses/models.py` | Phase 4-B |

No database migrations required — all changes are logic only. No new API endpoints.
