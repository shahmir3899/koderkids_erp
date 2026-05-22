from django.db import models


class OnlineTimeSlotLessonPlan(models.Model):
	"""
	Lesson planning for ONLINE flows keyed by school + time slot + session date.
	This is separate from class-based LessonPlan used by ONSITE flows.
	"""

	session_date = models.DateField()
	teacher = models.ForeignKey('students.CustomUser', on_delete=models.CASCADE)
	school = models.ForeignKey('students.School', on_delete=models.CASCADE)
	time_slot = models.ForeignKey('students.TimeSlot', on_delete=models.CASCADE, related_name='online_lesson_plans')
	planned_topic = models.TextField(blank=True, null=True)
	planned_topics = models.ManyToManyField('books.Topic', blank=True, related_name='planned_online_lessons')
	achieved_topic = models.TextField(blank=True, null=True)
	created_at = models.DateTimeField(auto_now_add=True)
	updated_at = models.DateTimeField(auto_now=True)

	class Meta:
		unique_together = (
			('session_date', 'teacher', 'school', 'time_slot'),
		)

	def __str__(self):
		return f"Online plan {self.session_date} - {self.school_id} - slot {self.time_slot_id}"
