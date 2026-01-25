import logging
import re
import os
from zipfile import ZIP_DEFLATED, ZipFile
from django.http import HttpResponse
from django.utils.timezone import now
from rest_framework import status, viewsets
from rest_framework.decorators import api_view, permission_classes, action
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
from .models import CustomReport, ReportTemplate, ReportRequest, RequestStatusLog, GeneratedReport
from .serializers import (
    CustomReportSerializer,
    CustomReportListSerializer,
    CustomReportCreateSerializer,
    ReportTemplateSerializer,
    ReportTemplateListSerializer,
    ReportRequestSerializer,
    ReportRequestListSerializer,
    ReportRequestCreateSerializer,
    ReportRequestUpdateSerializer,
    ApproveRequestSerializer,
    RejectRequestSerializer,
    GeneratedReportSerializer,
)
from authentication.permissions import (
    IsAdminUser,
    IsRequestOwnerOrAdmin,
    IsRequestOwnerAndDraft,
)
from .utils import prefill_template, get_remaining_placeholders, get_template_required_fields
from employees.models import Notification

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


# ============================================
# SHARED PDF GENERATION - Unified format for all reports
# ============================================

def generate_report_pdf(
    subject,
    body_text,
    recipient_text='TO WHOM IT MAY CONCERN',
    line_spacing='single',
    signer_name='Admin',
    signer_title='Administrator',
    reference_number=None,
    approved_date=None,
):
    """
    Generate a professional PDF report with letterhead.
    Used by both CustomReport and ReportRequest.

    Args:
        subject: Report subject line
        body_text: Main content of the report
        recipient_text: The "To:" field text
        line_spacing: 'single', '1.5', or 'double'
        signer_name: Name of the person signing
        signer_title: Title of the person signing
        reference_number: Optional reference number for footer
        approved_date: Optional approval date for footer

    Returns:
        BytesIO buffer containing the PDF
    """
    # Line spacing CSS
    line_height_css = {
        'single': '1.5',
        '1.5': '1.8',
        'double': '2.0',
    }.get(line_spacing, '1.5')

    # Load background/letterhead image
    bg_image_css = ""
    letterhead_path = os.path.join(settings.BASE_DIR, 'static', 'letterhead.png')
    bg_path = os.path.join(settings.BASE_DIR, 'static', 'bg.png')

    # Try letterhead first, then bg.png
    image_path = letterhead_path if os.path.exists(letterhead_path) else (bg_path if os.path.exists(bg_path) else None)

    if image_path and os.path.exists(image_path):
        with open(image_path, 'rb') as f:
            bg_data = base64.b64encode(f.read()).decode('utf-8')
        bg_image_css = f"background: url('data:image/png;base64,{bg_data}') no-repeat top left / 210mm 297mm;"
        logger.info(f"Letterhead/background loaded from {image_path}")

    # Build footer text
    footer_parts = ['<span class="footer-brand">Koder Kids</span>']
    if reference_number:
        footer_parts.append(f'Ref: {reference_number}')
    if approved_date:
        footer_parts.append(f'Date: {approved_date}')
    footer_parts.append('This document is computer generated and valid without physical signature.')
    footer_text = ' | '.join(footer_parts)

    # Generate HTML
    html_content = f'''
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            @page {{
                size: A4;
                margin: 0;
                {bg_image_css}
            }}

            * {{
                box-sizing: border-box;
            }}

            html, body {{
                margin: 0;
                padding: 0;
                font-family: "Times New Roman", Georgia, serif;
                font-size: 12pt;
                line-height: {line_height_css};
                color: #000;
                background: none !important;
                background-color: transparent !important;
            }}

            .page-content {{
                padding: 50mm 25mm 40mm 25mm;
                min-height: 297mm;
            }}

            .header {{
                text-align: right;
                font-size: 10pt;
                color: #333;
                margin-bottom: 30px;
                padding-bottom: 15px;
                border-bottom: 2px solid #8B5CF6;
            }}

            .company {{
                font-weight: bold;
                font-size: 18pt;
                color: #8B5CF6;
                margin-bottom: 5px;
            }}

            .company-details {{
                font-size: 10pt;
                color: #555;
                line-height: 1.4;
            }}

            .date {{
                margin-top: 10px;
                font-style: italic;
            }}

            .to {{
                margin: 25px 0 15px 0;
            }}

            .subject {{
                font-weight: bold;
                margin: 20px 0;
                padding: 8px 0;
                border-bottom: 1px solid #ddd;
            }}

            .body {{
                text-align: justify;
                white-space: pre-wrap;
                margin: 25px 0 40px 0;
                min-height: 150px;
            }}

            .signature-section {{
                margin-top: 60px;
                page-break-inside: avoid;
            }}

            .signature-block {{
                display: inline-block;
                text-align: left;
            }}

            .signature-line {{
                width: 200px;
                border-bottom: 1px solid #000;
                margin-bottom: 5px;
                height: 40px;
            }}

            .signature-name {{
                font-weight: bold;
                font-size: 11pt;
            }}

            .signature-title {{
                font-size: 10pt;
                color: #555;
            }}

            .footer {{
                position: fixed;
                bottom: 15mm;
                left: 25mm;
                right: 25mm;
                text-align: center;
                font-size: 8pt;
                color: #888;
                border-top: 1px solid #ddd;
                padding-top: 10px;
            }}

            .footer-brand {{
                color: #8B5CF6;
                font-weight: bold;
            }}
        </style>
    </head>
    <body>
        <div class="page-content">
            <!-- Header with Company Details -->
            <div class="header">
                <div class="company">Koder Kids</div>
                <div class="company-details">
                    Office # 8, First Floor, Khyber III<br>
                    G-15 Markaz Islamabad, Pakistan<br>
                    Phone: 0316-7394390
                </div>
                <div class="date">Date: {now().strftime('%B %d, %Y')}</div>
            </div>

            <!-- Recipient -->
            <div class="to">
                <strong>To:</strong> {html.escape(recipient_text)}
            </div>

            <!-- Subject -->
            <div class="subject">
                <strong>Subject:</strong> {html.escape(subject)}
            </div>

            <!-- Body Content -->
            <div class="body">{html.escape(body_text)}</div>

            <!-- Signature Section -->
            <div class="signature-section">
                <div class="signature-block">
                    <strong>Regards,</strong><br><br>
                    <div class="signature-line"></div>
                    <div class="signature-name">{html.escape(signer_name)}</div>
                    <div class="signature-title">{html.escape(signer_title)}</div>
                    <div class="signature-title">Koder Kids</div>
                </div>
            </div>
        </div>

        <!-- Footer -->
        <div class="footer">
            {footer_text}
        </div>
    </body>
    </html>
    '''

    # Generate PDF using WeasyPrint
    pdf_buffer = BytesIO()
    HTML(string=html_content).write_pdf(pdf_buffer)
    pdf_buffer.seek(0)

    return pdf_buffer

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

    # 4. Delete from Supabase - use correct bucket name "student-images"
    try:
        result = supabase.storage.from_('student-images').remove([f"{student_id}/{filename}"])
        logger.info(f"Deleted {filename} for student {student_id}, result: {result}")
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
            response = supabase.storage.from_("student-images").list(folder_path)

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

        logger.info(f"Fetching progress images for student {student_id}, month {month}, path: {folder_path}")

        # Fetch all files from the student's folder in Supabase
        response = supabase.storage.from_("student-images").list(folder_path)

        logger.info(f"Supabase list response type: {type(response)}, content: {response}")

        # Handle error response - response is a list when successful, dict when error
        if isinstance(response, dict) and "error" in response:
            logger.error(f"Supabase error: {response}")
            return JsonResponse({"error": "Failed to fetch files from Supabase"}, status=500)

        # If response is empty list or None, return empty
        if not response:
            logger.info(f"No files found in folder {folder_path}")
            return JsonResponse({"progress_images": [], "message": "No images found"}, status=200)

        # Filter files that start with the requested month (YYYY-MM)
        matching_files = [file for file in response if file.get("name", "").startswith(month)]
        logger.info(f"Found {len(matching_files)} files matching month {month}")

        if not matching_files:
            return JsonResponse({"progress_images": [], "message": "No images found for this month"}, status=200)

        # Generate signed URLs for matching files
        matching_images = []
        for file in matching_files:
            try:
                signed_url = supabase.storage.from_("student-images").create_signed_url(
                    f"{folder_path}{file['name']}", 604800
                )
                matching_images.append(signed_url)
            except Exception as url_error:
                logger.error(f"Error creating signed URL for {file['name']}: {url_error}")

        logger.info(f"Generated {len(matching_images)} signed URLs")
        return JsonResponse({"progress_images": matching_images})

    except Exception as e:
        logger.error(f"Error in get_student_progress_images: {str(e)}", exc_info=True)
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


