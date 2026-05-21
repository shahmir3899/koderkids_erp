from rest_framework import serializers
from students.models import Student
from .models import OnlineClassSession, ClassParticipant, ClassRecording


class OnlineClassSessionSerializer(serializers.ModelSerializer):
    teacher_name = serializers.SerializerMethodField()
    school_name = serializers.SerializerMethodField()
    participants_count = serializers.SerializerMethodField()
    time_slot_label = serializers.SerializerMethodField()
    # Write-only list of student PKs; read back as list of ids via source
    selected_student_ids = serializers.PrimaryKeyRelatedField(
        source='selected_students',
        queryset=Student.objects.filter(student_subtype='ONLINE'),
        many=True,
        required=False,
    )

    class Meta:
        model = OnlineClassSession
        fields = [
            'id', 'title', 'description', 'teacher', 'teacher_name',
            'school', 'school_name',
            'time_slot', 'time_slot_label',
            'selected_student_ids',
            'scheduled_at', 'duration_mins',
            'room_name', 'is_recurring', 'recurrence_rule',
            'recording_enabled', 'chat_enabled', 'screenshare_student_allowed',
            'status', 'started_at', 'ended_at', 'participants_count',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['room_name', 'status', 'started_at', 'ended_at', 'created_at', 'updated_at']

    def get_teacher_name(self, obj):
        return obj.teacher.get_full_name() or obj.teacher.username

    def get_school_name(self, obj):
        return obj.school.name if obj.school else ''

    def get_participants_count(self, obj):
        return obj.participants.count()

    def get_time_slot_label(self, obj):
        return obj.time_slot.label if obj.time_slot else None

    def validate(self, attrs):
        time_slot = attrs.get('time_slot')
        # On PATCH school may not be in attrs; fall back to instance value
        school = attrs.get('school') or (self.instance.school if self.instance else None)
        selected_students = attrs.get('selected_students', [])

        if time_slot and school and time_slot.school_id != school.id:
            raise serializers.ValidationError(
                {'time_slot': 'Time slot does not belong to the selected school.'}
            )

        for student in selected_students:
            if student.student_subtype != 'ONLINE':
                raise serializers.ValidationError(
                    {'selected_student_ids': f'Student "{student.name}" is not an ONLINE student.'}
                )
            if school and student.school_id != school.id:
                raise serializers.ValidationError(
                    {'selected_student_ids': f'Student "{student.name}" does not belong to the selected school.'}
                )

        return attrs


class ClassParticipantSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.name', read_only=True)
    student_reg_num = serializers.CharField(source='student.reg_num', read_only=True)

    class Meta:
        model = ClassParticipant
        fields = [
            'id', 'student', 'student_name', 'student_reg_num',
            'joined_at', 'left_at', 'duration_mins', 'attendance_auto_marked',
        ]
        read_only_fields = fields


class ClassRecordingSerializer(serializers.ModelSerializer):
    session_title = serializers.CharField(source='session.title', read_only=True)

    class Meta:
        model = ClassRecording
        fields = ['id', 'session', 'session_title', 'url', 'duration_seconds', 'size_bytes', 'created_at']
        read_only_fields = fields
