# books/views.py
from rest_framework.viewsets import ReadOnlyModelViewSet
from .models import Book, Topic
from .serializers import BookSerializer, BookListSerializer
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from django.core.files.storage import default_storage
import csv
import chardet
from django.db.models import Prefetch


class BookViewSet(ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    lookup_field = 'id'  # ← ADD THIS LINE (explicitly use primary key)

    def get_queryset(self):
        """
        List: Only book metadata
        Detail: Full topic tree with prefetch
        """
        if self.action == 'list':
            # Lightweight: no topics loaded
            return Book.objects.only("id", "title", "isbn", "school_id", "cover")
        else:
            # Detail: full hierarchy, N+1 safe
            return Book.objects.prefetch_related(self.get_full_topic_prefetch())

    def get_full_topic_prefetch(self):
        """
        Prefetch topic tree up to depth 3
        """
        level_3 = Topic.objects.only("id", "code", "title", "type", "parent_id", "activity_blocks")
        level_2 = Topic.objects.prefetch_related(Prefetch("children", queryset=level_3))
        level_1 = Topic.objects.prefetch_related(Prefetch("children", queryset=level_2))
        return Prefetch(
            "topics",
            queryset=Topic.objects.prefetch_related(Prefetch("children", queryset=level_1))
        )

    def get_serializer_class(self):
        """
        Use lightweight serializer for list
        """
        if self.action == 'list':
            return BookListSerializer
        return BookSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        context["q"] = self.request.query_params.get("q", "")
        return context
    
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def upload_csv(request):
    if "csv_file" not in request.FILES:
        return Response({"error": "No file"}, status=400)

    file = request.FILES["csv_file"]
    path = default_storage.save("tmp/" + file.name, file)
    full_path = default_storage.path(path)

    # Auto-detect encoding
    with open(full_path, "rb") as f:
        raw = f.read(10000)
        encoding = chardet.detect(raw)["encoding"] or "utf-8"

    # Reuse your import logic
    from books.management.commands.import_books import Command

    cmd = Command()
    cmd.handle(csv_file=full_path)

    return Response({"success": "Imported!"}, status=200)