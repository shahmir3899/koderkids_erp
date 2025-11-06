from django.shortcuts import render

# Create your views here.
# books/views.py
from rest_framework.viewsets import ReadOnlyModelViewSet
from .models import Book
from .serializers import BookSerializer
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from django.core.files.storage import default_storage
import csv
import chardet


class BookViewSet(ReadOnlyModelViewSet):
    queryset = Book.objects.prefetch_related("topics__children")
    serializer_class = BookSerializer
    permission_classes = [IsAuthenticated]


@api_view(['POST'])
@permission_classes([IsAuthenticated]) 
def upload_csv(request):
    if 'csv_file' not in request.FILES:
        return Response({"error": "No file"}, status=400)

    file = request.FILES['csv_file']
    path = default_storage.save('tmp/' + file.name, file)
    full_path = default_storage.path(path)

    # Auto-detect encoding
    with open(full_path, 'rb') as f:
        raw = f.read(10000)
        encoding = chardet.detect(raw)['encoding'] or 'utf-8'

    # Reuse your import logic
    from books.management.commands.import_books import Command
    cmd = Command()
    cmd.handle(csv_file=full_path)

    return Response({"success": "Imported!"}, status=200)