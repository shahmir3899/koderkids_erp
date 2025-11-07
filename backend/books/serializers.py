# books/serializers.py
from rest_framework import serializers
from .models import Book, Topic


class ActivityBlockSerializer(serializers.Serializer):
    type = serializers.CharField()
    title = serializers.CharField()
    content = serializers.CharField()
    order = serializers.IntegerField()


class TopicSerializer(serializers.ModelSerializer):
    activity_blocks = ActivityBlockSerializer(many=True, read_only=True)
    children = serializers.SerializerMethodField()

    class Meta:
        model = Topic
        fields = [
            "id",
            "code",
            "title",
            "activity_blocks",
            "children",
            "type",   # This is correct — Topic HAS type
        ]

    def get_children(self, obj):
        return TopicSerializer(obj.get_children(), many=True, context=self.context).data


class BookSerializer(serializers.ModelSerializer):
    topics = TopicSerializer(many=True)

    class Meta:
        model = Book
        fields = ["id", "title", "isbn", "school", "cover", "topics", ]