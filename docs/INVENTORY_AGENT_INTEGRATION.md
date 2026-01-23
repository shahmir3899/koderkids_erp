# Inventory Agent Integration Guide

**Version:** 1.0
**Last Updated:** January 2026
**Status:** ✅ COMPLETE - Ready to Use

---

## Overview

The **InventoryAgent** is now fully implemented and ready to use. This AI-powered assistant allows users to manage school inventory through natural language commands instead of traditional forms.

### What's Implemented

✅ **Backend (100% Complete)**
- All 5 inventory actions defined ([actions.py](../backend/ai/actions.py:149-195))
- Complete system prompt with decision rules ([prompts.py](../backend/ai/prompts.py:125-174))
- All executor methods implemented ([executor.py](../backend/ai/executor.py:1205-1313))
- Confirmation dialogs for destructive operations ([service.py](../backend/ai/service.py:738-749))
- Full RBAC support (Admin + Teacher permissions)

✅ **Frontend (100% Complete)**
- Context builder function ([aiService.js](../frontend/src/services/aiService.js:202-215))
- Ready-to-use chat component ([InventoryAgentChat.js](../frontend/src/components/inventory/InventoryAgentChat.js))
- Quick action templates for offline mode
- Example prompts for users

---

## Features

### Available Actions

1. **GET_ITEMS** - Query inventory items
   - Filter by: status, category, school, location, assigned_to
   - Search by keyword

2. **GET_SUMMARY** - Get inventory statistics
   - Overall or by school
   - Breakdown by status and category

3. **UPDATE_ITEM_STATUS** - Change item status
   - Available → Assigned → Damaged → Lost → Disposed

4. **DELETE_ITEM** - Delete single item
   - Requires confirmation

5. **BULK_DELETE_ITEMS** - Delete multiple items
   - Requires confirmation

### Natural Language Examples

```
User: "show available items"
→ Returns list of all available inventory items

User: "mark item 123 as damaged"
→ Updates status of item #123 to "Damaged"

User: "inventory summary"
→ Shows statistics by status

User: "search for laptop"
→ Finds items containing "laptop" in name/description

User: "show damaged items for Mazen School"
→ Filters damaged items for specific school

User: "my assigned items"
→ Shows items assigned to current user

User: "items assigned to John"
→ Shows items assigned to user named John

User: "what does Sarah have"
→ Shows items assigned to Sarah

User: "delete item 456"
→ Shows confirmation dialog, then deletes

User: "delete items 1, 2, 3"
→ Bulk delete with confirmation
```

---

## How to Integrate

### Option 1: Add to Existing Inventory Page

Add the chat component to your inventory page:

```javascript
import InventoryAgentChat from '../components/inventory/InventoryAgentChat';

const InventoryPage = () => {
    const [schools, setSchools] = useState([]);
    const [categories, setCategories] = useState([]);
    const [users, setUsers] = useState([]);
    const [currentUserId, setCurrentUserId] = useState(null);

    // ... your existing code ...

    // Fetch schools, categories, and users
    useEffect(() => {
        fetchSchools();
        fetchCategories();
        fetchUsers();
        fetchCurrentUser();
    }, []);

    return (
        <div>
            {/* Your existing inventory table/filters */}

            {/* Add AI Chat Component */}
            <div style={{ marginTop: '20px' }}>
                <InventoryAgentChat
                    schools={schools}
                    categories={categories}
                    users={users}
                    currentUserId={currentUserId}
                    onRefresh={fetchInventory}  // Refresh data after AI action
                    height="600px"
                />
            </div>
        </div>
    );
};
```

### Option 2: Create Dedicated AI Chat Page

Create a standalone page for AI-powered inventory management:

