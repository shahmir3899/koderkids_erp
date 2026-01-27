"""
AI Gala Supabase Storage Utilities.
Bucket: aigala-projects

Naming convention:
- Project images: projects/{gallery_id}/{student_id}/{timestamp}_{uuid}.{ext}
- Gallery covers: covers/{gallery_id}/{timestamp}_{uuid}.{ext}
"""

import os
import uuid
from datetime import datetime
from supabase import create_client, Client
from django.conf import settings

BUCKET_NAME = 'aigala-projects'


def get_supabase_client() -> Client:
    """Get Supabase client instance using settings."""
    url = getattr(settings, 'SUPABASE_URL', None) or os.environ.get('REACT_APP_SUPABASE_URL')
    key = getattr(settings, 'SUPABASE_KEY', None) or os.environ.get('REACT_APP_SUPABASE_SEC_KEY')

    if not url or not key:
        raise ValueError("Supabase credentials not configured")
    return create_client(url, key)


def upload_project_image(file, gallery_id: int, student_id: int) -> dict:
    """
    Upload a project image to Supabase storage.

    Args:
        file: Django UploadedFile object
        gallery_id: Gallery ID (for organization)
        student_id: Student ID (for organization)

    Returns:
        dict with 'url' and 'path' keys
    """
    client = get_supabase_client()

    # Generate unique filename
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    ext = file.name.split('.')[-1].lower() if '.' in file.name else 'jpg'
    unique_id = uuid.uuid4().hex[:8]
    filename = f"{timestamp}_{unique_id}.{ext}"

    # Path structure: projects/{gallery_id}/{student_id}/{filename}
    path = f"projects/{gallery_id}/{student_id}/{filename}"

    # Read file content
    file_content = file.read()

    # Get content type
    content_type = getattr(file, 'content_type', None) or 'image/jpeg'

    # Map extensions to content types
    content_type_map = {
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
    }
    if ext in content_type_map:
        content_type = content_type_map[ext]

    # Upload to Supabase
    result = client.storage.from_(BUCKET_NAME).upload(
        path=path,
        file=file_content,
        file_options={"content-type": content_type, "upsert": "true"}
    )

    # Get public URL
    public_url = client.storage.from_(BUCKET_NAME).get_public_url(path)

    return {
        'url': public_url,
        'path': path,
        'filename': filename
    }


def upload_gallery_cover(file, gallery_id: int) -> dict:
    """
    Upload a gallery cover image to Supabase storage.

    Args:
        file: Django UploadedFile object
        gallery_id: Gallery ID

    Returns:
        dict with 'url' and 'path' keys
    """
    client = get_supabase_client()

    # Generate unique filename
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    ext = file.name.split('.')[-1].lower() if '.' in file.name else 'jpg'
    unique_id = uuid.uuid4().hex[:8]
    filename = f"{timestamp}_{unique_id}.{ext}"

    # Path structure: covers/{gallery_id}/{filename}
    path = f"covers/{gallery_id}/{filename}"

    # Read file content
    file_content = file.read()

    # Get content type
    content_type = getattr(file, 'content_type', None) or 'image/jpeg'

    # Upload to Supabase
    result = client.storage.from_(BUCKET_NAME).upload(
        path=path,
        file=file_content,
        file_options={"content-type": content_type, "upsert": "true"}
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
        True if successful, False otherwise
    """
    try:
        client = get_supabase_client()
        client.storage.from_(BUCKET_NAME).remove([path])
        return True
    except Exception as e:
        print(f"Error deleting image {path}: {e}")
        return False


def upload_image_from_url(image_url: str, gallery_id: int, student_id: int) -> dict:
    """
    Download an image from URL and upload to Supabase.
    Useful for AI-generated images from external services.

    Args:
        image_url: URL of the image to download
        gallery_id: Gallery ID
        student_id: Student ID

    Returns:
        dict with 'url' and 'path' keys
    """
    import requests

    client = get_supabase_client()

    # Download the image
    response = requests.get(image_url, timeout=30)
    response.raise_for_status()

    # Determine extension from content-type
    content_type = response.headers.get('content-type', 'image/jpeg')
    ext_map = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp',
    }
    ext = ext_map.get(content_type, 'jpg')

    # Generate unique filename
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    unique_id = uuid.uuid4().hex[:8]
    filename = f"{timestamp}_{unique_id}.{ext}"

    # Path structure
    path = f"projects/{gallery_id}/{student_id}/{filename}"

    # Upload to Supabase
    result = client.storage.from_(BUCKET_NAME).upload(
        path=path,
        file=response.content,
        file_options={"content-type": content_type, "upsert": "true"}
    )

    # Get public URL
    public_url = client.storage.from_(BUCKET_NAME).get_public_url(path)

    return {
        'url': public_url,
        'path': path,
        'filename': filename
    }