# ============================================
# CUSTOM REPORT VIEWSET
# ============================================

class CustomReportViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing custom reports.
    Provides list, create, retrieve, update, delete operations.
    """
    queryset = CustomReport.objects.all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            return CustomReportListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return CustomReportCreateSerializer
        return CustomReportSerializer

    def get_queryset(self):
        queryset = CustomReport.objects.all()

        # Filter by template_type
        template_type = self.request.query_params.get('template_type')
        if template_type:
            queryset = queryset.filter(template_type=template_type)

        # Filter by recipient (partial match)
        recipient = self.request.query_params.get('recipient')
        if recipient:
            queryset = queryset.filter(recipient__icontains=recipient)

        # Filter by subject (partial match)
        subject = self.request.query_params.get('subject')
        if subject:
            queryset = queryset.filter(subject__icontains=subject)

        # Limit results
        limit = self.request.query_params.get('limit')
        if limit:
            try:
                queryset = queryset[:int(limit)]
            except ValueError:
                pass

        return queryset

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    @action(detail=False, methods=['get'])
    def templates(self, request):
        """
        Return available report templates with their default content.
        GET /api/reports/custom-reports/templates/
        """
        templates = {
            'custom': {
                'name': 'Custom Report',
                'description': 'Create a custom report with your own content',
                'default_subject': '',
                'default_body': '',
            },
            'offer_letter': {
                'name': 'Offer Letter',
                'description': 'Employment offer letter template',
                'default_subject': 'Employment Offer Letter',
                'default_body': '''Dear {recipient},

We are pleased to offer you the position of {position} at {company_name}.

*Start Date:* {start_date}
*Salary:* {salary}
*Department:* {department}

Please review the attached terms and conditions. We look forward to welcoming you to our team.

Sincerely,
{sender_name}
{sender_title}''',
            },
            'experience_letter': {
                'name': 'Experience Letter',
                'description': 'Employment experience certificate',
                'default_subject': 'Experience Certificate',
                'default_body': '''To Whom It May Concern,

This is to certify that {employee_name} was employed with {company_name} from {start_date} to {end_date} as {position}.

During their tenure, they demonstrated excellent performance and professionalism.

We wish them all the best in their future endeavors.

Sincerely,
{sender_name}
{sender_title}''',
            },
            'warning_letter': {
                'name': 'Warning Letter',
                'description': 'Employee warning letter template',
                'default_subject': 'Warning Letter',
                'default_body': '''Dear {recipient},

This letter serves as a formal warning regarding {issue}.

*Date of Incident:* {incident_date}
*Details:* {incident_details}

Please take immediate corrective action. Further violations may result in disciplinary action.

Sincerely,
{sender_name}
{sender_title}''',
            },
            'termination_letter': {
                'name': 'Termination Letter',
                'description': 'Employment termination letter',
                'default_subject': 'Termination of Employment',
                'default_body': '''Dear {recipient},

This letter confirms the termination of your employment with {company_name}, effective {termination_date}.

*Reason:* {reason}
*Final Working Day:* {last_day}

Please return all company property before your last day.

Sincerely,
{sender_name}
{sender_title}''',
            },
            'appreciation_letter': {
                'name': 'Appreciation Letter',
                'description': 'Employee appreciation letter',
                'default_subject': 'Letter of Appreciation',
                'default_body': '''Dear {recipient},

We would like to express our sincere appreciation for your outstanding contribution to {project_or_achievement}.

Your dedication and hard work have made a significant impact on our team.

Thank you for your continued excellence.

Sincerely,
{sender_name}
{sender_title}''',
            },
            'salary_certificate': {
                'name': 'Salary Certificate',
                'description': 'Salary verification certificate',
                'default_subject': 'Salary Certificate',
                'default_body': '''To Whom It May Concern,

This is to certify that {employee_name} is employed with {company_name} as {position}.

*Monthly Salary:* {salary}
*Employee ID:* {employee_id}
*Date of Joining:* {joining_date}

This certificate is issued upon request for {purpose}.

Sincerely,
{sender_name}
{sender_title}''',
            },
            'employment_certificate': {
                'name': 'Employment Certificate',
                'description': 'Employment verification certificate',
                'default_subject': 'Employment Certificate',
                'default_body': '''To Whom It May Concern,

This is to certify that {employee_name} is currently employed with {company_name} as {position} since {joining_date}.

This certificate is issued upon request for official purposes.

Sincerely,
{sender_name}
{sender_title}''',
            },
            'recommendation_letter': {
                'name': 'Recommendation Letter',
                'description': 'Professional recommendation letter',
                'default_subject': 'Letter of Recommendation',
                'default_body': '''To Whom It May Concern,

I am pleased to recommend {employee_name} for {purpose}.

I have known {employee_name} for {duration} in my capacity as {relationship}. During this time, they have demonstrated exceptional skills in {skills}.

I highly recommend them without reservation.

Sincerely,
{sender_name}
{sender_title}''',
            },
        }

        return Response(templates)

    @action(detail=False, methods=['post'])
    def prefill(self, request):
        """
        Prefill a template with employee data.
        POST /api/reports/custom-reports/prefill/

        Request body:
        {
            "template_body": "Dear {employee_name}, ...",
            "employee_id": 123
        }

        Response:
        {
            "prefilled_body": "Dear John Doe, ...",
            "auto_filled": {"employee_name": "John Doe", ...},
            "remaining_placeholders": ["purpose", ...]
        }
        """
        from authentication.models import CustomUser

        template_body = request.data.get('template_body', '')
        employee_id = request.data.get('employee_id')

        if not template_body:
            return Response(
                {'error': 'template_body is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Get target employee
        target_employee = None
        if employee_id:
            try:
                target_employee = CustomUser.objects.get(id=employee_id)
            except CustomUser.DoesNotExist:
                return Response(
                    {'error': 'Employee not found'},
                    status=status.HTTP_404_NOT_FOUND
                )

        # Prefill the template
        prefilled_body = prefill_template(
            template_body,
            target_employee=target_employee,
            sender=request.user,
            custom_fields={}
        )

        # Get auto-filled data
        from .utils import get_employee_data, get_sender_data
        auto_filled = {}
        if target_employee:
            auto_filled.update(get_employee_data(target_employee))
        auto_filled.update(get_sender_data(request.user))

        # Find remaining placeholders
        remaining = get_remaining_placeholders(prefilled_body)

        return Response({
            'prefilled_body': prefilled_body,
            'auto_filled': auto_filled,
            'remaining_placeholders': remaining,
        })

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """
        Download/generate PDF for a custom report.
        GET /api/reports/custom-reports/{id}/download/
        Uses the unified PDF format.
        """
        try:
            report = self.get_object()

            # Get signer info from the admin who generated the report
            signer_name = report.generated_by_name or "Admin"
            signer_title = "Administrator"

            if report.generated_by:
                try:
                    if hasattr(report.generated_by, 'teacher_profile') and report.generated_by.teacher_profile:
                        signer_title = report.generated_by.teacher_profile.title or "Administrator"
                except Exception:
                    pass

            # Generate PDF using shared function
            pdf_buffer = generate_report_pdf(
                subject=report.subject,
                body_text=report.body_text,
                recipient_text=report.recipient,
                line_spacing=report.line_spacing,
                signer_name=signer_name,
                signer_title=signer_title,
                reference_number=f"CR-{report.id}",
                approved_date=report.created_at.strftime('%B %d, %Y') if report.created_at else None,
            )

            # Return PDF response
            response = HttpResponse(pdf_buffer.read(), content_type='application/pdf')
            safe_subject = report.subject.replace(' ', '_')[:30]
            response['Content-Disposition'] = f'attachment; filename="CustomReport-{report.id}-{safe_subject}.pdf"'
            return response

        except Exception as e:
            logger.error(f"Error generating CustomReport PDF: {str(e)}")
            return Response(
                {'error': f'Failed to generate PDF: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# =============================================================================
# SELF-SERVICE REPORTS - REPORT TEMPLATE VIEWSET
# =============================================================================
class ReportTemplateViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing report templates.
    - List/retrieve: All authenticated users (filtered by role)
    - Create/update/delete: Admin only
    """
    queryset = ReportTemplate.objects.filter(is_active=True)

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsAdminUser()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == 'list':
            return ReportTemplateListSerializer
        return ReportTemplateSerializer

    def get_queryset(self):
        queryset = ReportTemplate.objects.filter(is_active=True)
        user = self.request.user

        # Filter templates by user's role
        if user.role != 'Admin':
            # Non-admins only see templates their role can use
            queryset = queryset.filter(allowed_roles__contains=user.role)

        # Filter by category
        category = self.request.query_params.get('category')
        if category:
            queryset = queryset.filter(category=category)

        return queryset

    @action(detail=False, methods=['get'])
    def available(self, request):
        """
        Get templates available for the current user.
        GET /api/reports/templates/available/
        """
        queryset = self.get_queryset()
        serializer = ReportTemplateListSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get', 'post'])
    def prefill(self, request, pk=None):
        """
        Get template with placeholders pre-filled with employee data.

        GET /api/reports/templates/{id}/prefill/
            - Returns template pre-filled with current user's data (self-service)

        POST /api/reports/templates/{id}/prefill/
            - Accepts { target_employee_id: int, custom_fields: {} }
            - Admin only: Can prefill for any employee
            - Returns template pre-filled with target employee's data

        Response:
        {
            "template_id": 1,
            "template_name": "Salary Certificate",
            "prefilled_subject": "Salary Certificate for John Doe",
            "prefilled_body": "This is to certify that John Doe...",
            "remaining_placeholders": ["purpose"],
            "required_fields": ["purpose"],
            "auto_filled": {"employee_name": "John Doe", "employee_id": "EMP001", ...}
        }
        """
        from authentication.models import CustomUser

        template = self.get_object()
        user = request.user

        # Determine target employee
        target_employee = None
        custom_fields = {}

        if request.method == 'POST':
            # Admin can prefill for any employee
            target_employee_id = request.data.get('target_employee_id')
            custom_fields = request.data.get('custom_fields', {})

            if target_employee_id:
                if user.role != 'Admin':
                    return Response(
                        {'error': 'Only admins can prefill templates for other employees'},
                        status=status.HTTP_403_FORBIDDEN
                    )
                try:
                    target_employee = CustomUser.objects.get(id=target_employee_id)
                except CustomUser.DoesNotExist:
                    return Response(
                        {'error': 'Employee not found'},
                        status=status.HTTP_404_NOT_FOUND
                    )
            else:
                # Admin submitting for self
                target_employee = user
        else:
            # GET request - prefill for current user (self-service)
            target_employee = user

        # Prefill the template
        prefilled_body = prefill_template(
            template.body_template,
            target_employee=target_employee,
            sender=user if user.role == 'Admin' else None,
            custom_fields=custom_fields
        )

        prefilled_subject = prefill_template(
            template.name,  # Use template name as subject base
            target_employee=target_employee,
            sender=user if user.role == 'Admin' else None,
            custom_fields=custom_fields
        )

        # Find remaining placeholders
        remaining = get_remaining_placeholders(prefilled_body)

        # Get required fields for this template
        required_fields = get_template_required_fields(template.code)

        # Build auto_filled dict to show what was replaced
        from .utils import get_employee_data, get_sender_data
        auto_filled = get_employee_data(target_employee)
        if user.role == 'Admin':
            auto_filled.update(get_sender_data(user))
        if custom_fields:
            auto_filled.update(custom_fields)

        return Response({
            'template_id': template.id,
            'template_name': template.name,
            'template_code': template.code,
            'prefilled_subject': f"{template.name} for {target_employee.get_full_name() or target_employee.username}",
            'prefilled_body': prefilled_body,
            'remaining_placeholders': remaining,
            'required_fields': required_fields,
            'auto_filled': auto_filled,
            'target_employee': {
                'id': target_employee.id,
                'name': target_employee.get_full_name() or target_employee.username,
            } if target_employee else None
        })


