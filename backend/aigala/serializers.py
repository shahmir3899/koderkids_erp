"""
AI Gala Serializers.
Handles API serialization for Gallery, Project, Vote, Comment models.
"""
from rest_framework import serializers
from .models import Gallery, Project, Vote, Comment
from students.models import Student, School


class StudentMiniSerializer(serializers.ModelSerializer):
    """Minimal student info for project display."""
    profile_photo_url = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = ['id', 'name', 'student_class', 'profile_photo_url', 'reg_num']

    def get_profile_photo_url(self, obj):
        return obj.profile_photo_url


class CommentSerializer(serializers.ModelSerializer):
    """Serializer for project comments."""
    commenter_name = serializers.CharField(source='commenter.name', read_only=True)
    commenter_photo = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = [
            'id', 'content', 'commenter_name', 'commenter_photo',
            'created_at', 'is_approved'
        ]
        read_only_fields = ['id', 'commenter_name', 'commenter_photo', 'created_at']

    def get_commenter_photo(self, obj):
        return obj.commenter.profile_photo_url


class CommentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating comments."""
    class Meta:
        model = Comment
        fields = ['content']

    def validate_content(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Comment content cannot be empty.")
        if len(value) > 500:
            raise serializers.ValidationError("Comment cannot exceed 500 characters.")
        return value.strip()


class ProjectListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for gallery grid view.
    Shows essential info for thumbnails.
    """
    student_name = serializers.CharField(source='student.name', read_only=True)
    student_class = serializers.CharField(source='student.student_class', read_only=True)
    student_photo = serializers.SerializerMethodField()
    has_voted = serializers.SerializerMethodField()
    rank_title = serializers.ReadOnlyField()

    class Meta:
        model = Project
        fields = [
            'id', 'title', 'image_url', 'thumbnail_url',
            'student_name', 'student_class', 'student_photo',
            'vote_count', 'comment_count',
            'is_winner', 'winner_rank', 'rank_title',
            'has_voted', 'created_at'
        ]

    def get_student_photo(self, obj):
        return obj.student.profile_photo_url

    def get_has_voted(self, obj):
        """Check if current user has voted for this project."""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        try:
            student = request.user.student_profile
            return Vote.objects.filter(project=obj, voter=student).exists()
        except Exception:
            return False


class ProjectDetailSerializer(serializers.ModelSerializer):
    """
    Full project details with comments.
    Used when viewing a single project.
    """
    student = StudentMiniSerializer(read_only=True)
    comments = serializers.SerializerMethodField()
    has_voted = serializers.SerializerMethodField()
    is_own_project = serializers.SerializerMethodField()
    rank_title = serializers.ReadOnlyField()
    gallery_title = serializers.CharField(source='gallery.title', read_only=True)
    gallery_theme = serializers.CharField(source='gallery.theme', read_only=True)

    class Meta:
        model = Project
        fields = [
            'id', 'title', 'image_url', 'thumbnail_url', 'description', 'metadata',
            'student', 'vote_count', 'comment_count', 'view_count',
            'is_winner', 'winner_rank', 'rank_title',
            'has_voted', 'is_own_project',
            'gallery_title', 'gallery_theme',
            'comments', 'created_at', 'updated_at'
        ]

    def get_comments(self, obj):
        """Get approved comments only."""
        comments = obj.comments.filter(is_approved=True)[:20]  # Limit to 20
        return CommentSerializer(comments, many=True).data

    def get_has_voted(self, obj):
        """Check if current user has voted for this project."""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        try:
            student = request.user.student_profile
            return Vote.objects.filter(project=obj, voter=student).exists()
        except Exception:
            return False

    def get_is_own_project(self, obj):
        """Check if this is the current user's project."""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return False
        try:
            return obj.student == request.user.student_profile
        except Exception:
            return False


class ProjectCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/uploading projects."""
    class Meta:
        model = Project
        fields = ['title', 'description', 'metadata']

    def validate_title(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError("Title is required.")
        return value.strip()


class GalleryListSerializer(serializers.ModelSerializer):
    """
    Serializer for gallery listing.
    Shows overview info for each gallery.
    """
    total_projects = serializers.IntegerField(read_only=True)
    total_votes = serializers.IntegerField(read_only=True)
    is_voting_open = serializers.BooleanField(read_only=True)
    days_until_voting_ends = serializers.IntegerField(read_only=True)
    my_project = serializers.SerializerMethodField()
    my_votes_remaining = serializers.SerializerMethodField()
    my_votes_cast = serializers.SerializerMethodField()
    # Targeting info
    target_display = serializers.ReadOnlyField()
    target_schools_data = serializers.SerializerMethodField()
    target_classes = serializers.JSONField(read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Gallery
        fields = [
            'id', 'title', 'month_label', 'theme', 'description',
            'cover_image_url', 'status',
            'class_date', 'gallery_open_date', 'voting_start_date', 'voting_end_date',
            'is_voting_open', 'days_until_voting_ends',
            'total_projects', 'total_votes',
            'max_votes_per_user', 'allow_comments', 'allow_downloads',
            'my_project', 'my_votes_remaining', 'my_votes_cast',
            'target_display', 'target_schools_data', 'target_classes', 'created_by_name',
            'created_at'
        ]

    def get_my_project(self, obj):
        """Get current student's project in this gallery (if any)."""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        try:
            student = request.user.student_profile
            project = Project.objects.filter(gallery=obj, student=student).first()
            if project:
                return {
                    'id': project.id,
                    'title': project.title,
                    'image_url': project.image_url,
                    'vote_count': project.vote_count,
                    'is_winner': project.is_winner,
                    'winner_rank': project.winner_rank,
                }
        except Exception:
            pass
        return None

    def get_my_votes_remaining(self, obj):
        """How many votes the current user has left in this gallery."""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return obj.max_votes_per_user
        try:
            student = request.user.student_profile
            votes_cast = Vote.objects.filter(
                project__gallery=obj,
                voter=student
            ).count()
            return obj.max_votes_per_user - votes_cast
        except Exception:
            return obj.max_votes_per_user

    def get_my_votes_cast(self, obj):
        """List of project IDs the current user has voted for."""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return []
        try:
            student = request.user.student_profile
            votes = Vote.objects.filter(
                project__gallery=obj,
                voter=student
            ).values_list('project_id', flat=True)
            return list(votes)
        except Exception:
            return []

    def get_target_schools_data(self, obj):
        """Get list of targeted schools with id and name."""
        schools = obj.target_schools.all()
        if not schools.exists():
            return []
        return [{'id': s.id, 'name': s.name} for s in schools]

    def get_created_by_name(self, obj):
        """Get the name of the user who created the gallery."""
        if obj.created_by:
            full_name = obj.created_by.get_full_name()
            return full_name if full_name else obj.created_by.username
        return None


class GalleryDetailSerializer(GalleryListSerializer):
    """
    Full gallery details with all projects.
    Used when viewing a single gallery.
    """
    projects = serializers.SerializerMethodField()
    winners = serializers.SerializerMethodField()
    instructions = serializers.CharField()

    class Meta(GalleryListSerializer.Meta):
        fields = GalleryListSerializer.Meta.fields + ['projects', 'winners', 'instructions']

    def get_projects(self, obj):
        """Get all approved projects, ordered by votes."""
        projects = obj.projects.filter(is_approved=True).select_related('student')
        return ProjectListSerializer(
            projects, many=True, context=self.context
        ).data

    def get_winners(self, obj):
        """Get top 3 winners (if gallery is closed)."""
        if obj.status != 'closed':
            return []
        winners = obj.projects.filter(
            is_winner=True, is_approved=True
        ).order_by('winner_rank').select_related('student')[:3]
        return ProjectListSerializer(winners, many=True, context=self.context).data


class GalleryCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating galleries (admin/teacher)."""
    import json

    # Make optional fields explicit
    description = serializers.CharField(required=False, allow_blank=True, default='')
    instructions = serializers.CharField(required=False, allow_blank=True, default='')
    class_date = serializers.DateField(required=False, allow_null=True)
    gallery_open_date = serializers.DateField(required=False, allow_null=True)
    voting_start_date = serializers.DateField(required=False, allow_null=True)
    voting_end_date = serializers.DateField(required=False, allow_null=True)
    # Targeting fields - accept as CharField for JSON strings from FormData
    target_school_ids = serializers.CharField(required=False, write_only=True, allow_blank=True, default='')
    target_classes = serializers.CharField(required=False, write_only=True, allow_blank=True, default='')

    class Meta:
        model = Gallery
        fields = [
            'title', 'month_label', 'theme', 'description', 'instructions',
            'class_date', 'gallery_open_date', 'voting_start_date', 'voting_end_date',
            'max_votes_per_user', 'allow_comments', 'allow_downloads',
            'target_school_ids', 'target_classes'
        ]

    def validate_target_school_ids(self, value):
        """Parse JSON string to list of integers."""
        import json
        if not value:
            return []
        if isinstance(value, list):
            return value
        try:
            parsed = json.loads(value)
            if not isinstance(parsed, list):
                raise serializers.ValidationError("Must be a list of school IDs")
            return [int(id) for id in parsed]
        except (json.JSONDecodeError, ValueError):
            raise serializers.ValidationError("Invalid JSON format for school IDs")

    def validate_target_classes(self, value):
        """Parse JSON string to list of class names."""
        import json
        if not value:
            return []
        if isinstance(value, list):
            return value
        try:
            parsed = json.loads(value)
            if not isinstance(parsed, list):
                raise serializers.ValidationError("Must be a list of class names")
            return [str(cls) for cls in parsed]
        except json.JSONDecodeError:
            raise serializers.ValidationError("Invalid JSON format for classes")

    def validate(self, data):
        # Ensure dates are in correct order
        if data.get('class_date') and data.get('gallery_open_date'):
            if data['gallery_open_date'] < data['class_date']:
                raise serializers.ValidationError(
                    "Gallery open date cannot be before class date."
                )
        if data.get('voting_start_date') and data.get('voting_end_date'):
            if data['voting_end_date'] < data['voting_start_date']:
                raise serializers.ValidationError(
                    "Voting end date cannot be before voting start date."
                )
        return data

    def create(self, validated_data):
        # Extract targeting data before creating
        target_school_ids = validated_data.pop('target_school_ids', [])
        target_classes_list = validated_data.pop('target_classes', [])

        # Create the gallery
        gallery = Gallery.objects.create(**validated_data)

        # Set target schools if provided
        if target_school_ids:
            schools = School.objects.filter(id__in=target_school_ids)
            gallery.target_schools.set(schools)

        # Set target classes
        if target_classes_list:
            gallery.target_classes = target_classes_list
            gallery.save()

        return gallery


class VoteSerializer(serializers.ModelSerializer):
    """Serializer for votes."""
    voter_name = serializers.CharField(source='voter.name', read_only=True)
    project_title = serializers.CharField(source='project.title', read_only=True)

    class Meta:
        model = Vote
        fields = ['id', 'project', 'voter_name', 'project_title', 'created_at']
        read_only_fields = ['id', 'voter_name', 'project_title', 'created_at']


class MyGalaDataSerializer(serializers.Serializer):
    """
    Serializer for student's AI Gala dashboard summary.
    Used by /api/aigala/my-data/ endpoint.
    """
    current_gallery = serializers.DictField(allow_null=True)
    my_current_project = serializers.DictField(allow_null=True)
    votes_remaining = serializers.IntegerField()
    stats = serializers.DictField()
    recent_projects = serializers.ListField()
    gala_badges = serializers.ListField()
