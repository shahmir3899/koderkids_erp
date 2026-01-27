# courses/serializers.py
import re
from rest_framework import serializers
from .models import (
    CourseEnrollment, TopicProgress,
    Quiz, QuizQuestion, QuizChoice, QuizAttempt
)
from books.models import Book, Topic


def natural_sort_key(obj):
    """
    Natural sort key for topics.
    Handles numeric parts so "Chapter 10" comes after "Chapter 2".
    """
    code = getattr(obj, 'code', '') or ''
    title = getattr(obj, 'title', '') or ''
    text = f"{code} {title}"
    parts = re.split(r'(\d+)', text)
    return [int(part) if part.isdigit() else part.lower() for part in parts]


# =============================================
# Topic Serializers (Extended for LMS)
# =============================================

class TopicContentSerializer(serializers.ModelSerializer):
    """Full topic content for the course player."""
    display_title = serializers.SerializerMethodField()
    has_quiz = serializers.SerializerMethodField()
    activity_blocks = serializers.SerializerMethodField()
    children = serializers.SerializerMethodField()

    class Meta:
        model = Topic
        fields = [
            'id', 'code', 'display_title', 'title', 'type',
            'content', 'activity_blocks', 'video_url', 'video_duration_seconds',
            'estimated_time_minutes', 'is_required', 'has_quiz', 'children'
        ]

    def get_display_title(self, obj):
        return obj.display_title

    def get_has_quiz(self, obj):
        return obj.quizzes.filter(is_active=True).exists()

    def get_activity_blocks(self, obj):
        """Return activity_blocks, aggregating from descendants if topic has none."""
        # If topic has its own activity_blocks, return them
        if obj.activity_blocks:
            blocks = obj.activity_blocks
            # Ensure it's a list
            if isinstance(blocks, dict):
                return [blocks]
            return blocks

        # For chapters: DON'T aggregate from descendants - only show chapter content
        # Chapters should display their own 'content' field, not child activities
        if obj.type == 'chapter':
            return []

        # For lessons/activities: aggregate from descendants (recursive)
        def collect_blocks(topic, depth=0, max_depth=3):
            """Recursively collect activity_blocks from descendants."""
            blocks = []
            children = topic.get_children()

            for child in children:
                if child.activity_blocks:
                    block = child.activity_blocks
                    # Add child info to block
                    if isinstance(block, dict):
                        block = {
                            **block,
                            'child_id': child.id,
                            'child_title': child.display_title,
                            'child_type': child.type,
                        }
                        blocks.append(block)
                    elif isinstance(block, list):
                        for b in block:
                            b['child_id'] = child.id
                            b['child_title'] = child.display_title
                            b['child_type'] = child.type
                        blocks.extend(block)
                elif depth < max_depth:
                    # Recurse into grandchildren
                    blocks.extend(collect_blocks(child, depth + 1, max_depth))

            return blocks

        return collect_blocks(obj)

    def get_children(self, obj):
        """Return basic info about children for navigation."""
        children = list(obj.get_children())
        # Natural sorting for proper numeric ordering
        children.sort(key=natural_sort_key)
        return [
            {
                'id': c.id,
                'code': c.code,
                'title': c.display_title,
                'type': c.type,
                'has_content': bool(c.activity_blocks),
            }
            for c in children
        ]


class TopicProgressSerializer(serializers.ModelSerializer):
    """Topic progress for a student."""
    topic_id = serializers.IntegerField(source='topic.id', read_only=True)
    topic_title = serializers.CharField(source='topic.display_title', read_only=True)
    is_unlocked = serializers.SerializerMethodField()

    class Meta:
        model = TopicProgress
        fields = [
            'id', 'topic_id', 'topic_title', 'status',
            'started_at', 'completed_at', 'time_spent_seconds',
            'last_position', 'is_unlocked'
        ]

    def get_is_unlocked(self, obj):
        return obj.is_unlocked()


