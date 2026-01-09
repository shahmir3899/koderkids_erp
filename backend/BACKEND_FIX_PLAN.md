# Backend Task Management - Fix Plan

## 🔴 CRITICAL Issues (Fix First)

### 1. Model Indentation Error - BLOCKS FUNCTIONALITY
**File**: backend/tasks/models.py (Lines 70-90)
**Problem**: `save()` and `is_overdue()` methods are NOT indented under Task class

**Current (BROKEN)**:
```python
class Task(models.Model):
    # ... fields ...
    
    def __str__(self):
        return f"{self.title} - {self.assigned_to.get_full_name()}"
    
def save(self, *args, **kwargs):  # ← WRONG: Not indented, not part of class
    # ...
```

**Fix**: Indent both methods to be class members:
```python
class Task(models.Model):
    # ... all fields ...
    
    def __str__(self):
        return f"{self.title} - {self.assigned_to.get_full_name()}"
    
    def save(self, *args, **kwargs):  # ← FIXED: Now inside class
        # ... existing logic ...
    
    def is_overdue(self):  # ← FIXED: Now inside class
        if self.due_date and self.status not in ['completed']:
            return timezone.now() > self.due_date
        return False
```

**Testing**: Run `python manage.py shell` and test: `Task.objects.create(...)`

---

### 2. Missing Serializer Attribute Methods
**File**: backend/tasks/serializers.py (Lines 13-18)
**Problem**: Fields declared but never computed from model

**Current**:
```python
is_overdue = serializers.BooleanField(read_only=True)
priority_color = serializers.CharField(read_only=True)
status_color = serializers.CharField(read_only=True)
```

**Fix**: Add SerializerMethodField and compute methods:
```python
class TaskSerializer(serializers.ModelSerializer):
    assigned_to_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True)
    assigned_by_name = serializers.CharField(source='assigned_by.get_full_name', read_only=True)
    assigned_to_email = serializers.CharField(source='assigned_to.email', read_only=True)
    assigned_by_email = serializers.CharField(source='assigned_by.email', read_only=True)
    
    # Change these:
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
    
    # Add these methods:
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
```

**Testing**: `GET /api/tasks/` should return color fields in each task

---

## 🟡 HIGH Priority Issues

### 3. Fragile DateTime Parsing
**File**: backend/tasks/views.py (Lines 112-118)
**Problem**: Manual timezone handling brittle, fails on format variations

**Current**:
```python
due_date = request.data.get('due_date')
if due_date and isinstance(due_date, str):
    try:
        from datetime import datetime
        due_date = datetime.fromisoformat(due_date.replace('Z', '+00:00'))
    except ValueError:
        return Response({'error': 'Invalid due_date format'}, status=400)
```

**Fix**: Use Django utilities:
```python
from django.utils.dateparse import parse_datetime

due_date = request.data.get('due_date')
if due_date and isinstance(due_date, str):
    due_date = parse_datetime(due_date)
    if not due_date:
        return Response(
            {'error': 'Invalid due_date format. Use ISO format (2026-01-15T10:30:00Z)'},
            status=status.HTTP_400_BAD_REQUEST
        )
```

**Testing**: Test with various formats: `2026-01-15`, `2026-01-15T10:30:00Z`, `2026-01-15 10:30:00`

---

### 4. Auto-Overdue Status Logic Needs Review
**File**: backend/tasks/models.py (Lines 75-85)
**Problem**: Automatically changing status might not be desired; users want manual control

**Recommendation (Choose Option B - Better UX)**: Don't auto-change; use `is_overdue` property only
```python
def save(self, *args, **kwargs):
    from datetime import datetime
    
    # Set completed_date when marking complete
    if self.status == 'completed' and not self.completed_date:
        self.completed_date = timezone.now()
    elif self.status != 'completed':
        self.completed_date = None
    
    # DON'T auto-change status to overdue - let users decide
    super().save(*args, **kwargs)

def is_overdue(self):
    """Check if task is overdue without changing status"""
    if self.due_date and self.status not in ['completed']:
        return timezone.now() > self.due_date
    return False
```

---

### 5. Missing Email Notifications
**File**: backend/tasks/views.py (Lines 40-45)
**Problem**: When tasks assigned, assignee gets no notification

**Fix**: Send email + in-app notification:

