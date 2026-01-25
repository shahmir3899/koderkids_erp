from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import Task

User = get_user_model()


class TaskSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True)
    assigned_by_name = serializers.CharField(source='assigned_by.get_full_name', read_only=True)
    assigned_to_email = serializers.CharField(source='assigned_to.email', read_only=True)
    assigned_by_email = serializers.CharField(source='assigned_by.email', read_only=True)
    is_overdue = serializers.SerializerMethodField()
    priority_color = serializers.SerializerMethodField()
    status_color = serializers.SerializerMethodField()
    
    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'assigned_to', 'assigned_to_name', 
            'assigned_to_email', 'assigned_by', 'assigned_by_name', 
            'assigned_by_email', 'priority', 'task_type', 'status', 
            'assigned_date', 'due_date', 'completed_date', 'completion_answer',
            'created_at', 'updated_at', 'is_overdue', 'priority_color', 'status_color'
        ]
        read_only_fields = ['assigned_date', 'completed_date', 'created_at', 'updated_at']
    
    def get_is_overdue(self, obj):
        return obj.is_overdue()
    
    def get_priority_color(self, obj):
        colors = {
            'low': '#10B981',
            'medium': '#3B82F6', 
            'high': '#F59E0B',
            'urgent': '#EF4444'
        }
        return colors.get(obj.priority, '#6B7280')
    
    def get_status_color(self, obj):
        colors = {
            'pending': '#6B7280',
            'in_progress': '#3B82F6',
            'completed': '#10B981',
            'overdue': '#EF4444'
        }
        return colors.get(obj.status, '#6B7280')


class TaskCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = [
            'title', 'description', 'assigned_to', 'priority', 'task_type', 
            'status', 'due_date'
        ]
    
    def create(self, validated_data):
        assigned_by = self.context['request'].user
        validated_data['assigned_by'] = assigned_by
        return super().create(validated_data)


class TaskUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = [
            'title', 'description', 'priority', 'task_type', 'status', 
            'due_date', 'completion_answer'
        ]


class TaskStatusUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = ['status', 'completion_answer']


class TaskListSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True)
    assigned_to_role = serializers.CharField(source='assigned_to.role', read_only=True)
    assigned_by_name = serializers.CharField(source='assigned_by.get_full_name', read_only=True)
    assigned_by_role = serializers.CharField(source='assigned_by.role', read_only=True)
    is_overdue = serializers.BooleanField(read_only=True)
    priority_color = serializers.CharField(read_only=True)
    status_color = serializers.CharField(read_only=True)

    class Meta:
        model = Task
        fields = [
            'id', 'title', 'description', 'assigned_to_name', 'assigned_to_role',
            'assigned_by_name', 'assigned_by_role', 'priority', 'task_type', 'status',
            'due_date', 'created_at', 'is_overdue', 'priority_color', 'status_color'
        ]