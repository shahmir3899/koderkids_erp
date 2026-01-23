# AI Agent Documentation

**School Management System - AI Agent Framework**

Version 1.0 | Last Updated: January 2026

---

## Overview

This documentation suite provides comprehensive guidance for understanding, building, and maintaining AI agents in the School Management System. AI agents enable users to interact with complex backend operations through natural language instead of traditional forms.

---

## Documentation Structure

### 1. [AI Agent Architecture](./AI_AGENT_ARCHITECTURE.md) 📐
**Read this first to understand the system**

Comprehensive overview of the AI agent architecture including:
- System components and their responsibilities
- Data flow diagrams
- Core design patterns
- Technology stack
- Security and permissions model
- Performance optimizations

**Best for:**
- New developers joining the project
- Understanding how the system works
- Debugging issues
- Making architectural decisions

---

### 2. [AI Agent Implementation Guide](./AI_AGENT_IMPLEMENTATION.md) 🛠️
**Step-by-step guide to building new agents**

Practical guide for creating new AI agents from scratch:
- Planning your agent (scope, actions, permissions)
- Backend implementation (actions, prompts, resolvers, executors)
- Frontend implementation (chat UI, context builders)
- Testing strategies
- Deployment checklist
- Complete example: Building an Inventory Agent

**Best for:**
- Implementing new agents (Inventory, HR, Broadcast)
- Adding new actions to existing agents
- Understanding the development workflow
- Following best practices

---

### 3. [Prompt Engineering Best Practices](./AI_PROMPT_ENGINEERING.md) ✍️
**Advanced guide to writing effective prompts**

Deep dive into prompt engineering techniques:
- Prompt fundamentals and structure
- Decision rule design patterns
- Context management and multi-turn conversations
- Error handling strategies
- Testing and iteration process
- Troubleshooting common issues
- Model selection and temperature settings

**Best for:**
- Writing effective system prompts
- Debugging LLM behavior
- Improving intent recognition accuracy
- Handling edge cases
- Optimizing for specific models

---

## Quick Start

### For New Developers

1. **Understand the System**
   - Read [AI_AGENT_ARCHITECTURE.md](./AI_AGENT_ARCHITECTURE.md) sections 1-2 (Overview, Components)
   - Review the data flow diagrams
   - Explore the existing Fee Agent code

2. **Try the Agent**
   ```bash
   # Backend
   cd backend
   python manage.py runserver

   # Frontend
   cd frontend
   npm start

   # Test in browser
   Navigate to Fees page → Open AI Chat
   Try: "show pending fees", "create fees for Smart School"
   ```

3. **Plan Your First Agent**
   - Read [AI_AGENT_IMPLEMENTATION.md](./AI_AGENT_IMPLEMENTATION.md) section 2 (Planning)
   - List actions, entities, and permissions
   - Design your prompts

4. **Implement Step-by-Step**
   - Follow [AI_AGENT_IMPLEMENTATION.md](./AI_AGENT_IMPLEMENTATION.md) section 3
   - Start with READ actions (simpler)
   - Add WRITE actions later
   - Test thoroughly

---

### For Prompt Engineers

1. **Learn the Basics**
   - Read [AI_PROMPT_ENGINEERING.md](./AI_PROMPT_ENGINEERING.md) sections 1-2
   - Understand system prompt structure
   - Review existing Fee Agent prompt

2. **Test Prompts Iteratively**
   ```python
   # In backend/ai/prompts.py
   def get_your_agent_prompt(context):
       return '''Your prompt here...'''

   # Test with ollama locally
   ollama pull llama3
   # Modify prompt, test, refine, repeat
   ```

3. **Handle Edge Cases**
   - Read section 5 (Error Handling)
   - Add CRITICAL PRIORITY RULES
   - Test multi-turn conversations

---

## Common Workflows

### Adding a New Action to Existing Agent

1. **Define Action** (`backend/ai/actions.py`)
   ```python
   "NEW_ACTION": ActionDefinition(
       name="NEW_ACTION",
       action_type=ActionType.WRITE,
       required_params=["param1"],
       optional_params=["param2"],
       handler="new_action_handler",
       requires_confirmation=True
   )
   ```

2. **Update Prompt** (`backend/ai/prompts.py`)
   ```python
   # Add to available actions list
   25. {{"action":"NEW_ACTION","param1":"value"}}

   # Add decision rule
   - User says "do new thing" → return NEW_ACTION with param1
   ```

