# Create your models here.
# books/models.py
from django.db import models
from mptt.models import MPTTModel, TreeForeignKey
from students.models import School   # adjust import as needed


class Book(models.Model):
    title = models.CharField(max_length=200)
    isbn = models.CharField(max_length=13, blank=True, null=True, unique=True)
    school = models.ForeignKey(School, on_delete=models.SET_NULL, null=True, blank=True)
    cover = models.ImageField(upload_to="books/covers/", blank=True)

    class Meta:
        unique_together = ('title', 'school')

    def __str__(self):
        return self.title


class Topic(MPTTModel):
    """
    Hierarchical node: Chapter → Section → Topic
    """
    book = models.ForeignKey(Book, on_delete=models.CASCADE, related_name="topics")
    parent = TreeForeignKey(
        "self", on_delete=models.CASCADE, null=True, blank=True, related_name="children"
    )
    code = models.CharField(max_length=20, blank=True)          # e.g. "1.1"
    title = models.CharField(max_length=250)                    # e.g. "Introduction to Fractions"

    # JSON array of activity blocks
    activity_blocks = models.JSONField(default=list, blank=True)
    # Example value:
    # [
    #   {"type": "class", "title": "Class Activity 1", "content": "<p>Discuss...</p>", "order": 0},
    #   {"type": "home",  "title": "Home Activity 1",  "content": "<p>Worksheet...</p>", "order": 1}
    # ]

    class MPTTMeta:
        order_insertion_by = ["code"]

    def __str__(self):
        return f"{self.book} – {self.code or ''} {self.title}".strip()