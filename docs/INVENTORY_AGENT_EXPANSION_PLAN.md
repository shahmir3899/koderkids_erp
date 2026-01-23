# Inventory Agent Expansion Plan

**Date:** January 2026
**Status:** 📋 PLANNING
**Objective:** Add remaining page functions to InventoryAgent

---

## Executive Summary

This plan adds **6 new action groups** to the InventoryAgent, bringing feature parity with the Inventory page UI. After implementation, users will be able to perform ALL inventory operations via natural language.

---

## Current State vs Target State

| Function | Page UI | Current Agent | After Implementation |
|----------|---------|---------------|---------------------|
| View Items | ✅ | ✅ GET_ITEMS | ✅ |
| View Summary | ✅ | ✅ GET_SUMMARY | ✅ |
| Update Status | ✅ | ✅ UPDATE_ITEM_STATUS | ✅ |
| Delete Item | ✅ | ✅ DELETE_ITEM | ✅ |
| Bulk Delete | ✅ | ✅ BULK_DELETE_ITEMS | ✅ |
| **Add Item** | ✅ | ❌ | ✅ CREATE_ITEM |
| **Edit Item** | ✅ | ❌ | ✅ EDIT_ITEM |
| **Transfer to School** | ✅ | ❌ | ✅ TRANSFER_ITEM |
| **Assign to User** | ✅ | ❌ | ✅ ASSIGN_ITEM |
| **View Details** | ✅ | ❌ | ✅ GET_ITEM_DETAILS |
| **Create Category** | ✅ | ❌ | ✅ CREATE_CATEGORY |
| **Update Category** | ✅ | ❌ | ✅ UPDATE_CATEGORY |
| **Delete Category** | ✅ | ❌ | ✅ DELETE_CATEGORY |

---

## New Actions Specification

### 1. CREATE_ITEM - Add New Inventory Item

**Purpose:** Create a new inventory item via natural language

**Action Definition:**
```python
"CREATE_ITEM": ActionDefinition(
    name="CREATE_ITEM",
    action_type=ActionType.WRITE,
    required_params=["name", "purchase_value"],
    optional_params=[
        "category_id",      # FK to InventoryCategory
        "school_id",        # FK to School
        "location",         # 'School', 'Headquarters', 'Unassigned'
        "assigned_to_id",   # FK to User
        "status",           # 'Available', 'Assigned', etc.
        "description",
        "serial_number",
        "purchase_date",    # YYYY-MM-DD
        "warranty_expiry",  # YYYY-MM-DD
        "notes"
    ],
    endpoint="/api/inventory/items/",
    requires_confirmation=False,
    description="Create new inventory item"
)
```

**Natural Language Examples:**
```
"add a laptop worth 50000"
"create new item: Dell Monitor, value 15000, category Electronics"
"add printer to Mazen School, price 25000, assign to John"
"new item: Projector, 80000 PKR, serial number XYZ123"
```

**Permissions:**
- Admin: Can create at any location/school
- Teacher: Can create only at assigned schools

**Executor Logic:**
```python
def _execute_create_item(self, params: Dict) -> Dict:
    # Prepare data
    data = {
        'name': params['name'],
        'purchase_value': params['purchase_value'],
        'location': params.get('location', 'School'),
    }

    # Add optional fields
    if params.get('category_id'):
        data['category'] = params['category_id']
    if params.get('school_id'):
        data['school'] = params['school_id']
    if params.get('assigned_to_id'):
        data['assigned_to'] = params['assigned_to_id']
    # ... other optional fields

    # Call ViewSet create
    response = self._call_viewset('create', data)
    return {
        'success': True,
        'message': f"Created item '{data['name']}' with ID #{response['id']}",
        'data': response
    }
```

---

### 2. EDIT_ITEM - Modify Item Details

**Purpose:** Update any field(s) of an existing inventory item

