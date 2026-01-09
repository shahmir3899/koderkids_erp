"""
Task email notifications
"""
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


def send_task_assignment_email(task):
    """
    Send email to task assignee when task is assigned
    
    Args:
        task (Task): Task instance
    """
    subject = f"New Task Assigned: {task.title}"
    
    context = {
        'task': task,
        'assigned_by': task.assigned_by.get_full_name(),
        'due_date': task.due_date.strftime('%B %d, %Y %I:%M %p') if task.due_date else 'No due date',
        'priority': task.get_priority_display(),
        'task_url': f"{settings.FRONTEND_URL}/tasks/{task.id}" if hasattr(settings, 'FRONTEND_URL') else '',
    }
    
    # Create plain text message
    plain_message = f"""
New Task Assigned: {task.title}

Assigned by: {context['assigned_by']}
Priority: {context['priority']}
Due Date: {context['due_date']}
Description: {task.description or 'No description provided'}
    """
    
    try:
        # Try to render HTML template if it exists
        try:
            html_message = render_to_string('tasks/task_assignment_email.html', context)
        except:
            # Fallback if template doesn't exist
            html_message = f"""
<html>
<body>
<h2>New Task Assigned: {task.title}</h2>
<p><strong>Assigned by:</strong> {context['assigned_by']}</p>
<p><strong>Priority:</strong> {context['priority']}</p>
<p><strong>Due Date:</strong> {context['due_date']}</p>
<p><strong>Description:</strong> {task.description or 'No description provided'}</p>
</body>
</html>
            """
        
        send_mail(
            subject,
            plain_message,
            settings.DEFAULT_FROM_EMAIL,
            [task.assigned_to.email],
            html_message=html_message,
            fail_silently=False,
        )
        logger.info(f"✅ Task assignment email sent to {task.assigned_to.email} for task '{task.title}' (ID: {task.id})")
        return True
        
    except Exception as e:
        logger.error(f"❌ Failed to send task assignment email for task {task.id}: {str(e)}")
        return False
