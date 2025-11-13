# books/serializers.py
from rest_framework import serializers
from .models import Book, Topic
from django.db.models import Q

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

        child_context = self.context.copy()
        child_context["depth"] = depth + 1

        return TopicSerializer(children_qs, many=True, context=child_context).data

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
        fields = ["id", "title", "isbn", "school", "cover", "topics"]

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