# Inventory Agent Integration Guide

**Version:** 1.2
**Last Updated:** 2026-08-28
**Status:** ✅ COMPLETE - Ready to Use (line citations below verified against current code as of this update; re-check before trusting older citations elsewhere in the repo)

---

## Overview

The **InventoryAgent** is implemented and in use. Its architecture depends on which LLM provider is active:

- **Groq active (production default):** native tool/function-calling. One LLM call classifies intent directly into a structured tool call (no more asking the model to emit JSON as free text and bracket-matching it out). For inventory ITEMS specifically, the model can make **one bounded round of `lookup_inventory_item` calls** to see real candidate items (with real IDs) before committing to a write/delete action, instead of guessing an ID or relying purely on server-side fuzzy matching after the fact. This is still not a general agent loop — see "Not a multi-step agent" in Known Limitations for exactly what is and isn't bounded here.
- **Ollama active (local dev fallback), or Groq unavailable:** falls back to the original text-JSON prompt approach (LLM asked to emit `{"action": ..., ...}` as free text, extracted via bracket-matching).

Either way, once an action name + params are decided, execution goes through the same shared pipeline: fuzzy-match resolver → parameter validation → confirmation gate (for destructive actions) → executor.

### What's Implemented

✅ **Backend**
- 13 inventory actions + 2 shared special actions (`CLARIFY`, `UNSUPPORTED`) defined in [actions.py:185-312](../backend/ai/actions.py#L185-L312) (`INVENTORY_ACTIONS`)
- Text-prompt path (Ollama / Groq-unavailable fallback): [prompts.py:150-333](../backend/ai/prompts.py#L150-L333) (`get_inventory_agent_prompt`)
- Tool-calling path (Groq): [inventory_tools.py](../backend/ai/inventory_tools.py) (`build_inventory_tools` - generates one tool schema per action from `INVENTORY_ACTIONS`, plus `lookup_inventory_item`), [prompts.py](../backend/ai/prompts.py) (`get_inventory_tool_system_prompt`), [llm_client.py](../backend/ai/llm_client.py) (`LLMClient.generate_with_tools`), [service.py](../backend/ai/service.py) (`_process_inventory_with_tools`, `_handle_inventory_lookup_and_followup`)
- Shared resolve/validate/confirm/execute pipeline (used by both paths above): [service.py](../backend/ai/service.py) (`_resolve_and_execute_action`)
- Executor methods: [executor.py:1572-2489](../backend/ai/executor.py#L1572-L2489)
- Confirmation preview text: [service.py](../backend/ai/service.py) (`_get_confirmation_details`)
- RBAC: Admin/BDM full access, Teacher scoped to `assigned_schools` — enforced via `ActionExecutor._get_accessible_school_ids()` ([executor.py:28-49](../backend/ai/executor.py#L28-L49)), `ParameterResolver._resolve_inventory_item()` for direct-id lookups, and `ParameterResolver.lookup_items_for_tool()` for the tool-calling path's item search - all three apply the same accessible-schools scoping
- Structured per-user memory: [service.py](../backend/ai/service.py) (`_remember_inventory_context`, `_backfill_inventory_params_from_memory`) - see Context Awareness below for exact scope
- Automated tests: [backend/ai/tests.py](../backend/ai/tests.py) — resolver behavior, RBAC on transfer/assign/lookup, confirmation gating, rate limiting, history sanitization, JSON-parsing edge cases, tool-calling flow, memory backfill, executor internal-request authentication

✅ **Frontend**
- Context builder function: [aiService.js:255-274](../frontend/src/services/aiService.js#L255-L274) (`buildInventoryContext`)
- Chat component: [InventoryAgentChat.js](../frontend/src/components/inventory/InventoryAgentChat.js)
- Quick action templates for offline mode
- Example prompts for users

No frontend changes were needed for the tool-calling/memory work above — it's entirely a backend architecture change behind the same `/api/ai/execute/` response shape.

---

## Features

### Available Actions

Full registry: [actions.py:185-312](../backend/ai/actions.py#L185-L312).

| Action | Type | Confirmation required? | Notes |
|---|---|---|---|
| `GET_ITEMS` | Read | No | Filter by category/status/school/search/location/assigned_to |
| `GET_SUMMARY` | Read | No | Overall or by school |
| `GET_ITEM_DETAILS` | Read | No | Full details of one item |
| `CREATE_ITEM` | Write | No | Requires `name`, `purchase_value` |
| `EDIT_ITEM` | Write | No | |
| `UPDATE_ITEM_STATUS` | Write | No | Available → Assigned → Damaged → Lost → Disposed |
| `ASSIGN_ITEM` | Write | **Yes** | Assign/unassign to a user. Teacher can only assign to themselves |
| `TRANSFER_ITEM` | Write | **Yes** | Move item between schools |
| `DELETE_ITEM` | Delete | **Yes** | Admin only (enforced by the underlying viewset) |
| `BULK_DELETE_ITEMS` | Delete | **Yes** | Admin only |
| `CREATE_CATEGORY` | Write | No | Admin only (prompt-instructed — see Known Limitations) |
| `UPDATE_CATEGORY` | Write | No | Admin only (prompt-instructed) |
| `DELETE_CATEGORY` | Delete | **Yes** | Admin only |

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

User: "transfer item 456 to Smart School"
→ Shows confirmation dialog, then moves the item

User: "assign item 789 to Sarah"
→ Shows confirmation dialog, then assigns

User: "unassign item 789"
→ Shows confirmation dialog, then clears the assignment

User: "add a new projector, cost 45000"
→ Creates a new item (CREATE_ITEM)
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

## Live Integration: InventoryDashboard

The chat component is wired into **`frontend/src/pages/InventoryDashboard.js`** as a collapsible "🤖 AI Assistant" section, positioned between the Analytics/Charts block and the Inventory Items table (collapsed by default so it doesn't overwhelm users).

```javascript
<CollapsibleSection title="🤖 AI Assistant" defaultOpen={false}>
  <InventoryAgentChat
    schools={schools}
    categories={categories}
    users={users}
    currentUserId={userContext.userId}
    onRefresh={refetchAll}   // from useInventory() — refreshes items/summary/categories after any AI action
    height="500px"
  />
</CollapsibleSection>
```

All props (`schools`, `categories`, `users`, `currentUserId`) come straight from the existing `useInventory()` hook / `userContext` — no separate fetching needed. After a successful AI action, `refetchAll()` re-syncs the dashboard's stats and table automatically.

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

There are now **two separate mechanisms** feeding into context awareness, with different reliability:

**1. Raw pasted history (unreliable, LLM-dependent)** — the frontend sends the last 6 chat messages as plain text with every request ([InventoryAgentChat.js](../frontend/src/components/inventory/InventoryAgentChat.js), `buildConversationHistory`). The backend pastes that text into the LLM prompt/messages (wrapped in a `<user_conversation_history>` tag and flagged as untrusted data — see Known Limitations) and the model *may* re-infer state from it. There is no deterministic guarantee here; `_merge_params_from_history()` ([service.py:768+](../backend/ai/service.py#L768)) is a regex-based backfill but it's fee-agent-oriented (`fee_ids`, `school_id`, `class`, `month`) and has no `item_ids` branch.

**2. Structured per-user memory (deterministic, code-guaranteed)** — added alongside the tool-calling work. After every successful inventory action, `_remember_inventory_context()` caches `{item_ids, school_id, category_id}` for that user (15-minute TTL, same cache-based pattern as the existing undo feature). The next message backfills missing params from this cache via `_backfill_inventory_params_from_memory()` - **deliberately narrow scope:**

```
User: "show me the Dell laptop"
Agent: [GET_ITEM_DETAILS resolves to item #42, remembered for this user]

User: "mark it as damaged"
Agent: [UPDATE_ITEM_STATUS - no item_id needed from the user or the model;
       backfilled from memory since exactly one item was remembered]
```

What this **does** cover:
- A single remembered item ("it"/"that") backfills into any single-item action (`TRANSFER_ITEM`, `ASSIGN_ITEM`, `UPDATE_ITEM_STATUS`, `EDIT_ITEM`, `DELETE_ITEM`, `GET_ITEM_DETAILS`) - but **only when memory holds exactly one item_id**. If the last query returned several items, "it" is ambiguous and the action must still specify which item explicitly.
- `BULK_DELETE_ITEMS` backfills the full remembered `item_ids` list ("delete those" after a list query).
- `GET_ITEMS` backfills a remembered `school_id` if the follow-up doesn't specify one.

What this **does not** cover:
- **"Mark all as available" / any bulk status update** — there is no bulk status-update action in `INVENTORY_ACTIONS` at all (only `BULK_DELETE_ITEMS` is bulk). Memory can't make this work because the underlying action doesn't exist; this was never actually achievable, regardless of how good the memory mechanism is.
- Memory expires after 15 minutes of inactivity, and it's per-user, not per-conversation - if two chat sessions are open, the second overwrites the first's remembered context.

If you need bulk status updates to work, that requires adding a new action to the registry (`actions.py`/`executor.py`/tool schema), not a memory fix.

---

## Permissions

### Admin / BDM Users
- ✅ View all inventory across all locations
- ✅ Update any item status, transfer or assign any item
- ✅ Delete any item / category
- ✅ Bulk operations on all items

### Teacher Users
- ✅ View inventory at assigned schools only
- ✅ Update item status at assigned schools
- ✅ Transfer/assign items at assigned schools only — enforced in the agent's executor (`_execute_transfer_item`/`_execute_assign_item`, [executor.py:2082+](../backend/ai/executor.py#L2082)) and resolver (item-id lookups are scoped the same way), not just the REST viewset
- ✅ Can only assign items to **themselves**, mirroring `bulk_assign` in `inventory/views.py`
- ❌ Cannot delete items or categories (Admin only)
- ✅ Bulk operations limited to assigned schools

Historically, `TRANSFER_ITEM`/`ASSIGN_ITEM` bypassed the REST viewset's school-scoping entirely (they mutate the model directly rather than going through `InventoryItemViewSet`), so a Teacher who knew/guessed an out-of-scope `item_id` could act on it via chat even though the UI/API blocked it. This has been fixed — both executor methods now check the caller's accessible schools directly, and are covered by `TransferAssignRbacTests` in [backend/ai/tests.py](../backend/ai/tests.py).

---

## Testing the Agent

### Automated Tests

`backend/ai/tests.py` covers resolver fuzzy-matching, action-param validation, confirmation gating, RBAC on transfer/assign/lookup, rate limiting, conversation-history sanitization, JSON-response parsing edge cases, tool-calling schema generation, the lookup→followup round trip, structured memory backfill, and executor internal-request authentication (68 tests as of this update, all mocked/DB-backed - no live network calls in CI). Run with:

```bash
cd backend
python manage.py test ai
```

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

5. **Context Preservation (structured memory - see Context Awareness above)**
   - [ ] "show me [item name]" then "mark it as damaged" → should reliably resolve to the same item (backed by memory, not just the LLM re-reading history)
   - [ ] "show damaged items" (multiple results) then "mark it as available" → should ask which item, not guess (memory only auto-picks when exactly one item was remembered)
   - [ ] "show damaged items" then "delete those" → BULK_DELETE_ITEMS should target the same items
   - [ ] "mark all as available" after a list → will NOT work; there's no bulk status-update action at all, regardless of memory

6. **Transfer / Assign**
   - [ ] "transfer item X to School Y" → Shows confirmation, then moves item
   - [ ] "assign item X to <user>" → Shows confirmation, then assigns
   - [ ] "unassign item X" → Shows confirmation, then clears assignment

7. **Permissions (Teacher)**
   - [ ] Can view assigned school items ✓
   - [ ] Cannot view other school items ✗
   - [ ] Cannot delete ✗
   - [ ] Cannot transfer/assign an item at a school not in their `assigned_schools`, even by item id ✗
   - [ ] Can only assign items to themselves, not another user ✗ (for anyone else)

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

**Symptom:** a follow-up like "mark it as damaged" doesn't target the item you just viewed

**First check:** did the previous query return more than one item? Structured memory (see Context Awareness above) only auto-resolves "it" when exactly one item was remembered - if the last query returned several items, the agent should ask which one, not guess. That's intended behavior, not a bug.

**Symptom:** "mark all as available" doesn't update anything

**This isn't a memory bug** — there is no bulk status-update action in the registry at all (only `BULK_DELETE_ITEMS` is bulk). No amount of memory/context fixing makes this phrase work; it needs a new action added to `actions.py`/`executor.py` first.

**If a genuinely single-item follow-up still fails to resolve (real bug, not either case above):**
1. Check the memory cache didn't expire (15-minute TTL, per-user - a second open chat session for the same user overwrites it)
2. Check browser console for what conversation history was actually sent
3. Re-run the original query and try the follow-up again

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

Provider/model selection lives in [backend/ai/llm_client.py](../backend/ai/llm_client.py) (`get_config()`), driven by env vars. Defaults if unset: `LLM_PROVIDER=ollama,groq`, `GROQ_MODEL=llama-3.3-70b-versatile`, `OLLAMA_MODEL=deepseek-coder:6.7b` — but these are frequently overridden per-environment. **Check the actual `LLM_PROVIDER`/`GROQ_MODEL`/`OLLAMA_MODEL` values in the environment you're targeting (Render dashboard for production, local `.env` for dev) rather than trusting any model name written here** — this doc has gone stale on this exact point before.

**Tool-calling requires Groq specifically.** `LLMClient.generate_with_tools()` only activates the inventory agent's native tool-calling path (with the `lookup_inventory_item` round-trip) when Groq is the active provider - confirmed working against `openai/gpt-oss-120b`. When Ollama is active (typical local dev setup unless you point local dev at Groq too), inventory silently falls back to the older text-JSON prompt path, which does **not** get the lookup-before-action behavior or benefit from tool schemas. If you're testing inventory-agent tool-calling behavior locally, make sure Groq is actually the resolved active provider, not just configured.

**Option 1: Groq (cloud)**
```bash
# backend/.env (local) or Render environment tab (production)
GROQ_API_KEY=your_groq_api_key_here
LLM_PROVIDER=groq
GROQ_MODEL=<check current env value>
```

**Option 2: Ollama (local development)**
```bash
# Start Ollama server
ollama pull <model matching OLLAMA_MODEL>
ollama serve

# backend/.env
LLM_PROVIDER=ollama
OLLAMA_MODEL=<check current env value>
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
4. **Conversation Limit** - Last 6 messages kept for raw history context
5. **Structured Memory Limit** - Remembered item/school context expires after 15 minutes of inactivity per user (see Context Awareness)

---

## Known Limitations

- **Still not a general multi-step agent, even with tool-calling.** The Groq tool-calling path (see Overview) is bounded to *at most one* `lookup_inventory_item` round before a final action call is required - this is enforced in code (the follow-up call's tool list excludes `lookup_inventory_item`), not just prompted. There's no open-ended plan→act→observe→re-plan loop, no arbitrary tool chaining, and no self-correction if the model's final response is neither a valid tool call nor usable plain text. The Ollama fallback path has none of this and is even more limited (single LLM call, text-JSON only).
- **Structured memory (`_remember_inventory_context`/`_backfill_inventory_params_from_memory`) is now implemented but deliberately narrow** — see Context Awareness above for exactly what it covers (single remembered item, bulk-delete list, remembered school for GET_ITEMS) and what it explicitly does not (there is no bulk status-update action to backfill into, regardless of memory quality).
- **Confirmation tokens have no explicit TTL.** A pending `DELETE_ITEM`/`TRANSFER_ITEM`/etc. confirmation, once issued, stays valid until confirmed or cancelled — there's no automatic expiry visible in `AIConfirmView`/`AIAgentService.confirm_action` ([service.py](../backend/ai/service.py)) beyond the audit-log row's status.
- **Prompt-injection mitigation is best-effort, not a guarantee.** User-authored conversation history is wrapped in a `<user_conversation_history>` tag (text-prompt path) or sanitized the same way when built into the tool-calling messages list, and role-label lines (`Assistant:`/`System:`/`User:`) inside it are neutralized (`AIAgentService._sanitize_history_content`, [service.py](../backend/ai/service.py)). This closes the specific "spoof a fake Assistant turn" vector but does not make the system immune to adversarial prompting in general - and the tool-calling path adds a new surface (tool results feeding back into the follow-up call) that isn't sanitized the same way, since `lookup_inventory_item`'s results come from the database, not user-authored text.
- **Rate limiting exists but is coarse.** `/api/ai/execute/`, `/api/ai/confirm/`, and `/api/ai/overwrite/` share one DRF `ScopedRateThrottle` scope (`ai_agent`, 30/min per authenticated user, configured in `backend/school_management/settings.py`) — it protects against runaway/abusive usage but isn't tuned per-agent or per-action. The tool-calling path can make **two** LLM calls per user message (lookup + follow-up) instead of one, so its effective request budget under the same rate limit is roughly halved on messages that trigger a lookup.
- **Admin-only category actions (`CREATE_CATEGORY`, `UPDATE_CATEGORY`) are enforced by prompt/tool-description instruction, not a code-level check in `service.py`/`resolver.py`** for the agent path — the real backstop is whatever `InventoryCategoryViewSet` enforces if the executor call reaches it. Don't assume the LLM refusing to comply with "only admins can do this" is a security boundary, on either path.
- **A separate, pre-existing auth bug affects Fee/HR agent executor code.** While fixing the inventory executor's internal-request authentication (see below), the same broken pattern (`request.user = self.user` instead of `force_authenticate()`) was found in ~6 more call sites in the Fee and HR/attendance agents' executor methods (e.g. `DELETE_FEES` was confirmed independently broken the same way). These were deliberately left unfixed here as out of scope for an inventory-focused change - flagged for a separate pass.

### Bugs found and fixed while building this (2026-08-28)

None of these were introduced by the tool-calling/memory work above - they were discovered because new tests exercised code paths that hadn't been covered before:

1. **Executor internal-request authentication.** Every inventory executor method that dispatches through a DRF viewset (`GET_ITEMS`, `GET_SUMMARY`, `UPDATE_ITEM_STATUS`, `DELETE_ITEM`, `BULK_DELETE_ITEMS`, `CREATE_ITEM`, `EDIT_ITEM`, `GET_ITEM_DETAILS`, `CREATE_CATEGORY`, `UPDATE_CATEGORY`, `DELETE_CATEGORY`) built its own synthetic internal request via `APIRequestFactory` and set `request.user = self.user` directly - this does **not** survive DRF wrapping the request into its own `Request` object, so every one of these actions was silently hitting `AnonymousUser`/401 in production. Fixed to use `force_authenticate(request, user=self.user)`, the same helper the Fee Agent's `_make_request()` already used correctly. Covered by `ExecutorInternalRequestAuthTests` in [backend/ai/tests.py](../backend/ai/tests.py).
2. **`GET_SUMMARY` raised `ImportError` on every call.** `_execute_get_inventory_summary` imported a nonexistent `InventorySummaryView` class; `inventory/views.py` only ever defined an `@api_view`-decorated function, `inventory_summary`. Fixed to call the function directly.
3. **`GET_SUMMARY`'s message formatting crashed whenever any items existed.** It treated `by_status`/`by_category` as `{name: count}` dicts and called `.items()` on them, but the real view returns lists of `{field, count}` dicts from a `.values().annotate()` queryset. Fixed to iterate the list shape correctly.

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
- Backend Actions: [backend/ai/actions.py:185-312](../backend/ai/actions.py#L185-L312)
- Text-prompt path: [backend/ai/prompts.py:150-333](../backend/ai/prompts.py#L150-L333) (`get_inventory_agent_prompt`)
- Tool-calling path: [backend/ai/inventory_tools.py](../backend/ai/inventory_tools.py) (`build_inventory_tools`), [backend/ai/prompts.py](../backend/ai/prompts.py) (`get_inventory_tool_system_prompt`), [backend/ai/llm_client.py](../backend/ai/llm_client.py) (`generate_with_tools`)
- Shared dispatch/memory: [backend/ai/service.py](../backend/ai/service.py) (`_process_inventory_with_tools`, `_handle_inventory_lookup_and_followup`, `_resolve_and_execute_action`, `_remember_inventory_context`, `_backfill_inventory_params_from_memory`)
- Backend Executors: [backend/ai/executor.py:1572-2489](../backend/ai/executor.py#L1572-L2489)
- Backend Resolver: [backend/ai/resolver.py](../backend/ai/resolver.py) (`_resolve_inventory_item`, `lookup_items_for_tool`)
- Backend Tests: [backend/ai/tests.py](../backend/ai/tests.py)
- Frontend Component: [frontend/src/components/inventory/InventoryAgentChat.js](../frontend/src/components/inventory/InventoryAgentChat.js)

**Note on line citations:** this codebase edits `backend/ai/*.py` frequently across multiple agents sharing the same files — line numbers drift fast. The citations above were verified at doc update time (2026-08-28); if they look off, search by function/class name instead of trusting the number.

---

**Happy Inventory Management! 🚀**

The InventoryAgent is ready to use. Simply integrate the component into your page and start managing inventory with natural language!
