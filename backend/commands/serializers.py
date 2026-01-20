"""
Serializers for Staff Commands
"""

from rest_framework import serializers
from .models import Command, QuickAction, StaffAttendance


class CommandExecuteSerializer(serializers.Serializer):
    """Serializer for command execution request."""

    command = serializers.CharField(
        required=False,
        allow_blank=True,
        help_text="Natural language command text"
    )
    command_id = serializers.IntegerField(
        required=False,
        help_text="ID of existing command (for continuing after clarification)"
    )
    clarification = serializers.DictField(
        required=False,
        help_text="User's clarification selection {id, label}"
    )
    source_page = serializers.CharField(
        required=False,
        allow_blank=True,
        default='',
        help_text="Page from which command was issued"
    )
    school_id = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="Context school ID"
    )

    def validate(self, data):
        """Ensure either command or command_id+clarification is provided."""
        command = data.get('command', '').strip()
        command_id = data.get('command_id')
        clarification = data.get('clarification')

        if not command and not (command_id and clarification):
            raise serializers.ValidationError(
                "Either 'command' or both 'command_id' and 'clarification' must be provided."
            )

        return data


class CommandSerializer(serializers.ModelSerializer):
    """Serializer for Command model (read-only, for history)."""

    executed_by_name = serializers.SerializerMethodField()
    school_name = serializers.CharField(source='school.name', read_only=True)
    duration_ms = serializers.SerializerMethodField()

    class Meta:
        model = Command
        fields = [
            'id',
            'raw_input',
            'parsed_intent',
            'parsed_entities',
            'agent',
            'executed_by',
            'executed_by_name',
            'source_page',
            'school',
            'school_name',
            'status',
            'clarification_type',
            'clarification_options',
            'selected_option',
            'api_endpoint',
            'api_method',
            'response_message',
            'response_data',
            'error_message',
            'created_at',
            'completed_at',
            'duration_ms',
        ]
        read_only_fields = fields

    def get_executed_by_name(self, obj):
        """Get full name of user who executed the command."""
        if obj.executed_by:
            return obj.executed_by.get_full_name() or obj.executed_by.username
        return None

    def get_duration_ms(self, obj):
        """Calculate execution duration in milliseconds."""
        if obj.created_at and obj.completed_at:
            delta = obj.completed_at - obj.created_at
            return int(delta.total_seconds() * 1000)
        return None


class CommandListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for command list view."""

    executed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Command
        fields = [
            'id',
            'raw_input',
            'agent',
            'status',
            'executed_by_name',
            'response_message',
            'created_at',
        ]
        read_only_fields = fields

    def get_executed_by_name(self, obj):
        if obj.executed_by:
            return obj.executed_by.get_full_name() or obj.executed_by.username
        return None


class QuickActionSerializer(serializers.ModelSerializer):
    """Serializer for QuickAction model."""

    class Meta:
        model = QuickAction
        fields = [
            'id',
            'name',
            'icon',
            'agent',
            'description',
            'command_template',
            'required_params',
            'api_endpoint',
            'api_method',
            'allowed_roles',
            'is_active',
            'order',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class StaffAttendanceSerializer(serializers.ModelSerializer):
    """Serializer for StaffAttendance model."""

    staff_name = serializers.SerializerMethodField()
    school_name = serializers.CharField(source='school.name', read_only=True)
    marked_by_name = serializers.SerializerMethodField()
    substitute_name = serializers.SerializerMethodField()

    class Meta:
        model = StaffAttendance
        fields = [
            'id',
            'staff',
            'staff_name',
            'date',
            'status',
            'check_in_time',
            'check_out_time',
            'school',
            'school_name',
            'marked_by',
            'marked_by_name',
            'substitute',
            'substitute_name',
            'substitute_reason',
            'notes',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'marked_by']

    def get_staff_name(self, obj):
        return obj.staff.get_full_name() if obj.staff else None

    def get_marked_by_name(self, obj):
        return obj.marked_by.get_full_name() if obj.marked_by else None

    def get_substitute_name(self, obj):
        return obj.substitute.get_full_name() if obj.substitute else None


class StaffAttendanceCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating staff attendance."""

    class Meta:
        model = StaffAttendance
        fields = [
            'staff',
            'date',
            'status',
            'check_in_time',
            'check_out_time',
            'school',
            'substitute',
            'substitute_reason',
            'notes',
        ]

    def validate(self, data):
        """Validate attendance data."""
        # Check if attendance already exists
        staff = data.get('staff')
        attendance_date = data.get('date')

        if staff and attendance_date:
            existing = StaffAttendance.objects.filter(
                staff=staff,
                date=attendance_date
            ).exists()

            # Only raise error on create, not update
            if existing and not self.instance:
                raise serializers.ValidationError(
                    f"Attendance already exists for {staff.get_full_name()} on {attendance_date}. "
                    "Use update endpoint to modify."
                )

        return data


class ClarificationResponseSerializer(serializers.Serializer):
    """Serializer for clarification response structure."""

    field = serializers.CharField(help_text="Field being clarified")
    message = serializers.CharField(help_text="Question to display to user")
    options = serializers.ListField(
        child=serializers.DictField(),
        help_text="List of options [{id, label}, ...]"
    )


class CommandExecuteResponseSerializer(serializers.Serializer):
    """Serializer for command execution response."""

    success = serializers.BooleanField()
    message = serializers.CharField()
    needs_clarification = serializers.BooleanField(default=False)
    clarification = ClarificationResponseSerializer(required=False)
    data = serializers.DictField(required=False, allow_null=True)
    toast = serializers.DictField(required=False)
    command_id = serializers.IntegerField()
    agent = serializers.CharField(required=False)
    intent = serializers.CharField(required=False)
    suggestions = serializers.ListField(
        child=serializers.DictField(),
        required=False
    )