**Action Definition:**
```python
"EDIT_ITEM": ActionDefinition(
    name="EDIT_ITEM",
    action_type=ActionType.WRITE,
    required_params=["item_id"],
    optional_params=[
        "name",
        "category_id",
        "school_id",
        "location",
        "assigned_to_id",
        "status",
        "description",
        "serial_number",
        "purchase_value",
        "purchase_date",
        "warranty_expiry",
        "notes"
    ],
    endpoint="/api/inventory/items/{item_id}/",
    requires_confirmation=False,
    description="Edit inventory item details"
)
```

**Natural Language Examples:**
```
"change name of item 123 to HP Laptop"
"update item 456: category to Furniture, price to 30000"
"edit item 789, set description to 'Main office printer'"
"rename item 100 to 'Conference Room Projector'"
"change item 50 serial number to SN-2024-001"
```

**Permissions:**
- Admin: Can edit any item
- Teacher: Can edit only items at assigned schools

**Executor Logic:**
```python
def _execute_edit_item(self, params: Dict) -> Dict:
    item_id = params.pop('item_id')

    # Build update data from provided params only
    update_data = {}
    field_mapping = {
        'name': 'name',
        'category_id': 'category',
        'school_id': 'school',
        'location': 'location',
        'assigned_to_id': 'assigned_to',
        'status': 'status',
        'description': 'description',
        'serial_number': 'serial_number',
        'purchase_value': 'purchase_value',
        'purchase_date': 'purchase_date',
        'warranty_expiry': 'warranty_expiry',
        'notes': 'notes',
    }

    for param_key, api_key in field_mapping.items():
        if param_key in params and params[param_key] is not None:
            update_data[api_key] = params[param_key]

    # Call ViewSet partial_update (PATCH)
    response = self._call_viewset('partial_update', item_id, update_data)

    return {
        'success': True,
        'message': f"Updated item #{item_id}: {', '.join(update_data.keys())}",
        'data': response
    }
```

---

### 3. TRANSFER_ITEM - Move Item Between Schools

**Purpose:** Transfer item from one school to another

**Action Definition:**
```python
"TRANSFER_ITEM": ActionDefinition(
    name="TRANSFER_ITEM",
    action_type=ActionType.WRITE,
    required_params=["item_id", "target_school_id"],
    optional_params=["notes"],
    endpoint="/api/inventory/items/{item_id}/",
    requires_confirmation=True,  # Confirm before transfer
    description="Transfer item to different school"
)
```

**Natural Language Examples:**
```
"transfer item 123 to Mazen School"
"move laptop 456 to Smart School"
"relocate item 789 from current school to Main Campus"
"send projector to Smart School with note 'For new classroom'"
```

**Permissions:**
- Admin: Can transfer between any schools
- Teacher: Can transfer only from/to assigned schools

**Executor Logic:**
```python
def _execute_transfer_item(self, params: Dict) -> Dict:
    item_id = params['item_id']
    target_school_id = params['target_school_id']
    notes = params.get('notes', '')

    # Get item first to record source
    item = self._get_item(item_id)
    source_school = item.get('school_name', 'Unknown')

    # Get target school name
    target_school = self._get_school(target_school_id)

    # Build transfer note
    from datetime import datetime
    transfer_note = f"[{datetime.now().strftime('%Y-%m-%d %H:%M')}] Transferred from {source_school} to {target_school['name']}"
    if notes:
        transfer_note += f" - {notes}"

    # Update item
    existing_notes = item.get('notes', '') or ''
    new_notes = f"{existing_notes}\n{transfer_note}".strip()

    update_data = {
        'school': target_school_id,
        'location': 'School',
        'notes': new_notes
    }

    response = self._call_viewset('partial_update', item_id, update_data)

    return {
        'success': True,
        'message': f"Transferred '{item['name']}' from {source_school} to {target_school['name']}",
        'data': response
    }
```

**Confirmation Message:**
```
"Transfer 'Dell Laptop' from Mazen School to Smart School?"
```

---

### 4. ASSIGN_ITEM - Assign/Reassign Item to User

**Purpose:** Assign item to a user or change assignment

