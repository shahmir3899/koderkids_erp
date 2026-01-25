# ============================================
# REPORTS SERIALIZERS - Custom Report API
# ============================================
# Location: backend/reports/serializers.py

from rest_framework import serializers
from .models import CustomReport, ReportTemplate, ReportRequest, RequestStatusLog, GeneratedReport


# =============================================================================
# REPORT TEMPLATE SERIALIZERS
# =============================================================================
class ReportTemplateSerializer(serializers.ModelSerializer):
    """Full serializer for report templates."""

    class Meta:
        model = ReportTemplate
        fields = [
            'id',
            'code',
            'name',
            'description',
            'category',
            'allowed_roles',
            'allowed_self_request',
            'allowed_other_request',
            'requires_target_employee',
            'requires_target_school',
            'default_subject',
            'default_body',
            'background_image',
            'is_active',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ReportTemplateListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for template list (excludes default_body)."""

    class Meta:
        model = ReportTemplate
        fields = [
            'id',
            'code',
            'name',
            'description',
            'category',
            'allowed_roles',
            'allowed_self_request',
            'allowed_other_request',
            'requires_target_employee',
            'requires_target_school',
            'is_active',
        ]


# =============================================================================
# REPORT REQUEST SERIALIZERS
# =============================================================================
class RequestStatusLogSerializer(serializers.ModelSerializer):
    """Serializer for status audit logs."""
    changed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = RequestStatusLog
        fields = [
            'id',
            'previous_status',
            'new_status',
            'changed_by',
            'changed_by_name',
            'changed_at',
            'notes',
        ]

    def get_changed_by_name(self, obj):
        if obj.changed_by:
            return obj.changed_by.get_full_name() or obj.changed_by.username
        return None


class GeneratedReportSerializer(serializers.ModelSerializer):
    """Serializer for generated report metadata."""
    generated_by_name = serializers.SerializerMethodField()

    class Meta:
        model = GeneratedReport
        fields = [
            'id',
            'generated_by',
            'generated_by_name',
            'generated_at',
            'file_name',
            'file_size',
            'mime_type',
            'download_count',
            'last_downloaded_at',
        ]

    def get_generated_by_name(self, obj):
        if obj.generated_by:
            return obj.generated_by.get_full_name() or obj.generated_by.username
        return None


class ReportRequestSerializer(serializers.ModelSerializer):
    """Full serializer for report request detail view."""
    requested_by_name = serializers.SerializerMethodField()
    target_employee_name = serializers.SerializerMethodField()
    target_school_name = serializers.SerializerMethodField()
    template_name = serializers.SerializerMethodField()
    template_code = serializers.SerializerMethodField()
    approved_by_name = serializers.SerializerMethodField()
    status_logs = RequestStatusLogSerializer(many=True, read_only=True)
    generated_report = GeneratedReportSerializer(read_only=True)
    is_editable = serializers.ReadOnlyField()
    can_be_approved = serializers.ReadOnlyField()
    can_be_generated = serializers.ReadOnlyField()

    class Meta:
        model = ReportRequest
        fields = [
            'id',
            'request_number',
            'requested_by',
            'requested_by_name',
            'requested_at',
            'target_employee',
            'target_employee_name',
            'target_school',
            'target_school_name',
            'template',
            'template_name',
            'template_code',
            'subject',
            'recipient_text',
            'body_text',
            'content_snapshot',
            'line_spacing',
            'custom_fields',
            'status',
            'priority',
            'approved_by',
            'approved_by_name',
            'approved_at',
            'rejection_reason',
            'admin_notes',
            'expires_at',
            'created_at',
            'updated_at',
            'is_editable',
            'can_be_approved',
            'can_be_generated',
            'status_logs',
            'generated_report',
        ]
        read_only_fields = [
            'id', 'request_number', 'requested_by', 'requested_at',
            'content_snapshot', 'approved_by', 'approved_at',
            'created_at', 'updated_at',
        ]

    def get_requested_by_name(self, obj):
        if obj.requested_by:
            return obj.requested_by.get_full_name() or obj.requested_by.username
        return None

    def get_target_employee_name(self, obj):
        if obj.target_employee:
            return obj.target_employee.get_full_name() or obj.target_employee.username
        return None

    def get_target_school_name(self, obj):
        if obj.target_school:
            return obj.target_school.name
        return None

    def get_template_name(self, obj):
        return obj.template.name if obj.template else None

    def get_template_code(self, obj):
        return obj.template.code if obj.template else None

    def get_approved_by_name(self, obj):
        if obj.approved_by:
            return obj.approved_by.get_full_name() or obj.approved_by.username
        return None


class ReportRequestListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list view."""
    requested_by_name = serializers.SerializerMethodField()
    target_employee_name = serializers.SerializerMethodField()
    template_name = serializers.SerializerMethodField()

    class Meta:
        model = ReportRequest
        fields = [
            'id',
            'request_number',
            'requested_by',
            'requested_by_name',
            'requested_at',
            'target_employee',
            'target_employee_name',
            'template',
            'template_name',
            'subject',
            'body_text',
            'status',
            'priority',
            'created_at',
        ]

    def get_requested_by_name(self, obj):
        if obj.requested_by:
            return obj.requested_by.get_full_name() or obj.requested_by.username
        return None

    def get_target_employee_name(self, obj):
        if obj.target_employee:
            return obj.target_employee.get_full_name() or obj.target_employee.username
        return None

    def get_template_name(self, obj):
        return obj.template.name if obj.template else None


class ReportRequestCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating report requests."""

    class Meta:
        model = ReportRequest
        fields = [
            'id',  # Include ID in response for workflow actions
            'request_number',
            'template',
            'target_employee',
            'target_school',
            'subject',
            'recipient_text',
            'body_text',
            'line_spacing',
            'custom_fields',
            'priority',
            'status',
        ]
        read_only_fields = ['id', 'request_number', 'status']

    def validate_template(self, value):
        """Validate that template exists and is active."""
        if not value.is_active:
            raise serializers.ValidationError("Template is not active.")
        return value

    def validate(self, attrs):
        request = self.context.get('request')
        user = request.user
        template = attrs.get('template')
        target_employee = attrs.get('target_employee')

        # Check if user role is allowed
        if user.role not in template.allowed_roles:
            raise serializers.ValidationError(
                f"Your role ({user.role}) is not allowed to use this template."
            )

        # Check self vs other request permissions
        is_self_request = target_employee is None or target_employee.id == user.id
        if is_self_request and not template.allowed_self_request:
            raise serializers.ValidationError(
                "This template cannot be used for self-requests."
            )
        if not is_self_request and not template.allowed_other_request:
            raise serializers.ValidationError(
                "This template cannot be used for requests on behalf of others."
            )

        # Check scope permissions for non-admin users
        if not is_self_request and user.role != 'Admin':
            if user.role == 'Teacher':
                # Teachers can only request for employees in their assigned schools
                user_schools = set(user.assigned_schools.values_list('id', flat=True))
                target_schools = set(target_employee.assigned_schools.values_list('id', flat=True))
                if not (user_schools & target_schools):
                    raise serializers.ValidationError(
                        "You can only request reports for employees in your assigned schools."
                    )
            else:
                # BDM and Student can only request for themselves
                raise serializers.ValidationError(
                    "You can only request reports for yourself."
                )

        # Check required fields
        # Note: target_employee=None means "self" request, which is a valid target
        # So we only fail if requires_target_employee AND it's neither provided NOR a self-request
        if template.requires_target_employee and not target_employee and not template.allowed_self_request:
            raise serializers.ValidationError(
                "This template requires a target employee."
            )

        target_school = attrs.get('target_school')
        if template.requires_target_school and not target_school:
            raise serializers.ValidationError(
                "This template requires a target school."
            )

        return attrs

    def create(self, validated_data):
        request = self.context.get('request')
        validated_data['requested_by'] = request.user

        # If no target_employee, set to self
        if not validated_data.get('target_employee'):
            validated_data['target_employee'] = request.user

        return super().create(validated_data)


class ReportRequestUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating draft requests."""

    class Meta:
        model = ReportRequest
        fields = [
            'subject',
            'recipient_text',
            'body_text',
            'line_spacing',
            'custom_fields',
        ]

    def validate(self, attrs):
        # Can only update draft requests
        if self.instance and self.instance.status != 'DRAFT':
            raise serializers.ValidationError(
                "Only draft requests can be edited."
            )
        return attrs


class ApproveRequestSerializer(serializers.Serializer):
    """Serializer for approving a request."""
    admin_notes = serializers.CharField(required=False, allow_blank=True)
    priority = serializers.ChoiceField(
        choices=['normal', 'high', 'urgent'],
        required=False
    )
    body_text = serializers.CharField(required=False, allow_blank=True)


class RejectRequestSerializer(serializers.Serializer):
    """Serializer for rejecting a request."""
    rejection_reason = serializers.CharField(required=True, min_length=10)
    admin_notes = serializers.CharField(required=False, allow_blank=True)


class CustomReportSerializer(serializers.ModelSerializer):
    """Full serializer for detail view."""
    generated_by_username = serializers.SerializerMethodField()
    template_display = serializers.ReadOnlyField()
    short_body = serializers.ReadOnlyField()

    class Meta:
        model = CustomReport
        fields = [
            'id',
            'recipient',
            'subject',
            'body_text',
            'line_spacing',
            'template_type',
            'template_display',
            'generated_by',
            'generated_by_name',
            'generated_by_username',
            'short_body',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'generated_by', 'created_at', 'updated_at']

    def get_generated_by_username(self, obj):
        return obj.generated_by.username if obj.generated_by else None


class CustomReportListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list view (excludes full body_text)."""
    template_display = serializers.ReadOnlyField()
    short_body = serializers.ReadOnlyField()

    class Meta:
        model = CustomReport
        fields = [
            'id',
            'recipient',
            'subject',
            'short_body',
            'line_spacing',
            'template_type',
            'template_display',
            'generated_by_name',
            'created_at',
        ]


class CustomReportCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating reports."""

    class Meta:
        model = CustomReport
        fields = [
            'recipient',
            'subject',
            'body_text',
            'line_spacing',
            'template_type',
        ]

    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user:
            validated_data['generated_by'] = request.user
            validated_data['generated_by_name'] = request.user.get_full_name() or request.user.username
        return super().create(validated_data)

    def update(self, instance, validated_data):
        request = self.context.get('request')
        if request and request.user:
            validated_data['generated_by'] = request.user
            validated_data['generated_by_name'] = request.user.get_full_name() or request.user.username
        return super().update(instance, validated_data)
