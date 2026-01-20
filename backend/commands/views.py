"""
Views for Staff Commands

Provides endpoints for:
- Executing natural language commands
- Continuing commands after clarification
- Listing command history
- Managing quick actions
- Staff attendance CRUD
"""

from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework import status
from django.utils.timezone import now
from django.db.models import Q

from .models import Command, QuickAction, StaffAttendance
from .serializers import (
    CommandSerializer,
    CommandListSerializer,
    CommandExecuteSerializer,
    QuickActionSerializer,
    StaffAttendanceSerializer,
    StaffAttendanceCreateSerializer,
)
from .nlp.processor import NLPProcessor
from .validators import EntityValidator, resolve_clarification
from .executor import CommandExecutor


class CommandExecuteView(APIView):
    """
    Execute a natural language command.

    POST /api/commands/execute/

    Request body:
        - command: str (natural language command)
        OR
        - command_id: int (existing command ID for clarification)
        - clarification: dict (user's selection {id, label})

    Optional:
        - source_page: str (page from which command was issued)
        - school_id: int (context school)

    Response:
        - success: bool
        - message: str
        - needs_clarification: bool (if true, clarification options included)
        - clarification: dict (field, message, options)
        - data: dict (result data)
        - toast: dict (type, message for UI toast)
        - command_id: int
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CommandExecuteSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        command_text = data.get('command', '').strip()
        command_id = data.get('command_id')
        clarification = data.get('clarification')
        source_page = data.get('source_page', '')
        school_id = data.get('school_id')

        # Handle clarification continuation
        if command_id and clarification:
            return self._continue_with_clarification(command_id, clarification)

        # Handle new command
        return self._process_new_command(command_text, source_page, school_id)

    def _process_new_command(self, command_text: str, source_page: str, school_id: int):
        """Process a new natural language command."""
        user = self.request.user

        # Get school context
        school = None
        if school_id:
            from students.models import School
            school = School.objects.filter(id=school_id).first()

        # Step 1: Parse with NLP
        processor = NLPProcessor()
        agent, intent, entities = processor.process(command_text)

        # Create command record
        command = Command.objects.create(
            raw_input=command_text,
            parsed_intent=intent or '',
            parsed_entities=entities,
            agent=agent or 'unknown',
            executed_by=user,
            source_page=source_page,
            school=school,
            status='processing'
        )

        # Check if intent was recognized
        if not intent:
            command.status = 'failed'
            command.error_message = "Could not understand the command."
            command.save()

            suggestions = processor.get_suggestions(command_text)

            return Response({
                "success": False,
                "needs_clarification": False,
                "message": "I didn't understand that command. Try one of the suggestions below.",
                "suggestions": [{"text": s, "template": s} for s in suggestions],
                "quick_actions": self._get_quick_actions_for_user(user),
                "command_id": command.id
            }, status=status.HTTP_400_BAD_REQUEST)

        # Step 2: Validate entities
        validator = EntityValidator()
        validation = validator.validate(entities, intent, user)

        # Step 3: If clarification needed, return options
        if not validation['valid'] and validation['clarifications']:
            clarification_data = validation['clarifications'][0]

            command.status = 'awaiting_clarification'
            command.clarification_type = clarification_data['field']
            command.clarification_options = clarification_data['options']
            command.save()

            return Response({
                "success": True,
                "needs_clarification": True,
                "message": clarification_data['message'],
                "clarification": clarification_data,
                "command_id": command.id,
                "agent": agent,
                "intent": intent
            })

        # Step 4: Execute command
        return self._execute_command(command, intent, validation['entities'])

    def _continue_with_clarification(self, command_id: int, clarification: dict):
        """Continue command execution after user provides clarification."""
        user = self.request.user

        try:
            command = Command.objects.get(
                id=command_id,
                executed_by=user,
                status='awaiting_clarification'
            )
        except Command.DoesNotExist:
            return Response({
                "success": False,
                "message": "Command not found or already processed."
            }, status=status.HTTP_404_NOT_FOUND)

        # Update entities with clarified value
        entities = resolve_clarification(
            command.parsed_entities,
            command.clarification_type,
            clarification
        )

        command.selected_option = clarification
        command.parsed_entities = entities
        command.status = 'processing'
        command.save()

        # Re-validate (might need more clarifications)
        validator = EntityValidator()
        validation = validator.validate(entities, command.parsed_intent, user)

        if not validation['valid'] and validation['clarifications']:
            clarification_data = validation['clarifications'][0]

            command.clarification_type = clarification_data['field']
            command.clarification_options = clarification_data['options']
            command.status = 'awaiting_clarification'
            command.save()

            return Response({
                "success": True,
                "needs_clarification": True,
                "message": clarification_data['message'],
                "clarification": clarification_data,
                "command_id": command.id
            })

        # Execute command
        return self._execute_command(command, command.parsed_intent, validation['entities'])

    def _execute_command(self, command: Command, intent: str, entities: dict):
        """Execute the command and return result."""
        user = self.request.user

        try:
            executor = CommandExecutor(user)
            result = executor.execute(intent, entities)

            # Update command record
            command.status = 'success' if result['success'] else 'failed'
            command.response_message = result.get('message', '')
            command.response_data = result.get('data', {})
            if not result['success']:
                command.error_message = result.get('message', '')
            command.completed_at = now()
            command.save()

            return Response({
                "success": result['success'],
                "needs_clarification": False,
                "message": result.get('message', ''),
                "data": result.get('data'),
                "toast": result.get('toast'),
                "command_id": command.id,
                "agent": command.agent,
                "intent": intent
            })

        except Exception as e:
            command.status = 'failed'
            command.error_message = str(e)
            command.completed_at = now()
            command.save()

            return Response({
                "success": False,
                "needs_clarification": False,
                "message": f"Command execution failed: {str(e)}",
                "toast": {"type": "error", "message": "Command failed"},
                "command_id": command.id
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def _get_quick_actions_for_user(self, user) -> list:
        """Get available quick actions for user."""
        actions = QuickAction.objects.filter(is_active=True)

        # Filter by role
        available = []
        for action in actions:
            if action.is_available_for_role(user.role):
                available.append({
                    'name': action.name,
                    'icon': action.icon,
                    'command_template': action.command_template,
                    'required_params': action.required_params
                })

        return available


class CommandViewSet(ReadOnlyModelViewSet):
    """
    ViewSet for command history.

    GET /api/commands/           - List command history
    GET /api/commands/{id}/      - Get command details
    GET /api/commands/available/ - List available commands for user
    """
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            return CommandListSerializer
        return CommandSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = Command.objects.select_related('executed_by', 'school')

        # Non-admins only see their own commands
        if user.role != 'Admin' and not getattr(user, 'is_superuser', False):
            queryset = queryset.filter(executed_by=user)

        # Filter by status if provided
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Filter by agent if provided
        agent_filter = self.request.query_params.get('agent')
        if agent_filter:
            queryset = queryset.filter(agent=agent_filter)

        # Filter by date range
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        if date_from:
            queryset = queryset.filter(created_at__date__gte=date_from)
        if date_to:
            queryset = queryset.filter(created_at__date__lte=date_to)

        return queryset

    @action(detail=False, methods=['get'])
    def available(self, request):
        """
        GET /api/commands/available/

        List available command types and examples for current user.
        """
        user = request.user

        commands = {
            "inventory": {
                "name": "Inventory",
                "description": "Manage inventory and stock",
                "examples": [
                    "Check stock for Math Books",
                    "Received 100 Uniforms",
                    "Order 20 boxes of Chalk",
                    "Where is laptop SKU-001?",
                    "Mark item ABC as damaged",
                ],
                "available": user.role in ['Admin', 'Teacher']
            },
            "broadcast": {
                "name": "Broadcast",
                "description": "Send notifications to parents and teachers",
                "examples": [
                    "Tell Class 10 parents school is closed tomorrow",
                    "Send to all teachers: Staff meeting at 4 PM",
                    "Notify parents at Main School about fee due",
                ],
                "available": user.role == 'Admin'
            },
            "finance": {
                "name": "Finance",
                "description": "Generate invoices and financial reports",
                "examples": [
                    "Generate invoice for Main School for January",
                    "Show pending fees for Class 10",
                    "Fee collection summary for December",
                ],
                "available": user.role == 'Admin'
            },
            "hr": {
                "name": "HR",
                "description": "Manage staff attendance and substitutes",
                "examples": [
                    "Mark me absent today",
                    "Who is absent today?",
                    "Suggest substitute for Class 5",
                    "Mark Rahul as late today",
                ],
                "available": user.role in ['Admin', 'Teacher']
            }
        }

        return Response(commands)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        GET /api/commands/stats/

        Get command execution statistics.
        """
        user = request.user
        queryset = self.get_queryset()

        from django.db.models import Count

        stats = {
            'total': queryset.count(),
            'by_status': dict(
                queryset.values('status')
                .annotate(count=Count('id'))
                .values_list('status', 'count')
            ),
            'by_agent': dict(
                queryset.values('agent')
                .annotate(count=Count('id'))
                .values_list('agent', 'count')
            ),
        }

        return Response(stats)


