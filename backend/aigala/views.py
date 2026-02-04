"""
AI Gala API Views.
Handles all endpoints for galleries, projects, voting, and comments.
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import F, Count, Q
from django.utils import timezone

from .models import Gallery, Project, Vote, Comment
from .serializers import (
    GalleryListSerializer, GalleryDetailSerializer, GalleryCreateSerializer,
    ProjectListSerializer, ProjectDetailSerializer, ProjectCreateSerializer,
    CommentSerializer, CommentCreateSerializer,
)
from .storage import upload_project_image, upload_gallery_cover, delete_image
from students.models import Badge, StudentBadge, Student


# ============== NOTIFICATION HELPERS ==============

def send_gala_notification(recipients, title, message, notification_type='info', related_url=None, sender=None):
    """
    Send notification to multiple recipients.
    recipients: queryset or list of CustomUser objects
    """
    from employees.models import Notification

    notifications = []
    for recipient in recipients:
        notifications.append(Notification(
            recipient=recipient,
            sender=sender,
            title=title,
            message=message,
            notification_type=notification_type,
            related_url=related_url,
        ))

    if notifications:
        Notification.objects.bulk_create(notifications)

    return len(notifications)


def get_targeted_students(gallery):
    """Get students who can access this gallery based on targeting."""
    # Start with all active students
    students = Student.objects.filter(status='Active')

    # If gallery has school targeting
    if gallery.target_schools.exists():
        target_school_ids = gallery.target_schools.values_list('id', flat=True)
        students = students.filter(school_id__in=target_school_ids)

        # If gallery also has class targeting
        if gallery.target_classes:
            students = students.filter(student_class__in=gallery.target_classes)

    return students


def notify_gallery_active(gallery):
    """Notify targeted students that a new gallery is open for submissions."""
    from students.models import CustomUser

    students = get_targeted_students(gallery)
    student_user_ids = students.values_list('user_id', flat=True)
    recipients = CustomUser.objects.filter(id__in=student_user_ids)

    target_info = gallery.target_display
    send_gala_notification(
        recipients=recipients,
        title=f"AI Gala: {gallery.title}",
        message=f"A new AI Gala gallery '{gallery.theme}' is now open! Submit your creation.",
        notification_type='info',
        related_url='/ai-gala'
    )


def notify_gallery_voting(gallery):
    """Notify targeted students that voting has started."""
    from students.models import CustomUser

    students = get_targeted_students(gallery)
    student_user_ids = students.values_list('user_id', flat=True)
    recipients = CustomUser.objects.filter(id__in=student_user_ids)

    send_gala_notification(
        recipients=recipients,
        title=f"Voting Open: {gallery.title}",
        message=f"Voting is now open for '{gallery.theme}'! Cast your votes for your favorite projects.",
        notification_type='info',
        related_url='/ai-gala'
    )


def notify_gallery_closed(gallery):
    """Notify winners and participants when gallery closes."""
    from students.models import CustomUser

    # Notify winners
    winners = gallery.projects.filter(is_winner=True).select_related('student__user')
    for project in winners:
        rank_names = {1: 'Champion', 2: 'Innovator', 3: 'Creator'}
        rank_name = rank_names.get(project.winner_rank, 'Winner')

        send_gala_notification(
            recipients=[project.student.user],
            title=f"Congratulations, AI Gala {rank_name}!",
            message=f"Your project '{project.title}' won #{project.winner_rank} place in '{gallery.title}'!",
            notification_type='success',
            related_url='/ai-gala'
        )

    # Notify all participants
    participants = gallery.projects.filter(is_approved=True).exclude(is_winner=True).select_related('student__user')
    participant_users = [p.student.user for p in participants]

    if participant_users:
        send_gala_notification(
            recipients=participant_users,
            title=f"AI Gala Results: {gallery.title}",
            message=f"The results for '{gallery.theme}' are in! Check out the winners and your participation badge.",
            notification_type='info',
            related_url='/ai-gala'
        )


def notify_vote_received(project, voter):
    """Notify project owner when someone votes for their project."""
    # Don't notify if voting for own project (shouldn't happen but just in case)
    if project.student.user_id == voter.id:
        return

    send_gala_notification(
        recipients=[project.student.user],
        title="New Vote!",
        message=f"Someone voted for your project '{project.title}'! You now have {project.vote_count} votes.",
        notification_type='success',
        related_url='/ai-gala'
    )


# ============== PERMISSION HELPERS ==============

def is_admin_or_teacher(user):
    """Check if user is Admin or Teacher."""
    return user.role in ['Admin', 'Teacher']


def can_manage_gallery(user, gallery):
    """
    Check if user can manage (edit/update status/view stats) a gallery.
    - Admin: Can manage any gallery
    - Teacher: Can manage galleries that target their assigned schools or galleries they created
    """
    if user.role == 'Admin':
        return True

    if user.role == 'Teacher':
        # Teacher can manage galleries they created
        if gallery.created_by == user:
            return True

        # Teacher can manage galleries targeting their assigned schools
        teacher_school_ids = set(user.assigned_schools.values_list('id', flat=True))
        gallery_school_ids = set(gallery.target_schools.values_list('id', flat=True))

        # If gallery has no target schools (global), teacher cannot manage
        if not gallery_school_ids:
            return False

        # Teacher can manage if gallery targets any of their schools
        return bool(teacher_school_ids & gallery_school_ids)

    return False


def can_access_student(user, student):
    """
    Check if user can access/manage a student.
    - Admin: Can access any student
    - Teacher: Can only access students in their assigned schools
    """
    if user.role == 'Admin':
        return True

    if user.role == 'Teacher':
        teacher_school_ids = user.assigned_schools.values_list('id', flat=True)
        return student.school_id in teacher_school_ids

    return False


# ============== GALLERY ENDPOINTS ==============

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_galleries(request):
    """
    GET /api/aigala/galleries/
    List galleries visible to the current user based on targeting.
    Query params:
        - status: filter by status (active, voting, closed)
        - include_drafts: if 'true', include draft galleries (admin only)
    """
    from django.db.models import Q

    user = request.user
    include_drafts = request.query_params.get('include_drafts', '').lower() == 'true'

    # Admin sees all galleries
    if user.role == 'Admin':
        if include_drafts:
            galleries = Gallery.objects.all()
        else:
            galleries = Gallery.objects.exclude(status='draft')

    # Teacher sees global + galleries targeting their assigned schools
    elif user.role == 'Teacher':
        teacher_schools = user.assigned_schools.all()
        galleries = Gallery.objects.filter(
            Q(target_schools__isnull=True) |  # No target = global
            Q(target_schools__in=teacher_schools)
        ).exclude(status='draft').distinct()

    # Student sees global + galleries targeting their school/class
    elif user.role == 'Student':
        try:
            student = user.student_profile
            student_school = student.school
            student_class = student.student_class

            # Galleries with no targeting (global) or targeting this student's school
            galleries = Gallery.objects.exclude(status='draft')

            # Filter by targeting
            visible_gallery_ids = []
            for gallery in galleries:
                # No target schools = global, everyone can see
                if not gallery.target_schools.exists():
                    visible_gallery_ids.append(gallery.id)
                # Student's school is in target schools
                elif student_school and gallery.target_schools.filter(id=student_school.id).exists():
                    # If no class targeting or student's class is in target classes
                    if not gallery.target_classes or student_class in gallery.target_classes:
                        visible_gallery_ids.append(gallery.id)

            galleries = Gallery.objects.filter(id__in=visible_gallery_ids)
        except Exception:
            # If no student profile, only show global galleries
            galleries = Gallery.objects.exclude(status='draft').filter(
                target_schools__isnull=True
            )
    else:
        # Other roles see only global galleries (no targeting)
        galleries = Gallery.objects.exclude(status='draft').annotate(
            school_count=Count('target_schools')
        ).filter(school_count=0)

    # Optional status filter
    status_filter = request.query_params.get('status')
    if status_filter:
        galleries = galleries.filter(status=status_filter)

    # Order by created_at descending (newest first)
    galleries = galleries.order_by('-created_at')

    serializer = GalleryListSerializer(
        galleries, many=True, context={'request': request}
    )
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def gallery_detail(request, gallery_id):
    """
    GET /api/aigala/galleries/{id}/
    Get full gallery details with all projects.
    """
    try:
        gallery = Gallery.objects.get(id=gallery_id)
    except Gallery.DoesNotExist:
        return Response(
            {'error': 'Gallery not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Don't show draft galleries to non-admins
    if gallery.status == 'draft' and not request.user.is_staff:
        return Response(
            {'error': 'Gallery not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    serializer = GalleryDetailSerializer(gallery, context={'request': request})
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def active_gallery(request):
    """
    GET /api/aigala/active/
    Get the currently active or voting gallery.
    Returns the most recent one if multiple exist.
    """
    gallery = Gallery.objects.filter(
        status__in=['active', 'voting']
    ).order_by('-class_date').first()

    if not gallery:
        return Response(
            {'message': 'No active gallery', 'gallery': None},
            status=status.HTTP_200_OK
        )

    serializer = GalleryDetailSerializer(gallery, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_gallery(request):
    """
    POST /api/aigala/galleries/create/
    Create a new gallery/contest.
    - Admin: Can create for any schools or global
    - Teacher: Can only create for their assigned schools
    """
    user = request.user

    # Check permission - only Admin or Teacher can create
    if user.role not in ['Admin', 'Teacher']:
        return Response(
            {'error': 'Only admins and teachers can create contests'},
            status=status.HTTP_403_FORBIDDEN
        )

    serializer = GalleryCreateSerializer(data=request.data)
    if serializer.is_valid():
        # Set created_by to current user
        gallery = serializer.save(created_by=user)

        # For teachers: verify they only selected their assigned schools (no auto-assign)
        if user.role == 'Teacher':
            teacher_schools = user.assigned_schools.all()

            # Teacher MUST select at least one school (can't create global contests)
            if not gallery.target_schools.exists():
                gallery.delete()
                return Response(
                    {'error': 'Teachers must select at least one school for the contest'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Verify teacher only selected their assigned schools
            selected_school_ids = set(gallery.target_schools.values_list('id', flat=True))
            allowed_school_ids = set(teacher_schools.values_list('id', flat=True))
            if not selected_school_ids.issubset(allowed_school_ids):
                gallery.delete()
                return Response(
                    {'error': 'You can only create contests for your assigned schools'},
                    status=status.HTTP_403_FORBIDDEN
                )

        # Handle cover image upload if provided
        cover_image = request.FILES.get('cover_image')
        if cover_image:
            try:
                result = upload_gallery_cover(cover_image, gallery.id)
                gallery.cover_image_url = result['url']
                gallery.cover_image_path = result['path']
                gallery.save()
            except Exception as e:
                # Gallery created but cover upload failed
                pass

        return Response(
            GalleryDetailSerializer(gallery, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_gallery(request, gallery_id):
    """
    PUT/PATCH /api/aigala/galleries/{id}/update/
    Update gallery details.
    - Admin: Can update any gallery
    - Teacher: Can update galleries they created or targeting their schools
    """
    if not is_admin_or_teacher(request.user):
        return Response(
            {'error': 'Only admins and teachers can update galleries'},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        gallery = Gallery.objects.get(id=gallery_id)
    except Gallery.DoesNotExist:
        return Response(
            {'error': 'Gallery not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Check if user can manage this gallery
    if not can_manage_gallery(request.user, gallery):
        return Response(
            {'error': 'You do not have permission to update this gallery'},
            status=status.HTTP_403_FORBIDDEN
        )

    partial = request.method == 'PATCH'
    serializer = GalleryCreateSerializer(
        gallery, data=request.data, partial=partial
    )

    if serializer.is_valid():
        serializer.save()

        # Handle cover image upload if provided
        cover_image = request.FILES.get('cover_image')
        if cover_image:
            try:
                # Delete old cover if exists
                if gallery.cover_image_path:
                    delete_image(gallery.cover_image_path)

                result = upload_gallery_cover(cover_image, gallery.id)
                gallery.cover_image_url = result['url']
                gallery.cover_image_path = result['path']
                gallery.save()
            except Exception:
                pass

        return Response(
            GalleryDetailSerializer(gallery, context={'request': request}).data
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_gallery_status(request, gallery_id):
    """
    POST /api/aigala/galleries/{id}/status/
    Update gallery status.
    - Admin: Can update any gallery status
    - Teacher: Can update status for galleries they created or targeting their schools
    Body: { "status": "active" | "voting" | "closed" | "draft" }
    """
    if not is_admin_or_teacher(request.user):
        return Response(
            {'error': 'Only admins and teachers can update gallery status'},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        gallery = Gallery.objects.get(id=gallery_id)
    except Gallery.DoesNotExist:
        return Response(
            {'error': 'Gallery not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Check if user can manage this gallery
    if not can_manage_gallery(request.user, gallery):
        return Response(
            {'error': 'You do not have permission to update this gallery status'},
            status=status.HTTP_403_FORBIDDEN
        )

    new_status = request.data.get('status')
    valid_statuses = ['draft', 'active', 'voting', 'closed']

    if new_status not in valid_statuses:
        return Response(
            {'error': f'Invalid status. Must be one of: {valid_statuses}'},
            status=status.HTTP_400_BAD_REQUEST
        )

    old_status = gallery.status
    gallery.status = new_status
    gallery.save()

    # Send notifications based on status change
    if new_status == 'active' and old_status != 'active':
        notify_gallery_active(gallery)

    if new_status == 'voting' and old_status != 'voting':
        notify_gallery_voting(gallery)

    # If closing gallery, calculate winners and notify
    if new_status == 'closed' and old_status != 'closed':
        calculate_gallery_winners(gallery)
        notify_gallery_closed(gallery)

    return Response({
        'message': f'Gallery status updated to {new_status}',
        'gallery': GalleryDetailSerializer(gallery, context={'request': request}).data
    })


def calculate_gallery_winners(gallery):
    """
    Calculate and set winners for a gallery.
    Awards badges to top 3 and participation badges to all.
    """
    # Reset previous winners
    gallery.projects.update(is_winner=False, winner_rank=None)

    # Get top 3 by vote count
    top_projects = gallery.projects.filter(
        is_approved=True
    ).order_by('-vote_count', '-created_at')[:3]

    # Badge types mapping
    badge_types = {
        1: 'gala_champion',
        2: 'gala_innovator',
        3: 'gala_creator',
    }

    for rank, project in enumerate(top_projects, 1):
        project.is_winner = True
        project.winner_rank = rank
        project.save()

        # Award winner badge
        try:
            badge = Badge.objects.get(badge_type=badge_types[rank])
            StudentBadge.objects.get_or_create(
                student=project.student,
                badge=badge
            )
        except Badge.DoesNotExist:
            pass

    # Award participation badge to all participants
    try:
        participation_badge = Badge.objects.get(badge_type='gala_participant')
        for project in gallery.projects.filter(is_approved=True):
            StudentBadge.objects.get_or_create(
                student=project.student,
                badge=participation_badge
            )
    except Badge.DoesNotExist:
        pass

    # Check for veteran badge (5+ participations)
    try:
        veteran_badge = Badge.objects.get(badge_type='gala_veteran')
        for project in gallery.projects.filter(is_approved=True):
            total_participations = Project.objects.filter(
                student=project.student,
                is_approved=True
            ).count()
            if total_participations >= 5:
                StudentBadge.objects.get_or_create(
                    student=project.student,
                    badge=veteran_badge
                )
    except Badge.DoesNotExist:
        pass

    # Check for superstar badge (3+ wins)
    try:
        superstar_badge = Badge.objects.get(badge_type='gala_superstar')
        for project in top_projects:
            total_wins = Project.objects.filter(
                student=project.student,
                is_winner=True
            ).count()
            if total_wins >= 3:
                StudentBadge.objects.get_or_create(
                    student=project.student,
                    badge=superstar_badge
                )
    except Badge.DoesNotExist:
        pass


# ============== PROJECT ENDPOINTS ==============

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def project_detail(request, project_id):
    """
    GET /api/aigala/projects/{id}/
    Get full project details.
    Increments view count.
    """
    try:
        project = Project.objects.select_related(
            'student', 'gallery'
        ).get(id=project_id, is_approved=True)
    except Project.DoesNotExist:
        return Response(
            {'error': 'Project not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Increment view count (only once per session could be implemented)
    Project.objects.filter(id=project_id).update(view_count=F('view_count') + 1)
    project.refresh_from_db()

    serializer = ProjectDetailSerializer(project, context={'request': request})
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_project(request, gallery_id):
    """
    POST /api/aigala/galleries/{id}/upload/
    Upload a new project to a gallery.
    Requires multipart form with 'image' file.
    """
    try:
        gallery = Gallery.objects.get(id=gallery_id)
    except Gallery.DoesNotExist:
        return Response(
            {'error': 'Gallery not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Check if gallery is accepting submissions
    if gallery.status != 'active':
        return Response(
            {'error': 'This gallery is not accepting submissions'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Get student profile
    try:
        student = request.user.student_profile
    except Exception:
        return Response(
            {'error': 'Student profile not found. Only students can submit projects.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check if student already submitted to this gallery
    if Project.objects.filter(gallery=gallery, student=student).exists():
        return Response(
            {'error': 'You have already submitted a project to this gallery'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Validate input
    serializer = ProjectCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # Get image file
    image = request.FILES.get('image')
    if not image:
        return Response(
            {'error': 'Image file is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Validate image format
    allowed_extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp']
    file_ext = image.name.split('.')[-1].lower() if '.' in image.name else ''
    if file_ext not in allowed_extensions:
        return Response(
            {'error': f'Invalid image format. Allowed: {", ".join(allowed_extensions)}'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Upload image to Supabase
    try:
        upload_result = upload_project_image(image, gallery.id, student.id)
    except Exception as e:
        return Response(
            {'error': f'Failed to upload image: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    # Create project
    project = Project.objects.create(
        gallery=gallery,
        student=student,
        title=serializer.validated_data['title'],
        description=serializer.validated_data.get('description', ''),
        metadata=serializer.validated_data.get('metadata', {}),
        image_url=upload_result['url'],
        image_path=upload_result['path']
    )

    return Response(
        ProjectDetailSerializer(project, context={'request': request}).data,
        status=status.HTTP_201_CREATED
    )


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_project(request, project_id):
    """
    PUT/PATCH /api/aigala/projects/{id}/update/
    Update own project (title, description, metadata only).
    Image cannot be changed after upload.
    """
    try:
        project = Project.objects.get(id=project_id)
    except Project.DoesNotExist:
        return Response(
            {'error': 'Project not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Check ownership
    try:
        student = request.user.student_profile
        if project.student != student:
            return Response(
                {'error': 'You can only edit your own project'},
                status=status.HTTP_403_FORBIDDEN
            )
    except Exception:
        return Response(
            {'error': 'Student profile not found'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check if gallery still allows edits (active status)
    if project.gallery.status not in ['active', 'voting']:
        return Response(
            {'error': 'Cannot edit project after gallery is closed'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Update allowed fields only
    if 'title' in request.data:
        project.title = request.data['title']
    if 'description' in request.data:
        project.description = request.data['description']
    if 'metadata' in request.data:
        project.metadata = request.data['metadata']

    project.save()

    return Response(
        ProjectDetailSerializer(project, context={'request': request}).data
    )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_project(request, project_id):
    """
    DELETE /api/aigala/projects/{id}/
    Delete own project (only while gallery is active).
    """
    try:
        project = Project.objects.get(id=project_id)
    except Project.DoesNotExist:
        return Response(
            {'error': 'Project not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Check ownership (or admin)
    try:
        student = request.user.student_profile
        is_owner = project.student == student
    except Exception:
        is_owner = False

    if not is_owner and not request.user.is_staff:
        return Response(
            {'error': 'You can only delete your own project'},
            status=status.HTTP_403_FORBIDDEN
        )

    # Check if gallery allows deletion
    if project.gallery.status not in ['active'] and not request.user.is_staff:
        return Response(
            {'error': 'Cannot delete project after voting has started'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Delete image from Supabase
    if project.image_path:
        delete_image(project.image_path)

    project.delete()

    return Response(
        {'message': 'Project deleted successfully'},
        status=status.HTTP_200_OK
    )


# ============== VOTING ENDPOINTS ==============

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def vote_for_project(request, project_id):
    """
    POST /api/aigala/projects/{id}/vote/
    Cast a vote for a project.
    """
    try:
        project = Project.objects.select_related('gallery').get(
            id=project_id, is_approved=True
        )
    except Project.DoesNotExist:
        return Response(
            {'error': 'Project not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    gallery = project.gallery

    # Check if voting is open
    if not gallery.is_voting_open:
        return Response(
            {'error': 'Voting is not currently open for this gallery'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Get voter (student profile)
    try:
        student = request.user.student_profile
    except Exception:
        return Response(
            {'error': 'Student profile not found'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Can't vote for own project
    if project.student == student:
        return Response(
            {'error': 'You cannot vote for your own project'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check remaining votes
    votes_cast = Vote.objects.filter(
        project__gallery=gallery, voter=student
    ).count()
    if votes_cast >= gallery.max_votes_per_user:
        return Response(
            {'error': f'You have already used all {gallery.max_votes_per_user} votes'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Check if already voted for this project
    if Vote.objects.filter(project=project, voter=student).exists():
        return Response(
            {'error': 'You have already voted for this project'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Cast vote
    Vote.objects.create(project=project, voter=student)

    # Update vote count
    Project.objects.filter(id=project_id).update(vote_count=F('vote_count') + 1)
    project.refresh_from_db()

    # Notify project owner about the vote
    notify_vote_received(project, request.user)

    return Response({
        'message': 'Vote cast successfully',
        'project_id': project.id,
        'project_votes': project.vote_count,
        'votes_remaining': gallery.max_votes_per_user - votes_cast - 1
    })


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remove_vote(request, project_id):
    """
    DELETE /api/aigala/projects/{id}/vote/
    Remove a previously cast vote.
    """
    try:
        project = Project.objects.select_related('gallery').get(id=project_id)
    except Project.DoesNotExist:
        return Response(
            {'error': 'Project not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Check if voting is still open
    if not project.gallery.is_voting_open:
        return Response(
            {'error': 'Voting is closed, cannot remove vote'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Get voter
    try:
        student = request.user.student_profile
    except Exception:
        return Response(
            {'error': 'Student profile not found'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Find and delete vote
    try:
        vote = Vote.objects.get(project=project, voter=student)
        vote.delete()

        # Update vote count
        Project.objects.filter(id=project_id).update(vote_count=F('vote_count') - 1)
        project.refresh_from_db()

        votes_cast = Vote.objects.filter(
            project__gallery=project.gallery, voter=student
        ).count()

        return Response({
            'message': 'Vote removed successfully',
            'project_id': project.id,
            'project_votes': project.vote_count,
            'votes_remaining': project.gallery.max_votes_per_user - votes_cast
        })
    except Vote.DoesNotExist:
        return Response(
            {'error': 'You have not voted for this project'},
            status=status.HTTP_404_NOT_FOUND
        )


# ============== COMMENT ENDPOINTS ==============

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_comments(request, project_id):
    """
    GET /api/aigala/projects/{id}/comments/
    Get all approved comments for a project.
    """
    try:
        project = Project.objects.get(id=project_id, is_approved=True)
    except Project.DoesNotExist:
        return Response(
            {'error': 'Project not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    comments = project.comments.filter(is_approved=True).select_related('commenter')
    serializer = CommentSerializer(comments, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_comment(request, project_id):
    """
    POST /api/aigala/projects/{id}/comments/
    Add a comment to a project.
    """
    try:
        project = Project.objects.select_related('gallery').get(
            id=project_id, is_approved=True
        )
    except Project.DoesNotExist:
        return Response(
            {'error': 'Project not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Check if comments are allowed
    if not project.gallery.allow_comments:
        return Response(
            {'error': 'Comments are disabled for this gallery'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Get commenter
    try:
        student = request.user.student_profile
    except Exception:
        return Response(
            {'error': 'Student profile not found'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Validate comment
    serializer = CommentCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # Create comment
    comment = Comment.objects.create(
        project=project,
        commenter=student,
        content=serializer.validated_data['content']
    )

    # Update comment count
    Project.objects.filter(id=project_id).update(comment_count=F('comment_count') + 1)

    return Response(
        CommentSerializer(comment).data,
        status=status.HTTP_201_CREATED
    )


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_comment(request, comment_id):
    """
    DELETE /api/aigala/comments/{id}/
    Delete own comment (or admin can delete any).
    """
    try:
        comment = Comment.objects.select_related('project').get(id=comment_id)
    except Comment.DoesNotExist:
        return Response(
            {'error': 'Comment not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Check ownership
    try:
        student = request.user.student_profile
        is_owner = comment.commenter == student
    except Exception:
        is_owner = False

    if not is_owner and not request.user.is_staff:
        return Response(
            {'error': 'You can only delete your own comments'},
            status=status.HTTP_403_FORBIDDEN
        )

    project_id = comment.project.id
    comment.delete()

    # Update comment count
    Project.objects.filter(id=project_id).update(comment_count=F('comment_count') - 1)

    return Response({'message': 'Comment deleted successfully'})


# ============== DASHBOARD DATA ENDPOINT ==============

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_gala_data(request):
    """
    GET /api/aigala/my-data/
    Get student's AI Gala summary for dashboard.
    Returns current gallery info, own project, stats, recent projects, badges.
    """
    try:
        student = request.user.student_profile
    except Exception:
        return Response(
            {'error': 'Student profile not found'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Get current active/voting gallery
    current_gallery = Gallery.objects.filter(
        status__in=['active', 'voting']
    ).order_by('-class_date').first()

    # Get student's projects
    my_projects = Project.objects.filter(
        student=student
    ).select_related('gallery').order_by('-created_at')

    # Get gala badges
    gala_badges = student.earned_badges.filter(
        badge__badge_type__startswith='gala_'
    ).select_related('badge')

    # Calculate stats
    total_projects = my_projects.count()
    total_votes_received = sum(p.vote_count for p in my_projects)
    wins = my_projects.filter(is_winner=True).count()

    # Build response
    data = {
        'current_gallery': None,
        'my_current_project': None,
        'votes_remaining': 0,
        'stats': {
            'total_projects': total_projects,
            'total_votes_received': total_votes_received,
            'total_wins': wins,
        },
        'recent_projects': [],
        'gala_badges': [],
    }

    # Current gallery info
    if current_gallery:
        data['current_gallery'] = {
            'id': current_gallery.id,
            'title': current_gallery.title,
            'month_label': current_gallery.month_label,
            'theme': current_gallery.theme,
            'status': current_gallery.status,
            'is_voting_open': current_gallery.is_voting_open,
            'voting_end_date': current_gallery.voting_end_date.isoformat() if current_gallery.voting_end_date else None,
            'days_until_voting_ends': current_gallery.days_until_voting_ends,
            'total_projects': current_gallery.total_projects,
        }

        # My project in current gallery
        my_project = my_projects.filter(gallery=current_gallery).first()
        if my_project:
            data['my_current_project'] = {
                'id': my_project.id,
                'title': my_project.title,
                'image_url': my_project.image_url,
                'vote_count': my_project.vote_count,
                'comment_count': my_project.comment_count,
                'is_winner': my_project.is_winner,
                'winner_rank': my_project.winner_rank,
            }

        # Votes remaining in current gallery
        votes_cast = Vote.objects.filter(
            project__gallery=current_gallery, voter=student
        ).count()
        data['votes_remaining'] = current_gallery.max_votes_per_user - votes_cast

    # Recent projects (last 5)
    for project in my_projects[:5]:
        data['recent_projects'].append({
            'id': project.id,
            'title': project.title,
            'image_url': project.image_url,
            'gallery_id': project.gallery.id,
            'gallery_title': project.gallery.title,
            'gallery_theme': project.gallery.theme,
            'vote_count': project.vote_count,
            'is_winner': project.is_winner,
            'winner_rank': project.winner_rank,
            'created_at': project.created_at.isoformat(),
        })

    # Gala badges
    for sb in gala_badges:
        data['gala_badges'].append({
            'name': sb.badge.name,
            'icon': sb.badge.icon,
            'description': sb.badge.description,
            'badge_type': sb.badge.badge_type,
            'earned_at': sb.earned_at.isoformat(),
        })

    return Response(data)


# ============== ADMIN ENDPOINTS ==============

@api_view(['POST'])
@permission_classes([IsAdminUser])
def admin_upload_project(request, gallery_id):
    """
    POST /api/aigala/admin/galleries/{id}/upload/
    Admin uploads project on behalf of a student.
    Required: student_id, title, image
    """
    try:
        gallery = Gallery.objects.get(id=gallery_id)
    except Gallery.DoesNotExist:
        return Response(
            {'error': 'Gallery not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    student_id = request.data.get('student_id')
    if not student_id:
        return Response(
            {'error': 'student_id is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        from students.models import Student
        student = Student.objects.get(id=student_id)
    except Student.DoesNotExist:
        return Response(
            {'error': 'Student not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Check if student already has a project
    if Project.objects.filter(gallery=gallery, student=student).exists():
        return Response(
            {'error': 'Student already has a project in this gallery'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Get required fields
    title = request.data.get('title')
    image = request.FILES.get('image')

    if not title:
        return Response(
            {'error': 'Title is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not image:
        return Response(
            {'error': 'Image is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Upload image
    try:
        upload_result = upload_project_image(image, gallery.id, student.id)
    except Exception as e:
        return Response(
            {'error': f'Failed to upload image: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    # Create project
    project = Project.objects.create(
        gallery=gallery,
        student=student,
        title=title,
        description=request.data.get('description', ''),
        metadata=request.data.get('metadata', {}),
        image_url=upload_result['url'],
        image_path=upload_result['path']
    )

    return Response(
        ProjectDetailSerializer(project, context={'request': request}).data,
        status=status.HTTP_201_CREATED
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def teacher_upload_project(request, gallery_id):
    """
    POST /api/aigala/teacher/galleries/{id}/upload/
    Teacher uploads project on behalf of a student in their assigned schools.
    Required: student_id, title, image
    """
    # Check user is Teacher or Admin
    if request.user.role not in ['Teacher', 'Admin']:
        return Response(
            {'error': 'Only teachers and admins can use this endpoint'},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        gallery = Gallery.objects.get(id=gallery_id)
    except Gallery.DoesNotExist:
        return Response(
            {'error': 'Gallery not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    student_id = request.data.get('student_id')
    if not student_id:
        return Response(
            {'error': 'student_id is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    try:
        from students.models import Student
        student = Student.objects.get(id=student_id)
    except Student.DoesNotExist:
        return Response(
            {'error': 'Student not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    # For teachers, verify student is in their assigned schools
    if request.user.role == 'Teacher':
        teacher_school_ids = request.user.assigned_schools.values_list('id', flat=True)
        if student.school_id not in teacher_school_ids:
            return Response(
                {'error': 'You can only upload projects for students in your assigned schools'},
                status=status.HTTP_403_FORBIDDEN
            )

    # Check if student already has a project
    if Project.objects.filter(gallery=gallery, student=student).exists():
        return Response(
            {'error': 'Student already has a project in this gallery'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Get required fields
    title = request.data.get('title')
    image = request.FILES.get('image')

    if not title:
        return Response(
            {'error': 'Title is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not image:
        return Response(
            {'error': 'Image is required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Upload image
    try:
        upload_result = upload_project_image(image, gallery.id, student.id)
    except Exception as e:
        return Response(
            {'error': f'Failed to upload image: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    # Create project
    project = Project.objects.create(
        gallery=gallery,
        student=student,
        title=title,
        description=request.data.get('description', ''),
        metadata=request.data.get('metadata', {}),
        image_url=upload_result['url'],
        image_path=upload_result['path']
    )

    return Response(
        ProjectDetailSerializer(project, context={'request': request}).data,
        status=status.HTTP_201_CREATED
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def admin_calculate_winners(request, gallery_id):
    """
    POST /api/aigala/admin/galleries/{id}/calculate-winners/
    Manually calculate winners for a gallery.
    - Admin: Can calculate for any gallery
    - Teacher: Can calculate for galleries they created or targeting their schools
    """
    if not is_admin_or_teacher(request.user):
        return Response(
            {'error': 'Only admins and teachers can calculate winners'},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        gallery = Gallery.objects.get(id=gallery_id)
    except Gallery.DoesNotExist:
        return Response(
            {'error': 'Gallery not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Check if user can manage this gallery
    if not can_manage_gallery(request.user, gallery):
        return Response(
            {'error': 'You do not have permission to manage this gallery'},
            status=status.HTTP_403_FORBIDDEN
        )

    calculate_gallery_winners(gallery)

    return Response({
        'message': 'Winners calculated successfully',
        'gallery': GalleryDetailSerializer(gallery, context={'request': request}).data
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_gallery_stats(request, gallery_id):
    """
    GET /api/aigala/admin/galleries/{id}/stats/
    Get detailed statistics for a gallery.
    - Admin: Can view stats for any gallery
    - Teacher: Can view stats for galleries they created or targeting their schools
    """
    if not is_admin_or_teacher(request.user):
        return Response(
            {'error': 'Only admins and teachers can view gallery stats'},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        gallery = Gallery.objects.get(id=gallery_id)
    except Gallery.DoesNotExist:
        return Response(
            {'error': 'Gallery not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Check if user can manage this gallery
    if not can_manage_gallery(request.user, gallery):
        return Response(
            {'error': 'You do not have permission to view this gallery stats'},
            status=status.HTTP_403_FORBIDDEN
        )

    projects = gallery.projects.all()
    total_projects = projects.count()
    approved_projects = projects.filter(is_approved=True).count()
    total_votes = Vote.objects.filter(project__gallery=gallery).count()
    total_comments = Comment.objects.filter(project__gallery=gallery).count()
    total_views = sum(p.view_count for p in projects)

    # Unique voters
    unique_voters = Vote.objects.filter(
        project__gallery=gallery
    ).values('voter').distinct().count()

    # Projects by class
    from django.db.models import Count
    projects_by_class = projects.values(
        'student__student_class'
    ).annotate(count=Count('id')).order_by('-count')

    return Response({
        'gallery_id': gallery.id,
        'gallery_title': gallery.title,
        'status': gallery.status,
        'total_projects': total_projects,
        'approved_projects': approved_projects,
        'total_votes': total_votes,
        'total_comments': total_comments,
        'total_views': total_views,
        'unique_voters': unique_voters,
        'average_votes_per_project': round(total_votes / approved_projects, 2) if approved_projects > 0 else 0,
        'projects_by_class': list(projects_by_class),
    })


# ============== PDF GENERATION ENDPOINTS ==============

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def participation_report_pdf(request, gallery_id):
    """
    GET /api/aigala/admin/galleries/{id}/participation-report/
    Generate and download participation report PDF for a gallery.
    - Admin: Can download for any gallery
    - Teacher: Can download for galleries they created or targeting their schools
    """
    if not is_admin_or_teacher(request.user):
        return Response(
            {'error': 'Only admins and teachers can download reports'},
            status=status.HTTP_403_FORBIDDEN
        )

    from django.http import HttpResponse
    from weasyprint import HTML
    from io import BytesIO
    from django.db.models import Count
    from datetime import datetime

    try:
        gallery = Gallery.objects.get(id=gallery_id)
    except Gallery.DoesNotExist:
        return Response(
            {'error': 'Gallery not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Check if user can manage this gallery
    if not can_manage_gallery(request.user, gallery):
        return Response(
            {'error': 'You do not have permission to download this report'},
            status=status.HTTP_403_FORBIDDEN
        )

    # Get data
    projects = gallery.projects.filter(is_approved=True).select_related(
        'student', 'student__school'
    ).order_by('-vote_count', '-created_at')

    total_projects = projects.count()
    total_votes = Vote.objects.filter(project__gallery=gallery).count()
    unique_voters = Vote.objects.filter(
        project__gallery=gallery
    ).values('voter').distinct().count()

    # Projects by class
    projects_by_class = projects.values(
        'student__student_class'
    ).annotate(count=Count('id')).order_by('-count')

    # Build participant rows
    participant_rows = ""
    for i, project in enumerate(projects, 1):
        winner_badge = ""
        if project.is_winner:
            badges = {1: "Champion", 2: "Innovator", 3: "Creator"}
            winner_badge = f'<span class="winner-badge">{badges.get(project.winner_rank, "Winner")}</span>'

        participant_rows += f'''
        <tr class="{'winner-row' if project.is_winner else ''}">
            <td>{i}</td>
            <td>{project.student.name}</td>
            <td>{project.student.student_class or '-'}</td>
            <td>{project.student.school.name if project.student.school else '-'}</td>
            <td>{project.title}</td>
            <td>{project.vote_count}</td>
            <td>{winner_badge}</td>
        </tr>
        '''

    # Build class breakdown rows
    class_rows = ""
    for item in projects_by_class:
        class_rows += f'''
        <tr>
            <td>{item['student__student_class'] or 'Unassigned'}</td>
            <td>{item['count']}</td>
        </tr>
        '''

    # Generate HTML
    html_content = f'''
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            @page {{
                size: A4 landscape;
                margin: 15mm;
            }}
            body {{
                font-family: Arial, sans-serif;
                font-size: 10pt;
                color: #333;
            }}
            .header {{
                text-align: center;
                border-bottom: 3px solid #8B5CF6;
                padding-bottom: 15px;
                margin-bottom: 20px;
            }}
            .header h1 {{
                color: #8B5CF6;
                margin: 0 0 5px 0;
                font-size: 24pt;
            }}
            .header h2 {{
                color: #666;
                margin: 0;
                font-size: 14pt;
                font-weight: normal;
            }}
            .header .meta {{
                margin-top: 10px;
                font-size: 9pt;
                color: #888;
            }}
            .stats-grid {{
                display: flex;
                justify-content: space-between;
                margin-bottom: 20px;
            }}
            .stat-box {{
                background: #f8f8f8;
                border-radius: 8px;
                padding: 15px 25px;
                text-align: center;
                border-left: 4px solid #8B5CF6;
            }}
            .stat-box .number {{
                font-size: 24pt;
                font-weight: bold;
                color: #8B5CF6;
            }}
            .stat-box .label {{
                font-size: 9pt;
                color: #666;
                margin-top: 5px;
            }}
            table {{
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 20px;
            }}
            th {{
                background: #8B5CF6;
                color: white;
                padding: 10px;
                text-align: left;
                font-weight: 600;
            }}
            td {{
                padding: 8px 10px;
                border-bottom: 1px solid #ddd;
            }}
            tr:nth-child(even) {{
                background: #f9f9f9;
            }}
            .winner-row {{
                background: #fff8e1 !important;
            }}
            .winner-badge {{
                background: linear-gradient(135deg, #FFD700, #FFA500);
                color: white;
                padding: 3px 10px;
                border-radius: 15px;
                font-size: 8pt;
                font-weight: bold;
            }}
            .section-title {{
                font-size: 14pt;
                color: #8B5CF6;
                margin: 20px 0 10px 0;
                border-bottom: 2px solid #eee;
                padding-bottom: 5px;
            }}
            .class-breakdown {{
                width: 50%;
            }}
            .footer {{
                margin-top: 30px;
                text-align: center;
                font-size: 8pt;
                color: #888;
                border-top: 1px solid #ddd;
                padding-top: 10px;
            }}
        </style>
    </head>
    <body>
        <div class="header">
            <h1>AI Gala Participation Report</h1>
            <h2>{gallery.title} - {gallery.theme}</h2>
            <div class="meta">
                Month: {gallery.month_label} | Status: {gallery.status.title()} | Generated: {datetime.now().strftime('%B %d, %Y at %I:%M %p')}
            </div>
        </div>

        <div class="stats-grid">
            <div class="stat-box">
                <div class="number">{total_projects}</div>
                <div class="label">Total Projects</div>
            </div>
            <div class="stat-box">
                <div class="number">{total_votes}</div>
                <div class="label">Total Votes</div>
            </div>
            <div class="stat-box">
                <div class="number">{unique_voters}</div>
                <div class="label">Unique Voters</div>
            </div>
            <div class="stat-box">
                <div class="number">{round(total_votes / total_projects, 1) if total_projects > 0 else 0}</div>
                <div class="label">Avg Votes/Project</div>
            </div>
        </div>

        <h3 class="section-title">Participants List</h3>
        <table>
            <thead>
                <tr>
                    <th>#</th>
                    <th>Student Name</th>
                    <th>Class</th>
                    <th>School</th>
                    <th>Project Title</th>
                    <th>Votes</th>
                    <th>Award</th>
                </tr>
            </thead>
            <tbody>
                {participant_rows}
            </tbody>
        </table>

        <h3 class="section-title">Participation by Class</h3>
        <table class="class-breakdown">
            <thead>
                <tr>
                    <th>Class</th>
                    <th>Projects</th>
                </tr>
            </thead>
            <tbody>
                {class_rows}
            </tbody>
        </table>

        <div class="footer">
            <strong>Koder Kids</strong> | AI Gala Participation Report | Confidential
        </div>
    </body>
    </html>
    '''

    # Generate PDF
    buffer = BytesIO()
    HTML(string=html_content).write_pdf(buffer)
    buffer.seek(0)

    # Return as downloadable PDF
    filename = f"AI_Gala_Report_{gallery.month_label.replace(' ', '_')}_{gallery.id}.pdf"
    response = HttpResponse(buffer, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'

    return response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_certificate(request, project_id):
    """
    GET /api/aigala/projects/{id}/certificate/
    Download certificate for a specific project.
    Available to project owner and admins.
    """
    from django.http import HttpResponse
    from weasyprint import HTML
    from io import BytesIO
    from datetime import datetime

    try:
        project = Project.objects.select_related(
            'student', 'student__school', 'gallery'
        ).get(id=project_id)
    except Project.DoesNotExist:
        return Response(
            {'error': 'Project not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Check permissions - owner or admin
    is_owner = False
    try:
        if hasattr(request.user, 'student_profile'):
            is_owner = project.student == request.user.student_profile
    except Exception:
        pass

    if not is_owner and not request.user.is_staff:
        return Response(
            {'error': 'You can only download your own certificate'},
            status=status.HTTP_403_FORBIDDEN
        )

    # Gallery must be closed
    if project.gallery.status != 'closed':
        return Response(
            {'error': 'Certificates are only available after the gallery closes'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Determine certificate type
    if project.is_winner:
        rank_titles = {1: 'Champion', 2: 'Innovator', 3: 'Creator'}
        award_title = f"AI Gala {rank_titles.get(project.winner_rank, 'Winner')}"
        award_subtitle = f"#{project.winner_rank} Place"
        badge_color = {1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32'}.get(project.winner_rank, '#8B5CF6')
    else:
        award_title = "AI Gala Participant"
        award_subtitle = "Certificate of Participation"
        badge_color = '#8B5CF6'

    # Generate certificate HTML
    html_content = f'''
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            @page {{
                size: A4 landscape;
                margin: 0;
            }}
            body {{
                font-family: 'Georgia', serif;
                margin: 0;
                padding: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                height: 100vh;
                display: flex;
                justify-content: center;
                align-items: center;
            }}
            .certificate {{
                width: 277mm;
                height: 190mm;
                background: white;
                border-radius: 20px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                position: relative;
                overflow: hidden;
            }}
            .border-design {{
                position: absolute;
                top: 10px;
                left: 10px;
                right: 10px;
                bottom: 10px;
                border: 3px solid {badge_color};
                border-radius: 15px;
            }}
            .inner-border {{
                position: absolute;
                top: 20px;
                left: 20px;
                right: 20px;
                bottom: 20px;
                border: 1px solid #ddd;
                border-radius: 10px;
            }}
            .content {{
                position: relative;
                z-index: 10;
                padding: 30px 50px;
                text-align: center;
                height: 100%;
                box-sizing: border-box;
            }}
            .logo {{
                font-size: 18pt;
                font-weight: bold;
                color: #8B5CF6;
                letter-spacing: 3px;
                margin-bottom: 10px;
            }}
            .title {{
                font-size: 36pt;
                font-weight: bold;
                color: {badge_color};
                margin: 15px 0;
                text-transform: uppercase;
                letter-spacing: 5px;
            }}
            .subtitle {{
                font-size: 14pt;
                color: #666;
                margin-bottom: 25px;
                font-style: italic;
            }}
            .presented-to {{
                font-size: 12pt;
                color: #888;
                margin-bottom: 5px;
            }}
            .student-name {{
                font-size: 28pt;
                font-weight: bold;
                color: #333;
                margin: 10px 0;
                border-bottom: 2px solid {badge_color};
                padding-bottom: 10px;
                display: inline-block;
            }}
            .school-name {{
                font-size: 11pt;
                color: #666;
                margin-top: 5px;
            }}
            .project-section {{
                margin: 20px 0;
                padding: 15px;
                background: #f9f9f9;
                border-radius: 10px;
            }}
            .project-label {{
                font-size: 10pt;
                color: #888;
            }}
            .project-title {{
                font-size: 16pt;
                color: #333;
                font-weight: 600;
                margin-top: 5px;
            }}
            .gallery-theme {{
                font-size: 12pt;
                color: #8B5CF6;
                margin-top: 5px;
            }}
            .stats {{
                display: inline-block;
                margin-top: 10px;
                padding: 8px 20px;
                background: {badge_color};
                color: white;
                border-radius: 20px;
                font-size: 11pt;
                font-weight: bold;
            }}
            .footer {{
                position: absolute;
                bottom: 35px;
                left: 50px;
                right: 50px;
                display: flex;
                justify-content: space-between;
                align-items: flex-end;
            }}
            .signature {{
                text-align: center;
            }}
            .signature-line {{
                width: 150px;
                border-bottom: 1px solid #333;
                margin-bottom: 5px;
            }}
            .signature-text {{
                font-size: 9pt;
                color: #666;
            }}
            .date {{
                text-align: center;
            }}
            .date-text {{
                font-size: 10pt;
                color: #333;
            }}
            .corner-design {{
                position: absolute;
                width: 80px;
                height: 80px;
                background: {badge_color};
                opacity: 0.1;
            }}
            .corner-tl {{ top: 0; left: 0; border-radius: 0 0 80px 0; }}
            .corner-tr {{ top: 0; right: 0; border-radius: 0 0 0 80px; }}
            .corner-bl {{ bottom: 0; left: 0; border-radius: 0 80px 0 0; }}
            .corner-br {{ bottom: 0; right: 0; border-radius: 80px 0 0 0; }}
        </style>
    </head>
    <body>
        <div class="certificate">
            <div class="corner-design corner-tl"></div>
            <div class="corner-design corner-tr"></div>
            <div class="corner-design corner-bl"></div>
            <div class="corner-design corner-br"></div>
            <div class="border-design"></div>
            <div class="inner-border"></div>

            <div class="content">
                <div class="logo">KODER KIDS</div>
                <div class="title">{award_title}</div>
                <div class="subtitle">{award_subtitle}</div>

                <div class="presented-to">This certificate is proudly presented to</div>
                <div class="student-name">{project.student.name}</div>
                <div class="school-name">{project.student.school.name if project.student.school else ''} • {project.student.student_class or ''}</div>

                <div class="project-section">
                    <div class="project-label">For the creative project</div>
                    <div class="project-title">"{project.title}"</div>
                    <div class="gallery-theme">{project.gallery.title} - {project.gallery.theme}</div>
                    {f'<div class="stats">{project.vote_count} Votes</div>' if project.is_winner else ''}
                </div>

                <div class="footer">
                    <div class="signature">
                        <div class="signature-line"></div>
                        <div class="signature-text">Program Director</div>
                    </div>
                    <div class="date">
                        <div class="date-text">{project.gallery.month_label}</div>
                        <div class="signature-text">{datetime.now().strftime('%Y')}</div>
                    </div>
                    <div class="signature">
                        <div class="signature-line"></div>
                        <div class="signature-text">Koder Kids</div>
                    </div>
                </div>
            </div>
        </div>
    </body>
    </html>
    '''

    # Generate PDF
    buffer = BytesIO()
    HTML(string=html_content).write_pdf(buffer)
    buffer.seek(0)

    # Return as downloadable PDF
    filename = f"Certificate_{project.student.name.replace(' ', '_')}_{project.gallery.month_label.replace(' ', '_')}.pdf"
    response = HttpResponse(buffer, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'

    return response


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_all_certificates(request, gallery_id):
    """
    GET /api/aigala/admin/galleries/{id}/certificates/
    Download all certificates for a gallery as a ZIP file.
    - Admin: Can download for any gallery
    - Teacher: Can download for galleries they created or targeting their schools
    """
    if not is_admin_or_teacher(request.user):
        return Response(
            {'error': 'Only admins and teachers can download certificates'},
            status=status.HTTP_403_FORBIDDEN
        )

    from django.http import HttpResponse
    from weasyprint import HTML
    from io import BytesIO
    import zipfile
    from datetime import datetime

    try:
        gallery = Gallery.objects.get(id=gallery_id)
    except Gallery.DoesNotExist:
        return Response(
            {'error': 'Gallery not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Check if user can manage this gallery
    if not can_manage_gallery(request.user, gallery):
        return Response(
            {'error': 'You do not have permission to download certificates for this gallery'},
            status=status.HTTP_403_FORBIDDEN
        )

    if gallery.status != 'closed':
        return Response(
            {'error': 'Certificates are only available after the gallery closes'},
            status=status.HTTP_400_BAD_REQUEST
        )

    projects = gallery.projects.filter(is_approved=True).select_related(
        'student', 'student__school'
    )

    if not projects.exists():
        return Response(
            {'error': 'No projects found in this gallery'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Create ZIP in memory
    zip_buffer = BytesIO()

    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        for project in projects:
            # Determine certificate type
            if project.is_winner:
                rank_titles = {1: 'Champion', 2: 'Innovator', 3: 'Creator'}
                award_title = f"AI Gala {rank_titles.get(project.winner_rank, 'Winner')}"
                award_subtitle = f"#{project.winner_rank} Place"
                badge_color = {1: '#FFD700', 2: '#C0C0C0', 3: '#CD7F32'}.get(project.winner_rank, '#8B5CF6')
            else:
                award_title = "AI Gala Participant"
                award_subtitle = "Certificate of Participation"
                badge_color = '#8B5CF6'

            # Generate certificate HTML (same template as single certificate)
            html_content = f'''
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    @page {{ size: A4 landscape; margin: 0; }}
                    body {{ font-family: 'Georgia', serif; margin: 0; padding: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); height: 100vh; display: flex; justify-content: center; align-items: center; }}
                    .certificate {{ width: 277mm; height: 190mm; background: white; border-radius: 20px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); position: relative; overflow: hidden; }}
                    .border-design {{ position: absolute; top: 10px; left: 10px; right: 10px; bottom: 10px; border: 3px solid {badge_color}; border-radius: 15px; }}
                    .inner-border {{ position: absolute; top: 20px; left: 20px; right: 20px; bottom: 20px; border: 1px solid #ddd; border-radius: 10px; }}
                    .content {{ position: relative; z-index: 10; padding: 30px 50px; text-align: center; height: 100%; box-sizing: border-box; }}
                    .logo {{ font-size: 18pt; font-weight: bold; color: #8B5CF6; letter-spacing: 3px; margin-bottom: 10px; }}
                    .title {{ font-size: 36pt; font-weight: bold; color: {badge_color}; margin: 15px 0; text-transform: uppercase; letter-spacing: 5px; }}
                    .subtitle {{ font-size: 14pt; color: #666; margin-bottom: 25px; font-style: italic; }}
                    .presented-to {{ font-size: 12pt; color: #888; margin-bottom: 5px; }}
                    .student-name {{ font-size: 28pt; font-weight: bold; color: #333; margin: 10px 0; border-bottom: 2px solid {badge_color}; padding-bottom: 10px; display: inline-block; }}
                    .school-name {{ font-size: 11pt; color: #666; margin-top: 5px; }}
                    .project-section {{ margin: 20px 0; padding: 15px; background: #f9f9f9; border-radius: 10px; }}
                    .project-label {{ font-size: 10pt; color: #888; }}
                    .project-title {{ font-size: 16pt; color: #333; font-weight: 600; margin-top: 5px; }}
                    .gallery-theme {{ font-size: 12pt; color: #8B5CF6; margin-top: 5px; }}
                    .stats {{ display: inline-block; margin-top: 10px; padding: 8px 20px; background: {badge_color}; color: white; border-radius: 20px; font-size: 11pt; font-weight: bold; }}
                    .footer {{ position: absolute; bottom: 35px; left: 50px; right: 50px; display: flex; justify-content: space-between; align-items: flex-end; }}
                    .signature {{ text-align: center; }}
                    .signature-line {{ width: 150px; border-bottom: 1px solid #333; margin-bottom: 5px; }}
                    .signature-text {{ font-size: 9pt; color: #666; }}
                    .date {{ text-align: center; }}
                    .date-text {{ font-size: 10pt; color: #333; }}
                    .corner-design {{ position: absolute; width: 80px; height: 80px; background: {badge_color}; opacity: 0.1; }}
                    .corner-tl {{ top: 0; left: 0; border-radius: 0 0 80px 0; }}
                    .corner-tr {{ top: 0; right: 0; border-radius: 0 0 0 80px; }}
                    .corner-bl {{ bottom: 0; left: 0; border-radius: 0 80px 0 0; }}
                    .corner-br {{ bottom: 0; right: 0; border-radius: 80px 0 0 0; }}
                </style>
            </head>
            <body>
                <div class="certificate">
                    <div class="corner-design corner-tl"></div>
                    <div class="corner-design corner-tr"></div>
                    <div class="corner-design corner-bl"></div>
                    <div class="corner-design corner-br"></div>
                    <div class="border-design"></div>
                    <div class="inner-border"></div>
                    <div class="content">
                        <div class="logo">KODER KIDS</div>
                        <div class="title">{award_title}</div>
                        <div class="subtitle">{award_subtitle}</div>
                        <div class="presented-to">This certificate is proudly presented to</div>
                        <div class="student-name">{project.student.name}</div>
                        <div class="school-name">{project.student.school.name if project.student.school else ''} • {project.student.student_class or ''}</div>
                        <div class="project-section">
                            <div class="project-label">For the creative project</div>
                            <div class="project-title">"{project.title}"</div>
                            <div class="gallery-theme">{gallery.title} - {gallery.theme}</div>
                            {f'<div class="stats">{project.vote_count} Votes</div>' if project.is_winner else ''}
                        </div>
                        <div class="footer">
                            <div class="signature"><div class="signature-line"></div><div class="signature-text">Program Director</div></div>
                            <div class="date"><div class="date-text">{gallery.month_label}</div><div class="signature-text">{datetime.now().strftime('%Y')}</div></div>
                            <div class="signature"><div class="signature-line"></div><div class="signature-text">Koder Kids</div></div>
                        </div>
                    </div>
                </div>
            </body>
            </html>
            '''

            # Generate PDF
            pdf_buffer = BytesIO()
            HTML(string=html_content).write_pdf(pdf_buffer)
            pdf_buffer.seek(0)

            # Add to ZIP
            safe_name = project.student.name.replace(' ', '_').replace('/', '_')
            prefix = f"{project.winner_rank}_Winner_" if project.is_winner else "Participant_"
            filename = f"{prefix}{safe_name}.pdf"
            zip_file.writestr(filename, pdf_buffer.getvalue())

    zip_buffer.seek(0)

    # Return as downloadable ZIP
    zip_filename = f"AI_Gala_Certificates_{gallery.month_label.replace(' ', '_')}.zip"
    response = HttpResponse(zip_buffer, content_type='application/zip')
    response['Content-Disposition'] = f'attachment; filename="{zip_filename}"'

    return response
