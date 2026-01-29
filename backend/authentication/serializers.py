# backend/authentication/serializers.py
# ============================================
# USER MANAGEMENT SERIALIZERS - CORRECTED
# ============================================

from rest_framework import serializers
from students.models import CustomUser, School
import random
import string
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str

class UserListSerializer(serializers.ModelSerializer):
    """Serializer for listing users (minimal fields)"""
    assigned_schools_count = serializers.SerializerMethodField()
    assigned_schools_names = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    # TeacherProfile fields
    employee_id = serializers.SerializerMethodField()
    title = serializers.SerializerMethodField()
    date_of_joining = serializers.SerializerMethodField()
    basic_salary = serializers.SerializerMethodField()
    bank_name = serializers.SerializerMethodField()
    account_title = serializers.SerializerMethodField()
    account_number = serializers.SerializerMethodField()
    profile_photo_url = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'is_active', 'is_super_admin',
            'assigned_schools_count', 'assigned_schools_names',
            'last_login', 'created_at', 'created_by_name',
            # TeacherProfile fields
            'employee_id', 'title', 'date_of_joining', 'basic_salary',
            'bank_name', 'account_title', 'account_number', 'profile_photo_url',
        ]

    def get_assigned_schools_count(self, obj):
        return obj.assigned_schools.count()

    def get_assigned_schools_names(self, obj):
        names = list(obj.assigned_schools.values_list('name', flat=True))
        if len(names) == 1:
            return names[0]  # Return string for single school
        return names  # Return array for multiple schools

    def get_created_by_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip() or obj.created_by.username
        return "System"

    def _get_profile(self, obj):
        """Get TeacherProfile from prefetch cache or query (cached per serializer call)"""
        # Check if profile is already cached on this serializer instance
        cache_key = f'_profile_cache_{obj.id}'
        if hasattr(self, cache_key):
            return getattr(self, cache_key)

        profile = None
        try:
            # First try prefetched data (set by view's Prefetch)
            if hasattr(obj, '_prefetched_profile'):
                profile = obj._prefetched_profile
            else:
                # Fallback: try reverse relation (if exists)
                profile = getattr(obj, 'teacher_profile', None)
        except Exception:
            pass

        # Cache on serializer instance
        setattr(self, cache_key, profile)
        return profile

    def get_date_of_joining(self, obj):
        """Get date_of_joining from TeacherProfile if exists"""
        profile = self._get_profile(obj)
        if profile and profile.date_of_joining:
            return profile.date_of_joining.isoformat()
        return None

    def get_basic_salary(self, obj):
        """Get basic_salary from TeacherProfile if exists"""
        profile = self._get_profile(obj)
        if profile and profile.basic_salary:
            return float(profile.basic_salary)
        return None

    def get_employee_id(self, obj):
        """Get employee_id from TeacherProfile if exists"""
        profile = self._get_profile(obj)
        if profile and profile.employee_id:
            return profile.employee_id
        return None

    def get_title(self, obj):
        """Get title from TeacherProfile if exists"""
        profile = self._get_profile(obj)
        return profile.title if profile and profile.title else None

    def get_bank_name(self, obj):
        """Get bank_name from TeacherProfile if exists"""
        profile = self._get_profile(obj)
        return profile.bank_name if profile and profile.bank_name else None

    def get_account_title(self, obj):
        """Get account_title from TeacherProfile if exists"""
        profile = self._get_profile(obj)
        return profile.account_title if profile and profile.account_title else None

    def get_account_number(self, obj):
        """Get account_number from TeacherProfile if exists"""
        profile = self._get_profile(obj)
        return profile.account_number if profile and profile.account_number else None

    def get_profile_photo_url(self, obj):
        """Get profile_photo_url from CustomUser or TeacherProfile"""
        # First check CustomUser's profile_photo_url
        if obj.profile_photo_url:
            return obj.profile_photo_url
        # Fallback to TeacherProfile's profile_photo_url
        profile = self._get_profile(obj)
        if profile and hasattr(profile, 'profile_photo_url') and profile.profile_photo_url:
            return profile.profile_photo_url
        return None