3. **Add Resolver** (`backend/ai/resolver.py`)
   ```python
   def _resolve_new_action(self, params):
       # Validate and gather preview data
       return {"status": "success"}
   ```

4. **Add Executor** (`backend/ai/executor.py`)
   ```python
   def _execute_new_action(self, params):
       # Execute the action
       return {"success": True, "message": "...", "data": {...}}
   ```

5. **Test**
   - Manual testing with natural language
   - Unit tests
   - Multi-turn conversation tests

---

### Debugging LLM Behavior

1. **Check Audit Log**
   ```python
   from ai.models import AIAuditLog

   # Recent interactions
   logs = AIAuditLog.objects.filter(user=user).order_by('-created_at')[:10]

   for log in logs:
       print(f"User: {log.message}")
       print(f"LLM: {log.llm_response_raw}")
       print(f"Parsed: {log.llm_response_parsed}")
       print(f"Result: {log.action_result}")
   ```

2. **Check Frontend Console**
   ```javascript
   // In browser console after sending message
   // Look for: "AI Result:", "AI Debug Error:"
   ```

3. **Test Prompt Locally**
   ```bash
   # Use ollama to test prompts
   ollama run llama3
   >>> [Paste your system prompt]
   >>> User message: "show pending fees"
   >>> [Check JSON output]
   ```

4. **Iterate Prompt**
   - Add CRITICAL PRIORITY RULES for edge cases
   - Add more specific decision rules
   - Provide more examples
   - Test again

---

### Building a New Agent from Scratch

**Follow this sequence:**

1. **Planning Phase**
   - [ ] Read [AI_AGENT_IMPLEMENTATION.md](./AI_AGENT_IMPLEMENTATION.md) Section 2
   - [ ] List all actions (READ and WRITE)
   - [ ] Define required/optional parameters
   - [ ] Plan permission model
   - [ ] Design system prompt

2. **Backend Implementation**
   - [ ] Define actions in `actions.py`
   - [ ] Create prompt function in `prompts.py`
   - [ ] Add resolver methods in `resolver.py`
   - [ ] Add executor methods in `executor.py`
   - [ ] Create API endpoints (if needed) in `views.py`
   - [ ] Add confirmation details in `service.py`

3. **Frontend Implementation**
   - [ ] Create context builder in `aiService.js`
   - [ ] Add or adapt chat component
   - [ ] Create quick action templates
   - [ ] Add example prompts

4. **Testing**
   - [ ] Manual testing (basic actions)
   - [ ] Manual testing (edge cases)
   - [ ] Manual testing (multi-turn)
   - [ ] Unit tests
   - [ ] Permission tests

5. **Deployment**
   - [ ] Code review
   - [ ] Update documentation
   - [ ] Deploy to staging
   - [ ] User acceptance testing
   - [ ] Deploy to production

---

## Examples

### Example 1: Simple Query

**User Input:**
```
"show pending fees for Mazen School for Jan-2026"
```

**LLM Output:**
```json
{
  "action": "GET_FEES",
  "school_name": "Mazen School",
  "status": "Pending",
  "month": "Jan-2026"
}
```

**Resolver:**
- Fuzzy matches "Mazen School" → school_id: 1

**Executor:**
- Queries fees with filters
- Returns: "Found 5 fee records | Total: PKR 25,000"

**Frontend:**
- Displays results in table
- Stores fee_ids=[123,456,789,101,102] in chatHistory data

---

### Example 2: Multi-Turn Conversation

**Turn 1:**
```
User: "show pending fees for Mazen School"
Agent: "Found 5 fee records | Total: PKR 25,000
       Fee IDs: 123, 456, 789, 101, 102"
```

**Turn 2:**
```
User: "mark all as paid"
Agent (context aware):
  - Extracts fee_ids=[123,456,789,101,102] from history
  - Action: BULK_UPDATE_FEES
  - Shows confirmation: "Update 5 fee records for Mazen School?"
```

**Turn 3:**
```
User: Clicks "Confirm"
Agent: "✅ Updated 5 fee records"
```

---

### Example 3: Clarification Flow

**Turn 1:**
```
User: "create fee for Ali"
Resolver: Multiple students match "Ali" (confidence < 0.85)
Agent: "Multiple students found:
       1. Ali Khan (Class 10A)
       2. Ali Ahmed (Class 9B)
       Please select a number."
```

