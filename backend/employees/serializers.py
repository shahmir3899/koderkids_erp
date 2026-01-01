# ============================================
# EMPLOYEES SERIALIZERS
# NOW INCLUDES ADMIN PROFILE SERIALIZERS
# ============================================

from rest_framework import serializers
from .models import TeacherProfile, TeacherEarning, TeacherDeduction, Notification
from students.models import CustomUser, School


class SchoolSerializer(serializers.ModelSerializer):
    """Serializer for School model"""
    class Meta:
        model = School
        fields = ['id', 'name']


class TeacherProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for TeacherProfile with nested user data
    """
    # User fields (read-only from user model)
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    full_name = serializers.SerializerMethodField()
    role = serializers.CharField(source='user.role', read_only=True)
    
    # Assigned schools
    assigned_schools = serializers.SerializerMethodField()
    school_names = serializers.SerializerMethodField()
    
    class Meta:
        model = TeacherProfile
        fields = [
            # User info
            'username', 'email', 'first_name', 'last_name', 'full_name', 'role',
            # Profile info
            'employee_id', 'profile_photo_url', 'title', 'gender', 'blood_group',
            'phone', 'address', 'date_of_joining',
            # Financial
            'basic_salary', 'bank_name', 'account_number',
            # Schools
            'assigned_schools', 'school_names',
            # Timestamps
            'created_at', 'updated_at',
        ]
        read_only_fields = ['employee_id', 'created_at', 'updated_at']

    def get_full_name(self, obj):
        return obj.user.get_full_name() or obj.user.username

    def get_assigned_schools(self, obj):
        schools = obj.user.assigned_schools.all()
        return SchoolSerializer(schools, many=True).data

    def get_school_names(self, obj):
        schools = obj.user.assigned_schools.all()
        return [school.name for school in schools]


class TeacherProfileUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating TeacherProfile
    """
    first_name = serializers.CharField(write_only=True, required=False)
    last_name = serializers.CharField(write_only=True, required=False)
    
    class Meta:
        model = TeacherProfile
        fields = [
            'first_name', 'last_name',
            'title', 'gender', 'blood_group', 'phone', 'address',
            'date_of_joining', 'basic_salary', 'bank_name', 'account_number',
            'profile_photo_url',
        ]

    def update(self, instance, validated_data):
        # Update user fields if provided
        first_name = validated_data.pop('first_name', None)
        last_name = validated_data.pop('last_name', None)
        
        if first_name is not None:
            instance.user.first_name = first_name
        if last_name is not None:
            instance.user.last_name = last_name
        
        if first_name is not None or last_name is not None:
            instance.user.save()
        
        # Update profile fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        return instance


# ============================================
# ADMIN PROFILE SERIALIZERS (NEW)
# ============================================

class AdminProfileSerializer(serializers.ModelSerializer):
    """
    Serializer for Admin profile (uses TeacherProfile model)
    Similar to TeacherProfileSerializer but without school-related fields
    """
    # User fields (read-only from user model)
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.EmailField(source='user.email', read_only=True)
    first_name = serializers.CharField(source='user.first_name', read_only=True)
    last_name = serializers.CharField(source='user.last_name', read_only=True)
    full_name = serializers.SerializerMethodField()
    role = serializers.CharField(source='user.role', read_only=True)
    
    class Meta:
        model = TeacherProfile
        fields = [
            # User info
            'username', 'email', 'first_name', 'last_name', 'full_name', 'role',
            # Profile info
            'employee_id', 'profile_photo_url', 'title', 'gender', 'blood_group',
            'phone', 'address', 'date_of_joining',
            # Financial (optional for admin, but keeping for consistency)
            'basic_salary', 'bank_name', 'account_number',
            # Timestamps
            'created_at', 'updated_at',
        ]
        read_only_fields = ['employee_id', 'created_at', 'updated_at']

    def get_full_name(self, obj):
        return obj.user.get_full_name() or obj.user.username


class AdminProfileUpdateSerializer(serializers.ModelSerializer):
    """
    Serializer for updating Admin profile
    Allows updating first_name, last_name, and profile fields
    """
    first_name = serializers.CharField(write_only=True, required=False)
    last_name = serializers.CharField(write_only=True, required=False)
    
    class Meta:
        model = TeacherProfile
        fields = [
            'first_name', 'last_name',
            'title', 'gender', 'blood_group', 'phone', 'address',
            'profile_photo_url',
        ]

    def update(self, instance, validated_data):
        # Update user fields if provided
        first_name = validated_data.pop('first_name', None)
        last_name = validated_data.pop('last_name', None)
        
        if first_name is not None:
            instance.user.first_name = first_name
        if last_name is not None:
            instance.user.last_name = last_name
        
        if first_name is not None or last_name is not None:
            instance.user.save()
        
        # Update profile fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
        instance.save()
        return instance


# ============================================
# EARNINGS & DEDUCTIONS SERIALIZERS
# ============================================

class TeacherEarningSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeacherEarning
        fields = ['id', 'category', 'amount', 'description', 'created_at']


class TeacherDeductionSerializer(serializers.ModelSerializer):
    class Meta:
        model = TeacherDeduction
        fields = ['id', 'category', 'amount', 'description', 'created_at']


# ============================================
# NOTIFICATION SERIALIZERS
# ============================================

class NotificationSerializer(serializers.ModelSerializer):
    """
    Serializer for Notification model
    """
    sender_name = serializers.SerializerMethodField()
    time_ago = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = [
            'id', 'title', 'message', 'notification_type',
            'sender_name', 'related_url', 'is_read', 'read_at',
            'created_at', 'time_ago'
        ]
        read_only_fields = ['id', 'created_at', 'sender_name', 'time_ago']

    def get_sender_name(self, obj):
        if obj.sender:
            return obj.sender.get_full_name() or obj.sender.username
        return 'System'

    def get_time_ago(self, obj):
        from django.utils import timezone
        from datetime import timedelta
        
        now = timezone.now()
        diff = now - obj.created_at
        
        if diff < timedelta(minutes=1):
            return 'Just now'
        elif diff < timedelta(hours=1):
            minutes = int(diff.total_seconds() / 60)
            return f'{minutes}m ago'
        elif diff < timedelta(days=1):
            hours = int(diff.total_seconds() / 3600)
            return f'{hours}h ago'
        elif diff < timedelta(days=7):
            days = diff.days
            return f'{days}d ago'
        else:
            return obj.created_at.strftime('%b %d, %Y')


class NotificationCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating notifications
    """
    class Meta:
        model = Notification
        fields = ['recipient', 'title', 'message', 'notification_type', 'related_url']


class ProfilePhotoUploadSerializer(serializers.Serializer):
    """
    Serializer for profile photo upload response
    """
    profile_photo_url = serializers.URLField()
    message = serializers.CharField(default='Profile photo updated successfully')