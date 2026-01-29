# ============================================
# ACTIVITY PROOF SERIALIZERS
# ============================================

from rest_framework import serializers
from .models import ActivityProof, ActivityProofBulkAction


class ActivityProofUploadSerializer(serializers.ModelSerializer):
    """
    Serializer for students uploading activity proofs.
    """
    class Meta:
        model = ActivityProof
        fields = [
            'id',
            'topic',
            'screenshot_url',
            'software_used',
            'student_notes',
        ]
        read_only_fields = ['id']

    def validate_topic(self, value):
        """Ensure the topic belongs to a course the student is enrolled in."""
        request = self.context.get('request')
        if not request or not request.user:
            raise serializers.ValidationError("Authentication required")

        # Get student from user
        student = getattr(request.user, 'student_profile', None)
        if not student:
            raise serializers.ValidationError("Student profile not found")

        # Check if enrolled in the course this topic belongs to
        from .models import CourseEnrollment
        enrollment = CourseEnrollment.objects.filter(
            student=student,
            course=value.book,
            status='active'
        ).first()

        if not enrollment:
            raise serializers.ValidationError(
                "You are not enrolled in this course"
            )

        return value

    def create(self, validated_data):
        request = self.context.get('request')
        student = request.user.student_profile
        topic = validated_data['topic']

        # Get enrollment
        from .models import CourseEnrollment
        enrollment = CourseEnrollment.objects.get(
            student=student,
            course=topic.book,
            status='active'
        )

        # Check if proof already exists
        existing = ActivityProof.objects.filter(
            student=student,
            topic=topic
        ).first()

        if existing:
            # Update existing proof (allow re-upload if rejected)
            if existing.status == 'approved':
                raise serializers.ValidationError(
                    "Proof already approved for this topic"
                )
            existing.screenshot_url = validated_data['screenshot_url']
            existing.software_used = validated_data.get('software_used', 'other')
            existing.student_notes = validated_data.get('student_notes', '')
            existing.status = 'pending'  # Reset to pending on re-upload
            existing.teacher_remarks = ''
            existing.teacher_rating = None
            existing.approved_by = None
            existing.approved_at = None
            existing.save()
            return existing

        # Create new proof
        return ActivityProof.objects.create(
            student=student,
            topic=topic,
            enrollment=enrollment,
            **validated_data
        )


class ActivityProofStudentSerializer(serializers.ModelSerializer):
    """
    Serializer for students viewing their proofs.
    """
    topic_title = serializers.CharField(source='topic.display_title', read_only=True)
    chapter_title = serializers.SerializerMethodField()
    course_title = serializers.CharField(source='enrollment.course.title', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    rating_display = serializers.SerializerMethodField()

    class Meta:
        model = ActivityProof
        fields = [
            'id',
            'topic',
            'topic_title',
            'chapter_title',
            'course_title',
            'screenshot_url',
            'software_used',
            'student_notes',
            'uploaded_at',
            'status',
            'status_display',
            'teacher_remarks',
            'teacher_rating',
            'rating_display',
            'approved_at',
        ]
        read_only_fields = fields

    def get_chapter_title(self, obj):
        if obj.topic.parent:
            return obj.topic.parent.display_title
        return None

    def get_rating_display(self, obj):
        if obj.teacher_rating:
            return obj.get_teacher_rating_display()
        return None


class ActivityProofTeacherSerializer(serializers.ModelSerializer):
    """
    Serializer for teachers viewing proofs for approval.
    """
    student_name = serializers.CharField(source='student.name', read_only=True)
    student_id = serializers.IntegerField(source='student.id', read_only=True)
    topic_title = serializers.CharField(source='topic.display_title', read_only=True)
    chapter_title = serializers.SerializerMethodField()
    course_title = serializers.CharField(source='enrollment.course.title', read_only=True)
    school_name = serializers.CharField(source='student.school.name', read_only=True)
    class_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = ActivityProof
        fields = [
            'id',
            'student_id',
            'student_name',
            'school_name',
            'class_name',
            'topic',
            'topic_title',
            'chapter_title',
            'course_title',
            'screenshot_url',
            'software_used',
            'student_notes',
            'uploaded_at',
            'status',
            'status_display',
            'teacher_remarks',
            'teacher_rating',
            'approved_by',
            'approved_at',
        ]
        read_only_fields = [
            'id', 'student_id', 'student_name', 'school_name', 'class_name',
            'topic', 'topic_title', 'chapter_title', 'course_title',
            'screenshot_url', 'software_used', 'student_notes', 'uploaded_at',
        ]

    def get_chapter_title(self, obj):
        if obj.topic.parent:
            return obj.topic.parent.display_title
        return None

    def get_class_name(self, obj):
        if obj.student.current_class:
            return obj.student.current_class.name
        return None


class BulkApproveSerializer(serializers.Serializer):
    """
    Serializer for bulk approving proofs.
    """
    proof_ids = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=1,
        help_text="List of ActivityProof IDs to approve"
    )
    rating = serializers.ChoiceField(
        choices=ActivityProof.RATING_CHOICES,
        default='good',
        help_text="Rating to apply to all proofs"
    )
    remarks = serializers.CharField(
        required=False,
        allow_blank=True,
        default='',
        help_text="Remarks to apply to all proofs"
    )

    def validate_proof_ids(self, value):
        """Ensure all proofs exist and are pending."""
        existing_ids = set(
            ActivityProof.objects.filter(
                id__in=value,
                status='pending'
            ).values_list('id', flat=True)
        )

        invalid_ids = set(value) - existing_ids
        if invalid_ids:
            raise serializers.ValidationError(
                f"Some proofs are invalid or not pending: {list(invalid_ids)}"
            )

        return value


class BulkRejectSerializer(serializers.Serializer):
    """
    Serializer for bulk rejecting proofs.
    """
    proof_ids = serializers.ListField(
        child=serializers.IntegerField(),
        min_length=1,
        help_text="List of ActivityProof IDs to reject"
    )
    remarks = serializers.CharField(
        required=True,
        min_length=5,
        help_text="Reason for rejection (required)"
    )

    def validate_proof_ids(self, value):
        """Ensure all proofs exist and are pending."""
        existing_ids = set(
            ActivityProof.objects.filter(
                id__in=value,
                status='pending'
            ).values_list('id', flat=True)
        )

        invalid_ids = set(value) - existing_ids
        if invalid_ids:
            raise serializers.ValidationError(
                f"Some proofs are invalid or not pending: {list(invalid_ids)}"
            )

        return value


class ActivityProofBulkActionSerializer(serializers.ModelSerializer):
    """
    Serializer for bulk action audit logs.
    """
    teacher_name = serializers.CharField(source='teacher.get_full_name', read_only=True)
    action_display = serializers.CharField(source='get_action_type_display', read_only=True)

    class Meta:
        model = ActivityProofBulkAction
        fields = [
            'id',
            'teacher',
            'teacher_name',
            'action_type',
            'action_display',
            'proof_ids',
            'count',
            'rating',
            'remarks',
            'created_at',
        ]
        read_only_fields = fields
