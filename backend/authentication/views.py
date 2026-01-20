# backend/authentication/views.py
# ============================================
# AUTHENTICATION VIEWS - FINAL CORRECTED VERSION
# ============================================

from rest_framework import serializers, status, viewsets
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth.hashers import make_password
from django.db.models import Q, Count
from django.template.loader import render_to_string
from django.conf import settings
from students.models import CustomUser, School
import logging
import random
import string

from .serializers import (
    UserListSerializer,
    UserDetailSerializer,
    UserCreateSerializer,
    UserUpdateSerializer,
    PasswordResetSerializer,
    SchoolAssignmentSerializer,
)
from .permissions import IsAdminUser

# Import email utilities
try:
    from .email_utils import (
        send_welcome_email,
        send_password_reset_email,
        send_school_assignment_email,
    )
    EMAIL_AVAILABLE = True
except ImportError:
    EMAIL_AVAILABLE = False
    logging.warning("Email utilities not available")

logger = logging.getLogger(__name__)


# ============================================
# UTILITY FUNCTIONS
# ============================================

def generate_random_password(length=12):
    """Generate a random password"""
    characters = string.ascii_letters + string.digits
    return ''.join(random.choice(characters) for _ in range(length))


# ============================================
# CUSTOM JWT SERIALIZER
# ============================================

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Custom JWT serializer that includes user role and username in token response
    """
    def validate(self, attrs):
        data = super().validate(attrs)

        # Check if user exists
        user = CustomUser.objects.filter(username=attrs['username']).first()
        if not user:
            raise serializers.ValidationError("User not found!")

        # Ensure user is active
        if not user.is_active:
            raise serializers.ValidationError("User account is inactive.")

        # Update last_login timestamp (Django doesn't do this automatically for JWT)
        from django.utils import timezone
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])

        # Include additional data
        data['role'] = user.role
        data['username'] = user.username

        return data


# ============================================
# CUSTOM JWT VIEW
# ============================================

class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Custom token view using our custom serializer
    """
    serializer_class = CustomTokenObtainPairSerializer


# ============================================
# USER REGISTRATION
# ============================================

