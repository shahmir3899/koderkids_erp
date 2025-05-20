import logging
from django.http import HttpResponse
from django.utils.timezone import now
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from students.models import Student, Attendance, LessonPlan
from django.db.models import Count
from datetime import datetime, timedelta
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from supabase import create_client
from django.conf import settings
import requests
from io import BytesIO
from PIL import Image as PILImage
from reportlab.lib.utils import ImageReader
from django.contrib.staticfiles import finders
import time

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


# Load background image from static files
BG_IMAGE = None
static_path = finders.find('images/bg.png')
if static_path:
    try:
        BG_IMAGE = ImageReader(static_path)
        logger.info("Successfully loaded local background image")
    except Exception as e:
        logger.error(f"Error loading local background image: {str(e)}")
else:
    logger.warning("Local background image not found; skipping background")

def fetch_image(url, timeout=15, max_size=(1200, 1200)):
    """
    Fetch image from URL with robust error handling and resizing.
    Returns BytesIO object with image data or None if failed.
    """
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
        headers = {'User-Agent': 'Mozilla/5.0', 'Referer': 'https://koderkids-erp.onrender.com/', 'Accept-Encoding': 'identity'}
        response = requests.get(url, headers=headers, timeout=timeout, allow_redirects=True)
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
        img.save(output_buffer, format=img_format, quality=85)
        output_buffer.seek(0)

        if output_buffer.getbuffer().nbytes > 10 * 1024 * 1024:
            logger.warning(f"Image size too large: {output_buffer.getbuffer().nbytes} bytes")
            return None

        return output_buffer
    except Exception as e:
        logger.error(f"Error fetching image: {str(e)}")
        return None

def get_date_range(mode, month, start_date, end_date):
    """Parse and validate date range for reports."""
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
    return start_date, end_date, period

def fetch_student_data(student_id, school_id, student_class, start_date, end_date):
    """Fetch student, attendance, and lesson data efficiently."""
    student = Student.objects.filter(id=student_id, school_id=school_id, student_class=student_class).select_related('school').first()
    if not student:
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

    return student, attendance_data, lessons_data

def fetch_student_images(student_id, mode, month, start_date, image_ids=None):
    """Fetch image URLs for a student, optionally filtered by image_ids."""
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

    return image_urls

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_report_data(request):
    """Fetch all data needed for a student report."""
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
            " ordinarily name": student.name,
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
    """Generate a PDF report for a single student."""
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

        image_urls = fetch_student_images(student_id, mode, month, start_date, image_ids)
        buffer = generate_pdf_content(student, attendance_data, lessons_data, image_urls, period)

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

