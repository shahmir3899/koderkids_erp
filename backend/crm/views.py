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
    LeadDetailSerializer,
    ActivitySerializer,
    BDMTargetSerializer,
    LeadConversionSerializer
)
from .permissions import IsBDMOrAdmin, IsAdminOnly, IsAdminOrOwner
from students.models import School, CustomUser


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
        
        return queryset.select_related('assigned_to', 'created_by', 'converted_to_school')
    
    def get_serializer_class(self):
        """Use detailed serializer for retrieve action"""
        if self.action == 'retrieve':
            return LeadDetailSerializer
        return LeadSerializer
    
    def perform_create(self, serializer):
        """Set created_by to current user"""
        serializer.save(created_by=self.request.user)
    
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
            lead.assigned_to = bdm
            lead.save()
            
            return Response({
                'message': f'Lead assigned to {bdm.get_full_name()}',
                'lead': LeadSerializer(lead).data
            })
        except CustomUser.DoesNotExist:
            return Response(
                {'error': 'BDM not found'},
                status=status.HTTP_404_NOT_FOUND
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
    
    def perform_create(self, serializer):
        """Set assigned_to to current user if not specified"""
        if not serializer.validated_data.get('assigned_to'):
            serializer.save(assigned_to=self.request.user)
        else:
            serializer.save()
    
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
    
    # Base queryset (filtered by role)
    if user.role == 'BDM':
        leads = Lead.objects.filter(assigned_to=user)
        activities = Activity.objects.filter(lead__assigned_to=user)
    else:  # Admin
        leads = Lead.objects.all()
        activities = Activity.objects.all()
    
    # Lead stats
    total_leads = leads.count()
    new_leads = leads.filter(status='New').count()
    converted_leads = leads.filter(status='Converted').count()
    
    # This month stats
    today = timezone.now()
    month_start = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    
    leads_this_month = leads.filter(created_at__gte=month_start).count()
    conversions_this_month = leads.filter(
        status='Converted',
        conversion_date__gte=month_start
    ).count()
    
    # Conversion rate
    conversion_rate = 0
    if total_leads > 0:
        conversion_rate = round((converted_leads / total_leads) * 100, 2)
    
    # Activities
    upcoming_activities = activities.filter(
        status='Scheduled',
        scheduled_date__gte=today
    ).count()
    
    overdue_activities = activities.filter(
        status='Scheduled',
        scheduled_date__lt=today
    ).count()
    
    return Response({
        'total_leads': total_leads,
        'new_leads': new_leads,
        'converted_leads': converted_leads,
        'leads_this_month': leads_this_month,
        'conversions_this_month': conversions_this_month,
        'conversion_rate': conversion_rate,
        'upcoming_activities': upcoming_activities,
        'overdue_activities': overdue_activities,
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
    user = request.user
    
    # Base queryset
    if user.role == 'BDM':
        leads = Lead.objects.filter(assigned_to=user)
    else:
        leads = Lead.objects.all()
    
    # Last 6 months data
    today = timezone.now()
    months_data = []
    
    for i in range(5, -1, -1):
        month_date = today - timedelta(days=30*i)
        month_start = month_date.replace(day=1, hour=0, minute=0, second=0)
        
        if i > 0:
            next_month = month_date.replace(day=1) + timedelta(days=32)
            month_end = next_month.replace(day=1) - timedelta(seconds=1)
        else:
            month_end = today
        
        month_leads = leads.filter(
            created_at__gte=month_start,
            created_at__lte=month_end
        ).count()
        
        month_conversions = leads.filter(
            conversion_date__gte=month_start,
            conversion_date__lte=month_end
        ).count()
        
        conversion_rate = 0
        if month_leads > 0:
            conversion_rate = round((month_conversions / month_leads) * 100, 2)
        
        months_data.append({
            'month': month_start.strftime('%b %Y'),
            'leads': month_leads,
            'conversions': month_conversions,
            'conversion_rate': conversion_rate
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
    
    # Get active targets
    if user.role == 'BDM':
        targets = BDMTarget.objects.filter(
            bdm=user,
            start_date__lte=today,
            end_date__gte=today
        )
    else:
        # Admin can see all active targets
        targets = BDMTarget.objects.filter(
            start_date__lte=today,
            end_date__gte=today
        )
    
    # Refresh actuals for all targets
    for target in targets:
        target.refresh_actuals()
    
    return Response(
        BDMTargetSerializer(targets, many=True).data
    )
