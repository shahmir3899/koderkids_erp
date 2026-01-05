# ============================================
# CRM EMAIL UTILITIES
# ============================================

from django.core.mail import send_mail
from django.conf import settings
from django.utils.html import strip_tags
import logging

logger = logging.getLogger(__name__)


def send_lead_assignment_email(lead, bdm_user, assigned_by_name):
    """
    Send email to BDM when a new lead is assigned to them

    Args:
        lead: Lead object
        bdm_user: CustomUser object (BDM being assigned)
        assigned_by_name: Name of admin who assigned the lead

    Returns:
        bool: True if email sent successfully
    """
    if not bdm_user.email:
        logger.warning(f"BDM {bdm_user.username} has no email address")
        return False

    try:
        subject = 'New Lead Assigned to You - KoderKids ERP'

        # Build lead details
        lead_name = lead.school_name or lead.phone or f"Lead #{lead.id}"

        html_message = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                    <h2 style="color: #3B82F6; margin-bottom: 20px;">New Lead Assigned</h2>

                    <p>Hello {bdm_user.first_name or bdm_user.username},</p>

                    <p>A new lead has been assigned to you by <strong>{assigned_by_name}</strong>.</p>

                    <div style="background-color: #EFF6FF; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #3B82F6;">
                        <h3 style="margin-top: 0; color: #1E40AF;">Lead Details</h3>
                        <p style="margin: 5px 0;"><strong>Lead:</strong> {lead_name}</p>
                        {f'<p style="margin: 5px 0;"><strong>School Name:</strong> {lead.school_name}</p>' if lead.school_name else ''}
                        {f'<p style="margin: 5px 0;"><strong>Phone:</strong> {lead.phone}</p>' if lead.phone else ''}
                        {f'<p style="margin: 5px 0;"><strong>Email:</strong> {lead.email}</p>' if lead.email else ''}
                        {f'<p style="margin: 5px 0;"><strong>Contact Person:</strong> {lead.contact_person}</p>' if lead.contact_person else ''}
                        {f'<p style="margin: 5px 0;"><strong>City:</strong> {lead.city}</p>' if lead.city else ''}
                        <p style="margin: 5px 0;"><strong>Status:</strong> <span style="background: #FEF3C7; padding: 2px 8px; border-radius: 3px;">{lead.status}</span></p>
                        <p style="margin: 5px 0;"><strong>Source:</strong> {lead.lead_source}</p>
                        {f'<p style="margin: 5px 0;"><strong>Estimated Students:</strong> {lead.estimated_students}</p>' if lead.estimated_students else ''}
                    </div>

                    {f'<div style="background-color: #F3F4F6; padding: 12px; border-radius: 5px; margin: 15px 0;"><p style="margin: 0;"><strong>Notes:</strong> {lead.notes}</p></div>' if lead.notes else ''}

                    <p style="margin-top: 20px;"><strong>Next Steps:</strong></p>
                    <ul>
                        <li>Review the lead details carefully</li>
                        <li>Schedule a follow-up activity (call or meeting)</li>
                        <li>Update lead status as you progress</li>
                    </ul>

                    <p>Access your CRM dashboard: <a href="{settings.FRONTEND_URL}/crm/leads" style="color: #3B82F6;">{settings.FRONTEND_URL}/crm/leads</a></p>

                    <p style="margin-top: 30px;">Best regards,<br>KoderKids ERP Team</p>

                    <hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;">
                    <p style="font-size: 12px; color: #6B7280;">This is an automated notification. Please do not reply to this email.</p>
                </div>
            </body>
        </html>
        """

        plain_message = strip_tags(html_message)

        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[bdm_user.email],
            html_message=html_message,
            fail_silently=False,
        )

        logger.info(f"Lead assignment email sent to {bdm_user.email} for lead #{lead.id}")
        return True

    except Exception as e:
        logger.error(f"Failed to send lead assignment email to {bdm_user.email}: {str(e)}")
        return False


def send_activity_scheduled_email(activity, bdm_user):
    """
    Send email to BDM when an activity is scheduled for them

    Args:
        activity: Activity object
        bdm_user: CustomUser object (BDM assigned to activity)

    Returns:
        bool: True if email sent successfully
    """
    if not bdm_user.email:
        logger.warning(f"BDM {bdm_user.username} has no email address")
        return False

    try:
        subject = f'{activity.activity_type} Scheduled - KoderKids ERP'

        # Format scheduled date
        from django.utils import timezone
        scheduled_dt = activity.scheduled_date
        if scheduled_dt:
            formatted_date = scheduled_dt.strftime('%B %d, %Y at %I:%M %p')
        else:
            formatted_date = 'Not specified'

        # Lead name
        lead_name = activity.lead.school_name or activity.lead.phone or f"Lead #{activity.lead.id}"

        html_message = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
                    <h2 style="color: #7C3AED; margin-bottom: 20px;">New {activity.activity_type} Scheduled</h2>

                    <p>Hello {bdm_user.first_name or bdm_user.username},</p>

                    <p>A new <strong>{activity.activity_type.lower()}</strong> has been scheduled for you.</p>

                    <div style="background-color: #F5F3FF; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #7C3AED;">
                        <h3 style="margin-top: 0; color: #5B21B6;">Activity Details</h3>
                        <p style="margin: 5px 0;"><strong>Type:</strong> {activity.activity_type}</p>
                        <p style="margin: 5px 0;"><strong>Subject:</strong> {activity.subject}</p>
                        <p style="margin: 5px 0;"><strong>Lead:</strong> {lead_name}</p>
                        <p style="margin: 5px 0;"><strong>Scheduled:</strong> <span style="background: #FEF3C7; padding: 2px 8px; border-radius: 3px;">{formatted_date}</span></p>
                        <p style="margin: 5px 0;"><strong>Status:</strong> {activity.status}</p>
                    </div>

                    {f'<div style="background-color: #F3F4F6; padding: 12px; border-radius: 5px; margin: 15px 0;"><p style="margin: 0;"><strong>Description:</strong> {activity.description}</p></div>' if activity.description else ''}

                    <div style="background-color: #EFF6FF; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <h4 style="margin-top: 0; color: #1E40AF;">Lead Information</h4>
                        {f'<p style="margin: 5px 0;"><strong>School:</strong> {activity.lead.school_name}</p>' if activity.lead.school_name else ''}
                        {f'<p style="margin: 5px 0;"><strong>Phone:</strong> {activity.lead.phone}</p>' if activity.lead.phone else ''}
                        {f'<p style="margin: 5px 0;"><strong>Email:</strong> {activity.lead.email}</p>' if activity.lead.email else ''}
                        {f'<p style="margin: 5px 0;"><strong>Contact Person:</strong> {activity.lead.contact_person}</p>' if activity.lead.contact_person else ''}
                        <p style="margin: 5px 0;"><strong>Lead Status:</strong> {activity.lead.status}</p>
                    </div>

                    <p style="margin-top: 20px;"><strong>Reminder:</strong></p>
                    <ul>
                        <li>Review lead history before the {activity.activity_type.lower()}</li>
                        <li>Prepare talking points based on lead status</li>
                        <li>Update activity status after completion</li>
                    </ul>

                    <p>View in CRM: <a href="{settings.FRONTEND_URL}/crm/activities" style="color: #7C3AED;">{settings.FRONTEND_URL}/crm/activities</a></p>

                    <p style="margin-top: 30px;">Best regards,<br>KoderKids ERP Team</p>

                    <hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;">
                    <p style="font-size: 12px; color: #6B7280;">This is an automated notification. Please do not reply to this email.</p>
                </div>
            </body>
        </html>
        """

        plain_message = strip_tags(html_message)

        send_mail(
            subject=subject,
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[bdm_user.email],
            html_message=html_message,
            fail_silently=False,
        )

        logger.info(f"Activity scheduled email sent to {bdm_user.email} for activity #{activity.id}")
        return True

    except Exception as e:
        logger.error(f"Failed to send activity scheduled email to {bdm_user.email}: {str(e)}")
        return False