def generate_pdf_content(student, attendance_data, lessons_data, image_urls, period):
    """Generate PDF content with adjusted spacing to prevent text overlap."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=20*mm, leftMargin=20*mm, topMargin=15*mm, bottomMargin=20*mm)
    elements = []
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(name='Title', fontSize=18, textColor=colors.HexColor('#2c3e50'), alignment=TA_CENTER, spaceAfter=20, fontName='Helvetica-Bold')
    header_style = ParagraphStyle(name='Header', fontSize=14, textColor=colors.white, spaceAfter=15, spaceBefore=10, fontName='Helvetica-Bold', backColor=colors.HexColor('#3a5f8a'), leading=30)
    table_header_style = [
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#3a5f8a')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTSIZE', (0,0), (-1,0), 10),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#dddddd')),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor('#f8f9fa')]),
        ('LEADING', (0,0), (-1,-1), 16),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8)
    ]
    details_table_style = [
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor('#f0f0f0')),
        ('TEXTCOLOR', (0,0), (-1,0), colors.black),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor('#dddddd')),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 8),
        ('LEADING', (0,0), (-1,-1), 16)
    ]

    def draw_background(canvas, doc):
        canvas.saveState()
        if BG_IMAGE:
            canvas.drawImage(BG_IMAGE, 0, 0, width=A4[0], height=A4[1], preserveAspectRatio=True, anchor='c')
        else:
            logger.warning("No background image available; skipping background")
        page_num = canvas.getPageNumber()
        canvas.setFont('Helvetica', 9)
        canvas.drawRightString(A4[0]-20*mm, 10*mm, f"Page {page_num}")
        canvas.restoreState()

    header_content = [[Paragraph(f"{student.school.name}<br/>Monthly Student Report", title_style)]]
    header_table = Table(header_content, colWidths=[190*mm])
    header_table.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'MIDDLE'), ('BOTTOMPADDING', (0,0), (-1,-1), 10), ('ALIGN', (0,0), (-1,-1), 'CENTER')]))
    elements.append(header_table)
    elements.append(Spacer(1, 5*mm))

    elements.append(Paragraph("<para backColor='#3a5f8a' spaceBefore=15>Student Details</para>", header_style))
    details_data = [
        [Paragraph("Name:", styles['BodyText']), Paragraph(student.name, styles['BodyText'])],
        [Paragraph("Registration Number:", styles['BodyText']), Paragraph(student.reg_num, styles['BodyText'])],
        [Paragraph("Class:", styles['BodyText']), Paragraph(student.student_class, styles['BodyText'])],
        [Paragraph("Reporting Period:", styles['BodyText']), Paragraph(period, styles['BodyText'])]
    ]
    details_table = Table(details_data, colWidths=[45*mm, 125*mm])
    details_table.setStyle(TableStyle(details_table_style))
    elements.append(details_table)
    elements.append(Spacer(1, 5*mm))

    elements.append(Paragraph("<para backColor='#3a5f8a' spaceBefore=15>Attendance</para>", header_style))
    attendance_text = f"{attendance_data['present']}/{attendance_data['total_days']} days ({attendance_data['percentage']:.1f}%)"
    elements.append(Paragraph(attendance_text, ParagraphStyle(name='Attendance', fontSize=12, textColor=colors.HexColor('#2c3e50'), backColor=colors.HexColor('#e6f0fa'), padding=6, spaceAfter=10)))
    elements.append(Spacer(1, 10*mm))

    if lessons_data:
        lessons_rows = [['Date', 'Planned Topic', 'Achieved Topic']]
        for lesson in lessons_data:
            status = '✓' if lesson['planned_topic'] == lesson['achieved_topic'] else ''
            lessons_rows.append([
                Paragraph(lesson['date'], styles['BodyText']),
                Paragraph(lesson['planned_topic'], styles['BodyText']),
                Paragraph(f"{lesson['achieved_topic']} <font color='green'>{status}</font>", styles['BodyText'])
            ])
        lessons_table = Table(lessons_rows, colWidths=[30*mm, 70*mm, 70*mm])
        lessons_table.setStyle(TableStyle(table_header_style + [('VALIGN', (0,0), (-1,-1), 'TOP'), ('MINIMUMHEIGHT', (0,0), (-1,-1), 8*mm)]))
        elements.append(Spacer(1, 5*mm))
        elements.append(Paragraph("<para backColor='#3a5f8a' spaceBefore=15>Lessons Overview</para>", header_style))
        elements.append(lessons_table)

    if image_urls:
        elements.append(Spacer(1, 15*mm))
        elements.append(Paragraph("<para backColor='#3a5f8a' spaceBefore=15>Progress Images</para>", header_style))
        images = []
        for url in image_urls[:4]:
            try:
                img_buffer = fetch_image(url)
                if img_buffer:
                    img = Image(img_buffer, width=80*mm, height=50*mm)
                    images.append(img)
                else:
                    images.append(Paragraph("Image Not Available\n", styles['Italic']))
            except Exception as e:
                logger.error(f"Error loading image: {str(e)}")
                images.append(Paragraph("Image Load Error\n", styles['Italic']))
        image_grid = [images[i:i+2] for i in range(0, len(images), 2)]
        for row in image_grid:
            img_table = Table([row], colWidths=[80*mm]*2)
            elements.append(img_table)
            elements.append(Spacer(1, 10*mm))

    footer_text = f"Teacher's Signature: ____________________ | Generated: {datetime.now().strftime('%b %d, %Y %I:%M %p')} | Powered by Koder Kids"
    footer = Paragraph(footer_text, ParagraphStyle(name='Footer', fontSize=9, textColor=colors.HexColor('#666666'), alignment=TA_CENTER, spaceBefore=20*mm))
    elements.append(footer)

    doc.build(elements, onFirstPage=draw_background, onLaterPages=draw_background)
    buffer.seek(0)
    return buffer
