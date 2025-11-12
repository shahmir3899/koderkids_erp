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

    # ------------------------------------------------------------------ #
    # 1. Display title
    # ------------------------------------------------------------------ #
    def get_display_title(self, obj):
        if obj.type == "chapter":
            title = obj.title
            # Strip leading number: "1 Chapter 1: ..." → "Chapter 1: ..."
            parts = title.split(" ", 1)
            if parts and parts[0].isdigit():
                title = parts[1]
            return title
        if obj.type == "activity":
            return obj.title
        return f"{obj.code} {obj.title}".strip()

    # ------------------------------------------------------------------ #
    # 2. Activity blocks
    # ------------------------------------------------------------------ #
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

    # ------------------------------------------------------------------ #
    # 3. Children – **depth-controlled** and **lightweight**
    # ------------------------------------------------------------------ #
    def get_children(self, obj):
        # Stop recursion after 3 levels (chapter → lesson → activity)
        depth = self.context.get("depth", 0)
        if depth >= 3:
            return []

        q = self.context.get("q", "").lower()
        children_qs = obj.get_children().only("id", "code", "title", "type", "parent_id")

        if q:
            children_qs = children_qs.filter(
                Q(title__icontains=q) | Q(code__icontains=q)
            )

        # Pass increased depth to nested calls
        child_context = self.context.copy()
        child_context["depth"] = depth + 1

        return TopicSerializer(
            children_qs, many=True, context=child_context
        ).data


class BookSerializer(serializers.ModelSerializer):
    topics = serializers.SerializerMethodField()

    class Meta:
        model = Book
        fields = ["id", "title", "isbn", "school", "cover", "topics"]

    def get_topics(self, obj):
        q = self.context.get("q", "").lower()
        root_qs = obj.topics.filter(parent=None).only(
            "id", "code", "title", "type", "book_id"
        )

        if q:
            # Find matching topics + all their ancestors
            matching = obj.topics.filter(
                Q(title__icontains=q) | Q(code__icontains=q)
            )
            ancestor_ids = set()
            for t in matching:
                ancestor_ids.update(
                    t.get_ancestors(include_self=True).values_list("id", flat=True)
                )
            root_qs = root_qs.filter(id__in=ancestor_ids)

        # Start depth counter at 0
        ctx = self.context.copy()
        ctx["depth"] = 0
        return TopicSerializer(root_qs, many=True, context=ctx).data