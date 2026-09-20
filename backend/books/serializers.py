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

def topic_sort_key(obj):
    """
    Order topics by the numeric parts of their code, so 2 < 10, 1.2 < 1.10 and
    1.1.class.2 < 1.1.class.10. Topic's own MPTT ordering sorts codes as plain text,
    which puts chapter 10 before chapter 2. Class activities sort before home
    activities. Title is only a tie-breaker / fallback for topics without a code.
    """
    code = getattr(obj, 'code', '') or ''
    # (0, n, '') for numbers and (1, 0, text) for words keeps int/str comparisons safe
    parts = [(0, int(p), '') if p.isdigit() else (1, 0, p.lower()) for p in code.split('.') if p]
    return (not parts, parts, natural_sort_key(obj))


def topic_display_title(topic_type, code, title):
    """Label shown in the tree: chapters drop their leading number, activities show the title."""
    if topic_type == "chapter":
        parts = title.split(" ", 1)
        if parts and parts[0].isdigit() and len(parts) > 1:
            title = parts[1]
        return title
    if topic_type == "activity":
        return title
    return f"{code} {title}".strip()


class ActivityBlockSerializer(serializers.Serializer):
    type = serializers.CharField()
    title = serializers.CharField(required=False, allow_blank=True, default="")
    content = serializers.CharField(required=False, allow_blank=True, default="")
    order = serializers.IntegerField()

def normalize_activity_blocks(blocks):
    blocks = blocks or []
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


def build_topic_tree(topics, q=""):
    """
    Serialize a book's topic tree from ONE query, building the hierarchy in memory.
    (TopicSerializer.get_children used to run a query per topic - hundreds per book.)

    Same output as the old nested TopicSerializer: id, code, display_title,
    activity_blocks, children, type; natural order by code; 4 levels deep;
    with `q`, only roots on a path to a match and, below them, children that match.
    """
    q = (q or "").lower()
    rows = list(topics.only("id", "code", "title", "type", "parent_id", "activity_blocks"))

    children_of = {}
    for t in rows:
        children_of.setdefault(t.parent_id, []).append(t)

    def matches(t):
        return q in (t.title or "").lower() or q in (t.code or "").lower()

    relevant = None
    if q:
        by_id = {t.id: t for t in rows}
        relevant = set()
        found = False
        for t in rows:
            if matches(t):
                found = True
                node = t
                while node is not None and node.id not in relevant:
                    relevant.add(node.id)
                    node = by_id.get(node.parent_id)
        if not found:
            return []

    def build(t, depth):
        kids = []
        if depth < 3:
            kids = [c for c in children_of.get(t.id, []) if not q or matches(c)]
            kids.sort(key=topic_sort_key)
        return {
            "id": t.id,
            "code": t.code,
            "display_title": topic_display_title(t.type, t.code, t.title),
            "activity_blocks": normalize_activity_blocks(t.activity_blocks),
            "children": [build(c, depth + 1) for c in kids],
            "type": t.type,
        }

    roots = [t for t in children_of.get(None, []) if relevant is None or t.id in relevant]
    roots.sort(key=topic_sort_key)
    return [build(t, 0) for t in roots]


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
        return topic_display_title(obj.type, obj.code, obj.title)

    def get_activity_blocks(self, obj):
        return normalize_activity_blocks(obj.activity_blocks)

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
        children_list.sort(key=topic_sort_key)

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
        # Topic.objects.filter, not obj.topics.all(): the related manager reads book_id on every
        # row, which .only() defers, costing one extra query per topic.
        return build_topic_tree(Topic.objects.filter(book_id=obj.id), self.context.get("q", ""))


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

    def validate(self, data):
        """
        Clear activity_blocks for non-activity types.
        Only activity-type topics should have activity_blocks.
        """
        topic_type = data.get('type', 'lesson')

        # For chapters and lessons, clear activity_blocks
        if topic_type in ['chapter', 'lesson']:
            data['activity_blocks'] = []

        return data


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