**Action Definition:**
```python
"ASSIGN_ITEM": ActionDefinition(
    name="ASSIGN_ITEM",
    action_type=ActionType.WRITE,
    required_params=["item_id"],
    optional_params=["user_id", "notes"],  # user_id=null means unassign
    endpoint="/api/inventory/items/{item_id}/",
    requires_confirmation=False,
    description="Assign or reassign item to user"
)
```

**Natural Language Examples:**
```
"assign item 123 to John"
"give laptop 456 to Sarah"
"reassign projector from Ahmed to Ali"
"unassign item 789"
"remove assignment from item 100"
"transfer item 50 from current user to Mohammed"
```

**Permissions:**
- Admin: Can assign to any user
- Teacher: Can assign only at assigned schools

**Executor Logic:**
```python
def _execute_assign_item(self, params: Dict) -> Dict:
    item_id = params['item_id']
    user_id = params.get('user_id')  # None means unassign
    notes = params.get('notes', '')

    # Get current item
    item = self._get_item(item_id)
    previous_user = item.get('assigned_to_name', 'Unassigned')

    # Get new user name if assigning
    new_user_name = 'Unassigned'
    if user_id:
        user = self._get_user(user_id)
        new_user_name = user.get('name', f'User #{user_id}')

    # Build assignment note
    from datetime import datetime
    if user_id:
        assignment_note = f"[{datetime.now().strftime('%Y-%m-%d %H:%M')}] Assigned to {new_user_name} (from {previous_user})"
    else:
        assignment_note = f"[{datetime.now().strftime('%Y-%m-%d %H:%M')}] Unassigned (was {previous_user})"

    if notes:
        assignment_note += f" - {notes}"

    # Update notes
    existing_notes = item.get('notes', '') or ''
    new_notes = f"{existing_notes}\n{assignment_note}".strip()

    # Update item
    update_data = {
        'assigned_to': user_id,
        'status': 'Assigned' if user_id else 'Available',
        'notes': new_notes
    }

    response = self._call_viewset('partial_update', item_id, update_data)

    if user_id:
        message = f"Assigned '{item['name']}' to {new_user_name}"
    else:
        message = f"Unassigned '{item['name']}' (was assigned to {previous_user})"

    return {
        'success': True,
        'message': message,
        'data': response
    }
```

---

### 5. GET_ITEM_DETAILS - View Full Item Details

**Purpose:** Retrieve complete details of a single item

**Action Definition:**
```python
"GET_ITEM_DETAILS": ActionDefinition(
    name="GET_ITEM_DETAILS",
    action_type=ActionType.READ,
    required_params=["item_id"],
    optional_params=[],
    endpoint="/api/inventory/items/{item_id}/",
    requires_confirmation=False,
    description="Get full details of an item"
)
```

**Natural Language Examples:**
```
"show details of item 123"
"view item 456"
"what is item 789?"
"tell me about item 100"
"item 50 details"
"info on item #25"
```

**Permissions:**
- Admin: Can view any item
- Teacher: Can view items at assigned schools

**Executor Logic:**
```python
def _execute_get_item_details(self, params: Dict) -> Dict:
    item_id = params['item_id']

    # Call ViewSet retrieve
    item = self._call_viewset('retrieve', item_id)

    # Format detailed response
    details = f"""
📦 {item['name']} (#{item['id']})
━━━━━━━━━━━━━━━━━━━━━━━━━━
🔖 Unique ID: {item['unique_id']}
📁 Category: {item.get('category_name', 'Uncategorized')}
📍 Location: {item['location']}
🏫 School: {item.get('school_name') or 'N/A'}
👤 Assigned To: {item.get('assigned_to_name', 'Unassigned')}
📊 Status: {item['status']}
💰 Value: PKR {item['purchase_value']:,.0f}
📅 Purchase Date: {item.get('purchase_date') or 'N/A'}
🔢 Serial Number: {item.get('serial_number') or 'N/A'}
📆 Warranty Expiry: {item.get('warranty_expiry') or 'N/A'}
📝 Description: {item.get('description') or 'None'}
"""

    return {
        'success': True,
        'message': details.strip(),
        'data': item
    }
```