**Turn 2:**
```
User: "1"
Service: Recognizes numeric input, resolves to Ali Khan
Agent: "✅ Fee record created for Ali Khan"
```

---

## Technology Reference

### LLM Models

**Groq (Production):**
- Model: llama3-8b-8192
- Speed: ~200 tokens/sec
- Cost: Free tier available

**Ollama (Development):**
- Model: llama3 or phi3:mini
- Speed: Depends on hardware
- Cost: Free (local)

### Configuration

```python
# backend/ai/llm.py
LLM_CONFIG = {
    'provider': 'groq',  # or 'ollama'
    'model': 'llama3-8b-8192',
    'temperature': 0.1,  # Low for consistent JSON
    'max_tokens': 200    # Short for JSON responses
}
```

---

## Troubleshooting

### Issue: "AI service temporarily unavailable"

**Cause:** LLM provider is down or misconfigured

**Solutions:**
1. Check API key: `echo $GROQ_API_KEY`
2. Check Ollama: `curl http://localhost:11434/api/tags`
3. Check backend logs for errors
4. Fallback: Use quick action templates

---

### Issue: "LLM returns markdown code blocks"

**Cause:** LLM adds ```json...``` wrappers

**Solutions:**
1. Update prompt: "No markdown, no code blocks"
2. Lower temperature to 0.0
3. Add reminder at end of prompt
4. Use instruction-tuned model

---

### Issue: "Context not preserved in multi-turn"

**Cause:** Missing data in conversation history

**Solutions:**
1. Check executor includes data in response
2. Check frontend passes data in buildConversationHistory()
3. Check service _merge_params_from_history() extracts data
4. Add context awareness rules to prompt

---

### Issue: "Wrong action selected"

**Cause:** Prompt rules are ambiguous or conflicting

**Solutions:**
1. Add CRITICAL PRIORITY RULES
2. Make rules more specific
3. Test with variations
4. Check rule order (most specific first)

---

## Performance Tips

1. **Database Aggregation**
   - Use `.aggregate()` instead of loading all records into memory
   - Example: `fees.aggregate(total=Sum('total_fee'))`

2. **Conversation History Limit**
   - Keep only last 6 messages (3 exchanges)
   - Reduces LLM context size, faster inference

3. **Response Truncation**
   - Display first 50 records only
   - Calculate aggregates on ALL records
   - Return `truncated: true` flag

4. **Caching**
   - Cache school/student lists in context
   - Avoid database queries in prompt generation

---

## Security Checklist

- [ ] All API endpoints check authentication
- [ ] Teachers can only access assigned schools
- [ ] Destructive operations require confirmation
- [ ] SQL injection prevented (using ORM)
- [ ] All interactions logged in AIAuditLog
- [ ] Confirmation tokens are single-use
- [ ] User input is validated before execution

---

## Contributing

When adding new features or agents:

1. **Follow the guides** in this documentation
2. **Test thoroughly** (manual + automated)
3. **Update documentation** if patterns change
4. **Add examples** to help future developers
5. **Review prompts** for accuracy and clarity

---

## Support

- **Documentation Issues:** Report in GitHub Issues
- **Bug Reports:** Include audit log ID and conversation transcript
- **Feature Requests:** Describe use case and expected behavior

---

## Version History

- **v1.0** (January 2026): Initial documentation
  - AI Agent Architecture guide
  - Implementation guide with Inventory Agent example
  - Prompt Engineering best practices
  - Multi-turn conversation support
  - Context preservation patterns

---

## Next Steps

**For your next session:**

1. **Understand the system:**
   - Read [AI_AGENT_ARCHITECTURE.md](./AI_AGENT_ARCHITECTURE.md)

2. **Build your first agent:**
   - Follow [AI_AGENT_IMPLEMENTATION.md](./AI_AGENT_IMPLEMENTATION.md)
   - Start with Inventory Agent (good first project)

3. **Master prompts:**
   - Study [AI_PROMPT_ENGINEERING.md](./AI_PROMPT_ENGINEERING.md)
   - Experiment with prompt variations

4. **Test the improvements:**
   - Try: "show pending fees for Mazen School"
   - Then: "mark all as paid"
   - Verify context is preserved

---

**Happy building! 🚀**

If you have questions, refer to these guides or check the existing Fee Agent implementation in the codebase.
