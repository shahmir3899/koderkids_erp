# AI Agent Implementation Guide

**Version:** 1.0
**Last Updated:** January 2026
**Purpose:** Step-by-step guide to building new AI agents for the School Management System

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Planning Your Agent](#planning-your-agent)
3. [Step-by-Step Implementation](#step-by-step-implementation)
4. [Testing Your Agent](#testing-your-agent)
5. [Deployment Checklist](#deployment-checklist)
6. [Example: Building an Inventory Agent](#example-building-an-inventory-agent)

---

## Prerequisites

### Required Knowledge

- Python (Django, Django REST Framework)
- React (Hooks, state management)
- LLM concepts (prompts, JSON responses)
- REST API design
- Database modeling (Django ORM)

### Development Environment

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Frontend
cd frontend
npm install

# LLM (choose one)
# Option 1: Groq (cloud)
export GROQ_API_KEY="your_key_here"

# Option 2: Ollama (local)
ollama pull llama3
ollama serve
```

### Existing Infrastructure

You already have:
- ✅ AI service framework (`backend/ai/`)
- ✅ LLM integration (Groq/Ollama)
- ✅ Audit logging system
- ✅ Frontend chat component (can be adapted)
- ✅ Permission system

---

## Planning Your Agent

### Step 1: Define Agent Scope

**Ask yourself:**
1. What domain does this agent cover? (e.g., Inventory, HR, Broadcast)
2. What actions will users perform? (Create, Read, Update, Delete, Query)
3. What entities are involved? (Items, Staff, Messages)
4. What permissions are needed? (Admin-only, Teacher-access, etc.)

**Example: Inventory Agent**
- **Domain:** Inventory management
- **Actions:** View items, update status, delete items, get summary
- **Entities:** InventoryItem, InventoryCategory, School
- **Permissions:** Admin and Teachers (school-level)

---

### Step 2: List All Actions

Create a comprehensive action list with:
- Action name
- Type (READ/WRITE)
- Required parameters
- Optional parameters
- Confirmation needed?

**Template:**

| Action Name | Type | Required Params | Optional Params | Confirmation? |
|------------|------|----------------|----------------|---------------|
| GET_ITEMS | READ | - | status, category, school_id | No |
| UPDATE_ITEM_STATUS | WRITE | item_id, status | - | No |
| DELETE_ITEM | WRITE | item_id | - | Yes |
| BULK_DELETE_ITEMS | WRITE | item_ids | - | Yes |
| GET_SUMMARY | READ | - | school_id | No |

---

### Step 3: Design Your Prompts

**Key prompt sections:**
1. Role definition ("You are a...")
2. Output format ("Return ONLY JSON")
3. Available actions with examples
4. Context (current data, date, etc.)
5. Decision rules (how to choose actions)

---

### Step 4: Plan Permission Model

**Questions:**
1. Can students access this agent? (Usually no)
2. Can teachers access all data or only their schools?
3. Are there any Admin-only operations?

---

## Step-by-Step Implementation

### Backend Implementation

#### Step 1: Define Actions

**File:** `backend/ai/actions.py`

Add your actions to the `ACTIONS` dictionary:

```python
# Example: Inventory Agent Actions
"GET_ITEMS": ActionDefinition(
    name="GET_ITEMS",
    action_type=ActionType.READ,
    required_params=[],  # No required params
    optional_params=["category", "status", "school_id", "search"],
    handler="get_items",  # Will call executor._execute_get_items()
    requires_confirmation=False,
    description="Query inventory items with filters"
),

"UPDATE_ITEM_STATUS": ActionDefinition(
    name="UPDATE_ITEM_STATUS",
    action_type=ActionType.WRITE,
    required_params=["item_id", "status"],
    optional_params=[],
    endpoint="/api/inventory/update-status/",  # Or use handler
    requires_confirmation=False,
    description="Change item status (Available, Assigned, Damaged, etc.)"
),

"DELETE_ITEM": ActionDefinition(
    name="DELETE_ITEM",
    action_type=ActionType.WRITE,
    required_params=["item_id"],
    optional_params=[],
    endpoint="/api/inventory/delete/",
    requires_confirmation=True,  # Destructive operation
    description="Delete a single inventory item"
),

"BULK_DELETE_ITEMS": ActionDefinition(
    name="BULK_DELETE_ITEMS",
    action_type=ActionType.WRITE,
    required_params=["item_ids"],  # Array of IDs
    optional_params=[],
    endpoint="/api/inventory/bulk-delete/",
    requires_confirmation=True,
    description="Delete multiple inventory items at once"
),

"GET_SUMMARY": ActionDefinition(
    name="GET_SUMMARY",
    action_type=ActionType.READ,
    required_params=[],
    optional_params=["school_id"],
    handler="get_inventory_summary",
    requires_confirmation=False,
    description="Get inventory statistics by status"
),
```

**Important:**
- Use `handler` for custom logic in executor
- Use `endpoint` to proxy to existing API
- Set `requires_confirmation=True` for destructive ops

---

#### Step 2: Create System Prompt

**File:** `backend/ai/prompts.py`

Add a new prompt function:

```python
def get_inventory_agent_prompt(context: dict) -> str:
    """Generate system prompt for Inventory Agent."""
    schools_list = "\n".join([
        f"  - ID: {s['id']}, Name: {s['name']}"
        for s in context.get('schools', [])
    ])

    categories_list = "\n".join([
        f"  - ID: {c['id']}, Name: {c['name']}"
        for c in context.get('categories', [])
    ])

    return f'''You are a school inventory management assistant. You MUST respond ONLY with valid JSON.

AVAILABLE ACTIONS:

1. GET_ITEMS - Query inventory items
   Optional: category (integer ID), status (string), school_id, search (text)
   Example: {{"action": "GET_ITEMS", "status": "Available"}}
   Example: {{"action": "GET_ITEMS", "category": 1, "school_id": 1}}

2. GET_SUMMARY - Get inventory statistics
   Optional: school_id
   Example: {{"action": "GET_SUMMARY"}}

3. UPDATE_ITEM_STATUS - Change item status
   Required: item_id (integer), status (string)
   Example: {{"action": "UPDATE_ITEM_STATUS", "item_id": 123, "status": "Damaged"}}

4. DELETE_ITEM - Delete single item (requires confirmation)
   Required: item_id (integer)
   Example: {{"action": "DELETE_ITEM", "item_id": 123}}

5. BULK_DELETE_ITEMS - Delete multiple items (requires confirmation)
   Required: item_ids (array of integers)
   Example: {{"action": "BULK_DELETE_ITEMS", "item_ids": [1, 2, 3]}}

CONTEXT:
- Current date: {context.get('current_date', str(date.today()))}
- Available schools:
{schools_list if schools_list else "  (No schools provided)"}
- Inventory categories:
{categories_list if categories_list else "  (No categories provided)"}
- Valid statuses: Available, Assigned, Damaged, Lost, Disposed

RULES:
1. ALWAYS respond with valid JSON only
2. Match school/category names to their IDs
3. If unclear, respond: {{"action": "CLARIFY", "message": "your question"}}
4. If unsupported, respond: {{"action": "UNSUPPORTED", "message": "reason"}}

DECISION RULES:
- User asks "show items" or "list items" → GET_ITEMS
- User asks "available items" or "items in stock" → GET_ITEMS with status="Available"
- User asks "damaged items" → GET_ITEMS with status="Damaged"
- User asks "inventory summary" → GET_SUMMARY
- User says "mark item [ID] as damaged" → UPDATE_ITEM_STATUS with item_id and status="Damaged"
- User says "delete item [ID]" → DELETE_ITEM with item_id
- User says "delete items [ID1, ID2, ID3]" → BULK_DELETE_ITEMS with item_ids array

Remember: Output ONLY the JSON object, nothing else.'''


# Update get_agent_prompt() function
def get_agent_prompt(agent: str, context: dict) -> str:
    prompts = {
        'fee': get_fee_agent_prompt,
        'inventory': get_inventory_agent_prompt,  # Add this
        'hr': get_hr_agent_prompt,
        'broadcast': get_broadcast_agent_prompt,
    }
    # ... rest of function
```

**Prompt Design Tips:**
- Start with role definition
- List all actions with clear examples
- Provide context (schools, categories, date)
- Include decision rules (if-then logic)
- Remind to output JSON only

---

#### Step 3: Create Parameter Resolver Methods

**File:** `backend/ai/resolver.py`

Add resolver methods for your actions:

```python
# In ParameterResolver class

def _resolve_update_item_status(self, params: Dict[str, Any]) -> Dict[str, Any]:
    """Resolve item_id for UPDATE_ITEM_STATUS."""
    from inventory.models import InventoryItem

    item_id = params.get('item_id')
    if not item_id:
        return {
            "status": "error",
            "message": "Item ID is required"
        }

    # Verify item exists
    try:
        item = InventoryItem.objects.get(id=item_id)
        params['_preview_item_name'] = item.name
        params['_preview_current_status'] = item.status
    except InventoryItem.DoesNotExist:
        return {
            "status": "error",
            "message": f"Item ID {item_id} not found"
        }

    # Validate status
    valid_statuses = ['Available', 'Assigned', 'Damaged', 'Lost', 'Disposed']
    status = params.get('status')
    if status not in valid_statuses:
        return {
            "status": "error",
            "message": f"Invalid status. Valid options: {', '.join(valid_statuses)}"
        }

    return {"status": "success"}


def _resolve_bulk_delete_items(self, params: Dict[str, Any]) -> Dict[str, Any]:
    """Resolve and validate item_ids for BULK_DELETE_ITEMS."""
    from inventory.models import InventoryItem

    item_ids = params.get('item_ids', [])
    if not item_ids:
        return {
            "status": "error",
            "message": "At least one item ID is required"
        }

    # Verify all items exist
    items = InventoryItem.objects.filter(id__in=item_ids)
    found_ids = list(items.values_list('id', flat=True))
    missing_ids = set(item_ids) - set(found_ids)

    if missing_ids:
        return {
            "status": "error",
            "message": f"Items not found: {list(missing_ids)}"
        }

    # Add preview data for confirmation
    params['_preview_items_count'] = len(found_ids)
    params['_preview_items'] = [
        {"id": item.id, "name": item.name}
        for item in items[:5]  # First 5 for preview
    ]

    return {"status": "success"}


# Add to resolve() method dispatch
def resolve(self, action_name: str, params: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
    # ... existing code ...

    resolver_map = {
        # ... existing resolvers ...
        'UPDATE_ITEM_STATUS': self._resolve_update_item_status,
        'BULK_DELETE_ITEMS': self._resolve_bulk_delete_items,
    }

    # ... rest of method
```

**Resolver Best Practices:**
- Validate required parameters
- Check database records exist
- Gather preview data for confirmation
- Return clear error messages

---

#### Step 4: Create Action Executor Methods

**File:** `backend/ai/executor.py`

Add executor methods (if using `handler` instead of `endpoint`):

```python
# In ActionExecutor class

def _execute_get_items(self, params: Dict) -> Dict:
    """Query inventory items with filters."""
    from inventory.models import InventoryItem
    from django.db.models import Q, Count

    items = InventoryItem.objects.select_related('category', 'school').all()

    # Apply filters
    if params.get('category'):
        items = items.filter(category_id=params['category'])

    if params.get('status'):
        items = items.filter(status=params['status'])

    if params.get('school_id'):
        items = items.filter(school_id=params['school_id'])

    if params.get('search'):
        search = params['search']
        items = items.filter(
            Q(name__icontains=search) |
            Q(description__icontains=search)
        )

    # Get count
    total_count = items.count()

    # Limit to 50 for display
    items = items[:50]

    # Convert to list
    item_list = []
    for item in items:
        item_list.append({
            'id': item.id,
            'name': item.name,
            'category': item.category.name if item.category else 'Uncategorized',
            'status': item.status,
            'school': item.school.name if item.school else 'Unassigned',
            'quantity': item.quantity
        })

    message = f"Found {total_count} item(s)"
    if params.get('status'):
        message += f" with status '{params['status']}'"

    # Include item IDs in message if 10 or fewer
    if 0 < total_count <= 10:
        item_ids = [str(i['id']) for i in item_list]
        message += f"\nItem IDs: {', '.join(item_ids)}"

    return {
        "success": True,
        "message": message,
        "data": {
            "results": item_list,
            "count": total_count,
            "item_ids": [i['id'] for i in item_list],
            # Context preservation
            "status": params.get('status'),
            "category": params.get('category'),
            "school_id": params.get('school_id')
        }
    }


def _execute_get_inventory_summary(self, params: Dict) -> Dict:
    """Get inventory statistics by status."""
    from inventory.models import InventoryItem
    from django.db.models import Count, Q

    items = InventoryItem.objects.all()

    if params.get('school_id'):
        items = items.filter(school_id=params['school_id'])

    # Aggregate by status
    summary = items.values('status').annotate(count=Count('id'))

    status_counts = {s['status']: s['count'] for s in summary}
    total_items = sum(status_counts.values())

    message = f"Inventory Summary: {total_items} total items"

    return {
        "success": True,
        "message": message,
        "data": {
            "total_items": total_items,
            "by_status": status_counts,
            "school_id": params.get('school_id')
        }
    }


# Add to execute() method dispatch
def execute(self, action_name: str, params: Dict[str, Any], user) -> Dict[str, Any]:
    # ... existing code ...

    handler_map = {
        # ... existing handlers ...
        'get_items': self._execute_get_items,
        'get_inventory_summary': self._execute_get_inventory_summary,
    }

    # ... rest of method
```

**Executor Best Practices:**
- Use database aggregation for efficiency
- Limit displayed results (e.g., 50)
- Include IDs in message for small result sets
- Return context data for multi-turn conversations

---

#### Step 5: Add Confirmation Details

**File:** `backend/ai/service.py`

Update `_get_confirmation_details()` for your actions:

```python
def _get_confirmation_details(
    self,
    agent: str,
    action_name: str,
    params: Dict[str, Any]
) -> Dict[str, Any]:
    # ... existing code for other agents ...

    # Inventory Agent confirmations
    if action_name == 'DELETE_ITEM':
        item_name = params.get('_preview_item_name', 'Unknown')
        return {
            "message": f"Delete item '{item_name}'?",
            "items": []
        }

    if action_name == 'BULK_DELETE_ITEMS':
        items_count = params.get('_preview_items_count', 0)
        preview_items = params.get('_preview_items', [])
        return {
            "message": f"Delete {items_count} item(s)?",
            "items": [{"name": i['name']} for i in preview_items]
        }

    # ... rest of method
```

---

#### Step 6: Create Backend API Endpoints (if needed)

**File:** `backend/inventory/views.py`

If using `endpoint` instead of `handler`, create API endpoints:

```python
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .models import InventoryItem
from .permissions import IsAdminOrTeacher, check_school_access


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_item_status(request):
    """
    Update inventory item status.
    Permission: Admin or Teacher (school-level)
    """
    from .permissions import IsAdminOrTeacher

    permission = IsAdminOrTeacher()
    if not permission.has_permission(request, None):
        return Response({
            "error": "Only administrators and teachers can update inventory."
        }, status=status.HTTP_403_FORBIDDEN)

    item_id = request.data.get('item_id')
    new_status = request.data.get('status')

    try:
        item = InventoryItem.objects.get(id=item_id)

        # Check school access for teachers
        if item.school_id and not check_school_access(request.user, item.school_id):
            return Response({
                "error": "You don't have permission to update this item."
            }, status=status.HTTP_403_FORBIDDEN)

        item.status = new_status
        item.save()

        return Response({
            "message": f"Item '{item.name}' status updated to '{new_status}'",
            "item": {
                "id": item.id,
                "name": item.name,
                "status": item.status
            }
        }, status=status.HTTP_200_OK)

    except InventoryItem.DoesNotExist:
        return Response({
            "error": "Item not found"
        }, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def delete_item(request):
    """
    Delete a single inventory item.
    Permission: Admin or Teacher (school-level)
    """
    from .permissions import IsAdminOrTeacher

    permission = IsAdminOrTeacher()
    if not permission.has_permission(request, None):
        return Response({
            "error": "Only administrators and teachers can delete inventory."
        }, status=status.HTTP_403_FORBIDDEN)

    item_id = request.data.get('item_id')

    try:
        item = InventoryItem.objects.get(id=item_id)

        # Check school access for teachers
        if item.school_id and not check_school_access(request.user, item.school_id):
            return Response({
                "error": "You don't have permission to delete this item."
            }, status=status.HTTP_403_FORBIDDEN)

        item_name = item.name
        item.delete()

        return Response({
            "message": f"Item '{item_name}' deleted successfully"
        }, status=status.HTTP_200_OK)

    except InventoryItem.DoesNotExist:
        return Response({
            "error": "Item not found"
        }, status=status.HTTP_404_NOT_FOUND)


# Add to urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('update-status/', views.update_item_status),
    path('delete/', views.delete_item),
    # ... other endpoints
]
```

---

### Frontend Implementation

#### Step 1: Create or Adapt Chat Component

**Option A:** Reuse existing `FeeAgentChat.js` with props

```javascript
// In InventoryPage.js
import FeeAgentChat from './FeeAgentChat';  // Rename to AgentChat later

<FeeAgentChat
    agent="inventory"  // Different agent
    schools={schools}
    context={{
        categories: categories,  // Additional context
        statuses: ['Available', 'Assigned', 'Damaged', 'Lost']
    }}
    onRefresh={fetchInventory}
    height="600px"
/>
```

**Option B:** Create dedicated component (copy and modify)

```bash
cp frontend/src/components/finance/FeeAgentChat.js \
   frontend/src/components/inventory/InventoryAgentChat.js
```

Then modify:
- Change agent prop default to "inventory"
- Update example prompts
- Customize quick action templates

---

#### Step 2: Update AI Service Context Builder

**File:** `frontend/src/services/aiService.js`

Add a context builder for your agent:

```javascript
export const buildInventoryContext = (schools, categories, items) => {
    return {
        schools: schools.map(s => ({
            id: s.id,
            name: s.name
        })),
        categories: categories.map(c => ({
            id: c.id,
            name: c.name
        })),
        items_count: items.length,
        current_date: new Date().toISOString().split('T')[0]
    };
};
```

---

#### Step 3: Create Quick Action Templates

**File:** Your chat component

```javascript
const INVENTORY_TEMPLATES = [
    {
        id: 'view_items',
        name: 'View Items',
        icon: '📦',
        description: 'List inventory items',
        fields: [
            { key: 'status', label: 'Status', type: 'select',
              options: ['All', 'Available', 'Assigned', 'Damaged'],
              optional: true }
        ]
    },
    {
        id: 'update_status',
        name: 'Update Status',
        icon: '✏️',
        description: 'Change item status',
        fields: [
            { key: 'item_id', label: 'Item ID', type: 'number' },
            { key: 'status', label: 'New Status', type: 'select',
              options: ['Available', 'Assigned', 'Damaged', 'Lost'] }
        ]
    },
    {
        id: 'summary',
        name: 'Summary',
        icon: '📊',
        description: 'Inventory statistics',
        fields: []
    }
];
```

---

#### Step 4: Example Prompts

```javascript
const EXAMPLE_PROMPTS = [
    "Show available items",
    "Mark item 123 as damaged",
    "Inventory summary",
    "Show items for Mazen School"
];
```

---

## Testing Your Agent

### Manual Testing Checklist

**1. Basic Queries**
- [ ] "show items" → Returns list of items
- [ ] "available items" → Filters by status
- [ ] "inventory summary" → Returns statistics

**2. Updates**
- [ ] "mark item 123 as damaged" → Updates status
- [ ] "update item 456 to available" → Updates status
- [ ] Invalid item ID → Shows error message

**3. Deletions**
- [ ] "delete item 123" → Shows confirmation
- [ ] Confirm deletion → Item deleted
- [ ] Cancel deletion → Item not deleted
- [ ] "delete items 1,2,3" → Bulk delete confirmation

**4. Fuzzy Matching**
- [ ] "show items for Mazen" → Resolves school name
- [ ] Ambiguous name → Shows clarification list
- [ ] Select from list → Completes action

**5. Multi-turn Conversations**
- [ ] "show damaged items" → Lists items
- [ ] "mark all as available" → Updates those items
- [ ] Context preserved (school, status, IDs)

**6. Permissions**
- [ ] Admin can access all schools ✓
- [ ] Teacher can only access assigned schools ✓
- [ ] Student cannot access ✗
- [ ] Unauthorized school access denied ✗

**7. Edge Cases**
- [ ] Empty results → Shows "no items found"
- [ ] Malformed input → Returns CLARIFY
- [ ] LLM unavailable → Shows quick actions
- [ ] Network error → Shows error message

---

### Automated Testing

```python
# backend/ai/tests/test_inventory_agent.py

from django.test import TestCase
from ai.service import AIService
from inventory.models import InventoryItem, InventoryCategory
from authentication.models import User

class InventoryAgentTestCase(TestCase):
    def setUp(self):
        self.service = AIService()
        self.admin = User.objects.create(
            username="admin",
            role="Admin"
        )
        self.category = InventoryCategory.objects.create(
            name="Furniture"
        )
        self.item = InventoryItem.objects.create(
            name="Desk",
            category=self.category,
            status="Available",
            quantity=10
        )

    def test_get_items(self):
        """Test GET_ITEMS action"""
        result = self.service.process_message(
            message="show items",
            agent="inventory",
            context={
                'categories': [{'id': self.category.id, 'name': self.category.name}]
            },
            conversation_history=[]
        )

        self.assertTrue(result['success'])
        self.assertEqual(result['action'], 'GET_ITEMS')
        self.assertIn('Desk', str(result['data']))

    def test_update_item_status(self):
        """Test UPDATE_ITEM_STATUS action"""
        result = self.service.process_message(
            message=f"mark item {self.item.id} as damaged",
            agent="inventory",
            context={},
            conversation_history=[]
        )

        self.assertTrue(result['success'])
        self.assertEqual(result['action'], 'UPDATE_ITEM_STATUS')

        # Verify database updated
        self.item.refresh_from_db()
        self.assertEqual(self.item.status, 'Damaged')
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] All tests passing
- [ ] Manual testing completed
- [ ] Permissions verified
- [ ] Audit logging confirmed
- [ ] Error handling tested
- [ ] Frontend UI reviewed
- [ ] Documentation updated

### Environment Variables

```bash
# .env file
GROQ_API_KEY=your_groq_api_key_here
LLM_PROVIDER=groq  # or ollama
LLM_MODEL=llama3-8b-8192
```

### Database Migrations

```bash
cd backend
python manage.py makemigrations
python manage.py migrate
```

### Frontend Build

```bash
cd frontend
npm run build
```

### Production Checklist

- [ ] LLM provider configured (Groq recommended)
- [ ] API keys secured (environment variables)
- [ ] CORS settings configured
- [ ] Rate limiting enabled (if needed)
- [ ] Monitoring/logging enabled
- [ ] User permissions verified

---

## Example: Building an Inventory Agent

Let's walk through a complete example.

### 1. Planning

**Agent:** Inventory
**Domain:** Track school inventory items
**Actions:**
- GET_ITEMS: Query items by status/category/school
- UPDATE_ITEM_STATUS: Change item status
- DELETE_ITEM: Remove item (confirmation required)
- GET_SUMMARY: Statistics by status

**Permissions:**
- Admin: All schools
- Teacher: Assigned schools only
- Student: No access

---

### 2. Backend Implementation

**a) Define Actions** (`backend/ai/actions.py`)

```python
"GET_ITEMS": ActionDefinition(
    name="GET_ITEMS",
    action_type=ActionType.READ,
    required_params=[],
    optional_params=["category", "status", "school_id"],
    handler="get_items",
    requires_confirmation=False,
    description="Query inventory items"
),
# ... other actions
```

**b) Create Prompt** (`backend/ai/prompts.py`)

```python
def get_inventory_agent_prompt(context: dict) -> str:
    return '''You are an inventory management assistant...

AVAILABLE ACTIONS:
1. {"action": "GET_ITEMS", "status": "Available"}
2. {"action": "UPDATE_ITEM_STATUS", "item_id": 123, "status": "Damaged"}
...

DECISION RULES:
- "show items" → GET_ITEMS
- "mark item 123 as damaged" → UPDATE_ITEM_STATUS
...
'''
```

**c) Resolver** (`backend/ai/resolver.py`)

```python
def _resolve_update_item_status(self, params):
    item_id = params.get('item_id')
    # Verify item exists
    item = InventoryItem.objects.get(id=item_id)
    params['_preview_item_name'] = item.name
    return {"status": "success"}
```

**d) Executor** (`backend/ai/executor.py`)

```python
def _execute_get_items(self, params):
    items = InventoryItem.objects.all()
    if params.get('status'):
        items = items.filter(status=params['status'])
    # ... return results
```

**e) API Endpoint** (`backend/inventory/views.py`)