class UserDetailSerializer(serializers.ModelSerializer):
    """Serializer for detailed user view"""
    assigned_schools = serializers.SerializerMethodField()
    assigned_schools_names = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    updated_by_name = serializers.SerializerMethodField()
    # TeacherProfile fields
    employee_id = serializers.SerializerMethodField()
    title = serializers.SerializerMethodField()
    date_of_joining = serializers.SerializerMethodField()
    basic_salary = serializers.SerializerMethodField()
    bank_name = serializers.SerializerMethodField()
    account_title = serializers.SerializerMethodField()
    account_number = serializers.SerializerMethodField()
    profile_photo_url = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'is_active', 'is_super_admin', 'is_staff',
            'assigned_schools', 'assigned_schools_names',
            'created_by', 'created_by_name',
            'updated_by', 'updated_by_name', 'created_at', 'updated_at',
            'last_login',
            # TeacherProfile fields
            'employee_id', 'title', 'date_of_joining', 'basic_salary',
            'bank_name', 'account_title', 'account_number', 'profile_photo_url',
        ]
        read_only_fields = ['id', 'created_by', 'updated_by', 'created_at', 'updated_at', 'last_login']

    def _get_profile(self, obj):
        """Get TeacherProfile if exists"""
        cache_key = f'_profile_cache_{obj.id}'
        if hasattr(self, cache_key):
            return getattr(self, cache_key)

        profile = None
        try:
            if hasattr(obj, '_prefetched_profile'):
                profile = obj._prefetched_profile
            else:
                profile = getattr(obj, 'teacher_profile', None)
        except Exception:
            pass

        setattr(self, cache_key, profile)
        return profile

    def get_assigned_schools(self, obj):
        return [school.id for school in obj.assigned_schools.all()]

    def get_assigned_schools_names(self, obj):
        names = list(obj.assigned_schools.values_list('name', flat=True))
        if len(names) == 1:
            return names[0]  # Return string for single school
        return names  # Return array for multiple schools

    def get_created_by_name(self, obj):
        if obj.created_by:
            return f"{obj.created_by.first_name} {obj.created_by.last_name}".strip() or obj.created_by.username
        return "System"

    def get_updated_by_name(self, obj):
        if obj.updated_by:
            return f"{obj.updated_by.first_name} {obj.updated_by.last_name}".strip() or obj.updated_by.username
        return None

    def get_employee_id(self, obj):
        profile = self._get_profile(obj)
        return profile.employee_id if profile else None

    def get_title(self, obj):
        profile = self._get_profile(obj)
        return profile.title if profile and profile.title else None

    def get_date_of_joining(self, obj):
        profile = self._get_profile(obj)
        if profile and profile.date_of_joining:
            return profile.date_of_joining.isoformat()
        return None

    def get_basic_salary(self, obj):
        profile = self._get_profile(obj)
        if profile and profile.basic_salary:
            return float(profile.basic_salary)
        return None

    def get_bank_name(self, obj):
        profile = self._get_profile(obj)
        return profile.bank_name if profile and profile.bank_name else None

    def get_account_title(self, obj):
        profile = self._get_profile(obj)
        return profile.account_title if profile and profile.account_title else None

    def get_account_number(self, obj):
        profile = self._get_profile(obj)
        return profile.account_number if profile and profile.account_number else None

    def get_profile_photo_url(self, obj):
        if obj.profile_photo_url:
            return obj.profile_photo_url
        profile = self._get_profile(obj)
        if profile and hasattr(profile, 'profile_photo_url') and profile.profile_photo_url:
            return profile.profile_photo_url
        return None


class UserCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating users with auto-generated passwords and email support
    """
    password = serializers.CharField(write_only=True, required=False)
    assigned_schools = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=School.objects.all(),
        required=False
    )
    send_email = serializers.BooleanField(write_only=True, required=False, default=False)
    
    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'password', 'assigned_schools', 'is_active',
            'send_email'
        ]
        extra_kwargs = {
            'password': {'write_only': True, 'required': False},
            'email': {'required': False},
        }
    
    def create(self, validated_data):
        # Extract and remove send_email (handled in view layer)
        send_email = validated_data.pop('send_email', False)
        
        # Extract assigned schools
        assigned_schools = validated_data.pop('assigned_schools', [])
        
        # Generate password if not provided
        password = validated_data.pop('password', None)
        if not password:
            password = ''.join(random.choices(
                string.ascii_letters + string.digits, 
                k=12
            ))
        
        # Store generated password for later retrieval
        self.context['generated_password'] = password
        
        # Create user
        user = CustomUser.objects.create_user(
            password=password,
            **validated_data
        )
        
        # Assign schools if role is Teacher
        if user.role == 'Teacher' and assigned_schools:
            user.assigned_schools.set(assigned_schools)
        
        return user

# backend/authentication/serializers.py
# UPDATE UserUpdateSerializer

class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating existing users"""
    assigned_schools = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=School.objects.all(),
        required=False
    )
    send_email = serializers.BooleanField(write_only=True, required=False, default=False)
    # TeacherProfile fields (handled in update method)
    title = serializers.CharField(write_only=True, required=False, allow_blank=True, allow_null=True)
    date_of_joining = serializers.DateField(write_only=True, required=False, allow_null=True)
    basic_salary = serializers.DecimalField(
        write_only=True, required=False, allow_null=True,
        max_digits=10, decimal_places=2
    )
    bank_name = serializers.CharField(write_only=True, required=False, allow_blank=True, allow_null=True)
    account_title = serializers.CharField(write_only=True, required=False, allow_blank=True, allow_null=True)
    account_number = serializers.CharField(write_only=True, required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = CustomUser
        fields = [
            'email', 'first_name', 'last_name', 'role',
            'is_active', 'is_staff', 'assigned_schools',
            'send_email',
            # TeacherProfile fields
            'title', 'date_of_joining', 'basic_salary',
            'bank_name', 'account_title', 'account_number',
        ]
        extra_kwargs = {
            'email': {'required': False},
            'first_name': {'required': False},
            'last_name': {'required': False},
            'role': {'required': False},
            'is_active': {'required': False},
            'is_staff': {'required': False},
        }

    def validate_role(self, value):
        """Validate role choice"""
        valid_roles = [choice[0] for choice in CustomUser.ROLE_CHOICES]
        if value not in valid_roles:
            raise serializers.ValidationError(f"Invalid role. Choose from: {', '.join(valid_roles)}")
        return value

    def validate(self, data):
        """Validate assigned_schools based on role"""
        role = data.get('role', self.instance.role)
        assigned_schools = data.get('assigned_schools')

        if assigned_schools and role != 'Teacher':
            raise serializers.ValidationError({
                'assigned_schools': 'Only teachers can be assigned to schools'
            })

        return data

    def update(self, instance, validated_data):
        # Extract profile fields before parent update
        title = validated_data.pop('title', None)
        date_of_joining = validated_data.pop('date_of_joining', None)
        basic_salary = validated_data.pop('basic_salary', None)
        bank_name = validated_data.pop('bank_name', None)
        account_title = validated_data.pop('account_title', None)
        account_number = validated_data.pop('account_number', None)
        validated_data.pop('send_email', None)  # Remove, handled in view

        # Update CustomUser fields
        instance = super().update(instance, validated_data)

        # Check if any profile field was provided
        profile_fields = {
            'title': title,
            'date_of_joining': date_of_joining,
            'basic_salary': basic_salary,
            'bank_name': bank_name,
            'account_title': account_title,
            'account_number': account_number,
        }
        has_profile_update = any(v is not None for v in profile_fields.values())

        # Update TeacherProfile fields if any provided
        if has_profile_update:
            try:
                from employees.models import TeacherProfile
                profile, created = TeacherProfile.objects.get_or_create(user=instance)

                if title is not None:
                    profile.title = title
                if date_of_joining is not None:
                    profile.date_of_joining = date_of_joining
                if basic_salary is not None:
                    profile.basic_salary = basic_salary
                if bank_name is not None:
                    profile.bank_name = bank_name
                if account_title is not None:
                    profile.account_title = account_title
                if account_number is not None:
                    profile.account_number = account_number

                profile.save()
            except Exception as e:
                import logging
                logging.getLogger(__name__).error(f"Failed to update TeacherProfile: {e}")

        return instance

class PasswordResetSerializer(serializers.Serializer):
    """Serializer for password reset"""
    new_password = serializers.CharField(
        write_only=True,
        required=False,
        min_length=8,
        style={'input_type': 'password'}
    )
    confirm_password = serializers.CharField(
        write_only=True,
        required=False,
        style={'input_type': 'password'}
    )
    send_email = serializers.BooleanField(write_only=True, required=False, default=False)
    
    def validate(self, data):
        """Ensure passwords match if provided"""
        new_pass = data.get('new_password')
        confirm_pass = data.get('confirm_password')
        
        if new_pass and confirm_pass and new_pass != confirm_pass:
            raise serializers.ValidationError({
                'confirm_password': 'Passwords do not match'
            })
        return data


class SchoolAssignmentSerializer(serializers.Serializer):
    """Serializer for assigning schools to teachers"""
    school_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=True,
        allow_empty=True
    )
    send_email = serializers.BooleanField(write_only=True, required=False, default=False)
    
    def validate_school_ids(self, value):
        """Validate that all school IDs exist"""
        if not value:  # Allow empty list (unassign all schools)
            return value
            
        existing_ids = set(School.objects.filter(id__in=value).values_list('id', flat=True))
        invalid_ids = set(value) - existing_ids
        
        if invalid_ids:
            raise serializers.ValidationError(
                f"Invalid school IDs: {', '.join(map(str, invalid_ids))}"
            )
        
        return value
    

    # ============================================
# NEW SERIALIZERS (Add at the end of the file)
# ============================================

