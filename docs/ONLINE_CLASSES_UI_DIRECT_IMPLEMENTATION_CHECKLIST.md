# Online Classes UI Direct Implementation Checklist

Last Updated: May 21, 2026
Owner: Frontend (online classes)
Reference: target visual from shared classroom screenshot

---

## Goal

Update classroom UI to match the reference look while keeping existing LiveKit and control behavior intact.

---

## Scope (Items 3 to 6)

1. Header and live status clarity
2. Main video hierarchy and composition
3. Bottom controls visual grouping and readability
4. Overall visual quality and consistency

---

## File Mapping

### Primary implementation files

- `frontend/src/pages/online-classes/ClassRoomPage.js`
  - Header UI
  - Main stage layout
  - PiP positioning
  - Control bar grouping
  - Sidebar/chat shell

### Validation file

- `frontend/src/pages/online-classes/ClassRoomPage.test.js`
  - DOM structure expectations
  - Control labels and interaction assumptions

### Optional extraction (later cleanup)

- `frontend/src/pages/online-classes/classroomStyles.js` (optional, phase 4)
  - Move inline style map out for maintainability after visual freeze

---

## Direct Task Checklist

## Phase 1: Header and live status (Item 3)

Status: COMPLETE (implemented in this chat)

- [x] Ensure top header always visible and readable over video.
- [x] Keep session title with fallback when session metadata is unavailable.
- [x] Keep live badge high-contrast and non-intrusive.
- [x] Keep participant count badge aligned and updated from room state.

Definition of done:

- Header text does not clip at common desktop widths.
- Live badge is visible at a glance.
- Participant count remains correct while users join/leave.

---

## Phase 2: Video hierarchy and composition (Item 4)

Status: BASELINE COMPLETE (implemented and validated in this chat)

Implemented in `ClassRoomPage.js`:

- [x] Added centered `videoStage` container to improve main-video focus.
- [x] Introduced `participantGrid` for more consistent remote tile layout.
- [x] Upgraded `RemoteTile` visual container (border, radius, depth, min height).
- [x] Upgraded `ScreenShareTile` prominence and max-height balancing.
- [x] Strengthened empty-state visual hierarchy with larger icon and clearer text.
- [x] Refined local PiP card size and elevation for better readability.

Remaining optional refinements in phase 2:

- [x] Add responsive scaling for PiP width and stage paddings.
- [x] Add reduced-height-safe visual sizing through clamp-based typography and card sizing.
- [ ] Fine-tune sidebar-open layout balance against stage width during manual QA.

Definition of done:

- Main stage is visually dominant.
- Remote videos stay readable and not cramped.
- Empty state looks intentional, not sparse.
- PiP avoids collision with control bar and remains legible.

---

## Phase 3: Controls refinement (Item 5)

Status: BASELINE COMPLETE (implemented in this chat)

- [x] Normalize control button widths and spacing in the center pill.
- [x] Verify icon and label alignment for all control states.
- [x] Keep leave and end class actions visually separated and stable.
- [x] Ensure no overlap with PiP across desktop and laptop heights.

Definition of done:

- Controls are balanced and non-overlapping.
- End class action is clearly distinct and intentional.

---

## Phase 4: Visual polish and consistency (Item 6)

Status: BASELINE COMPLETE (implemented in this chat)

- [x] Align surface treatments (blur, border, elevation) across header, stage, sidebar, controls.
- [x] Improve chat panel depth and input contrast consistency.
- [x] Align text scale and weight hierarchy across status, headings, utility labels.
- [ ] Optional style extraction to a shared style module after final review.

Definition of done:

- UI reads as one cohesive design language.
- Classroom feels modern and focused during live sessions.

---

## Validation Checklist

- [ ] Run `ClassRoomPage.test.js` and confirm pass.
- [ ] Manual desktop test (1366x768 and 1536x864).
- [ ] Manual tablet-width test (~1024).
- [ ] Manual mobile-width test (390/430) for clipping and control access.
- [ ] Verify states: empty room, active room, sidebar open, screen share on.
- [ ] Capture before/after screenshots for sign-off against the reference image.

---

## Risks and notes

- Inline style map is large; small visual changes can accidentally affect unrelated states.
- Media-query-like responsiveness is limited with raw inline styles; may require runtime width checks or class-based CSS in a follow-up.
- Existing tests focus behavior more than visual layout; manual QA remains required.