# =============================================================================
# SELF-SERVICE REPORTS - REPORT REQUEST VIEWSET
# =============================================================================
class ReportRequestViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing report requests with approval workflow.

    Endpoints:
    - GET /api/reports/requests/ - List requests (filtered by ownership/role)
    - POST /api/reports/requests/ - Create new request (DRAFT)
    - GET /api/reports/requests/{id}/ - Get request details
    - PUT /api/reports/requests/{id}/ - Update draft request
    - DELETE /api/reports/requests/{id}/ - Delete/cancel request
    - POST /api/reports/requests/{id}/submit/ - Submit for approval
    - POST /api/reports/requests/{id}/approve/ - Approve (admin only)
    - POST /api/reports/requests/{id}/reject/ - Reject (admin only)
    - POST /api/reports/requests/{id}/cancel/ - Cancel request
    - GET /api/reports/requests/pending/ - List pending approvals (admin only)
    - GET /api/reports/requests/my-requests/ - List user's own requests
    """
    queryset = ReportRequest.objects.all()

    def get_permissions(self):
        if self.action in ['approve', 'reject', 'pending', 'stats']:
            return [IsAuthenticated(), IsAdminUser()]
        if self.action in ['update', 'partial_update']:
            return [IsAuthenticated(), IsRequestOwnerAndDraft()]
        if self.action in ['retrieve', 'destroy', 'cancel', 'download']:
            return [IsAuthenticated(), IsRequestOwnerOrAdmin()]
        return [IsAuthenticated()]

    def get_serializer_class(self):
        if self.action == 'list':
            return ReportRequestListSerializer
        if self.action == 'create':
            return ReportRequestCreateSerializer
        if self.action in ['update', 'partial_update']:
            return ReportRequestUpdateSerializer
        if self.action == 'approve':
            return ApproveRequestSerializer
        if self.action == 'reject':
            return RejectRequestSerializer
        return ReportRequestSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = ReportRequest.objects.all()

        # Admin sees all, others see only their own
        if user.role != 'Admin':
            queryset = queryset.filter(requested_by=user)

        # Filter by status (supports comma-separated: ?status=APPROVED,REJECTED,GENERATED)
        status_filter = self.request.query_params.get('status')
        if status_filter:
            statuses = [s.strip() for s in status_filter.split(',')]
            queryset = queryset.filter(status__in=statuses)

        # Filter by template
        template_code = self.request.query_params.get('template')
        if template_code:
            queryset = queryset.filter(template__code=template_code)

        # Filter by priority
        priority = self.request.query_params.get('priority')
        if priority:
            queryset = queryset.filter(priority=priority)

        queryset = queryset.select_related(
            'requested_by', 'target_employee', 'template', 'approved_by'
        )

        # Limit results
        limit = self.request.query_params.get('limit')
        if limit:
            try:
                queryset = queryset[:int(limit)]
            except ValueError:
                pass

        return queryset

    def perform_create(self, serializer):
        serializer.save()

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """
        Submit a draft request for approval.
        POST /api/reports/requests/{id}/submit/
        """
        report_request = self.get_object()

        # Check ownership
        if report_request.requested_by != request.user and request.user.role != 'Admin':
            return Response(
                {'error': 'You can only submit your own requests.'},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            report_request.submit(request.user)

            # Notify admins about new pending request
            from authentication.models import CustomUser
            template_name = report_request.template.name if report_request.template else 'Report'
            requester_name = request.user.get_full_name() or request.user.username

            admins = CustomUser.objects.filter(role='Admin', is_active=True)
            for admin in admins:
                Notification.objects.create(
                    recipient=admin,
                    sender=request.user,
                    title='New Report Request',
                    message=f'{requester_name} submitted a {template_name} request for approval.',
                    notification_type='info',
                )

            serializer = ReportRequestSerializer(report_request)
            return Response(serializer.data)
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        """
        Approve a submitted request (admin only).
        POST /api/reports/requests/{id}/approve/
        Optionally update body_text before approval.
        """
        report_request = self.get_object()

        serializer = ApproveRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            notes = serializer.validated_data.get('admin_notes', '')
            priority = serializer.validated_data.get('priority')
            body_text = serializer.validated_data.get('body_text')

            if priority:
                report_request.priority = priority

            # If body_text is provided, update it in the request and snapshot
            if body_text:
                report_request.body_text = body_text
                # Update the snapshot as well
                if report_request.content_snapshot:
                    report_request.content_snapshot['body_text'] = body_text
                    report_request.content_snapshot['admin_edited'] = True
                report_request.save()

            report_request.approve(request.user, notes)

            # Send notification to requester
            template_name = report_request.template.name if report_request.template else 'Report'
            Notification.objects.create(
                recipient=report_request.requested_by,
                sender=request.user,
                title='Request Approved',
                message=f'Your {template_name} request has been approved and is ready for download.',
                notification_type='success',
            )

            response_serializer = ReportRequestSerializer(report_request)
            return Response(response_serializer.data)
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """
        Reject a submitted request with a reason (admin only).
        POST /api/reports/requests/{id}/reject/
        """
        report_request = self.get_object()

        serializer = RejectRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            reason = serializer.validated_data['rejection_reason']
            notes = serializer.validated_data.get('admin_notes', '')
            report_request.reject(request.user, reason, notes)

            # Send notification to requester
            template_name = report_request.template.name if report_request.template else 'Report'
            Notification.objects.create(
                recipient=report_request.requested_by,
                sender=request.user,
                title='Request Rejected',
                message=f'Your {template_name} request was rejected. Reason: {reason}',
                notification_type='error',
            )

            response_serializer = ReportRequestSerializer(report_request)
            return Response(response_serializer.data)
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """
        Cancel a request.
        POST /api/reports/requests/{id}/cancel/
        """
        report_request = self.get_object()

        # Check ownership
        if report_request.requested_by != request.user and request.user.role != 'Admin':
            return Response(
                {'error': 'You can only cancel your own requests.'},
                status=status.HTTP_403_FORBIDDEN
            )

        reason = request.data.get('reason', '')

        try:
            report_request.cancel(request.user, reason)
            serializer = ReportRequestSerializer(report_request)
            return Response(serializer.data)
        except ValueError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'])
    def pending(self, request):
        """
        List pending approval requests (admin only).
        GET /api/reports/requests/pending/
        """
        queryset = ReportRequest.objects.filter(
            status='SUBMITTED'
        ).select_related(
            'requested_by', 'target_employee', 'template'
        ).order_by('-created_at')

        # Filter by priority
        priority = request.query_params.get('priority')
        if priority:
            queryset = queryset.filter(priority=priority)

        serializer = ReportRequestListSerializer(queryset, many=True)
        return Response({
            'count': queryset.count(),
            'results': serializer.data
        })

    @action(detail=False, methods=['get'], url_path='my-requests')
    def my_requests(self, request):
        """
        List current user's requests.
        GET /api/reports/requests/my-requests/
        """
        queryset = ReportRequest.objects.filter(
            requested_by=request.user
        ).select_related(
            'template', 'target_employee'
        ).order_by('-created_at')

        # Filter by status
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        serializer = ReportRequestListSerializer(queryset, many=True)
        return Response({
            'count': queryset.count(),
            'results': serializer.data
        })

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        Get request statistics (admin only).
        GET /api/reports/requests/stats/
        """
        total = ReportRequest.objects.count()
        by_status = dict(
            ReportRequest.objects.values('status')
            .annotate(count=Count('id'))
            .values_list('status', 'count')
        )

        return Response({
            'total': total,
            'pending': by_status.get('SUBMITTED', 0),
            'approved': by_status.get('APPROVED', 0),
            'rejected': by_status.get('REJECTED', 0),
            'generated': by_status.get('GENERATED', 0),
            'draft': by_status.get('DRAFT', 0),
        })

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """
        Download/generate PDF for an approved request.
        GET /api/reports/requests/{id}/download/
        Uses the unified PDF format.
        """
        report_request = self.get_object()

        # Check ownership or admin
        if report_request.requested_by != request.user and request.user.role != 'Admin':
            return Response(
                {'error': 'You can only download your own reports.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Only approved or generated requests can be downloaded
        if report_request.status not in ['APPROVED', 'GENERATED']:
            return Response(
                {'error': 'Only approved reports can be downloaded.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Get content from snapshot (frozen at submission time)
            content = report_request.content_snapshot or {}
            subject = content.get('subject', report_request.subject)
            body_text = content.get('body_text', report_request.body_text)
            recipient_text = content.get('recipient_text', report_request.recipient_text or 'TO WHOM IT MAY CONCERN')
            line_spacing = content.get('line_spacing', 'single')

            # Get approving admin info
            approving_admin_name = "Admin"
            approving_admin_title = "Administrator"
            if report_request.approved_by:
                admin = report_request.approved_by
                approving_admin_name = f"{admin.first_name} {admin.last_name}".strip() or admin.username
                try:
                    if hasattr(admin, 'teacher_profile') and admin.teacher_profile:
                        approving_admin_title = admin.teacher_profile.title or "Administrator"
                except Exception:
                    pass

            # Generate PDF using shared function
            pdf_buffer = generate_report_pdf(
                subject=subject,
                body_text=body_text,
                recipient_text=recipient_text,
                line_spacing=line_spacing,
                signer_name=approving_admin_name,
                signer_title=approving_admin_title,
                reference_number=report_request.request_number,
                approved_date=report_request.approved_at.strftime('%B %d, %Y') if report_request.approved_at else None,
            )

            # Mark as generated if not already
            if report_request.status == 'APPROVED':
                report_request.mark_generated(request.user)

            # Return PDF response
            response = HttpResponse(pdf_buffer.read(), content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="{report_request.request_number}.pdf"'
            return response

        except Exception as e:
            logger.error(f"Error generating PDF: {str(e)}")
            return Response(
                {'error': f'Failed to generate PDF: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )