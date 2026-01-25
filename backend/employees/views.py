# ============================================
# EMPLOYEES VIEWS - Teacher Profile & Notifications API
# ============================================

from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.utils import timezone
from supabase import create_client, Client
from django.conf import settings
import uuid
import os


from .models import TeacherProfile, TeacherEarning, TeacherDeduction, Notification, SalarySlip
from .serializers import (
    TeacherProfileSerializer,
    TeacherProfileUpdateSerializer,
    TeacherEarningSerializer,
    TeacherDeductionSerializer,
    NotificationSerializer,

    AdminProfileSerializer,
    AdminProfileUpdateSerializer,

    # Salary Slip serializers
    SalarySlipSerializer,
    SalarySlipListSerializer,
    SalarySlipCreateSerializer,
)
from students.models import CustomUser, School


# ============================================
# SUPABASE CLIENT SETUP
# ============================================

def get_supabase_client():
    """
    Initialize Supabase client if configured
    """
    try:
        from supabase import create_client, Client
        supabase_url = os.environ.get('REACT_APP_SUPABASE_URL', getattr(settings, 'SUPABASE_URL', ''))
        supabase_key = os.environ.get('REACT_APP_SUPABASE_SEC_KEY', getattr(settings, 'SUPABASE_SERVICE_KEY', ''))
        
        if not supabase_url or not supabase_key:
            return None
        
        return create_client(supabase_url, supabase_key)
    except ImportError:
        return None
    except Exception as e:
        print(f"Warning: Could not initialize Supabase: {e}")
        return None
# ============================================
# TEACHER PROFILE VIEWS
# ============================================

class TeacherListView(APIView):
    """
    GET: List all employees (Teachers, Admins, BDMs) for task assignment dropdown
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get list of all active employees (Teachers, Admins, BDMs)"""
        employees = CustomUser.objects.filter(
            role__in=['Teacher', 'Admin', 'BDM'],
            is_active=True
        ).select_related()

        employee_list = []
        for employee in employees:
            # Get profile if exists
            profile = getattr(employee, 'teacher_profile', None)

            employee_list.append({
                'id': employee.id,
                'username': employee.username,
                'email': employee.email,
                'name': employee.get_full_name() or employee.username,
                'full_name': employee.get_full_name() or employee.username,
                'first_name': employee.first_name,
                'last_name': employee.last_name,
                'role': employee.role,
                'employee_id': profile.employee_id if profile else None,
            })

        return Response(employee_list)


# ============================================
# TEACHER PROFILE VIEWS
# ============================================

