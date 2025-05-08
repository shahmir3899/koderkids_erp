from rest_framework import serializers
from .models import Student, Fee, School, Attendance, LessonPlan

from .models import LessonPlan, StudentImage

class StudentSerializer(serializers.ModelSerializer):
    school_id = serializers.PrimaryKeyRelatedField(queryset=School.objects.all())  # ✅ Fix school_id reference
    school_name = serializers.CharField(source='school.name', read_only=True)

    class Meta:
        model = Student
        fields = '__all__'

class FeeSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.name', read_only=True)  # Get student name
    school_name = serializers.CharField(source='school.name', read_only=True)
    class Meta:
        model = Fee
        fields = [
            'id',
            'student_id',
            'student_name',
            'school',
            'school_name',  # ✅ Add this to output
            'student_class',
            'month',
            'monthly_fee',
            'total_fee',
            'paid_amount',
            'balance_due',
            'payment_date',
            'status'
        ]

class FeeSummarySerializer(serializers.Serializer):
    school_id = serializers.IntegerField()
    school_name = serializers.CharField()
    total_fee = serializers.FloatField()
    paid_amount = serializers.FloatField()
    balance_due = serializers.FloatField()

class SchoolSerializer(serializers.ModelSerializer):
    class Meta:
        model = School
        fields = '__all__'

class AttendanceSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.name', read_only=True)  # Fetch student name
    teacher_name = serializers.CharField(source='teacher.username', read_only=True)

    class Meta:
        model = Attendance
        fields = ['id', 'student', 'student_name', 'session_date', 'status', 'teacher', 'teacher_name']
        read_only_fields = ['teacher']

class LessonPlanSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source='teacher.username', read_only=True)
    school_name = serializers.CharField(source='school.name', read_only=True)

    class Meta:
        model = LessonPlan
        fields = ['id', 'session_date', 'teacher', 'teacher_name', 'school', 'school_name', 'student_class', 'planned_topic', 'achieved_topic']
        read_only_fields = ['teacher', 'school']


#Teacher Dashboard APIs


class MonthlyLessonsSerializer(serializers.Serializer):
    student_class = serializers.CharField()
    lesson_count = serializers.IntegerField()
    school_name = serializers.CharField(source='school__name')

class UpcomingLessonsSerializer(serializers.ModelSerializer):
    school_name = serializers.CharField(source='school.name')
    class_name = serializers.CharField(source='student_class')  # Match frontend
    topic = serializers.CharField(source='planned_topic')  # Match frontend

    class Meta:
        model = LessonPlan
        fields = ['session_date', 'class_name', 'school_name', 'topic']

class LessonStatusSerializer(serializers.Serializer):
    student_class = serializers.CharField()
    school_name = serializers.CharField(source='school__name')
    planned_lessons = serializers.IntegerField()
    completed_lessons = serializers.IntegerField()
    completion_rate = serializers.FloatField()

class SchoolLessonsSerializer(serializers.Serializer):
    school_name = serializers.CharField(source='school__name')
    total_lessons = serializers.IntegerField()
    classes_covered = serializers.ListField(child=serializers.CharField())

class StudentEngagementSerializer(serializers.Serializer):
    student_class = serializers.CharField(source='student__student_class')
    image_count = serializers.IntegerField()
    student_count = serializers.IntegerField()