class TopicWithProgressSerializer(serializers.ModelSerializer):
    """Topic with student progress data - optimized to avoid N+1 queries."""
    display_title = serializers.SerializerMethodField()
    progress = serializers.SerializerMethodField()
    children = serializers.SerializerMethodField()
    has_quiz = serializers.SerializerMethodField()

    class Meta:
        model = Topic
        fields = [
            'id', 'code', 'display_title', 'type',
            'video_url', 'estimated_time_minutes', 'is_required',
            'progress', 'children', 'has_quiz'
        ]

    def get_display_title(self, obj):
        return obj.display_title

    def get_progress(self, obj):
        user = self.context.get('user')

        # For Admin/Teacher, always return unlocked (no enrollment needed)
        if user and user.role in ['Admin', 'Teacher']:
            return {
                'status': 'not_started',
                'is_unlocked': True
            }

        enrollment = self.context.get('enrollment')
        if not enrollment:
            return None

        # Use prefetched progress data from context (avoids N+1 queries)
        progress_map = self.context.get('progress_map', {})
        completed_ids = self.context.get('completed_topic_ids', set())

        if obj.id in progress_map:
            progress = progress_map[obj.id]
            return {
                'status': progress.status,
                'is_unlocked': True,  # Has progress = unlocked
                'started_at': progress.started_at,
                'completed_at': progress.completed_at,
                'time_spent_seconds': progress.time_spent_seconds,
            }

        # No progress record - check if unlocked using prefetched sibling data
        # Chapters and first topics in each chapter are always unlocked
        if obj.type == 'chapter' or obj.parent is None:
            is_unlocked = True
        else:
            prev_sibling_map = self.context.get('prev_sibling_map', {})
            prev_sibling_id = prev_sibling_map.get(obj.id)
            is_unlocked = prev_sibling_id is None or prev_sibling_id in completed_ids

        return {
            'status': 'not_started',
            'is_unlocked': is_unlocked
        }

    def get_children(self, obj):
        # Use prefetched children from context if available (already sorted)
        children_map = self.context.get('children_map', {})
        if children_map and obj.id in children_map:
            children = children_map[obj.id]
        else:
            children = list(obj.get_children())
            # Only sort if not from prefetched map (already sorted)
            children.sort(key=natural_sort_key)

        return TopicWithProgressSerializer(
            children, many=True, context=self.context
        ).data

    def get_has_quiz(self, obj):
        # Use prefetched quiz topic IDs from context (avoids N+1 queries)
        quiz_topic_ids = self.context.get('quiz_topic_ids', None)
        if quiz_topic_ids is not None:
            return obj.id in quiz_topic_ids
        # Fallback to query if not prefetched
        return obj.quizzes.filter(is_active=True).exists()


# =============================================
# Course Enrollment Serializers
# =============================================

class CourseEnrollmentSerializer(serializers.ModelSerializer):
    """Course enrollment details."""
    course_title = serializers.CharField(source='course.title', read_only=True)
    course_cover = serializers.ImageField(source='course.cover', read_only=True)
    student_name = serializers.CharField(source='student.name', read_only=True)
    progress_percentage = serializers.SerializerMethodField()
    last_topic_title = serializers.CharField(source='last_topic.display_title', read_only=True)

    class Meta:
        model = CourseEnrollment
        fields = [
            'id', 'student', 'course', 'course_title', 'course_cover',
            'student_name', 'enrolled_at', 'completed_at', 'status',
            'last_accessed_at', 'last_topic', 'last_topic_title',
            'progress_percentage'
        ]
        read_only_fields = ['enrolled_at', 'completed_at', 'last_accessed_at']

    def get_progress_percentage(self, obj):
        return obj.get_progress_percentage()


