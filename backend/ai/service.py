"""
AI Agent Service
================
Main service that orchestrates LLM calls and action execution.
"""

import time
import secrets
from typing import Dict, Any, Optional
from django.conf import settings

from .llm_client import get_llm_client
from .prompts import get_agent_prompt
from .actions import (
    get_action_definition,
    validate_action_params,
    is_delete_action,
    AGENT_ACTIONS
)
from .models import AIAuditLog
from .resolver import get_resolver


class AIAgentService:
    """
    Main service for AI agent operations.

    Usage:
        service = AIAgentService(user)
        result = service.process_message("create fees for main school", "fee", context)
    """

    def __init__(self, user):
        self.user = user
        self.llm = get_llm_client()

    def is_available(self) -> bool:
        """Check if AI service is available (any LLM provider)."""
        return self.llm.get_available_provider() is not None

    def _filter_context_by_user_access(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Filter context data (schools, students) by user's role-based access.
        - Admin: Access to all schools
        - Teacher: Access only to assigned schools
        - Student: No AI agent access (should be blocked at view level)
        """
        import logging
        logger = logging.getLogger(__name__)

        if not self.user or not self.user.is_authenticated:
            return context

        # Admin has full access
        if self.user.role == 'Admin':
            logger.info(f"Admin user {self.user.username} - full access to all schools")
            return context

        # Teacher: filter by assigned_schools
        if self.user.role == 'Teacher':
            assigned_school_ids = list(self.user.assigned_schools.values_list('id', flat=True))
            logger.info(f"Teacher {self.user.username} - filtering to assigned schools: {assigned_school_ids}")

            # Filter schools in context
            if 'schools' in context and isinstance(context['schools'], list):
                original_count = len(context['schools'])
                context['schools'] = [
                    s for s in context['schools']
                    if s.get('id') in assigned_school_ids
                ]
                logger.info(f"Filtered schools: {original_count} → {len(context['schools'])}")

            # Filter students in context
            if 'students' in context and isinstance(context['students'], list):
                original_count = len(context['students'])
                context['students'] = [
                    s for s in context['students']
                    if s.get('school_id') in assigned_school_ids or s.get('school', {}).get('id') in assigned_school_ids
                ]
                logger.info(f"Filtered students: {original_count} → {len(context['students'])}")

            # Store accessible school IDs in context for resolver/executor
            context['_accessible_school_ids'] = assigned_school_ids

        return context

    def process_message(
        self,
        message: str,
        agent: str,
        context: Dict[str, Any],
        conversation_history: list = None
    ) -> Dict[str, Any]:
        """
        Process a natural language message and execute the appropriate action.

        Args:
            message: User's natural language input
            agent: Agent type ("fee", "inventory", "hr", "broadcast")
            context: Context data (schools, categories, etc.)
            conversation_history: List of previous messages for multi-turn conversation

        Returns:
            {
                "success": bool,
                "needs_confirmation": bool,
                "confirmation_token": str (if needs_confirmation),
                "action": str,
                "message": str,
                "data": dict,
                "audit_log_id": int
            }
        """
        start_time = time.time()

        # Filter context by user's accessible schools (role-based access)
        context = self._filter_context_by_user_access(context)

        # Create audit log
        audit_log = AIAuditLog.create_log(
            user=self.user,
            agent=agent,
            message=message,
            context=context
        )

        try:
            # Step 0: Quick bypass for numbered selections (e.g., user types "4" or "4." to select from list)
            # This avoids slow LLM call for simple number responses
            # Strip common punctuation from number input (e.g., "4.", "4,", "4)")
            clean_message = message.strip().rstrip('.,):]')
            if clean_message.isdigit() and conversation_history:
                # Check if previous message was asking for school selection
                last_assistant_msg = None
                for msg in reversed(conversation_history):
                    if msg.get('role') == 'assistant':
                        last_assistant_msg = msg.get('content', '')
                        break

                if last_assistant_msg and ('select' in last_assistant_msg.lower() or 'which school' in last_assistant_msg.lower() or 'Reply with the number' in last_assistant_msg):
                    # User is selecting from a numbered list - bypass LLM
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.info(f"Bypassing LLM for numbered selection: {clean_message}")

                    # Extract month from history and build action directly
                    parsed = {
                        'action': 'CREATE_MONTHLY_FEES',
                        'school_name': clean_message  # The resolver will handle number → school_id
                    }
                    # Merge params from history (to get month)
                    parsed = self._merge_params_from_history(parsed, conversation_history, context)

                    # Skip to parameter resolution (Step 5)
                    action_name = parsed.get('action')
                    action_def = get_action_definition(agent, action_name)

                    if action_def:
                        params = {k: v for k, v in parsed.items() if k != 'action'}
                        resolver = get_resolver(context)
                        resolution = resolver.resolve(action_name, params)

                        if resolution['success']:
                            params = resolution.get('params', params)
                            validation = validate_action_params(action_def, params)

                            if validation['valid']:
                                result = self._execute_action(agent, action_def, params)
                                audit_log.log_action_execution(
                                    action_name=action_name,
                                    params=params,
                                    result=result.get('data', {}),
                                    status='success' if result['success'] else 'failed'
                                )
                                return {
                                    "success": result['success'],
                                    "needs_confirmation": False,
                                    "action": action_name,
                                    "message": result.get('message', 'Action completed'),
                                    "data": result.get('data'),
                                    "audit_log_id": audit_log.id
                                }
                        else:
                            # Resolution failed (e.g., invalid number)
                            return {
                                "success": True,
                                "needs_confirmation": False,
                                "action": "CLARIFY",
                                "message": resolution.get('clarify', 'Please select a valid number.'),
                                "data": None,
                                "audit_log_id": audit_log.id
                            }

            # Step 1: Get system prompt
            system_prompt = get_agent_prompt(agent, context)

            # Step 2: Build full prompt with conversation history
            full_prompt = message
            if conversation_history and len(conversation_history) > 0:
                # Include conversation history for context - make it very clear
                history_lines = []
                for msg in conversation_history[-6:]:  # Last 3 exchanges
                    role = 'User' if msg.get('role') == 'user' else 'Assistant'
                    content = msg.get('content', '')
                    history_lines.append(f"{role}: {content}")

                history_text = "\n".join(history_lines)
                full_prompt = f"""Previous conversation:
{history_text}

IMPORTANT: The user's current message "{message}" is likely a RESPONSE to the last Assistant question above.
If the Assistant asked "which school?" and user says a school name, use CREATE_MONTHLY_FEES with that school_name.
If the Assistant asked for clarification, complete the ORIGINAL action with the provided info.

Current user message: {message}"""

            # Step 3: Call LLM (Ollama or Groq, whichever is available)
            llm_result = self.llm.generate_sync(
                prompt=full_prompt,
                system_prompt=system_prompt,
                max_tokens=200  # JSON responses are short
            )

            # Log LLM response
            audit_log.log_llm_response(
                raw_response=llm_result.get('response'),
                parsed_response=llm_result.get('parsed'),
                response_time_ms=llm_result.get('response_time_ms', 0)
            )

            # Check if LLM call failed
            if not llm_result['success']:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"LLM call failed: {llm_result.get('error')}")
                logger.error(f"LLM raw response: {llm_result.get('response')}")

                audit_log.log_action_execution(
                    action_name=None,
                    params={},
                    result={},
                    status='failed',
                    error=llm_result.get('error', 'LLM call failed')
                )
                return {
                    "success": False,
                    "needs_confirmation": False,
                    "message": "AI service temporarily unavailable. Please use quick actions.",
                    "data": None,
                    "audit_log_id": audit_log.id,
                    "fallback_to_templates": True,
                    "debug_error": llm_result.get('error')  # Include error for debugging
                }

            # Step 3: Parse LLM response
            parsed = llm_result.get('parsed')
            if not parsed or 'action' not in parsed:
                audit_log.log_action_execution(
                    action_name=None,
                    params={},
                    result={},
                    status='failed',
                    error='Could not parse LLM response'
                )
                return {
                    "success": False,
                    "needs_confirmation": False,
                    "message": "I couldn't understand that. Please try rephrasing or use quick actions.",
                    "data": {"raw_response": llm_result.get('response')},
                    "audit_log_id": audit_log.id
                }

            action_name = parsed.get('action')

            # Step 3a: Normalize action names - LLM sometimes returns variations
            action_name_mapping = {
                'CREATE_FEE': 'CREATE_MONTHLY_FEES',
                'CREATE_FEES': 'CREATE_MONTHLY_FEES',
                'CREATE_FEE_RECORD': 'CREATE_MONTHLY_FEES',
                'CREATE_SCHOOL_FEES': 'CREATE_MONTHLY_FEES',
                'CREATE_ALL_FEES': 'CREATE_FEES_ALL_SCHOOLS',
                'GET_PENDING_FEES': 'GET_FEES',
                'GET_PENDING': 'GET_FEES',
                'FEE_SUMMARY': 'GET_FEE_SUMMARY',
                'SUMMARY': 'GET_FEE_SUMMARY',
                # New gap-filling actions
                'SCHOOLS_WITHOUT_FEES': 'GET_SCHOOLS_WITHOUT_FEES',
                'GET_MISSING_FEES': 'GET_SCHOOLS_WITHOUT_FEES',
                'FIND_MISSING_FEES': 'GET_SCHOOLS_WITHOUT_FEES',
                'CHECK_MISSING_FEES': 'GET_SCHOOLS_WITHOUT_FEES',
                'CREATE_FEES_FOR_MISSING': 'CREATE_MISSING_FEES',
                'FILL_MISSING_FEES': 'CREATE_MISSING_FEES',
                'CREATE_GAP_FEES': 'CREATE_MISSING_FEES',
                # Recovery report variations
                'RECOVERY_REPORT': 'GET_RECOVERY_REPORT',
                'RECOVERY_RATE': 'GET_RECOVERY_REPORT',
                'COLLECTION_REPORT': 'GET_RECOVERY_REPORT',
                'COLLECTION_STATUS': 'GET_RECOVERY_REPORT',
                'FEE_COLLECTION_REPORT': 'GET_RECOVERY_REPORT',
                # Multiple schools fee creation variations
                'CREATE_MULTIPLE_FEES': 'CREATE_FEES_MULTIPLE_SCHOOLS',
                'CREATE_FEES_FOR_SCHOOLS': 'CREATE_FEES_MULTIPLE_SCHOOLS',
                'CREATE_FOR_MULTIPLE_SCHOOLS': 'CREATE_FEES_MULTIPLE_SCHOOLS',
                'CREATE_FEES_SCHOOLS': 'CREATE_FEES_MULTIPLE_SCHOOLS',
                'CREATE_FOR_SCHOOLS': 'CREATE_FEES_MULTIPLE_SCHOOLS',
                'FEES_FOR_MULTIPLE': 'CREATE_FEES_MULTIPLE_SCHOOLS',
                'MULTIPLE_SCHOOL_FEES': 'CREATE_FEES_MULTIPLE_SCHOOLS',
                # Fee update variations
                'RECORD_PAYMENT': 'UPDATE_FEE',
                'UPDATE_PAYMENT': 'UPDATE_FEE',
                'MARK_PAID': 'UPDATE_FEE',
                'MARK_FEE_PAID': 'UPDATE_FEE',
                'PAY_FEE': 'UPDATE_FEE',
                'FEE_PAYMENT': 'UPDATE_FEE',
                'ADD_PAYMENT': 'UPDATE_FEE',
                # Single fee creation variations
                'CREATE_STUDENT_FEE': 'CREATE_SINGLE_FEE',
                'ADD_STUDENT_FEE': 'CREATE_SINGLE_FEE',
                'SINGLE_STUDENT_FEE': 'CREATE_SINGLE_FEE',
                'ADD_FEE': 'CREATE_SINGLE_FEE',
                'NEW_FEE': 'CREATE_SINGLE_FEE',
                # Delete fee variations
                'DELETE_FEE': 'DELETE_FEES',
                'REMOVE_FEE': 'DELETE_FEES',
                'REMOVE_FEES': 'DELETE_FEES',
                # Bulk update variations
                'BULK_PAYMENT': 'BULK_UPDATE_FEES',
                'BATCH_UPDATE_FEES': 'BULK_UPDATE_FEES',
                'UPDATE_MULTIPLE_FEES': 'BULK_UPDATE_FEES',
                'MASS_UPDATE_FEES': 'BULK_UPDATE_FEES',
                'UPDATE_ALL_FEES': 'BULK_UPDATE_FEES',
                'PAY_ALL_FEES': 'BULK_UPDATE_FEES',
            }
            if action_name in action_name_mapping:
                action_name = action_name_mapping[action_name]
                parsed['action'] = action_name

            # Step 3b: Post-process LLM response - fix common phi3:mini issues
            # If LLM returned CREATE_MONTHLY_FEES without a valid school_name, force CLARIFY
            if action_name == 'CREATE_MONTHLY_FEES':
                school_name = parsed.get('school_name', '')
                school_id = parsed.get('school_id')
                # Check if school_name is empty, placeholder, or invalid
                invalid_names = ['', 'x', 'name', 'school', 'school_name', '...', 'unspecified', 'unspecified school', None]
                if not school_id and (not school_name or school_name.lower().strip() in invalid_names):
                    action_name = 'CLARIFY'
                    # Generate school list for better UX
                    clarify_msg = self._generate_school_selection_message()
                    parsed = {'action': 'CLARIFY', 'message': clarify_msg}

            # Step 3c: Merge parameters from conversation history
            # This preserves params like 'month' from the original request when user provides follow-up info
            if conversation_history and action_name not in ['CLARIFY', 'UNSUPPORTED']:
                parsed = self._merge_params_from_history(parsed, conversation_history, context)

            # Step 4: Handle special actions (CLARIFY, CHAT, UNSUPPORTED)
            if action_name == 'CLARIFY':
                audit_log.log_action_execution(
                    action_name='CLARIFY',
                    params=parsed,
                    result={},
                    status='clarify'
                )
                return {
                    "success": True,
                    "needs_confirmation": False,
                    "action": "CLARIFY",
                    "message": parsed.get('message', 'Could you please clarify?'),
                    "data": None,
                    "audit_log_id": audit_log.id
                }

            if action_name == 'CHAT':
                # Conversational response (greetings, help, capabilities, etc.)
                audit_log.log_action_execution(
                    action_name='CHAT',
                    params=parsed,
                    result={},
                    status='success'
                )
                return {
                    "success": True,
                    "needs_confirmation": False,
                    "action": "CHAT",
                    "message": parsed.get('message', 'Hello! How can I help you with fee management today?'),
                    "data": None,
                    "audit_log_id": audit_log.id
                }

            if action_name == 'UNSUPPORTED':
                audit_log.log_action_execution(
                    action_name='UNSUPPORTED',
                    params=parsed,
                    result={},
                    status='unsupported'
                )
                return {
                    "success": False,
                    "needs_confirmation": False,
                    "action": "UNSUPPORTED",
                    "message": parsed.get('message', 'I cannot help with that request.'),
                    "data": None,
                    "audit_log_id": audit_log.id
                }

            # Step 5: Validate action
            action_def = get_action_definition(agent, action_name)
            if not action_def:
                audit_log.log_action_execution(
                    action_name=action_name,
                    params=parsed,
                    result={},
                    status='failed',
                    error=f'Unknown action: {action_name}'
                )
                return {
                    "success": False,
                    "needs_confirmation": False,
                    "message": f"Unknown action: {action_name}",
                    "data": None,
                    "audit_log_id": audit_log.id
                }

            # Step 6: Extract and resolve parameters
            params = {k: v for k, v in parsed.items() if k != 'action'}

            # Step 6a: Resolve fuzzy/alternative parameters (school_name -> school_id, student_name -> fee_id, etc.)
            resolver = get_resolver(context)
            resolution = resolver.resolve(action_name, params)

            if not resolution['success']:
                # Need clarification for parameter resolution
                audit_log.log_action_execution(
                    action_name=action_name,
                    params=params,
                    result={},
                    status='clarify',
                    error=resolution.get('clarify', 'Could not resolve parameters')
                )
                return {
                    "success": True,
                    "needs_confirmation": False,
                    "action": "CLARIFY",
                    "message": resolution.get('clarify', 'Could you please provide more details?'),
                    "data": None,
                    "audit_log_id": audit_log.id
                }

            # Use resolved params
            params = resolution.get('params', params)
            resolution_info = resolution.get('info')  # Extra info from resolution (e.g., matched student name)

            # Step 6b: Validate parameters
            validation = validate_action_params(action_def, params)

            if not validation['valid']:
                # Instead of returning an error, ask for the missing information politely
                missing = validation['missing_params']
                clarify_message = self._generate_missing_param_question(action_name, missing)

                audit_log.log_action_execution(
                    action_name=action_name,
                    params=params,
                    result={},
                    status='clarify',
                    error=f"Missing parameters: {missing}"
                )
                return {
                    "success": True,
                    "needs_confirmation": False,
                    "action": "CLARIFY",
                    "message": clarify_message,
                    "data": None,
                    "audit_log_id": audit_log.id
                }

            # Step 7: Check if confirmation needed
            if is_delete_action(action_def):
                # Generate confirmation token
                token = secrets.token_urlsafe(32)

                # Store action details in audit log BEFORE setting pending confirmation
                # This is required so confirm_action() can retrieve them later
                audit_log.action_name = action_name
                audit_log.action_params = params
                audit_log.set_pending_confirmation(token)

                # Get details for confirmation modal
                details = self._get_confirmation_details(agent, action_name, params)

                return {
                    "success": True,
                    "needs_confirmation": True,
                    "confirmation_token": token,
                    "action": action_name,
                    "message": details.get('message', 'Please confirm this action'),
                    "data": {
                        "action": action_name,
                        "params": params,
                        "details": details.get('items', [])
                    },
                    "audit_log_id": audit_log.id
                }

            # Step 8: Execute action
            result = self._execute_action(agent, action_def, params)

            total_time = int((time.time() - start_time) * 1000)
            audit_log.total_time_ms = total_time

            # Check if action needs overwrite confirmation (existing records)
            if result.get('needs_overwrite_confirmation'):
                audit_log.log_action_execution(
                    action_name=action_name,
                    params=params,
                    result=result.get('data', {}),
                    status='pending_overwrite'
                )
                return {
                    "success": True,
                    "needs_overwrite_confirmation": True,
                    "action": action_name,
                    "message": result.get('message', 'Records already exist. Overwrite?'),
                    "data": result.get('data'),
                    "params": params,  # Include params so frontend can retry with force_overwrite
                    "audit_log_id": audit_log.id
                }

            audit_log.log_action_execution(
                action_name=action_name,
                params=params,
                result=result.get('data', {}),
                status='success' if result['success'] else 'failed',
                error=result.get('error')
            )

            return {
                "success": result['success'],
                "needs_confirmation": False,
                "action": action_name,
                "message": result.get('message', 'Action completed'),
                "data": result.get('data'),
                "audit_log_id": audit_log.id
            }

        except Exception as e:
            audit_log.log_action_execution(
                action_name=None,
                params={},
                result={},
                status='failed',
                error=str(e)
            )
            return {
                "success": False,
                "needs_confirmation": False,
                "message": f"An error occurred: {str(e)}",
                "data": None,
                "audit_log_id": audit_log.id
            }

    def confirm_action(self, confirmation_token: str, edited_params: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Execute a previously confirmed action.

        Args:
            confirmation_token: Token from needs_confirmation response
            edited_params: Optional dict of edited parameters (e.g., edited task description, due_date)

        Returns:
            Execution result
        """
        try:
            audit_log = AIAuditLog.objects.get(
                confirmation_token=confirmation_token,
                status='pending_confirmation'
            )
        except AIAuditLog.DoesNotExist:
            return {
                "success": False,
                "message": "Confirmation expired or invalid"
            }

        # Get action definition
        action_def = get_action_definition(audit_log.agent, audit_log.action_name)
        if not action_def:
            audit_log.cancel()
            return {
                "success": False,
                "message": "Action no longer available"
            }

        # Merge edited params with stored params (edited takes precedence)
        final_params = dict(audit_log.action_params or {})
        if edited_params:
            # Check if this is bulk task edits
            if 'bulk_edits' in edited_params:
                # For bulk tasks, update resolved_employees with individual edits
                bulk_edits = edited_params['bulk_edits']
                if bulk_edits:
                    # Create new resolved_employees list with edited values
                    edited_employees = []
                    for edit in bulk_edits:
                        edited_employees.append({
                            'id': edit['employee_id'],
                            'name': next((e['name'] for e in final_params.get('resolved_employees', [])
                                         if e['id'] == edit['employee_id']), f"Employee #{edit['employee_id']}"),
                            'role': next((e.get('role', 'Employee') for e in final_params.get('resolved_employees', [])
                                         if e['id'] == edit['employee_id']), 'Employee'),
                            # Individual task edits
                            'task_description': edit.get('description', final_params.get('task_description', '')),
                            'due_date': edit.get('due_date', final_params.get('due_date', '')),
                            'priority': edit.get('priority', final_params.get('priority', 'medium'))
                        })
                    final_params['resolved_employees'] = edited_employees
                    final_params['employee_ids'] = [e['id'] for e in edited_employees]
            else:
                # Single task - map frontend field names to backend param names
                param_mapping = {
                    'description': 'task_description',
                    'due_date': 'due_date',
                    'priority': 'priority'
                }
                for frontend_key, backend_key in param_mapping.items():
                    if frontend_key in edited_params and edited_params[frontend_key]:
                        final_params[backend_key] = edited_params[frontend_key]

        # Execute the action with final params
        result = self._execute_action(
            audit_log.agent,
            action_def,
            final_params
        )

        # Update audit log
        audit_log.confirm(result.get('data', {}))

        return {
            "success": result['success'],
            "message": result.get('message', 'Action completed'),
            "data": result.get('data')
        }

    def cancel_action(self, confirmation_token: str) -> Dict[str, Any]:
        """Cancel a pending confirmation."""
        try:
            audit_log = AIAuditLog.objects.get(
                confirmation_token=confirmation_token,
                status='pending_confirmation'
            )
            audit_log.cancel()
            return {"success": True, "message": "Action cancelled"}
        except AIAuditLog.DoesNotExist:
            return {"success": False, "message": "Nothing to cancel"}

    def _execute_action(
        self,
        agent: str,
        action_def,
        params: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute an action by calling the appropriate API/handler."""
        from .executor import ActionExecutor

        executor = ActionExecutor(self.user)
        return executor.execute(agent, action_def, params)

    def _generate_missing_param_question(
        self,
        action_name: str,
        missing_params: list
    ) -> str:
        """Generate a friendly question asking for missing parameters."""
        # Map parameter names to user-friendly questions
        param_questions = {
            'school_id': 'Which school would you like to use?',
            'school_name': 'Which school would you like to use?',
            'month': 'For which month? (e.g., Jan-2026)',
            'student_name': 'What is the student\'s name?',
            'student_id': 'Which student?',
            'fee_id': 'Which fee record?',
            'item_id': 'Which inventory item?',
            'status': 'What status should it be?',
            'message': 'What message would you like to send?',
            'class': 'Which class?',
            'staff_id': 'Which staff member?',
            'paid_amount': 'What is the payment amount?',
        }

        if len(missing_params) == 1:
            param = missing_params[0]
            return param_questions.get(param, f'Could you please provide the {param}?')

        # Multiple missing params
        questions = []
        for param in missing_params:
            q = param_questions.get(param, param)
            questions.append(q)

        return f"I need a bit more information:\n- " + "\n- ".join(questions)

    def _generate_school_selection_message(self) -> str:
        """Generate a school selection message with numbered list."""
        from students.models import School

        schools = list(School.objects.filter(is_active=True).order_by('name')[:10])
        if not schools:
            return "Which school do you want to create fees for?"

        numbered_list = "\n".join([f"  {i+1}. {s.name}" for i, s in enumerate(schools)])
        return f"Which school do you want to create fees for?\n\nAvailable schools:\n{numbered_list}\n\nReply with the number to select."

    def _merge_params_from_history(
        self,
        current_parsed: Dict[str, Any],
        conversation_history: list,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Merge parameters from previous conversation messages.
        This preserves parameters like 'month', 'school_id', 'class', and 'fee_ids'
        when user provides follow-up commands.
        """
        import re
        import logging
        logger = logging.getLogger(__name__)

        # Look for previous assistant messages that might contain action context
        previous_params = {}

        for msg in reversed(conversation_history):
            if msg.get('role') == 'assistant':
                content = msg.get('content', '')
                data = msg.get('data', {})

                # Extract structured data from previous responses
                if data:
                    # Extract fee_ids from previous GET_FEES or similar results
                    if 'fee_ids' in data and not previous_params.get('fee_ids'):
                        previous_params['fee_ids'] = data['fee_ids']
                        logger.info(f"Extracted {len(data['fee_ids'])} fee_ids from history data")

                    # Extract school_id if present
                    if 'school_id' in data and not previous_params.get('school_id'):
                        previous_params['school_id'] = data['school_id']
                        logger.info(f"Extracted school_id from history data: {data['school_id']}")

                    # Extract class if present
                    if 'class' in data and not previous_params.get('class'):
                        previous_params['class'] = data['class']
                        logger.info(f"Extracted class from history data: {data['class']}")

                # Try to extract month from previous messages
                # Look for patterns like "Jan-2026", "jan 2026", "January 2026"
                if not previous_params.get('month'):
                    month_patterns = [
                        r'\b([A-Za-z]{3})-(\d{4})\b',  # Jan-2026
                        r'\b([A-Za-z]+)\s+(\d{4})\b',   # January 2026
                    ]
                    for pattern in month_patterns:
                        match = re.search(pattern, content)
                        if match:
                            month_str = f"{match.group(1)[:3].capitalize()}-{match.group(2)}"
                            previous_params['month'] = month_str
                            logger.info(f"Extracted month from history: {month_str}")
                            break

                # Extract fee IDs from text like "Fee IDs: 123, 456, 789"
                if not previous_params.get('fee_ids'):
                    fee_id_match = re.search(r'Fee IDs:\s*([\d,\s]+)', content)
                    if fee_id_match:
                        fee_ids_str = fee_id_match.group(1)
                        fee_ids = [int(fid.strip()) for fid in fee_ids_str.split(',') if fid.strip().isdigit()]
                        if fee_ids:
                            previous_params['fee_ids'] = fee_ids
                            logger.info(f"Extracted {len(fee_ids)} fee_ids from history text")

                # Extract school name for context
                school_match = re.search(r'for ([A-Za-z\s]+) for', content)
                if school_match and not previous_params.get('school_name'):
                    previous_params['school_name'] = school_match.group(1).strip()
                    logger.info(f"Extracted school_name from history: {previous_params['school_name']}")

            elif msg.get('role') == 'user':
                content = msg.get('content', '').lower()

                # Extract month from user messages like "create fee for jan 2026"
                if not previous_params.get('month'):
                    month_patterns = [
                        r'\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*[-]?\s*(\d{4})\b',
                    ]
                    for pattern in month_patterns:
                        match = re.search(pattern, content, re.IGNORECASE)
                        if match:
                            month_abbr = match.group(1)[:3].capitalize()
                            year = match.group(2)
                            month_str = f"{month_abbr}-{year}"
                            previous_params['month'] = month_str
                            logger.info(f"Extracted month from user message: {month_str}")
                            break

        # Merge: current params take precedence, but fill in missing ones from history
        merged = dict(current_parsed)
        for key, value in previous_params.items():
            if key not in merged or not merged.get(key):
                merged[key] = value
                logger.info(f"Merged param from history: {key}={value}")

        return merged

    def _get_confirmation_details(
        self,
        agent: str,
        action_name: str,
        params: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Get details for confirmation modal."""
        # This would fetch actual data to show in confirmation
        # For now, return generic message

        if action_name == 'DELETE_FEES':
            fee_ids = params.get('fee_ids', [])
            return {
                "message": f"Delete {len(fee_ids)} fee record(s)?",
                "items": [{"id": fid} for fid in fee_ids]
            }

        if action_name == 'DELETE_ITEM':
            return {
                "message": f"Delete inventory item #{params.get('item_id')}?",
                "items": [{"id": params.get('item_id')}]
            }

        if action_name == 'BULK_DELETE_ITEMS':
            item_ids = params.get('item_ids', [])
            return {
                "message": f"Delete {len(item_ids)} inventory item(s)?",
                "items": [{"id": iid} for iid in item_ids]
            }

        if action_name == 'DELETE_ATTENDANCE':
            return {
                "message": f"Delete attendance record #{params.get('attendance_id')}?",
                "items": [{"id": params.get('attendance_id')}]
            }

        if action_name == 'BULK_UPDATE_FEES':
            fees_count = params.get('_preview_fees_count', 0)
            school_name = params.get('_preview_school_name', '')
            paid_amount = params.get('paid_amount', '')

            if paid_amount == 'full':
                amount_text = "mark as fully paid"
            elif paid_amount == 'balance':
                amount_text = "pay remaining balance"
            else:
                amount_text = f"update with PKR {paid_amount}"

            scope = f" for {school_name}" if school_name else ""
            return {
                "message": f"Update {fees_count} fee record(s){scope} - {amount_text}?",
                "items": []
            }

        if action_name == 'CREATE_MISSING_FEES':
            schools_count = params.get('_preview_schools_count', 0)
            students_count = params.get('_preview_students_count', 0)
            month = params.get('month', '')

            parts = []
            if schools_count > 0:
                parts.append(f"{schools_count} school(s)")
            if students_count > 0:
                parts.append(f"{students_count} student(s)")

            scope = " and ".join(parts) if parts else "missing records"
            return {
                "message": f"Create fees for {scope} for {month}?",
                "items": []
            }

        if action_name == 'TRANSFER_ITEM':
            from inventory.models import InventoryItem
            from students.models import School

            item_id = params.get('item_id')
            target_school_id = params.get('target_school_id')

            item_name = f"Item #{item_id}"
            target_school_name = f"School #{target_school_id}"
            current_school_name = "Unknown"

            try:
                item = InventoryItem.objects.select_related('school').get(id=item_id)
                item_name = f"{item.name} ({item.unique_id})"
                current_school_name = item.school.name if item.school else "Unassigned"
            except InventoryItem.DoesNotExist:
                pass

            try:
                target_school = School.objects.get(id=target_school_id)
                target_school_name = target_school.name
            except School.DoesNotExist:
                pass

            return {
                "message": f"Transfer '{item_name}' from {current_school_name} to {target_school_name}?",
                "items": [{"id": item_id, "name": item_name, "from": current_school_name, "to": target_school_name}]
            }

        if action_name == 'DELETE_CATEGORY':
            from inventory.models import InventoryCategory

            category_id = params.get('category_id')
            category_name = f"Category #{category_id}"
            item_count = 0

            try:
                category = InventoryCategory.objects.get(id=category_id)
                category_name = category.name
                item_count = category.items.count()
            except InventoryCategory.DoesNotExist:
                pass

            warning = ""
            if item_count > 0:
                warning = f" WARNING: This category has {item_count} item(s) that will become uncategorized."

            return {
                "message": f"Delete category '{category_name}'?{warning}",
                "items": [{"id": category_id, "name": category_name, "item_count": item_count}]
            }

        if action_name == 'CREATE_TASK':
            from django.contrib.auth import get_user_model
            User = get_user_model()

            employee_id = params.get('employee_id')
            task_description = params.get('task_description', '')
            due_date = params.get('due_date', '')
            priority = params.get('priority', 'medium')

            employee_name = f"Employee #{employee_id}"
            employee_role = None
            try:
                employee = User.objects.get(id=employee_id)
                employee_name = employee.get_full_name() or employee.username
                employee_role = employee.role
            except User.DoesNotExist:
                pass

            # Truncate description for preview
            preview_desc = task_description[:150] + '...' if len(task_description) > 150 else task_description

            return {
                "message": f"Create task for {employee_name}?",
                "items": [{
                    "employee_name": employee_name,
                    "employee_id": employee_id,
                    "employee_role": employee_role,
                    "description": preview_desc,
                    "full_description": task_description,
                    "due_date": due_date,
                    "priority": priority
                }]
            }

        if action_name == 'CREATE_BULK_TASKS':
            resolved_employees = params.get('resolved_employees', [])
            task_description = params.get('task_description', '')
            due_date = params.get('due_date', '')
            priority = params.get('priority', 'medium')
            target_role = params.get('target_role')

            # Truncate description for preview
            preview_desc = task_description[:150] + '...' if len(task_description) > 150 else task_description

            employee_count = len(resolved_employees)

            # Build message based on whether it's role-based or name-based
            if target_role and target_role != 'all':
                message = f"Create task for all {employee_count} {target_role}s?"
            elif target_role == 'all':
                message = f"Create task for all {employee_count} employees?"
            else:
                if employee_count <= 3:
                    names = ', '.join([e['name'] for e in resolved_employees])
                    message = f"Create task for {names}?"
                else:
                    message = f"Create task for {employee_count} employees?"

            return {
                "message": message,
                "items": [{
                    "is_bulk": True,
                    "employee_count": employee_count,
                    "employees": resolved_employees[:10],  # Limit preview to 10
                    "target_role": target_role,
                    "description": preview_desc,
                    "full_description": task_description,
                    "due_date": due_date,
                    "priority": priority
                }]
            }

        return {
            "message": "Confirm this action?",
            "items": []
        }


def get_ai_service(user) -> AIAgentService:
    """Get AI service instance for a user."""
    return AIAgentService(user)
