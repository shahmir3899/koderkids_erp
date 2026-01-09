# Testing Guide for New UI Components

**Date:** January 8, 2026
**Purpose:** Guide for testing newly implemented reusable components

---

## 🚀 Quick Start

### 1. Start the Frontend
```bash
cd frontend
npm start
```

### 2. Login as Admin
Navigate to the login page and login with admin credentials.

---

## 🧪 Test Scenarios

### Test 1: SendNotificationModal (Refactored)

**Location to Test:** Admin Dashboard → Send Notification Button

#### Steps:
1. Click "Send Notification" button
2. **Verify:** Modal opens with new unified design
3. **Verify:** "Quick Templates" section appears at top with 4 template buttons
4. Click on "Meeting Reminder" template
5. **Verify:** Title and message fields populate automatically
6. **Verify:** Notification type changes to "Reminder" (🔔)
7. Click on "Send To" toggle - switch between "Single Teacher" and "All Teachers"
8. **Verify:** Toggle switches smoothly with visual feedback
9. **Verify:** When "Single Teacher" is selected, dropdown appears
10. Select notification type by clicking type buttons (Info, Success, Warning, etc.)
11. **Verify:** Selected type shows colored border and background
12. Fill in title and message
13. **Verify:** Character counters update (200 for title, 1000 for message)
14. **Verify:** Preview section shows notification appearance
15. Click "Send Notification"
16. **Verify:** Button shows "Loading..." state
17. **Verify:** Success toast appears
18. **Verify:** Modal closes automatically

#### What to Look For:
- ✅ Modal has smooth fade-in animation
- ✅ Template buttons in grid layout
- ✅ Toggle buttons have active state styling
- ✅ Type selector buttons change color on selection
- ✅ Form submits successfully
- ✅ Modal is responsive on mobile (test by resizing window)

---

### Test 2: BulkTaskModal (Refactored)

**Location to Test:** Task Management Page → Any task → "Assign to All" button

#### Steps:
1. Navigate to Task Management page
2. Find any existing task in the list
3. Click the "Assign to All" button on that task
4. **Verify:** Modal opens with "Assign Task to All Employees" title
5. **Verify:** Priority selector shows 4 options in grid: Low 🟢, Medium 🟡, High 🔴, Urgent 🚨
6. Click on "High" priority
7. **Verify:** Selected priority shows colored border (red)
8. **Verify:** Task Type selector shows 3 options: General 📋, Academic 📚, Administrative 📝
9. Click on "Academic" task type
10. **Verify:** Selected type shows colored border (blue)
11. Fill in task title and description
12. **Verify:** Character counters work (200 for title, 2000 for description)
13. Select a due date
14. Click "Assign to All Employees"
15. **Verify:** Button shows "Loading..." with spinner
16. **Verify:** Success message appears
17. **Verify:** Modal closes

#### What to Look For:
- ✅ Priority selector uses icon + color
- ✅ Task type selector uses icon + color
- ✅ No custom overlay (uses FormModal)
- ✅ Responsive layout
- ✅ Form validation works
- ✅ Loading state visible during submission

---

## 🎨 Visual Consistency Check

### Compare Before & After

#### SendNotificationModal
**Before:** Custom div overlay, inline styled buttons, custom close button
**After:** FormModal wrapper, TypeSelector for types, ToggleButtonGroup for recipient

**What to Check:**
- Modal has consistent border-radius (8px)
- Header has consistent padding (24px)
- Footer buttons are right-aligned
- Close button (✕) is in top-right corner
- All buttons have hover effects
- Form fields have consistent spacing (mb-3)

#### BulkTaskModal
**Before:** Custom overlay + Bootstrap Modal, radio buttons for priority
**After:** FormModal wrapper, TypeSelector for priority and type

**What to Check:**
- Modal size is consistent with SendNotificationModal
- Priority selection uses visual icons and colors
- Task type selection uses visual icons and colors
- Footer buttons match SendNotificationModal styling

---

## 📱 Responsive Testing

### Desktop (1920x1080)
- [ ] Modal is centered
- [ ] Modal width is appropriate (~600px for lg)
- [ ] Grid layouts show 3-4 items per row
- [ ] All text is readable