```python
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_item_status(request):
    # Verify permissions
    # Update status
    # Return response
```

---

### 3. Frontend Implementation

**a) Context Builder** (`frontend/src/services/aiService.js`)

```javascript
export const buildInventoryContext = (schools, categories, items) => {
    return {
        schools: schools.map(s => ({id: s.id, name: s.name})),
        categories: categories.map(c => ({id: c.id, name: c.name}))
    };
};
```

**b) Integrate Chat Component** (`InventoryPage.js`)

```javascript
<FeeAgentChat
    agent="inventory"
    schools={schools}
    context={{categories: categories}}
    onRefresh={fetchInventory}
/>
```

---

### 4. Testing

```
User: "show available items"
→ GET_ITEMS with status="Available"
→ Returns: "Found 15 items | Available"

User: "mark item 123 as damaged"
→ UPDATE_ITEM_STATUS with item_id=123, status="Damaged"
→ Returns: "Item 'Desk' status updated to 'Damaged'"

User: "delete item 123"
→ DELETE_ITEM with item_id=123
→ Shows confirmation: "Delete item 'Desk'?"
→ User confirms
→ Returns: "Item 'Desk' deleted successfully"
```

---

## Common Pitfalls

### 1. Forgetting to Add Action to Dispatch

**Problem:** Action defined but not added to resolver/executor dispatch map

