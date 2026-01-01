# ============================================
# EMAIL UTILITIES
# ============================================

from django.core.mail import send_mail
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags


def send_user_credentials_email(user, password, created_by_name):
    """
    Send email to newly created user with their credentials
    """
    subject = 'Your KoderKids ERP Account Has Been Created'
    
    html_message = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                <h2 style="color: #3B82F6; margin-bottom: 20px;">Welcome to KoderKids ERP!</h2>
                
                <p>Hello {user.first_name or user.username},</p>
                
                <p>An account has been created for you by <strong>{created_by_name}</strong>.</p>
                
                <div style="background-color: #F3F4F6; padding: 15px; border-radius: 5px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Username:</strong> {user.username}</p>
                    <p style="margin: 5px 0;"><strong>Email:</strong> {user.email}</p>
                    <p style="margin: 5px 0;"><strong>Temporary Password:</strong> <code style="background: #E5E7EB; padding: 2px 6px; border-radius: 3px;">{password}</code></p>
                    <p style="margin: 5px 0;"><strong>Role:</strong> {user.role}</p>
                </div>
                
                <p><strong>⚠️ Important:</strong> Please change your password after your first login for security purposes.</p>
                
                <p>You can log in at: <a href="{settings.FRONTEND_URL}/login" style="color: #3B82F6;">{settings.FRONTEND_URL}/login</a></p>
                
                <p style="margin-top: 30px;">Best regards,<br>KoderKids ERP Team</p>
                
                <hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;">
                <p style="font-size: 12px; color: #6B7280;">This is an automated message. Please do not reply to this email.</p>
            </div>
        </body>
    </html>
    """
    
    plain_message = strip_tags(html_message)
    
    try:
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
        return True
    except Exception as e:
        print(f"❌ Failed to send email to {user.email}: {str(e)}")
        return False


def send_password_reset_email(user, password, reset_by_name):
    """
    Send email when admin resets user's password
    """
    subject = 'Your Password Has Been Reset - KoderKids ERP'
    
    html_message = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                <h2 style="color: #DC2626; margin-bottom: 20px;">Password Reset Notification</h2>
                
                <p>Hello {user.first_name or user.username},</p>
                
                <p>Your password has been reset by <strong>{reset_by_name}</strong>.</p>
                
                <div style="background-color: #FEF2F2; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #DC2626;">
                    <p style="margin: 5px 0;"><strong>New Temporary Password:</strong> <code style="background: #FEE2E2; padding: 2px 6px; border-radius: 3px;">{password}</code></p>
                </div>
                
                <p><strong>⚠️ Security Notice:</strong></p>
                <ul>
                    <li>You have been logged out from all devices</li>
                    <li>Please change this password immediately after logging in</li>
                    <li>If you did not request this change, contact your administrator</li>
                </ul>
                
                <p>You can log in at: <a href="{settings.FRONTEND_URL}/login" style="color: #3B82F6;">{settings.FRONTEND_URL}/login</a></p>
                
                <p style="margin-top: 30px;">Best regards,<br>KoderKids ERP Team</p>
                
                <hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;">
                <p style="font-size: 12px; color: #6B7280;">This is an automated message. Please do not reply to this email.</p>
            </div>
        </body>
    </html>
    """
    
    plain_message = strip_tags(html_message)
    
    try:
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
        return True
    except Exception as e:
        print(f"❌ Failed to send email to {user.email}: {str(e)}")
        return False


def send_account_deactivated_email(user, deactivated_by_name):
    """
    Send email when user account is deactivated
    """
    subject = 'Your Account Has Been Deactivated - KoderKids ERP'
    
    html_message = f"""
    <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                <h2 style="color: #DC2626; margin-bottom: 20px;">Account Deactivation Notice</h2>
                
                <p>Hello {user.first_name or user.username},</p>
                
                <p>Your KoderKids ERP account has been deactivated by <strong>{deactivated_by_name}</strong>.</p>
                
                <div style="background-color: #FEF2F2; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #DC2626;">
                    <p style="margin: 0;"><strong>Status:</strong> Your account is no longer active</p>
                </div>
                
                <p>If you believe this is a mistake or need to reactivate your account, please contact your system administrator.</p>
                
                <p style="margin-top: 30px;">Best regards,<br>KoderKids ERP Team</p>
                
                <hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;">
                <p style="font-size: 12px; color: #6B7280;">This is an automated message. Please do not reply to this email.</p>
            </div>
        </body>
    </html>
    """
    
    plain_message = strip_tags(html_message)
    
    try:
        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            html_message=html_message,
            fail_silently=False,
        )
        return True
    except Exception as e:
        print(f"❌ Failed to send email to {user.email}: {str(e)}")
        return False