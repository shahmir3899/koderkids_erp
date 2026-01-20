# Fee Agent Complete Implementation Plan

## Goal
Make the Fee Agent capable of performing ALL functions available on the FeePage frontend.

---

## Current Status Summary

### Already Working (9 functions):
1. CREATE_MONTHLY_FEES - Create fees for a school
2. CREATE_FEES_ALL_SCHOOLS - Create fees for all schools
3. CREATE_FEES_MULTIPLE_SCHOOLS - Create fees for specific schools
4. CREATE_MISSING_FEES - Create fees for schools without records
5. UPDATE_FEE - Update single fee payment
6. GET_FEE_SUMMARY - Get fee statistics
7. GET_SCHOOLS_WITHOUT_FEES - Find schools missing fees
8. GET_RECOVERY_REPORT - Get collection rates
9. Overwrite confirmation flow

### Needs LLM Prompt Addition (3 functions):
- CREATE_SINGLE_FEE (action exists, not in prompt)
- DELETE_FEES (action exists, not in prompt)
- GET_FEES with filters (action exists, partially in prompt)

### Missing Completely (4 functions):
- BULK_UPDATE_FEES - Update multiple fees at once
- UPDATE_DATE_RECEIVED - Update payment date
- UPDATE_TOTAL_FEE - Change fee amount
- EXPORT_PDF - Export to PDF (may skip - complex)

---

## Phase 1: Add CREATE_SINGLE_FEE to LLM

**Objective**: Allow agent to create fee for a single student

### Components to Modify:

#### 1.1 Backend - prompts.py
Add to Available actions:
```python
{"action":"CREATE_SINGLE_FEE","student_name":"STUDENT_NAME","month":"Jan-2026","total_fee":5000}
```

Add decision rules:
- "create fee for [student name]" → CREATE_SINGLE_FEE
- "add fee record for [student]" → CREATE_SINGLE_FEE
- "single fee for [student]" → CREATE_SINGLE_FEE

#### 1.2 Backend - service.py
Add action name normalization:
- 'CREATE_STUDENT_FEE' → 'CREATE_SINGLE_FEE'
- 'ADD_STUDENT_FEE' → 'CREATE_SINGLE_FEE'
- 'SINGLE_STUDENT_FEE' → 'CREATE_SINGLE_FEE'

#### 1.3 Backend - resolver.py
Add `_resolve_create_single_fee()`:
- Resolve student_name → student_id using fuzzy matching
- If multiple matches, ask for clarification (school/class)
- Validate month format

#### 1.4 Backend - executor.py
Verify `_execute_create_single_fee()` exists and works properly.

### Testing Phase 1:
```
Test 1: "Create fee for Ali Khan for Jan-2026"
Expected: Creates single fee, shows confirmation

Test 2: "Add fee record for Sara, total 5000"
Expected: Creates fee with total_fee=5000

Test 3: "Create fee for Ahmed" (ambiguous name)
Expected: Asks for clarification (which Ahmed?)

Test 4: "Single fee for student in class 10A Main School"
Expected: Lists students in that class to choose from
```

---

## Phase 2: Add DELETE_FEES to LLM

**Objective**: Allow agent to delete fee records with confirmation

### Components to Modify:

#### 2.1 Backend - prompts.py
Add to Available actions:
```python
{"action":"DELETE_FEES","fee_ids":[123,456]}
{"action":"DELETE_FEES","student_name":"STUDENT_NAME","month":"Jan-2026"}
```

Add decision rules:
- "delete fee #123" → DELETE_FEES
- "remove fee record for [student]" → DELETE_FEES
- "delete fees for [student] [month]" → DELETE_FEES

#### 2.2 Backend - service.py
Add action name normalization:
- 'REMOVE_FEE' → 'DELETE_FEES'
- 'DELETE_FEE' → 'DELETE_FEES'
- 'REMOVE_FEES' → 'DELETE_FEES'

#### 2.3 Backend - resolver.py
Add `_resolve_delete_fees()`:
- If fee_ids provided, validate they exist
- If student_name provided, find fee(s) for that student
- Return fee details for confirmation display

#### 2.4 Backend - executor.py
Verify `_execute_delete_fees()` exists.
Update to return detailed info about deleted records.

#### 2.5 Frontend - FeeAgentChat.js
Confirmation UI already exists (`pendingConfirmation` state).
Verify DELETE_FEES triggers it properly.

### Testing Phase 2:
```
Test 1: "Delete fee #123"
Expected: Shows confirmation with fee details, waits for confirm/cancel

Test 2: "Remove fee record for Ali Khan Jan-2026"
Expected: Finds fee, shows confirmation

Test 3: "Delete all fees for Sara"
Expected: Shows list of Sara's fees, asks which to delete

Test 4: Confirm deletion
Expected: Deletes and shows success message

Test 5: Cancel deletion
Expected: Shows cancellation message, no deletion
```

---

## Phase 3: Enhance GET_FEES with Filters

