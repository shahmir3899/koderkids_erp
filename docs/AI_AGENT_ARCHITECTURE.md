# AI Agent Architecture Guide

**Version:** 1.0
**Last Updated:** January 2026
**Purpose:** Comprehensive guide to the AI Agent architecture used in the School Management System

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Components](#architecture-components)
3. [Data Flow](#data-flow)
4. [Core Patterns](#core-patterns)
5. [Directory Structure](#directory-structure)
6. [Technology Stack](#technology-stack)

---

## Overview

The AI Agent system enables natural language interaction with backend APIs through LLM-powered intent recognition and parameter extraction. Users can perform complex operations using conversational commands instead of manual form filling.

### Key Features

- **Natural Language Processing**: Understands user intent from conversational input
- **Multi-turn Conversations**: Maintains context across multiple interactions
- **Fuzzy Matching**: Resolves ambiguous names (students, schools) with confidence scoring
- **Confirmation Workflow**: Requires explicit approval for destructive operations
- **Context Preservation**: Automatically carries forward parameters (month, school, fee IDs)
- **Fallback Support**: Template-based quick actions when AI is unavailable

### Current Agents

- **Fee Agent**: Manages fee creation, updates, bulk operations, and reporting
- **Inventory Agent**: (Planned) Handles inventory tracking and assignments
- **HR Agent**: (Planned) Manages staff attendance and records
- **Broadcast Agent**: (Planned) Sends notifications to parents/teachers

---

## Architecture Components

### 1. Frontend Layer

**Location:** `frontend/src/components/finance/FeeAgentChat.js`

**Responsibilities:**
- Renders chat interface
- Manages conversation history (last 6 messages)
- Handles user input and displays responses
- Shows confirmation dialogs
- Provides fallback template-based actions

**Key Functions:**
```javascript
buildConversationHistory()  // Converts chat to API format
handleSendMessage()         // Processes user input
handleConfirm()             // Handles confirmation dialogs
addMessage()                // Adds messages to chat history
```

**State Management:**
```javascript
chatHistory        // Array of {id, type, content, data, timestamp}
pendingConfirmation // {token, action, message, data}
pendingOverwrite   // {action, params, data}
isProcessing       // Boolean for loading state
```

---

### 2. API Service Layer

**Location:** `frontend/src/services/aiService.js`

**Responsibilities:**
- Communicates with backend AI endpoints
- Builds context objects with schools/students data
- Handles authentication headers

**Key Functions:**
```javascript
executeAICommand({message, agent, context, conversationHistory})
confirmAIAction(token, confirmed)
executeOverwrite({action, params})
checkAIHealth()
buildFeeContext(schools, students, fees)
```

---

### 3. Backend API Endpoint

**Location:** `backend/ai/views.py`

**Endpoint:** `POST /api/ai/execute/`

**Request Format:**
```json
{
  "message": "show pending fees for Mazen School",
  "agent": "fee",
  "context": {
    "schools": [...],
    "students": [...],
    "current_month": "Jan-2026"
  },
  "conversation_history": [
    {"role": "user", "content": "...", "data": null},
    {"role": "assistant", "content": "...", "data": {...}}
  ]
}
```

**Response Format:**
```json
{
  "success": true,
  "action": "GET_FEES",
  "message": "Found 5 fee records | Total: PKR 25,000",
  "data": {
    "results": [...],
    "fee_ids": [123, 456, 789],
    "school_id": 1,
    "month": "Jan-2026"
  },
  "needs_confirmation": false,
  "audit_log_id": 42
}
```

---

### 4. AI Service Core

**Location:** `backend/ai/service.py`

**Class:** `AIService`

**Key Methods:**

```python
process_message(message, agent, context, conversation_history)
    → Orchestrates the entire flow

_merge_params_from_history(current_parsed, conversation_history, context)
    → Extracts parameters from previous responses

_get_confirmation_details(agent, action_name, params)
    → Builds confirmation modal content

_generate_school_selection_message()
    → Creates numbered school selection list
```

**Processing Flow:**
1. Check for numeric input (handles clarification responses)
2. Build system prompt with context
3. Include conversation history (last 6 messages)
4. Call LLM with prompt
5. Parse JSON response
6. Normalize action names
7. Merge parameters from history
8. Resolve ambiguous parameters
9. Check for existing records (overwrite confirmation)
10. Execute action or request confirmation
11. Log to audit trail

---

### 5. Prompt Generator

**Location:** `backend/ai/prompts.py`

**Function:** `get_agent_prompt(agent, context)`

**Generates system prompts with:**
- Available actions and examples
- Decision rules (CRITICAL PRIORITY, context awareness, regular rules)
- Current context (date, schools, students)
- JSON format requirements

**Prompt Structure:**
```
You are a [AGENT TYPE] assistant. Return ONLY valid JSON.

AVAILABLE ACTIONS:
[List of actions with examples]

CONTEXT:
- Current date: 2026-01-22
- Available schools: [...]

CRITICAL PRIORITY RULES:
- [Intent preservation rules]

CONTEXT AWARENESS:
- [Parameter carryover rules]

Regular rules:
- [Detailed decision tree]
```

---

### 6. Action Definitions

**Location:** `backend/ai/actions.py`

**Structure:**
```python
ActionDefinition(
    name="CREATE_MONTHLY_FEES",
    action_type=ActionType.WRITE,  # READ or WRITE
    required_params=["school_id", "month"],
    optional_params=["force_overwrite"],
    handler="create_monthly_fees",  # For direct execution
    endpoint="/api/fees/create-month/",  # For API proxy
    requires_confirmation=False,
    description="Create monthly fee records for a school"
)
```

**Action Types:**
- **READ**: Query operations (GET_FEES, GET_FEE_SUMMARY)
- **WRITE**: Create/update operations (CREATE_MONTHLY_FEES, UPDATE_FEE)
- **CHAT**: Conversational responses (greetings, help)
- **CLARIFY**: Request more information

---

### 7. Parameter Resolver

**Location:** `backend/ai/resolver.py`

**Class:** `ParameterResolver`

**Responsibilities:**
- Converts fuzzy inputs to exact IDs
- Handles ambiguous matches with clarification
- Validates required parameters
- Gathers preview data for confirmations

**Key Methods:**

```python
resolve(action_name, params, context)
    → Main resolver entry point

_resolve_student_name(params, context)
    → Fuzzy match student names (threshold: 0.6)

_resolve_school_name(params, context)
    → Fuzzy match school names (threshold: 0.6)

_resolve_bulk_update_fees(params, context)
    → Gathers fee IDs for bulk operations

_resolve_create_missing_fees(params, context)
    → Counts schools and students missing fees
```

**Fuzzy Matching:**
- **Threshold:** 0.6 (minimum similarity score)
- **Auto-select:** 0.85 (if best match is this confident)
- **Clarification:** Returns numbered list if multiple matches < 0.85

---

### 8. Action Executor

**Location:** `backend/ai/executor.py`

**Class:** `ActionExecutor`

**Responsibilities:**
- Executes resolved actions
- Calls backend APIs or handles directly
- Returns structured responses

**Key Methods:**

```python
execute(action_name, params, user)
    → Executes action and returns result

_execute_get_fees(params)
    → Query fee records with aggregation

_execute_get_fee_summary(params)
    → Get financial summary statistics

_execute_bulk_update_fees(params)
    → Update multiple fee records
```

---

### 9. LLM Integration

**Location:** `backend/ai/llm.py`

**Class:** `LLMService`

**Supports:**
- **Groq** (Production): Fast cloud inference
- **Ollama** (Development): Local LLM server

**Configuration:**
```python
LLM_CONFIG = {
    'provider': 'groq',  # or 'ollama'
    'model': 'llama3-8b-8192',
    'api_key': settings.GROQ_API_KEY,
    'temperature': 0.1,  # Low for consistent JSON
    'max_tokens': 200    # Short for JSON responses
}
```

**Method:**
```python
generate_sync(prompt, system_prompt, max_tokens=200)
    → Returns {
        'success': bool,
        'response': str,
        'parsed': dict,  # Parsed JSON
        'response_time_ms': int,
        'error': str
    }
```

---

### 10. Audit Logging

**Location:** `backend/ai/models.py`

**Model:** `AIAuditLog`

**Tracks:**
- User messages and intent
- LLM raw responses and parsed JSON
- Action execution results
- Confirmation tokens
- Response times
- Errors

**Fields:**
```python
user, agent, message, action_name, parameters,
llm_response_raw, llm_response_parsed,
action_result, status, error_message,
confirmation_token, response_time_ms, created_at
```

---

## Data Flow

### Standard Flow (No Confirmation)

```
User Input
   ↓
Frontend: Add to chatHistory
   ↓
API Service: executeAICommand()
   ↓
Backend: /api/ai/execute/
   ↓
AIService.process_message()
   ↓
Prompt Generator: Build system prompt
   ↓
LLM Service: Generate JSON response
   ↓
Action Resolver: Resolve ambiguous params
   ↓
Action Executor: Execute action
   ↓
Response with data
   ↓
Frontend: Display result
```

### Confirmation Flow

```
User: "delete fee 123"
   ↓
Backend: requires_confirmation=True
   ↓
Frontend: Show confirmation dialog
   ↓
User: Clicks "Confirm"
   ↓
confirmAIAction(token, true)
   ↓
Backend: Verify token, execute action
   ↓
Frontend: Display success
```

### Clarification Flow

```
User: "create fees for Ali"
   ↓
Resolver: Multiple students match "Ali"
   ↓
Backend: action="CLARIFY"
   ↓
Frontend: Display numbered list
   ↓
User: Selects "2"
   ↓
Backend: Recognizes numeric input
   ↓
Completes original action
```

### Context Carryover Flow

```
User: "show pending fees for Mazen School"
   ↓
Response: fee_ids=[123,456], school_id=1, month="Jan-2026"
   ↓
Frontend: Stores in chatHistory[last].data
   ↓
User: "mark all as paid"
   ↓
buildConversationHistory() includes data
   ↓
Backend: _merge_params_from_history()
   ↓
Extracts: fee_ids=[123,456], school_id=1
   ↓
Executes: BULK_UPDATE_FEES with those IDs
```

---

## Core Patterns

### 1. Intent Recognition

**Pattern:** System prompt with decision tree

```python
# In prompts.py
if user says "show" → GET_FEES
if user says "create" → CREATE_MONTHLY_FEES
if user says "update [student]" → UPDATE_FEE
if user says "update all" → BULK_UPDATE_FEES
```

### 2. Fuzzy Parameter Resolution

**Pattern:** Similarity scoring with confidence thresholds

```python
# In resolver.py
matches = [(student, similarity_score(input, student.name))
           for student in students]
best_match = max(matches, key=lambda x: x[1])

if best_match[1] >= 0.85:
    # Auto-select
    return best_match[0].id
elif best_match[1] >= 0.6:
    # Multiple matches, ask for clarification
    return CLARIFY with numbered list
else:
    # No good matches
    return error
```

### 3. Confirmation Token

**Pattern:** Temporary token for destructive operations

```python
# In service.py
if action_requires_confirmation:
    token = secrets.token_hex(16)
    audit_log.confirmation_token = token
    audit_log.status = 'pending_confirmation'
    audit_log.save()
    return {
        "needs_confirmation": True,
        "confirmation_token": token
    }

# Later, in views.py
audit_log = AIAuditLog.objects.get(confirmation_token=token)
if confirmed:
    executor.execute(audit_log.action_name, audit_log.parameters)
```

### 4. Context Preservation

**Pattern:** Extract parameters from conversation history

```python
# In service.py
def _merge_params_from_history(current, history, context):
    for msg in reversed(history):
        if msg['role'] == 'assistant' and msg.get('data'):
            # Extract structured data
            if 'fee_ids' in msg['data']:
                current['fee_ids'] = msg['data']['fee_ids']
            if 'month' in msg['data']:
                current['month'] = msg['data']['month']
    return current
```

### 5. Preview Data for Confirmation

**Pattern:** Resolver gathers data, service builds message

```python
# In resolver.py
params['_preview_fees_count'] = fees.count()
params['_preview_school_name'] = school.name

# In service.py
def _get_confirmation_details(action, params):
    count = params.get('_preview_fees_count')
    school = params.get('_preview_school_name')
    return {
        "message": f"Update {count} fees for {school}?",
        "items": []
    }
```

---

## Directory Structure

```
backend/
├── ai/
│   ├── __init__.py
│   ├── models.py              # AIAuditLog model
│   ├── views.py               # API endpoints
│   ├── service.py             # AIService orchestrator
│   ├── prompts.py             # Prompt templates
│   ├── actions.py             # Action definitions
│   ├── resolver.py            # Parameter resolver
│   ├── executor.py            # Action executor
│   ├── llm.py                 # LLM integration
│   └── migrations/
│
├── students/
│   ├── models.py              # Fee, Student, School models
│   ├── views.py               # Fee API endpoints
│   ├── permissions.py         # Custom permissions
│   └── serializers.py
│
└── authentication/
    ├── models.py              # User model
    └── permissions.py

frontend/
├── src/
│   ├── components/
│   │   └── finance/
│   │       └── FeeAgentChat.js   # Chat UI component
│   │
│   └── services/
│       ├── aiService.js          # AI API client
│       └── feeService.js         # Fee API client
│
└── public/

docs/
├── AI_AGENT_ARCHITECTURE.md      # This file
├── AI_AGENT_IMPLEMENTATION.md    # Step-by-step guide
└── AI_PROMPT_ENGINEERING.md      # Prompt best practices
```

---

## Technology Stack

### Backend

- **Framework:** Django 4.2+ with Django REST Framework
- **Database:** PostgreSQL (for production) or SQLite (for development)
- **LLM Providers:**
  - Groq (Production): Cloud-hosted, fast inference
  - Ollama (Development): Local LLM server
- **Models:** Llama 3 8B (or similar instruction-tuned models)
- **Authentication:** JWT with custom User model (Admin/Teacher/Student roles)

### Frontend

- **Framework:** React 18+
- **State Management:** React hooks (useState, useCallback, useEffect)
- **HTTP Client:** Axios
- **Styling:** Inline styles with design constants
- **Notifications:** react-toastify

### AI/ML

- **LLM Temperature:** 0.1 (for consistent JSON output)
- **Max Tokens:** 200 (JSON responses are short)
- **Response Format:** Strict JSON-only
- **Fuzzy Matching:** difflib.SequenceMatcher (Python built-in)
- **Conversation Window:** 6 messages (3 exchanges)

---

## Security Considerations

### Permission Model

```python
# In students/permissions.py

class IsAdminOrTeacher(permissions.BasePermission):
    """
    - Admins: Full access to all schools
    - Teachers: Full access but only to assigned schools
    - Students: No access
    """

def check_school_access(user, school_id):
    if user.role == 'Admin':
        return True
    if user.role == 'Teacher':
        return user.assigned_schools.filter(id=school_id).exists()
    return False
```

### Audit Trail

Every AI interaction is logged with:
- User identity
- Input message
- LLM response (raw and parsed)
- Action executed
- Result
- Timestamp
- Errors

### Token-Based Confirmations

- Cryptographically secure tokens (secrets.token_hex)
- Single-use tokens (status changes to 'confirmed' or 'cancelled')
- Expiration: Tokens older than 1 hour are ignored

### Input Validation

- All LLM outputs are validated as JSON
- Required parameters checked before execution
- SQL injection prevented by ORM usage
- School access verified for Teachers

---

## Performance Optimizations

### 1. Database Aggregation

```python
# Instead of:
fees = Fee.objects.filter(month=month)
total = sum(f.total_fee for f in fees)  # Loads all into memory

# Use:
aggregates = fees.aggregate(
    total=Sum('total_fee'),
    count=Count('id')
)
```

### 2. Lazy Loading Prevention

```python
# Use select_related for foreign keys
fees = Fee.objects.select_related('school').filter(...)

# Use prefetch_related for many-to-many
teacher.assigned_schools.all()
```

### 3. Response Truncation

- Display first 50 records
- Calculate aggregates on ALL records
- Return `truncated: true` flag

### 4. Conversation History Limit

- Keep only last 6 messages (3 exchanges)
- Reduces LLM context size
- Faster inference

---

## Monitoring and Debugging

### Audit Log Queries

```python
# Check recent AI activity
AIAuditLog.objects.filter(
    created_at__gte=timezone.now() - timedelta(days=1)
).order_by('-created_at')

# Find failed actions
AIAuditLog.objects.filter(status='failed')

# Check specific user's AI usage
AIAuditLog.objects.filter(user=user)
```

### LLM Response Debugging

```python
# In views.py
if result.get('debug_error'):
    console.log('AI Debug Error:', result.debug_error)

# Frontend shows error in fallback message
```

### Health Check

```javascript
// Frontend
const health = await checkAIHealth()
if (!health.ai_available) {
    // Show template-based quick actions
}
```

---

## Next Steps

1. Read [AI_AGENT_IMPLEMENTATION.md](./AI_AGENT_IMPLEMENTATION.md) for step-by-step implementation
2. Review [AI_PROMPT_ENGINEERING.md](./AI_PROMPT_ENGINEERING.md) for prompt writing tips
3. Explore the codebase starting from `backend/ai/service.py`
4. Test with sample queries: "show pending fees", "create fees for [school]"

---

**Document Maintainer:** School Management System Team
**Feedback:** Report issues or suggestions via GitHub Issues