---

### 6. Category Management (Admin Only)

#### 6a. CREATE_CATEGORY

**Action Definition:**
```python
"CREATE_CATEGORY": ActionDefinition(
    name="CREATE_CATEGORY",
    action_type=ActionType.WRITE,
    required_params=["name"],
    optional_params=["description"],
    endpoint="/api/inventory/categories/",
    requires_confirmation=False,
    description="Create new inventory category (Admin only)"
)
```

**Natural Language Examples:**
```
"create category Electronics"
"add new category: Office Supplies"
"new category Furniture with description 'Tables, chairs, etc.'"
```

#### 6b. UPDATE_CATEGORY

**Action Definition:**
```python
"UPDATE_CATEGORY": ActionDefinition(
    name="UPDATE_CATEGORY",
    action_type=ActionType.WRITE,
    required_params=["category_id"],
    optional_params=["name", "description"],
    endpoint="/api/inventory/categories/{category_id}/",
    requires_confirmation=False,
    description="Update inventory category (Admin only)"
)
```

**Natural Language Examples:**
```
"rename category 1 to IT Equipment"
"update category Electronics description to 'Computers, phones, etc.'"
```

#### 6c. DELETE_CATEGORY

**Action Definition:**
```python
"DELETE_CATEGORY": ActionDefinition(
    name="DELETE_CATEGORY",
    action_type=ActionType.DELETE,
    required_params=["category_id"],
    optional_params=[],
    endpoint="/api/inventory/categories/{category_id}/",
    requires_confirmation=True,
    description="Delete inventory category (Admin only, must be empty)"
)
```

**Natural Language Examples:**
```
"delete category 5"
"remove category Office Supplies"
```

**Permissions:**
- Admin ONLY for all category operations
- DELETE requires category to have 0 items

---

## Prompt Updates

### New Decision Rules to Add

```
# Item Creation
- User says "add item" or "create item" or "new item" → CREATE_ITEM
- User says "add [item name] worth [value]" → CREATE_ITEM with name and purchase_value
- User says "add [item] to [school]" → CREATE_ITEM with school_id
- User says "create [item] category [cat]" → CREATE_ITEM with category_id

# Item Editing
- User says "edit item [ID]" or "change item [ID]" or "update item [ID]" → EDIT_ITEM
- User says "rename item [ID] to [name]" → EDIT_ITEM with name
- User says "change item [ID] category to [cat]" → EDIT_ITEM with category_id
- User says "update item [ID] price to [value]" → EDIT_ITEM with purchase_value

# Transfer Between Schools
- User says "transfer item [ID] to [school]" → TRANSFER_ITEM
- User says "move item [ID] to [school]" → TRANSFER_ITEM
- User says "relocate [item] to [school]" → TRANSFER_ITEM
- User says "send item [ID] to [school]" → TRANSFER_ITEM

# Assignment to Users
- User says "assign item [ID] to [user]" → ASSIGN_ITEM with user_id
- User says "give item [ID] to [user]" → ASSIGN_ITEM with user_id
- User says "unassign item [ID]" → ASSIGN_ITEM with user_id=null
- User says "remove assignment from item [ID]" → ASSIGN_ITEM with user_id=null
- User says "reassign item [ID] to [user]" → ASSIGN_ITEM with user_id

# Item Details
- User says "show item [ID]" or "view item [ID]" → GET_ITEM_DETAILS
- User says "details of item [ID]" → GET_ITEM_DETAILS
- User says "what is item [ID]" → GET_ITEM_DETAILS
- User says "info on item [ID]" → GET_ITEM_DETAILS

# Category Management (Admin)
- User says "create category [name]" → CREATE_CATEGORY
- User says "add category [name]" → CREATE_CATEGORY
- User says "rename category [ID] to [name]" → UPDATE_CATEGORY
- User says "delete category [ID]" → DELETE_CATEGORY
- User says "remove category [name]" → DELETE_CATEGORY
```

