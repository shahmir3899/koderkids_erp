# Fee Agent Enhancement Plan

## Overview
Comprehensive plan to upgrade the Fee Agent from a collapsible panel to a floating chatbot with major feature additions.

**Files to modify:**
- `frontend/src/components/finance/FeeAgentChat.js` (major refactor)
- `frontend/src/pages/FeePage.js` (switch to FloatingChatWindow)
- `backend/ai/prompts.py` (new actions)
- `backend/ai/actions.py` (new action definitions)
- `backend/ai/executor.py` (new executors)
- `backend/ai/service.py` (undo tracking)
- `backend/students/views.py` (new API endpoints)
- `frontend/src/services/aiService.js` (new context fields)
- `frontend/src/services/feeService.js` (new API calls)
- `frontend/src/hooks/useFeePDF.js` (receipt generation)

---

## Phase 1: Floating Chatbot + Speech Fix

### 1A. Convert to Floating Chat Window
**Priority:** High | **Effort:** Small

Replace CollapsibleSection wrapper with FloatingChatWindow in FeePage.js.

**Current (FeePage.js ~line 296):**
```jsx
<CollapsibleSection title="Fee Agent - AI Assistant" defaultOpen={true} icon="...">
  <FeeAgentChat schools={schools} students={students} onRefresh={fetchFees} height="400px" />
</CollapsibleSection>
```

**New (FeePage.js):**
```jsx
<FloatingChatWindow
  title="Fee Agent"
  subtitle="AI-powered fee management"
  icon="..."
  fabPosition={{ bottom: '24px', right: '24px' }}
  windowSize={{ width: '420px', height: '550px' }}
  showBadge={true}
  badgeColor="#10B981"
  zIndex={1000}
>
  <div style={{ padding: SPACING.md, height: '100%', overflow: 'hidden' }}>
    <FeeAgentChat
      schools={schools}
      students={students}
      onRefresh={fetchFees}
      height="100%"
    />
  </div>
</FloatingChatWindow>
```

**Changes needed in FeeAgentChat.js:**
- Remove the internal header (title bar) since FloatingChatWindow provides one
- Set container background to transparent (parent handles it)
- Ensure height="100%" works properly with flex layout

**Reference:** TaskManagementPage.js lines 829-849 uses exact same pattern.

### 1B. Fix Speech Auto-play - Add Mute Toggle
**Priority:** High | **Effort:** Small

**Problem:** Speech plays automatically on every bot response with no way to disable it.

**Solution:** Add a mute/unmute toggle button in the chat header.

**Changes in FeeAgentChat.js:**

1. Add state:
```javascript
const [speechEnabled, setSpeechEnabled] = useState(false); // Default OFF
```

2. Modify auto-speak useEffect (currently line ~122):
```javascript
useEffect(() => {
    if (!speechSupported || !speechEnabled || chatHistory.length === 0) return;
    // ... existing speak logic
}, [chatHistory, speechSupported, speechEnabled, speak]);
```

3. Add mute toggle button in header area (next to AI status):
```jsx
{speechSupported && (
  <button
    onClick={() => {
      if (speechEnabled) stopSpeaking();
      setSpeechEnabled(prev => !prev);
    }}
    style={styles.muteButton}
    title={speechEnabled ? 'Mute voice' : 'Enable voice'}
  >
    {speechEnabled ? '...' : '...'}
  </button>
)}
```

4. Persist preference in localStorage:
```javascript
const [speechEnabled, setSpeechEnabled] = useState(
  () => localStorage.getItem('feeAgentSpeech') === 'true'
);
useEffect(() => {
  localStorage.setItem('feeAgentSpeech', speechEnabled);
}, [speechEnabled]);
```

---

## Phase 2: Undo Last Action

### 2A. Backend - Track Last Action for Undo
**Priority:** High | **Effort:** Medium

**Changes in executor.py:**

