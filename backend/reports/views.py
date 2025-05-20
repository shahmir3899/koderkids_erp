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
import logging
from supabase import create_client
from django.conf import settings
import requests
from io import BytesIO
import brotli
from PIL import Image as PILImage
from concurrent.futures import ThreadPoolExecutor
from zipfile import ZipFile, ZIP_DEFLATED
from reportlab.graphics.shapes import Drawing, Rect, String
from reportlab.graphics import renderPDF
from reportlab.graphics.charts.piecharts import Pie
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import os

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

def fetch_image(url, timeout=15, max_size=(1200, 1200)):
    """
    Fetch image from URL with robust error handling, decompression, and resizing.
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
        if response.headers.get('Content-Encoding') == 'br':
            content = brotli.decompress(content)

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

def fetch_images_in_parallel(image_urls, max_workers=4):
    """Fetch multiple images in parallel using ThreadPoolExecutor."""
    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        return list(executor.map(fetch_image, image_urls))

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
        image_urls = [img["url"] for img in all_images][:4]  # Default to first 4 images

    return image_urls

def generate_pdf_content(student, attendance_data, lessons_data, image_urls, period):
    """Generate PDF content using ReportLab."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=15*mm, leftMargin=15*mm, topMargin=15*mm, bottomMargin=15*mm)
    elements = []
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(name='Title', fontSize=18, textColor=colors.HexColor('#2c3e50'), alignment=TA_CENTER, spaceAfter=6, fontName='Helvetica-Bold')
    header_style = ParagraphStyle(name='Header', fontSize=14, textColor=colors.HexColor('#2c3e50'), spaceAfter=4, fontName='Helvetica-Bold', underline=1)
    normal_style = ParagraphStyle(name='Normal', fontSize=10, textColor=colors.HexColor('#333333'), spaceAfter=2, leading=12, fontName='Helvetica')
    footer_style = ParagraphStyle(name='Footer', fontSize=8, textColor=colors.HexColor('#7f8c8d'), alignment=TA_LEFT, leading=10)

    elements.append(Paragraph(student.school.name, title_style))
    elements.append(Paragraph("Monthly Student Report", title_style))
    elements.append(Spacer(1, 6*mm))
    elements.append(Paragraph("Student Details", header_style))
    elements.extend([
        Paragraph(f"<b>Name:</b> {student.name}", normal_style),
        Paragraph(f"<b>Registration Number:</b> {student.reg_num}", normal_style),
        Paragraph(f"<b>School:</b> {student.school.name}", normal_style),
        Paragraph(f"<b>Class:</b> {student.student_class}", normal_style),
        Paragraph(f"<b>Month/Date Range:</b> {period}", normal_style),
    ])
    elements.append(Spacer(1, 6*mm))
    elements.append(Paragraph("Attendance", header_style))
    attendance_status_color = 'green' if attendance_data['percentage'] >= 75 else 'red' if attendance_data['percentage'] < 50 else 'orange'
    attendance_text = f"{attendance_data['present']}/{attendance_data['total_days']} days ({attendance_data['percentage']:.2f}%)"
    elements.append(Paragraph(f"{attendance_text} <font color='{attendance_status_color}'>&bull;</font>", normal_style))
    elements.append(Spacer(1, 6*mm))
    elements.append(Paragraph("Lessons Overview", header_style))
    if lessons_data:
        lessons_table = Table(
            [['Date', 'Planned Topic', 'Achieved Topic']] + [
                [
                    Paragraph(lesson['date'], normal_style),
                    Paragraph(lesson['planned_topic'], normal_style),
                    Paragraph(
                        f"{lesson['achieved_topic']} " + (
                            '<font color="green">&check;</font>' 
                            if lesson['planned_topic'] == lesson['achieved_topic'] and lesson['achieved_topic'] != "N/A" 
                            else ''
                        ),
                        normal_style
                    )
                ] for lesson in lessons_data
            ],
            colWidths=[30*mm, 65*mm, 65*mm]
        )
        lessons_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2 bounty0')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('LEADING', (0, 0), (-1, -1), 11),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#ddd')),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8f9fa')]),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(lessons_table)
    else:
        elements.append(Paragraph("No lessons found for the selected date range.", normal_style))
    elements.append(Spacer(1, 6*mm))
    elements.append(Paragraph("Progress Images", header_style))
    image_table_data = []
    image_slots = image_urls[:4] + [None] * (4 - min(len(image_urls), 4))
    image_buffers = fetch_images_in_parallel(image_slots[:4])

    for i in range(0, 4, 2):
        row = []
        for j in range(2):
            idx = i + j
            img_data = image_buffers[idx] if idx < len(image_buffers) and image_buffers[idx] else None
            if img_data and img_data.getbuffer().nbytes > 0:
                img_data.seek(0)
                img = Image(img_data)
                img.drawWidth, img.drawHeight = 75*mm, 50*mm
                row.append(img)
            else:
                row.append(Paragraph("No Image", normal_style))
        image_table_data.append(row)

    image_table = Table(image_table_data, colWidths=[80*mm, 80*mm], rowHeights=55*mm)
    image_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BACKGROUND', (0, 0), (-1, -1), colors.white),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#ddd')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(image_table)
    if len(image_urls) > 4:
        elements.append(Paragraph(
            f"Note: Showing 4 of {len(image_urls)} images available.",
            ParagraphStyle(name='Small', fontSize=8, textColor=colors.gray, alignment=TA_CENTER)
        ))
    elements.append(Spacer(1, 6*mm))

    footer_text = (
        f"Teacher's Signature: ____________________<br/>"
        f"Generated on: {datetime.now().strftime('%B %d, %Y, %I:%M %p PKT')}<br/>"
        f"<i>Powered by {student.school.name}</i>"
    )
    elements.append(Paragraph(footer_text, footer_style))

    doc.build(elements)
    buffer.seek(0)
    return buffer

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

        student = Student.objects.filter(
            id=student_id, school_id=school_id, student_class=student_class
        ).first()
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
            return Response({'message': 'Failed to generate PDF', 'error': 'Student not found'}, status=404)  # Fixed typo

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
    """Generate PDF content using ReportLab with icons and full-length header backgrounds."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=20*mm, leftMargin=20*mm, topMargin=20*mm, bottomMargin=20*mm)
    elements = []
    styles = getSampleStyleSheet()

    # Define custom styles
    title_style = ParagraphStyle(name='Title', fontSize=20, textColor=colors.HexColor('#1a3c5a'), alignment=TA_CENTER, spaceAfter=10, fontName='Helvetica-Bold')
    header_style = ParagraphStyle(name='Header', fontSize=16, textColor=colors.white, spaceAfter=8, spaceBefore=12, fontName='Helvetica-Bold')
    normal_style = ParagraphStyle(name='Normal', fontSize=10, textColor=colors.HexColor('#333333'), spaceAfter=4, leading=12, fontName='Helvetica')
    label_style = ParagraphStyle(name='Label', parent=normal_style, fontName='Helvetica-Bold')
    footer_style = ParagraphStyle(name='Footer', fontSize=9, textColor=colors.HexColor('#7f8c8d'), alignment=TA_CENTER, leading=12, spaceBefore=10)

    # Define background color for each page
    def draw_background(canvas, doc):
        canvas.saveState()
        canvas.setFillColor(colors.HexColor('#f5f7fa'))
        canvas.rect(0, 0, A4[0], A4[1], fill=1, stroke=0)
        canvas.restoreState()

    # Simulated Logo
    logo_drawing = Drawing(50*mm, 25*mm)
    logo_rect = Rect(0, 0, 50*mm, 25*mm, fillColor=colors.HexColor('#2c3e50'), strokeColor=colors.HexColor('#1a3c5a'))
    logo_drawing.add(logo_rect)
    logo_text = String(25*mm, 12.5*mm, "School Logo", fontName='Helvetica-Bold', fontSize=14, fillColor=colors.white)
    logo_text.textAnchor = 'middle'
    logo_drawing.add(logo_text)

    # Header section with logo and title on same line
    title_table = Table([[student.school.name], ["Monthly Student Report"]], colWidths=[70*mm])
    title_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#2c3e50')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 20),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    header_section = Table([[logo_drawing, title_table, None]], colWidths=[50*mm, 70*mm, 50*mm])
    header_section.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    elements.append(header_section)

    elements.append(Spacer(1, 15*mm))

    # Student Details Section
    elements.append(Paragraph("Student Details", header_style))
    details_table = Table([
        [Paragraph("<img src='icons/person.png' width='16' height='16'/> Name:", label_style), Paragraph(student.name, normal_style)],
        [Paragraph("<img src='icons/id.png' width='16' height='16'/> Registration Number:", label_style), Paragraph(student.reg_num, normal_style)],
        [Paragraph("<img src='icons/school.png' width='16' height='16'/> School:", label_style), Paragraph(student.school.name, normal_style)],
        [Paragraph("<img src='icons/class.png' width='16' height='16'/> Class:", label_style), Paragraph(student.student_class, normal_style)],
        [Paragraph("<img src='icons/calendar.png' width='16' height='16'/> Month/Date Range:", label_style), Paragraph(period, normal_style)]
    ], colWidths=[40*mm, 130*mm])
    details_table.setStyle(TableStyle([
        ('ROWBACKGROUNDS', (0, 0), (-1, -1), [colors.HexColor('#e6f0fa'), colors.HexColor('#ffffff')]),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#ddd')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#ddd')),
    ]))
    elements.append(details_table)

    elements.append(Spacer(1, 15*mm))

    # Attendance Section
    attendance_header = Table([["Attendance"]], colWidths=[170*mm])
    attendance_header.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#2c3e50')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), 0, (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 16),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(attendance_header)

    elements.append(Spacer(1, 8*mm))

    attendance_status_color = 'green' if attendance_data['percentage'] >= 75 else 'red' if attendance_data['percentage'] < 50 else 'orange'
    attendance_text = f"{attendance_data['present']}/{attendance_data['total_days']} days ({attendance_data['percentage']:.2f}%)"
    attendance_table = Table([[f"{attendance_text}  ", f"<font color='{attendance_status_color}'>●</font>"]], colWidths=[100*mm, 10*mm])
    attendance_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#e6f0fa')),
        ('FONTSIZE', (0, 0), (-1, -1), 12),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#ddd')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(attendance_table)

    elements.append(Spacer(1, 15*mm))

    # Lessons Overview Section
    lessons_header = Table([["Lessons Overview"]], colWidths=[170*mm])
    lessons_header.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#2c3e50')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 16),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(lessons_header)

    elements.append(Spacer(1, 8*mm))

    if lessons_data:
        lessons_table = Table(
            [['Date', 'Planned Topic', 'Achieved Topic']] + [
                [
                    Paragraph(lesson['date'], normal_style),
                    Paragraph(lesson['planned_topic'], normal_style),
                    Paragraph(
                        f"{lesson['achieved_topic']} " + (
                            '<font color="green">✓</font>'
                            if lesson['planned_topic'] == lesson['achieved_topic'] and lesson['achieved_topic'] != "N/A"
                            else ''
                        ),
                        normal_style
                    )
                ] for lesson in lessons_data
            ],
            colWidths=[35*mm, 70*mm, 65*mm]
        )
        lessons_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4a6fa5')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('LEADING', (0, 0), (-1, -1), 12),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#ddd')),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8f9fa')]),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
        elements.append(lessons_table)
    else:
        elements.append(Paragraph("No lessons found for the selected date range.", normal_style))

    elements.append(Spacer(1, 15*mm))

    # Progress Images Section
    images_header = Table([["Progress Images"]], colWidths=[170*mm])
    images_header.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#2c3e50')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 16),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(images_header)

    elements.append(Spacer(1, 8*mm))

    image_table_data = []
    image_slots = image_urls[:4] + [None] * (4 - min(len(image_urls), 4))
    image_buffers = fetch_images_in_parallel(image_slots[:4])

    for i in range(0, 4, 2):
        row = []
        for j in range(2):
            idx = i + j
            img_data = image_buffers[idx] if idx < len(image_buffers) and image_buffers[idx] else None
            if img_data and img_data.getbuffer().nbytes > 0:
                img_data.seek(0)
                img = Image(img_data)
                img.drawWidth, img.drawHeight = 75*mm, 50*mm
                row.append(img)
            else:
                row.append(Paragraph("No Image", normal_style))
        image_table_data.append(row)

    image_table = Table(image_table_data, colWidths=[85*mm, 85*mm], rowHeights=60*mm)
    image_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#e6f0fa')),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#ccc')),
        ('INNERGRID', (0, 0), (-1, -1), 1, colors.HexColor('#ccc')),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(image_table)

    if len(image_urls) > 4:
        elements.append(Paragraph(
            f"Note: Showing 4 of {len(image_urls)} images available.",
            ParagraphStyle(name='Small', fontSize=8, textColor=colors.HexColor('#888888'), alignment=TA_CENTER, spaceBefore=6)
        ))

    elements.append(Spacer(1, 15*mm))

    # Footer Section
    footer_table = Table([[
        f"Teacher's Signature: ____________________  |  Generated on: {datetime.now().strftime('%B %d, %Y, %I:%M %p PKT')}  |  Powered by {student.school.name}"
    ]], colWidths=[170*mm])
    footer_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#2c3e50')),
        ('TEXTCOLOR', (0, 0), (-1, -1), colors.white),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    elements.append(footer_table)

    # Build the PDF
    doc.build(elements, onFirstPage=draw_background, onLaterPages=draw_background)
    buffer.seek(0)
    return buffer


