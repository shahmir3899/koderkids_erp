import logging

from django.conf import settings
from supabase import create_client

logger = logging.getLogger(__name__)

STUDENT_IMAGES_BUCKET = "student-images"


def fetch_progress_images_for_student(student_id, month):
    """
    List a student's activity/progress images from Supabase Storage for a given
    month (YYYY-MM), returning signed URLs.

    Mirrors reports.views.get_student_progress_images' logic (same bucket, same
    month-prefix filtering, same 7-day signed URL expiry) so callers get an
    identical {"progress_images": [...]} shape. Kept here as a shared helper so
    new self-scoped endpoints don't have to duplicate this listing/signing logic.
    """
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    folder_path = f"{student_id}/"

    response = supabase.storage.from_(STUDENT_IMAGES_BUCKET).list(folder_path)

    if isinstance(response, dict) and "error" in response:
        logger.error(f"Supabase error listing images for student {student_id}: {response}")
        return None

    if not response:
        return []

    matching_files = [file for file in response if file.get("name", "").startswith(month)]
    if not matching_files:
        return []

    matching_images = []
    for file in matching_files:
        try:
            signed_url = supabase.storage.from_(STUDENT_IMAGES_BUCKET).create_signed_url(
                f"{folder_path}{file['name']}", 604800
            )
            matching_images.append(signed_url)
        except Exception as url_error:
            logger.error(f"Error creating signed URL for {file['name']}: {url_error}")

    return matching_images
