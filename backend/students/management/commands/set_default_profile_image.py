"""
Management command to set a default profile image for all students.

This script will:
1. Upload the provided image to Supabase storage (once)
2. Update all Student records to use this image URL
3. Optionally update the CustomUser profile_photo_url as well

Usage:
    python manage.py set_default_profile_image --image "path/to/image.png"
    python manage.py set_default_profile_image --image "path/to/image.png" --dry-run
    python manage.py set_default_profile_image --image "path/to/image.png" --school-id 5
    python manage.py set_default_profile_image --image "path/to/image.png" --only-empty
"""

import os
import logging
from datetime import datetime
from django.core.management.base import BaseCommand
from django.conf import settings
from django.db import transaction
from supabase import create_client

# Set up logging
logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Set a default profile image for all students (or a subset)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--image',
            type=str,
            required=True,
            help='Path to the image file to use as default profile photo'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be updated without making changes'
        )
        parser.add_argument(
            '--school-id',
            type=int,
            help='Only update students from this school ID'
        )
        parser.add_argument(
            '--only-empty',
            action='store_true',
            help='Only update students who do not have a profile photo'
        )
        parser.add_argument(
            '--update-user',
            action='store_true',
            help='Also update the CustomUser.profile_photo_url for linked users'
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=100,
            help='Number of records to update per batch (default: 100)'
        )

    def log_info(self, message):
        """Log info message with timestamp"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        self.stdout.write(f"[{timestamp}] INFO: {message}")
        logger.info(message)

    def log_success(self, message):
        """Log success message with timestamp"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        self.stdout.write(self.style.SUCCESS(f"[{timestamp}] SUCCESS: {message}"))
        logger.info(message)

    def log_warning(self, message):
        """Log warning message with timestamp"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        self.stdout.write(self.style.WARNING(f"[{timestamp}] WARNING: {message}"))
        logger.warning(message)

    def log_error(self, message):
        """Log error message with timestamp"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        self.stdout.write(self.style.ERROR(f"[{timestamp}] ERROR: {message}"))
        logger.error(message)

    def handle(self, *args, **options):
        image_path = options['image']
        dry_run = options['dry_run']
        school_id = options.get('school_id')
        only_empty = options['only_empty']
        update_user = options['update_user']
        batch_size = options['batch_size']

        self.stdout.write("")
        self.stdout.write("=" * 70)
        self.log_info("STARTING: Set Default Profile Image for Students")
        self.stdout.write("=" * 70)

        # Log configuration
        self.log_info(f"Image path: {image_path}")
        self.log_info(f"Dry run: {dry_run}")
        self.log_info(f"School ID filter: {school_id or 'All schools'}")
        self.log_info(f"Only empty profiles: {only_empty}")
        self.log_info(f"Update user table: {update_user}")
        self.log_info(f"Batch size: {batch_size}")
        self.stdout.write("-" * 70)

        # Step 1: Validate image file exists
        self.log_info("Step 1: Validating image file...")
        if not os.path.exists(image_path):
            self.log_error(f"Image file not found: {image_path}")
            return

        file_size = os.path.getsize(image_path)
        file_ext = os.path.splitext(image_path)[1].lower()
        self.log_success(f"Image file found: {image_path}")
        self.log_info(f"  - File size: {file_size / 1024:.2f} KB")
        self.log_info(f"  - File extension: {file_ext}")

        # Validate file type
        allowed_extensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp']
        if file_ext not in allowed_extensions:
            self.log_error(f"Invalid file type. Allowed: {allowed_extensions}")
            return

        # Step 2: Initialize Supabase client
        self.log_info("Step 2: Initializing Supabase client...")
        try:
            supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
            self.log_success("Supabase client initialized")
        except Exception as e:
            self.log_error(f"Failed to initialize Supabase: {str(e)}")
            return

        # Step 3: Upload image to Supabase (if not dry run)
        bucket_name = "profile-photos"
        remote_filename = f"defaults/student-default{file_ext}"
        image_url = None

        self.log_info("Step 3: Uploading image to Supabase...")
        self.log_info(f"  - Bucket: {bucket_name}")
        self.log_info(f"  - Remote path: {remote_filename}")

        if dry_run:
            self.log_warning("DRY RUN: Skipping actual upload")
            # Generate a fake URL for dry run display
            image_url = f"{settings.SUPABASE_URL}/storage/v1/object/public/{bucket_name}/{remote_filename}"
            self.log_info(f"  - Would upload to: {image_url}")
        else:
            try:
                # Read the image file
                with open(image_path, 'rb') as f:
                    file_data = f.read()

                self.log_info(f"  - Read {len(file_data)} bytes from file")

                # Try to delete existing file first (in case it exists)
                try:
                    supabase.storage.from_(bucket_name).remove([remote_filename])
                    self.log_info("  - Removed existing file (if any)")
                except Exception:
                    pass  # File might not exist, that's OK

                # Upload the file
                content_type = {
                    '.png': 'image/png',
                    '.jpg': 'image/jpeg',
                    '.jpeg': 'image/jpeg',
                    '.gif': 'image/gif',
                    '.webp': 'image/webp'
                }.get(file_ext, 'image/png')

                upload_result = supabase.storage.from_(bucket_name).upload(
                    remote_filename,
                    file_data,
                    file_options={"content-type": content_type}
                )

                self.log_info(f"  - Upload result: {upload_result}")

                # Get public URL
                public_url_result = supabase.storage.from_(bucket_name).get_public_url(remote_filename)
                image_url = public_url_result

                self.log_success(f"Image uploaded successfully!")
                self.log_info(f"  - Public URL: {image_url}")

            except Exception as e:
                self.log_error(f"Failed to upload image: {str(e)}")

                # Try to get existing URL if upload failed due to duplicate
                try:
                    image_url = supabase.storage.from_(bucket_name).get_public_url(remote_filename)
                    self.log_warning(f"Using existing image URL: {image_url}")
                except Exception:
                    self.log_error("Could not retrieve existing image URL either")
                    return

        if not image_url:
            self.log_error("No image URL available. Aborting.")
            return

        # Step 4: Query students to update
        self.log_info("Step 4: Querying students to update...")

        from students.models import Student, CustomUser

        queryset = Student.objects.all()

        if school_id:
            queryset = queryset.filter(school_id=school_id)
            self.log_info(f"  - Filtering by school ID: {school_id}")

        if only_empty:
            queryset = queryset.filter(
                profile_photo_url__isnull=True
            ) | queryset.filter(
                profile_photo_url=''
            )
            self.log_info("  - Filtering to only students without profile photos")

        total_students = queryset.count()
        self.log_success(f"Found {total_students} students to update")

        if total_students == 0:
            self.log_warning("No students match the criteria. Nothing to update.")
            return

        # Step 5: Show sample of students to be updated
        self.log_info("Step 5: Sample of students to be updated (first 10):")
        sample_students = queryset[:10]
        for student in sample_students:
            current_photo = student.profile_photo_url or "(none)"
            if len(current_photo) > 50:
                current_photo = current_photo[:50] + "..."
            self.log_info(f"  - ID:{student.id} | {student.name} | School:{student.school.name} | Current:{current_photo}")

        if total_students > 10:
            self.log_info(f"  ... and {total_students - 10} more students")

        # Step 6: Update students
        self.stdout.write("-" * 70)
        self.log_info("Step 6: Updating student records...")

        if dry_run:
            self.log_warning("DRY RUN: No changes will be made")
            self.log_info(f"  - Would update {total_students} Student.profile_photo_url fields")
            if update_user:
                users_count = queryset.filter(user__isnull=False).count()
                self.log_info(f"  - Would update {users_count} CustomUser.profile_photo_url fields")
        else:
            updated_students = 0
            updated_users = 0
            failed_updates = 0

            # Process in batches
            student_ids = list(queryset.values_list('id', flat=True))
            total_batches = (len(student_ids) + batch_size - 1) // batch_size

            self.log_info(f"Processing {total_batches} batches of {batch_size} records each...")

            for batch_num in range(total_batches):
                start_idx = batch_num * batch_size
                end_idx = min(start_idx + batch_size, len(student_ids))
                batch_ids = student_ids[start_idx:end_idx]

                try:
                    with transaction.atomic():
                        # Update Student records
                        batch_updated = Student.objects.filter(id__in=batch_ids).update(
                            profile_photo_url=image_url
                        )
                        updated_students += batch_updated

                        # Update User records if requested
                        if update_user:
                            user_ids = Student.objects.filter(
                                id__in=batch_ids,
                                user__isnull=False
                            ).values_list('user_id', flat=True)

                            if user_ids:
                                users_updated = CustomUser.objects.filter(id__in=user_ids).update(
                                    profile_photo_url=image_url
                                )
                                updated_users += users_updated

                    self.log_info(f"  Batch {batch_num + 1}/{total_batches}: Updated {batch_updated} students")

                except Exception as e:
                    self.log_error(f"  Batch {batch_num + 1}/{total_batches}: FAILED - {str(e)}")
                    failed_updates += len(batch_ids)

            self.stdout.write("-" * 70)
            self.log_success(f"Updated {updated_students} Student records")
            if update_user:
                self.log_success(f"Updated {updated_users} CustomUser records")
            if failed_updates > 0:
                self.log_error(f"Failed to update {failed_updates} records")

        # Step 7: Verification (if not dry run)
        if not dry_run:
            self.log_info("Step 7: Verifying updates...")

            verified_count = Student.objects.filter(profile_photo_url=image_url).count()
            self.log_info(f"  - Students with new profile URL: {verified_count}")

            # Show sample of updated records
            sample_updated = Student.objects.filter(profile_photo_url=image_url)[:5]
            self.log_info("  - Sample of updated students:")
            for student in sample_updated:
                self.log_info(f"    ID:{student.id} | {student.name} | URL set ✓")

        # Final summary
        self.stdout.write("=" * 70)
        self.log_success("COMPLETED: Set Default Profile Image")
        self.stdout.write("=" * 70)
        self.log_info(f"Image URL: {image_url}")
        self.log_info(f"Total students processed: {total_students}")
        if dry_run:
            self.log_warning("This was a DRY RUN - no changes were made")
            self.log_info("Run without --dry-run to apply changes")
        self.stdout.write("")