For CREATE_MONTHLY_FEES: after successful creation, return the created fee IDs so they can be deleted on undo.
```python
# In _execute_create_monthly_fees, after success:
return {
    "success": True,
    "message": f"Created {records} fee records...",
    "data": data,
    "undo_action": {
        "type": "DELETE_FEES",
        "params": {"fee_ids": data.get('fee_ids', [])},
        "description": f"Undo: Delete {records} fee records for {school_name} - {month}"
    }
}
```

For UPDATE_FEE / BULK_UPDATE_FEES: return the previous values so they can be restored.
```python
# Before update, snapshot current values:
old_values = list(Fee.objects.filter(id__in=fee_ids).values('id', 'paid_amount', 'date_received', 'status'))

# After update:
return {
    "success": True,
    "undo_action": {
        "type": "RESTORE_FEES",
        "params": {"old_values": old_values},
        "description": f"Undo: Restore previous payment values"
    }
}
```

For DELETE_FEES: store deleted records for potential restore (soft-delete already exists via confirmation flow).

**Changes in students/views.py:**
- `create_new_month_fees`: Return `fee_ids` list in response data alongside `records_created`

### 2B. Frontend - Undo Button After Actions
**Priority:** High | **Effort:** Medium

**Changes in FeeAgentChat.js:**

1. Add state:
```javascript
const [lastUndoAction, setLastUndoAction] = useState(null);
```

2. After successful action in handleSendMessage/handleQuickAction, capture undo data:
```javascript
if (result.success && result.undo_action) {
    setLastUndoAction(result.undo_action);
    // Auto-clear undo after 30 seconds
    setTimeout(() => setLastUndoAction(null), 30000);
}
```

3. Show undo button in the success message:
```jsx
{lastUndoAction && (
  <button onClick={handleUndo} style={styles.undoButton}>
    Undo: {lastUndoAction.description}
  </button>
)}
```

4. Handle undo:
```javascript
const handleUndo = async () => {
    if (!lastUndoAction) return;
    setIsProcessing(true);
    const result = await executeAICommand({
        message: `__UNDO__`,
        agent: 'fee',
        context: { undo_action: lastUndoAction }
    });
    // Or call a dedicated undo endpoint
    setLastUndoAction(null);
    if (result.success) {
        addMessage('bot', `Undone: ${result.message}`);
        if (onRefresh) onRefresh();
    }
    setIsProcessing(false);
};
```

**New backend endpoint (ai/views.py):**
```python
# POST /api/ai/undo/
class AIUndoView(APIView):
    """Execute undo for last fee action."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        undo_action = request.data.get('undo_action', {})
        undo_type = undo_action.get('type')
        params = undo_action.get('params', {})

        if undo_type == 'DELETE_FEES':
            # Delete the created fee records
            fee_ids = params.get('fee_ids', [])
            Fee.objects.filter(id__in=fee_ids).delete()
            return Response({"success": True, "message": f"Deleted {len(fee_ids)} records"})

        elif undo_type == 'RESTORE_FEES':
            # Restore previous values
            for old in params.get('old_values', []):
                Fee.objects.filter(id=old['id']).update(**{k: v for k, v in old.items() if k != 'id'})
            return Response({"success": True, "message": "Previous values restored"})

        return Response({"error": "Invalid undo action"}, status=400)
```

**URL:** Add `path('api/ai/undo/', AIUndoView.as_view())` to ai/urls.py

---

## Phase 3: Batch Payment Recording

### 3A. New Action: BATCH_UPDATE_FEES
**Priority:** High | **Effort:** Medium

**Add to prompts.py (fee agent prompt):**
```
25. {{"action":"BATCH_UPDATE_FEES","payments":[{{"student_name":"Ali","paid_amount":5000}},{{"student_name":"Sara","paid_amount":3000}}],"month":"Feb-2026"}}
```

**Add decision rule:**
```
- User lists multiple payments like "Ali paid 5000, Sara paid 3000, Hassan paid full" -> return BATCH_UPDATE_FEES with payments array
- User says "record payments: Ali 5000, Sara 3000" -> return BATCH_UPDATE_FEES
```

