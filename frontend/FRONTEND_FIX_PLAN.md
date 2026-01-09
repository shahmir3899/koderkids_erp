# Frontend Task Management - Fix Plan

## 🔴 CRITICAL Issues (Fix First)

### 1. Remove Duplicate API Files
**Files**: 
- frontend/src/api/tasks.js (basic, incomplete)
- frontend/src/utils/taskApi.js (complete with error handling)

**Problem**: Confusion about which to use. TaskManagementPage imports from utils, but api/tasks.js is incomplete

**Fix**: Delete frontend/src/api/tasks.js

Update all imports in components:
```javascript
// OLD (remove these)
import { taskAPI } from '../api/tasks';

// NEW (use this)
import taskApiService from '../utils/taskApi';
```

**Files to check for old imports**:
- frontend/src/pages/TaskManagementPage.js - Already correct ✓
- frontend/src/components/tasks/BulkTaskModal.js - Already correct ✓
- frontend/src/components/tasks/TaskActions.js - Already correct ✓

**Action**: Simply delete `frontend/src/api/tasks.js`

---

### 2. Fix Form.Select Invalid Attribute
**File**: frontend/src/pages/TaskManagementPage.js (Line 248)
**Problem**: `Form.Select` with `as="select"` attribute is invalid

**Current**:
```javascript
<Form.Select
    as="select"  // ← WRONG: redundant & invalid
    name="assigned_to"
    value={taskForm.assigned_to}
    // ...
</Form.Select>
```

**Fix**: Remove `as="select"`:
```javascript
<Form.Select
    name="assigned_to"
    value={taskForm.assigned_to}
    onChange={(e) => {
        const selectedEmployee = employeeList.find(emp => emp.id === parseInt(e.target.value));
        console.log('📝 Create Modal: Selected employee:', selectedEmployee);
        setTaskForm({...taskForm, assigned_to: e.target.value});
        setSelectedEmployee(selectedEmployee);
    }}
    required
>
    <option value="">Select Employee</option>
    {employeeList.map(employee => (
        <option key={employee.id} value={employee.id}>
            {employee.first_name} {employee.last_name} ({employee.role})
        </option>
    ))}
</Form.Select>
```

---

### 3. Implement EditTaskModal
**File**: frontend/src/pages/TaskManagementPage.js (Lines 325-326)
**Problem**: EditTaskModal is empty - tasks can't be edited after creation

**Current**:
```javascript
const EditTaskModal = () => {
    // Edit modal implementation would go here...
};
```

**Fix**: Add edit state and implement full edit modal (see BACKEND_FIX_PLAN.md for complete code)

---

## 🟡 HIGH Priority Issues

### 4. Replace Completion Prompt with Modal
**File**: frontend/src/components/tasks/TaskActions.js (Lines 165-175)
**Problem**: `window.prompt()` is poor UX

**Current**:
```javascript
{task.status === taskConstants.statuses.IN_PROGRESS && (
    <button
        onClick={() => {
            const answer = window.prompt('Please provide completion answer:');
            if (answer) {
                handleStatusUpdate(taskConstants.statuses.COMPLETED, answer);
            }
        }}
        // ...
    >
        Mark Complete
    </button>
)}
```

**Fix**: Replace with modal for better UX (see BACKEND_FIX_PLAN.md for complete code)

---

### 5. Add Admin Permission Check
**File**: frontend/src/pages/TaskManagementPage.js (Lines 1-30)
**Problem**: No check that user is Admin before loading page

**Fix**: Add permission validation in useEffect (see BACKEND_FIX_PLAN.md for complete code)

---

## 🟠 MEDIUM Priority Issues

### 6. Add Task Filtering UI
**File**: frontend/src/pages/TaskManagementPage.js
**Problem**: Filter state exists but no UI to use it

**Add filter UI above task list** (see BACKEND_FIX_PLAN.md for complete code)

---

### 7. Add Pagination for Task List
**File**: frontend/src/pages/TaskManagementPage.js
**Problem**: All tasks loaded at once - performance issue with many tasks

**Add pagination state and UI** (see BACKEND_FIX_PLAN.md for complete code)

---

### 8. Add Loading State to BulkTaskModal
**File**: frontend/src/components/tasks/BulkTaskModal.js
**Problem**: No visual feedback when submitting bulk task

**Add loading spinner to submit button** (see BACKEND_FIX_PLAN.md for complete code)

---

## Testing Checklist

- [ ] Delete old `api/tasks.js` file - no import errors
- [ ] Form.Select no longer has `as="select"` 
- [ ] EditTaskModal appears and edits task successfully
- [ ] Can complete task with modal instead of prompt
- [ ] Non-admin users redirected from task page
- [ ] Filter UI shows and filters tasks correctly
- [ ] Pagination works with 10 tasks per page
- [ ] Bulk assign modal shows loading state
- [ ] All API calls use `taskApiService` from utils
- [ ] No console errors

---

## Implementation Order

1. Delete duplicate `api/tasks.js` (5 min)
2. Fix Form.Select attribute (2 min)
3. Implement EditTaskModal (30 min)
4. Replace completion prompt with modal (15 min)
5. Add admin permission check (10 min)
6. Add filter UI (15 min)
7. Add pagination (20 min)
8. Add loading state to bulk modal (5 min)
9. Test all functionality (30 min)

**Total estimated time**: ~2-2.5 hours