class TeacherProfileView(APIView):
    """
    GET: Retrieve current teacher's profile
    PUT: Update current teacher's profile
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, teacher_id=None):
        """Get teacher profile - either by ID (admin) or current user"""
        if teacher_id:
            # Admin viewing specific teacher
            user = get_object_or_404(CustomUser, id=teacher_id, role='Teacher')
        else:
            # Teacher viewing own profile
            user = request.user
            if user.role != 'Teacher':
                return Response(
                    {'error': 'This endpoint is only for teachers'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Get or create profile
        profile, created = TeacherProfile.objects.get_or_create(user=user)
        serializer = TeacherProfileSerializer(profile)
        
        return Response(serializer.data)

    def put(self, request, teacher_id=None):
        """Update teacher profile"""
        if teacher_id and request.user.role == 'Admin':
            # Admin updating teacher
            user = get_object_or_404(CustomUser, id=teacher_id, role='Teacher')
        else:
            # Teacher updating own profile
            user = request.user
            if user.role != 'Teacher':
                return Response(
                    {'error': 'This endpoint is only for teachers'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        profile, created = TeacherProfile.objects.get_or_create(user=user)
        serializer = TeacherProfileUpdateSerializer(profile, data=request.data, partial=True)
        
        if serializer.is_valid():
            serializer.save()
            return Response(TeacherProfileSerializer(profile).data)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TeacherProfilePhotoUploadView(APIView):
    """
    POST: Upload profile photo to Supabase and update profile
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Upload profile photo"""
        user = request.user
        
        if user.role != 'Teacher':
            return Response(
                {'error': 'This endpoint is only for teachers'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get the uploaded file
        photo = request.FILES.get('photo')
        if not photo:
            return Response(
                {'error': 'No photo file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate file type
        allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        if photo.content_type not in allowed_types:
            return Response(
                {'error': 'Invalid file type. Allowed: JPEG, PNG, GIF, WebP'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate file size (max 5MB)
        max_size = 5 * 1024 * 1024
        if photo.size > max_size:
            return Response(
                {'error': 'File too large. Maximum size is 5MB'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            profile, _ = TeacherProfile.objects.get_or_create(user=user)
            
            # Try Supabase upload
            supabase = get_supabase_client()
            
            if supabase:
                # Generate unique filename
                ext = photo.name.split('.')[-1] if '.' in photo.name else 'jpg'
                filename = f"teachers/{profile.employee_id or user.id}/profile_{uuid.uuid4().hex[:8]}.{ext}"
                
                # Delete old photo if exists
                if profile.profile_photo_url and 'supabase' in profile.profile_photo_url:
                    try:
                        old_path = profile.profile_photo_url.split('/profile-photos/')[-1]
                        supabase.storage.from_('profile-photos').remove([old_path])
                    except Exception as e:
                        print(f"Warning: Could not delete old photo: {e}")
                
                # Upload new photo
                file_content = photo.read()
                supabase.storage.from_('profile-photos').upload(
                    filename,
                    file_content,
                    {'content-type': photo.content_type}
                )
                
                # Get public URL
                public_url = supabase.storage.from_('profile-photos').get_public_url(filename)
                profile.profile_photo_url = public_url
                profile.save()
                
                return Response({
                    'profile_photo_url': public_url,
                    'message': 'Profile photo uploaded successfully'
                })
            else:
                # Fallback: Save locally or return error
                return Response(
                    {'error': 'Photo storage not configured. Please contact admin.'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
        except Exception as e:
            print(f"Error uploading photo: {e}")
            return Response(
                {'error': f'Failed to upload photo: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class TeacherProfilePhotoDeleteView(APIView):
    """
    DELETE: Remove profile photo
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        """Delete profile photo"""
        user = request.user
        
        if user.role != 'Teacher':
            return Response(
                {'error': 'This endpoint is only for teachers'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            profile = TeacherProfile.objects.get(user=user)
            
            if profile.profile_photo_url:
                supabase = get_supabase_client()
                
                if supabase and 'supabase' in profile.profile_photo_url:
                    try:
                        old_path = profile.profile_photo_url.split('/profile-photos/')[-1]
                        supabase.storage.from_('profile-photos').remove([old_path])
                    except Exception as e:
                        print(f"Warning: Could not delete from Supabase: {e}")
                
                profile.profile_photo_url = None
                profile.save()
            
            return Response({'message': 'Profile photo deleted successfully'})
            
        except TeacherProfile.DoesNotExist:
            return Response(
                {'error': 'Profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )


# ============================================
# NOTIFICATION VIEWS
# ============================================

class NotificationListView(generics.ListAPIView):
    """
    GET: List all notifications for the authenticated user
    """
    permission_classes = [IsAuthenticated]
    serializer_class = NotificationSerializer

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)


class UnreadNotificationCountView(APIView):
    """
    GET: Get count of unread notifications
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        count = Notification.objects.filter(
            recipient=request.user,
            is_read=False
        ).count()
        return Response({'unread_count': count})


class MarkNotificationReadView(APIView):
    """
    POST: Mark a notification as read
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, notification_id):
        notification = get_object_or_404(
            Notification, 
            id=notification_id, 
            recipient=request.user
        )
        notification.mark_as_read()
        return Response({'message': 'Notification marked as read'})


class MarkAllNotificationsReadView(APIView):
    """
    POST: Mark all notifications as read
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        Notification.objects.filter(
            recipient=request.user,
            is_read=False
        ).update(is_read=True, read_at=timezone.now())
        
        return Response({'message': 'All notifications marked as read'})


class CreateNotificationView(APIView):
    """
    POST: Create a new notification (Admin only)
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Only admins can create notifications for others
        if request.user.role != 'Admin':
            return Response(
                {'error': 'Only admins can create notifications'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get recipient
        recipient_id = request.data.get('recipient')
        if not recipient_id:
            return Response(
                {'error': 'Recipient is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            recipient = CustomUser.objects.get(id=recipient_id)
        except CustomUser.DoesNotExist:
            return Response(
                {'error': 'Recipient not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Create notification
        notification = Notification.objects.create(
            recipient=recipient,
            sender=request.user,
            title=request.data.get('title', ''),
            message=request.data.get('message', ''),
            notification_type=request.data.get('notification_type', 'info'),
            related_url=request.data.get('related_url'),
        )
        
        return Response(
            NotificationSerializer(notification).data,
            status=status.HTTP_201_CREATED
        )


class SendNotificationToAllView(APIView):
    """
    POST: Send notification to all teachers (Admin only)
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Only admins can send bulk notifications
        if request.user.role != 'Admin':
            return Response(
                {'error': 'Only admins can send bulk notifications'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        title = request.data.get('title')
        message = request.data.get('message')
        notification_type = request.data.get('notification_type', 'info')
        related_url = request.data.get('related_url')
        
        if not title or not message:
            return Response(
                {'error': 'Title and message are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get all teachers
        teachers = CustomUser.objects.filter(role='Teacher')
        
        # Create notifications in bulk
        notifications = []
        for teacher in teachers:
            notifications.append(Notification(
                recipient=teacher,
                sender=request.user,
                title=title,
                message=message,
                notification_type=notification_type,
                related_url=related_url,
            ))
        
        Notification.objects.bulk_create(notifications)
        
        return Response({
            'message': f'Notification sent to {len(notifications)} teachers',
            'count': len(notifications)
        }, status=status.HTTP_201_CREATED)


# ============================================
# EARNINGS & DEDUCTIONS VIEWS
# ============================================

class TeacherEarningsView(APIView):
    """
    GET: List earnings for authenticated teacher
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'Teacher':
            return Response(
                {'error': 'This endpoint is only for teachers'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        earnings = TeacherEarning.objects.filter(teacher=request.user)
        serializer = TeacherEarningSerializer(earnings, many=True)
        return Response(serializer.data)


class TeacherDeductionsView(APIView):
    """
    GET: List deductions for authenticated teacher
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role != 'Teacher':
            return Response(
                {'error': 'This endpoint is only for teachers'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        deductions = TeacherDeduction.objects.filter(teacher=request.user)
        serializer = TeacherDeductionSerializer(deductions, many=True)
        return Response(serializer.data)


# ============================================
# HELPER: Get full teacher data for dashboard
# ============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_teacher_dashboard_data(request):
    """
    Get all data needed for teacher dashboard in one call
    """
    user = request.user
    
    if user.role != 'Teacher':
        return Response(
            {'error': 'This endpoint is only for teachers'},
            status=status.HTTP_403_FORBIDDEN
        )
    
    # Get or create profile
    profile, _ = TeacherProfile.objects.get_or_create(user=user)
    
    # Get earnings and deductions
    earnings = TeacherEarning.objects.filter(teacher=user)
    deductions = TeacherDeduction.objects.filter(teacher=user)
    
    # Get unread notification count
    unread_count = Notification.objects.filter(recipient=user, is_read=False).count()
    
    # Get recent notifications (last 5)
    recent_notifications = Notification.objects.filter(recipient=user)[:5]
    
    return Response({
        'profile': TeacherProfileSerializer(profile).data,
        'earnings': TeacherEarningSerializer(earnings, many=True).data,
        'deductions': TeacherDeductionSerializer(deductions, many=True).data,
        'unread_notifications': unread_count,
        'recent_notifications': NotificationSerializer(recent_notifications, many=True).data,
    })


# ============================================
# SELF-SERVICE: My Salary Data (For Salary Slip)
# ============================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_salary_data(request):
    """
    Get current user's salary data for salary slip self-service.
    Returns profile, earnings, deductions, and assigned schools.
    Available to: Teacher, BDM, Admin
    """
    user = request.user

    # Only employees can access (not students)
    if user.role not in ['Admin', 'Teacher', 'BDM']:
        return Response(
            {'error': 'Only employees can access salary data'},
            status=status.HTTP_403_FORBIDDEN
        )

    # Get or create profile
    profile, created = TeacherProfile.objects.get_or_create(user=user)

    # Get earnings and deductions
    earnings = TeacherEarning.objects.filter(teacher=user)
    deductions = TeacherDeduction.objects.filter(teacher=user)

    # Get assigned schools
    schools = user.assigned_schools.all()
    schools_list = ', '.join([school.name for school in schools]) if schools else 'N/A'

    return Response({
        'user': {
            'id': user.id,
            'username': user.username,
            'name': user.get_full_name() or user.username,
            'role': user.role,
        },
        'profile': {
            'employee_id': profile.employee_id,
            'title': profile.title,
            'date_of_joining': profile.date_of_joining,
            'basic_salary': str(profile.basic_salary) if profile.basic_salary else '0',
            'bank_name': profile.bank_name or '',
            'account_number': profile.account_number or '',
            'phone': profile.phone or '',
            'address': profile.address or '',
        },
        'schools': schools_list,
        'earnings': TeacherEarningSerializer(earnings, many=True).data,
        'deductions': TeacherDeductionSerializer(deductions, many=True).data,
    })


# ============================================
# ADMIN PROFILE VIEWS (NEW)
# ============================================

class AdminProfileView(APIView):
    """
    GET: Retrieve current admin's/BDM's profile
    PUT: Update current admin's/BDM's profile
    Uses TeacherProfile model (supports both Teachers, Admins, and BDMs)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get current admin's/BDM's profile"""
        # Verify user is admin or BDM
        if request.user.role not in ['Admin', 'BDM']:
            return Response(
                {'error': 'Only admins and BDMs can access this endpoint'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            # Get or create profile for admin
            profile, created = TeacherProfile.objects.get_or_create(user=request.user)
            
            if created:
                print(f"✅ Created new profile for admin: {request.user.username}")
            
            serializer = AdminProfileSerializer(profile)
            return Response(serializer.data)
            
        except Exception as e:
            return Response(
                {'error': f'Error retrieving admin profile: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def put(self, request):
        """Update current admin's/BDM's profile"""
        # Verify user is admin or BDM
        if request.user.role not in ['Admin', 'BDM']:
            return Response(
                {'error': 'Only admins and BDMs can access this endpoint'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            # Get or create profile for admin
            profile, created = TeacherProfile.objects.get_or_create(user=request.user)
            
            # Update profile
            serializer = AdminProfileUpdateSerializer(
                profile, 
                data=request.data, 
                partial=True
            )
            
            if serializer.is_valid():
                serializer.save()
                
                # Return full profile data
                response_serializer = AdminProfileSerializer(profile)
                return Response(response_serializer.data)
            
            return Response(
                serializer.errors, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
        except Exception as e:
            return Response(
                {'error': f'Error updating admin profile: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AdminProfilePhotoUploadView(APIView):
    """
    POST: Upload admin/BDM profile photo to Supabase
    Same functionality as TeacherProfilePhotoUploadView but for admins and BDMs
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Upload admin/BDM profile photo"""
        # Verify user is admin or BDM
        if request.user.role not in ['Admin', 'BDM']:
            return Response(
                {'error': 'Only admins and BDMs can access this endpoint'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            # Get or create profile
            profile, created = TeacherProfile.objects.get_or_create(user=request.user)
            
            # Get uploaded file
            photo = request.FILES.get('photo')
            if not photo:
                return Response(
                    {'error': 'No photo file provided'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Initialize Supabase client
            supabase = get_supabase_client()
            if not supabase:
                return Response(
                    {'error': 'Supabase not configured'},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )
            
            # Generate unique filename
            file_extension = os.path.splitext(photo.name)[1]
            unique_filename = f"admin_{request.user.id}_{uuid.uuid4().hex[:8]}{file_extension}"
            
            # Upload to Supabase - use profile-photos bucket for profile pictures
            bucket_name = getattr(settings, 'SUPABASE_BUCKET', 'profile-photos')
            
            # Read file content
            file_content = photo.read()
            
            # Upload file
            response = supabase.storage.from_(bucket_name).upload(
                path=f"profile_photos/{unique_filename}",
                file=file_content,
                file_options={"content-type": photo.content_type}
            )
            
            # Get public URL
            public_url = supabase.storage.from_(bucket_name).get_public_url(
                f"profile_photos/{unique_filename}"
            )
            
            # Delete old photo if exists
            if profile.profile_photo_url:
                try:
                    old_filename = profile.profile_photo_url.split('/')[-1]
                    supabase.storage.from_(bucket_name).remove([f"profile_photos/{old_filename}"])
                except Exception as e:
                    print(f"Warning: Could not delete old photo: {e}")
            
            # Update profile
            profile.profile_photo_url = public_url
            profile.save()
            
            return Response({
                'profile_photo_url': public_url,
                'message': 'Profile photo uploaded successfully'
            })
            
        except Exception as e:
            return Response(
                {'error': f'Failed to upload photo: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class AdminProfilePhotoDeleteView(APIView):
    """
    DELETE: Delete admin/BDM profile photo from Supabase
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        """Delete admin/BDM profile photo"""
        # Verify user is admin or BDM
        if request.user.role not in ['Admin', 'BDM']:
            return Response(
                {'error': 'Only admins and BDMs can access this endpoint'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            profile = TeacherProfile.objects.get(user=request.user)
            
            if profile.profile_photo_url:
                # Initialize Supabase client
                supabase = get_supabase_client()
                if supabase:
                    try:
                        # Extract filename from URL
                        filename = profile.profile_photo_url.split('/')[-1]
                        bucket_name = getattr(settings, 'SUPABASE_BUCKET', 'profile-photos')

                        # Delete from Supabase
                        supabase.storage.from_(bucket_name).remove([f"profile_photos/{filename}"])
                    except Exception as e:
                        print(f"Warning: Could not delete photo from Supabase: {e}")
                
                # Clear URL from profile
                profile.profile_photo_url = None
                profile.save()
            
            return Response({'message': 'Profile photo deleted successfully'})
            
        except TeacherProfile.DoesNotExist:
            return Response(
                {'error': 'Profile not found'},
                status=status.HTTP_404_NOT_FOUND
            )


# ============================================
# BDM PROFILE VIEWS (DEDICATED ENDPOINTS)
# ============================================

class BDMProfileView(APIView):
    """
    GET: Retrieve current BDM's profile
    PUT: Update current BDM's profile
    Dedicated endpoint for BDM role (separate from Admin)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get current BDM's profile"""
        # Verify user is BDM
        if request.user.role != 'BDM':
            return Response(
                {'error': 'Only BDMs can access this endpoint'},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            # Get or create profile for BDM
            profile, created = TeacherProfile.objects.get_or_create(user=request.user)

            if created:
                print(f"✅ Created new profile for BDM: {request.user.username}")

            serializer = AdminProfileSerializer(profile)
            return Response(serializer.data)

        except Exception as e:
            return Response(
                {'error': f'Error retrieving BDM profile: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def put(self, request):
        """Update current BDM's profile"""
        # Verify user is BDM
        if request.user.role != 'BDM':
            return Response(
                {'error': 'Only BDMs can access this endpoint'},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            # Get or create profile for BDM
            profile, created = TeacherProfile.objects.get_or_create(user=request.user)

            # Update profile
            serializer = AdminProfileUpdateSerializer(
                profile,
                data=request.data,
                partial=True
            )

            if serializer.is_valid():
                serializer.save()

                # Return full profile data
                response_serializer = AdminProfileSerializer(profile)
                return Response(response_serializer.data)

            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        except Exception as e:
            return Response(
                {'error': f'Error updating BDM profile: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ============================================
# SALARY SLIP VIEWS
# ============================================

class SalarySlipListView(APIView):
    """
    GET: List salary slips
    - Admin: See all or filter by teacher_id
    - Teacher/BDM: See only their own slips
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        # Admin can see all or filter by teacher
        if user.role == 'Admin':
            queryset = SalarySlip.objects.all()

            # Optional filter by teacher
            teacher_id = request.query_params.get('teacher_id')
            if teacher_id:
                queryset = queryset.filter(teacher_id=teacher_id)
        else:
            # Non-admins can only see their own slips
            queryset = SalarySlip.objects.filter(teacher=user)

        # Date filters (optional)
        from_date = request.query_params.get('from_date')
        till_date = request.query_params.get('till_date')

        if from_date:
            queryset = queryset.filter(from_date__gte=from_date)
        if till_date:
            queryset = queryset.filter(till_date__lte=till_date)

        # Order by most recent
        queryset = queryset.order_by('-generated_at')

        serializer = SalarySlipListSerializer(queryset, many=True)
        return Response(serializer.data)


class SalarySlipCreateView(APIView):
    """
    POST: Create/save a salary slip (Admin only)
    Updates existing slip if same teacher+period already exists.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Only admins can create salary slips
        if request.user.role != 'Admin':
            return Response(
                {'error': 'Only admins can generate salary slips'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = SalarySlipCreateSerializer(
            data=request.data,
            context={'request': request}
        )

        if serializer.is_valid():
            # Check if updating existing
            if serializer.instance:
                # Update existing slip
                for attr, value in serializer.validated_data.items():
                    setattr(serializer.instance, attr, value)
                serializer.instance.generated_by = request.user
                serializer.instance.save()
                slip = serializer.instance
            else:
                # Create new slip
                slip = serializer.save()

            response_serializer = SalarySlipSerializer(slip)
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class SalarySlipDetailView(APIView):
    """
    GET: Retrieve a specific salary slip
    DELETE: Delete a salary slip (Admin only)

    - Admin: Can view/delete any slip
    - Teacher/BDM: Can only view their own slips
    """
    permission_classes = [IsAuthenticated]

    def get_object(self, pk, user):
        """Get salary slip with permission check."""
        slip = get_object_or_404(SalarySlip, pk=pk)

        # Admin can access any slip
        if user.role == 'Admin':
            return slip

        # Non-admins can only access their own slips
        if slip.teacher != user:
            return None

        return slip

    def get(self, request, pk):
        slip = self.get_object(pk, request.user)

        if slip is None:
            return Response(
                {'error': 'You can only view your own salary slips'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = SalarySlipSerializer(slip)
        return Response(serializer.data)

    def delete(self, request, pk):
        # Only admins can delete
        if request.user.role != 'Admin':
            return Response(
                {'error': 'Only admins can delete salary slips'},
                status=status.HTTP_403_FORBIDDEN
            )

        slip = get_object_or_404(SalarySlip, pk=pk)
        slip.delete()

        return Response(
            {'message': 'Salary slip deleted successfully'},
            status=status.HTTP_204_NO_CONTENT
        )