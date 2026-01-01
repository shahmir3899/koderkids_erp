# backend/authentication/email_utils.py
"""
Email utilities for user management system
Handles sending various types of emails to users
"""

from django.core.mail import send_mail, EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


def send_welcome_email(user, password, request=None):
    """
    Send welcome email to newly created user with credentials
    
    Args:
        user: CustomUser object
        password: Plain text password (auto-generated)
        request: HTTP request object (optional, for getting domain)
    
    Returns:
        bool: True if email sent successfully, False otherwise
    """
    try:
        # Get frontend URL
        frontend_url = settings.FRONTEND_URL
        
        # Email subject
        subject = 'Welcome to KoderKids ERP - Your Account Details'
        
        # Email context
        context = {
            'user': user,
            'username': user.username,
            'password': password,
            'login_url': frontend_url,
            'role': user.role,
        }
        
        # Render HTML email
        html_message = render_to_string('emails/welcome_email.html', context)
        plain_message = strip_tags(html_message)
        
        # Send email
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email] if user.email else [],
            html_message=html_message,
            fail_silently=False,
        )
        
        logger.info(f"Welcome email sent to {user.username} ({user.email})")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send welcome email to {user.username}: {str(e)}")
        return False


def send_password_reset_email(user, new_password):
    """
    Send email when password is reset by admin
    
    Args:
        user: CustomUser object
        new_password: New plain text password
    
    Returns:
        bool: True if email sent successfully, False otherwise
    """
    try:
        frontend_url = settings.FRONTEND_URL
        
        subject = 'Your Password Has Been Reset - KoderKids ERP'
        
        context = {
            'user': user,
            'username': user.username,
            'new_password': new_password,
            'login_url': frontend_url,
        }
        
        html_message = render_to_string('emails/password_reset_email.html', context)
        plain_message = strip_tags(html_message)
        
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email] if user.email else [],
            html_message=html_message,
            fail_silently=False,
        )
        
        logger.info(f"Password reset email sent to {user.username} ({user.email})")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send password reset email to {user.username}: {str(e)}")
        return False


def send_school_assignment_email(user, school_names):
    """
    Send email when teacher is assigned to schools
    
    Args:
        user: CustomUser object
        school_names: List of school names
    
    Returns:
        bool: True if email sent successfully, False otherwise
    """
    try:
        subject = 'School Assignment Update - KoderKids ERP'
        
        context = {
            'user': user,
            'username': user.username,
            'schools': school_names,
            'school_count': len(school_names),
        }
        
        html_message = render_to_string('emails/school_assignment_email.html', context)
        plain_message = strip_tags(html_message)
        
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email] if user.email else [],
            html_message=html_message,
            fail_silently=False,
        )
        
        logger.info(f"School assignment email sent to {user.username} ({user.email})")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send school assignment email to {user.username}: {str(e)}")
        return False


def send_account_status_email(user, is_active):
    """
    Send email when account is activated or deactivated
    
    Args:
        user: CustomUser object
        is_active: Boolean indicating if account is active
    
    Returns:
        bool: True if email sent successfully, False otherwise
    """
    try:
        status = "Activated" if is_active else "Deactivated"
        subject = f'Account {status} - KoderKids ERP'
        
        context = {
            'user': user,
            'username': user.username,
            'is_active': is_active,
            'status': status,
        }
        
        html_message = render_to_string('emails/account_status_email.html', context)
        plain_message = strip_tags(html_message)
        
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email] if user.email else [],
            html_message=html_message,
            fail_silently=False,
        )
        
        logger.info(f"Account status email sent to {user.username} ({user.email})")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send account status email to {user.username}: {str(e)}")
        return False

# backend/authentication/email_utils.py
# ADD THIS NEW FUNCTION

def send_account_update_email(user, changes, updated_by_name):
    """
    Send email notification when user account is updated
    
    Args:
        user: CustomUser instance
        changes: dict of what changed (e.g., {'email': 'old@example.com → new@example.com'})
        updated_by_name: Name of admin who made changes
    """
    if not user.email:
        return False
    
    try:
        subject = 'Your Account Has Been Updated - KoderKids ERP'
        
        # Build changes list
        change_list = []
        for field, change in changes.items():
            change_list.append(f"• {field}: {change}")
        
        context = {
            'user': user,
            'username': user.username,
            'changes': change_list,
            'updated_by': updated_by_name,
            'login_url': settings.FRONTEND_URL,
        }
        
        html_message = render_to_string('emails/account_update_email.html', context)
        plain_message = strip_tags(html_message)
        
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
        
        logger.info(f"Account update email sent to {user.email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send account update email to {user.email}: {e}")
        return False

def test_email_configuration():
    """
    Test email configuration by sending a test email
    
    Returns:
        dict: Result with success status and message
    """
    try:
        subject = 'Test Email - KoderKids ERP'
        message = 'This is a test email to verify email configuration is working correctly.'
        
        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[settings.EMAIL_HOST_USER],
            fail_silently=False,
        )
        
        return {
            'success': True,
            'message': f'Test email sent successfully to {settings.EMAIL_HOST_USER}'
        }
        
    except Exception as e:
        return {
            'success': False,
            'message': f'Failed to send test email: {str(e)}'
        }
    
    # ============================================
# UPDATE: backend/authentication/email_utils.py
# ADD this NEW FUNCTION at the END of the file
# ============================================

# Copy and paste this code at the VERY END of your email_utils.py file
# (after the test_email_configuration function)


# ============================================
# NEW EMAIL FUNCTION (Add at the end of the file)
# ============================================

def send_password_reset_link_email(user, uid, token):
    """
    Send password reset link to user (for self-service reset)
    Different from admin-initiated password reset
    
    Args:
        user: CustomUser instance
        uid: URL-safe base64 encoded user ID
        token: Password reset token
    
    Returns:
        bool: True if email sent successfully
    """
    try:
        # Build reset URL
        frontend_url = settings.FRONTEND_URL
        reset_url = f"{frontend_url}/reset-password/{uid}/{token}"
        
        subject = 'Reset Your KoderKids Password'
        
        context = {
            'user': user,
            'user_name': user.first_name or user.username,
            'reset_url': reset_url,
            'expiry_hours': 1,  # Token expires in 1 hour
        }
        
        # Render HTML email
        html_message = render_to_string('emails/password_reset_link_email.html', context)
        plain_message = strip_tags(html_message)
        
        # Send email
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email] if user.email else [],
            html_message=html_message,
            fail_silently=False,
        )
        
        logger.info(f"Password reset link sent to {user.username} ({user.email})")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send password reset link to {user.username}: {str(e)}")
        return False


# ============================================
# END OF NEW CODE
# ============================================