### Context Updates

Add to context:
```python
# Current context includes: schools, categories, users, current_user_id

# Add location options
location_options = "School, Headquarters, Unassigned"

# Add status options
status_options = "Available, Assigned, Damaged, Lost, Disposed"

# Add admin flag
is_admin = context.get('is_admin', False)
```

---

## Frontend Updates

### New Quick Action Templates

```javascript
const NEW_INVENTORY_TEMPLATES = [
    // Existing templates...

    {
        id: 'add_item',
        name: 'Add Item',
        icon: '➕',
        description: 'Create new item',
        fields: [
            { key: 'name', label: 'Item Name', type: 'text' },
            { key: 'purchase_value', label: 'Value (PKR)', type: 'number' },
            { key: 'category_id', label: 'Category', type: 'category', optional: true },
            { key: 'school_id', label: 'School', type: 'school', optional: true },
        ]
    },
    {
        id: 'edit_item',
        name: 'Edit Item',
        icon: '✏️',
        description: 'Modify item details',
        fields: [
            { key: 'item_id', label: 'Item ID', type: 'number' },
            { key: 'name', label: 'New Name', type: 'text', optional: true },
            { key: 'category_id', label: 'Category', type: 'category', optional: true },
        ]
    },
    {
        id: 'transfer_item',
        name: 'Transfer',
        icon: '🔄',
        description: 'Move to school',
        fields: [
            { key: 'item_id', label: 'Item ID', type: 'number' },
            { key: 'target_school_id', label: 'Target School', type: 'school' },
        ]
    },
    {
        id: 'assign_item',
        name: 'Assign',
        icon: '👤',
        description: 'Assign to user',
        fields: [
            { key: 'item_id', label: 'Item ID', type: 'number' },
            { key: 'user_id', label: 'Assign To', type: 'user', optional: true },
        ]
    },
    {
        id: 'item_details',
        name: 'View Details',
        icon: '📋',
        description: 'Show item info',
        fields: [
            { key: 'item_id', label: 'Item ID', type: 'number' },
        ]
    },
];
```

### Updated Example Prompts

```javascript
const EXAMPLE_PROMPTS = [
    // Existing
    "Show available items",
    "My assigned items",
    "Mark item 123 as damaged",
    "Inventory summary",

    // New
    "Add laptop worth 50000",
    "Edit item 123, change name to HP Laptop",
    "Transfer item 456 to Mazen School",
    "Assign item 789 to John",
    "Show details of item 100",
    "Create category Office Supplies",
];
```

---

## Implementation Checklist

### Phase 1: Backend Actions & Executors

- [ ] **Step 1.1:** Add new action definitions to `actions.py`
  - [ ] CREATE_ITEM
  - [ ] EDIT_ITEM
  - [ ] TRANSFER_ITEM
  - [ ] ASSIGN_ITEM
  - [ ] GET_ITEM_DETAILS
  - [ ] CREATE_CATEGORY
  - [ ] UPDATE_CATEGORY
  - [ ] DELETE_CATEGORY

- [ ] **Step 1.2:** Add executor methods to `executor.py`
  - [ ] `_execute_create_item()`
  - [ ] `_execute_edit_item()`
  - [ ] `_execute_transfer_item()`
  - [ ] `_execute_assign_item()`
  - [ ] `_execute_get_item_details()`
  - [ ] `_execute_create_category()`
  - [ ] `_execute_update_category()`
  - [ ] `_execute_delete_category()`

- [ ] **Step 1.3:** Register handlers in executor dispatch

### Phase 2: Prompt Engineering

- [ ] **Step 2.1:** Update `prompts.py` - `get_inventory_agent_prompt()`
  - [ ] Add new action examples
  - [ ] Add decision rules for new actions
  - [ ] Add location_options to context
  - [ ] Add is_admin flag to context

### Phase 3: Confirmation Messages

