"""
Script to check student image counts from Supabase storage.
Run from backend directory: python check_student_images.py

Usage:
  python check_student_images.py --school_id 4 --class "1 (B)" --month 2026-01
  python check_student_images.py --all --year 2026
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'school_management.settings')
django.setup()

from django.conf import settings
from supabase import create_client
from students.models import Student, School
import argparse


def check_images(school_id, student_class, month=None):
    """Check image counts for students in a school/class."""

    # Initialize Supabase client
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    # Use student-images bucket (NOT settings.SUPABASE_BUCKET which is for profile photos)
    bucket_name = "student-images"

    print(f"\n{'='*60}")
    print(f"Checking images for School ID: {school_id}, Class: {student_class}")
    if month:
        print(f"Filtering by month: {month}")
    print(f"Supabase Bucket: {bucket_name}")
    print(f"{'='*60}\n")

    # Get students
    students = Student.objects.filter(
        school_id=school_id,
        student_class=student_class,
        status="Active"
    ).order_by('name')

    print(f"Found {students.count()} active students\n")

    total_images = 0
    students_with_images = 0

    print(f"{'ID':<8} {'Name':<30} {'Images':<10} {'Details'}")
    print("-" * 70)

    for student in students:
        folder_path = f"{student.id}/"

        try:
            # List files in student's folder
            response = supabase.storage.from_(bucket_name).list(folder_path)

            if isinstance(response, dict) and "error" in response:
                print(f"{student.id:<8} {student.name[:28]:<30} {'ERROR':<10} {response.get('error', {}).get('message', 'Unknown error')}")
                continue

            # Filter by month if specified
            if month and response:
                filtered = [f for f in response if f.get("name", "").startswith(month)]
                image_count = len(filtered)
                file_names = [f.get("name") for f in filtered[:3]]  # Show first 3
            else:
                image_count = len(response) if response else 0
                file_names = [f.get("name") for f in (response or [])[:3]]

            if image_count > 0:
                students_with_images += 1
                total_images += image_count

            details = ", ".join(file_names) if file_names else "-"
            if len(file_names) < image_count:
                details += f" (+{image_count - len(file_names)} more)"

            print(f"{student.id:<8} {student.name[:28]:<30} {image_count:<10} {details[:40]}")

        except Exception as e:
            print(f"{student.id:<8} {student.name[:28]:<30} {'ERROR':<10} {str(e)[:40]}")

    print("-" * 70)
    print(f"\nSummary:")
    print(f"  Total Students: {students.count()}")
    print(f"  Students with Images: {students_with_images}")
    print(f"  Total Images: {total_images}")
    print(f"  Average Images/Student: {total_images/students.count():.1f}" if students.count() > 0 else "  N/A")


def check_all_students_for_year(year):
    """Loop through ALL students and find images for a specific year."""

    # Initialize Supabase client
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
    bucket_name = "student-images"

    print(f"\n{'='*70}")
    print(f"Searching ALL students for images in year: {year}")
    print(f"Supabase Bucket: {bucket_name}")
    print(f"{'='*70}\n")

    # Get ALL active students
    students = Student.objects.filter(status="Active").select_related('school').order_by('school__name', 'name')

    print(f"Total active students to check: {students.count()}\n")

    students_with_images = []
    checked = 0

    for student in students:
        checked += 1
        if checked % 50 == 0:
            print(f"  Checked {checked}/{students.count()} students...")

        folder_path = f"{student.id}/"

        try:
            response = supabase.storage.from_(bucket_name).list(folder_path)

            if isinstance(response, dict) and "error" in response:
                continue

            if not response:
                continue

            # Filter by year (files starting with YYYY-)
            year_images = [f for f in response if f.get("name", "").startswith(f"{year}-")]

            if year_images:
                students_with_images.append({
                    'id': student.id,
                    'name': student.name,
                    'school': student.school.name if student.school else 'N/A',
                    'class': student.student_class,
                    'image_count': len(year_images),
                    'files': [f.get("name") for f in year_images]
                })

        except Exception as e:
            pass  # Skip errors silently

    print(f"\n{'='*70}")
    print(f"RESULTS: Students with images in {year}")
    print(f"{'='*70}\n")

    if not students_with_images:
        print(f"  No students found with images for year {year}")
    else:
        print(f"{'ID':<8} {'Name':<25} {'School':<25} {'Class':<10} {'Images':<8}")
        print("-" * 80)

        total_images = 0
        for s in students_with_images:
            print(f"{s['id']:<8} {s['name'][:23]:<25} {s['school'][:23]:<25} {s['class'][:8]:<10} {s['image_count']:<8}")
            total_images += s['image_count']

            # Show file names
            for f in s['files'][:5]:
                print(f"         -> {f}")
            if len(s['files']) > 5:
                print(f"         ... and {len(s['files']) - 5} more")
            print()

        print("-" * 80)
        print(f"\nSummary:")
        print(f"  Students checked: {students.count()}")
        print(f"  Students with {year} images: {len(students_with_images)}")
        print(f"  Total images for {year}: {total_images}")


def list_all_buckets():
    """List all available buckets."""
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

    print("\nAvailable Buckets:")
    print("-" * 40)
    try:
        buckets = supabase.storage.list_buckets()
        for bucket in buckets:
            print(f"  - {bucket.name} (public: {bucket.public})")
    except Exception as e:
        print(f"  Error listing buckets: {e}")


def main():
    parser = argparse.ArgumentParser(description='Check student image counts from Supabase')
    parser.add_argument('--school_id', type=int, help='School ID')
    parser.add_argument('--class', dest='student_class', type=str, help='Student class (e.g., "1 (B)")')
    parser.add_argument('--month', type=str, help='Filter by month (YYYY-MM format, e.g., 2026-01)')
    parser.add_argument('--all', action='store_true', help='Check ALL students')
    parser.add_argument('--year', type=str, help='Filter by year (YYYY format, e.g., 2026)')
    parser.add_argument('--list-buckets', action='store_true', help='List all Supabase buckets')

    args = parser.parse_args()

    if args.list_buckets:
        list_all_buckets()
        return

    if args.all:
        if not args.year:
            print("Error: --year is required when using --all")
            print("Usage: python check_student_images.py --all --year 2026")
            sys.exit(1)
        check_all_students_for_year(args.year)
    elif args.school_id and args.student_class:
        check_images(args.school_id, args.student_class, args.month)
    else:
        print("Error: Either use --all --year OR provide --school_id and --class")
        print("\nUsage:")
        print("  python check_student_images.py --school_id 4 --class \"1 (B)\" --month 2026-01")
        print("  python check_student_images.py --all --year 2026")
        sys.exit(1)


if __name__ == "__main__":
    main()