class CourseEnrollmentCreateSerializer(serializers.ModelSerializer):
    """Serializer for enrolling in a course."""

    class Meta:
        model = CourseEnrollment
        fields = ['course']

    def validate_course(self, value):
        student = self.context['student']
        if CourseEnrollment.objects.filter(student=student, course=value).exists():
            raise serializers.ValidationError("Already enrolled in this course.")
        return value

    def create(self, validated_data):
        validated_data['student'] = self.context['student']
        return super().create(validated_data)


# =============================================
# Course Listing Serializers
# =============================================

class CourseListSerializer(serializers.ModelSerializer):
    """Course list for browsing."""
    total_topics = serializers.SerializerMethodField()
    total_duration_minutes = serializers.SerializerMethodField()
    enrollment_count = serializers.SerializerMethodField()
    is_enrolled = serializers.SerializerMethodField()

    class Meta:
        model = Book
        fields = [
            'id', 'title', 'isbn', 'cover',
            'total_topics', 'total_duration_minutes',
            'enrollment_count', 'is_enrolled'
        ]

    def get_total_topics(self, obj):
        return obj.topics.filter(is_required=True).count()

    def get_total_duration_minutes(self, obj):
        return sum(
            t.estimated_time_minutes
            for t in obj.topics.filter(is_required=True)
        )

    def get_enrollment_count(self, obj):
        return obj.enrollments.filter(status='active').count()

    def get_is_enrolled(self, obj):
        student = self.context.get('student')
        if not student:
            return False
        return obj.enrollments.filter(student=student).exists()


class CourseDetailSerializer(serializers.ModelSerializer):
    """Full course details with topic tree - optimized to avoid N+1 queries."""
    topics = serializers.SerializerMethodField()
    total_topics = serializers.SerializerMethodField()
    total_duration_minutes = serializers.SerializerMethodField()
    enrollment = serializers.SerializerMethodField()

    class Meta:
        model = Book
        fields = [
            'id', 'title', 'isbn', 'cover',
            'total_topics', 'total_duration_minutes',
            'topics', 'enrollment'
        ]

    def get_topics(self, obj):
        enrollment = self.context.get('enrollment')
        user = self.context.get('user')

        # Prefetch all topics for this book (single query)
        all_topics = list(obj.topics.all())

        # Build children map to avoid repeated get_children() queries
        children_map = {}
        for topic in all_topics:
            parent_id = topic.parent_id
            if parent_id not in children_map:
                children_map[parent_id] = []
            children_map[parent_id].append(topic)

        # Sort children by natural sort key and build previous sibling map
        prev_sibling_map = {}  # topic_id -> previous_sibling_id (or None)
        for parent_id, children in children_map.items():
            children.sort(key=natural_sort_key)
            prev_id = None
            for child in children:
                prev_sibling_map[child.id] = prev_id
                prev_id = child.id

        # Prefetch all progress for this enrollment (single query)
        progress_map = {}
        completed_topic_ids = set()
        if enrollment:
            progress_list = TopicProgress.objects.filter(
                enrollment=enrollment,
                topic__book=obj
            ).select_related('topic')
            for p in progress_list:
                progress_map[p.topic_id] = p
                if p.status == 'completed':
                    completed_topic_ids.add(p.topic_id)

        # Prefetch topic IDs that have active quizzes (single query)
        quiz_topic_ids = set(
            Quiz.objects.filter(
                topic__book=obj,
                is_active=True
            ).values_list('topic_id', flat=True)
        )

        # Get root topics (already sorted above)
        root_topics = children_map.get(None, [])

        return TopicWithProgressSerializer(
            root_topics, many=True,
            context={
                'enrollment': enrollment,
                'user': user,
                'progress_map': progress_map,
                'completed_topic_ids': completed_topic_ids,
                'quiz_topic_ids': quiz_topic_ids,
                'children_map': children_map,
                'prev_sibling_map': prev_sibling_map,
            }
        ).data

    def get_total_topics(self, obj):
        return obj.topics.filter(is_required=True).count()

    def get_total_duration_minutes(self, obj):
        return sum(
            t.estimated_time_minutes
            for t in obj.topics.filter(is_required=True)
        )

    def get_enrollment(self, obj):
        enrollment = self.context.get('enrollment')
        if enrollment:
            return CourseEnrollmentSerializer(enrollment).data
        return None


