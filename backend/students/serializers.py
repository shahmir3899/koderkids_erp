from rest_framework import serializers
from .models import Student, Fee, School, Attendance, LessonPlan

class StudentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Student
        fields = '__all__'

class FeeSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.name', read_only=True)  # Get student name

    class Meta:
        model = Fee
        fields = ['id', 'student', 'student_name', 'month', 'total_fee', 'paid_amount', 'balance_due', 'payment_date', 'status']
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