**Solution:**
```python
# In resolver.py
resolver_map = {
    'UPDATE_ITEM_STATUS': self._resolve_update_item_status,  # Don't forget!
}

# In executor.py
handler_map = {
    'get_items': self._execute_get_items,  # Don't forget!
}
```

---

### 2. Not Validating Permissions

**Problem:** Teachers can access all schools

**Solution:**
```python
if not check_school_access(request.user, school_id):
    return Response({"error": "Access denied"}, status=403)
```

---

### 3. Forgetting Context Preservation

**Problem:** Multi-turn conversations don't work

**Solution:**
```python
# In executor, include context in data:
return {
    "data": {
        "results": [...],
        "item_ids": [1, 2, 3],  # Include for reference
        "school_id": params.get('school_id')  # Preserve filter
    }
}
```

---

### 4. Poor Error Messages

**Problem:** "Error" (not helpful)

**Solution:**
```python
return {
    "success": False,
    "message": "Item ID 123 not found. Please check the ID and try again."
}
```

---

## Next Steps

1. Read [AI_PROMPT_ENGINEERING.md](./AI_PROMPT_ENGINEERING.md) for advanced prompt techniques
2. Review existing Fee Agent code for reference
3. Start with a simple READ action (like GET_ITEMS)
4. Test thoroughly before adding WRITE actions
5. Deploy incrementally (one action at a time)

---

**Happy Building! 🚀**

For questions or issues, refer to:
- [AI_AGENT_ARCHITECTURE.md](./AI_AGENT_ARCHITECTURE.md) for system design
- [AI_PROMPT_ENGINEERING.md](./AI_PROMPT_ENGINEERING.md) for prompt tips
- GitHub Issues for bugs/features
