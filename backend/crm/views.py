# ============================================
# CRM VIEWS
# ============================================

from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Count, Q, Sum
from datetime import datetime, timedelta
from decimal import Decimal

from .models import Lead, Activity, BDMTarget
from .serializers import (
    LeadSerializer,
    LeadCardSerializer,
    LeadDetailSerializer,
    ActivitySerializer,
    BDMTargetSerializer,
    LeadConversionSerializer
)
from .permissions import IsBDMOrAdmin, IsAdminOnly, IsAdminOrOwner
from students.models import School, CustomUser
from .emails import send_lead_assignment_email, send_activity_scheduled_email
import logging

logger = logging.getLogger(__name__)


class LeadViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Lead management
    - Admin: Can see all leads
    - BDM: Can see only assigned leads
    """
    queryset = Lead.objects.all()
    serializer_class = LeadSerializer
    permission_classes = [IsAuthenticated, IsBDMOrAdmin]
    
    def get_queryset(self):
        """Filter leads based on user role"""
        user = self.request.user
        queryset = Lead.objects.all()
        
        # BDM can only see assigned leads
        if user.role == 'BDM':
            queryset = queryset.filter(assigned_to=user)
        
        # Filter by status
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)
        
        # Filter by lead source
        source = self.request.query_params.get('source')
        if source:
            queryset = queryset.filter(lead_source=source)
        
        # Filter by assigned BDM (Admin only)
        if user.role == 'Admin':
            assigned_to = self.request.query_params.get('assigned_to')
            if assigned_to:
                queryset = queryset.filter(assigned_to_id=assigned_to)
        
        # Search by name or phone
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(school_name__icontains=search) |
                Q(phone__icontains=search) |
                Q(contact_person__icontains=search)
            )
        
        queryset = queryset.select_related('assigned_to', 'created_by', 'converted_to_school')
        if self.action == 'list':
            queryset = queryset.prefetch_related('activities')
        else:
            # For non-list actions, annotate count to avoid N+1 on activities_count
            queryset = queryset.annotate(activities_count_ann=Count('activities'))
        return queryset

    def get_serializer_class(self):
        """Use card serializer for list, detail for retrieve"""
        if self.action == 'list':
            return LeadCardSerializer
        if self.action == 'retrieve':
            return LeadDetailSerializer
        return LeadSerializer

    def create(self, request, *args, **kwargs):
        """Override create to include duplicate warning in response"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)

        response_data = serializer.data

        # Check for duplicates and add warning
        phone = request.data.get('phone', '').strip()
        if phone:
            duplicate_leads = Lead.objects.filter(phone=phone).exclude(
                id=serializer.instance.id
            ).values('id', 'school_name', 'phone', 'status', 'contact_person')[:5]

            if duplicate_leads.exists():
                response_data['duplicate_warning'] = {
                    'found': True,
                    'message': f'Note: {duplicate_leads.count()} other lead(s) exist with the same phone number',
                    'leads': list(duplicate_leads)
                }

        return Response(response_data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        """Set created_by to current user and send email if BDM assigned"""
        user = self.request.user

        # Auto-assign to self if BDM and no assignment specified
        if user.role == 'BDM' and not serializer.validated_data.get('assigned_to'):
            lead = serializer.save(created_by=user, assigned_to=user)
        else:
            lead = serializer.save(created_by=user)

        # Send email if lead is assigned to BDM during creation
        if lead.assigned_to and lead.assigned_to.role == 'BDM':
            try:
                assigned_by_name = f"{self.request.user.first_name} {self.request.user.last_name}".strip() or self.request.user.username
                email_sent = send_lead_assignment_email(lead, lead.assigned_to, assigned_by_name)
                if email_sent:
                    logger.info(f"Lead assignment email sent to {lead.assigned_to.email}")
            except Exception as e:
                logger.error(f"Failed to send lead assignment email: {str(e)}")

    def update(self, request, *args, **kwargs):
        """Override update to include automation notifications"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)

        # Save and check for automation
        self.perform_update(serializer)

        # Check if automation occurred
        automation_message = getattr(self, '_automation_message', None)

        response_data = serializer.data
        if automation_message:
            response_data['automation'] = automation_message

        return Response(response_data)

    def perform_update(self, serializer):
        """
        Handle lead updates
        AUTO-RULE: Cancel scheduled activities when lead changes to 'Lost' or 'Not Interested'
        EMAIL: Send notification when BDM is reassigned
        """
        self._automation_message = None  # Reset automation message

        # Get the old values before update
        lead = self.get_object()
        old_status = lead.status
        old_bdm = lead.assigned_to

        # Perform the update
        updated_lead = serializer.save()
        new_status = updated_lead.status
        new_bdm = updated_lead.assigned_to

        # EMAIL: Send notification if BDM changed
        if old_bdm != new_bdm and new_bdm and new_bdm.role == 'BDM':
            try:
                assigned_by_name = f"{self.request.user.first_name} {self.request.user.last_name}".strip() or self.request.user.username
                email_sent = send_lead_assignment_email(updated_lead, new_bdm, assigned_by_name)
                if email_sent:
                    logger.info(f"Lead reassignment email sent to {new_bdm.email}")
            except Exception as e:
                logger.error(f"Failed to send lead reassignment email: {str(e)}")

        # AUTOMATION: Auto-cancel activities when lead becomes Lost/Not Interested
        if old_status != new_status and new_status in ['Lost', 'Not Interested']:
            cancelled_count = updated_lead.activities.filter(status='Scheduled').update(
                status='Cancelled',
                completed_date=timezone.now()
            )
            if cancelled_count > 0:
                self._automation_message = f"{cancelled_count} scheduled activity(ies) automatically cancelled (lead marked as '{new_status}')"
                print(f"[AUTO-RULE] {cancelled_count} scheduled activities auto-cancelled for Lead #{updated_lead.id} ({updated_lead.school_name or updated_lead.phone}) - status changed to '{new_status}'")

    @action(detail=True, methods=['post'])
    def convert(self, request, pk=None):
        """
        Convert lead to school
        POST /api/crm/leads/{id}/convert/
        """
        lead = self.get_object()
        
        # Check if already converted
        if lead.status == 'Converted':
            return Response(
                {'error': 'Lead is already converted'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate conversion data
        conversion_serializer = LeadConversionSerializer(data=request.data)
        if not conversion_serializer.is_valid():
            return Response(
                conversion_serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create school from lead data
        school_data = conversion_serializer.validated_data
        
        try:
            school = School.objects.create(
                name=school_data['school_name'],
                phone=school_data.get('phone', lead.phone),
                email=school_data.get('email', lead.email),
                address=school_data.get('address', lead.address),
                city=school_data.get('city', lead.city),
                payment_mode=school_data['payment_mode'],
                fee_per_student=school_data.get('fee_per_student'),
                monthly_subscription_amount=school_data.get('monthly_subscription_amount'),
            )
            
            # Update lead
            lead.status = 'Converted'
            lead.converted_to_school = school
            lead.conversion_date = timezone.now()
            lead.save()
            
            # Mark all scheduled activities as completed
            lead.activities.filter(status='Scheduled').update(
                status='Completed',
                completed_date=timezone.now()
            )
            
            # Update BDM target if exists
            if lead.assigned_to and lead.assigned_to.role == 'BDM':
                self._update_bdm_targets(lead.assigned_to, lead.conversion_date)
            
            return Response({
                'message': f'Lead successfully converted to {school.name}',
                'lead': LeadSerializer(lead).data,
                'school': {
                    'id': school.id,
                    'name': school.name,
                    'phone': school.phone,
                    'email': school.email,
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'], url_path='check-duplicate')
    def check_duplicate(self, request):
        """
        Check if a lead with the same phone number exists
        POST /api/crm/leads/check-duplicate/
        Body: {"phone": "1234567890"}
        """
        phone = request.data.get('phone', '').strip()

        if not phone:
            return Response({
                'found': False,
                'leads': []
            })

        # Find leads with matching phone
        duplicate_leads = Lead.objects.filter(phone=phone).values(
            'id', 'school_name', 'phone', 'status', 'contact_person', 'city'
        )[:5]  # Limit to 5 results

        return Response({
            'found': duplicate_leads.exists(),
            'leads': list(duplicate_leads)
        })

    @action(detail=True, methods=['patch'])
    def assign(self, request, pk=None):
        """
        Assign lead to a BDM
        PATCH /api/crm/leads/{id}/assign/
        """
        lead = self.get_object()
        bdm_id = request.data.get('bdm_id')
        
        if not bdm_id:
            return Response(
                {'error': 'bdm_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            bdm = CustomUser.objects.get(id=bdm_id, role='BDM')
            old_bdm = lead.assigned_to
            lead.assigned_to = bdm
            lead.save()

            # Send email notification to BDM if newly assigned
            if old_bdm != bdm:
                try:
                    assigned_by_name = f"{request.user.first_name} {request.user.last_name}".strip() or request.user.username
                    email_sent = send_lead_assignment_email(lead, bdm, assigned_by_name)
                    if email_sent:
                        logger.info(f"Lead assignment email sent to {bdm.email}")
                except Exception as e:
                    logger.error(f"Failed to send lead assignment email: {str(e)}")

            return Response({
                'message': f'Lead assigned to {bdm.get_full_name()}',
                'lead': LeadSerializer(lead).data
            })
        except CustomUser.DoesNotExist:
            return Response(
                {'error': 'BDM not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    def destroy(self, request, *args, **kwargs):
        """
        Delete a lead and its associated activities
        Warns user about cascade deletion
        """
        lead = self.get_object()

        # Count associated activities
        activity_count = lead.activities.count()

        # Store lead info for response message
        lead_name = lead.school_name or lead.phone

        # Perform deletion (CASCADE will delete activities)
        lead.delete()

        # Return success message with cascade info
        message = f"Lead '{lead_name}' deleted successfully"
        if activity_count > 0:
            message += f" (along with {activity_count} associated activity/activities)"

        return Response(
            {'message': message, 'deleted_activities': activity_count},
            status=status.HTTP_200_OK
        )

    def _update_bdm_targets(self, bdm, conversion_date):
        """Update BDM targets after conversion"""
        # Find active target for this BDM
        targets = BDMTarget.objects.filter(
            bdm=bdm,
            start_date__lte=conversion_date.date(),
            end_date__gte=conversion_date.date()
        )
        
        for target in targets:
            target.refresh_actuals()


class ActivityViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Activity management
    - Activities are only for leads
    """
    queryset = Activity.objects.all()
    serializer_class = ActivitySerializer
    permission_classes = [IsAuthenticated, IsBDMOrAdmin]
    
    def get_queryset(self):
        """Filter activities based on user role"""
        user = self.request.user
        queryset = Activity.objects.all()
        
        # BDM can only see activities for their assigned leads
        if user.role == 'BDM':
            queryset = queryset.filter(lead__assigned_to=user)
        
        # Filter by lead
        lead_id = self.request.query_params.get('lead')
        if lead_id:
            queryset = queryset.filter(lead_id=lead_id)
        
        # Filter by status
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)
        
        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date and end_date:
            queryset = queryset.filter(
                scheduled_date__date__gte=start_date,
                scheduled_date__date__lte=end_date
            )
        
        return queryset.select_related('lead', 'assigned_to')
    
    def create(self, request, *args, **kwargs):
        """Override create to include automation notifications"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Save and check for automation
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)

        # Check if automation occurred
        automation_message = getattr(self, '_automation_message', None)

        response_data = serializer.data
        if automation_message:
            response_data['automation'] = automation_message

        return Response(response_data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        """
        Set assigned_to to current user if not specified
        AUTO-RULE: Change lead status to 'Contacted' if lead is 'New' and this is first activity
        EMAIL: Send notification to BDM when activity is scheduled for them (not for logged activities)
        """
        self._automation_message = None  # Reset automation message

        if not serializer.validated_data.get('assigned_to'):
            activity = serializer.save(assigned_to=self.request.user)
        else:
            activity = serializer.save()

        # EMAIL: Send notification to BDM when activity is scheduled (NOT for quick-logged activities)
        if (activity.assigned_to and
            activity.assigned_to.role == 'BDM' and
            activity.status == 'Scheduled' and
            not activity.is_logged):
            try:
                email_sent = send_activity_scheduled_email(activity, activity.assigned_to)
                if email_sent:
                    logger.info(f"Activity scheduled email sent to {activity.assigned_to.email}")
            except Exception as e:
                logger.error(f"Failed to send activity scheduled email: {str(e)}")

        # AUTOMATION: Auto-change lead to 'Contacted' on first activity
        lead = activity.lead
        if lead.status == 'New':
            # Check if this is the first activity for this lead
            activity_count = lead.activities.count()
            if activity_count == 1:  # This is the first activity
                old_status = lead.status
                lead.status = 'Contacted'
                lead.save()
                self._automation_message = f"Lead status automatically changed from '{old_status}' to 'Contacted' (first activity)"
                print(f"[AUTO-RULE] Lead #{lead.id} ({lead.school_name or lead.phone}) auto-changed from 'New' to 'Contacted' (first activity created)")
    
    @action(detail=True, methods=['patch'])
    def complete(self, request, pk=None):
        """
        Mark activity as completed
        PATCH /api/crm/activities/{id}/complete/
        """
        activity = self.get_object()
        
        activity.status = 'Completed'
        activity.completed_date = timezone.now()
        activity.save()
        
        return Response({
            'message': 'Activity marked as completed',
            'activity': ActivitySerializer(activity).data
        })


class BDMTargetViewSet(viewsets.ModelViewSet):
    """
    ViewSet for BDM Target management
    - Admin: Can create/view/edit all targets
    - BDM: Can only view their own targets (read-only)
    """
    queryset = BDMTarget.objects.all()
    serializer_class = BDMTargetSerializer
    permission_classes = [IsAuthenticated, IsBDMOrAdmin]
    
    def get_queryset(self):
        """Filter targets based on user role"""
        user = self.request.user
        queryset = BDMTarget.objects.all()
        
        # BDM can only see their own targets
        if user.role == 'BDM':
            queryset = queryset.filter(bdm=user)
        
        # Filter by BDM (Admin only)
        if user.role == 'Admin':
            bdm_id = self.request.query_params.get('bdm')
            if bdm_id:
                queryset = queryset.filter(bdm_id=bdm_id)
        
        # Filter by period type
        period = self.request.query_params.get('period')
        if period:
            queryset = queryset.filter(period_type=period)
        
        return queryset.select_related('bdm', 'created_by')
    
    def get_permissions(self):
        """Only Admin can create/update/delete targets"""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsAdminOnly()]
        return [IsAuthenticated(), IsBDMOrAdmin()]
    
    def perform_create(self, serializer):
        """Set created_by to current user"""
        serializer.save(created_by=self.request.user)
    
    @action(detail=True, methods=['get'])
    def refresh(self, request, pk=None):
        """
        Refresh target actuals (recalculate)
        GET /api/crm/targets/{id}/refresh/
        """
        target = self.get_object()
        target.refresh_actuals()
        
        return Response({
            'message': 'Target actuals refreshed',
            'target': BDMTargetSerializer(target).data
        })


# ============================================
# DASHBOARD & STATS ENDPOINTS
# ============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsBDMOrAdmin])
def dashboard_stats(request):
    """
    Get dashboard statistics for BDM/Admin
    GET /api/crm/dashboard/stats/
    """
    user = request.user
    today = timezone.now()
    month_start = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # Base querysets (filtered by role)
    if user.role == 'BDM':
        leads = Lead.objects.filter(assigned_to=user)
        activities = Activity.objects.filter(lead__assigned_to=user)
    else:  # Admin
        leads = Lead.objects.all()
        activities = Activity.objects.all()

    # Single aggregated query for all lead stats (was 5 separate queries)
    lead_stats = leads.aggregate(
        total=Count('id'),
        new=Count('id', filter=Q(status='New')),
        converted=Count('id', filter=Q(status='Converted')),
        this_month=Count('id', filter=Q(created_at__gte=month_start)),
        conversions_this_month=Count('id', filter=Q(status='Converted', conversion_date__gte=month_start)),
    )

    total_leads = lead_stats['total']
    converted_leads = lead_stats['converted']
    conversion_rate = round((converted_leads / total_leads * 100), 2) if total_leads > 0 else 0

    # Single aggregated query for activity stats (was 2 separate queries)
    activity_stats = activities.aggregate(
        upcoming=Count('id', filter=Q(status='Scheduled', scheduled_date__gte=today)),
        overdue=Count('id', filter=Q(status='Scheduled', scheduled_date__lt=today)),
    )

    return Response({
        'total_leads': total_leads,
        'new_leads': lead_stats['new'],
        'converted_leads': converted_leads,
        'leads_this_month': lead_stats['this_month'],
        'conversions_this_month': lead_stats['conversions_this_month'],
        'conversion_rate': conversion_rate,
        'upcoming_activities': activity_stats['upcoming'],
        'overdue_activities': activity_stats['overdue'],
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsBDMOrAdmin])
def lead_sources_breakdown(request):
    """
    Get lead sources breakdown
    GET /api/crm/dashboard/lead-sources/
    """
    user = request.user
    
    # Base queryset
    if user.role == 'BDM':
        leads = Lead.objects.filter(assigned_to=user)
    else:
        leads = Lead.objects.all()
    
    # Count by source
    sources = leads.values('lead_source').annotate(
        count=Count('id')
    ).order_by('-count')
    
    return Response(list(sources))


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsBDMOrAdmin])
def conversion_metrics(request):
    """
    Get conversion rate metrics over time
    GET /api/crm/dashboard/conversion-rate/
    """
    from django.db.models.functions import TruncMonth

    user = request.user

    # Base queryset
    if user.role == 'BDM':
        leads = Lead.objects.filter(assigned_to=user)
    else:
        leads = Lead.objects.all()

    # Calculate date range for last 6 months
    today = timezone.now()
    six_months_ago = (today - timedelta(days=180)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # Two aggregated queries instead of 12 individual ones
    leads_by_month = dict(
        leads.filter(created_at__gte=six_months_ago)
        .annotate(month=TruncMonth('created_at'))
        .values('month')
        .annotate(count=Count('id'))
        .values_list('month', 'count')
    )

    conversions_by_month = dict(
        leads.filter(conversion_date__gte=six_months_ago)
        .annotate(month=TruncMonth('conversion_date'))
        .values('month')
        .annotate(count=Count('id'))
        .values_list('month', 'count')
    )

    # Build response using the pre-fetched data
    months_data = []
    for i in range(5, -1, -1):
        month_date = today - timedelta(days=30 * i)
        month_key = month_date.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        month_leads = leads_by_month.get(month_key, 0)
        month_conversions = conversions_by_month.get(month_key, 0)
        conversion_rate = round((month_conversions / month_leads * 100), 2) if month_leads > 0 else 0

        months_data.append({
            'month': month_key.strftime('%b %Y'),
            'leads': month_leads,
            'conversions': month_conversions,
            'conversion_rate': conversion_rate,
        })

    return Response(months_data)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsBDMOrAdmin])
def upcoming_activities(request):
    """
    Get upcoming activities for today and tomorrow
    GET /api/crm/dashboard/upcoming/
    """
    user = request.user
    
    # Base queryset
    if user.role == 'BDM':
        activities = Activity.objects.filter(lead__assigned_to=user)
    else:
        activities = Activity.objects.filter(assigned_to=user)
    
    today = timezone.now()
    tomorrow = today + timedelta(days=1)
    
    # Today's activities
    today_activities = activities.filter(
        status='Scheduled',
        scheduled_date__date=today.date()
    ).select_related('lead', 'assigned_to')
    
    # Tomorrow's activities
    tomorrow_activities = activities.filter(
        status='Scheduled',
        scheduled_date__date=tomorrow.date()
    ).select_related('lead', 'assigned_to')
    
    return Response({
        'today': ActivitySerializer(today_activities, many=True).data,
        'tomorrow': ActivitySerializer(tomorrow_activities, many=True).data,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsBDMOrAdmin])
def target_progress(request):
    """
    Get current target progress for BDM
    GET /api/crm/dashboard/targets/
    """
    user = request.user

    today = timezone.now().date()

    # Get active targets with select_related to avoid N+1 on serializer
    if user.role == 'BDM':
        targets = BDMTarget.objects.filter(
            bdm=user,
            start_date__lte=today,
            end_date__gte=today
        ).select_related('bdm', 'created_by')
    else:
        # Admin can see all active targets
        targets = BDMTarget.objects.filter(
            start_date__lte=today,
            end_date__gte=today
        ).select_related('bdm', 'created_by')

    # Refresh actuals for all targets
    for target in targets:
        target.refresh_actuals()

    return Response(
        BDMTargetSerializer(targets, many=True).data
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminOnly])
def bdm_list(request):
    """
    Get list of all BDMs (Admin only)
    GET /api/crm/bdm-list/
    """
    bdms = CustomUser.objects.filter(
        role='BDM',
        is_active=True
    ).values('id', 'username', 'first_name', 'last_name', 'email')

    # Format with full name
    bdm_data = [
        {
            'id': bdm['id'],
            'username': bdm['username'],
            'full_name': f"{bdm['first_name']} {bdm['last_name']}".strip() or bdm['username'],
            'email': bdm['email']
        }
        for bdm in bdms
    ]

    return Response(bdm_data)


# ============================================
# ADMIN DASHBOARD ENDPOINTS
# ============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminOnly])
def admin_dashboard_overview(request):
    """
    Get comprehensive dashboard overview for Admin
    GET /api/crm/dashboard/admin/overview/

    Returns:
    - Total leads by status
    - BDM performance comparison
    - Recent activity summary
    - Conversion metrics
    """
    from django.db.models import Case, When, IntegerField, Value

    # Lead statistics by status - single aggregated query
    status_counts = Lead.objects.aggregate(
        total=Count('id'),
        new=Count('id', filter=Q(status='New')),
        contacted=Count('id', filter=Q(status='Contacted')),
        interested=Count('id', filter=Q(status='Interested')),
        not_interested=Count('id', filter=Q(status='Not Interested')),
        converted=Count('id', filter=Q(status='Converted')),
        lost=Count('id', filter=Q(status='Lost')),
    )

    lead_stats = {
        'total': status_counts['total'],
        'new': status_counts['new'],
        'contacted': status_counts['contacted'],
        'interested': status_counts['interested'],
        'not_interested': status_counts['not_interested'],
        'converted': status_counts['converted'],
        'lost': status_counts['lost'],
    }

    # BDM Performance comparison - 2 annotated queries instead of N*7
    bdm_lead_stats = CustomUser.objects.filter(
        role='BDM', is_active=True
    ).annotate(
        total_leads=Count('assigned_leads', distinct=True),
        converted_leads=Count('assigned_leads', filter=Q(assigned_leads__status='Converted'), distinct=True),
    ).values('id', 'username', 'first_name', 'last_name', 'total_leads', 'converted_leads')

    bdm_activity_stats = CustomUser.objects.filter(
        role='BDM', is_active=True
    ).annotate(
        total_activities=Count('activities', distinct=True),
        scheduled_activities=Count('activities', filter=Q(activities__status='Scheduled'), distinct=True),
        completed_activities=Count('activities', filter=Q(activities__status='Completed'), distinct=True),
    ).values('id', 'total_activities', 'scheduled_activities', 'completed_activities')

    # Build a lookup for activity stats
    activity_stats_map = {item['id']: item for item in bdm_activity_stats}

    bdm_performance = []
    for bdm in bdm_lead_stats:
        total = bdm['total_leads']
        converted = bdm['converted_leads']
        act_stats = activity_stats_map.get(bdm['id'], {})

        bdm_performance.append({
            'id': bdm['id'],
            'name': f"{bdm['first_name']} {bdm['last_name']}".strip() or bdm['username'],
            'total_leads': total,
            'converted_leads': converted,
            'conversion_rate': round((converted / total * 100) if total > 0 else 0, 1),
            'total_activities': act_stats.get('total_activities', 0),
            'scheduled_activities': act_stats.get('scheduled_activities', 0),
            'completed_activities': act_stats.get('completed_activities', 0),
        })

    # Recent activities (last 7 days) + this month conversions - batch with lead_stats
    seven_days_ago = timezone.now() - timedelta(days=7)
    month_start = timezone.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    recent_activities = Activity.objects.filter(
        created_at__gte=seven_days_ago
    ).count()

    this_month_converted = Lead.objects.filter(
        conversion_date__gte=month_start
    ).count()

    return Response({
        'lead_stats': lead_stats,
        'bdm_performance': bdm_performance,
        'recent_activities_count': recent_activities,
        'this_month_conversions': this_month_converted,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminOnly])
def admin_lead_distribution(request):
    """
    Get lead distribution across BDMs
    GET /api/crm/dashboard/admin/lead-distribution/
    """
    # Single annotated query instead of N+1
    bdm_counts = CustomUser.objects.filter(
        role='BDM', is_active=True
    ).annotate(
        lead_count=Count('assigned_leads')
    ).values('id', 'username', 'first_name', 'last_name', 'lead_count')

    distribution = [
        {
            'bdm_id': bdm['id'],
            'bdm_name': f"{bdm['first_name']} {bdm['last_name']}".strip() or bdm['username'],
            'lead_count': bdm['lead_count'],
        }
        for bdm in bdm_counts
    ]

    unassigned_count = Lead.objects.filter(assigned_to__isnull=True).count()
    distribution.append({
        'bdm_id': None,
        'bdm_name': 'Unassigned',
        'lead_count': unassigned_count
    })

    return Response(distribution)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminOnly])
def admin_recent_activities(request):
    """
    Get recent activities across all BDMs
    GET /api/crm/dashboard/admin/recent-activities/
    """
    # Get recent activities (last 10)
    recent_activities = Activity.objects.select_related(
        'lead', 'assigned_to'
    ).order_by('-created_at')[:10]

    activities_data = []
    for activity in recent_activities:
        activities_data.append({
            'id': activity.id,
            'type': activity.activity_type,
            'subject': activity.subject,
            'status': activity.status,
            'scheduled_date': activity.scheduled_date,
            'lead_name': activity.lead.school_name or activity.lead.phone,
            'assigned_to_name': f"{activity.assigned_to.first_name} {activity.assigned_to.last_name}".strip() or activity.assigned_to.username if activity.assigned_to else 'Unassigned',
            'created_at': activity.created_at,
        })

    return Response(activities_data)
