# ============================================
# CRM SERIALIZERS
# ============================================

from rest_framework import serializers
from django.utils import timezone
from .models import Lead, Activity, BDMTarget, ProposalOffer
from students.models import CustomUser, School


class LeadSerializer(serializers.ModelSerializer):
    """Serializer for Lead model"""
    
    # Read-only fields for related objects
    assigned_to_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    converted_school_name = serializers.CharField(source='converted_to_school.name', read_only=True)
    
    # Count of activities for this lead
    activities_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Lead
        fields = [
            'id',
            'school_name',
            'phone',
            'contact_person',
            'email',
            'address',
            'city',
            'lead_source',
            'status',
            'assigned_to',
            'assigned_to_name',
            'created_by',
            'created_by_name',
            'converted_to_school',
            'converted_school_name',
            'conversion_date',
            'estimated_students',
            'notes',
            'activities_count',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'conversion_date', 'converted_to_school']
    
    def get_activities_count(self, obj):
        """Return count of activities for this lead (uses prefetch cache if available)"""
        # Use annotation if available (set via .annotate(activities_count_ann=Count('activities')))
        if hasattr(obj, 'activities_count_ann'):
            return obj.activities_count_ann
        # Fall back to prefetch cache (len() doesn't hit DB if prefetched)
        try:
            return len(obj.activities.all())
        except Exception:
            return obj.activities.count()
    
    def validate(self, data):
        """Ensure at least phone or school_name is provided"""
        school_name = data.get('school_name')
        phone = data.get('phone')
        
        # For updates, check if we have at least one field
        if self.instance:
            school_name = school_name or self.instance.school_name
            phone = phone or self.instance.phone
        
        if not school_name and not phone:
            raise serializers.ValidationError(
                "Either 'school_name' or 'phone' must be provided"
            )
        
        return data


class LeadCardSerializer(LeadSerializer):
    """Lead serializer with activity data for card display"""

    recent_activities = serializers.SerializerMethodField()
    next_scheduled_activity = serializers.SerializerMethodField()
    last_activity_date = serializers.SerializerMethodField()
    days_since_last_activity = serializers.SerializerMethodField()

    class Meta(LeadSerializer.Meta):
        fields = LeadSerializer.Meta.fields + [
            'recent_activities',
            'next_scheduled_activity',
            'last_activity_date',
            'days_since_last_activity',
        ]

    def _get_cached_activities(self, obj):
        """
        Get activities from prefetch cache, sorted by scheduled_date desc.
        Uses Python-side sorting/filtering to avoid N+1 queries.
        The view's get_queryset already does prefetch_related('activities').
        """
        cache_attr = '_sorted_activities'
        if not hasattr(obj, cache_attr):
            # .all() uses the prefetch cache; sort in Python
            all_activities = list(obj.activities.all())
            all_activities.sort(key=lambda a: a.scheduled_date or timezone.now(), reverse=True)
            setattr(obj, cache_attr, all_activities)
        return getattr(obj, cache_attr)

    def get_recent_activities(self, obj):
        """Return last 5 activities for card display (from prefetch cache)"""
        activities = self._get_cached_activities(obj)[:5]
        return [
            {
                'id': a.id,
                'activity_type': a.activity_type,
                'subject': a.subject,
                'status': a.status,
                'scheduled_date': a.scheduled_date,
                'outcome': a.outcome,
            }
            for a in activities
        ]

    def get_next_scheduled_activity(self, obj):
        """Return the next upcoming scheduled activity (from prefetch cache)"""
        now = timezone.now()
        scheduled = [
            a for a in self._get_cached_activities(obj)
            if a.status == 'Scheduled' and a.scheduled_date and a.scheduled_date >= now
        ]
        # sorted desc, so the next upcoming is the last one
        if scheduled:
            next_activity = scheduled[-1]
            return {
                'activity_type': next_activity.activity_type,
                'subject': next_activity.subject,
                'scheduled_date': next_activity.scheduled_date,
            }
        return None

    def get_last_activity_date(self, obj):
        """Return date of most recent activity (from prefetch cache)"""
        activities = self._get_cached_activities(obj)
        return activities[0].scheduled_date if activities else None

    def get_days_since_last_activity(self, obj):
        """Return number of days since last activity (from prefetch cache)"""
        activities = self._get_cached_activities(obj)
        if activities and activities[0].scheduled_date:
            delta = timezone.now() - activities[0].scheduled_date
            return delta.days
        return None


class LeadDetailSerializer(LeadSerializer):
    """Detailed Lead serializer with activities"""
    
    activities = serializers.SerializerMethodField()
    
    class Meta(LeadSerializer.Meta):
        fields = LeadSerializer.Meta.fields + ['activities']
    
    def get_activities(self, obj):
        """Return all activities for this lead"""
        activities = obj.activities.all()[:20]  # Limit to last 20
        return ActivitySerializer(activities, many=True).data