### Tablet (768x1024)
- [ ] Modal takes ~95% of viewport width
- [ ] Grid layouts adjust to 2 items per row
- [ ] Toggle buttons remain horizontal
- [ ] All interactive elements are tappable

### Mobile (375x667)
- [ ] Modal takes ~95% of viewport width
- [ ] Grid layouts become vertical (1 item per row)
- [ ] Quick actions show 2 items per row
- [ ] Buttons are large enough to tap
- [ ] Text remains readable
- [ ] No horizontal scrolling

---

## 🔍 Component-Specific Tests

### FormModal Component
**Test:**
1. Click overlay (outside modal)
2. **Verify:** Modal closes
3. Click inside modal
4. **Verify:** Modal stays open
5. Click close button (✕)
6. **Verify:** Modal closes
7. Click cancel button
8. **Verify:** Modal closes
9. Fill form and click submit
10. **Verify:** onSubmit callback fires

### TypeSelector Component
**Test:**
1. Click each option
2. **Verify:** Active state shows (border + background color)
3. **Verify:** Only one option can be selected at a time
4. **Verify:** Icon appears before label
5. **Verify:** Color matches option.color prop
6. Resize window to mobile
7. **Verify:** Options stack vertically

### ToggleButtonGroup Component
**Test:**
1. Click first option
2. **Verify:** First option becomes active (white background + shadow)
3. Click second option
4. **Verify:** Second option becomes active, first deactivates
5. **Verify:** Icon appears before label
6. Hover over options
7. **Verify:** Hover state appears (lighter background)

### QuickActions Component
**Test:**
1. Click each action button
2. **Verify:** onAction callback fires with correct action data
3. **Verify:** Hover effect shows (blue border + light blue background)
4. **Verify:** Click effect shows (scale down slightly)
5. Resize to mobile
6. **Verify:** Grid shows 2 columns

---

## 🐛 Common Issues & Solutions

### Issue: Modal doesn't open
**Solution:** Check that `show={true}` is passed to FormModal

### Issue: TypeSelector doesn't show icons
**Solution:** Verify options array has `icon` property for each option

### Issue: Styles not applying
**Solution:**
1. Check CSS module import: `import styles from './Modal.module.css'`
2. Restart dev server (sometimes needed for CSS modules)

### Issue: Form doesn't submit
**Solution:**
1. Verify `onSubmit` is passed to FormModal
2. Check that form validation passes
3. Check browser console for errors

### Issue: Components not found
**Solution:**
1. Verify import paths are correct
2. Check that all files were created
3. Restart VS Code / dev server

---

## ✅ Success Criteria

All tests pass if:
- ✅ No console errors
- ✅ Modals open and close smoothly
- ✅ All form submissions work
- ✅ Visual consistency between components
- ✅ Responsive on all screen sizes
- ✅ All interactions have visual feedback
- ✅ Loading states appear during async operations
- ✅ Success/error messages display correctly

---

## 📊 Performance Checklist

- [ ] Modal opens in <300ms
- [ ] Animations are smooth (60fps)
- [ ] No layout shifts when opening modal
- [ ] Form inputs respond immediately
- [ ] No memory leaks (test by opening/closing modals 10+ times)

---

## 🎓 For Future Developers

### How to Use These Components in New Features

#### Example 1: Create a new form modal
```javascript
import { FormModal } from '../common/modals/FormModal';

function MyNewModal({ show, onClose }) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    // Your submit logic
    setLoading(false);
    onClose();
  };

  return (
    <FormModal
      show={show}
      title="My New Modal"
      onClose={onClose}
      onSubmit={handleSubmit}
      isLoading={loading}
      submitText="Save"
    >
      {/* Your form fields */}
    </FormModal>
  );
}
```

#### Example 2: Add type selection
```javascript
import { TypeSelector } from '../common/ui/TypeSelector';

<TypeSelector
  label="Select Status"
  value={status}
  onChange={setStatus}
  options={[
    { value: 'active', label: 'Active', icon: '✅', color: '#10B981' },
    { value: 'inactive', label: 'Inactive', icon: '❌', color: '#EF4444' }
  ]}
  layout="grid"
  required
/>
```

---

**Testing Date:** January 8, 2026
**Components Version:** 1.0.0
**Status:** Ready for Testing ✅