**Add to actions.py:**
```python
"BATCH_UPDATE_FEES": ActionDefinition(
    name="BATCH_UPDATE_FEES",
    action_type=ActionType.WRITE,
    required_params=["payments"],
    optional_params=["month", "school_name"],
    endpoint="/api/fees/update/",
    requires_confirmation=False,
    description="Record multiple student payments in one go"
),
```

**Add executor in executor.py:**
```python
def _execute_batch_update_fees(self, params: Dict) -> Dict:
    """Process multiple payments at once."""
    payments = params.get('payments', [])
    month = params.get('month')
    results = []
    errors = []

    for payment in payments:
        student_name = payment.get('student_name')
        paid_amount = payment.get('paid_amount')

        # Resolve student -> fee record
        fee = Fee.objects.filter(
            student_name__icontains=student_name,
            month=month,
            status__in=['Pending', 'Overdue']
        ).first()

        if fee:
            if paid_amount == 'full':
                paid_amount = float(fee.balance_due)
            fee.paid_amount = float(fee.paid_amount) + float(paid_amount)
            fee.balance_due = float(fee.total_fee) - float(fee.paid_amount)
            fee.status = 'Paid' if fee.balance_due <= 0 else 'Pending'
            fee.date_received = date.today()
            fee.save()
            results.append({"student": student_name, "amount": paid_amount, "status": fee.status})
        else:
            errors.append({"student": student_name, "error": "Fee record not found"})

    return {
        "success": len(results) > 0,
        "message": f"Processed {len(results)} payments. {len(errors)} failed.",
        "data": {"results": results, "errors": errors}
    }
```

---

## Phase 4: Fee Defaulter List

### 4A. New Action: GET_DEFAULTERS
**Priority:** High | **Effort:** Medium

**New backend endpoint (students/views.py):**
```python
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_fee_defaulters(request):
    """Get students with unpaid fees for N consecutive months."""
    months_threshold = int(request.query_params.get('months', 3))
    school_id = request.query_params.get('school_id')

    # Get last N months
    from dateutil.relativedelta import relativedelta
    now = date.today()
    month_strings = []
    for i in range(months_threshold):
        d = now - relativedelta(months=i)
        month_strings.append(d.strftime('%b-%Y'))

    query = Fee.objects.filter(
        month__in=month_strings,
        status__in=['Pending', 'Overdue'],
        balance_due__gt=0
    )
    if school_id:
        query = query.filter(school_id=school_id)

    # Group by student, count months with unpaid
    from django.db.models import Count, Sum
    defaulters = query.values(
        'student_id', 'student_name', 'student_class', 'school__name'
    ).annotate(
        unpaid_months=Count('id'),
        total_due=Sum('balance_due')
    ).filter(
        unpaid_months__gte=months_threshold
    ).order_by('-total_due')

    return Response({
        "defaulters": list(defaulters),
        "count": defaulters.count(),
        "months_checked": months_threshold,
        "months": month_strings
    })
```

**URL:** `path('api/fees/defaulters/', get_fee_defaulters, name='fee-defaulters')`

**Add to prompts.py:**
```
26. {{"action":"GET_DEFAULTERS","months":3}}
27. {{"action":"GET_DEFAULTERS","months":3,"school_name":"SCHOOL"}}
```

**Decision rules:**
```
- User says "show defaulters" or "students who haven't paid" or "fee defaulters" -> return GET_DEFAULTERS with months:3
- User says "students not paying for 2 months" -> return GET_DEFAULTERS with months:2
- User says "defaulters for [school]" -> return GET_DEFAULTERS with school_name and months:3
```

**Executor:** Call the new endpoint, return formatted defaulter list.

**Frontend display in FeeAgentChat.js:** Add a new render section in `renderDataDisplay` for defaulter data showing student name, class, school, months unpaid, total due.