# =============================================
# Quiz Serializers
# =============================================

class QuizChoiceSerializer(serializers.ModelSerializer):
    """Quiz choice (answer option)."""

    class Meta:
        model = QuizChoice
        fields = ['id', 'choice_text', 'is_correct', 'order']
        extra_kwargs = {
            'is_correct': {'write_only': True}  # Hide correct answer when taking quiz
        }


class QuizChoiceWithAnswerSerializer(serializers.ModelSerializer):
    """Quiz choice with correct answer revealed (for results)."""

    class Meta:
        model = QuizChoice
        fields = ['id', 'choice_text', 'is_correct', 'order']


class QuizQuestionSerializer(serializers.ModelSerializer):
    """Quiz question for taking quiz."""
    choices = QuizChoiceSerializer(many=True, read_only=True)

    class Meta:
        model = QuizQuestion
        fields = [
            'id', 'question_type', 'question_text', 'question_media',
            'points', 'order', 'choices'
        ]


class QuizQuestionWithAnswerSerializer(serializers.ModelSerializer):
    """Quiz question with correct answers (for results)."""
    choices = QuizChoiceWithAnswerSerializer(many=True, read_only=True)

    class Meta:
        model = QuizQuestion
        fields = [
            'id', 'question_type', 'question_text', 'question_media',
            'explanation', 'points', 'order', 'choices'
        ]


class QuizSerializer(serializers.ModelSerializer):
    """Quiz for taking."""
    questions = serializers.SerializerMethodField()
    topic_title = serializers.CharField(source='topic.display_title', read_only=True)
    total_points = serializers.SerializerMethodField()

    class Meta:
        model = Quiz
        fields = [
            'id', 'title', 'description', 'topic', 'topic_title',
            'passing_score', 'time_limit_minutes', 'max_attempts',
            'shuffle_questions', 'total_points', 'questions'
        ]

    def get_questions(self, obj):
        questions = obj.questions.all()
        if obj.shuffle_questions:
            questions = questions.order_by('?')
        return QuizQuestionSerializer(questions, many=True).data

    def get_total_points(self, obj):
        return obj.get_total_points()


class QuizAttemptSerializer(serializers.ModelSerializer):
    """Quiz attempt result."""
    quiz_title = serializers.CharField(source='quiz.title', read_only=True)
    attempt_number = serializers.SerializerMethodField()
    can_retry = serializers.SerializerMethodField()

    class Meta:
        model = QuizAttempt
        fields = [
            'id', 'quiz', 'quiz_title', 'started_at', 'completed_at',
            'score', 'points_earned', 'passed', 'time_taken_seconds',
            'answers', 'attempt_number', 'can_retry'
        ]

    def get_attempt_number(self, obj):
        return obj.get_attempt_number()

    def get_can_retry(self, obj):
        return obj.can_retry()


class QuizSubmissionSerializer(serializers.Serializer):
    """Serializer for quiz submission."""
    answers = serializers.ListField(
        child=serializers.DictField(),
        help_text="List of {question_id: int, selected_choices: [choice_ids]}"
    )

    def validate_answers(self, value):
        for answer in value:
            if 'question_id' not in answer:
                raise serializers.ValidationError("Each answer must have question_id")
            if 'selected_choices' not in answer:
                raise serializers.ValidationError("Each answer must have selected_choices")
        return value


# =============================================
# Quiz Builder Serializers (Admin/Teacher)
# =============================================

class QuizChoiceCreateSerializer(serializers.ModelSerializer):
    """Create/update quiz choice."""

    class Meta:
        model = QuizChoice
        fields = ['id', 'choice_text', 'is_correct', 'order']