**Objective**: Allow agent to query fees with various filters

### Components to Modify:

#### 3.1 Backend - prompts.py
Update GET_FEES examples:
```python
{"action":"GET_FEES","status":"Pending"}
{"action":"GET_FEES","school_name":"Main School","month":"Jan-2026"}
{"action":"GET_FEES","student_name":"Ali Khan"}
{"action":"GET_FEES","class":"10A","status":"Partial"}
```

Add decision rules:
- "show pending fees" → GET_FEES with status:"Pending"
- "show fees for [school]" → GET_FEES with school_name
- "list fees for class 10A" → GET_FEES with class
- "unpaid fees for Jan-2026" → GET_FEES with month and status:"Pending"
- "show paid fees" → GET_FEES with status:"Paid"
- "partial payments" → GET_FEES with status:"Partial"

#### 3.2 Backend - resolver.py
Update `_resolve_get_fees()`:
- Resolve school_name → school_id
- Resolve student_name → student_id
- Validate status values

#### 3.3 Backend - executor.py
Update `_execute_get_fees()`:
- Support all filter combinations
- Return formatted results with pagination hint
- Include summary stats

#### 3.4 Frontend - FeeAgentChat.js
Update `renderDataDisplay()` to handle fee list display:
- Show fee records in a table/list format
- Show count and totals

### Testing Phase 3:
```
Test 1: "Show all pending fees"
Expected: Lists pending fees with student names, amounts

Test 2: "Show fees for Main School Jan-2026"
Expected: Lists fees filtered by school and month

Test 3: "List partial payments"
Expected: Shows fees with status="Partial"

Test 4: "Show fees for class 10A"
Expected: Shows fees for students in that class

Test 5: "Unpaid fees for Sara"
Expected: Shows Sara's pending fees
```

---

## Phase 4: Add BULK_UPDATE_FEES

**Objective**: Allow updating multiple fees at once

### Components to Modify:

#### 4.1 Backend - actions.py
Add new action definition:
```python
"BULK_UPDATE_FEES": ActionDefinition(
    name="BULK_UPDATE_FEES",
    action_type=ActionType.WRITE,
    required_params=["fee_ids", "paid_amount"],
    optional_params=["status"],
    handler="bulk_update_fees",
    requires_confirmation=False,
    description="Update multiple fee records at once"
)
```

#### 4.2 Backend - prompts.py
Add to Available actions:
```python
{"action":"BULK_UPDATE_FEES","fee_ids":[1,2,3],"paid_amount":5000}
{"action":"BULK_UPDATE_FEES","school_name":"Main School","class":"10A","paid_amount":"full"}
```

Add decision rules:
- "mark all fees for class 10A as paid" → BULK_UPDATE_FEES
- "update all pending fees for [school] with [amount]" → BULK_UPDATE_FEES
- "bulk update fees" → BULK_UPDATE_FEES

#### 4.3 Backend - service.py
Add normalization:
- 'BULK_PAYMENT' → 'BULK_UPDATE_FEES'
- 'BATCH_UPDATE_FEES' → 'BULK_UPDATE_FEES'
- 'UPDATE_MULTIPLE_FEES' → 'BULK_UPDATE_FEES'

#### 4.4 Backend - resolver.py
Add `_resolve_bulk_update_fees()`:
- If school+class provided, find all matching fee_ids
- If status filter provided, apply it
- Return list of fees to be updated for confirmation

#### 4.5 Backend - executor.py
Add `_execute_bulk_update_fees()`:
```python
def _execute_bulk_update_fees(self, params: Dict) -> Dict:
    """Update multiple fees at once."""
    fee_ids = params.get('fee_ids', [])
    paid_amount = params.get('paid_amount')

    # Handle "full" keyword
    results = []
    for fee_id in fee_ids:
        # Update each fee
        ...

    return {
        "success": True,
        "message": f"Updated {len(results)} fee records",
        "data": {"updated_count": len(results), "results": results}
    }
```

### Testing Phase 4:
```
Test 1: "Mark all fees for class 10A Main School as paid"
Expected: Updates all matching fees, shows count

Test 2: "Update pending fees for Sara with 3000 each"
Expected: Updates all Sara's pending fees

Test 3: "Bulk update fees 1,2,3 with full payment"
Expected: Marks all as fully paid

Test 4: "Pay all partial fees for Jan-2026"
Expected: Completes all partial payments
```

---

## Phase 5: Add UPDATE_DATE_RECEIVED

**Objective**: Allow updating payment date for fees

### Components to Modify:

#### 5.1 Backend - actions.py
Update UPDATE_FEE optional_params to include `date_received`

#### 5.2 Backend - prompts.py
Add examples:
```python
{"action":"UPDATE_FEE","fee_id":123,"date_received":"2026-01-15"}
{"action":"UPDATE_FEE","student_name":"Ali","date_received":"today"}
```

