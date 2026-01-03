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


from .models import TeacherProfile, TeacherEarning, TeacherDeduction, Notification
from .serializers import (
    TeacherProfileSerializer,
    TeacherProfileUpdateSerializer,
    TeacherEarningSerializer,
    TeacherDeductionSerializer,
    NotificationSerializer,
    
    AdminProfileSerializer,              # ← ADD THIS
    AdminProfileUpdateSerializer,        # ← ADD THIS
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
    GET: List all teachers (for admin notification dropdown)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get list of all teachers"""
        teachers = CustomUser.objects.filter(role='Teacher').select_related()
        
        teacher_list = []
        for teacher in teachers:
            # Get profile if exists
            profile = getattr(teacher, 'teacher_profile', None)
            
            teacher_list.append({
                'id': teacher.id,
                'username': teacher.username,
                'email': teacher.email,
                'name': teacher.get_full_name() or teacher.username,
                'first_name': teacher.first_name,
                'last_name': teacher.last_name,
                'employee_id': profile.employee_id if profile else None,
            })
        
        return Response(teacher_list)


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
# ADMIN PROFILE VIEWS (NEW)
# ============================================

class AdminProfileView(APIView):
    """
    GET: Retrieve current admin's profile
    PUT: Update current admin's profile
    Uses TeacherProfile model (supports both Teachers and Admins)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Get current admin's profile"""
        # Verify user is admin
        if request.user.role != 'Admin':
            return Response(
                {'error': 'Only admins can access this endpoint'},
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
        """Update current admin's profile"""
        # Verify user is admin
        if request.user.role != 'Admin':
            return Response(
                {'error': 'Only admins can access this endpoint'},
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
    POST: Upload admin profile photo to Supabase
    Same functionality as TeacherProfilePhotoUploadView but for admins
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        """Upload admin profile photo"""
        # Verify user is admin
        if request.user.role != 'Admin':
            return Response(
                {'error': 'Only admins can access this endpoint'},
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
            
            # Upload to Supabase
            bucket_name = getattr(settings, 'SUPABASE_BUCKET', 'student-images')
            
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
    DELETE: Delete admin profile photo from Supabase
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request):
        """Delete admin profile photo"""
        # Verify user is admin
        if request.user.role != 'Admin':
            return Response(
                {'error': 'Only admins can access this endpoint'},
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
                        bucket_name = getattr(settings, 'SUPABASE_BUCKET', 'student-images')
                        
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
# THAT'S THE END OF NEW CODE
# Continue with existing NOTIFICATION VIEWS section...
# ============================================