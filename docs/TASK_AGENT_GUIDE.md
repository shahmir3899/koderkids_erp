# Task Agent Implementation Plan

## Status: IMPLEMENTED

---

## Overview
Create a **TaskAgent** for admin users to assign formal tasks to employees via natural language input.

**Single Job:** Create formal tasks for specified employees with AI-generated text and completeness confirmation.

---

## Architecture Summary

### Parameters
| Parameter | Source | Description |
|-----------|--------|-------------|
| `task_to` | Fuzzy matched from DB | Employee name (exact match from employee list) |
| `text` | AI-generated from NLP | Formal task description generated from user's natural language |
| `date` | Extracted from NL | Due date for the task |

### Flow
```
User NL Input → LLM Parses → Fuzzy Match Employee → Generate Formal Text → Confirm → Create Task
```

---

## Implementation Details

### 1. Backend Changes

#### 1.1 Add Task Agent Actions (`backend/ai/actions.py`)

```python
# Add to AGENT_ACTIONS dictionary
'task': {
    'CREATE_TASK': {
        'type': 'WRITE',
        'required_params': ['employee_name', 'task_description', 'due_date'],
        'optional_params': ['priority', 'task_type'],
        'needs_confirmation': True,  # Ask for completeness
        'endpoint': '/api/tasks/',
        'description': 'Create a new task for an employee'
    },
}
```

#### 1.2 Add Task Resolver (`backend/ai/resolver.py`)

```python
def resolve_employee(params: dict, context: dict) -> tuple:
    """
    Fuzzy match employee_name against database employees.
    Returns: (employee_id, error_message)
    """
    employee_name = params.get('employee_name', '').strip()

    # Get all active employees (teachers + admins)
    employees = CustomUser.objects.filter(
        role__in=['Teacher', 'Admin'],
        is_active=True
    ).select_related('teacher_profile')

    # Fuzzy match logic
    best_match = None
    best_score = 0
    matches = []

    for emp in employees:
        full_name = emp.get_full_name()
        score = fuzzy_match_score(employee_name, full_name)

        if score > 0.8:  # High confidence match
            best_match = emp
            best_score = score
            break
        elif score > 0.5:
            matches.append((emp, score))

    if best_match:
        return (best_match.id, None)
    elif matches:
        # Return disambiguation list
        return (None, f"Multiple matches found: {format_employee_list(matches)}")
    else:
        return (None, "Employee not found. Please provide exact name.")
```

#### 1.3 Add Task Executor (`backend/ai/executor.py`)

```python
def execute_create_task(params: dict, user) -> dict:
    """Execute task creation after confirmation."""
    from tasks.models import Task

    task = Task.objects.create(
        title=params.get('title', params['task_description'][:50]),
        description=params['task_description'],
        assigned_to_id=params['employee_id'],
        assigned_by=user,
        due_date=params['due_date'],
        priority=params.get('priority', 'medium'),
        task_type=params.get('task_type', 'administrative'),
        status='pending'
    )

    return {
        'success': True,
        'task_id': task.id,
        'message': f"Task created and assigned to {task.assigned_to.get_full_name()}"
    }
```

#### 1.4 Add Task Agent Prompt (`backend/ai/prompts/task_prompt.txt`)

```
You are a Task Assignment Agent. Your ONLY job is to help admins create formal tasks for employees.

IMPORTANT RULES:
1. Extract employee name, task description, and due date from user input
2. Generate FORMAL, professional task descriptions from casual input
3. Always ask for confirmation before creating

INPUT EXAMPLES:
- "Tell Ahmed to submit reports by Friday"
- "Assign homework checking task to Sarah for next Monday"
- "Create task for Ali - complete inventory audit by Jan 30"

OUTPUT FORMAT (JSON only):
{
    "action": "CREATE_TASK",
    "employee_name": "<extracted name>",
    "task_description": "<formal AI-generated description>",
    "due_date": "<YYYY-MM-DD format>",
    "priority": "medium",
    "needs_confirmation": true
}

FORMAL TEXT GENERATION:
- Convert casual language to professional task description
- Example: "tell him to fix AC" → "Please ensure the air conditioning system is inspected and repaired as needed"

AVAILABLE EMPLOYEES:
{employee_list}

CURRENT DATE: {current_date}
```

---

### 2. Frontend Changes

#### 2.1 Create TaskAgentChat Component (`frontend/src/components/tasks/TaskAgentChat.js`)

```jsx
// Similar structure to FeeAgentChat.js
// Key features:
// - Chat interface with message history
// - Confirmation modal for task preview
// - Quick action templates as fallback
// - Employee autocomplete from context

const TaskAgentChat = ({ employees, onTaskCreated }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [pendingTask, setPendingTask] = useState(null);
    const [showConfirmation, setShowConfirmation] = useState(false);

    // ... implementation
};
```

#### 2.2 Add Task Context Builder (`frontend/src/services/aiService.js`)

```javascript
export const buildTaskContext = (employees, currentDate) => {
    return {
        current_date: currentDate,
        employees: employees.map(e => ({
            id: e.id,
            name: e.name,
            employee_id: e.employee_id,
            role: e.role
        })),
        priorities: ['low', 'medium', 'high', 'urgent'],
        task_types: ['general', 'academic', 'administrative']
    };
};
```

#### 2.3 Integrate into Task Management Page

**Location:** Page at `http://localhost:3000/task-management`

