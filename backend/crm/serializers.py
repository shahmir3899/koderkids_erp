# ============================================
# CRM SERIALIZERS
# ============================================

from rest_framework import serializers
from .models import Lead, Activity, BDMTarget
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
        """Return count of activities for this lead"""
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
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_lead_name(self, obj):
        """Return lead name or phone"""
        return str(obj.lead)
    
    def validate(self, data):
        """Validate activity dates"""
        status = data.get('status', self.instance.status if self.instance else 'Scheduled')
        completed_date = data.get('completed_date')
        
        # If status is Completed, completed_date should be set
        if status == 'Completed' and not completed_date and not (self.instance and self.instance.completed_date):
            # Auto-set to now if not provided
            from django.utils import timezone
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
