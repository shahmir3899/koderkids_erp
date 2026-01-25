# books/serializers.py
import re
from rest_framework import serializers
from .models import Book, Topic
from django.db.models import Q


def natural_sort_key(obj):
    """
    Natural sort key function for sorting topics.
    Handles numeric parts in strings so "Chapter 10" comes after "Chapter 2".
    """
    code = getattr(obj, 'code', '') or ''
    title = getattr(obj, 'title', '') or ''
    text = f"{code} {title}"

    # Split text into numeric and non-numeric parts
    parts = re.split(r'(\d+)', text)
    # Convert numeric parts to integers for proper sorting
    return [int(part) if part.isdigit() else part.lower() for part in parts]

class ActivityBlockSerializer(serializers.Serializer):
    type = serializers.CharField()
    title = serializers.CharField(required=False, allow_blank=True, default="")
    content = serializers.CharField(required=False, allow_blank=True, default="")
    order = serializers.IntegerField()

class TopicSerializer(serializers.ModelSerializer):
    display_title = serializers.SerializerMethodField()
    activity_blocks = serializers.SerializerMethodField()
    children = serializers.SerializerMethodField()

    class Meta:
        model = Topic
        fields = [
            "id",
            "code",
            "display_title",
            "activity_blocks",
            "children",
            "type",
        ]

    def get_display_title(self, obj):
        if obj.type == "chapter":
            title = obj.title
            parts = title.split(" ", 1)
            if parts and parts[0].isdigit():
                title = parts[1]
            return title
        if obj.type == "activity":
            return obj.title
        return f"{obj.code} {obj.title}".strip()

    def get_activity_blocks(self, obj):
        blocks = obj.activity_blocks or []
        if isinstance(blocks, dict):
            blocks = [blocks]

        normalized = []
        for i, block in enumerate(blocks):
            normalized.append(
                {
                    "type": block.get("type", "class"),
                    "title": block.get(
                        "title",
                        f"{block.get('type', 'Activity').capitalize()} Activity",
                    ),
                    "content": block.get("content", ""),
                    "order": block.get("order", i),
                }
            )
        return ActivityBlockSerializer(normalized, many=True).data

    def get_children(self, obj):
        depth = self.context.get("depth", 0)
        if depth >= 3:
            return []

        q = self.context.get("q", "").lower()
        children_qs = obj.get_children().defer("activity_blocks")  # Defer heavy JSONField unless needed

        if q:
            children_qs = children_qs.filter(
                Q(title__icontains=q) | Q(code__icontains=q)
            )

        # Apply natural sorting for proper numeric ordering (1, 2, 3...10 instead of 1, 10, 2)
        children_list = list(children_qs)
        children_list.sort(key=natural_sort_key)

        child_context = self.context.copy()
        child_context["depth"] = depth + 1

        return TopicSerializer(children_list, many=True, context=child_context).data

# books/serializers.py

class BookListSerializer(serializers.ModelSerializer):
    """
    Used only for /api/books/books/ (list)
    No topics → fast
    """
    class Meta:
        model = Book
        fields = ["id", "title", "isbn", "school", "cover"]
        read_only_fields = fields


class BookSerializer(serializers.ModelSerializer):
    topics = serializers.SerializerMethodField()

    class Meta:
        model = Book
        fields = ["id", "title", "isbn", "school", "cover", "description", "is_published", "difficulty_level", "topics"]

    def get_topics(self, obj):
        q = self.context.get("q", "").lower()
        root_qs = obj.topics.filter(parent=None).defer("activity_blocks")  # Defer heavy fields

        if not q:
            ctx = self.context.copy()
            ctx["depth"] = 0
            return TopicSerializer(root_qs, many=True, context=ctx).data

        # Find matching topics (1 query)
        matching_qs = obj.topics.filter(
            Q(title__icontains=q) | Q(code__icontains=q)
        ).only("id", "tree_id", "lft", "rgt")

        if not matching_qs.exists():
            return []

        # Build a combined filter for all ancestors (including self)
        filters = Q()
        for tree_id, lft, rgt in matching_qs.values_list("tree_id", "lft", "rgt"):
            filters |= Q(tree_id=tree_id, lft__lte=lft, rgt__gte=rgt)  # Includes self and ancestors

        # Fetch all relevant nodes in 1 query
        relevant_nodes = obj.topics.filter(filters).values_list("id", flat=True).distinct()

        # Filter roots to only those in relevant paths
        root_qs = root_qs.filter(id__in=relevant_nodes)

        ctx = self.context.copy()
        ctx["depth"] = 0
        return TopicSerializer(root_qs, many=True, context=ctx).data


# ============================================
# ADMIN SERIALIZERS - Full CRUD for Book Management
# ============================================

class AdminTopicListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for topic list in admin"""
    children_count = serializers.SerializerMethodField()
    has_content = serializers.SerializerMethodField()
    has_video = serializers.SerializerMethodField()

    class Meta:
        model = Topic
        fields = [
            'id', 'code', 'title', 'type', 'parent',
            'estimated_time_minutes', 'is_required',
            'children_count', 'has_content', 'has_video'
        ]

    def get_children_count(self, obj):
        return obj.get_children().count()

    def get_has_content(self, obj):
        return bool(obj.content) or bool(obj.activity_blocks)

    def get_has_video(self, obj):
        return bool(obj.video_url)


class AdminTopicDetailSerializer(serializers.ModelSerializer):
    """Full serializer for editing a single topic"""
    parent_title = serializers.CharField(source='parent.title', read_only=True, allow_null=True)
    children = serializers.SerializerMethodField()

    class Meta:
        model = Topic
        fields = [
            'id', 'book', 'parent', 'parent_title', 'code', 'title', 'type',
            'content', 'thumbnail', 'activity_blocks',
            'video_url', 'video_duration_seconds',
            'estimated_time_minutes', 'is_required',
            'children'
        ]

    def get_children(self, obj):
        children = list(obj.get_children())
        # Use natural sorting for proper numeric ordering (1, 2, 3...10 instead of 1, 10, 2)
        children.sort(key=natural_sort_key)
        return AdminTopicListSerializer(children, many=True).data


class AdminTopicWriteSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating topics"""

    class Meta:
        model = Topic
        fields = [
            'id', 'book', 'parent', 'code', 'title', 'type',
            'content', 'thumbnail', 'activity_blocks',
            'video_url', 'video_duration_seconds',
            'estimated_time_minutes', 'is_required'
        ]

    def validate_activity_blocks(self, value):
        """Validate activity_blocks structure"""
        if not isinstance(value, list):
            raise serializers.ValidationError("activity_blocks must be a list")

        for i, block in enumerate(value):
            if not isinstance(block, dict):
                raise serializers.ValidationError(f"Block {i} must be an object")
            if 'type' not in block:
                raise serializers.ValidationError(f"Block {i} must have a 'type' field")

        return value


class AdminBookListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for book list in admin"""
    school_name = serializers.CharField(source='school.name', read_only=True, allow_null=True)
    topics_count = serializers.SerializerMethodField()
    chapters_count = serializers.SerializerMethodField()

    class Meta:
        model = Book
        fields = [
            'id', 'title', 'isbn', 'school', 'school_name', 'cover',
            'description', 'is_published', 'difficulty_level',
            'topics_count', 'chapters_count'
        ]

    def get_topics_count(self, obj):
        return obj.topics.filter(type='lesson').count()

    def get_chapters_count(self, obj):
        return obj.topics.filter(type='chapter', parent=None).count()


class AdminBookDetailSerializer(serializers.ModelSerializer):
    """Full serializer for viewing a single book with topic tree"""
    school_name = serializers.CharField(source='school.name', read_only=True, allow_null=True)
    topic_tree = serializers.SerializerMethodField()
    total_topics = serializers.SerializerMethodField()
    total_duration_minutes = serializers.SerializerMethodField()

    class Meta:
        model = Book
        fields = [
            'id', 'title', 'isbn', 'school', 'school_name', 'cover',
            'description', 'is_published', 'difficulty_level',
            'topic_tree', 'total_topics', 'total_duration_minutes'
        ]

    def get_topic_tree(self, obj):
        """Get full topic tree structure"""
        root_topics = list(obj.topics.filter(parent=None))
        # Use natural sorting for proper numeric ordering (1, 2, 3...10 instead of 1, 10, 2)
        root_topics.sort(key=natural_sort_key)
        return self._serialize_topics(root_topics)

    def _serialize_topics(self, topics):
        result = []
        for topic in topics:
            children = list(topic.get_children())
            # Use natural sorting for children too
            children.sort(key=natural_sort_key)
            item = {
                'id': topic.id,
                'code': topic.code,
                'title': topic.title,
                'type': topic.type,
                'has_content': bool(topic.content) or bool(topic.activity_blocks),
                'has_video': bool(topic.video_url),
                'estimated_time_minutes': topic.estimated_time_minutes,
                'is_required': topic.is_required,
                'children': self._serialize_topics(children)
            }
            result.append(item)
        return result

    def get_total_topics(self, obj):
        return obj.topics.filter(type='lesson').count()

    def get_total_duration_minutes(self, obj):
        from django.db.models import Sum
        return obj.topics.aggregate(total=Sum('estimated_time_minutes'))['total'] or 0


class AdminBookWriteSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating books"""

    class Meta:
        model = Book
        fields = [
            'id', 'title', 'isbn', 'school', 'cover',
            'description', 'is_published', 'difficulty_level'
        ]