---

## Phase 5: Auto-fill date_received

### 5A. Backend Change
**Priority:** High | **Effort:** Small

**Changes in executor.py** `_execute_update_fee` and `_execute_bulk_update_fees`:

When `paid_amount` is being set and `date_received` is not provided, auto-set it to today:
```python
def _execute_update_fee(self, params: Dict) -> Dict:
    # ... existing logic ...
    paid_amount = params.get('paid_amount')
    date_received = params.get('date_received')

    # Auto-fill date_received when recording payment
    if paid_amount and not date_received:
        date_received = str(date.today())
        params['date_received'] = date_received

    # ... rest of update logic ...
```

**Also update students/views.py** `update_fees` endpoint:
```python
# In the fee update loop, if paid_amount is changing and no date_received:
if fee_data.get('paid_amount') and not fee_data.get('date_received'):
    fee.date_received = date.today()
```

---

## Phase 6: Month Comparison

### 6A. New Action: COMPARE_MONTHS
**Priority:** High | **Effort:** Medium

**New backend endpoint (students/views.py):**
```python
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def compare_fee_months(request):
    """Compare fee collection between two months."""
    month1 = request.query_params.get('month1')  # e.g. "Jan-2026"
    month2 = request.query_params.get('month2')  # e.g. "Feb-2026"
    school_id = request.query_params.get('school_id')

    def get_stats(month):
        query = Fee.objects.filter(month=month)
        if school_id:
            query = query.filter(school_id=school_id)
        from django.db.models import Sum, Count
        stats = query.aggregate(
            total_fee=Sum('total_fee'),
            total_paid=Sum('paid_amount'),
            total_balance=Sum('balance_due'),
            total_records=Count('id'),
            paid_count=Count('id', filter=models.Q(status='Paid')),
            pending_count=Count('id', filter=models.Q(status='Pending'))
        )
        stats['month'] = month
        stats['recovery_rate'] = (
            round((stats['total_paid'] or 0) / (stats['total_fee'] or 1) * 100, 1)
        )
        return stats

    stats1 = get_stats(month1)
    stats2 = get_stats(month2)

    # Calculate differences
    diff = {
        'collection_change': (stats2.get('total_paid') or 0) - (stats1.get('total_paid') or 0),
        'recovery_change': stats2['recovery_rate'] - stats1['recovery_rate'],
        'student_change': (stats2.get('total_records') or 0) - (stats1.get('total_records') or 0),
    }

    return Response({
        "month1": stats1,
        "month2": stats2,
        "comparison": diff
    })
```

**URL:** `path('api/fees/compare/', compare_fee_months, name='compare-fee-months')`

**Add to prompts.py:**
```
28. {{"action":"COMPARE_MONTHS","month1":"Jan-2026","month2":"Feb-2026"}}
```

**Decision rules:**
```
- User says "compare Jan vs Feb" or "compare last month with this month" -> return COMPARE_MONTHS
- User says "how was collection last month compared to this month" -> return COMPARE_MONTHS
```

**Frontend display:** Side-by-side comparison grid with arrows showing increase/decrease, color-coded (green for improvement, red for decline).

---

## Phase 7: Remember Last School/Month

### 7A. Frontend - localStorage Persistence
**Priority:** Medium | **Effort:** Small

**Changes in FeeAgentChat.js:**

```javascript
// On mount, restore last used context
const [lastContext, setLastContext] = useState(() => {
    try {
        return JSON.parse(localStorage.getItem('feeAgentLastContext')) || {};
    } catch { return {}; }
});

// After successful school/month action, save context
const saveLastContext = (schoolId, schoolName, month) => {
    const ctx = { schoolId, schoolName, month, savedAt: Date.now() };
    localStorage.setItem('feeAgentLastContext', JSON.stringify(ctx));
    setLastContext(ctx);
};
```