1. Create backend/tasks/emails.py:
```python
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

def send_task_assignment_email(task):
    """Send email to task assignee"""
    subject = f"New Task Assigned: {task.title}"
    
    context = {
        'task': task,
        'assigned_by': task.assigned_by.get_full_name(),
        'due_date': task.due_date.strftime('%B %d, %Y %I:%M %p') if task.due_date else 'No due date',
        'priority': task.get_priority_display(),
    }
    
    html_message = render_to_string('tasks/task_assignment_email.html', context)
    plain_message = f"You have been assigned a new task: {task.title}"
    
    try:
        send_mail(
            subject,
            plain_message,
            settings.DEFAULT_FROM_EMAIL,
            [task.assigned_to.email],
            html_message=html_message,
            fail_silently=False,
        )
        logger.info(f"Task assignment email sent to {task.assigned_to.email} for task {task.id}")
    except Exception as e:
        logger.error(f"Failed to send task assignment email: {e}")
```

2. Update views.py:
```python
from .emails import send_task_assignment_email
import logging

logger = logging.getLogger(__name__)

def perform_create(self, serializer):
    task = serializer.save(assigned_by=self.request.user)
    try:
        send_task_assignment_email(task)
    except Exception as e:
        logger.error(f"Failed to send task assignment email: {e}")
        # Don't fail the request, just log it

# In assign_to_all method, after creating tasks:
created_tasks = Task.objects.bulk_create(tasks_to_create)

# Send emails to all assigned employees
for task in created_tasks:
    try:
        send_task_assignment_email(task)
    except Exception as e:
        logger.error(f"Failed to send email for task {task.id}: {e}")

return Response({
    'message': f'Task assigned to {len(created_tasks)} employees',
    'count': len(created_tasks)
}, status=status.HTTP_201_CREATED)
```

**Testing**: Create task, check assignee's email inbox

---

### 6. No Audit Trail for Changes
**File**: backend/tasks/models.py
**Problem**: No record of who changed status, when, or why

**Better Option**: Create TaskHistory model:
```python
class TaskHistory(models.Model):
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='history')
    changed_by = models.ForeignKey(User, on_delete=models.CASCADE)
    changed_at = models.DateTimeField(auto_now_add=True)
    old_status = models.CharField(max_length=15, null=True, blank=True)
    new_status = models.CharField(max_length=15, null=True, blank=True)
    change_summary = models.TextField()
    
    class Meta:
        ordering = ['-changed_at']
    
    def __str__(self):
        return f"{self.task.title} - {self.change_summary}"
```

Then in Task.save():
```python
def save(self, *args, **kwargs):
    # Track status changes
    try:
        old_instance = Task.objects.get(pk=self.pk)
        old_status = old_instance.status
    except Task.DoesNotExist:
        old_status = None
    
    # ... existing logic ...
    
    super().save(*args, **kwargs)
    
    # Log status change if status changed
    if old_status and old_status != self.status:
        # Create history record (requires request user - see below)
        pass
```

**Migration needed**: `python manage.py makemigrations && python manage.py migrate`

---

### 7. Improve Queryset Optimization
**File**: backend/tasks/views.py (Lines 18-24)

**Better**:
```python
def get_queryset(self):
    user = self.request.user
    queryset = Task.objects.select_related(
        'assigned_to', 
        'assigned_by'
    )
    
    if user.role == 'Admin':
        return queryset
    else:
        return queryset.filter(assigned_to=user)
```

---

### 8. Add Task Filters to ViewSet
**File**: backend/tasks/views.py

**Add imports**:
```python
from rest_framework import filters
from django_filters.rest_framework import DjangoFilterBackend
```

**Add to class**:
```python
class TaskViewSet(viewsets.ModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'priority', 'task_type']
    search_fields = ['title', 'description']
    ordering_fields = ['created_at', 'due_date', 'priority']
    ordering = ['-created_at']
    
    # ... rest of class
```

**Install**: `pip install django-filter`

**Add to settings.py**:
```python
INSTALLED_APPS = [
    # ...
    'django_filters',
    # ...
]

REST_FRAMEWORK = {
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend'
    ]
}
```

**Testing**: `GET /api/tasks/?status=pending&priority=high`

---

## Testing Checklist

- [ ] Model indentation fixed - test `Task.objects.create()`
- [ ] Serializer colors return correctly - test task list endpoint
- [ ] DateTime parsing handles multiple formats
- [ ] Email sent when task created
- [ ] Email sent when bulk assigned
- [ ] Status updates don't auto-change to overdue
- [ ] Queryset optimization working (check query count)
- [ ] Filters work: status, priority, task_type
- [ ] Search works: find by title/description

---

## Deployment Order

1. Fix model indentation (CRITICAL)
2. Fix serializer attributes
3. Improve datetime parsing
4. Review & choose overdue strategy
5. Add email notifications + migrations
6. Add audit trail (if using TaskHistory model)
7. Add filters & search
8. Optimize querysets
