# ============================================
# REPORTS SERIALIZERS - Custom Report API
# ============================================
# Location: backend/reports/serializers.py

from rest_framework import serializers
from .models import CustomReport


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