**Pass to AI context in buildFeeContext:**
```javascript
export const buildFeeContext = (schools = [], students = [], feeCategories = []) => {
    const lastCtx = JSON.parse(localStorage.getItem('feeAgentLastContext') || '{}');
    return {
        // ... existing fields ...
        last_used_school_id: lastCtx.schoolId || null,
        last_used_school_name: lastCtx.schoolName || null,
        last_used_month: lastCtx.month || null,
    };
};
```

**Update prompts.py** to use last context:
```
- If user says "create fees" without school and last_used_school is available, suggest: "Create fees for [last_school]? Or choose another school:"
```

---

## Phase 8: Smart Follow-up Suggestions

### 8A. Frontend - Contextual Action Buttons
**Priority:** Medium | **Effort:** Medium

After each successful action, show relevant next-step buttons.

**Changes in FeeAgentChat.js:**

Define follow-up maps:
```javascript
const FOLLOW_UP_ACTIONS = {
    'CREATE_MONTHLY_FEES': [
        { label: 'View Summary', action: 'show fee summary' },
        { label: 'Check Recovery', action: 'show recovery report' },
        { label: 'Create for Another School', action: 'create fees' },
        { label: 'Export PDF', action: '__EXPORT_PDF__' },
    ],
    'UPDATE_FEE': [
        { label: 'View Updated Fees', action: 'show fees' },
        { label: 'More Payments', action: 'record payment' },
        { label: 'Fee Summary', action: 'show fee summary' },
    ],
    'BULK_UPDATE_FEES': [
        { label: 'View Summary', action: 'show fee summary' },
        { label: 'Check Recovery', action: 'show recovery report' },
        { label: 'Export PDF', action: '__EXPORT_PDF__' },
    ],
    'GET_FEES': [
        { label: 'Mark All Paid', action: 'mark all as paid' },
        { label: 'Export PDF', action: '__EXPORT_PDF__' },
        { label: 'Fee Summary', action: 'show fee summary' },
    ],
    'DELETE_FEES': [
        { label: 'View Remaining', action: 'show fees' },
    ],
    'GET_FEE_SUMMARY': [
        { label: 'Show Pending', action: 'show pending fees' },
        { label: 'Recovery Report', action: 'show recovery report' },
        { label: 'Export PDF', action: '__EXPORT_PDF__' },
    ],
    'GET_DEFAULTERS': [
        { label: 'Send Reminders', action: 'generate reminders' },
        { label: 'View by School', action: 'show defaulters for' },
    ],
};
```

Render after each bot message:
```jsx
{result.action && FOLLOW_UP_ACTIONS[result.action] && (
    <div style={styles.followUpRow}>
        {FOLLOW_UP_ACTIONS[result.action].map((item, idx) => (
            <button
                key={idx}
                style={styles.followUpButton}
                onClick={() => {
                    if (item.action === '__EXPORT_PDF__') handleExportPDF();
                    else handleQuickAction(item.action);
                }}
            >
                {item.label}
            </button>
        ))}
    </div>
)}
```

---

## Phase 9: PDF Receipt from Chat

### 9A. Trigger Existing PDF Export from Chat
**Priority:** Medium | **Effort:** Small

**Changes:**

The existing `useFeePDF` hook requires `groupedFees` and `totals`. The FeeAgentChat needs access to the current fee data context.

**Option A (Recommended):** Pass `onExportPDF` callback from FeePage.js:
```jsx
<FeeAgentChat
    schools={schools}
    students={students}
    onRefresh={fetchFees}
    onExportPDF={handleExportPDF}   // <-- New prop
    height="100%"
/>
```

In FeeAgentChat.js, when user says "export PDF" or clicks the follow-up button:
```javascript
if (result.action === '__EXPORT_PDF__' || message.toLowerCase().includes('export pdf')) {
    if (onExportPDF) {
        onExportPDF();
        addMessage('bot', 'PDF exported! Check your downloads.');
    } else {
        addMessage('bot', 'Please use the Export PDF button in the fee table above.');
    }
}
```