class PasswordResetRequestSerializer(serializers.Serializer):
    """
    Serializer for user-initiated password reset request
    User enters email to receive reset link
    """
    email = serializers.EmailField(required=True)

    def validate_email(self, value):
        """Validate email exists and user is active"""
        value = value.lower().strip()
        
        try:
            user = CustomUser.objects.filter(email=value, is_active=True).first()
        except CustomUser.DoesNotExist:
            # Don't reveal if email exists (security best practice)
            raise serializers.ValidationError(
                "If this email exists in our system, you will receive a password reset link."
            )
        
        return value

    def save(self):
        """Generate token and send email"""
        email = self.validated_data['email'].lower().strip()
        
        try:
            user = CustomUser.objects.get(email=email, is_active=True)
            
            # Generate reset token
            token = default_token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            
            # Send email with reset link
            from authentication.email_utils import send_password_reset_link_email
            send_password_reset_link_email(user, uid, token)
            
            return {'detail': 'Password reset email sent successfully.'}
        except CustomUser.DoesNotExist:
            # Return success even if user doesn't exist (security)
            return {'detail': 'If this email exists in our system, you will receive a password reset link.'}


class PasswordResetConfirmSerializer(serializers.Serializer):
    """
    Serializer for confirming password reset
    User provides token, uid, and new password
    """
    uid = serializers.CharField(required=True)
    token = serializers.CharField(required=True)
    new_password = serializers.CharField(
        required=True,
        min_length=8,
        write_only=True,
        style={'input_type': 'password'}
    )
    confirm_password = serializers.CharField(
        required=True,
        min_length=8,
        write_only=True,
        style={'input_type': 'password'}
    )

    def validate(self, data):
        """Validate passwords match and token is valid"""
        # Check passwords match
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError({
                'confirm_password': 'Passwords do not match.'
            })
        
        # Validate password strength
        password = data['new_password']
        
        if len(password) < 8:
            raise serializers.ValidationError({
                'new_password': 'Password must be at least 8 characters long.'
            })
        
        # Check for letters and numbers
        has_letter = any(c.isalpha() for c in password)
        has_number = any(c.isdigit() for c in password)
        
        if not (has_letter and has_number):
            raise serializers.ValidationError({
                'new_password': 'Password must contain both letters and numbers.'
            })
        
        # Decode UID and validate token
        try:
            uid = force_str(urlsafe_base64_decode(data['uid']))
            user = CustomUser.objects.get(pk=uid, is_active=True)
        except (TypeError, ValueError, OverflowError, CustomUser.DoesNotExist):
            raise serializers.ValidationError({
                'token': 'Invalid or expired password reset link.'
            })
        
        # Verify token
        if not default_token_generator.check_token(user, data['token']):
            raise serializers.ValidationError({
                'token': 'Invalid or expired password reset link.'
            })
        
        # Store user for save method
        data['user'] = user
        return data

    def save(self):
        """Set new password"""
        user = self.validated_data['user']
        new_password = self.validated_data['new_password']
        
        user.set_password(new_password)
        user.save()
        
        return {
            'detail': 'Password has been reset successfully. You can now log in with your new password.'
        }

# ============================================
# ADD TO: backend/authentication/serializers.py
# ADD AT THE END OF FILE (after PasswordResetConfirmSerializer)
# ============================================

class ChangePasswordSerializer(serializers.Serializer):
    """
    Serializer for authenticated users to change their password
    Requires current password verification
    """
    current_password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'}
    )
    new_password = serializers.CharField(
        required=True,
        min_length=8,
        write_only=True,
        style={'input_type': 'password'}
    )
    confirm_password = serializers.CharField(
        required=True,
        min_length=8,
        write_only=True,
        style={'input_type': 'password'}
    )

    def validate_current_password(self, value):
        """Verify current password is correct"""
        user = self.context.get('request').user
        
        if not user.check_password(value):
            raise serializers.ValidationError(
                "Current password is incorrect."
            )
        
        return value

    def validate(self, data):
        """Validate passwords match and new password is different"""
        # Check new passwords match
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError({
                'confirm_password': 'Passwords do not match.'
            })
        
        # Validate password strength
        password = data['new_password']
        
        if len(password) < 8:
            raise serializers.ValidationError({
                'new_password': 'Password must be at least 8 characters long.'
            })
        
        # Check for letters and numbers
        has_letter = any(c.isalpha() for c in password)
        has_number = any(c.isdigit() for c in password)
        
        if not (has_letter and has_number):
            raise serializers.ValidationError({
                'new_password': 'Password must contain both letters and numbers.'
            })
        
        # Check new password is different from current
        user = self.context.get('request').user
        if user.check_password(password):
            raise serializers.ValidationError({
                'new_password': 'New password must be different from current password.'
            })
        
        return data

    def save(self):
        """Update user password"""
        user = self.context.get('request').user
        new_password = self.validated_data['new_password']
        
        user.set_password(new_password)
        user.save()
        
        return {
            'detail': 'Password changed successfully.'
        }
# ============================================
# END OF NEW CODE
# ============================================