```javascript
// frontend/src/pages/InventoryAIPage.js
import React, { useState, useEffect } from 'react';
import InventoryAgentChat from '../components/inventory/InventoryAgentChat';
import axios from 'axios';
import { API_URL, getAuthHeaders } from '../api';

const InventoryAIPage = () => {
    const [schools, setSchools] = useState([]);
    const [categories, setCategories] = useState([]);

    useEffect(() => {
        fetchSchools();
        fetchCategories();
    }, []);

    const fetchSchools = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/schools/`, {
                headers: getAuthHeaders()
            });
            setSchools(response.data);
        } catch (error) {
            console.error('Error fetching schools:', error);
        }
    };

    const fetchCategories = async () => {
        try {
            const response = await axios.get(`${API_URL}/api/inventory/categories/`, {
                headers: getAuthHeaders()
            });
            setCategories(response.data);
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    };

    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <h1>Inventory AI Assistant</h1>
            <p>Manage your inventory using natural language commands</p>

            <InventoryAgentChat
                schools={schools}
                categories={categories}
                onRefresh={() => console.log('Inventory updated')}
                height="calc(100vh - 200px)"
            />
        </div>
    );
};

export default InventoryAIPage;
```

### Option 3: Floating Chat Button

Add a floating AI assistant button accessible from anywhere:

```javascript
import React, { useState } from 'react';
import InventoryAgentChat from '../components/inventory/InventoryAgentChat';

const FloatingAIButton = ({ schools, categories }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    position: 'fixed',
                    bottom: '20px',
                    right: '20px',
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    backgroundColor: '#B061CE',
                    color: 'white',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                    zIndex: 1000
                }}
            >
                🤖
            </button>

            {/* Chat Panel */}
            {isOpen && (
                <div
                    style={{
                        position: 'fixed',
                        bottom: '90px',
                        right: '20px',
                        width: '400px',
                        height: '600px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                        borderRadius: '12px',
                        overflow: 'hidden',
                        zIndex: 1000
                    }}
                >
                    <InventoryAgentChat
                        schools={schools}
                        categories={categories}
                        height="100%"
                    />
                </div>
            )}
        </>
    );
};

export default FloatingAIButton;
```

---

## Component API

### InventoryAgentChat Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `schools` | Array | Yes | `[]` | List of schools with `{id, name}` |
| `categories` | Array | Yes | `[]` | List of categories with `{id, name}` |
| `users` | Array | No | `[]` | List of users/teachers with `{id, name}` for assigned_to filtering |
| `currentUserId` | Number | No | `null` | Current user's ID for "my items" queries |
| `onRefresh` | Function | No | `null` | Called after successful actions to refresh data |
| `height` | String | No | `'500px'` | CSS height value for the chat container |

### Example Data Formats

```javascript
// Schools format
const schools = [
    { id: 1, name: 'Mazen School' },
    { id: 2, name: 'Smart School' },
    { id: 3, name: 'Main Campus' }
];

// Categories format
const categories = [
    { id: 1, name: 'Electronics' },
    { id: 2, name: 'Furniture' },
    { id: 3, name: 'Sports Equipment' }
];

// Users format (optional, for assigned_to filtering)
const users = [
    { id: 5, name: 'John Doe' },
    { id: 8, name: 'Sarah Smith' },
    { id: 12, name: 'Ahmed Khan' }
];

// Current user ID (optional)
const currentUserId = 5; // From auth context
```

---

## Context Awareness

The agent maintains context across multiple turns:

```
User: "show damaged items"
Agent: Found 15 damaged items
      Item IDs: 12, 45, 67, 89, ...

User: "mark all as available"
Agent: [Uses item IDs from previous response]
      Confirmation: Update 15 items to "Available"?
