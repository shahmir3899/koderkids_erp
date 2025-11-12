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
    def get_display_title(self, obj):
        if obj.type == 'chapter':
            # Remove leading number: "1 Chapter 1: ..." → "Chapter 1: ..."
            title = obj.title
            if title and title[0].isdigit():
                title = title.split(" ", 1)[1]  # Remove first word if digit
            return title
        elif obj.type == 'activity':
            return obj.title  # Already has "Class Activity 1 – ..."
        else:
            return f"{obj.code} {obj.title}"  # Lesson: 1.1 Title
        
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

    def get_activity_blocks(self, obj):
        blocks = obj.activity_blocks or []
        if isinstance(blocks, dict):
            blocks = [blocks]

        # Normalize missing fields
        normalized = []
        for i, block in enumerate(blocks):
            normalized.append({
                "type": block.get("type", "class"),
                "title": block.get("title", f"{block.get('type', 'Activity').capitalize()} Activity"),
                "content": block.get("content", ""),
                "order": block.get("order", i)
            })
        return ActivityBlockSerializer(normalized, many=True).data

    def get_children(self, obj):
        q = self.context.get('q', '').lower()
        children = obj.get_children()
        if q:
            children = children.filter(
                Q(title__icontains=q) | Q(code__icontains=q) | Q(display_title__icontains=q)
            )
        return TopicSerializer(children, many=True, context=self.context).data


class BookSerializer(serializers.ModelSerializer):
    topics = serializers.SerializerMethodField()

    class Meta:
        model = Book
        fields = ["id", "title", "isbn", "school", "cover", "topics"]

    def get_topics(self, obj):
        q = self.context.get('q', '').lower()
        root_topics = obj.topics.filter(parent=None)
        if q:
            # Find all topics matching query
            matching_topics = obj.topics.filter(
                Q(title__icontains=q) | Q(code__icontains=q)
            )
            # Include ancestors to preserve tree structure
            ancestor_ids = set()
            for topic in matching_topics:
                ancestor_ids.update(topic.get_ancestors(include_self=True).values_list('id', flat=True))
            root_topics = root_topics.filter(id__in=ancestor_ids)
        return TopicSerializer(root_topics, many=True, context=self.context).data

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation['topics'] = self.get_topics(instance)
        return representation