import logging
from django.http import HttpResponse
from django.utils.timezone import now
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from students.models import Student, Attendance, LessonPlan
from django.db.models import Count
from datetime import datetime, timedelta
from weasyprint import HTML
from supabase import create_client
from django.conf import settings
import requests
from io import BytesIO
from PIL import Image as PILImage
import base64
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import html

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
        url_path = url.split('?')[0]
        extension = url_path.split('.')[-1].lower()
        supported_formats = {'jpeg': b'\xff\xd8', 'jpg': b'\xff\xd8', 'png': b'\x89PNG'}
        if extension not in supported_formats:
            logger.warning(f"Unsupported image format: {extension}")
            return None

        expected_signature = supported_formats[extension]
        headers = {'User-Agent': 'Mozilla/5.0', 'Accept-Encoding': 'identity'}

        session = requests.Session()
        retry = Retry(total=retries, backoff_factor=0.3, status_forcelist=[429, 500, 502, 503, 504])
        adapter = HTTPAdapter(max_retries=retry)
        session.mount('https://', adapter)

        response = session.get(url, headers=headers, timeout=timeout, allow_redirects=True)
        response.raise_for_status()

        content = response.content
        if not content.startswith(expected_signature):
            logger.warning(f"Invalid image signature for {extension}: {content[:8].hex()}")
            return None

        img = PILImage.open(BytesIO(content))
        if img.mode in ('RGBA', 'LA'):
            background = PILImage.new('RGB', img.size, (255, 255, 255))
            background.paste(img, mask=img.split()[-1])
            img = background

        if max_size:
            img.thumbnail(max_size, PILImage.LANCZOS)

        output_buffer = BytesIO()
        img_format = 'JPEG' if extension in ('jpeg', 'jpg') else 'PNG'
        img.save(output_buffer, format=img_format, quality=70)
        output_buffer.seek(0)

        if output_buffer.getbuffer().nbytes > 3 * 1024 * 1024:
            logger.warning(f"Image size too large: {output_buffer.getbuffer().nbytes} bytes")
            return None

        logger.info(f"Successfully fetched image from {url}")
        return output_buffer
    except Exception as e:
        logger.error(f"Error fetching image from {url}: {str(e)}")
        return None

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

def fetch_student_images(student_id, mode, month, start_date, image_ids=None):
    """Fetch image URLs for a student, optionally filtered by image_ids."""
    logger.info(f"Fetching images for student {student_id}, mode={mode}, month={month}, image_ids={image_ids}")
    folder_path = f"{student_id}/"
    supabase_response = supabase.storage.from_(settings.SUPABASE_BUCKET).list(folder_path)
    if "error" in supabase_response:
        logger.error(f"Supabase error fetching images for student {student_id}: {supabase_response['error']['message']}")
        return []

    prefix = month if mode == 'month' else start_date.strftime('%Y-%m')
    all_images = [
        {"name": file["name"], "url": supabase.storage.from_(settings.SUPABASE_BUCKET).create_signed_url(f"{folder_path}{file['name']}", 3600)['signedURL']}
        for file in supabase_response
        if file["name"].startswith(prefix)
    ]

    if image_ids:
        image_urls = [img["url"] for img in all_images if img["name"] in image_ids]
    else:
        image_urls = [img["url"] for img in all_images][:4]
    logger.info(f"Fetched {len(image_urls)} image URLs: {image_urls}")
    return image_urls

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_report_data(request):
    """Fetch all data needed for a student report."""
    logger.info(f"student_report_data request: {request.GET}")
    user = request.user
    try:
        student_id = request.GET.get('student_id')
        mode = request.GET.get('mode')
        month = request.GET.get('month')
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        school_id = request.GET.get('school_id')
        student_class = request.GET.get('student_class')

        if not student_id or not mode or (mode == 'month' and not month) or (mode == 'range' and not (start_date and end_date)):
            logger.warning("Missing required parameters in student_report_data")
            return Response({
                'message': 'Failed to fetch report data',
                'error': 'Missing required parameters: student_id, mode, and either month or start_date/end_date are required'
            }, status=400)

        if user.role == "Teacher":
            assigned_schools = user.assigned_schools.values_list("id", flat=True)
            if int(school_id) not in assigned_schools:
                logger.warning(f"Unauthorized access attempt by {user.username} to school {school_id}")
                return Response({"message": "Failed to fetch report data", "error": "Unauthorized access to this school"}, status=403)

        student = Student.objects.filter(id=student_id, school_id=school_id, student_class=student_class).first()
        if not student:
            logger.warning(f"Student not found: {student_id}")
            return Response({'message': 'Failed to fetch report data', 'error': 'Student not found'}, status=404)

        if mode == 'month':
            year, month_num = map(int, month.split('-'))
            start_date = datetime(year, month_num, 1).date()
            end_date = (datetime(year, month_num + 1, 1) - timedelta(days=1)).date() if month_num < 12 else datetime(year, 12, 31).date()
        else:
            try:
                start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
                end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
            except ValueError:
                logger.warning(f"Invalid date format: start_date={start_date}, end_date={end_date}")
                return Response({
                    'message': 'Failed to fetch report data',
                    'error': 'Invalid date format. Use YYYY-MM-DD'
                }, status=400)

        student_data = {
            "name": student.name,
            "reg_num": student.reg_num,
            "class": student.student_class,
            "school": student.school.name
        }

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
            "not_marked": next((item['count'] for item in attendance_records if item['status'] == "N/A"), 0),
            "total_days": total_days,
            "percentage": 0.0 if total_days == 0 else (next((item['count'] for item in attendance_records if item['status'] == "Present"), 0) / total_days * 100)
        }

        planned_lessons = LessonPlan.objects.filter(
            session_date__range=[start_date, end_date],
            school=student.school,
            student_class=student.student_class
        ).values("session_date", "planned_topic")
        planned_dict = {lesson["session_date"]: lesson["planned_topic"] for lesson in planned_lessons}
        achieved_lessons = Attendance.objects.filter(
            session_date__range=[start_date, end_date],
            student=student
        ).values("session_date", "achieved_topic")
        achieved_dict = {lesson["session_date"]: lesson["achieved_topic"] for lesson in achieved_lessons}
        lessons_data = [
            {
                "date": session_date,
                "planned_topic": planned_dict[session_date],
                "achieved_topic": achieved_dict.get(session_date, "N/A")
            }
            for session_date in sorted(planned_dict.keys())
        ]

        folder_path = f"{student_id}/"
        response = supabase.storage.from_(settings.SUPABASE_BUCKET).list(folder_path)
        if "error" in response:
            logger.error(f"Error fetching images for student {student_id}: {response['error']['message']}")
            images_data = []
        else:
            images_data = [
                supabase.storage.from_(settings.SUPABASE_BUCKET).create_signed_url(f"{folder_path}{file['name']}", 604800)['signedURL']
                for file in response
                if file["name"].startswith(month if mode == 'month' else start_date.strftime('%Y-%m'))
            ]

        logger.info(f"Successfully fetched report data for student {student_id}")
        return Response({
            "message": "Successfully fetched report data",
            "data": {
                "student": student_data,
                "attendance": attendance_data,
                "lessons": lessons_data,
                "images": images_data
            }
        }, status=200)
    except Exception as e:
        logger.error(f"Unexpected error in student_report_data: {str(e)}")
        return Response({
            "message": "Failed to fetch report data",
            "error": "An unexpected error occurred. Please try again later."
        }, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def generate_pdf(request):
    """Generate a PDF report for a single student without background image."""
    logger.info(f"generate_pdf request: {request.GET}")
    user = request.user
    try:
        student_id = request.GET.get('student_id')
        mode = request.GET.get('mode')
        month = request.GET.get('month')
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        school_id = request.GET.get('school_id')
        student_class = request.GET.get('student_class')
        image_ids = [x.strip() for x in request.GET.get('image_ids', '').split(',') if x.strip()]
        # New parameters for styling
        text_color = request.GET.get('text_color', '#000000')  # Default to black
        header_color = request.GET.get('header_color', '#3a5f8a')  # Default to existing header color
        row_color = request.GET.get('row_color', '#e6e6e6')  # Default to existing row color
        image_rotation = request.GET.get('image_rotation', '0')  # Default to 0 degrees

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

        # Fetch progress images from Supabase (optional)
        image_urls = fetch_student_images(student_id, mode, month, start_date, image_ids)
        logger.info(f"Progress image URLs: {image_urls}")
        buffer = generate_pdf_content(student, attendance_data, lessons_data, image_urls, period, text_color, header_color, row_color, image_rotation)
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
def generate_pdf_content(student, attendance_data, lessons_data, image_urls, period, text_color='#000000', header_color='#3a5f8a', row_color='#e6e6e6', image_rotation='0'):
    """Generate PDF content with A4 size, transparent background, and dynamic student data."""
    logger.info("Generating PDF content")


    # Fetch and encode progress images as base64 (now for 4 images)
    progress_images = []
    for url in image_urls[:4]:
        logger.info(f"Fetching progress image: {url}")
        img_buffer = fetch_image(url)
        if img_buffer:
            img_data = base64.b64encode(img_buffer.read()).decode("utf-8")
            img_mime = "image/jpeg" if url.lower().endswith(('.jpg', '.jpeg')) else "image/png"
            progress_images.append((img_data, img_mime))
            logger.info(f"Progress image fetched: {url}")
        else:
            progress_images.append(None)
            logger.warning(f"Failed to fetch progress image: {url}")

    # HTML template with dynamic content and pagination
    html_content = f"""
    <html>
    <head>
    <style>
      @page {{ 
        size: A4; 
        margin: 10mm; 
        padding-top: 30mm; /* Ensure space for logo on all pages */
      }}
      body {{ 
        margin: 0; 
        padding: 0; 
        font-family: Arial, sans-serif; 
        background-color: transparent; 
        color: {text_color}; /* Dynamic text color */
      }}
      .content {{ 
        padding: 15mm; 
        padding-top: 10mm; /* Consistent padding for all pages */
        color: {text_color}; 
        background-color: transparent; 
        border-radius: 5mm; 
        box-shadow: 0 2px 5px rgba(0,0,0,0.1); 
        min-height: 257mm; /* A4 height minus margins */
        page-break-before: always; /* Ensure each content block starts on a new page */
      }}
      h1 {{ 
        font-size: 20pt; 
        margin-bottom: 8mm; 
        text-align: center; 
      }}
      h2 {{ 
        font-size: 16pt; 
        margin: 8mm 0 4mm; 
        border-bottom: 1px solid #ccc; 
        padding-bottom: 2mm; 
      }}
      p {{ 
        font-size: 10pt; 
        line-height: 1.4; 
        margin-bottom: 8mm; 
      }}
      table.student-details {{ 
        width: 100%; 
        border-collapse: collapse; 
        margin-bottom: 8mm; 
      }}
      table.student-details th, table.student-details td {{ 
        border: 1px solid #bbb; 
        padding: 2mm; 
        text-align: left; 
        font-size: 10pt; 
      }}
      table.student-details th {{ 
        background-color: {header_color}; /* Dynamic header color */
        color: white; 
      }}
      table.student-details tr:nth-child(even) {{ 
        background-color: {row_color}; /* Dynamic row color */
      }}
      table.lessons {{ 
        width: 100%; 
        border-collapse: collapse; 
        margin-bottom: 8mm; 
      }}
      table.lessons th, table.lessons td {{ 
        border: 2px solid #bbb; 
        padding: 2mm; 
        text-align: left; 
        font-size: 10pt; 
      }}
      table.lessons th {{ 
        background-color: {header_color}; /* Dynamic header color */
        color: white; 
      }}
      table.lessons tr:nth-child(even) {{ 
        background-color: {row_color}; /* Dynamic row color */
      }}
      tr {{ 
        page-break-inside: avoid; 
        page-break-after: auto; 
      }}
      .image-grid {{ 
        display: flex; 
        flex-wrap: wrap; 
        gap: 5mm; 
        margin-bottom: 8mm; 
      }}
      .image-grid img {{
        width: 93.5mm;
        height: 58.44mm;
        object-fit: cover;
        border-radius: 2mm;
        border: 1px solid #ccc;
        background-color: white;
        
        transform: rotate({image_rotation}deg);
        }}
      .footer {{ 
        font-size: 8pt; 
        text-align: center; 
        margin-top: 8mm; 
        color: #666; 
      }}
      .checkmark {{ 
        color: green; 
        font-size: 12pt; 
      }}
    </style>
    </head>
    <body>
    <div class="content">
      <h1>{html.escape(student.school.name)}</h1>
      <h2>Monthly Student Report</h2>
      <h2>Student Details</h2>
      <table class="student-details">
        <tr><th>Name</th><td>{html.escape(student.name)}</td></tr>
        <tr><th>Registration Number</th><td>{html.escape(student.reg_num)}</td></tr>
        <tr><th>Class</th><td>{html.escape(student.student_class)}</td></tr>
        <tr><th>Reporting Period</th><td>{html.escape(period)}</td></tr>
      </table>
      <h2>Attendance</h2>
      <p>{attendance_data['present']}/{attendance_data['total_days']} days ({attendance_data['percentage']:.1f}%)</p>
      <h2>Lessons Overview</h2>
      <table class="lessons">
        <tr><th>Date</th><th>Planned Topic</th><th>Achieved Topic</th></tr>
        {"".join([f"<tr><td>{html.escape(lesson['date'])}</td><td>{html.escape(lesson['planned_topic'])}</td><td>{html.escape(lesson['achieved_topic'])}<span class='checkmark'>{('&#10003;' if lesson['planned_topic'] == lesson['achieved_topic'] else '')}</span></td></tr>" for lesson in lessons_data])}
      </table>
      <h2>Progress Images</h2>
      <div class="image-grid">
        {"".join([f"<img src='data:{img_mime};base64,{img_data}'/>" if img_data else "<p>Image Not Available</p>" for img_data, img_mime in progress_images])}
      </div>
      <p class="footer">Teacher's Signature: ____________________ | Generated: {datetime.now().strftime('%b %d, %Y %I:%M %p')} | Powered by Koder Kids</p>
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

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def preview_pdf_html(request):
    """Return the HTML content of the PDF for preview with optional image rotation."""
    logger.info(f"preview_pdf_html request: {request.GET}")
    user = request.user
    try:
        student_id = request.GET.get('student_id')
        mode = request.GET.get('mode')
        month = request.GET.get('month')
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        school_id = request.GET.get('school_id')
        student_class = request.GET.get('student_class')
        image_ids = [x.strip() for x in request.GET.get('image_ids', '').split(',') if x.strip()]
        text_color = request.GET.get('text_color', '#000000')
        header_color = request.GET.get('header_color', '#3a5f8a')
        row_color = request.GET.get('row_color', '#e6e6e6')
        image_rotation = request.GET.get('image_rotation', '0')  # Default to 0 degrees

        if not all([student_id, mode, school_id, student_class]):
            logger.warning("Missing required parameters in preview_pdf_html")
            return Response({
                'message': 'Failed to preview HTML',
                'error': 'Missing required parameters: student_id, mode, school_id, student_class'
            }, status=400)

        if user.role == "Teacher":
            if int(school_id) not in user.assigned_schools.values_list("id", flat=True):
                logger.warning(f"Unauthorized access attempt by {user.username} to school {school_id}")
                return Response({
                    "message": "Failed to preview HTML",
                    "error": "Unauthorized access to this school"
                }, status=403)

        start_date, end_date, period = get_date_range(mode, month, start_date, end_date)
        student, attendance_data, lessons_data = fetch_student_data(student_id, school_id, student_class, start_date, end_date)
        if not student:
            logger.warning(f"Student not found: {student_id}")
            return Response({'message': 'Failed to preview HTML', 'error': 'Student not found'}, status=404)

        image_urls = fetch_student_images(student_id, mode, month, start_date, image_ids)
        logger.info(f"Progress image URLs: {image_urls}")

        # Generate HTML content with preview-specific edits
        progress_images = []
        for url in image_urls[:4]:
            img_buffer = fetch_image(url)
            if img_buffer:
                img_data = base64.b64encode(img_buffer.read()).decode("utf-8")
                img_mime = "image/jpeg" if url.lower().endswith(('.jpg', '.jpeg')) else "image/png"
                progress_images.append((img_data, img_mime))
            else:
                progress_images.append(None)

        html_content = f"""
        <html>
        <head>
        <style>
          @page {{ 
            size: A4; 
            margin: 10mm; 
            padding-top: 30mm;
          }}
          body {{ 
            margin: 0; 
            padding: 0; 
            font-family: Arial, sans-serif; 
            background-color: transparent; 
            color: {text_color};
            background-image: url('/bg.png'); /* Simulate background image for preview */
            background-size: cover;
            background-repeat: no-repeat;
            background-position: top left;
          }}
          .content {{ 
            padding: 15mm; 
            padding-top: 50mm; 
            color: {text_color}; 
            background-color: transparent; 
            border-radius: 5mm; 
            box-shadow: 0 2px 5px rgba(0,0,0,0.1); 
            min-height: 257mm;
            page-break-before: always;
          }}
          h1 {{ 
            font-size: 20pt; 
            margin-bottom: 8mm; 
            text-align: center; 
          }}
          h2 {{ 
            font-size: 16pt; 
            margin: 8mm 0 4mm; 
            border-bottom: 1px solid #ccc; 
            padding-bottom: 2mm; 
          }}
          p {{ 
            font-size: 10pt; 
            line-height: 1.4; 
            margin-bottom: 8mm; 
          }}
          table.student-details {{ 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 8mm; 
          }}
          table.student-details th, table.student-details td {{ 
            border: 1px solid #bbb; 
            padding: 2mm; 
            text-align: left; 
            font-size: 10pt; 
          }}
          table.student-details th {{ 
            background-color: {header_color}; 
            color: white; 
          }}
          table.student-details tr:nth-child(even) {{ 
            background-color: {row_color}; 
          }}
          table.lessons {{ 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 8mm; 
          }}
          table.lessons th, table.lessons td {{ 
            border: 2px solid #bbb; 
            padding: 2mm; 
            text-align: left; 
            font-size: 10pt; 
          }}
          table.lessons th {{ 
            background-color: {header_color}; 
            color: white; 
          }}
          table.lessons tr:nth-child(even) {{ 
            background-color: {row_color}; 
          }}
          tr {{ 
            page-break-inside: avoid; 
            page-break-after: auto; 
          }}
          .image-grid {{ 
            display: flex; 
            flex-wrap: wrap; 
            gap: 5mm; 
            margin-bottom: 8mm; 
          }}
          .image-grid img {{ 
            width: 93.5mm; 
            height: 58.44mm; 
            object-fit: cover; 
            border-radius: 2mm; 
            border: 1px solid #ccc; 
            background-color: white; 
            transform: rotate({image_rotation}deg); /* Apply rotation */
          }}
          .footer {{ 
            font-size: 8pt; 
            text-align: center; 
            margin-top: 8mm; 
            color: #666; 
          }}
          .checkmark {{ 
            color: green; 
            font-size: 12pt; 
          }}
        </style>
        </head>
        <body>
        <div class="content">
          <h1>{html.escape(student.school.name)}</h1>
          <h2>Monthly Student Report</h2>
          <h2>Student Details</h2>
          <table class="student-details">
            <tr><th>Name</th><td>{html.escape(student.name)}</td></tr>
            <tr><th>Registration Number</th><td>{html.escape(student.reg_num)}</td></tr>
            <tr><th>Class</th><td>{html.escape(student.student_class)}</td></tr>
            <tr><th>Reporting Period</th><td>{html.escape(period)}</td></tr>
          </table>
          <h2>Attendance</h2>
          <p>{attendance_data['present']}/{attendance_data['total_days']} days ({attendance_data['percentage']:.1f}%)</p>
          <h2>Lessons Overview</h2>
          <table class="lessons">
            <tr><th>Date</th><th>Planned Topic</th><th>Achieved Topic</th></tr>
            {"".join([f"<tr><td>{html.escape(lesson['date'])}</td><td>{html.escape(lesson['planned_topic'])}</td><td>{html.escape(lesson['achieved_topic'])}<span class='checkmark'>{('✓' if lesson['planned_topic'] == lesson['achieved_topic'] else '')}</span></td></tr>" for lesson in lessons_data])}
          </table>
          <h2>Progress Images</h2>
          <div class="image-grid">
            {"".join([f"<img src='data:{img_mime};base64,{img_data}'/>" if img_data else "<p>Image Not Available</p>" for img_data, img_mime in progress_images])}
          </div>
          <p class="footer">Teacher's Signature: ____________________ | Generated: {datetime.now().strftime('%b %d, %Y %I:%M %p')} | Powered by Koder Kids</p>
        </div>
        </body>
        </html>
        """
        return HttpResponse(html_content, content_type='text/html')
    except ValueError as e:
        logger.warning(f"Validation error: {str(e)}")
        return Response({'message': 'Failed to preview HTML', 'error': str(e)}, status=400)
    except Exception as e:
        logger.error(f"Unexpected error in preview_pdf_html: {str(e)}")
        return Response({
            "message": "Failed to preview HTML",
            "error": "An unexpected error occurred"
        }, status=500)
    



