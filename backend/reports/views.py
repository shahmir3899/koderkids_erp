import logging
import re
import os
from zipfile import ZIP_DEFLATED, ZipFile
from django.http import HttpResponse
from django.utils.timezone import now
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from students.models import Student, Attendance, LessonPlan, Student, Attendance, LessonPlan, StudentImage
from django.db.models import Count
from datetime import datetime, timedelta
from weasyprint import HTML, CSS
from supabase import create_client
from django.conf import settings
import requests
from io import BytesIO
from PIL import Image as PILImage
import base64
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import html

from django.http import JsonResponse
from datetime import datetime, timedelta

from lessons.serializers import LessonPlanSerializer

logger = logging.getLogger(__name__)
supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
# Set up logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)
handler = logging.StreamHandler()
handler.setLevel(logging.DEBUG)
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
logger.addHandler(handler)

# Initialize Supabase Client
supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

def fetch_image(url, timeout=8, max_size=(600, 600), retries=2):
    """Fetch image from URL with robust error handling, resizing, and retries."""
    logger.info(f"Fetching image from {url}")
    if not url:
        logger.warning("No URL provided for fetching image")
        return None

    try:
        headers = {'User-Agent': 'Mozilla/5.0', 'Accept-Encoding': 'identity'}

        session = requests.Session()
        retry = Retry(total=retries, backoff_factor=0.3, status_forcelist=[429, 500, 502, 503, 504])
        adapter = HTTPAdapter(max_retries=retry)
        session.mount('https://', adapter)

        response = session.get(url, headers=headers, timeout=timeout, allow_redirects=True)
        response.raise_for_status()

        content = response.content
        
        # Detect actual image format from file signature, not extension
        if content.startswith(b'\xff\xd8'):
            actual_format = 'JPEG'
            logger.info(f"Detected JPEG image from {url}")
        elif content.startswith(b'\x89PNG'):
            actual_format = 'PNG'
            logger.info(f"Detected PNG image from {url}")
        elif content.startswith(b'GIF87a') or content.startswith(b'GIF89a'):
            actual_format = 'GIF'
            logger.info(f"Detected GIF image from {url}")
        elif content.startswith(b'RIFF') and content[8:12] == b'WEBP':
            actual_format = 'WEBP'
            logger.info(f"Detected WEBP image from {url}")
        else:
            logger.warning(f"Unsupported or unrecognized image format: {content[:12].hex()}")
            return None

        img = PILImage.open(BytesIO(content))
        
        # Convert RGBA/LA/P to RGB for PDF compatibility
        if img.mode in ('RGBA', 'LA', 'P'):
            background = PILImage.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            background.paste(img, mask=img.split()[-1] if img.mode in ('RGBA', 'LA') else None)
            img = background
        elif img.mode != 'RGB':
            img = img.convert('RGB')

        if max_size:
            img.thumbnail(max_size, PILImage.LANCZOS)

        output_buffer = BytesIO()
        # Always save as JPEG for PDF (better compression and compatibility)
        img.save(output_buffer, format='JPEG', quality=85, optimize=True)
        output_buffer.seek(0)

        if output_buffer.getbuffer().nbytes > 3 * 1024 * 1024:
            logger.warning(f"Image size too large: {output_buffer.getbuffer().nbytes} bytes")
            return None

        logger.info(f"Successfully fetched and converted image from {url} (format: {actual_format})")
        return output_buffer
    except Exception as e:
        logger.error(f"Error fetching image from {url}: {str(e)}")
        return None


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_student_image(request, student_id, filename):
    logger.info(f"delete_student_image: student_id={student_id}, filename={filename}, user={request.user.username}")

    # 1. Validate filename
    if not re.match(r'^\d{4}-\d{2}-\d{2}_[a-zA-Z0-9]+\.jpg$', filename):
        return Response({"message": "Invalid filename"}, status=400)

    # 2. Get student
    try:
        student = Student.objects.select_related('school').get(id=student_id)
    except Student.DoesNotExist:
        return Response({"message": "Student not found"}, status=404)

    # 3. Authorization
    is_owner = student.user == request.user
    is_teacher = student.school in request.user.schools.all() if hasattr(request.user, 'schools') else False

    if not (is_owner or is_teacher):
        return Response({"message": "Permission denied"}, status=403)

    # 4. Delete from Supabase
    try:
        supabase.storage.from_('student-progress').remove([f"{student_id}/{filename}"])
        logger.info(f"Deleted {filename} for student {student_id}")
        return Response({"message": "Image deleted successfully"}, status=200)
    except Exception as e:
        logger.error(f"Supabase delete failed: {str(e)}")
        return Response({"error": "Failed to delete from storage"}, status=500)

def get_date_range(mode, month, start_date, end_date):
    """Parse and validate date range for reports."""
    logger.info(f"Getting date range: mode={mode}, month={month}, start_date={start_date}, end_date={end_date}")
    if mode == 'month':
        if not month:
            raise ValueError("Month required for monthly reports")
        year, month_num = map(int, month.split('-'))
        start_date = datetime(year, month_num, 1).date()
        end_date = (datetime(year, month_num + 1, 1) - timedelta(days=1)).date() if month_num < 12 else datetime(year, 12, 31).date()
        period = datetime(year, month_num, 1).strftime('%B %Y')
    else:
        if not (start_date and end_date):
            raise ValueError("Start and end dates required for range reports")
        try:
            start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
            period = f"{start_date.strftime('%b %d, %Y')} to {end_date.strftime('%b %d, %Y')}"
        except ValueError:
            raise ValueError("Invalid date format. Use YYYY-MM-DD")
    logger.info(f"Date range: {start_date} to {end_date}, period={period}")
    return start_date, end_date, period

def fetch_student_data(student_id, school_id, student_class, start_date, end_date):
    """Fetch student, attendance, and lesson data efficiently."""
    logger.info(f"Fetching student data: student_id={student_id}, school_id={school_id}, student_class={student_class}")
    student = Student.objects.filter(id=student_id, school_id=school_id, student_class=student_class).select_related('school').first()
    if not student:
        logger.warning(f"Student not found: {student_id}")
        return None, None, None

    total_days = Attendance.objects.filter(
        session_date__range=[start_date, end_date],
        student__school=student.school
    ).values('session_date').distinct().count()

    attendance_records = Attendance.objects.filter(
        student_id=student_id,
        session_date__range=[start_date, end_date]
    ).values('status').annotate(count=Count('id'))

    attendance_data = {
        "present": next((item['count'] for item in attendance_records if item['status'] == "Present"), 0),
        "absent": next((item['count'] for item in attendance_records if item['status'] == "Absent"), 0),
        "total_days": total_days,
        "percentage": 0.0 if total_days == 0 else (next((item['count'] for item in attendance_records if item['status'] == "Present"), 0) / total_days * 100)
    }

    planned_lessons = LessonPlan.objects.filter(
        session_date__range=[start_date, end_date],
        school=student.school,
        student_class=student.student_class
    ).values("session_date", "planned_topic")

    achieved_lessons = Attendance.objects.filter(
        session_date__range=[start_date, end_date],
        student=student
    ).values("session_date", "achieved_topic")

    lessons_data = [
        {
            "date": lesson["session_date"].strftime('%Y-%m-%d'),
            "planned_topic": lesson["planned_topic"],
            "achieved_topic": next((al["achieved_topic"] for al in achieved_lessons if al["session_date"] == lesson["session_date"]), "N/A")
        }
        for lesson in planned_lessons
    ]

    logger.info(f"Student data fetched: student={student.name}, attendance={attendance_data['percentage']}%, lessons={len(lessons_data)}")
    return student, attendance_data, lessons_data

