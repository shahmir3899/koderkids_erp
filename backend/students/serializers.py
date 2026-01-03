from rest_framework import serializers
from django.db import transaction
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

class StudentProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for student profile that includes both Student and CustomUser fields.
    
    Editable Fields:
    - first_name, last_name (CustomUser)
    - phone, address (Student)
    
    Read-Only Fields:
    - email, username (CustomUser)
    - reg_num, school, student_class, monthly_fee, status (Student)
    """
    
    # ============================================
    # CUSTOMUSER FIELDS (from user relationship)
    # ============================================
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    
    # Editable CustomUser fields
    first_name = serializers.CharField(
        source='user.first_name',
        max_length=150,
        required=False,
        allow_blank=True
    )
    last_name = serializers.CharField(
        source='user.last_name',
        max_length=150,
        required=False,
        allow_blank=True
    )
    
    # Computed field
    full_name = serializers.SerializerMethodField()
    
    # Profile photo from CustomUser (centralized across all roles)
    profile_photo_url = serializers.URLField(
        source='user.profile_photo_url',
        read_only=True,
        allow_null=True
    )
    
    # ============================================
    # STUDENT FIELDS (academic/contact info)
    # ============================================
    school_name = serializers.CharField(source='school.name', read_only=True)
    school_id = serializers.IntegerField(source='school.id', read_only=True)
    
    class Meta:
        model = Student
        fields = [
            # CustomUser fields
            'user_id',
            'username',
            'email',
            'first_name',
            'last_name',
            'full_name',
            'profile_photo_url',
            
            # Student fields (read-only academic data)
            'id',
            'reg_num',
            'name',
            'gender',
            'school_id',
            'school_name',
            'student_class',
            'monthly_fee',
            'date_of_birth',
            'status',
            'date_of_registration',
            
            # Student fields (editable contact info)
            'phone',
            'address',
            
            # Timestamps
            'created_at',
            'updated_at',
        ]
        
        read_only_fields = [
            # Identity fields
            'user_id',
            'username',
            'email',
            
            # Student admin-only fields
            'id',
            'reg_num',
            'name',
            'gender',
            'school_id',
            'school_name',
            'student_class',
            'monthly_fee',
            'date_of_birth',
            'status',
            'date_of_registration',
            
            # System fields
            'profile_photo_url',
            'created_at',
            'updated_at',
        ]
    
    def get_full_name(self, obj):
        """Compute full name from first_name and last_name"""
        user = obj.user
        full_name = f"{user.first_name} {user.last_name}".strip()
        return full_name if full_name else user.username
    
    @transaction.atomic
    def update(self, instance, validated_data):
        """
        Update both CustomUser and Student models in a single transaction.
        
        Args:
            instance: Student instance
            validated_data: Validated data from serializer
        
        Returns:
            Updated Student instance
        """
        # Extract nested user data
        user_data = validated_data.pop('user', {})
        
        # Update CustomUser fields
        if user_data:
            user = instance.user
            for attr, value in user_data.items():
                setattr(user, attr, value)
            user.save()
        
        # Update Student fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        return instance
    
    def validate_phone(self, value):
        """
        Validate phone number format (optional - customize as needed)
        """
        if value and len(value) < 10:
            raise serializers.ValidationError("Phone number must be at least 10 digits")
        return value


# ============================================
# OPTIONAL: Serializer for including fees/attendance
# (Use this if you want to include related data in responses)
# ============================================

class StudentProfileDetailSerializer(StudentProfileSerializer):
    """
    Extended serializer that includes fees and attendance data.
    Use this for GET requests if you want to include related data.
    """
    
    fees = serializers.SerializerMethodField()
    attendance = serializers.SerializerMethodField()
    
    class Meta(StudentProfileSerializer.Meta):
        fields = StudentProfileSerializer.Meta.fields + ['fees', 'attendance']
    
    def get_fees(self, obj):
        """Get recent fee records"""
        from .models import Fee
        fees = Fee.objects.filter(student_id=obj.id).order_by('-month')[:10]
        return [
            {
                'month': fee.month,
                'balance_due': str(fee.balance_due),
                'status': fee.status
            }
            for fee in fees
        ]
    
    def get_attendance(self, obj):
        """Get recent attendance records"""
        from .models import Attendance
        attendance = Attendance.objects.filter(student=obj).order_by('-session_date')[:30]
        return [
            {
                'session_date': att.session_date,
                'status': att.status
            }
            for att in attendance
        ]

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