class ActivitySerializer(serializers.ModelSerializer):
    """Serializer for Activity model"""

    # Read-only fields
    assigned_to_name = serializers.CharField(source='assigned_to.get_full_name', read_only=True)
    lead_name = serializers.SerializerMethodField()

    class Meta:
        model = Activity
        fields = [
            'id',
            'activity_type',
            'lead',
            'lead_name',
            'subject',
            'description',
            'assigned_to',
            'assigned_to_name',
            'status',
            'scheduled_date',
            'completed_date',
            'outcome',
            'duration_minutes',
            'is_logged',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
        extra_kwargs = {
            'scheduled_date': {'required': False},
        }

    def get_lead_name(self, obj):
        """Return lead name or phone"""
        return str(obj.lead)

    def validate(self, data):
        """Validate activity dates and handle quick-log mode"""
        from django.utils import timezone

        is_logged = data.get('is_logged', False)
        status = data.get('status', self.instance.status if self.instance else 'Scheduled')
        completed_date = data.get('completed_date')

        # Quick-log mode: auto-complete the activity
        if is_logged:
            data['status'] = 'Completed'
            data['completed_date'] = timezone.now()
            # If no scheduled_date provided for logged activity, use now
            if not data.get('scheduled_date'):
                data['scheduled_date'] = timezone.now()

        # If status is Completed, completed_date should be set
        if status == 'Completed' and not completed_date and not (self.instance and self.instance.completed_date):
            data['completed_date'] = timezone.now()

        return data


class BDMTargetSerializer(serializers.ModelSerializer):
    """Serializer for BDM Target model"""
    
    # Read-only fields
    bdm_name = serializers.CharField(source='bdm.get_full_name', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    # Progress percentages
    leads_progress = serializers.SerializerMethodField()
    conversions_progress = serializers.SerializerMethodField()
    revenue_progress = serializers.SerializerMethodField()
    
    class Meta:
        model = BDMTarget
        fields = [
            'id',
            'bdm',
            'bdm_name',
            'period_type',
            'start_date',
            'end_date',
            'leads_target',
            'leads_achieved',
            'leads_progress',
            'conversions_target',
            'conversions_achieved',
            'conversions_progress',
            'revenue_target',
            'revenue_achieved',
            'revenue_progress',
            'created_by',
            'created_by_name',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'leads_achieved',
            'conversions_achieved',
            'revenue_achieved',
            'created_at',
            'updated_at'
        ]
    
    def get_leads_progress(self, obj):
        """Calculate leads progress percentage"""
        return obj.get_progress_percentage('leads')
    
    def get_conversions_progress(self, obj):
        """Calculate conversions progress percentage"""
        return obj.get_progress_percentage('conversions')
    
    def get_revenue_progress(self, obj):
        """Calculate revenue progress percentage"""
        return obj.get_progress_percentage('revenue')
    
    def validate(self, data):
        """Validate target dates"""
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        
        if start_date and end_date and start_date >= end_date:
            raise serializers.ValidationError(
                "End date must be after start date"
            )
        
        return data


class LeadConversionSerializer(serializers.Serializer):
    """Serializer for converting lead to school"""
    
    # School data (mostly pre-filled from lead)
    school_name = serializers.CharField(max_length=200)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    address = serializers.CharField(required=False, allow_blank=True)
    city = serializers.CharField(max_length=100, required=False, allow_blank=True)
    
    # Required school-specific fields
    payment_mode = serializers.ChoiceField(
        choices=['per_student', 'monthly_subscription'],
        default='per_student'
    )
    fee_per_student = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        allow_null=True
    )
    monthly_subscription_amount = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
        required=False,
        allow_null=True
    )
    
    def validate(self, data):
        """Validate payment mode requirements"""
        payment_mode = data.get('payment_mode')
        
        if payment_mode == 'per_student' and not data.get('fee_per_student'):
            raise serializers.ValidationError({
                'fee_per_student': 'Fee per student is required for per_student payment mode'
            })
        
        if payment_mode == 'monthly_subscription' and not data.get('monthly_subscription_amount'):
            raise serializers.ValidationError({
                'monthly_subscription_amount': 'Monthly subscription amount is required for monthly_subscription payment mode'
            })

        return data


# ============================================
# PROPOSAL OFFER SERIALIZERS
# ============================================

class ProposalOfferListSerializer(serializers.ModelSerializer):
    lead_school_name = serializers.CharField(source='lead.school_name', read_only=True, default=None)

    class Meta:
        model = ProposalOffer
        fields = [
            'id', 'lead', 'lead_school_name', 'school_name', 'contact_person',
            'standard_rate', 'discounted_rate', 'generated_by_name',
            'page_selection', 'feature_items', 'created_at',
        ]


class ProposalOfferDetailSerializer(serializers.ModelSerializer):
    lead_school_name = serializers.CharField(source='lead.school_name', read_only=True, default=None)
    generated_by_username = serializers.SerializerMethodField()

    class Meta:
        model = ProposalOffer
        fields = [
            'id', 'lead', 'lead_school_name', 'school_name', 'contact_person',
            'standard_rate', 'discounted_rate', 'generated_by', 'generated_by_name',
            'generated_by_username', 'page_selection', 'feature_items',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'generated_by', 'created_at', 'updated_at']

    def get_generated_by_username(self, obj):
        return obj.generated_by.username if obj.generated_by else None


class ProposalOfferCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProposalOffer
        fields = ['lead', 'school_name', 'contact_person', 'standard_rate', 'discounted_rate', 'page_selection', 'feature_items']

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user:
            validated_data['generated_by'] = request.user
            validated_data['generated_by_name'] = (
                request.user.get_full_name() or request.user.username
            )
        return super().create(validated_data)
