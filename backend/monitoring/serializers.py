# ============================================
# MONITORING SERIALIZERS
# ============================================

from rest_framework import serializers
from django.db.models import Count

from .models import (
    MonitoringVisit,
    EvaluationFormTemplate,
    EvaluationFormField,
    TeacherEvaluation,
    EvaluationResponse,
)


# ============================================
# FORM TEMPLATE SERIALIZERS
# ============================================

class EvaluationFormFieldSerializer(serializers.ModelSerializer):
    class Meta:
        model = EvaluationFormField
        fields = [
            'id', 'label', 'field_type', 'is_required',
            'order', 'options', 'weight',
        ]


class EvaluationFormTemplateSerializer(serializers.ModelSerializer):
    fields = EvaluationFormFieldSerializer(many=True, read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = EvaluationFormTemplate
        fields = [
            'id', 'name', 'description', 'is_active',
            'fields', 'created_by', 'created_by_name',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['created_by', 'created_at', 'updated_at']

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.username
        return None


class EvaluationFormTemplateListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for template dropdowns."""
    field_count = serializers.SerializerMethodField()

    class Meta:
        model = EvaluationFormTemplate
        fields = ['id', 'name', 'description', 'is_active', 'field_count']

    def get_field_count(self, obj):
        if hasattr(obj, '_field_count'):
            return obj._field_count
        return obj.fields.count()


# ============================================
# EVALUATION RESPONSE SERIALIZERS
# ============================================

class EvaluationResponseSerializer(serializers.ModelSerializer):
    field_label = serializers.CharField(source='field.label', read_only=True)
    field_type = serializers.CharField(source='field.field_type', read_only=True)

    class Meta:
        model = EvaluationResponse
        fields = [
            'id', 'field', 'field_label', 'field_type',
            'value', 'numeric_value',
        ]


class EvaluationResponseWriteSerializer(serializers.Serializer):
    """Used when submitting an evaluation with responses."""
    field_id = serializers.IntegerField()
    value = serializers.CharField(allow_blank=True)
    numeric_value = serializers.DecimalField(
        max_digits=5, decimal_places=2,
        required=False, allow_null=True,
    )


# ============================================
# TEACHER EVALUATION SERIALIZERS
# ============================================

class TeacherEvaluationSerializer(serializers.ModelSerializer):
    teacher_name = serializers.SerializerMethodField()
    template_name = serializers.CharField(source='template.name', read_only=True)
    responses = EvaluationResponseSerializer(many=True, read_only=True)

    class Meta:
        model = TeacherEvaluation
        fields = [
            'id', 'visit', 'teacher', 'teacher_name',
            'template', 'template_name',
            'total_score', 'normalized_score',
            'remarks', 'areas_of_improvement', 'teacher_strengths',
            'responses', 'submitted_at',
        ]
        read_only_fields = ['total_score', 'normalized_score', 'submitted_at']

    def get_teacher_name(self, obj):
        return obj.teacher.get_full_name() or obj.teacher.username


class TeacherEvaluationListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for evaluation lists."""
    teacher_name = serializers.SerializerMethodField()
    template_name = serializers.CharField(source='template.name', read_only=True)

    class Meta:
        model = TeacherEvaluation
        fields = [
            'id', 'teacher', 'teacher_name',
            'template_name', 'normalized_score',
            'submitted_at',
        ]

    def get_teacher_name(self, obj):
        return obj.teacher.get_full_name() or obj.teacher.username


# ============================================
# VISIT SERIALIZERS
# ============================================

class MonitoringVisitSerializer(serializers.ModelSerializer):
    school_name = serializers.CharField(source='school.name', read_only=True)
    bdm_name = serializers.SerializerMethodField()
    teacher_count = serializers.SerializerMethodField()
    evaluations_count = serializers.SerializerMethodField()

    class Meta:
        model = MonitoringVisit
        fields = [
            'id', 'bdm', 'school', 'school_name', 'bdm_name',
            'visit_date', 'planned_time', 'start_time', 'end_time',
            'status', 'purpose', 'notes',
            'teacher_count', 'evaluations_count',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']
        extra_kwargs = {
            'bdm': {'required': False},
        }

    def get_bdm_name(self, obj):
        return obj.bdm.get_full_name() or obj.bdm.username

    def get_teacher_count(self, obj):
        if hasattr(obj, '_teacher_count'):
            return obj._teacher_count
        return obj.school.teachers.filter(role='Teacher', is_active=True).count()

    def get_evaluations_count(self, obj):
        if hasattr(obj, '_evaluations_count'):
            return obj._evaluations_count
        return obj.evaluations.count()

    def validate_bdm(self, value):
        if value and value.role != 'BDM':
            raise serializers.ValidationError('Assigned user must have BDM role')
        if value and not value.is_active:
            raise serializers.ValidationError('Assigned BDM must be active')
        return value

    def validate(self, attrs):
        request = self.context.get('request')
        if not request or not hasattr(request, 'user'):
            return attrs

        user = request.user
        requested_bdm = attrs.get('bdm')
        is_create = self.instance is None

        if user.role == 'Admin':
            if is_create and not requested_bdm:
                raise serializers.ValidationError({
                    'bdm': 'Admin must assign a BDM when creating a visit.'
                })
        elif user.role == 'BDM':
            if requested_bdm and requested_bdm != user:
                raise serializers.ValidationError({
                    'bdm': 'BDMs cannot assign visits to another BDM.'
                })

        return attrs


class MonitoringVisitDetailSerializer(MonitoringVisitSerializer):
    """Visit detail with nested evaluations."""
    evaluations = TeacherEvaluationListSerializer(many=True, read_only=True)

    class Meta(MonitoringVisitSerializer.Meta):
        fields = MonitoringVisitSerializer.Meta.fields + ['evaluations']
