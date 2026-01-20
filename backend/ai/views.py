"""
AI Agent API Views
==================
REST API endpoints for AI agent operations.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.conf import settings

from .service import get_ai_service
from .ollama_client import get_ollama_client
from .models import AIAuditLog


class AIHealthView(APIView):
    """
    Health check endpoint for AI service.

    GET /api/ai/health/

    Returns:
        {
            "status": "ok" | "degraded",
            "ai_available": bool,
            "model": str,
            "message": str
        }
    """
    permission_classes = []  # Public endpoint

    def get(self, request):
        ollama = get_ollama_client()
        ai_available = ollama.is_available_sync()

        return Response({
            "status": "ok" if ai_available else "degraded",
            "ai_available": ai_available,
            "model": getattr(settings, 'OLLAMA_MODEL', 'phi3:mini'),
            "host": getattr(settings, 'OLLAMA_HOST', 'http://localhost:11434'),
            "message": "AI service is ready" if ai_available else "AI service unavailable, using templates only"
        })


class AITestView(APIView):
    """
    Test endpoint for debugging AI/Ollama integration.

    GET /api/ai/test/

    Returns detailed debug info about Ollama connectivity.
    """
    permission_classes = []  # Public for debugging

    def get(self, request):
        import requests
        import logging

        logger = logging.getLogger(__name__)

        ollama = get_ollama_client()
        host = getattr(settings, 'OLLAMA_HOST', 'http://localhost:11434')
        model = getattr(settings, 'OLLAMA_MODEL', 'phi3:mini')

        result = {
            "host": host,
            "model": model,
            "connection_test": None,
            "models_available": [],
            "model_found": False,
            "simple_prompt_test": None,
        }

        # Test 1: Connection
        try:
            response = requests.get(f"{host}/api/tags", timeout=5)
            result["connection_test"] = {
                "success": response.status_code == 200,
                "status_code": response.status_code
            }
            if response.status_code == 200:
                data = response.json()
                result["models_available"] = [m.get('name', '') for m in data.get('models', [])]
                result["model_found"] = any(model in m for m in result["models_available"])
        except Exception as e:
            result["connection_test"] = {
                "success": False,
                "error": str(e)
            }

        # Test 2: Simple prompt (only if model found)
        if result.get("model_found"):
            try:
                test_result = ollama.generate_sync(
                    prompt='Respond with just the word "hello"',
                    system_prompt='You are a helpful assistant. Respond only with a single word.',
                    max_tokens=10
                )
                result["simple_prompt_test"] = {
                    "success": test_result.get("success"),
                    "response": test_result.get("response", "")[:100],
                    "response_time_ms": test_result.get("response_time_ms"),
                    "error": test_result.get("error")
                }
            except Exception as e:
                result["simple_prompt_test"] = {
                    "success": False,
                    "error": str(e)
                }

        return Response(result)


class AIExecuteView(APIView):
    """
    Execute an AI agent command.

    POST /api/ai/execute/

    Request body:
        {
            "message": "create fees for main school january",
            "agent": "fee",  // "fee", "inventory", "hr", "broadcast"
            "context": {
                "schools": [{"id": 1, "name": "Main School"}],
                "current_date": "2026-01-19",
                "current_month": "Jan-2026",
                // Agent-specific context...
            }
        }

    Response (success):
        {
            "success": true,
            "action": "CREATE_MONTHLY_FEES",
            "message": "Created 50 fee records for Main School",
            "data": {...},
            "audit_log_id": 123
        }

    Response (needs confirmation):
        {
            "success": true,
            "needs_confirmation": true,
            "confirmation_token": "abc123...",
            "action": "DELETE_FEES",
            "message": "Delete 3 fee records?",
            "data": {
                "action": "DELETE_FEES",
                "params": {"fee_ids": [1,2,3]},
                "details": [...]
            }
        }

    Response (clarification):
        {
            "success": true,
            "action": "CLARIFY",
            "message": "Which school did you mean?"
        }

    Response (AI unavailable):
        {
            "success": false,
            "fallback_to_templates": true,
            "message": "AI service unavailable. Please use quick actions."
        }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        message = request.data.get('message', '').strip()
        agent = request.data.get('agent', '').lower()
        context = request.data.get('context', {})
        conversation_history = request.data.get('conversation_history', [])

        # Validate input
        if not message:
            return Response(
                {"error": "Message is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        if agent not in ['fee', 'inventory', 'hr', 'broadcast']:
            return Response(
                {"error": f"Invalid agent: {agent}. Must be one of: fee, inventory, hr, broadcast"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Add current date to context if not present
        from datetime import date
        if 'current_date' not in context:
            context['current_date'] = str(date.today())
        if 'current_month' not in context:
            context['current_month'] = date.today().strftime('%b-%Y')

        # Process with AI service (with conversation history for multi-turn)
        service = get_ai_service(request.user)
        result = service.process_message(message, agent, context, conversation_history)

        return Response(result)


class AIConfirmView(APIView):
    """
    Confirm or cancel a pending destructive action.

    POST /api/ai/confirm/

    Request body (confirm):
        {
            "confirmation_token": "abc123...",
            "confirmed": true
        }

    Request body (cancel):
        {
            "confirmation_token": "abc123...",
            "confirmed": false
        }

    Response:
        {
            "success": true,
            "message": "Action completed" | "Action cancelled",
            "data": {...}
        }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        token = request.data.get('confirmation_token')
        confirmed = request.data.get('confirmed', False)

        if not token:
            return Response(
                {"error": "confirmation_token is required"},
                status=status.HTTP_400_BAD_REQUEST
            )

        service = get_ai_service(request.user)

        if confirmed:
            result = service.confirm_action(token)
        else:
            result = service.cancel_action(token)

        return Response(result)


class AIOverwriteView(APIView):
    """
    Execute a fee creation with force_overwrite enabled.

    POST /api/ai/overwrite/

    Request body:
        {
            "action": "CREATE_MONTHLY_FEES",
            "params": {
                "school_id": 1,
                "month": "Jan-2026"
            }
        }

    Response:
        {
            "success": true,
            "message": "Created 50 fee records for Main School - Jan-2026",
            "data": {...}
        }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        action = request.data.get('action', '')
        params = request.data.get('params', {})

        # Validate action
        allowed_actions = ['CREATE_MONTHLY_FEES', 'CREATE_FEES_ALL_SCHOOLS',
                          'CREATE_MISSING_FEES', 'CREATE_FEES_MULTIPLE_SCHOOLS']

        if action not in allowed_actions:
            return Response(
                {"error": f"Action '{action}' does not support overwrite."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Add force_overwrite flag
        params['force_overwrite'] = True

        # Execute action directly
        from .executor import ActionExecutor
        from .actions import get_action_definition

        action_def = get_action_definition('fee', action)
        if not action_def:
            return Response(
                {"error": f"Unknown action: {action}"},
                status=status.HTTP_400_BAD_REQUEST
            )

        executor = ActionExecutor(request.user)
        result = executor.execute('fee', action_def, params)

        return Response(result)


class AIHistoryView(APIView):
    """
    Get AI agent usage history for current user.

    GET /api/ai/history/

    Query params:
        - agent: Filter by agent type
        - status: Filter by status
        - limit: Max results (default 20)

    Response:
        {
            "results": [
                {
                    "id": 1,
                    "agent": "fee",
                    "user_message": "create fees...",
                    "action_name": "CREATE_MONTHLY_FEES",
                    "status": "success",
                    "created_at": "2026-01-19T10:30:00Z"
                },
                ...
            ],
            "count": 10
        }
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset = AIAuditLog.objects.filter(user=request.user)

        # Apply filters
        agent = request.query_params.get('agent')
        if agent:
            queryset = queryset.filter(agent=agent)

        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Limit results
        limit = int(request.query_params.get('limit', 20))
        queryset = queryset[:limit]

        results = [{
            "id": log.id,
            "agent": log.agent,
            "user_message": log.user_message,
            "action_name": log.action_name,
            "status": log.status,
            "message": log.execution_result.get('message') if log.execution_result else None,
            "llm_response_time_ms": log.llm_response_time_ms,
            "created_at": log.created_at.isoformat()
        } for log in queryset]

        return Response({
            "results": results,
            "count": len(results)
        })


class AIStatsView(APIView):
    """
    Get AI usage statistics.

    GET /api/ai/stats/

    Response:
        {
            "total_requests": 100,
            "by_agent": {"fee": 50, "inventory": 30, ...},
            "by_status": {"success": 80, "failed": 10, ...},
            "avg_response_time_ms": 1500
        }
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from django.db.models import Count, Avg

        # Base queryset (admin sees all, others see own)
        if request.user.role == 'Admin':
            queryset = AIAuditLog.objects.all()
        else:
            queryset = AIAuditLog.objects.filter(user=request.user)

        # Aggregate stats
        total = queryset.count()

        by_agent = dict(
            queryset.values('agent')
            .annotate(count=Count('id'))
            .values_list('agent', 'count')
        )

        by_status = dict(
            queryset.values('status')
            .annotate(count=Count('id'))
            .values_list('status', 'count')
        )

        avg_time = queryset.aggregate(avg=Avg('llm_response_time_ms'))['avg'] or 0

        return Response({
            "total_requests": total,
            "by_agent": by_agent,
            "by_status": by_status,
            "avg_response_time_ms": int(avg_time)
        })