```jsx
// Add TaskAgentChat to existing TaskManagement page
import TaskAgentChat from '../components/tasks/TaskAgentChat';

const TaskManagement = () => {
    const [employees, setEmployees] = useState([]);

    return (
        <div className="task-management">
            {/* Existing task list/grid */}

            {/* New: Task Agent Chat Panel */}
            <TaskAgentChat
                employees={employees}
                onTaskCreated={refreshTasks}
            />
        </div>
    );
};
```

---

### 3. Confirmation Flow (Completeness Check)

```
┌─────────────────────────────────────────────────────────────┐
│  User: "Tell Ahmed to complete the attendance report by     │
│         next Friday"                                        │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│  AI Response (Confirmation Modal):                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  📋 TASK PREVIEW                                     │   │
│  │                                                      │   │
│  │  Assigned To: Ahmed Khan (KK-T-025)                 │   │
│  │  Due Date: January 31, 2026                         │   │
│  │                                                      │   │
│  │  Task Description:                                   │   │
│  │  "Please complete and submit the monthly attendance │   │
│  │   report for all assigned classes. Ensure accuracy  │   │
│  │   and include any notes for discrepancies."         │   │
│  │                                                      │   │
│  │  Priority: Medium                                    │   │
│  │                                                      │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │   │
│  │  │ Confirm  │  │  Edit    │  │  Cancel  │          │   │
│  │  └──────────┘  └──────────┘  └──────────┘          │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

### 4. File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `backend/ai/actions.py` | MODIFY | Add `task` agent actions |
| `backend/ai/resolver.py` | MODIFY | Add `resolve_employee()` function |
| `backend/ai/executor.py` | MODIFY | Add `execute_create_task()` handler |
| `backend/ai/prompts/task_prompt.txt` | CREATE | Task agent system prompt |
| `backend/ai/service.py` | MODIFY | Register task agent type |
| `frontend/src/components/tasks/TaskAgentChat.js` | CREATE | Main agent chat component |
| `frontend/src/services/aiService.js` | MODIFY | Add `buildTaskContext()` |
| `frontend/src/pages/TaskManagement.js` | MODIFY | Integrate TaskAgentChat |

---

### 5. API Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/employees/teachers/` | GET | Fetch employee list for fuzzy matching |
| `/api/tasks/` | POST | Create new task (existing) |
| `/api/ai/execute/` | POST | Process NL input through AI service |
| `/api/ai/confirm/` | POST | Confirm task creation |

---

### 6. Quick Action Templates (Fallback)

When AI is unavailable, show form-based quick actions:

```javascript
const QUICK_ACTIONS = [
    {
        id: 'create_task',
        label: 'Create Task',
        fields: [
            { name: 'employee', type: 'select', label: 'Assign To', required: true },
            { name: 'description', type: 'textarea', label: 'Task Description', required: true },
            { name: 'due_date', type: 'date', label: 'Due Date', required: true },
            { name: 'priority', type: 'select', label: 'Priority', options: ['low', 'medium', 'high', 'urgent'] }
        ]
    }
];
```

---

### 7. Example Interactions

**Example 1: Simple Task**
```
User: "Ask Sara to prepare exam papers by Monday"

AI Processing:
- employee_name: "Sara" → Fuzzy matches "Sara Ahmed" (ID: 12)
- task_description: "Please prepare the examination papers for upcoming assessments. Ensure all questions are reviewed and formatted according to school standards."
- due_date: "2026-01-27" (next Monday)

→ Shows confirmation modal
→ User confirms
→ Task created
```

**Example 2: Ambiguous Name**
```
User: "Tell Ahmed to check inventory"

AI Response:
"I found multiple employees named Ahmed:
1. Ahmed Khan (Teacher)
2. Ahmed Ali (Admin)

Please specify which Ahmed you mean, or use their full name."
```

**Example 3: Missing Date**
```
User: "Assign report task to Maria"

AI Response:
"I'll create a task for Maria. When should this be completed?
- Today
- Tomorrow
- This Friday
- Next Week
- [Enter custom date]"
```

---

### 8. Security & Permissions

- Only **Admin** role can access TaskAgent
- Tasks can only be assigned to active employees
- Audit logging via `AIAuditLog` model
- Confirmation required before creation (no accidental tasks)

---

### 9. Implementation Order

1. **Phase 1: Backend** (COMPLETED)
   - [x] Add task actions to `actions.py`
   - [x] Add employee resolver to `resolver.py`
   - [x] Add task executor to `executor.py`
   - [x] Create task prompt in `prompts.py`
   - [x] Register agent in `service.py`

2. **Phase 2: Frontend** (COMPLETED)
   - [x] Create `TaskAgentChat.js` component
   - [x] Add `buildTaskContext()` to aiService
   - [x] Create confirmation modal component
   - [x] Integrate into TaskManagement page

3. **Phase 3: Testing**
   - [ ] Test fuzzy name matching
   - [ ] Test date extraction
   - [ ] Test formal text generation
   - [ ] Test confirmation flow
   - [ ] Test fallback templates

---

## Summary

The TaskAgent will:
1. Accept natural language input like "Tell Ahmed to submit reports by Friday"
2. Fuzzy match "Ahmed" to exact employee in database
3. Generate formal task description via AI
4. Show confirmation modal with full task preview
5. Create task only after admin confirms completeness
6. Log all operations for audit trail

This follows the exact same architecture as FeeAgent and InventoryAgent for consistency.