class QuickActionViewSet(ModelViewSet):
    """
    ViewSet for quick actions.

    GET  /api/commands/quick-actions/      - List quick actions
    POST /api/commands/quick-actions/      - Create quick action (admin only)
    GET  /api/commands/quick-actions/{id}/ - Get quick action
    PUT  /api/commands/quick-actions/{id}/ - Update quick action (admin only)
    DELETE /api/commands/quick-actions/{id}/ - Delete quick action (admin only)
    """
    permission_classes = [IsAuthenticated]
    serializer_class = QuickActionSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = QuickAction.objects.filter(is_active=True)

        # For list action, filter by user's role
        if self.action == 'list':
            # Filter actions available for user's role
            available_actions = []
            for action in queryset:
                if action.is_available_for_role(user.role):
                    available_actions.append(action.id)
            queryset = queryset.filter(id__in=available_actions)

        return queryset

    def create(self, request, *args, **kwargs):
        """Only admins can create quick actions."""
        if request.user.role != 'Admin':
            return Response(
                {"detail": "Only admins can create quick actions."},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        """Only admins can update quick actions."""
        if request.user.role != 'Admin':
            return Response(
                {"detail": "Only admins can update quick actions."},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        """Only admins can delete quick actions."""
        if request.user.role != 'Admin':
            return Response(
                {"detail": "Only admins can delete quick actions."},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)


class StaffAttendanceViewSet(ModelViewSet):
    """
    ViewSet for staff attendance.

    GET  /api/commands/staff-attendance/      - List attendance
    POST /api/commands/staff-attendance/      - Create attendance
    GET  /api/commands/staff-attendance/{id}/ - Get attendance
    PATCH /api/commands/staff-attendance/{id}/ - Update attendance
    DELETE /api/commands/staff-attendance/{id}/ - Delete attendance (admin only)
    """
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return StaffAttendanceCreateSerializer
        return StaffAttendanceSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = StaffAttendance.objects.select_related(
            'staff', 'school', 'marked_by', 'substitute'
        )

        # Filter by user's schools if not admin
        if user.role != 'Admin' and not getattr(user, 'is_superuser', False):
            school_ids = user.assigned_schools.values_list('id', flat=True)
            queryset = queryset.filter(school_id__in=school_ids)

        # Filter by date
        date_filter = self.request.query_params.get('date')
        if date_filter:
            queryset = queryset.filter(date=date_filter)

        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Filter by school
        school_filter = self.request.query_params.get('school')
        if school_filter:
            queryset = queryset.filter(school_id=school_filter)

        # Filter by staff
        staff_filter = self.request.query_params.get('staff')
        if staff_filter:
            queryset = queryset.filter(staff_id=staff_filter)

        return queryset

    def perform_create(self, serializer):
        """Set marked_by to current user."""
        serializer.save(marked_by=self.request.user)

    def perform_update(self, serializer):
        """Track who updated the record."""
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        """Only admins can delete attendance records."""
        if request.user.role != 'Admin':
            return Response(
                {"detail": "Only admins can delete attendance records."},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['get'])
    def today(self, request):
        """
        GET /api/commands/staff-attendance/today/

        Get today's attendance summary.
        """
        from datetime import date
        from django.db.models import Count

        today = date.today()
        queryset = self.get_queryset().filter(date=today)

        summary = queryset.values('status').annotate(count=Count('id'))
        summary_dict = {item['status']: item['count'] for item in summary}

        records = StaffAttendanceSerializer(queryset, many=True).data

        return Response({
            'date': str(today),
            'summary': summary_dict,
            'total': queryset.count(),
            'records': records
        })

    @action(detail=False, methods=['get'])
    def available_teachers(self, request):
        """
        GET /api/commands/staff-attendance/available_teachers/

        Get teachers available for substitution (not absent today).
        """
        from datetime import date
        from students.models import CustomUser

        target_date = request.query_params.get('date', str(date.today()))
        school_id = request.query_params.get('school')

        # Get absent staff IDs
        absent_ids = StaffAttendance.objects.filter(
            date=target_date,
            status__in=['absent', 'on_leave']
        ).values_list('staff_id', flat=True)

        # Get available teachers
        teachers = CustomUser.objects.filter(
            role='Teacher',
            is_active=True
        ).exclude(id__in=absent_ids)

        if school_id:
            teachers = teachers.filter(assigned_schools__id=school_id)
        elif request.user.role != 'Admin':
            school_ids = request.user.assigned_schools.values_list('id', flat=True)
            teachers = teachers.filter(assigned_schools__id__in=school_ids)

        data = [{
            'id': t.id,
            'name': t.get_full_name(),
            'username': t.username,
            'employee_id': getattr(t.teacher_profile, 'employee_id', None) if hasattr(t, 'teacher_profile') else None
        } for t in teachers.distinct()[:20]]

        return Response({
            'date': target_date,
            'count': len(data),
            'teachers': data
        })
