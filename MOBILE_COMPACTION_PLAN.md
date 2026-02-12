# Mobile Responsiveness & Compaction Plan

> **Project:** Koder Kids School Management System
> **Date:** 2026-02-11
> **Status:** Approved Plan

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Analysis](#2-current-state-analysis)
3. [Phase 1: Sidebar — Mobile/Tablet Overlay Drawer](#3-phase-1-sidebar--mobiletablet-overlay-drawer)
4. [Phase 2: Sidebar — Desktop Compaction](#4-phase-2-sidebar--desktop-compaction)
5. [Phase 3: CollapsibleSection — Compact Mode](#5-phase-3-collapsiblesection--compact-mode)
6. [Phase 4: AdminDashboard — Mobile Responsiveness](#6-phase-4-admindashboard--mobile-responsiveness)
7. [Phase 5: TeacherDashboard — Mobile Responsiveness](#7-phase-5-teacherdashboard--mobile-responsiveness)
8. [Phase 6: StudentDashboard — Mobile Responsiveness](#8-phase-6-studentdashboard--mobile-responsiveness)
9. [Phase 7: Global Responsive Utilities](#9-phase-7-global-responsive-utilities)
10. [Files Changed Summary](#10-files-changed-summary)
11. [Testing Checklist](#11-testing-checklist)

---

## 1. Executive Summary

### Problems
- **Mobile sidebar** takes 80px even when collapsed (icon-only mode) — wastes screen space on phones/tablets
- **Collapsible sections** in dashboards have excessive padding, large headers, and fat toggle buttons
- **Dashboard layouts** don't optimally use space on mobile (charts too wide, tables not scrollable, grids don't collapse properly)
- **No hamburger menu** pattern for mobile users to access navigation

### Solution
- **Sidebar on mobile/tablet (<1024px):** Completely hidden by default. A floating hamburger button (top-left) lets users open it as a full-screen overlay drawer. Content gets full viewport width.
- **Sidebar on desktop (≥1024px):** Keep current behavior (expanded 280px / collapsed 80px) but tighten spacing for compactness.
- **CollapsibleSections:** Reduce padding, smaller titles, slimmer controls.
- **All 3 dashboards:** Proper single-column mobile layouts, horizontally scrollable tables, properly sized charts, touch-friendly controls.

---

## 2. Current State Analysis

### Sidebar Architecture
```
Files:
├── components/sidebar/Sidebar.jsx          ← Main container (fixed, left:0)
├── components/sidebar/SidebarHeader.jsx    ← Logo + toggle (80px height)
├── components/sidebar/SidebarNav.jsx       ← Scrollable menu area
├── components/sidebar/SidebarSection.jsx   ← Section grouping + label
├── components/sidebar/SidebarDropdown.jsx  ← Expandable menu with sub-items
├── components/sidebar/SidebarItem.jsx      ← Individual nav link
├── components/sidebar/SidebarFooter.jsx    ← User avatar + logout
├── hooks/useSidebar.js                     ← State management hook
├── hooks/useResponsive.js                  ← Breakpoint detection hook
├── config/menuConfig.js                    ← Role-based menu definitions
└── App.js                                  ← Layout: marginLeft based on sidebar width
```

### Current Mobile Behavior
- **<768px:** Sidebar collapses to 80px icons-only. Content gets `marginLeft: 80px`.
- **768-1023px:** Same collapsed behavior.
- **≥1024px:** Sidebar expanded to 280px. Content gets `marginLeft: 280px`.
- **Problem:** On a 375px phone screen, 80px sidebar = only 295px usable content width.

### Dashboard Files
```
├── pages/AdminDashboard.js         ← Charts grid: minmax(500px, 1fr) — breaks on mobile
├── pages/TeacherDashboardFigma.js  ← Multiple CollapsibleSections, charts
├── pages/StudentDashboard.js       ← Card-based layout, responsive grid already exists
```

### Design System
- **Framework:** Custom CSS-in-JS (inline styles)
- **Constants:** `src/utils/designConstants.js` — SPACING, FONT_SIZES, SIDEBAR, etc.
- **Breakpoints (useResponsive):** Mobile <768, Tablet 768-1023, Desktop ≥1024

---

## 3. Phase 1: Sidebar — Mobile/Tablet Overlay Drawer

### Goal
On screens <1024px, sidebar is **completely hidden** (width: 0). A floating hamburger button opens it as a **full-screen overlay drawer** that slides in from the left.

### 3.1 Changes to `App.js` (AppContent)

**Current:**
```javascript
const [sidebarOpen, setSidebarOpen] = React.useState(true);
// ...
marginLeft: isPublicRoute ? 0 : (sidebarOpen ? '280px' : '80px'),
```

**New:**
```javascript
const { isMobile, isTablet } = useResponsive();
const isMobileOrTablet = isMobile || isTablet; // <1024px

const [sidebarOpen, setSidebarOpen] = React.useState(!isMobileOrTablet);
const [mobileSidebarVisible, setMobileSidebarVisible] = React.useState(false);

// On mobile/tablet: marginLeft is always 0 (sidebar is overlay)
// On desktop: marginLeft follows sidebar open/close state
marginLeft: isPublicRoute ? 0 : (isMobileOrTablet ? 0 : (sidebarOpen ? '280px' : '80px')),
```

Add floating hamburger button (only on mobile/tablet, non-public routes):
```jsx
{!isPublicRoute && isMobileOrTablet && (
  <MobileMenuButton onClick={() => setMobileSidebarVisible(true)} />
)}
```

### 3.2 New Component: `MobileMenuButton`

Create a small floating button component (no new file — inline in App.js or in sidebar folder):

```
Location: Inline in App.js or components/sidebar/MobileMenuButton.jsx
```

**Specs:**
- Position: `fixed`, `top: 16px`, `left: 16px`, `z-index: 150` (above content, below sidebar overlay)
- Size: 44x44px (WCAG touch target)
- Style: Glassmorphic circle with hamburger icon (3 lines or `faBars` from FontAwesome)
- Hidden when sidebar overlay is visible
- Subtle entrance animation (fade-in on mount)

### 3.3 Changes to `Sidebar.jsx`

**Current:** Always renders as fixed sidebar with `width: 80px` or `280px`.

**New behavior based on screen size:**

```
Mobile/Tablet (<1024px):
  - Sidebar width: 280px (always expanded when visible)
  - Position: fixed overlay with backdrop
  - Visibility controlled by mobileSidebarVisible prop
  - Backdrop: semi-transparent black with blur
  - Slide-in animation from left
  - Close on: backdrop click, navigation item click, close button

Desktop (≥1024px):
  - Keep current behavior exactly as-is (280px expanded / 80px collapsed)
```

**Props change:**
```javascript
// Add new props
const Sidebar = ({
  sidebarOpen,
  setSidebarOpen,
  mobileSidebarVisible,    // NEW: controls overlay visibility on mobile
  setMobileSidebarVisible  // NEW: callback to close overlay
}) => {
```

**Render logic:**
```javascript
if (isMobileOrTablet) {
  // Render as overlay drawer
  return (
    <>
      {mobileSidebarVisible && <div style={styles.overlay} onClick={close} />}
      <aside style={styles.mobileDrawer(mobileSidebarVisible)}>
        <SidebarHeader isOpen={true} onToggle={close} />
        <SidebarNav isOpen={true} ... onNavigate={close} />
        <SidebarFooter isOpen={true} ... />
      </aside>
    </>
  );
} else {
  // Render current desktop sidebar
  return currentBehavior;
}
```

**Mobile drawer styles:**
```javascript
mobileDrawer: (visible) => ({
  position: 'fixed',
  left: 0,
  top: 0,
  height: '100vh',
  width: '280px',
  transform: visible ? 'translateX(0)' : 'translateX(-100%)',
  transition: 'transform 300ms cubic-bezier(0.4, 0, 0.2, 1)',
  zIndex: Z_INDEX.modal + 1,  // Above everything
  // Same glassmorphic styling as current sidebar
  background: 'rgba(255, 255, 255, 0.08)',
  backdropFilter: 'blur(30px) saturate(180%)',
  ...
}),

overlay: {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  backdropFilter: 'blur(4px)',
  zIndex: Z_INDEX.modal,
}
```

### 3.4 Changes to `SidebarNav.jsx`

Add `onNavigate` prop — called when a menu item is clicked (so mobile overlay closes):
```javascript
const SidebarNav = ({ isOpen, openDropdowns, toggleDropdown, role, onNavigate }) => {
```
Pass `onNavigate` down to `SidebarSection` → `SidebarItem` and `SidebarDropdown`.

### 3.5 Changes to `SidebarItem.jsx`

Add `onNavigate` prop — call it when the link is clicked:
```javascript
<Link to={path} onClick={onNavigate} style={...}>
```

### 3.6 Changes to `SidebarDropdown.jsx`

When in mobile overlay mode and a sub-item is clicked, call `onNavigate` to close the drawer.

The existing mobile bottom-sheet behavior can be removed since the sidebar itself is now the overlay drawer. Sub-items will show inline (expanded dropdown) rather than as a separate bottom sheet.

### 3.7 Changes to `SidebarHeader.jsx`

On mobile/tablet overlay mode:
- Show a **close button** (X icon) instead of the collapse chevron
- Always show logo + brand text (since sidebar is always expanded in overlay mode)

### 3.8 Changes to `designConstants.js`

Update the SIDEBAR constants:
```javascript
SIDEBAR: {
  collapsedWidth: '80px',
  expandedWidth: '280px',
  mobileWidth: '280px',          // NEW
  headerHeight: '64px',          // REDUCED from 80px
  footerHeight: '64px',          // REDUCED from 80px
  transitionDuration: '0.3s',
  transitionEasing: 'cubic-bezier(0.4, 0, 0.2, 1)',
}
```

### 3.9 Changes to `useSidebar.js`

Add awareness of mobile state. On mobile, `isOpen` is always `true` (sidebar is always expanded when visible). The visibility is controlled by the parent `mobileSidebarVisible` state.

---

## 4. Phase 2: Sidebar — Desktop Compaction

### Goal
Reduce vertical space consumed by sidebar items on desktop. Make the sidebar feel tighter and more professional.

### 4.1 `SidebarHeader.jsx` — Compact Header

**Current:** `height: 80px`, `padding: 1rem`, logo 40x40px
**New:** `height: 64px`, `padding: 0.75rem`, logo 32x32px

```javascript
header: (isOpen) => ({
  height: '64px',          // was 80px
  padding: '0.75rem',      // was 1rem
  gap: '0.5rem',           // was 0.75rem
}),
logoWrapper: {
  width: '32px',           // was 40px
  height: '32px',          // was 40px
  minWidth: '32px',        // was 40px
  padding: '0.3rem',       // was 0.4rem
  borderRadius: '10px',    // was 12px
},
logoText: {
  fontSize: '16px',        // was 18px
},
```

### 4.2 `SidebarSection.jsx` — Compact Section Headers

**Current:** `padding: 0.75rem 1rem 0.5rem`, `marginTop: 0.5rem`, `marginBottom: 0.5rem`
**New:** `padding: 0.5rem 1rem 0.25rem`, `marginTop: 0.25rem`, `marginBottom: 0.25rem`

```javascript
section: {
  marginBottom: '0.25rem',  // was 0.5rem
},
sectionHeader: {
  fontSize: FONT_SIZES.xs,
  padding: '0.5rem 1rem 0.25rem',  // was 0.75rem 1rem 0.5rem
  marginTop: '0.25rem',             // was 0.5rem
},
```

### 4.3 `SidebarItem.jsx` — Compact Items

**Current margins & padding:**
```javascript
margin: isOpen ? '0.25rem 0.75rem' : '0.5rem 0.5rem',
padding: isOpen ? '0.75rem' : '0.5rem',
minHeight: '40px',
```

**New (compact):**
```javascript
margin: isOpen ? '0.125rem 0.75rem' : '0.25rem 0.5rem',   // halved vertical margin
padding: isOpen ? '0.5rem 0.75rem' : '0.375rem',           // reduced padding
minHeight: '36px',                                           // was 40px
fontSize: '14px',                                            // was base (16px)
```

For nested items:
```javascript
minHeight: '32px',   // was 36px
padding: '0.375rem 0.75rem',  // was 0.5rem 0.75rem
```

### 4.4 `SidebarDropdown.jsx` — Compact Dropdowns

**Current:**
```javascript
navItem margin: isOpen ? '0.25rem 0.75rem' : '0.5rem 0.5rem'
dropdownToggle padding: isOpen ? '0.75rem' : '0.5rem'
dropdownMenu paddingLeft: '1rem'
```

**New:**
```javascript
navItem margin: isOpen ? '0.125rem 0.75rem' : '0.25rem 0.5rem'
dropdownToggle padding: isOpen ? '0.5rem 0.75rem' : '0.375rem'
dropdownMenu paddingLeft: '0.75rem'   // was 1rem — tighter indent
```

### 4.5 `SidebarFooter.jsx` — Compact Footer

**Current:** `padding: 1rem`, avatar 36px
**New:** `padding: 0.75rem`, avatar 30px

```javascript
footer: {
  padding: '0.75rem',     // was 1rem
},
avatar: {
  width: '30px',          // was 36px
  height: '30px',
  minWidth: '30px',
},
userName: {
  fontSize: '13px',       // was 14px
},
userRole: {
  fontSize: '10px',       // was 11px
},
```

### 4.6 Expected Result
- Sidebar vertical density increases ~25-30%
- More menu items visible without scrolling
- Header: 64px (was 80px) = 16px saved
- Footer: 64px (was 80px) = 16px saved
- Each menu item: ~6-8px shorter = ~50-70px saved across 8-10 items
- **Total: ~80-100px vertical space recovered**

---

## 5. Phase 3: CollapsibleSection — Compact Mode

### File: `components/common/cards/CollapsibleSection.js`

### 5.1 Tighter Container

**Current:**
```javascript
containerStyle: {
  padding: SPACING.md,           // 16px
  borderRadius: BORDER_RADIUS.lg,
  marginBottom: SPACING.md,      // 16px
}
```

**New:**
```javascript
containerStyle: {
  padding: isMobile ? SPACING.sm : SPACING.md,       // 8px mobile, 12px desktop
  borderRadius: BORDER_RADIUS.md,                      // slightly smaller radius
  marginBottom: isMobile ? SPACING.sm : SPACING.md,   // 8px mobile, 12px desktop
}
```

### 5.2 Smaller Title

**Current:**
```javascript
titleStyle: {
  fontSize: FONT_SIZES.lg,   // 18px
  fontWeight: FONT_WEIGHTS.semibold,
}
```

**New:**
```javascript
titleStyle: {
  fontSize: isMobile ? FONT_SIZES.base : FONT_SIZES.lg,  // 14px mobile, 16px desktop
  fontWeight: FONT_WEIGHTS.semibold,
}
```

### 5.3 Slimmer Toggle Button

**Current:** Uses `FONT_SIZES.lg` for icon, `SPACING.xs` padding
**New:** Smaller icon, smaller padding:
```javascript
buttonStyle: {
  fontSize: isMobile ? FONT_SIZES.sm : FONT_SIZES.base,  // smaller chevron
  padding: '2px',                                          // was SPACING.xs (4px)
}
```

### 5.4 Reduced Header Margin
```javascript
headerStyle: {
  marginBottom: isOpen ? (isMobile ? SPACING.sm : SPACING.md) : 0,
  // was: marginBottom: isOpen ? SPACING.md : 0
}
```

### 5.5 Add `useResponsive` hook to CollapsibleSection

Import `useResponsive` to detect mobile and apply compact styles conditionally.

---

## 6. Phase 4: AdminDashboard — Mobile Responsiveness

### File: `pages/AdminDashboard.js`

### 6.1 Charts Grid — Fix 500px Minimum

**Current (BROKEN on mobile):**
```javascript
chartsRow: {
  gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',  // 500px min!
}
```
On a 375px screen, this forces horizontal scroll.

**New:**
```javascript
chartsRow: {
  gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(450px, 1fr))',
  gap: isMobile ? SPACING.md : SPACING.lg,
}
```

### 6.2 Page Container Padding

**Current:** `padding: SPACING.xl` (32px) always
**New:**
```javascript
pageContainer: {
  padding: isMobile ? SPACING.md : isTablet ? SPACING.lg : SPACING.xl,
  // 12px / 24px / 32px
}
```

### 6.3 Chart Heights

**Current:** Charts at 320px height always
**New:** Reduce on mobile:
```javascript
<ResponsiveContainer width="100%" height={isMobile ? 220 : 320}>
```

### 6.4 Month Select Container

**Current:**
```javascript
monthSelectContainer: {
  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
}
```

**New:**
```javascript
monthSelectContainer: {
  gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(250px, 1fr))',
}
```

### 6.5 Add `useResponsive` Import

Currently the AdminDashboard doesn't use `useResponsive()`. Add:
```javascript
import { useResponsive } from '../hooks/useResponsive';
// In component:
const { isMobile, isTablet } = useResponsive();
```

### 6.6 Fee Summary Table

Tables already use DataTable which handles overflow. No change needed, but verify horizontal scroll on mobile.

### 6.7 Floating Action Button

Already handles mobile (icon-only 56x56). No change needed.

---

## 7. Phase 5: TeacherDashboard — Mobile Responsiveness

### File: `pages/TeacherDashboardFigma.js`

### 7.1 Main Content Padding

**Current:**
```javascript
mainContent: {
  padding: isMobile ? SPACING.md : SPACING.xl,
}
```
Already responsive. Good.

### 7.2 Completion Section

**Current:**
```javascript
completionSection: {
  flexDirection: isMobile ? 'column' : 'row',
  padding: isMobile ? SPACING.lg : SPACING.xl,
}
```
Already responsive but CircularProgress `size={173}` is fixed.

**New:** Reduce circular progress size on mobile:
```javascript
<CircularProgress
  size={isMobile ? 120 : 173}
  strokeWidth={isMobile ? 14 : 20}
/>
```

### 7.3 Command Center Grid

The Staff Command Center section uses grid. Ensure it stacks on mobile:
```javascript
// Already handled in CollapsibleSection
```

### 7.4 Chart Heights

For `BarChartWrapper` and other chart containers:
```javascript
height={isMobile ? 250 : 350}
```

### 7.5 Section Title Font Size

**Current:**
```javascript
sectionTitle: {
  fontSize: isMobile ? FONT_SIZES.xl : FONT_SIZES['2xl'],
}
```
Already responsive. Good.

### 7.6 DataTable in Student Reports

Tables need horizontal scroll wrapper on mobile. The DataTable component should handle this — verify it does with `overflow-x: auto`.

---

## 8. Phase 6: StudentDashboard — Mobile Responsiveness

### File: `pages/StudentDashboard.js`

### 8.1 Current State

The StudentDashboard already has good responsive support via `getResponsiveStyles(isMobile, isTablet)`. It switches to single-column grids on mobile.

### 8.2 Improvements Needed

**Page padding (currently good):**
```javascript
padding: isMobile ? SPACING.md : isTablet ? SPACING.lg : SPACING.xl,
```

**Profile card in left column:**
On mobile, the mainGrid goes to `1fr` — profile card takes full width. This is fine but can be improved:
- Make profile card horizontal (side-by-side avatar + info) on mobile instead of vertical
- Reduce avatar size on mobile

**Stats row:** Verify `StatsRow` component stacks properly on mobile. May need:
```javascript
gridTemplateColumns: isMobile ? '1fr 1fr 1fr' : 'repeat(auto-fit, minmax(150px, 1fr))',
```
(3 stats should still fit in a row on mobile, just smaller)

**Card padding:** Reduce internal card padding on mobile from `SPACING.lg` to `SPACING.md`.

### 8.3 Component-Level Changes

These are in the `components/students/dashboard/` folder. Each card component already receives `isMobile` prop. Minor adjustments:

- **StudentProfileCard:** Reduce avatar size on mobile
- **StatsRow:** Ensure 3-across layout on mobile with smaller text
- **WeeklyLearning:** Chart height reduction on mobile
- **AchievementsBadges:** Smaller badge icons on mobile
- **FeesStatusCard:** Ensure table is scrollable

---

## 9. Phase 7: Global Responsive Utilities

### 9.1 `responsive.css` Additions

Add mobile-specific sidebar utility:
```css
/* Sidebar hidden on mobile/tablet */
@media (max-width: 1023px) {
  .sidebar-desktop-only {
    display: none !important;
  }
}
```

### 9.2 `App.css` — Smooth Transitions

Add CSS for the sidebar overlay:
```css
/* Mobile sidebar overlay animation */
.mobile-sidebar-overlay {
  animation: fadeIn 0.3s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideInLeft {
  from { transform: translateX(-100%); }
  to { transform: translateX(0); }
}
```

### 9.3 Scrollbar Hiding for Mobile

Ensure the sidebar nav scrollbar is hidden on mobile:
```css
@media (max-width: 1023px) {
  .sidebar-nav::-webkit-scrollbar {
    display: none;
  }
}
```

---

## 10. Files Changed Summary

| # | File | Change Type | Priority |
|---|------|-------------|----------|
| 1 | `App.js` | **Major** — Add mobile layout logic, hamburger button, pass new props to Sidebar | P0 |
| 2 | `components/sidebar/Sidebar.jsx` | **Major** — Add overlay drawer mode for mobile/tablet | P0 |
| 3 | `components/sidebar/SidebarHeader.jsx` | **Medium** — Compact dimensions, close button for mobile | P0 |
| 4 | `components/sidebar/SidebarNav.jsx` | **Minor** — Pass onNavigate prop to children | P0 |
| 5 | `components/sidebar/SidebarItem.jsx` | **Medium** — Compact spacing, add onNavigate callback | P1 |
| 6 | `components/sidebar/SidebarDropdown.jsx` | **Medium** — Compact spacing, remove mobile bottom-sheet (replaced by drawer) | P1 |
| 7 | `components/sidebar/SidebarSection.jsx` | **Minor** — Compact spacing | P1 |
| 8 | `components/sidebar/SidebarFooter.jsx` | **Minor** — Compact dimensions | P1 |
| 9 | `hooks/useSidebar.js` | **Minor** — Mobile awareness | P1 |
| 10 | `utils/designConstants.js` | **Minor** — Update SIDEBAR constants | P1 |
| 11 | `components/common/cards/CollapsibleSection.js` | **Medium** — Compact mode with responsive padding/fonts | P1 |
| 12 | `pages/AdminDashboard.js` | **Medium** — Fix chart grid, responsive padding, chart heights | P2 |
| 13 | `pages/TeacherDashboardFigma.js` | **Minor** — Responsive chart sizes | P2 |
| 14 | `pages/StudentDashboard.js` | **Minor** — Fine-tune mobile card padding | P2 |
| 15 | `styles/responsive.css` | **Minor** — Add sidebar utility classes | P2 |

**Total files: 15**

---

## 11. Testing Checklist

### Mobile (<768px)
- [ ] Sidebar is completely hidden on page load
- [ ] Floating hamburger button visible (top-left, 44x44px)
- [ ] Tapping hamburger slides sidebar in from left with overlay backdrop
- [ ] Tapping backdrop closes sidebar
- [ ] Clicking a menu item navigates AND closes sidebar
- [ ] Dropdown items expand inline within overlay sidebar
- [ ] Close button (X) works in sidebar header
- [ ] All dashboard content uses full viewport width (no 80px margin)
- [ ] Charts render properly at reduced height
- [ ] Tables are horizontally scrollable
- [ ] CollapsibleSections have compact padding/titles
- [ ] No horizontal scroll on any page
- [ ] Touch targets ≥44px on all interactive elements

### Tablet (768px-1023px)
- [ ] Same behavior as mobile (overlay drawer)
- [ ] Content gets full width
- [ ] Grids may show 2 columns where space allows

### Desktop (≥1024px)
- [ ] Sidebar behaves exactly as before (280px / 80px)
- [ ] All compaction changes (tighter spacing) look good
- [ ] No regressions in existing functionality
- [ ] Flyout menus still work on collapsed sidebar
- [ ] Tooltips still appear on collapsed sidebar items

### Cross-Browser
- [ ] Chrome (Android + Desktop)
- [ ] Safari (iOS + Desktop)
- [ ] Firefox Desktop
- [ ] Edge Desktop

---

## Implementation Order

1. **Phase 1** (Sidebar Mobile Overlay) — Highest impact, blocks other mobile work
2. **Phase 2** (Sidebar Desktop Compaction) — Quick wins, independent
3. **Phase 3** (CollapsibleSection Compact) — Affects all dashboards
4. **Phase 4** (AdminDashboard) — Depends on Phase 1+3
5. **Phase 5** (TeacherDashboard) — Depends on Phase 1+3
6. **Phase 6** (StudentDashboard) — Depends on Phase 1+3
7. **Phase 7** (Global Utilities) — Can be done anytime

**Estimated scope:** ~15 files, ~500-700 lines changed