```

**Parameters preserved:**
- `item_ids` - From previous results
- `school_id` - From filter
- `status` - From filter
- `category` - From filter

---

## Permissions

### Admin Users
- ✅ View all inventory across all locations
- ✅ Update any item status
- ✅ Delete any item
- ✅ Bulk operations on all items

### Teacher Users
- ✅ View inventory at assigned schools only
- ✅ Update item status at assigned schools
- ❌ Cannot delete items (Admin only)
- ✅ Bulk operations limited to assigned schools

---

## Testing the Agent

### Manual Test Checklist

1. **Basic Queries**
   - [ ] "show items" → Returns list
   - [ ] "show available items" → Filters by status
   - [ ] "inventory summary" → Returns statistics

2. **Filtering**
   - [ ] "show items for Mazen School" → School filter
   - [ ] "show damaged items" → Status filter
   - [ ] "search for laptop" → Text search

3. **Status Updates**
   - [ ] "mark item 123 as damaged" → Updates status
   - [ ] "mark item 456 as available" → Updates status
   - [ ] Invalid item ID → Shows error

4. **Deletions**
   - [ ] "delete item 123" → Shows confirmation
   - [ ] Confirm → Item deleted
   - [ ] Cancel → Item not deleted
   - [ ] "delete items 1,2,3" → Bulk delete confirmation

5. **Context Preservation**
   - [ ] "show damaged items" → Lists items
   - [ ] "mark all as available" → Updates those items
   - [ ] Item IDs carried forward correctly

6. **Permissions (Teacher)**
   - [ ] Can view assigned school items ✓
   - [ ] Cannot view other school items ✗
   - [ ] Cannot delete ✗

---

## Quick Action Templates

When AI is unavailable, the component falls back to template-based forms:

1. **View Items** - Filter by status/school
2. **Update Status** - Change item status
3. **Summary** - Get statistics
4. **Search** - Find items by keyword

---

## Troubleshooting

### AI Not Responding

**Symptom:** "AI service is currently unavailable"

**Solutions:**
1. Check backend is running: `python manage.py runserver`
2. Check LLM provider (Groq/Ollama) is configured
3. Verify `.env` has `GROQ_API_KEY` or Ollama is running
4. Use quick action templates as fallback

### Wrong Action Selected

**Symptom:** Agent performs incorrect action

**Solutions:**
1. Rephrase your request more explicitly
2. Use specific keywords: "show", "mark", "delete", "summary"
3. Check conversation history in browser console
4. Report issue for prompt refinement

### Context Not Preserved

**Symptom:** "mark all as damaged" doesn't use previous results

**Solutions:**
1. Ensure previous action returned `item_ids` in data
2. Check browser console for conversation history
3. Re-run the query if needed

### Permission Denied

**Symptom:** "You don't have permission..."

**Solutions:**
1. Check user role (Admin vs Teacher)
2. Verify school assignment for Teachers
3. Try action on assigned school only
4. Contact Admin for permission changes

---

## Backend Configuration

### LLM Provider Setup

**Option 1: Groq (Recommended for Production)**
```bash
# backend/.env
GROQ_API_KEY=your_groq_api_key_here
LLM_PROVIDER=groq
LLM_MODEL=llama3-8b-8192
```

**Option 2: Ollama (Local Development)**
```bash
# Start Ollama server
ollama pull llama3
ollama serve

# backend/.env
LLM_PROVIDER=ollama
LLM_MODEL=llama3
```

### Database Migrations

Ensure inventory models are migrated:

```bash
cd backend
python manage.py makemigrations inventory
python manage.py migrate inventory
```

---

## Performance Tips

1. **Limit Results** - First 50 items are returned by default
2. **Use Filters** - Narrow down by school/category/status
3. **Batch Operations** - Use bulk delete for multiple items
4. **Conversation Limit** - Last 6 messages kept for context

---

## Next Steps

### Enhancements (Future)

- [ ] Add voice input support
- [ ] Export chat history as PDF
- [ ] Scheduled bulk operations
- [ ] Integration with barcode scanner
- [ ] Predictive maintenance suggestions
- [ ] Auto-categorization of new items

### Related Agents

- **Fee Agent** - [AI_AGENT_IMPLEMENTATION.md](./AI_AGENT_IMPLEMENTATION.md)
- **HR Agent** - Staff attendance management
- **Broadcast Agent** - Notifications to parents/teachers

---

## Support

**Documentation:**
- [AI Agent Architecture](./AI_AGENT_ARCHITECTURE.md)
- [Prompt Engineering Guide](./AI_PROMPT_ENGINEERING.md)

**Code References:**
- Backend Actions: [backend/ai/actions.py:149-195](../backend/ai/actions.py#L149-L195)
- Backend Prompts: [backend/ai/prompts.py:125-174](../backend/ai/prompts.py#L125-L174)
- Backend Executors: [backend/ai/executor.py:1205-1313](../backend/ai/executor.py#L1205-L1313)
- Frontend Component: [frontend/src/components/inventory/InventoryAgentChat.js](../frontend/src/components/inventory/InventoryAgentChat.js)

---

**Happy Inventory Management! 🚀**

The InventoryAgent is ready to use. Simply integrate the component into your page and start managing inventory with natural language!