@api_view(['POST'])
def register_user(request):
    """
    Register a new user
    POST: { username, email, password }
    """
    data = request.data
    
    # Check if username already exists
    if CustomUser.objects.filter(username=data.get('username')).exists():
        return Response({'error': 'Username already exists'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Create user (email can be None if not provided)
    user = CustomUser.objects.create(
        username=data['username'],
        email=data.get('email') or None,  # Convert empty string to None
        password=make_password(data['password'])
    )

    # Generate JWT tokens
    refresh = RefreshToken.for_user(user)
    
    return Response({
        'message': 'User registered successfully',
        'refresh': str(refresh),
        'access': str(refresh.access_token)
    }, status=status.HTTP_201_CREATED)


# ============================================
# GET LOGGED IN USER INFO
# ============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_logged_in_user(request):
    """
    Get current logged-in user's information
    Returns: { id, username, role, fullName }
    """
    user = request.user
    full_name = f"{user.first_name} {user.last_name}".strip() or "Unknown"
    
    return Response({
        "id": user.id,
        "username": user.username,
        "role": user.role,
        "fullName": full_name
    })


# ============================================
# USER MANAGEMENT VIEWSET
# ============================================

class UserViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing users (Admin only)
    """
    queryset = CustomUser.objects.filter(role__in=['Admin', 'Teacher', 'BDM'])

    permission_classes = [IsAdminUser]

    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'list':
            return UserListSerializer
        elif self.action == 'create':
            return UserCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        elif self.action == 'retrieve':
            return UserDetailSerializer
        return UserDetailSerializer

    def get_queryset(self):
        """
        Filter queryset based on query parameters
        """
        # Get Admins, Teachers, and BDMs (excluding Students)
        queryset = CustomUser.objects.filter(
            role__in=['Admin', 'Teacher', 'BDM']
        ).select_related(
            'created_by', 'updated_by'
        ).prefetch_related('assigned_schools')

        # Filter by role
        role = self.request.query_params.get('role', None)
        if role and role != 'All':
            queryset = queryset.filter(role=role)

        # Filter by school
        school_id = self.request.query_params.get('school', None)
        if school_id:
            queryset = queryset.filter(assigned_schools__id=school_id)

        # Filter by status
        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            is_active_bool = is_active.lower() == 'true'
            queryset = queryset.filter(is_active=is_active_bool)

        # Search
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(username__icontains=search) |
                Q(email__icontains=search) |
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search)
            )

        queryset = queryset.order_by('-created_at')
        return queryset
    
    def create(self, request, *args, **kwargs):
        """
        Create new user with optional welcome email
        """
        # Extract send_email flag from request
        send_email = request.data.get('send_email', False)
        
        # Create user using serializer
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Save with created_by
        user = serializer.save(created_by=request.user)
        
        # Get generated password from serializer context
        generated_password = serializer.context.get('generated_password')
        
        # Prepare response data
        response_serializer = UserDetailSerializer(user)
        response_data = response_serializer.data
        response_data['generated_password'] = generated_password
        
        # Send welcome email if requested
        email_sent = False
        email_error = None
        
        if send_email and user.email and EMAIL_AVAILABLE and generated_password:
            try:
                email_sent = send_welcome_email(user, generated_password, request)
                logger.info(f"✅ Welcome email sent to {user.email}")
            except Exception as e:
                email_error = str(e)
                logger.error(f"❌ Failed to send welcome email to {user.email}: {e}")
        
        # Add email status to response
        response_data['email_sent'] = email_sent
        if email_error:
            response_data['email_error'] = email_error
        
        headers = self.get_success_headers(response_data)
        return Response(response_data, status=status.HTTP_201_CREATED, headers=headers)
    
    def perform_update(self, serializer):
        """Set updated_by when updating a user"""
        serializer.save(updated_by=self.request.user)
    
    # backend/authentication/views.py
# UPDATE destroy METHOD in UserViewSet

    def destroy(self, request, *args, **kwargs):
        """
        Soft delete user (set is_active=False)
        Super admins can delete anyone except other super admins
        Regular admins cannot delete other admins
        """
        user_to_delete = self.get_object()
        current_user = request.user
        
        # Rule 1: Cannot delete super admin users (even by super admin)
        if user_to_delete.is_super_admin:
            return Response(
                {'error': 'Cannot deactivate super admin users'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Rule 2: Cannot delete yourself
        if user_to_delete.id == current_user.id:
            return Response(
                {'error': 'Cannot deactivate your own account'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Rule 3: Regular admins cannot delete other admins (only super admin can)
        if user_to_delete.role == 'Admin' and not current_user.is_super_admin:
            return Response(
                {'error': 'Only super administrators can deactivate other administrators'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Rule 4: Prevent deleting the last active admin
        if user_to_delete.role == 'Admin' and user_to_delete.is_active:
            active_admins_count = CustomUser.objects.filter(
                role='Admin',
                is_active=True
            ).count()
            
            if active_admins_count <= 1:
                return Response(
                    {'error': 'Cannot deactivate the last active administrator'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Deactivate user
        user_to_delete.is_active = False
        user_to_delete.updated_by = current_user
        user_to_delete.save()
        
        logger.info(f"User {user_to_delete.username} deactivated by {current_user.username}")
        
        return Response(
            {
                'message': f'User {user_to_delete.username} has been deactivated successfully',
                'deactivated_by': current_user.username,
                'is_super_admin': current_user.is_super_admin,
            },
            status=status.HTTP_200_OK
        )
    # backend/authentication/views.py
# UPDATE partial_update METHOD in UserViewSet

    def partial_update(self, request, *args, **kwargs):
        """
        Partially update user with optional email notification
        Detects changes and sends notification email if requested
        """
        from rest_framework import status as http_status  # ← Alias to avoid conflict
        
        user = self.get_object()
        send_email = request.data.get('send_email', False)
        
        # Store original values to detect changes
        original_values = {
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'role': user.role,
            'is_active': user.is_active,
        }
        
        # Perform update
        serializer = self.get_serializer(user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        
        # Detect changes
        changes = {}
        updated_user = serializer.instance
        
        if original_values['email'] != updated_user.email:
            changes['Email Address'] = f"{original_values['email']} → {updated_user.email}"
        
        if original_values['first_name'] != updated_user.first_name or original_values['last_name'] != updated_user.last_name:
            old_name = f"{original_values['first_name']} {original_values['last_name']}".strip()
            new_name = f"{updated_user.first_name} {updated_user.last_name}".strip()
            if old_name != new_name:
                changes['Name'] = f"{old_name} → {new_name}"
        
        if original_values['role'] != updated_user.role:
            changes['Role'] = f"{original_values['role']} → {updated_user.role}"
        
        if original_values['is_active'] != updated_user.is_active:
            account_status = 'Activated' if updated_user.is_active else 'Deactivated'  # ← Fixed!
            changes['Account Status'] = account_status
        
        # Send email if requested and changes were made
        email_sent = False
        email_error = None
        
        if send_email and updated_user.email and changes:
            try:
                from .email_utils import send_account_update_email
                updated_by_name = f"{request.user.first_name} {request.user.last_name}".strip() or request.user.username
                email_sent = send_account_update_email(updated_user, changes, updated_by_name)
                logger.info(f"✅ Account update email sent to {updated_user.email}")
            except Exception as e:
                email_error = str(e)
                logger.error(f"❌ Failed to send account update email: {e}")
        
        # Prepare response
        response_serializer = UserDetailSerializer(updated_user)
        response_data = response_serializer.data
        response_data['changes_made'] = list(changes.keys())
        response_data['email_sent'] = email_sent
        
        if email_error:
            response_data['email_error'] = email_error
        
        return Response(response_data, status=http_status.HTTP_200_OK)  # ← Use alias
    # ============================================
    # CUSTOM ACTIONS
    # ============================================
    
    @action(detail=True, methods=['post'], url_path='assign-schools')
    def assign_schools(self, request, pk=None):
        """
        Assign schools to a teacher with optional email notification
        """
        user = self.get_object()
        
        # Only teachers can have assigned schools
        if user.role != 'Teacher':
            return Response(
                {'error': 'Only teachers can be assigned to schools'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate data
        serializer = SchoolAssignmentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        school_ids = serializer.validated_data['school_ids']
        send_email = serializer.validated_data.get('send_email', False)
        
        # Assign schools
        user.assigned_schools.set(school_ids)
        user.updated_by = request.user
        user.save()
        
        # Get school names
        schools = School.objects.filter(id__in=school_ids)
        school_names = [school.name for school in schools]
        
        # Prepare response
        response_data = {
            'success': True,
            'message': f'Assigned {len(schools)} schools to {user.username}',
            'assigned_schools': school_names,
        }
        
        # Send email if requested
        email_sent = False
        email_error = None
        
        if send_email and user.email and school_names and EMAIL_AVAILABLE:
            try:
                email_sent = send_school_assignment_email(user, school_names)
                logger.info(f"✅ School assignment email sent to {user.email}")
            except Exception as e:
                email_error = str(e)
                logger.error(f"❌ Failed to send school assignment email: {e}")
        
        response_data['email_sent'] = email_sent
        if email_error:
            response_data['email_error'] = email_error
        
        return Response(response_data, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'], url_path='reset-password')
    def reset_password(self, request, pk=None):
        """
        Reset user password with optional email notification
        """
        user = self.get_object()
        
        # Extract send_email flag
        send_email = request.data.get('send_email', False)
        
        # Get password from request or auto-generate
        new_password = request.data.get('password')
        if not new_password:
            new_password = generate_random_password(12)
        
        # Update password
        user.password = make_password(new_password)
        user.updated_by = request.user
        user.save()
        
        # Invalidate tokens
        try:
            from rest_framework_simplejwt.token_blacklist.models import OutstandingToken
            tokens = OutstandingToken.objects.filter(user=user)
            for token in tokens:
                try:
                    RefreshToken(token.token).blacklist()
                except:
                    pass
        except Exception as e:
            logger.warning(f"Could not blacklist tokens: {e}")
        
        # Prepare response
        response_data = {
            'success': True,
            'message': 'Password reset successfully',
            'new_password': new_password,
        }
        
        # Send email if requested
        email_sent = False
        email_error = None
        
        if send_email and user.email and EMAIL_AVAILABLE:
            try:
                email_sent = send_password_reset_email(user, new_password)
                logger.info(f"✅ Password reset email sent to {user.email}")
            except Exception as e:
                email_error = str(e)
                logger.error(f"❌ Failed to send password reset email: {e}")
        
        response_data['email_sent'] = email_sent
        if email_error:
            response_data['email_error'] = email_error
        
        return Response(response_data, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['post'], url_path='preview-email')
    def preview_email(self, request):
        """
        Generate email preview without sending
        """
        email_type = request.data.get('email_type')
        user_data = request.data.get('user_data', {})
        email_data = request.data.get('email_data', {})
        
        # Create preview user
        class PreviewUser:
            def __init__(self, data):
                self.first_name = data.get('first_name', '')
                self.last_name = data.get('last_name', '')
                self.username = data.get('username', '')
                self.email = data.get('email', '')
                self.role = data.get('role', 'Teacher')
        
        preview_user = PreviewUser(user_data)
        
        # Generate preview
        template_name = None
        context = {'user': preview_user}
        subject = ''
        
        if email_type == 'welcome':
            template_name = 'emails/welcome_email.html'
            subject = 'Welcome to KoderKids ERP - Your Account Details'
            context.update({
                'username': preview_user.username,
                'password': email_data.get('password', 'Sample123'),
                'login_url': settings.FRONTEND_URL,
                'role': preview_user.role,
            })
        elif email_type == 'password_reset':
            template_name = 'emails/password_reset_email.html'
            subject = 'Your Password Has Been Reset - KoderKids ERP'
            context.update({
                'username': preview_user.username,
                'new_password': email_data.get('password', 'NewPass123'),
                'login_url': settings.FRONTEND_URL,
            })
        elif email_type == 'school_assignment':
            template_name = 'emails/school_assignment_email.html'
            subject = 'School Assignment Update - KoderKids ERP'
            schools = email_data.get('schools', [])
            context.update({
                'username': preview_user.username,
                'schools': schools,
                'school_count': len(schools),
            })
        else:
            return Response(
                {'error': 'Invalid email type'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Render HTML
        try:
            html_content = render_to_string(template_name, context)
            return Response({
                'success': True,
                'subject': subject,
                'html_content': html_content,
                'recipient': preview_user.email,
                'from_email': settings.DEFAULT_FROM_EMAIL,
            })
        except Exception as e:
            return Response(
                {'error': f'Failed to generate preview: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'], url_path='employees-for-tasks')
    def get_employees_for_tasks(self, request):
        """
        Get list of active employees (Admin, Teacher, BDM) for task assignment
        """
        try:
            employees = CustomUser.objects.filter(
                Q(role='Admin') | Q(role='Teacher') | Q(role='BDM'), 
                is_active=True
            ).values('id', 'first_name', 'last_name', 'email', 'role').order_by('first_name')
            
            # Format names and role
            employee_list = []
            for emp in employees:
                employee_list.append({
                    'id': emp['id'],
                    'fullName': f"{emp['first_name']} {emp['last_name']}".strip(),
                    'email': emp['email'],
                    'role': emp['role']
                })
            
            return Response(employee_list, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='available-roles')
    def available_roles(self, request):
        """
        Get list of available roles for User Management
        Excludes 'Student' since students are managed separately
        """
        # Filter out Student role
        roles = [
            {'value': role[0], 'label': role[1]}
            for role in CustomUser.ROLE_CHOICES
            if role[0] != 'Student'  # ← Only this line is new
        ]
        return Response({'roles': roles}, status=status.HTTP_200_OK)
    


    @action(detail=False, methods=['get'], url_path='user-stats')
    def user_stats(self, request):
        """
        Get user statistics for Admins, Teachers, and BDMs
        Students are managed on the Students page
        """
        # Count all non-student users
        admins_count = CustomUser.objects.filter(role='Admin').count()
        teachers_count = CustomUser.objects.filter(role='Teacher').count()
        bdms_count = CustomUser.objects.filter(role='BDM').count()
        total_users = admins_count + teachers_count + bdms_count

        # Active/Inactive counts (excluding students)
        active_users = CustomUser.objects.filter(
            role__in=['Admin', 'Teacher', 'BDM'],
            is_active=True
        ).count()
        inactive_users = CustomUser.objects.filter(
            role__in=['Admin', 'Teacher', 'BDM'],
            is_active=False
        ).count()

        super_admins_count = CustomUser.objects.filter(is_super_admin=True).count()

        return Response({
            'total_users': total_users,
            'active_users': active_users,
            'inactive_users': inactive_users,
            'admins': admins_count,
            'teachers': teachers_count,
            'bdms': bdms_count,
            'super_admins': super_admins_count,
        }, status=status.HTTP_200_OK)
    

    # ============================================
# UPDATE: backend/authentication/views.py
# ADD these 2 NEW VIEW FUNCTIONS at the END of the file
# ============================================

# Copy and paste this code at the VERY END of your views.py file
# (after the user_stats action, around line 624)

# ============================================
# IMPORTS (Add these at the top if not already present)
# ============================================
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from rest_framework.permissions import AllowAny


# ============================================
# NEW VIEW FUNCTIONS (Add at the end of the file, after line 624)
# ============================================

# ============================================
# SELF-SERVICE PASSWORD RESET VIEWS
# ============================================

@api_view(['POST'])
@permission_classes([AllowAny])  # Anyone can request password reset
def password_reset_request(request):
    """
    User-initiated password reset request
    POST: {"email": "user@example.com"}
    """
    from .serializers import PasswordResetRequestSerializer
    
    serializer = PasswordResetRequestSerializer(data=request.data)
    
    if serializer.is_valid():
        result = serializer.save()
        return Response(result, status=status.HTTP_200_OK)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])  # Anyone with valid token can confirm
def password_reset_confirm(request):
    """
    Confirm password reset with token
    POST: {
        "uid": "encoded_user_id",
        "token": "reset_token",
        "new_password": "newpass123",
        "confirm_password": "newpass123"
    }
    """
    from .serializers import PasswordResetConfirmSerializer
    
    serializer = PasswordResetConfirmSerializer(data=request.data)
    
    if serializer.is_valid():
        result = serializer.save()
        return Response(result, status=status.HTTP_200_OK)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ============================================
# END OF NEW CODE
# ============================================

# ============================================
# CHANGE PASSWORD (Authenticated Users)
# ============================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    """
    Authenticated user can change their password
    POST: {
        "current_password": "oldpass123",
        "new_password": "newpass123",
        "confirm_password": "newpass123"
    }
    """
    from .serializers import ChangePasswordSerializer
    
    serializer = ChangePasswordSerializer(
        data=request.data,
        context={'request': request}
    )
    
    if serializer.is_valid():
        result = serializer.save()
        return Response(result, status=status.HTTP_200_OK)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ============================================
# END OF NEW CODE
# ============================================