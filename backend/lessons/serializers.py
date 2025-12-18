from rest_framework import serializers
from students.models import LessonPlan
from books.models import Topic


class LessonPlanSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source='teacher.username', read_only=True)
    school_name = serializers.CharField(source='school.name', read_only=True)
    
    planned_topic_ids = serializers.ListField(
        child=serializers.IntegerField(), 
        write_only=True, 
        required=False, 
        allow_empty=True
    )
    
    # NOW WRITABLE: Teacher can edit directly
    planned_topic = serializers.CharField(
        allow_blank=True, 
        required=False,
        default=""
    )

    class Meta:
        model = LessonPlan
        fields = [
            'id', 'session_date', 'teacher', 'teacher_name',
            'school', 'school_name', 'student_class',
            'planned_topic', 'planned_topic_ids', 'achieved_topic'
        ]
        read_only_fields = ['teacher_name', 'school_name']

    def validate_planned_topic_ids(self, value):
        if value:
            invalid = [tid for tid in value if not Topic.objects.filter(pk=tid).exists()]
            if invalid:
                raise serializers.ValidationError(f"Invalid topic IDs: {invalid}")
        return value

    def create(self, validated_data):
        planned_topic_ids = validated_data.pop('planned_topic_ids', [])
        manual_topic = validated_data.pop('planned_topic', '').strip()

        instance = super().create(validated_data)

        # 1. Set M2M if IDs provided
        if planned_topic_ids:
            topics = Topic.objects.filter(pk__in=planned_topic_ids)
            instance.planned_topics.set(topics)
            computed = self._format_from_topics(topics)
            instance.planned_topic = manual_topic or computed
        else:
            instance.planned_topic = manual_topic

        instance.save(update_fields=['planned_topic'])
        return instance

    def update(self, instance, validated_data):
        planned_topic_ids = validated_data.pop('planned_topic_ids', None)
        manual_topic = validated_data.pop('planned_topic', None)

        instance = super().update(instance, validated_data)

        # 1. If IDs provided → recompute
        if planned_topic_ids is not None:
            topics = Topic.objects.filter(pk__in=planned_topic_ids)
            instance.planned_topics.set(topics)
            computed = self._format_from_topics(topics)
            instance.planned_topic = manual_topic or computed
        # 2. If manual text provided → use it
        elif manual_topic is not None:
            instance.planned_topic = manual_topic.strip()

        instance.save(update_fields=['planned_topic'])
        return instance

    def _format_from_topics(self, topics):
        if not topics:
            return ""
        # Reuse your original formatting logic
        groups = {}
        for topic in topics:
            book = topic.book or (topic.parent.book if topic.parent else None)
            book_title = getattr(book, "title", "Unknown Book") or "Unknown Book"
            chapter = topic.parent if topic.parent and topic.parent.type == "chapter" else None
            chapter_code = chapter.code.strip() if chapter else ""
            chapter_key = (book_title, chapter_code)
            if chapter_key not in groups:
                groups[chapter_key] = []
            groups[chapter_key].append(topic)

        lines = []
        for (book_title, chapter_code), topic_list in groups.items():
            lines.append(book_title)
            if chapter_code:
                lines.append(f"Chapter {chapter_code}")
            for topic in topic_list:
                raw_code = topic.code.strip()
                short_code = ".".join(raw_code.split(".", 2)[:2]) if raw_code else ""
                title = topic.title.strip()
                topic_line = f"{short_code} {title}".strip() or title or "Unnamed Topic"
                lines.append(f"• {topic_line}")
            lines.append("")

        if lines and not lines[-1].strip():
            lines.pop()
        return "\n".join(lines)
