from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()


class Task(models.Model):
    PRIORITY_CHOICES = [
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('urgent', 'Urgent'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('overdue', 'Overdue'),
    ]
    
    TASK_TYPE_CHOICES = [
        ('general', 'General'),
        ('academic', 'Academic'),
        ('administrative', 'Administrative'),
    ]
    
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    assigned_to = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='assigned_tasks'
    )
    assigned_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='created_tasks'
    )
    priority = models.CharField(
        max_length=10,
        choices=PRIORITY_CHOICES,
        default='medium'
    )
    task_type = models.CharField(
        max_length=15,
        choices=TASK_TYPE_CHOICES,
        default='general'
    )
    status = models.CharField(
        max_length=15,
        choices=STATUS_CHOICES,
        default='pending'
    )
    assigned_date = models.DateTimeField(auto_now_add=True)
    due_date = models.DateTimeField(null=True, blank=True)
    completed_date = models.DateTimeField(null=True, blank=True)
    completion_answer = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['assigned_to', 'status']),
            models.Index(fields=['status', 'due_date']),
            models.Index(fields=['assigned_by']),
        ]
    
    def __str__(self):
        return f"{self.title} - {self.assigned_to.get_full_name()}"
    
def save(self, *args, **kwargs):
        from datetime import datetime
        
        # Set completed_date when status is changed to completed
        if self.status == 'completed' and not self.completed_date:
            self.completed_date = timezone.now()
        elif self.status != 'completed':
            self.completed_date = None
        
        # Check if task is overdue
        if self.due_date and self.status not in ['completed', 'overdue']:
            # Handle string datetime comparison
            due_date = self.due_date
            if isinstance(due_date, str):
                try:
                    due_date = datetime.fromisoformat(due_date.replace('Z', '+00:00'))
                except ValueError:
                    pass  # Keep original if parsing fails
            
            if isinstance(due_date, datetime) and timezone.now() > due_date:
                self.status = 'overdue'
        
        super().save(*args, **kwargs)

    @property
    def is_overdue(self):
        if self.due_date and self.status not in ['completed']:
            return timezone.now() > self.due_date
        return False
    
    def get_priority_color(self):
        colors = {
            'low': '#10B981',
            'medium': '#3B82F6', 
            'high': '#F59E0B',
            'urgent': '#EF4444'
        }
        return colors.get(self.priority, '#6B7280')
    
    def get_status_color(self):
        colors = {
            'pending': '#6B7280',
            'in_progress': '#3B82F6',
            'completed': '#10B981',
            'overdue': '#EF4444'
        }
        return colors.get(self.status, '#6B7280')
