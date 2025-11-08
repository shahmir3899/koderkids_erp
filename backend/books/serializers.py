# books/serializers.py
from rest_framework import serializers
from .models import Book, Topic


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
        return TopicSerializer(obj.get_children(), many=True, context=self.context).data


class BookSerializer(serializers.ModelSerializer):
    topics = TopicSerializer(many=True)

    class Meta:
        model = Book
        fields = ["id", "title", "isbn", "school", "cover", "topics"]