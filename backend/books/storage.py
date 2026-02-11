# books/storage.py
"""
Supabase Storage utility for book assets.
Bucket: book-assets

Naming convention:
- Topic images: topics/{book_id}/{topic_id}/{timestamp}_{filename}
- Cover images: covers/{book_id}/{timestamp}_{filename}
"""

import os
import uuid
from datetime import datetime
from supabase import create_client, Client
from django.conf import settings

BUCKET_NAME = 'book-assets'


def get_supabase_client() -> Client:
    """Get Supabase client instance using settings."""
    url = getattr(settings, 'SUPABASE_URL', None) or os.environ.get('REACT_APP_SUPABASE_URL')
    key = getattr(settings, 'SUPABASE_KEY', None) or os.environ.get('REACT_APP_SUPABASE_SEC_KEY')
    if not url or not key:
        raise ValueError("Supabase credentials not configured")
    return create_client(url, key)


def upload_topic_image(file, book_id: int, topic_id: str) -> dict:
    """
    Upload an image for a topic to Supabase storage.

    Args:
        file: Django UploadedFile object
        book_id: Book ID (for organization)
        topic_id: Topic ID or 'new' for new topics

    Returns:
        dict with 'url' and 'path' keys
    """
    client = get_supabase_client()

    # Generate unique filename
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    ext = file.name.split('.')[-1].lower() if '.' in file.name else 'jpg'
    unique_id = uuid.uuid4().hex[:8]
    filename = f"{timestamp}_{unique_id}.{ext}"

    # Path structure: topics/{book_id}/{topic_id}/{filename}
    path = f"topics/{book_id}/{topic_id}/{filename}"

    # Read file content
    file_content = file.read()

    # Get content type
    content_type = file.content_type or 'image/jpeg'

    # Upload to Supabase
    result = client.storage.from_(BUCKET_NAME).upload(
        path=path,
        file=file_content,
        file_options={"content-type": content_type}
    )

    # Get public URL
    public_url = client.storage.from_(BUCKET_NAME).get_public_url(path)

    return {
        'url': public_url,
        'path': path,
        'filename': filename
    }


def upload_book_cover(file, book_id: int) -> dict:
    """
    Upload a book cover image to Supabase storage.

    Args:
        file: Django UploadedFile object
        book_id: Book ID

    Returns:
        dict with 'url' and 'path' keys
    """
    client = get_supabase_client()

    # Generate unique filename
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    ext = file.name.split('.')[-1].lower() if '.' in file.name else 'jpg'
    unique_id = uuid.uuid4().hex[:8]
    filename = f"{timestamp}_{unique_id}.{ext}"

    # Path structure: covers/{book_id}/{filename}
    path = f"covers/{book_id}/{filename}"

    # Read file content
    file_content = file.read()

    # Get content type
    content_type = file.content_type or 'image/jpeg'

    # Upload to Supabase
    result = client.storage.from_(BUCKET_NAME).upload(
        path=path,
        file=file_content,
        file_options={"content-type": content_type}
    )

    # Get public URL
    public_url = client.storage.from_(BUCKET_NAME).get_public_url(path)

    return {
        'url': public_url,
        'path': path,
        'filename': filename
    }


def delete_image(path: str) -> bool:
    """
    Delete an image from Supabase storage.

    Args:
        path: Storage path of the image

    Returns:
        True if successful
    """
    try:
        client = get_supabase_client()
        client.storage.from_(BUCKET_NAME).remove([path])
        return True
    except Exception:
        return False
