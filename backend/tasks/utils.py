"""
Tasks utility functions following notification system patterns
"""

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.response import Response

User = get_user_model()


class UserFilterService:
    """User filtering service following notification system patterns"""
    
    @staticmethod
    def get_active_employees():
        """Get all active employees (Admin, Teacher, BDM)"""
        return User.objects.filter(
            role__in=['Admin', 'Teacher', 'BDM'], 
            is_active=True
        )
    
    @staticmethod
    def get_teachers():
        """Get all active teachers"""
        return User.objects.filter(
            role='Teacher',
            is_active=True
        )
    
    @staticmethod
    def get_users_by_role(roles):
        """Get users by specified roles"""
        return User.objects.filter(
            role__in=roles,
            is_active=True
        )


class BulkOperationService:
    """Bulk operation service following notification system patterns"""
    
    def __init__(self, model):
        self.model = model
    
    def create_bulk_objects(self, object_data_list):
        """Create objects in bulk following notification pattern"""
        objects_to_create = []
        for object_data in object_data_list:
            objects_to_create.append(self.model(**object_data))
        return self.model.objects.bulk_create(objects_to_create)


class TaskAPIResponse:
    """Standardized API response format following notification patterns"""
    
    @staticmethod
    def success(data=None, message=None):
        """Return success response"""
        response_data = {'success': True}
        if data:
            response_data['data'] = data
        if message:
            response_data['message'] = message
        return Response(response_data)
    
    @staticmethod
    def error(message, status_code=status.HTTP_400_BAD_REQUEST):
        """Return error response"""
        return Response({
            'success': False,
            'error': message
        }, status=status_code)
    
    @staticmethod
    def permission_denied():
        """Standard permission denied response"""
        return TaskAPIResponse.error(
            'Permission denied', 
            status.HTTP_403_FORBIDDEN
        )
    
    @staticmethod
    def not_found():
        """Standard not found response"""
        return TaskAPIResponse.error(
            'Resource not found', 
            status.HTTP_404_NOT_FOUND
        )


class DateTimeValidator:
    """DateTime validation utility following notification patterns"""
    
    @staticmethod
    def validate_due_date(due_date):
        """Validate and convert due date string to datetime object"""
        if not due_date:
            return None, None
        
        # If already datetime, return as is
        if hasattr(due_date, 'year'):
            return due_date, None
        
        # If string, try to convert
        if isinstance(due_date, str):
            try:
                from datetime import datetime
                # Handle ISO format with timezone
                clean_date = due_date.replace('Z', '+00:00')
                return datetime.fromisoformat(clean_date), None
            except ValueError:
                return None, 'Invalid due_date format. Use ISO format (YYYY-MM-DDTHH:MM:SS)'
        
        return None, 'Invalid due_date type. Expected string or datetime object'


def get_task_by_id(task_id):
    """Get task by ID following notification pattern"""
    try:
        from .models import Task
        return Task.objects.get(pk=task_id), None
    except Task.DoesNotExist:
        return None, 'Task not found'