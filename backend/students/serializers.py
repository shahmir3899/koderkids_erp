from rest_framework import serializers
from .models import Student, Fee, School, Attendance, LessonPlan

from .models import LessonPlan, StudentImage
from books.models import Topic

class StudentSerializer(serializers.ModelSerializer):
    # ✅ FIX: Use 'school' as the source for school_id field
    # This maps the incoming 'school' field to the model's 'school' ForeignKey
    school = serializers.PrimaryKeyRelatedField(queryset=School.objects.all())
    
    # Read-only field to return school name in responses
    school_name = serializers.CharField(source='school.name', read_only=True)

    class Meta:
        model = Student
        fields = '__all__'
    
    def validate(self, attrs):
        """Debug logging for validation"""
        print(f"🔍 StudentSerializer.validate() called with attrs: {attrs}")
        return super().validate(attrs)
    
    def update(self, instance, validated_data):
        """Debug logging for update"""
        print(f"🔍 StudentSerializer.update() called")
        print(f"🔍 Instance: {instance}")
        print(f"🔍 Validated data: {validated_data}")
        return super().update(instance, validated_data)
    
    def to_representation(self, instance):
        """Customize the output to include school name instead of just ID"""
        representation = super().to_representation(instance)
        # Replace school ID with school name for display
        if instance.school:
            representation['school'] = instance.school.name
        return representation

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

# In students/serializers.py
# REPLACE the existing SchoolSerializer with:

class SchoolSerializer(serializers.ModelSerializer):
    # Read-only computed fields
    total_students = serializers.SerializerMethodField()
    total_classes = serializers.SerializerMethodField()
    monthly_revenue = serializers.SerializerMethodField()
    capacity_utilization = serializers.SerializerMethodField()
    
    class Meta:
        model = School
        fields = [
            'id', 'name', 'location', 'address', 'logo',
            'latitude', 'longitude', 'contact_email', 'contact_phone',
            'established_date', 'total_capacity', 'is_active',
            'created_at', 'updated_at',
            'payment_mode', 'monthly_subscription_amount',
            # Computed fields
            'total_students', 'total_classes', 'monthly_revenue', 'capacity_utilization'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def get_total_students(self, obj):
        """Count active students in this school"""
        return obj.students.filter(status='Active').count()
    
    def get_total_classes(self, obj):
        """Count unique classes in this school"""
        return obj.students.filter(status='Active').values('student_class').distinct().count()
    
    def get_monthly_revenue(self, obj):
        """Sum of monthly fees for all active students"""
        from django.db.models import Sum
        total = obj.students.filter(status='Active').aggregate(
            total=Sum('monthly_fee')
        )['total']
        return float(total) if total else 0.0
    
    def get_capacity_utilization(self, obj):
        """Percentage of capacity filled"""
        if not obj.total_capacity:
            return None
        total_students = obj.students.filter(status='Active').count()
        return round((total_students / obj.total_capacity) * 100, 2)


# ✅ ADD THIS NEW SERIALIZER for detailed statistics:

class SchoolStatsSerializer(serializers.ModelSerializer):
    """Detailed school statistics with class breakdown"""
    total_students = serializers.SerializerMethodField()
    total_classes = serializers.SerializerMethodField()
    monthly_revenue = serializers.SerializerMethodField()
    capacity_utilization = serializers.SerializerMethodField()
    class_breakdown = serializers.SerializerMethodField()
    gender_distribution = serializers.SerializerMethodField()
    
    class Meta:
        model = School
        fields = [
            'id', 'name', 'location', 'address', 'logo',
            'latitude', 'longitude', 'contact_email', 'contact_phone',
            'established_date', 'total_capacity', 'is_active',
            'total_students', 'total_classes', 'monthly_revenue',
            'capacity_utilization', 'class_breakdown', 'gender_distribution'
        ]
    
    def get_total_students(self, obj):
        return obj.students.filter(status='Active').count()
    
    def get_total_classes(self, obj):
        return obj.students.filter(status='Active').values('student_class').distinct().count()
    
    def get_monthly_revenue(self, obj):
        from django.db.models import Sum
        total = obj.students.filter(status='Active').aggregate(
            total=Sum('monthly_fee')
        )['total']
        return float(total) if total else 0.0
    
    def get_capacity_utilization(self, obj):
        if not obj.total_capacity:
            return None
        total_students = obj.students.filter(status='Active').count()
        return round((total_students / obj.total_capacity) * 100, 2)
    
    def get_class_breakdown(self, obj):
        """Returns list of classes with student count and revenue"""
        from django.db.models import Count, Sum
        
        classes = obj.students.filter(status='Active').values('student_class').annotate(
            student_count=Count('id'),
            class_revenue=Sum('monthly_fee')
        ).order_by('student_class')
        
        return [
            {
                'class_name': cls['student_class'],
                'students': cls['student_count'],
                'monthly_revenue': float(cls['class_revenue']) if cls['class_revenue'] else 0.0
            }
            for cls in classes
        ]
    
    def get_gender_distribution(self, obj):
        """Returns gender breakdown"""
        from django.db.models import Count
        
        gender_counts = obj.students.filter(status='Active').values('gender').annotate(
            count=Count('id')
        )
        
        result = {'Male': 0, 'Female': 0, 'Other': 0}
        for item in gender_counts:
            result[item['gender']] = item['count']
        
        return result


class AttendanceSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.name', read_only=True)  # Fetch student name
    teacher_name = serializers.CharField(source='teacher.username', read_only=True)

    class Meta:
        model = Attendance
        fields = ['id', 'student', 'student_name', 'session_date', 'status', 'teacher', 'teacher_name']
        read_only_fields = ['teacher']


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