# ============================================
# MONITORING SERIALIZERS
# ============================================

from rest_framework import serializers

from .models import (
    MonitoringVisit,
    TeacherEvaluation,
    EvaluationQuestion,
)
from students.models import CustomUser


# ============================================
# EVALUATION QUESTION SERIALIZERS
# ============================================

class EvaluationQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = EvaluationQuestion
        fields = ['id', 'question_text', 'answer_text', 'rating', 'order']


# ============================================
# TEACHER EVALUATION SERIALIZERS
# ============================================

class TeacherEvaluationSerializer(serializers.ModelSerializer):
    teacher_name = serializers.SerializerMethodField()
    questions = EvaluationQuestionSerializer(many=True, read_only=True)

    class Meta:
        model = TeacherEvaluation
        fields = [
            'id', 'visit', 'teacher', 'teacher_name',
            'total_score', 'normalized_score',
            'remarks', 'areas_of_improvement', 'teacher_strengths',
            'questions', 'submitted_at',
        ]
        read_only_fields = ['total_score', 'normalized_score', 'submitted_at']

    def get_teacher_name(self, obj):
        return obj.teacher.get_full_name() or obj.teacher.username


class TeacherEvaluationListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for evaluation lists."""
    teacher_name = serializers.SerializerMethodField()

    class Meta:
        model = TeacherEvaluation
        fields = [
            'id', 'teacher', 'teacher_name',
            'normalized_score',
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
    evaluations_count = serializers.SerializerMethodField()

    class Meta:
        model = MonitoringVisit
        fields = [
            'id', 'bdm', 'school', 'school_name', 'bdm_name',
            'visit_date', 'start_time', 'end_time',
            'status', 'purpose', 'notes',
            'evaluations_count',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['bdm', 'visit_date', 'start_time', 'end_time', 'created_at', 'updated_at']

    def get_bdm_name(self, obj):
        return obj.bdm.get_full_name() or obj.bdm.username

    def get_evaluations_count(self, obj):
        if hasattr(obj, '_evaluations_count'):
            return obj._evaluations_count
        return obj.evaluations.count()


class MonitoringVisitDetailSerializer(MonitoringVisitSerializer):
    """Visit detail with nested evaluations."""
    evaluations = TeacherEvaluationListSerializer(many=True, read_only=True)

    class Meta(MonitoringVisitSerializer.Meta):
        fields = MonitoringVisitSerializer.Meta.fields + ['evaluations']