**Add to prompts.py:**
```
- User says "export pdf" or "download report" or "generate pdf" -> return {"action":"EXPORT_PDF"}
```

---

## Phase 10: Confirmation Sound

### 10A. Add Sound Effects
**Priority:** Low | **Effort:** Small

**Create a simple sound utility:**

```javascript
// In FeeAgentChat.js or a shared utility
const playSound = (type) => {
    const sounds = {
        success: '/sounds/success.mp3',
        error: '/sounds/error.mp3',
        confirm: '/sounds/confirm.mp3',
    };
    try {
        const audio = new Audio(sounds[type]);
        audio.volume = 0.3;
        audio.play().catch(() => {}); // Ignore autoplay errors
    } catch {}
};
```

**Usage:** Call after actions:
```javascript
if (result.success) {
    playSound('success');
    addMessage('bot', `... ${result.message}`, result.data);
}
```

**Sound files:** Place small MP3 files (< 10KB each) in `frontend/public/sounds/`.
Can use free UI sounds from sites like mixkit.co or generate simple tones.

---

## Phase 11: Keyboard Shortcuts for Dialogs

### 11A. Enter Key Support on Confirmation Dialogs
**Priority:** Low | **Effort:** Small

**Changes in FeeAgentChat.js:**

Add keyboard listener when confirmation/overwrite dialog is active:
```javascript
useEffect(() => {
    if (!pendingConfirmation && !pendingOverwrite) return;

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === 'y' || e.key === 'Y') {
            e.preventDefault();
            if (pendingConfirmation) handleConfirm(true);
            else if (pendingOverwrite) handleOverwrite(true);
        } else if (e.key === 'Escape' || e.key === 'n' || e.key === 'N') {
            e.preventDefault();
            if (pendingConfirmation) handleConfirm(false);
            else if (pendingOverwrite) handleOverwrite(false);
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
}, [pendingConfirmation, pendingOverwrite, handleConfirm, handleOverwrite]);
```

Add hint text in the dialog:
```jsx
<div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '4px', textAlign: 'center' }}>
    Press Y to confirm, N to cancel
</div>
```

---

## Implementation Order

| Phase | Feature | Priority | Effort | Dependencies |
|-------|---------|----------|--------|--------------|
| 1A | Floating chatbot | High | Small | None |
| 1B | Speech mute toggle | High | Small | None |
| 5 | Auto-fill date_received | High | Small | None |
| 11 | Keyboard shortcuts | Low | Small | None |
| 10 | Confirmation sounds | Low | Small | None |
| 7 | Remember last school/month | Medium | Small | None |
| 2 | Undo last action | High | Medium | New endpoint |
| 3 | Batch payments | High | Medium | New action + executor |
| 4 | Fee defaulters | High | Medium | New endpoint |
| 6 | Month comparison | High | Medium | New endpoint |
| 8 | Smart follow-ups | Medium | Medium | Phase 1A done |
| 9 | PDF from chat | Medium | Small | Phase 8 done |

**Recommended order:** 1A -> 1B -> 5 -> 11 -> 10 -> 7 -> 8 -> 9 -> 2 -> 3 -> 4 -> 6

Start with quick UI wins (floating, speech, keyboard), then add backend features.

---

## Summary of New Backend Endpoints

| Method | URL | Purpose |
|--------|-----|---------|
| POST | `/api/ai/undo/` | Undo last fee action |
| GET | `/api/fees/defaulters/` | Fee defaulter list |
| GET | `/api/fees/compare/` | Month-over-month comparison |

## Summary of New AI Actions

| Action | Type | Description |
|--------|------|-------------|
| `BATCH_UPDATE_FEES` | WRITE | Multiple payments in one message |
| `GET_DEFAULTERS` | READ | Students with N+ months unpaid |
| `COMPARE_MONTHS` | READ | Side-by-side month stats |
| `EXPORT_PDF` | LOCAL | Trigger PDF download (frontend-only) |