class QuizQuestionCreateSerializer(serializers.ModelSerializer):
    """Create/update quiz question with choices."""
    choices = QuizChoiceCreateSerializer(many=True)

    class Meta:
        model = QuizQuestion
        fields = [
            'id', 'question_type', 'question_text', 'question_media',
            'explanation', 'points', 'order', 'choices'
        ]

    def create(self, validated_data):
        choices_data = validated_data.pop('choices', [])
        question = QuizQuestion.objects.create(**validated_data)

        for choice_data in choices_data:
            QuizChoice.objects.create(question=question, **choice_data)

        return question

    def update(self, instance, validated_data):
        choices_data = validated_data.pop('choices', [])

        # Update question fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update choices
        existing_ids = set(instance.choices.values_list('id', flat=True))
        updated_ids = set()

        for choice_data in choices_data:
            choice_id = choice_data.get('id')
            if choice_id and choice_id in existing_ids:
                # Update existing choice
                choice = QuizChoice.objects.get(id=choice_id)
                for attr, value in choice_data.items():
                    if attr != 'id':
                        setattr(choice, attr, value)
                choice.save()
                updated_ids.add(choice_id)
            else:
                # Create new choice
                QuizChoice.objects.create(question=instance, **choice_data)

        # Delete removed choices
        instance.choices.exclude(id__in=updated_ids).delete()

        return instance


class QuizCreateSerializer(serializers.ModelSerializer):
    """Create/update quiz with questions."""
    questions = QuizQuestionCreateSerializer(many=True, required=False)
    topic_title = serializers.CharField(source='topic.display_title', read_only=True)

    class Meta:
        model = Quiz
        fields = [
            'id', 'topic', 'topic_title', 'title', 'description',
            'passing_score', 'time_limit_minutes', 'max_attempts',
            'shuffle_questions', 'show_correct_answers', 'is_active',
            'questions'
        ]

    def create(self, validated_data):
        questions_data = validated_data.pop('questions', [])
        validated_data['created_by'] = self.context['request'].user
        quiz = Quiz.objects.create(**validated_data)

        for q_order, question_data in enumerate(questions_data):
            choices_data = question_data.pop('choices', [])
            question_data['order'] = q_order
            question = QuizQuestion.objects.create(quiz=quiz, **question_data)

            for c_order, choice_data in enumerate(choices_data):
                choice_data['order'] = c_order
                QuizChoice.objects.create(question=question, **choice_data)

        return quiz

    def update(self, instance, validated_data):
        questions_data = validated_data.pop('questions', None)

        # Update quiz fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # If questions provided, update them
        if questions_data is not None:
            # For simplicity, delete and recreate questions
            instance.questions.all().delete()

            for q_order, question_data in enumerate(questions_data):
                choices_data = question_data.pop('choices', [])
                question_data['order'] = q_order
                question = QuizQuestion.objects.create(quiz=instance, **question_data)

                for c_order, choice_data in enumerate(choices_data):
                    choice_data['order'] = c_order
                    QuizChoice.objects.create(question=question, **choice_data)

        return instance


# =============================================
# Progress Dashboard Serializers
# =============================================

class ProgressDashboardSerializer(serializers.Serializer):
    """Student progress dashboard data."""
    total_courses = serializers.IntegerField()
    completed_courses = serializers.IntegerField()
    in_progress_courses = serializers.IntegerField()
    total_time_spent_seconds = serializers.IntegerField()
    total_topics_completed = serializers.IntegerField()
    total_quizzes_passed = serializers.IntegerField()
    average_quiz_score = serializers.FloatField()
    recent_activity = serializers.ListField()


class ContinueLearningSerializer(serializers.Serializer):
    """Continue learning data."""
    course_id = serializers.IntegerField()
    course_title = serializers.CharField()
    course_cover = serializers.ImageField(allow_null=True)
    topic_id = serializers.IntegerField(allow_null=True)
    topic_title = serializers.CharField(allow_null=True)
    progress_percentage = serializers.FloatField()
    last_accessed_at = serializers.DateTimeField()
