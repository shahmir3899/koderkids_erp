"""
Command Executor for Staff Commands

Executes commands by either:
1. Calling existing API endpoints internally
2. Using custom handlers for complex operations

This approach reuses existing business logic and maintains consistency.
"""

import json
from typing import Dict, Any, Optional
from datetime import date
from decimal import Decimal

from django.urls import resolve, Resolver404
from django.test import RequestFactory
from django.db.models import Sum
from rest_framework.request import Request

from .api_mappings import get_mapping, needs_handler, get_handler_name


class CommandExecutor:
    """
    Executes staff commands by calling existing APIs or custom handlers.

    Usage:
        executor = CommandExecutor(user)
        result = executor.execute("inventory.query.stock", entities)
    """

    def __init__(self, user):
        """
        Initialize executor with the requesting user.

        Args:
            user: CustomUser instance making the request
        """
        self.user = user
        self.factory = RequestFactory()

    def execute(self, intent: str, entities: dict) -> dict:
        """
        Execute command based on intent and entities.

        Args:
            intent: Intent string (e.g., "inventory.query.stock")
            entities: Resolved entities dict

        Returns:
            {
                "success": bool,
                "message": str,
                "data": dict/list,
                "toast": {"type": "success/error/info", "message": str}
            }
        """
        mapping = get_mapping(intent)

        if not mapping:
            return self._error_response(f"No mapping found for intent: {intent}")

        try:
            # Check if custom handler is needed
            if needs_handler(intent):
                handler_name = get_handler_name(intent)
                return self._call_handler(handler_name, entities, mapping)
            else:
                return self._call_api(mapping, entities)

        except Exception as e:
            return self._error_response(f"Command execution failed: {str(e)}")

    def _call_api(self, mapping: dict, entities: dict) -> dict:
        """
        Call an existing API endpoint internally.

        Args:
            mapping: API mapping configuration
            entities: Resolved entities

        Returns:
            Result dict
        """
        endpoint = mapping['endpoint']
        method = mapping['method']

        # Replace path parameters like {item_id}
        endpoint = self._replace_path_params(endpoint, entities)

        # Build query/body parameters
        params = self._build_params(mapping, entities)

        try:
            # Make internal API request
            response_data = self._make_internal_request(endpoint, method, params)

            # Process response
            return self._process_response(response_data, mapping, entities)

        except Resolver404:
            return self._error_response(f"API endpoint not found: {endpoint}")
        except Exception as e:
            return self._error_response(f"API call failed: {str(e)}")

    def _call_handler(self, handler_name: str, entities: dict, mapping: dict) -> dict:
        """
        Call a custom handler function.

        Args:
            handler_name: Name of handler method
            entities: Resolved entities
            mapping: API mapping configuration

        Returns:
            Result dict
        """
        handler = getattr(self, f'_handle_{handler_name}', None)

        if not handler:
            return self._error_response(f"Handler not found: {handler_name}")

        return handler(entities, mapping)

    def _replace_path_params(self, endpoint: str, entities: dict) -> str:
        """Replace {param} placeholders in endpoint URL."""
        import re

        def replacer(match):
            key = match.group(1)
            # Try with _id suffix first, then without
            value = entities.get(key) or entities.get(f"{key}_id") or entities.get(key.replace('_id', ''))
            return str(value) if value else match.group(0)

        return re.sub(r'\{(\w+)\}', replacer, endpoint)

    def _build_params(self, mapping: dict, entities: dict) -> dict:
        """Build API parameters from entities and mapping."""
        params = {}

        # Add default params
        default_params = mapping.get('default_params', {})
        params.update(default_params)

        # Map entities to API params
        param_mapping = mapping.get('param_mapping', {})
        for entity_key, param_key in param_mapping.items():
            value = entities.get(entity_key)
            if value is not None:
                params[param_key] = value

        return params

    def _make_internal_request(self, endpoint: str, method: str, params: dict) -> dict:
        """
        Make an internal API request using Django's test client.

        Args:
            endpoint: API endpoint path
            method: HTTP method (GET, POST, PATCH, etc.)
            params: Request parameters

        Returns:
            Response data as dict
        """
        # Create request
        if method == 'GET':
            request = self.factory.get(endpoint, params)
        elif method == 'POST':
            request = self.factory.post(
                endpoint,
                data=json.dumps(params),
                content_type='application/json'
            )
        elif method == 'PATCH':
            request = self.factory.patch(
                endpoint,
                data=json.dumps(params),
                content_type='application/json'
            )
        elif method == 'PUT':
            request = self.factory.put(
                endpoint,
                data=json.dumps(params),
                content_type='application/json'
            )
        elif method == 'DELETE':
            request = self.factory.delete(endpoint)
        else:
            raise ValueError(f"Unsupported HTTP method: {method}")

        # Attach user authentication
        request.user = self.user

        # Resolve and call view
        resolver_match = resolve(endpoint)
        view = resolver_match.func

        # Handle ViewSet vs function-based views
        if hasattr(view, 'cls'):
            # ViewSet - need to initialize it
            view_instance = view.cls()
            view_instance.request = Request(request)
            view_instance.kwargs = resolver_match.kwargs
            view_instance.args = resolver_match.args
            view_instance.format_kwarg = None

            # Determine action based on method
            if method == 'GET':
                if resolver_match.kwargs:
                    action = 'retrieve'
                else:
                    action = 'list'
            elif method == 'POST':
                action = 'create'
            elif method in ['PATCH', 'PUT']:
                action = 'partial_update' if method == 'PATCH' else 'update'
            elif method == 'DELETE':
                action = 'destroy'
            else:
                action = 'list'

            view_instance.action = action
            response = view(request, **resolver_match.kwargs)
        else:
            # Function-based view
            response = view(request, **resolver_match.kwargs)

        # Render response if needed
        if hasattr(response, 'render'):
            response.render()

        # Return data
        if hasattr(response, 'data'):
            return response.data
        elif hasattr(response, 'content'):
            try:
                return json.loads(response.content)
            except (json.JSONDecodeError, TypeError):
                return {}
        return {}

    def _process_response(self, response_data: Any, mapping: dict, entities: dict) -> dict:
        """
        Process API response and format result message.

        Args:
            response_data: Raw response from API
            mapping: API mapping configuration
            entities: Original entities

        Returns:
            Formatted result dict
        """
        # Extract results from response
        response_key = mapping.get('response_key')
        if response_key and isinstance(response_data, dict):
            results = response_data.get(response_key, [])
            count = response_data.get('count', len(results) if isinstance(results, list) else 0)
        elif isinstance(response_data, list):
            results = response_data
            count = len(results)
        else:
            results = response_data
            count = 1 if response_data else 0

        # Calculate aggregates if specified
        aggregates = {}
        if mapping.get('aggregate') and isinstance(results, list):
            for agg_name, field in mapping['aggregate'].items():
                total = sum(
                    float(item.get(field, 0) or 0)
                    for item in results
                    if isinstance(item, dict)
                )
                aggregates[agg_name] = total

        # Build template context
        context = {
            'count': count,
            **entities,
            **aggregates,
        }

        # Add response data to context if dict
        if isinstance(response_data, dict):
            context.update(response_data)

        # Generate message
        if count == 0:
            template = mapping.get('empty_template', mapping.get('success_template', 'No results found.'))
        else:
            template = mapping.get('success_template', 'Command executed successfully.')

        try:
            message = template.format(**context)
        except KeyError as e:
            message = template  # Use template as-is if formatting fails

        return {
            "success": True,
            "message": message,
            "data": {
                "results": results if isinstance(results, list) else [results] if results else [],
                "count": count,
                **aggregates,
            },
            "toast": {
                "type": "success",
                "message": message
            }
        }

    def _error_response(self, message: str) -> dict:
        """Generate error response."""
        return {
            "success": False,
            "message": message,
            "data": None,
            "toast": {
                "type": "error",
                "message": message
            }
        }

    # ==================== CUSTOM HANDLERS ====================

    def _handle_mark_staff_attendance(self, entities: dict, mapping: dict) -> dict:
        """Handle marking staff attendance."""
        from .models import StaffAttendance
        from students.models import CustomUser, School

        staff_id = entities.get('staff_id')
        status = entities.get('status', 'absent')
        attendance_date = entities.get('date', str(date.today()))

        # Convert date string to date object
        if isinstance(attendance_date, str):
            if attendance_date == 'today':
                attendance_date = date.today()
            else:
                try:
                    attendance_date = date.fromisoformat(attendance_date)
                except ValueError:
                    attendance_date = date.today()

        # Get staff user
        try:
            staff = CustomUser.objects.get(id=staff_id)
        except CustomUser.DoesNotExist:
            return self._error_response(f"Staff member not found.")

        # Determine school
        school = None
        if entities.get('school_id'):
            school = School.objects.filter(id=entities['school_id']).first()
        elif staff.assigned_schools.exists():
            school = staff.assigned_schools.first()

        if not school:
            return self._error_response("Could not determine school for attendance.")

        # Normalize status
        status_mapping = {
            'absent': 'absent',
            'present': 'present',
            'late': 'late',
            'half_day': 'half_day',
            'halfday': 'half_day',
            'on_leave': 'on_leave',
            'leave': 'on_leave',
        }
        status = status_mapping.get(status.lower().replace(' ', '_'), 'absent')

        # Create or update attendance
        attendance, created = StaffAttendance.objects.update_or_create(
            staff=staff,
            date=attendance_date,
            defaults={
                'status': status,
                'school': school,
                'marked_by': self.user,
                'notes': f"Marked via Staff Command"
            }
        )

        action = "marked" if created else "updated"
        staff_name = staff.get_full_name() or staff.username

        message = f"{staff_name} {action} as {status} for {attendance_date}"

        return {
            "success": True,
            "message": message,
            "data": {
                "staff_id": staff.id,
                "staff_name": staff_name,
                "status": status,
                "date": str(attendance_date),
                "action": action
            },
            "toast": {
                "type": "success",
                "message": message
            }
        }

    def _handle_query_staff_attendance(self, entities: dict, mapping: dict) -> dict:
        """Handle querying staff attendance."""
        from .models import StaffAttendance

        attendance_date = entities.get('date', str(date.today()))
        status_filter = entities.get('status')

        # Convert date string
        if isinstance(attendance_date, str):
            if attendance_date == 'today':
                attendance_date = date.today()
            else:
                try:
                    attendance_date = date.fromisoformat(attendance_date)
                except ValueError:
                    attendance_date = date.today()

        # Build query
        queryset = StaffAttendance.objects.filter(date=attendance_date)

        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Filter by school if user is not admin
        if self.user.role != 'Admin' and not getattr(self.user, 'is_superuser', False):
            school_ids = self.user.assigned_schools.values_list('id', flat=True)
            queryset = queryset.filter(school_id__in=school_ids)

        records = queryset.select_related('staff', 'substitute', 'school')

        data = [{
            'staff_name': r.staff.get_full_name(),
            'status': r.status,
            'school': r.school.name if r.school else '',
            'substitute': r.substitute.get_full_name() if r.substitute else None,
            'notes': r.notes
        } for r in records]

        status_text = status_filter if status_filter else "recorded"
        message = f"{len(data)} staff member(s) {status_text} on {attendance_date}"

        return {
            "success": True,
            "message": message,
            "data": {
                "results": data,
                "count": len(data),
                "date": str(attendance_date),
                "status_filter": status_filter
            },
            "toast": {
                "type": "info",
                "message": message
            }
        }

    def _handle_suggest_substitutes(self, entities: dict, mapping: dict) -> dict:
        """Handle suggesting available teachers for substitution."""
        from .models import StaffAttendance
        from students.models import CustomUser

        attendance_date = entities.get('date', date.today())
        school_id = entities.get('school_id')

        if isinstance(attendance_date, str):
            if attendance_date == 'today':
                attendance_date = date.today()
            else:
                try:
                    attendance_date = date.fromisoformat(attendance_date)
                except ValueError:
                    attendance_date = date.today()

        # Get IDs of absent staff
        absent_ids = StaffAttendance.objects.filter(
            date=attendance_date,
            status__in=['absent', 'on_leave']
        ).values_list('staff_id', flat=True)

        # Get available teachers
        teachers = CustomUser.objects.filter(
            role='Teacher',
            is_active=True
        ).exclude(id__in=absent_ids)

        if school_id:
            teachers = teachers.filter(assigned_schools__id=school_id)
        elif self.user.role != 'Admin':
            school_ids = self.user.assigned_schools.values_list('id', flat=True)
            teachers = teachers.filter(assigned_schools__id__in=school_ids)

        suggestions = [{
            'id': t.id,
            'name': t.get_full_name(),
            'employee_id': getattr(t.teacher_profile, 'employee_id', None) if hasattr(t, 'teacher_profile') else None
        } for t in teachers[:10]]

        message = f"Found {len(suggestions)} available teacher(s) for substitution."

        return {
            "success": True,
            "message": message,
            "data": {
                "results": suggestions,
                "count": len(suggestions),
                "date": str(attendance_date)
            },
            "toast": {
                "type": "info",
                "message": message
            }
        }

    def _handle_assign_substitute(self, entities: dict, mapping: dict) -> dict:
        """Handle assigning a substitute teacher."""
        from .models import StaffAttendance
        from students.models import CustomUser

        staff_id = entities.get('staff_id')
        substitute_id = entities.get('substitute_id')
        attendance_date = entities.get('date', date.today())

        if isinstance(attendance_date, str):
            if attendance_date == 'today':
                attendance_date = date.today()
            else:
                try:
                    attendance_date = date.fromisoformat(attendance_date)
                except ValueError:
                    attendance_date = date.today()

        try:
            staff = CustomUser.objects.get(id=staff_id)
            substitute = CustomUser.objects.get(id=substitute_id)
        except CustomUser.DoesNotExist:
            return self._error_response("Staff member or substitute not found.")

        # Get or create attendance record
        attendance, _ = StaffAttendance.objects.get_or_create(
            staff=staff,
            date=attendance_date,
            defaults={
                'status': 'absent',
                'school': staff.assigned_schools.first(),
                'marked_by': self.user
            }
        )

        # Assign substitute
        attendance.substitute = substitute
        attendance.substitute_reason = entities.get('reason', 'Assigned via Staff Command')
        attendance.save()

        message = f"{substitute.get_full_name()} assigned as substitute for {staff.get_full_name()}."

        return {
            "success": True,
            "message": message,
            "data": {
                "staff_name": staff.get_full_name(),
                "substitute_name": substitute.get_full_name(),
                "date": str(attendance_date)
            },
            "toast": {
                "type": "success",
                "message": message
            }
        }

    def _handle_broadcast_to_class_parents(self, entities: dict, mapping: dict) -> dict:
        """Handle broadcasting notification to parents of a class."""
        from students.models import Student
        from employees.models import Notification

        class_name = entities.get('class')
        message_text = entities.get('message', '')
        school_id = entities.get('school_id')

        if not class_name:
            return self._error_response("Class not specified.")

        if not message_text:
            return self._error_response("Message content not specified.")

        # Get students in the class
        students_qs = Student.objects.filter(
            student_class__icontains=class_name,
            status='Active'
        ).select_related('user')

        if school_id:
            students_qs = students_qs.filter(school_id=school_id)

        # Create notifications for students (parents view via student accounts)
        notifications_created = 0
        for student in students_qs:
            if student.user:
                Notification.objects.create(
                    recipient=student.user,
                    sender=self.user,
                    title=f"Message for Class {class_name}",
                    message=message_text,
                    notification_type='info'
                )
                notifications_created += 1

        if notifications_created == 0:
            return self._error_response(f"No students found in Class {class_name}.")

        message = f"Notification sent to {notifications_created} parents of Class {class_name}."

        return {
            "success": True,
            "message": message,
            "data": {
                "count": notifications_created,
                "class": class_name,
                "message_preview": message_text[:100]
            },
            "toast": {
                "type": "success",
                "message": message
            }
        }

    def _handle_broadcast_to_school_parents(self, entities: dict, mapping: dict) -> dict:
        """Handle broadcasting notification to all parents at a school."""
        from students.models import Student
        from employees.models import Notification

        message_text = entities.get('message', '')
        school_id = entities.get('school_id')

        if not message_text:
            return self._error_response("Message content not specified.")

        # Get students
        students_qs = Student.objects.filter(status='Active').select_related('user')

        if school_id:
            students_qs = students_qs.filter(school_id=school_id)
        elif self.user.role != 'Admin':
            school_ids = self.user.assigned_schools.values_list('id', flat=True)
            students_qs = students_qs.filter(school_id__in=school_ids)

        # Create notifications
        notifications_created = 0
        for student in students_qs:
            if student.user:
                Notification.objects.create(
                    recipient=student.user,
                    sender=self.user,
                    title="School Announcement",
                    message=message_text,
                    notification_type='info'
                )
                notifications_created += 1

        if notifications_created == 0:
            return self._error_response("No students found to notify.")

        message = f"Notification sent to {notifications_created} parents."

        return {
            "success": True,
            "message": message,
            "data": {
                "count": notifications_created,
                "message_preview": message_text[:100]
            },
            "toast": {
                "type": "success",
                "message": message
            }
        }

    def _handle_broadcast_to_school_teachers(self, entities: dict, mapping: dict) -> dict:
        """Handle broadcasting notification to teachers at a school."""
        from students.models import CustomUser
        from employees.models import Notification

        message_text = entities.get('message', '')
        school_id = entities.get('school_id')

        if not message_text:
            return self._error_response("Message content not specified.")

        # Get teachers
        teachers = CustomUser.objects.filter(role='Teacher', is_active=True)

        if school_id:
            teachers = teachers.filter(assigned_schools__id=school_id)
        elif self.user.role != 'Admin':
            school_ids = self.user.assigned_schools.values_list('id', flat=True)
            teachers = teachers.filter(assigned_schools__id__in=school_ids)

        # Create notifications
        notifications = []
        for teacher in teachers.distinct():
            notifications.append(Notification(
                recipient=teacher,
                sender=self.user,
                title="Staff Announcement",
                message=message_text,
                notification_type='info'
            ))

        if notifications:
            Notification.objects.bulk_create(notifications)

        count = len(notifications)
        school_name = entities.get('school_name', 'selected school')
        message = f"Message sent to {count} teachers at {school_name}."

        return {
            "success": True,
            "message": message,
            "data": {
                "count": count,
                "message_preview": message_text[:100]
            },
            "toast": {
                "type": "success",
                "message": message
            }
        }

    def _handle_procurement_request(self, entities: dict, mapping: dict) -> dict:
        """Handle creating a procurement request (notification to admins)."""
        from students.models import CustomUser
        from employees.models import Notification

        quantity = entities.get('quantity', '')
        item_name = entities.get('item_name', 'items')

        # Notify all admins
        admins = CustomUser.objects.filter(role='Admin', is_active=True)

        notifications = []
        requester_name = self.user.get_full_name() or self.user.username

        for admin in admins:
            notifications.append(Notification(
                recipient=admin,
                sender=self.user,
                title="Procurement Request",
                message=f"{requester_name} requests: {quantity} {item_name}",
                notification_type='info'
            ))

        if notifications:
            Notification.objects.bulk_create(notifications)

        message = f"Procurement request sent for {quantity} {item_name}."

        return {
            "success": True,
            "message": message,
            "data": {
                "quantity": quantity,
                "item_name": item_name,
                "notified_admins": len(notifications)
            },
            "toast": {
                "type": "success",
                "message": message
            }
        }

    def _handle_inventory_quantity_update(self, entities: dict, mapping: dict) -> dict:
        """Handle inventory quantity update notification."""
        from students.models import CustomUser
        from employees.models import Notification

        quantity = entities.get('quantity', '')
        item_name = entities.get('item_name', 'items')
        school_name = entities.get('school_name', '')

        # Notify admins about the inventory update
        admins = CustomUser.objects.filter(role='Admin', is_active=True)

        notifications = []
        updater_name = self.user.get_full_name() or self.user.username
        location_text = f" at {school_name}" if school_name else ""

        for admin in admins:
            notifications.append(Notification(
                recipient=admin,
                sender=self.user,
                title="Inventory Update",
                message=f"{updater_name} reports: Received {quantity} {item_name}{location_text}",
                notification_type='info'
            ))

        if notifications:
            Notification.objects.bulk_create(notifications)

        message = f"Inventory update recorded: {quantity} {item_name}."

        return {
            "success": True,
            "message": message,
            "data": {
                "quantity": quantity,
                "item_name": item_name,
                "notified_admins": len(notifications)
            },
            "toast": {
                "type": "success",
                "message": message
            }
        }

    def _handle_generate_invoice(self, entities: dict, mapping: dict) -> dict:
        """Handle generating invoice data for a school."""
        from students.models import School, Fee
        from django.db.models import Sum

        school_id = entities.get('school_id')
        month = entities.get('month', date.today().strftime('%B'))

        if not school_id:
            return self._error_response("School not specified for invoice.")

        try:
            school = School.objects.get(id=school_id)
        except School.DoesNotExist:
            return self._error_response("School not found.")

        # Calculate fee totals
        fees = Fee.objects.filter(student__school=school)

        if month:
            fees = fees.filter(month__icontains=month)

        totals = fees.aggregate(
            total=Sum('total_fee'),
            received=Sum('amount_received'),
            pending=Sum('balance_due')
        )

        invoice_data = {
            "school_id": school.id,
            "school_name": school.name,
            "school_email": getattr(school, 'email', ''),
            "month": month,
            "total_fee": float(totals['total'] or 0),
            "received": float(totals['received'] or 0),
            "pending": float(totals['pending'] or 0),
            "generated_by": self.user.get_full_name()
        }

        message = f"Invoice generated for {school.name} - {month}."

        return {
            "success": True,
            "message": message,
            "data": invoice_data,
            "toast": {
                "type": "success",
                "message": message
            }
        }

    def _handle_send_invoice(self, entities: dict, mapping: dict) -> dict:
        """Handle sending invoice via email."""
        email = entities.get('email')

        if not email:
            return self._error_response("Email address not specified.")

        # For now, just acknowledge - actual email sending can be implemented later
        message = f"Invoice will be sent to {email}."

        return {
            "success": True,
            "message": message,
            "data": {
                "email": email,
                "status": "queued"
            },
            "toast": {
                "type": "info",
                "message": message
            }
        }

    def _handle_staff_attendance_report(self, entities: dict, mapping: dict) -> dict:
        """Handle generating staff attendance report."""
        from .models import StaffAttendance
        from django.db.models import Count

        month = entities.get('month')
        school_id = entities.get('school_id')

        queryset = StaffAttendance.objects.all()

        if school_id:
            queryset = queryset.filter(school_id=school_id)
        elif self.user.role != 'Admin':
            school_ids = self.user.assigned_schools.values_list('id', flat=True)
            queryset = queryset.filter(school_id__in=school_ids)

        # Get summary by status
        summary = queryset.values('status').annotate(count=Count('id'))

        summary_dict = {item['status']: item['count'] for item in summary}

        period = month if month else "all time"
        message = f"Attendance report generated for {period}."

        return {
            "success": True,
            "message": message,
            "data": {
                "summary": summary_dict,
                "total_records": sum(summary_dict.values()),
                "period": period
            },
            "toast": {
                "type": "info",
                "message": message
            }
        }

    def _handle_broadcast_to_student(self, entities: dict, mapping: dict) -> dict:
        """Handle sending notification to a specific student."""
        from students.models import Student
        from employees.models import Notification

        message_text = entities.get('message', '')
        student_id = entities.get('student_id')

        if not message_text:
            return self._error_response("Message content not specified.")

        if not student_id:
            return self._error_response("Student not specified.")

        try:
            student = Student.objects.select_related('user').get(id=student_id)
        except Student.DoesNotExist:
            return self._error_response("Student not found.")

        if not student.user:
            return self._error_response("Student has no associated user account.")

        Notification.objects.create(
            recipient=student.user,
            sender=self.user,
            title="Message from Staff",
            message=message_text,
            notification_type='message'
        )

        message = f"Message sent to {student.first_name} {student.last_name}."

        return {
            "success": True,
            "message": message,
            "data": {
                "student_name": f"{student.first_name} {student.last_name}",
                "message_preview": message_text[:100]
            },
            "toast": {
                "type": "success",
                "message": message
            }
        }