Add decision rules:
- "set payment date for fee #123 to [date]" → UPDATE_FEE with date_received
- "Ali paid on [date]" → UPDATE_FEE with date_received
- "update received date" → UPDATE_FEE with date_received

#### 5.3 Backend - executor.py
Update `_execute_update_fee()`:
- Handle date_received parameter
- Support "today", "yesterday" keywords
- Validate date format

### Testing Phase 5:
```
Test 1: "Set payment date for fee #123 to 2026-01-15"
Expected: Updates date_received

Test 2: "Ali paid on 10th January"
Expected: Parses date, updates record

Test 3: "Mark fee #456 received today"
Expected: Sets date_received to current date

Test 4: "Update payment date for Sara to yesterday"
Expected: Sets date_received to yesterday
```

---

## Phase 6: Add UPDATE_TOTAL_FEE (Optional)

**Objective**: Allow changing the total fee amount

### Components to Modify:

#### 6.1 Backend - prompts.py
Add decision rule:
- "change total fee for [student] to [amount]" → UPDATE_FEE with total_fee

#### 6.2 Backend - executor.py
Update `_execute_update_fee()`:
- Handle total_fee parameter separately
- Recalculate balance_due

### Testing Phase 6:
```
Test 1: "Change total fee for Ali to 6000"
Expected: Updates total_fee, recalculates balance

Test 2: "Set fee amount for fee #123 to 4500"
Expected: Updates total_fee
```

---

## Phase 7: Frontend Polish & Error Handling

**Objective**: Improve user experience and error handling

### Components to Modify:

#### 7.1 Frontend - FeeAgentChat.js

**Improve renderDataDisplay():**
- Better table display for fee lists
- Pagination hint for large results
- Color coding for status (Pending=yellow, Paid=green, Partial=orange)

**Improve example prompts:**
```javascript
const EXAMPLE_PROMPTS = [
    "Record payment of 5000 for Ali Khan",
    "Show pending fees for Main School",
    "Delete fee #123",
    "Mark all fees for class 10A as paid",
    "Create fee for Sara Ahmed"
];
```

**Update welcome text:**
```
"Create fees, record payments, view reports, delete records"
```

#### 7.2 Backend - Error Messages
Improve error messages to be more helpful:
- "Student not found" → "No student named 'X' found. Did you mean: Y, Z?"
- "Invalid month" → "Please use format like 'Jan-2026' or 'January 2026'"

### Testing Phase 7:
```
Test 1: Verify all error messages are user-friendly
Test 2: Verify data displays correctly for all action types
Test 3: Verify example prompts work correctly
Test 4: Test edge cases (empty results, large datasets)
```

---

## Implementation Order Summary

| Phase | Feature | Complexity | Dependencies |
|-------|---------|------------|--------------|
| 1 | CREATE_SINGLE_FEE | Low | None |
| 2 | DELETE_FEES | Medium | Phase 1 |
| 3 | GET_FEES enhanced | Medium | None |
| 4 | BULK_UPDATE_FEES | High | Phase 3 |
| 5 | UPDATE_DATE_RECEIVED | Low | None |
| 6 | UPDATE_TOTAL_FEE | Low | None |
| 7 | Frontend Polish | Medium | All phases |

---

## Files to Modify by Phase

### Phase 1:
- `backend/ai/prompts.py`
- `backend/ai/service.py`
- `backend/ai/resolver.py`
- `backend/ai/executor.py` (verify)

### Phase 2:
- `backend/ai/prompts.py`
- `backend/ai/service.py`
- `backend/ai/resolver.py`
- `backend/ai/executor.py`

### Phase 3:
- `backend/ai/prompts.py`
- `backend/ai/resolver.py`
- `backend/ai/executor.py`
- `frontend/src/components/finance/FeeAgentChat.js`

### Phase 4:
- `backend/ai/actions.py`
- `backend/ai/prompts.py`
- `backend/ai/service.py`
- `backend/ai/resolver.py`
- `backend/ai/executor.py`

### Phase 5:
- `backend/ai/prompts.py`
- `backend/ai/executor.py`

### Phase 6:
- `backend/ai/prompts.py`
- `backend/ai/executor.py`

### Phase 7:
- `frontend/src/components/finance/FeeAgentChat.js`
- Various backend files for error messages

---

## Post-Implementation Checklist

- [ ] All FeePage functions available via agent
- [ ] All error messages are user-friendly
- [ ] Confirmation flows work for destructive actions
- [ ] Data displays correctly for all response types
- [ ] Example prompts cover all major functions
- [ ] Edge cases handled gracefully
- [ ] No regression in existing functionality

---

## Notes

1. **PDF Export**: Skipped because it requires file download handling which is complex for chat interface. Users can still use the FeePage button for this.

2. **Bulk Selection**: The FeePage allows checkbox selection for bulk operations. The agent uses natural language filters instead (e.g., "all fees for class 10A").

3. **Inline Editing**: The FeePage has click-to-edit. The agent uses explicit update commands instead.