def fetch_student_images(student_id, start_date, end_date):
    """Fetch up to 4 image URLs for a student within the date range."""
    logger.info(f"Fetching images for student {student_id}, from {start_date} to {end_date}")
    folder_path = f"{student_id}/"
    supabase_response = supabase.storage.from_(settings.SUPABASE_BUCKET).list(folder_path)
    if "error" in supabase_response:
        logger.error(f"Supabase error fetching images for student {student_id}: {supabase_response['error']['message']}")
        return []

    all_urls = []
    for file in supabase_response:
        name = file["name"]
        if not re.match(r'^\d{4}-\d{2}-\d{2}_[a-zA-Z0-9]+\.jpg$', name):
            continue
        try:
            date_str = name.split('_')[0]
            parsed_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            if start_date <= parsed_date <= end_date:
                signed_data = supabase.storage.from_(settings.SUPABASE_BUCKET).create_signed_url(f"{folder_path}{name}", 3600)
                if 'signedURL' in signed_data:
                    all_urls.append(signed_data['signedURL'])
                else:
                    logger.warning(f"Failed to sign URL for {name}")
        except ValueError:
            logger.warning(f"Invalid date in filename: {name}")
            continue

    # Sort descending by name (latest dates first) and take first 4
    all_urls.sort(reverse=True)
    image_urls = all_urls[:4]
    logger.info(f"Fetched {len(image_urls)} image URLs: {image_urls}")
    return image_urls# reports/views.py (add this function near generate_pdf)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_bulk_pdf_zip(request):
    """
    Receives a list of student_ids + report parameters
    Returns a single ZIP file containing one PDF per student
    """
    logger.info(f"Bulk ZIP request by {request.user.username} – payload: {request.data}")

    try:
        student_ids = request.data.get('student_ids', [])
        if not student_ids:
            return Response({"error": "No students selected"}, status=400)

        # Re-use exactly the same parameters you already send for single reports
        mode = request.data.get('mode')
        month = request.data.get('month')
        start_date = request.data.get('start_date')
        end_date = request.data.get('end_date')
        school_id = request.data.get('school_id')
        student_class = request.data.get('student_class')
        selected_images_dict = request.data.get('selectedImages', {})  # {student_id: [url1, url2]}
        include_background_dict = request.data.get('includeBackground', {})  # {student_id: bool} – per student

        start_date_parsed, end_date_parsed, period = get_date_range(mode, month, start_date, end_date)

        # Create ZIP in memory
        zip_buffer = BytesIO()
        with ZipFile(zip_buffer, 'w', ZIP_DEFLATED) as zip_file:
            for student_id in student_ids:
                try:
                    student, attendance_data, lessons_data = fetch_student_data(
                        student_id, school_id, student_class, start_date_parsed, end_date_parsed
                    )
                    if not student:
                        continue

                    # Use manually selected images if any, otherwise auto-fetch
                    image_urls = selected_images_dict.get(str(student_id), None)
                    if not image_urls:
                        image_urls = fetch_student_images(student_id, start_date_parsed, end_date_parsed)

                    # Use per-student include_background if provided, else True
                    include_background = include_background_dict.get(str(student_id), True)

                    pdf_buffer = generate_pdf_content(
                        student, attendance_data, lessons_data, image_urls, period, include_background=include_background
                    )

                    safe_name = f"{student.reg_num}_{student.name.replace(' ', '_')}.pdf"
                    zip_file.writestr(safe_name, pdf_buffer.getvalue())

                except Exception as e:
                    logger.error(f"Failed to generate PDF for student {student_id}: {e}")
                    continue  # don’t break the whole ZIP if one student fails

        zip_buffer.seek(0)
        response = HttpResponse(zip_buffer, content_type='application/zip')
        filename = f"{student.school.name}_{student_class}_Reports_{period}_{now().strftime('%Y%m%d')}.zip"
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        logger.info(f"Bulk ZIP generated successfully – {len(student_ids)} students")
        return response

    except Exception as e:
        logger.exception("Bulk ZIP generation failed")
        return Response({"error": "Failed to generate ZIP"}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def students_progress(request):
    school_id = request.GET.get('school_id')
    student_class = request.GET.get('class_id')
    session_date_str = request.GET.get('session_date')

    # Validate required parameters
    if not all([school_id, student_class, session_date_str]):
        return Response({"error": "Missing required parameters: school_id, class_id, session_date"}, status=400)

    # Parse session_date from MM/DD/YYYY to YYYY-MM-DD
    try:
        session_date = datetime.strptime(session_date_str, '%m/%d/%Y').date()
        logger.info(f"Parsed session_date: {session_date}")
    except ValueError:
        logger.error(f"Invalid date format for session_date: {session_date_str}. Expected MM/DD/YYYY.")
        return Response({"error": "Invalid date format. Use MM/DD/YYYY (e.g., 03/12/2025)."}, status=400)

    # Fetch Lesson Plan
    lesson_plan = LessonPlan.objects.filter(
        session_date=session_date,
        school_id=school_id,
        student_class=student_class
    ).first()
    logger.info(f"Lesson plan found: {lesson_plan.id if lesson_plan else 'None'}")

    # Fetch Students
    students = Student.objects.filter(status="Active", school_id=school_id, student_class=student_class)
    logger.info(f"Found {students.count()} active students")

    student_data = []
    for student in students:
        attendance = Attendance.objects.filter(student=student, session_date=session_date).first()
        logger.info(f"Student {student.id} ({student.name}) - Attendance: {attendance.status if attendance else 'None'}")

        student_data.append({
            "id": student.id,
            "name": student.name,
            "class_id": student.student_class,
            "school_id": student.school_id,
            "attendance_id": attendance.id if attendance else None,
            "status": attendance.status if attendance else "N/A",
            "achieved_topic": attendance.achieved_topic if attendance else "",
            "lesson_plan_id": lesson_plan.id if lesson_plan else None
        })

    return Response({
        "students": student_data,
        "lesson_plan": LessonPlanSerializer(lesson_plan).data if lesson_plan else None
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_achieved_topics_count(request):
    """
    Fetch count of distinct achieved topics for students in a given month, school, and class.
    Parameters: month (YYYY-MM), school_id, student_class
    """
    user = request.user
    month = request.GET.get('month')  # Format: YYYY-MM
    school_id = request.GET.get('school_id')
    student_class = request.GET.get('student_class')

    # Validate parameters
    if not all([month, school_id, student_class]):
        return Response({"error": "month, school_id, and student_class are required"}, status=400)

    try:
        # Parse month to get date range
        year, month_num = map(int, month.split('-'))
        start_date = datetime(year, month_num, 1).date()
        end_date = (datetime(year, month_num + 1, 1) - timedelta(days=1)).date() if month_num < 12 else datetime(year, 12, 31).date()

        # Filter students by school and class
        students = Student.objects.filter(
            school_id=school_id,
            student_class=student_class,
            status="Active"
        )

        # Restrict to teacher's assigned schools if role is Teacher
        if user.role == "Teacher":
            assigned_schools = user.assigned_schools.values_list("id", flat=True)
            if int(school_id) not in assigned_schools:
                return Response({"error": "Unauthorized access to this school"}, status=403)

        # Fetch attendance records with achieved topics for the month
        achieved_topics = Attendance.objects.filter(
            student__in=students,
            session_date__range=[start_date, end_date],
            achieved_topic__isnull=False,  # Ensure not null
        ).exclude(achieved_topic='')  # Exclude empty strings directly
        achieved_topics = achieved_topics.values('student_id').annotate(topics_count=Count('achieved_topic', distinct=True))

        # Prepare response data
        student_data = []
        for student in students:
            topics_count = next((item['topics_count'] for item in achieved_topics if item['student_id'] == student.id), 0)
            student_data.append({
                "student_id": student.id,
                "name": student.name,
                "topics_achieved": topics_count
            })

        return Response(student_data, status=200)

    except ValueError:
        return Response({"error": "Invalid month format. Use YYYY-MM (e.g., 2025-03)"}, status=400)
    except Exception as e:
        logger.error(f"Error in get_student_achieved_topics_count: {str(e)}")
        return Response({"error": str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_image_uploads_count(request):
    """
    Fetch count of images uploaded for students in a given month, school, and class from Supabase.
    Parameters: month (YYYY-MM), school_id, student_class
    """
    user = request.user
    month = request.GET.get('month')  # Format: YYYY-MM
    school_id = request.GET.get('school_id')
    student_class = request.GET.get('student_class')

    # Validate parameters
    if not all([month, school_id, student_class]):
        return Response({"error": "month, school_id, and student_class are required"}, status=400)

    try:
        # Filter students by school and class
        students = Student.objects.filter(
            school_id=school_id,
            student_class=student_class,
            status="Active"
        )

        # Restrict to teacher's assigned schools if role is Teacher
        if user.role == "Teacher":
            assigned_schools = user.assigned_schools.values_list("id", flat=True)
            if int(school_id) not in assigned_schools:
                return Response({"error": "Unauthorized access to this school"}, status=403)

        # Prepare response data
        student_data = []
        for student in students:
            # Fetch images from Supabase for this student
            folder_path = f"{student.id}/"
            response = supabase.storage.from_(settings.SUPABASE_BUCKET).list(folder_path)

            if "error" in response:
                logger.error(f"Error fetching images for student {student.id}: {response['error']['message']}")
                continue

            # Filter images by month (filename starts with YYYY-MM)
            image_count = sum(1 for file in response if file['name'].startswith(month))

            student_data.append({
                "student_id": student.id,
                "name": student.name,
                "images_uploaded": image_count
            })

        return Response(student_data, status=200)

    except ValueError:
        return Response({"error": "Invalid month format. Use YYYY-MM (e.g., 2025-03)"}, status=400)
    except Exception as e:
        logger.error(f"Error in get_student_image_uploads_count: {str(e)}")
        return Response({"error": str(e)}, status=500)
    


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_progress_images(request):
    """
    Fetch all stored images for a student within a given month from Supabase Storage.
    Used in Report Generation.
    """
    student_id = request.GET.get('student_id')
    month = request.GET.get('month')  # Format: YYYY-MM

    if not student_id or not month:
        return JsonResponse({"error": "student_id and month are required"}, status=400)

    try:
        # Define the folder path inside the Supabase bucket
        folder_path = f"{student_id}/"

        # Fetch all files from the student's folder in Supabase
        response = supabase.storage.from_("student-images").list(folder_path)

        if not response or "error" in response:
            return JsonResponse({"error": "Failed to fetch files from Supabase"}, status=500)

        # Filter files that start with the requested month (YYYY-MM)
        matching_images = [
            supabase.storage.from_("student-images").create_signed_url(f"{folder_path}{file['name']}", 604800)
            for file in response if file["name"].startswith(month)
        ]

        if not matching_images:
            return JsonResponse({"progress_images": [], "message": "No images found"}, status=200)

        return JsonResponse({"progress_images": matching_images})

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)




@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def generate_pdf(request):
    logger.info(f"generate_pdf request: method={request.method}, data={request.data}")
    user = request.user
    try:
        if request.method == 'POST':
            data = request.data
            student_id = data.get('studentData', {}).get('student_id')
            mode = data.get('mode', 'month')
            month = data.get('month')
            start_date = data.get('start_date')
            end_date = data.get('end_date')
            school_id = data.get('studentData', {}).get('school_id')
            student_class = data.get('studentData', {}).get('student_class')
            selected_images = data.get('selectedImages', [])
            include_background = data.get('includeBackground', True)  # Read from request, default True
        else:  # GET (existing logic)
            student_id = request.GET.get('student_id')
            mode = request.GET.get('mode')
            month = request.GET.get('month')
            start_date = request.GET.get('start_date')
            end_date = request.GET.get('end_date')
            school_id = request.GET.get('school_id')
            student_class = request.GET.get('student_class')
            selected_images = None
            include_background = True  # Default for GET

        if not all([student_id, mode, school_id, student_class]):
            logger.warning("Missing required parameters in generate_pdf")
            return Response({
                'message': 'Failed to generate PDF',
                'error': 'Missing required parameters: student_id, mode, school_id, student_class'
            }, status=400)

        if user.role == "Teacher":
            if int(school_id) not in user.assigned_schools.values_list("id", flat=True):
                logger.warning(f"Unauthorized access attempt by {user.username} to school {school_id}")
                return Response({
                    "message": "Failed to generate PDF",
                    "error": "Unauthorized access to this school"
                }, status=403)

        start_date, end_date, period = get_date_range(mode, month, start_date, end_date)
        student, attendance_data, lessons_data = fetch_student_data(student_id, school_id, student_class, start_date, end_date)
        if not student:
            logger.warning(f"Student not found: {student_id}")
            return Response({'message': 'Failed to generate PDF', 'error': 'Student not found'}, status=404)

        # Use selected_images for POST, otherwise fetch default images
        image_urls = selected_images if request.method == 'POST' and selected_images else fetch_student_images(student_id, start_date, end_date)
        logger.info(f"Progress image URLs: {image_urls}")
        buffer = generate_pdf_content(student, attendance_data, lessons_data, image_urls, period, include_background=include_background)
        response = HttpResponse(buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename=student_report_{student.reg_num}_{period.replace(" ", "_")}.pdf'
        logger.info(f"Successfully generated PDF for student {student_id}")
        return response
    except ValueError as e:
        logger.warning(f"Validation error: {str(e)}")
        return Response({'message': 'Failed to generate PDF', 'error': str(e)}, status=400)
    except Exception as e:
        logger.error(f"Unexpected error in generate_pdf: {str(e)}")
        return Response({
            "message": "Failed to generate PDF",
            "error": "An unexpected error occurred"
        }, status=500)



def generate_pdf_content(student, attendance_data, lessons_data, image_urls, period, include_background=True):
    logger.info("Generating PDF content")

    progress_images = []
    for url in image_urls[:4]:
        logger.info(f"Fetching progress image: {url}")
        img_buffer = fetch_image(url)
        if img_buffer:
            img_data = base64.b64encode(img_buffer.read()).decode("utf-8")
            img_mime = "image/jpeg"
            progress_images.append((img_data, img_mime))
            logger.info(f"Progress image fetched: {url}")
        else:
            progress_images.append(None)
            logger.warning(f"Failed to fetch progress image: {url}")

    # Load background image if enabled
    bg_image_css = ""
    if include_background:
        bg_path = os.path.join(settings.BASE_DIR, 'static', 'bg.png')
        if os.path.exists(bg_path):
            with open(bg_path, 'rb') as f:
                bg_data = base64.b64encode(f.read()).decode('utf-8')
            bg_image_css = f"background: url('data:image/png;base64,{bg_data}') no-repeat top left / 210mm 297mm;"
            logger.info(f"Background image loaded from {bg_path}")
        else:
            logger.warning(f"Background image not found at {bg_path}")

    html_content = f"""
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
    @page {{
        size: 210mm 297mm;
        padding: 40mm 15mm 15mm 30mm; /* 52mm top = ~2 inches to clear logo */
        margin: 0;
        {bg_image_css}
    }}
    
    * {{
        box-sizing: border-box;
    }}
    
    html, body {{
        margin: 0;
        padding: 0;
        font-family: 'Trebuchet MS', 'Lucida Sans', sans-serif;
        background: none !important;
        background-color: transparent !important;
        background-image: none !important;
        color: #134e4a;
    }}
    
    .page-content {{
        
        min-height: 282mm;
    }}
    
    /* Header Section */
    .report-header {{
        background: linear-gradient(135deg, #0d9488 0%, #14b8a6 100%);
        padding: 16px 24px;
        border-radius: 8px;
        margin-bottom: 16px;
        text-align: center;
    }}
    
    .report-header h1 {{
        color: #ffffff;
        font-size: 20pt;
        font-weight: bold;
        margin: 0 0 4px 0;
        letter-spacing: 0.5px;
    }}
    
    .report-header .subtitle {{
        color: #ffffff;
        font-size: 11pt;
        opacity: 0.9;
        margin: 0;
    }}
    
    /* Section Titles */
    .section-title {{
        color: #0d9488;
        font-size: 12pt;
        font-weight: bold;
        margin: 14px 0 8px 0;
        padding-bottom: 5px;
        border-bottom: 2px solid #f97316;
        display: flex;
        align-items: center;
        gap: 8px;
    }}
    
    .section-title::before {{
        content: "";
        display: inline-block;
        width: 8px;
        height: 8px;
        background-color: #f97316;
        border-radius: 50%;
    }}
    
    /* Student Details Table */
    table.student-details {{
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        margin-bottom: 12px;
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid #99f6e4;
    }}
    
    table.student-details th,
    table.student-details td {{
        padding: 8px 12px;
        text-align: left;
        font-size: 10pt;
        border-bottom: 1px solid #99f6e4;
    }}
    
    table.student-details th {{
        background-color: #0d9488;
        color: #ffffff;
        font-weight: 600;
        width: 35%;
    }}
    
    table.student-details tr:nth-child(even) td {{
        background-color: #f0fdfa;
    }}
    
    table.student-details tr:last-child th,
    table.student-details tr:last-child td {{
        border-bottom: none;
    }}
    
    /* Attendance Card */
    .attendance-card {{
        background-color: #f0fdfa;
        border: 1px solid #99f6e4;
        border-radius: 8px;
        padding: 12px 16px;
        margin-bottom: 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }}
    
    .attendance-card .days {{
        font-size: 10pt;
        color: #134e4a;
    }}
    
    .attendance-card .percentage {{
        background-color: #0d9488;
        color: #ffffff;
        padding: 5px 14px;
        border-radius: 20px;
        font-weight: bold;
        font-size: 10pt;
    }}
    
    /* Lessons Table */
    table.lessons {{
        width: 100%;
        border-collapse: separate;
        border-spacing: 0;
        margin-bottom: 12px;
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid #99f6e4;
    }}
    
    table.lessons th {{
        background-color: #0d9488;
        color: #ffffff;
        padding: 8px 10px;
        text-align: left;
        font-weight: 600;
        font-size: 9pt;
    }}
    
    table.lessons td {{
        padding: 7px 10px;
        border-bottom: 1px solid #99f6e4;
        font-size: 9pt;
        vertical-align: top;
    }}
    
    table.lessons tr:nth-child(even) td {{
        background-color: #f0fdfa;
    }}
    
    table.lessons tr:last-child td {{
        border-bottom: none;
    }}
    
    table.lessons tr {{
        page-break-inside: avoid;
    }}
    
    .checkmark {{
        color: #f97316;
        font-weight: bold;
        margin-left: 4px;
    }}
    
    /* Image Grid */
    .image-grid {{
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
        margin-bottom: 12px;
        max-width: 180mm;
    }}
    
    .image-grid img {{
        width: 100%;
        height: 50mm;
        object-fit: cover;
        border-radius: 8px;
        border: 1px solid #99f6e4;
        background-color: #f0fdfa;
    }}
    
    .image-grid p {{
        grid-column: span 2;
        text-align: center;
        color: #64748b;
        padding: 20px 0;
    }}
    
    /* Footer */
    .footer {{
        margin-top: 20px;
        font-size: 8pt;
        text-align: center;
        color: #134e4a;
        padding-top: 30px;
        border-top: 1px solid #99f6e4;
        opacity: 0.7;
    }}
</style>
</head>
<body>
<div class="page-content">
    <!-- Header -->
    <div class="report-header">
        <h1>{html.escape(student.school.name)}</h1>
        <p class="subtitle">Monthly Student Report</p>
    </div>
    
    <!-- Student Details -->
    <div class="section-title">Student Details</div>
    <table class="student-details">
        <tr><th>Name</th><td>{html.escape(student.name)}</td></tr>
        <tr><th>Registration Number</th><td>{html.escape(student.reg_num)}</td></tr>
        <tr><th>Class</th><td>{html.escape(student.student_class)}</td></tr>
        <tr><th>Reporting Period</th><td>{html.escape(period)}</td></tr>
    </table>
    
    <!-- Attendance -->
    <div class="section-title">Attendance</div>
    <div class="attendance-card">
        <span class="days">{attendance_data['present']} / {attendance_data['total_days']} days attended</span>
        <span class="percentage">{attendance_data['percentage']:.1f}%</span>
    </div>
    
    <!-- Lessons Overview -->
    <div class="section-title">Lessons Overview</div>
    <table class="lessons">
        <tr>
            <th style="width: 18%;">Date</th>
            <th style="width: 41%;">Planned Topic</th>
            <th style="width: 41%;">Achieved Topic</th>
        </tr>
        {"<tr><td colspan='3' style='text-align: center; color: #64748b; padding: 16px;'>No lessons available</td></tr>" if not lessons_data else ""}
        {"".join([f'''<tr>
            <td>{html.escape(lesson['date'])}</td>
            <td>{html.escape(lesson['planned_topic'])}</td>
            <td>{html.escape(lesson['achieved_topic'])}{' <span class="checkmark">✓</span>' if lesson['planned_topic'] == lesson['achieved_topic'] else ''}</td>
        </tr>''' for lesson in lessons_data]) if lessons_data else ""}
    </table>
    
    <!-- Progress Images -->
    <div class="section-title">Progress Images</div>
    <div class="image-grid">
        {"<p>No images available for this period</p>" if not progress_images or all(img is None for img in progress_images) else ""}
        {"".join([f'<img src="data:{img_mime};base64,{img_data}" alt="Progress image"/>' for img_data, img_mime in progress_images if img_data]) if progress_images else ""}
    </div>
    
    <!-- Footer -->
    <div class="footer">
        Teacher's Signature: ____________________ | Generated: {datetime.now().strftime('%b %d, %Y %I:%M %p')} | Powered by Koder Kids
    </div>
</div>
</body>
</html>
"""

    logger.info("Rendering PDF with WeasyPrint")
    buffer = BytesIO()
    HTML(string=html_content).write_pdf(buffer)
    buffer.seek(0)
    logger.info("PDF rendered successfully")
    return buffer