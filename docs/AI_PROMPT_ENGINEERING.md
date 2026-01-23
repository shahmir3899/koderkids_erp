# AI Prompt Engineering Best Practices

**Version:** 1.0
**Last Updated:** January 2026
**Purpose:** Guide to writing effective prompts for AI agents in the School Management System

---

## Table of Contents

1. [Prompt Fundamentals](#prompt-fundamentals)
2. [System Prompt Structure](#system-prompt-structure)
3. [Decision Rule Design](#decision-rule-design)
4. [Context Management](#context-management)
5. [Error Handling](#error-handling)
6. [Testing Prompts](#testing-prompts)
7. [Common Patterns](#common-patterns)
8. [Troubleshooting](#troubleshooting)

---

## Prompt Fundamentals

### Core Principles

1. **Be Explicit**: LLMs need clear, unambiguous instructions
2. **Use Examples**: Show the exact format you want
3. **Set Constraints**: Define what NOT to do
4. **Provide Context**: Give relevant information upfront
5. **Test Iteratively**: Prompts require experimentation

---

### The Golden Rule for JSON Output

**Always enforce strict JSON format:**

```
IMPORTANT: Return ONLY a valid JSON object. No explanations, no markdown, no code blocks. Just raw JSON.
```

**Why this works:**
- LLMs often add "helpful" explanations
- Markdown code blocks (`json...`) break parsing
- Repetition reinforces the constraint

---

## System Prompt Structure

### Template

```python
def get_agent_prompt(context: dict) -> str:
    return f'''
[1. ROLE DEFINITION]
You are a [DOMAIN] assistant for a school management system.

[2. OUTPUT FORMAT]
IMPORTANT: Return ONLY a valid JSON object. No explanations, no markdown.

[3. AVAILABLE ACTIONS]
Available actions:
1. {{"action": "ACTION_NAME", "param1": "value1"}}
   Description: What this action does

2. {{"action": "ANOTHER_ACTION", "param2": 123}}
   Description: What this action does

[4. CONTEXT]
CONTEXT:
- Current date: {context.get('current_date')}
- Available schools:
  {schools_list}
- Valid statuses: {statuses_list}

[5. CRITICAL PRIORITY RULES]
CRITICAL PRIORITY RULES (check these FIRST):
- [Most important rules that override others]

[6. CONTEXT AWARENESS]
CONTEXT AWARENESS (use conversation history):
- [Rules for multi-turn conversations]

[7. DECISION RULES]
Regular rules:
- User says "X" → return {{"action": "Y"}}
- User says "A" → return {{"action": "B"}}

[8. REMINDER]
Remember: Output ONLY the JSON object, nothing else.
'''
```

---

### Section Breakdown

#### 1. Role Definition

**Purpose:** Set the LLM's "personality" and domain expertise

**Good:**
```
You are a friendly fee management assistant for a school management system.
Your job is to parse user requests and return a JSON action.
```

**Bad:**
```
You are an AI assistant.
```

**Why:** Specific roles help the LLM understand the context and generate appropriate responses.

---

#### 2. Output Format

**Purpose:** Enforce JSON-only responses

**Best Practice:**
```
IMPORTANT: Return ONLY a valid JSON object. No explanations, no markdown, no code blocks. Just raw JSON.
```

**Common mistakes LLMs make:**
- Adding ```json ... ``` wrappers
- Including explanatory text before/after JSON
- Using single quotes instead of double quotes
- Adding trailing commas

**Solution:** Repetition and explicit examples

---

#### 3. Available Actions

**Purpose:** Show all possible actions with concrete examples

**Template:**
```
1. ACTION_NAME - Short description
   Required: param1 (type), param2 (type)
   Optional: param3 (type)
   Example: {"action": "ACTION_NAME", "param1": "value1", "param2": 123}

2. ANOTHER_ACTION - Short description
   Required: paramX (type)
   Example: {"action": "ANOTHER_ACTION", "paramX": "value"}
```

**Tips:**
- Use realistic examples (not "foo", "bar")
- Show the exact JSON format
- Include parameter types (string, integer, array)
- Group related actions together

---

#### 4. Context

**Purpose:** Provide current state and available entities

**Best Practice:**
```python
# Dynamic context from database
schools_list = "\n".join([
    f"  - ID: {s['id']}, Name: {s['name']}"
    for s in context.get('schools', [])
])

prompt = f'''
CONTEXT:
- Current date: {date.today()}
- Available schools:
{schools_list}
- Valid statuses: Pending, Paid, Partial
'''
```

**Why:** LLMs can reference actual IDs and names from your system

---

#### 5. Critical Priority Rules

**Purpose:** Handle special cases that override normal logic

**Example:**
```
CRITICAL PRIORITY RULES (check these FIRST):
- If user said "show", "list", "view" in their ORIGINAL request, ALWAYS use GET_FEES even when selecting from a list - NEVER switch to CREATE_MONTHLY_FEES
- If user said "create", "add" in their ORIGINAL request, use CREATE_MONTHLY_FEES when selecting from a list
```

**Why:** Without this, LLMs get confused in multi-turn conversations:
```
User: "show fees for Mazen School"
Agent: "Which school? 1. Mazen School 2. Another School"
User: "1"
Agent: ❌ Switches to CREATE instead of staying in GET mode
```

---

#### 6. Context Awareness

**Purpose:** Enable multi-turn conversations with parameter carryover

**Example:**
```
CONTEXT AWARENESS (use conversation history):
- When Assistant previously showed fee records, you can reference those fee IDs directly
- If user says "update those", "delete them", "mark all as paid" after viewing fees, use the fee_ids, school_id, class, or month from the previous response
- Example: If Assistant said "Fee IDs: 123, 456" and user says "update those", use BULK_UPDATE_FEES with fee_ids=[123, 456]
- Parameters preserved across turns: month, school_id, school_name, class, fee_ids, status
```

**Why:** Users expect "update those" to work after "show pending fees"

---

#### 7. Decision Rules

**Purpose:** Map user intent to actions

**Best Practice: Use if-then format**

```
Regular rules:
- User greets (hi, hello, hey) → return CHAT with a friendly greeting
- User asks "what can you do" → return CHAT listing capabilities
- User says "create fees" without school → return CLARIFY asking which school
- User says "create fees for [school name]" → return CREATE_MONTHLY_FEES with that school_name
- User says "show pending fees" → return GET_FEES with status="Pending" and month (use current_month if not specified)
- User says "update fee for [student]" → return UPDATE_FEE with student_name
```

**Tips:**
- Order by frequency (most common first)
- Be specific about parameter handling
- Include default values (e.g., "use current_month if not specified")
- Cover edge cases (ambiguous input, missing parameters)

---

#### 8. Reminder

**Purpose:** Reinforce the JSON-only constraint

```
Remember: Output ONLY the JSON object, nothing else.
```

**Why:** LLMs have short attention spans; reminders help

---

## Decision Rule Design

### Pattern: Intent → Action → Parameters

**Structure:**
```
IF user intent THEN action WITH parameters
```

**Examples:**

**1. Simple Intent**
```
- User says "hello" → return {"action": "CHAT", "message": "Hello! How can I help?"}
```

**2. Intent with Entity**
```
- User says "show fees for [school]" → return {"action": "GET_FEES", "school_name": "[school]", "month": "current_month"}
```

**3. Intent with Multiple Parameters**
```
- User says "create fee for [student] for [month] with amount [X]" → return {"action": "CREATE_SINGLE_FEE", "student_name": "[student]", "month": "[month]", "total_fee": X}
```

---

### Handling Ambiguity

**Problem:** User input is unclear

**Solution: Use CLARIFY action**

```
Decision rules:
- User says "create fees" without school → return {"action": "CLARIFY", "message": "Which school?"}
- User says "update fee" without student or ID → return {"action": "CLARIFY", "message": "Which fee do you want to update?"}
```

---

### Handling Unknowns

**Problem:** User request is outside agent's scope

**Solution: Use UNSUPPORTED or CHAT**

```
Decision rules:
- User asks about weather → return {"action": "UNSUPPORTED", "message": "I can only help with fee management"}
- User asks unrelated question → return {"action": "CHAT", "message": "I'm a fee management assistant. I can help you create fees, update payments, and view reports."}
```

---

## Context Management

### Preserving Parameters Across Turns

**Scenario:**
```
User: "show pending fees for Mazen School for Jan-2026"
Agent: [Shows 5 fees with IDs 123, 456, 789, 101, 102]
User: "mark all as paid"
```

**Expected:** Agent should update those 5 fees

**How to enable this:**

**1. Include data in responses (Executor)**
```python
# In executor.py
return {
    "data": {
        "fee_ids": [123, 456, 789, 101, 102],
        "school_id": 1,
        "month": "Jan-2026",
        "status": "Pending"
    }
}
```

**2. Pass data in conversation history (Frontend)**
```javascript
// In FeeAgentChat.js
const buildConversationHistory = () => {
    return chatHistory.slice(-6).map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content,
        data: msg.data || null  // Include structured data
    }));
};
```

**3. Extract data in service (Backend)**
```python
# In service.py
def _merge_params_from_history(current, history, context):
    for msg in reversed(history):
        if msg.get('data') and 'fee_ids' in msg['data']:
            current['fee_ids'] = msg['data']['fee_ids']
    return current
```

**4. Teach LLM to use context (Prompt)**
```
CONTEXT AWARENESS:
- If user says "mark all as paid" after viewing fees, use fee_ids from the previous response
- Parameters preserved: month, school_id, class, fee_ids
```

---

### Including IDs in Message Text

**For small result sets (<= 10), include IDs in the message:**

```python
# In executor.py
if 0 < total_count <= 10:
    fee_ids = [str(f['id']) for f in fee_list]
    message += f"\nFee IDs: {', '.join(fee_ids)}"
```

**Why:** LLM can extract IDs directly from text if data is unavailable

**Prompt rule:**
```
- If Assistant message contains "Fee IDs: 123, 456", you can reference those IDs in follow-up actions
```

---

## Error Handling

### Validation Errors

**Prompt pattern:**
```
- If user provides invalid data (e.g., negative amount, invalid date), return {"action": "CLARIFY", "message": "Error description and what is expected"}
```

**Example:**
```
User: "create fee for Ali with amount -5000"
→ {"action": "CLARIFY", "message": "Fee amount must be positive. Please provide a valid amount."}
```

---

### Missing Required Parameters

**Prompt pattern:**
```
- If user command is missing required info, return CLARIFY asking for the specific missing parameter
```

**Example:**
```
User: "create fee"
→ {"action": "CLARIFY", "message": "Which student do you want to create a fee for?"}
```

---

### Ambiguous Input

**Prompt pattern:**
```
- If user input matches multiple entities (e.g., two students named "Ali"), the resolver will return a numbered list - you should return CLARIFY with that list
```

**Example:**
```
User: "create fee for Ali"
Resolver: Multiple "Ali" matches found
→ {"action": "CLARIFY", "message": "Multiple students found:\n1. Ali Khan (Class 10A)\n2. Ali Ahmed (Class 9B)\nPlease select a number."}
```

---

### Graceful Degradation

**Prompt pattern:**
```
- If you're unsure about user intent, respond with CHAT suggesting they rephrase or use specific keywords
```

**Example:**
```
User: "do the thing"
→ {"action": "CHAT", "message": "I'm not sure what you mean. I can help you: create fees, update payments, view pending fees, or get fee summaries. What would you like to do?"}
```

---

## Testing Prompts

### Test Coverage

**1. Basic Actions**
- [ ] Each action can be triggered with correct parameters
- [ ] Actions return valid JSON

**2. Variations**
- [ ] Different phrasings for same intent work
- [ ] "show", "list", "view", "display" all work for queries
- [ ] "create", "add", "generate" all work for creation

**3. Edge Cases**
- [ ] Missing parameters trigger CLARIFY
- [ ] Invalid data triggers error message
- [ ] Ambiguous input shows numbered list
- [ ] Out-of-scope requests return CHAT or UNSUPPORTED

**4. Multi-turn**
- [ ] Clarification responses work (selecting from numbered list)
- [ ] Context carries forward (month, school, IDs)
- [ ] "update those" works after "show pending"

**5. Negative Cases**
- [ ] Nonsense input doesn't crash
- [ ] Adversarial input doesn't bypass constraints
- [ ] SQL injection attempts are rejected (handled by ORM)

---

### Prompt Iteration Process

**1. Start Simple**
```
You are a fee assistant. Return JSON only.

Actions:
1. {"action": "GET_FEES"}
2. {"action": "CREATE_MONTHLY_FEES", "school_id": 1}

Rules:
- "show fees" → GET_FEES
- "create fees for school 1" → CREATE_MONTHLY_FEES
```

**2. Test Basic Cases**
```
✅ "show fees" → GET_FEES
✅ "create fees for school 1" → CREATE_MONTHLY_FEES
❌ "show pending fees" → GET_FEES (missing status parameter)
```

**3. Add Specificity**
```
Rules:
- "show fees" → GET_FEES with month (use current_month)
- "show pending fees" → GET_FEES with status="Pending", month (use current_month)
- "create fees for school 1" → CREATE_MONTHLY_FEES with school_id=1
```

**4. Test Again**
```
✅ "show pending fees" → GET_FEES with status="Pending"
❌ "show fees for Mazen School" → Error (can't resolve "Mazen School" to ID)
```

**5. Add Context**
```
CONTEXT:
- Available schools:
  - ID: 1, Name: Mazen School
  - ID: 2, Name: Smart School

Rules:
- "show fees for [school name]" → GET_FEES with school_name="[school]", month
```

**6. Test Edge Cases**
```
✅ "show fees for Mazen School" → GET_FEES with school_name="Mazen School"
❌ User: "show fees for Mazen" → Agent: "1" (selects school, but wrong action)
```

**7. Add Priority Rules**
```
CRITICAL PRIORITY RULES:
- If user said "show" in ORIGINAL request, ALWAYS use GET_FEES even when selecting from list
```

**8. Final Test**
```
✅ User: "show fees for Mazen" → Clarify: Which school?
✅ User: "1" → GET_FEES (not CREATE_MONTHLY_FEES!)
```

---

## Common Patterns

### 1. Numbered List Selection

**Scenario:** User selects from a numbered list

**Pattern:**
```
CRITICAL PRIORITY RULES:
- If previous message was "show/list/view", selecting a number should continue with GET_FEES
- If previous message was "create fees" clarification, selecting a number uses CREATE_MONTHLY_FEES

Regular rules:
- User provides NUMBER as answer to CREATE_MONTHLY_FEES clarification → use that number as school_name or school selection
- CRITICAL: If previous message was "show/list/view", selecting a number should continue with GET_FEES, NOT CREATE_MONTHLY_FEES
```

---

### 2. Bulk Operations

**Scenario:** User wants to update multiple records

**Pattern:**
```
Rules:
- User says "mark all as paid" or "update all fees" after viewing results → use BULK_UPDATE_FEES with parameters from previous response (fee_ids, school_id, month, class)
- User says "mark all fees for [school] as paid" → use BULK_UPDATE_FEES with school_name, month (current if not specified), paid_amount="full"
- User says "update all fees for class [X]" → use BULK_UPDATE_FEES with class, month, paid_amount
```

---

### 3. Default Values

**Scenario:** User omits optional parameters

**Pattern:**
```
Rules:
- If user doesn't specify month, use current_month
- If user doesn't specify paid_amount for payment, ask for it with CLARIFY
- If user says "full" or "fully paid", set paid_amount="full" (not a number)
- If user says "balance" or "remaining", set paid_amount="balance"
```

---

### 4. Conversational Responses

**Scenario:** User greets or asks for help

**Pattern:**
```
Rules:
- User greets (hi, hello, hey) → CHAT with friendly greeting and brief capabilities intro
- User asks "what can you do" or "help" → CHAT listing all capabilities
- User says "thank you" → CHAT with acknowledgment
- User asks "who are you" → CHAT explaining role
```

**Why:** Makes the agent feel friendly and helpful

---

## Troubleshooting

### Problem: LLM Returns Markdown Code Blocks

**Symptom:**
```json
```json
{"action": "GET_FEES"}
```
```

**Solution:**
- Add to prompt: "IMPORTANT: No markdown, no code blocks. Just raw JSON."
- Repeat at end: "Remember: Output ONLY the JSON object, nothing else."
- Use lower temperature (0.0 - 0.2)

---

### Problem: LLM Adds Explanations

**Symptom:**
```
I'll help you view fees. Here's the action:
{"action": "GET_FEES"}
```

**Solution:**
- Emphasize: "Return ONLY a valid JSON object. No explanations."
- Show examples without explanations
- Use instruction-tuned models (llama3-instruct, gpt-4)

---

### Problem: Context Not Preserved

**Symptom:**
```
User: "show fees for Mazen School"
Agent: [Shows fees]
User: "mark all as paid"
Agent: ❌ "Which fees do you want to update?"
```

**Solution:**
1. Include data in responses (executor)
2. Pass data in conversation history (frontend)
3. Extract data in _merge_params_from_history (service)
4. Add context awareness rules to prompt

---

### Problem: Wrong Action Selected

**Symptom:**
```
User: "show fees for school 1"
Agent: ❌ Returns CREATE_MONTHLY_FEES instead of GET_FEES
```

**Solution:**
- Add to CRITICAL PRIORITY RULES: "If user says 'show', 'list', 'view' → use GET_FEES"
- Order rules by priority (most specific first)
- Test with variations

---

### Problem: Ambiguous Input Not Clarified

**Symptom:**
```
User: "create fee for Ali"
Agent: ❌ Picks first "Ali" without asking
```

**Solution:**
- Resolver should return CLARIFY for matches < 0.85 confidence
- Prompt should trust resolver's CLARIFY action
- Don't override clarifications in decision rules

---

### Problem: Parameters Missing

**Symptom:**
```
User: "show fees"
Agent: Returns GET_FEES without month parameter
Backend: ❌ "Month is required"
```

**Solution:**
- Add to prompt: "GET_FEES always requires month parameter (use current_month if user doesn't specify)"
- Update decision rules: "show fees" → GET_FEES with month (use current_month)

---

## Advanced Techniques

### 1. Few-Shot Learning

**Concept:** Provide examples in the prompt

```
Examples:
User: "show pending fees for Mazen School for Jan-2026"
→ {"action": "GET_FEES", "school_name": "Mazen School", "status": "Pending", "month": "Jan-2026"}

User: "create fees for Smart School this month"
→ {"action": "CREATE_MONTHLY_FEES", "school_name": "Smart School", "month": "Jan-2026"}

User: "mark fee 123 as paid with 5000"
→ {"action": "UPDATE_FEE", "fee_id": 123, "paid_amount": 5000}
```

**Why:** Shows exact expected format

---

### 2. Chain-of-Thought (Reasoning)

**Concept:** Make LLM explain its reasoning

```
Before outputting JSON, think through:
1. What is the user trying to do? (intent)
2. Which action matches that intent?
3. What parameters do I have?
4. What parameters am I missing?
5. Should I ask for clarification?

Then output ONLY the JSON.
```

**Why:** Improves accuracy for complex queries

**Note:** Only works with larger models (70B+), not practical for production

---

### 3. Constraint Satisfaction

**Concept:** Define what's NOT allowed

```
CONSTRAINTS:
- NEVER create fees without a school_id or school_name
- NEVER update fees without a fee_id or student_name
- NEVER use DELETE actions without confirmation
- NEVER assume month - always include it in GET_FEES
```

**Why:** Prevents common errors

---

### 4. Prompt Chaining

**Concept:** Use multiple prompts in sequence

**Example:**
1. Intent Detection Prompt → Identifies action
2. Parameter Extraction Prompt → Extracts entities
3. Validation Prompt → Checks completeness

**Why:** More accurate but slower (multiple LLM calls)

**When to use:** For complex, high-stakes operations

---

## Model Selection

### Recommended Models

**Production (Cloud):**
- Groq: llama3-8b-8192 (fast, cheap)
- OpenAI: gpt-3.5-turbo (accurate, expensive)
- Anthropic: claude-3-haiku (balanced)

**Development (Local):**
- Ollama: llama3 (free, good quality)
- Ollama: phi3:mini (very fast, smaller)

---

### Temperature Settings

**For JSON extraction:**
- Temperature: 0.0 - 0.2 (deterministic)
- Top-p: 0.9 (focused)

**Why:** Low temperature reduces variability, ensuring consistent JSON format

---

## Resources

### Prompt Engineering Guides
- [OpenAI Prompt Engineering Guide](https://platform.openai.com/docs/guides/prompt-engineering)
- [Anthropic Prompt Library](https://docs.anthropic.com/claude/prompt-library)
- [LangChain Prompting](https://python.langchain.com/docs/modules/model_io/prompts/)

### Testing Tools
- [JSONLint](https://jsonlint.com/) - Validate JSON
- [Regex101](https://regex101.com/) - Test regex patterns
- Ollama Web UI - Test prompts locally

---

## Summary Checklist

When writing a new agent prompt:

- [ ] Define role clearly
- [ ] Enforce JSON-only output (repeat multiple times)
- [ ] List all actions with concrete examples
- [ ] Provide current context (schools, dates, entities)
- [ ] Add CRITICAL PRIORITY RULES for edge cases
- [ ] Include CONTEXT AWARENESS for multi-turn support
- [ ] Write decision rules in if-then format
- [ ] Handle ambiguity with CLARIFY
- [ ] Handle unknowns with CHAT or UNSUPPORTED
- [ ] Test with realistic queries
- [ ] Test multi-turn conversations
- [ ] Test edge cases (missing params, invalid data)
- [ ] Iterate based on failures

---

**Remember:** Prompts are code. Version control them, test them, and refine them iteratively!

For implementation details, see:
- [AI_AGENT_ARCHITECTURE.md](./AI_AGENT_ARCHITECTURE.md)
- [AI_AGENT_IMPLEMENTATION.md](./AI_AGENT_IMPLEMENTATION.md)