- [ ] **Step 3.1:** Update `service.py` - `_get_confirmation_details()`
  - [ ] TRANSFER_ITEM confirmation
  - [ ] DELETE_CATEGORY confirmation

### Phase 4: Frontend Updates

- [ ] **Step 4.1:** Update `InventoryAgentChat.js`
  - [ ] Add new templates
  - [ ] Update example prompts
  - [ ] Add `renderItemDetails()` for detailed view
  - [ ] Handle category management (admin only)

- [ ] **Step 4.2:** Update `aiService.js`
  - [ ] Add `is_admin` to context builder

### Phase 5: Testing

- [ ] **Step 5.1:** Test all new actions
  - [ ] CREATE_ITEM (Admin + Teacher)
  - [ ] EDIT_ITEM (Admin + Teacher)
  - [ ] TRANSFER_ITEM (Admin + Teacher)
  - [ ] ASSIGN_ITEM (Admin + Teacher)
  - [ ] GET_ITEM_DETAILS
  - [ ] Category management (Admin only)

- [ ] **Step 5.2:** Test permission restrictions
  - [ ] Teacher cannot access other schools
  - [ ] Teacher cannot manage categories
  - [ ] Teacher cannot delete items

---

## Data Flow Diagram

```
User: "add laptop worth 50000 to Mazen School"
    ↓
InventoryAgentChat: buildInventoryContext()
    → {schools, categories, users, current_user_id, is_admin}
    ↓
Backend: get_inventory_agent_prompt(context)
    ↓
LLM: Parses request, returns:
    {"action": "CREATE_ITEM", "name": "laptop", "purchase_value": 50000, "school_id": 1}
    ↓
Executor: _execute_create_item(params)
    → Validates permissions
    → Calls InventoryItemViewSet.create()
    → Returns created item
    ↓
Response: {"success": true, "message": "Created 'laptop' (#123)", "data": {...}}
    ↓
Frontend: Display success + item details
```

---

## Risk Assessment

| Risk | Mitigation |
|------|------------|
| LLM extracts wrong field values | Add validation in executor, clear examples in prompt |
| Permission bypass | Executor calls ViewSet (has RBAC), double-check in executor |
| Category delete with items | Backend already validates, add clear error message |
| Transfer to invalid school | Validate school_id exists before transfer |
| Assign to invalid user | Validate user_id exists before assignment |

---

## Estimated Complexity

| Action | Backend | Prompt | Frontend | Total |
|--------|---------|--------|----------|-------|
| CREATE_ITEM | Medium | Medium | Medium | Medium |
| EDIT_ITEM | Medium | Medium | Low | Medium |
| TRANSFER_ITEM | Medium | Low | Low | Low-Medium |
| ASSIGN_ITEM | Medium | Low | Low | Low-Medium |
| GET_ITEM_DETAILS | Low | Low | Medium | Low-Medium |
| CREATE_CATEGORY | Low | Low | Low | Low |
| UPDATE_CATEGORY | Low | Low | Low | Low |
| DELETE_CATEGORY | Low | Low | Low | Low |

**Total Estimate:** ~400-500 lines of new code

---

## Summary

This plan adds **8 new actions** to the InventoryAgent:

1. **CREATE_ITEM** - Add new items via natural language
2. **EDIT_ITEM** - Modify any item field
3. **TRANSFER_ITEM** - Move items between schools
4. **ASSIGN_ITEM** - Assign/unassign items to users
5. **GET_ITEM_DETAILS** - View complete item information
6. **CREATE_CATEGORY** - Add categories (Admin)
7. **UPDATE_CATEGORY** - Edit categories (Admin)
8. **DELETE_CATEGORY** - Remove categories (Admin)

After implementation, the InventoryAgent will have **100% feature parity** with the Inventory page UI!

---

## Approval

**Ready to implement?**

This plan covers:
- ✅ All required actions
- ✅ Permission handling
- ✅ Natural language examples
- ✅ Prompt updates
- ✅ Frontend templates
- ✅ Implementation checklist
- ✅ Risk mitigation

**Proceed with implementation when approved.**
