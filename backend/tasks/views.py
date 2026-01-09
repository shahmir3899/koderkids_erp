from rest_framework import viewsets, status, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from django_filters.rest_framework import DjangoFilterBackend
from .models import Task
from .serializers import (
    TaskSerializer, TaskCreateSerializer, TaskUpdateSerializer,
    TaskStatusUpdateSerializer, TaskListSerializer
)
from .emails import send_task_assignment_email
import logging

logger = logging.getLogger(__name__)
User = get_user_model()


class TaskViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'priority', 'task_type']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'due_date', 'priority']
    ordering = ['-created_at']
    
    def get_queryset(self):
        user = self.request.user
        queryset = Task.objects.select_related('assigned_to', 'assigned_by')
        
        # Admin can see all tasks, others see only their assigned tasks
        if user.role == 'Admin':
            return queryset
        else:
            return queryset.filter(assigned_to=user)
    
    def get_serializer_class(self):
        if self.action == 'create':
            return TaskCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return TaskUpdateSerializer
        elif self.action == 'update_status':
            return TaskStatusUpdateSerializer
        elif self.action == 'list':
            return TaskListSerializer
        return TaskSerializer
    
    def perform_create(self, serializer):
        task = serializer.save(assigned_by=self.request.user)
        # Send email notification to assignee
        try:
            send_task_assignment_email(task)
            logger.info(f"✅ Task assignment email sent for task {task.id}")
        except Exception as e:
            logger.error(f"❌ Failed to send task assignment email: {e}")
            # Don't fail the request if email fails
    
    @action(detail=False, methods=['get'])
    def my_tasks(self, request):
        """Get current user's assigned tasks"""
        tasks = Task.objects.filter(assigned_to=request.user).select_related('assigned_by')
        serializer = TaskListSerializer(tasks, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get task statistics for admin dashboard"""
        if request.user.role != 'Admin':
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        tasks = Task.objects.all()
        stats = {
            'total': tasks.count(),
            'pending': tasks.filter(status='pending').count(),
            'in_progress': tasks.filter(status='in_progress').count(),
            'completed': tasks.filter(status='completed').count(),
            'overdue': tasks.filter(status='overdue').count(),
        }
        
        # Priority breakdown
        priority_stats = {
            'low': tasks.filter(priority='low').count(),
            'medium': tasks.filter(priority='medium').count(),
            'high': tasks.filter(priority='high').count(),
            'urgent': tasks.filter(priority='urgent').count(),
        }
        
        return Response({
            'status_stats': stats,
            'priority_stats': priority_stats
        })
    
    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        """Update task status and completion answer"""
        try:
            task = Task.objects.get(pk=pk)
        except Task.DoesNotExist:
            return Response(
                {'error': 'Task not found'}, 
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Only assigned user or admin can update status
        if request.user != task.assigned_to and request.user.role != 'Admin':
            return Response(
                {'error': 'Permission denied'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        serializer = TaskStatusUpdateSerializer(task, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(TaskSerializer(task).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['post'])
    def assign_to_all(self, request):
        """Assign task to all active employees (Admin only)"""
        # Exact notification permission check pattern
        if request.user.role != 'Admin':
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        
        # Validate required fields (notification pattern)
        title = request.data.get('title')
        if not title:
            return Response(
                {'error': 'Title is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Improved datetime validation pattern using Django utilities
        due_date = request.data.get('due_date')
        if due_date and isinstance(due_date, str):
            due_date = parse_datetime(due_date)
            if not due_date:
                return Response(
                    {'error': 'Invalid due_date format. Use ISO format (2026-01-15T10:30:00Z)'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Exact notification employee filtering pattern
        employees = User.objects.filter(role__in=['Admin', 'Teacher', 'BDM'], is_active=True)
        
        # Exact notification bulk_create pattern
        tasks_to_create = []
        for employee in employees:
            tasks_to_create.append(Task(
                title=title,
                description=request.data.get('description', ''),
                priority=request.data.get('priority', 'medium'),
                task_type=request.data.get('task_type', 'general'),
                due_date=due_date,
                status='pending',
                assigned_to=employee,
                assigned_by=request.user
            ))
        
        created_tasks = Task.objects.bulk_create(tasks_to_create)
        
        # Send emails to all assigned employees
        email_count = 0
        for task in created_tasks:
            try:
                if send_task_assignment_email(task):
                    email_count += 1
            except Exception as e:
                logger.error(f"Failed to send email for task {task.id}: {e}")
        
        logger.info(f"✅ Bulk task assigned to {len(created_tasks)} employees, {email_count} emails sent")
        
        # Exact notification response pattern
        return Response({
            'message': f'Task assigned to {len(created_tasks)} employees. {email_count} notification emails sent.',
            'count': len(created_tasks),
            'emails_sent': email_count
        }, status=status.HTTP_201_CREATED)