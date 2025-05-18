from django.http import HttpResponse
from django.utils.timezone import now
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from students.models import Student, Attendance, LessonPlan, StudentImage
from django.db.models import Count
from datetime import datetime, timedelta
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.utils import ImageReader
from reportlab.lib.enums import TA_LEFT, TA_CENTER
import logging
from supabase import create_client
from django.conf import settings
import requests
from io import BytesIO
from zipfile import ZipFile
import urllib.parse

# Set up logging
logger = logging.getLogger(__name__)

# Initialize Supabase Client
supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

def get_clean_image_url(url):
    """Preserve token in Supabase URL for proper access"""
    if not url or not isinstance(url, str):
        return None
    return url  # Keep the signed URL intact with token

def fetch_image(url, timeout=15):
    """Fetch image with proper headers, redirect handling, and error logging"""
    if not url:
        return None
    clean_url = get_clean_image_url(url)
    if not clean_url:
        return None
    try:
        headers = {'User-Agent': 'Mozilla/5.0', 'Referer': 'https://koderkids-erp.onrender.com/'}
        response = requests.get(clean_url, headers=headers, timeout=timeout, allow_redirects=True, stream=True)
        response.raise_for_status()
        if not response.headers.get('Content-Type', '').startswith('image/'):
            raise ValueError(f"URL does not point to an image, Content-Type: {response.headers.get('Content-Type')}")
        img_data = BytesIO(response.content)
        # Validate image data by checking if it can be read
        img_reader = ImageReader(img_data)
        img_reader.getSize()  # This will raise an exception if invalid
        img_data.seek(0)  # Reset pointer after validation
        return img_data
    except requests.RequestException as e:
        logger.error(f"Network error fetching image from {clean_url}: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"Error processing image from {clean_url}: {str(e)}")
        return None

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_report_data(request):
    """Fetch all data needed for a student report"""
    user = request.user
    try:
        student_id = request.GET.get('student_id')
        mode = request.GET.get('mode')
        month = request.GET.get('month')  # YYYY-MM
        start_date = request.GET.get('start_date')  # YYYY-MM-DD
        end_date = request.GET.get('end_date')  # YYYY-MM-DD
        school_id = request.GET.get('school_id')
        student_class = request.GET.get('student_class')

        # Validate inputs
        if not student_id or not mode or (mode == 'month' and not month) or (mode == 'range' and not (start_date and end_date)):
            return Response({'error': 'Missing required parameters'}, status=400)

        # Validate school access for teachers
        if user.role == "Teacher":
            assigned_schools = user.assigned_schools.values_list("id", flat=True)
            if int(school_id) not in assigned_schools:
                return Response({"error": "Unauthorized access to this school"}, status=403)

        # Fetch student data
        student = Student.objects.filter(
            id=student_id, school_id=school_id, student_class=student_class
        ).first()
        if not student:
            return Response({'error': 'Student not found'}, status=404)

        # Determine date range
        if mode == 'month':
            year, month_num = map(int, month.split('-'))
            start_date = datetime(year, month_num, 1).date()
            end_date = (datetime(year, month_num + 1, 1) - timedelta(days=1)).date() if month_num < 12 else datetime(year, 12, 31).date()
        else:
            try:
                start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
                end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
            except ValueError:
                return Response({'error': 'Invalid date format'}, status=400)

        # Fetch student details
        student_data = {
            "name": student.name,
            "reg_num": student.reg_num,
            "class": student.student_class,
            "school": student.school.name
        }

        # Fetch attendance
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
            "percentage": 0.0  # Initialize percentage to 0
        }
        if total_days > 0:
            attendance_data["percentage"] = (attendance_data["present"] / total_days * 100)

        # Fetch lessons achieved
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

        # Fetch images
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

        return Response({
            "student": student_data,
            "attendance": attendance_data,
            "lessons": lessons_data,
            "images": images_data
        }, status=200)

    except Exception as e:
        logger.error(f"Error in student_report_data: {str(e)}")
        return Response({"error": str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def generate_pdf(request):
    """Generate a PDF report for a single student"""
    user = request.user
    try:
        student_id = request.GET.get('student_id')
        mode = request.GET.get('mode')
        month = request.GET.get('month')  # YYYY-MM
        start_date = request.GET.get('start_date')  # YYYY-MM-DD
        end_date = request.GET.get('end_date')  # YYYY-MM-DD
        school_id = request.GET.get('school_id')
        student_class = request.GET.get('student_class')

        # Validate inputs
        if not student_id or not mode or (mode == 'month' and not month) or (mode == 'range' and not (start_date and end_date)):
            return Response({'error': 'Missing required parameters'}, status=400)

        # Validate school access for teachers
        if user.role == "Teacher":
            assigned_schools = user.assigned_schools.values_list("id", flat=True)
            if int(school_id) not in assigned_schools:
                return Response({"error": "Unauthorized access to this school"}, status=403)

        # Fetch student
        student = Student.objects.filter(
            id=student_id, school_id=school_id, student_class=student_class
        ).first()
        if not student:
            return Response({'error': 'Student not found'}, status=404)

        # Determine date range
        if mode == 'month':
            year, month_num = map(int, month.split('-'))
            start_date = datetime(year, month_num, 1).date()
            end_date = (datetime(year, month_num + 1, 1) - timedelta(days=1)).date() if month_num < 12 else datetime(year, 12, 31).date()
            period = datetime(year, month_num, 1).strftime('%B %Y')
        else:
            try:
                start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
                end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
                period = f"{start_date.strftime('%b %d, %Y')} to {end_date.strftime('%b %d, %Y')}"
            except ValueError:
                return Response({'error': 'Invalid date format'}, status=400)

        # Fetch report data
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
            "percentage": 0.0  # Initialize percentage to 0
        }
        if total_days > 0:
            attendance_data["percentage"] = (attendance_data["present"] / total_days * 100)

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
                "date": session_date.strftime('%Y-%m-%d'),
                "planned_topic": planned_dict[session_date],
                "achieved_topic": achieved_dict.get(session_date, "N/A")
            }
            for session_date in sorted(planned_dict.keys())
        ]

        folder_path = f"{student_id}/"
        response = supabase.storage.from_(settings.SUPABASE_BUCKET).list(folder_path)
        if "error" in response:
            logger.error(f"Error fetching images for student {student_id}: {response['error']['message']}")
            image_urls = []
        else:
            image_urls = [
                supabase.storage.from_(settings.SUPABASE_BUCKET).create_signed_url(f"{folder_path}{file['name']}", 604800)['signedURL']
                for file in response
                if file["name"].startswith(month if mode == 'month' else start_date.strftime('%Y-%m'))
            ]

        # Generate PDF
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=15*mm, leftMargin=15*mm, topMargin=15*mm, bottomMargin=15*mm)
        elements = []

        # Define colors
        HEADER_BLUE = colors.HexColor('#2c3e50')
        ACCENT_GREEN = colors.HexColor('#27ae60')
        SECTION_BG = colors.HexColor('#f8f9fa')
        TEXT_COLOR = colors.HexColor('#333333')
        BORDER_COLOR = colors.HexColor('#dddddd')
        FOOTER_GRAY = colors.HexColor('#7f8c8d')

        # Styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            name='Title',
            fontSize=18,
            textColor=HEADER_BLUE,
            alignment=TA_CENTER,
            spaceAfter=6,
            fontName='Helvetica-Bold'
        )
        header_style = ParagraphStyle(
            name='Header',
            fontSize=14,
            textColor=HEADER_BLUE,
            spaceAfter=4,
            fontName='Helvetica-Bold',
            underline=1
        )
        normal_style = ParagraphStyle(
            name='Normal',
            fontSize=10,
            textColor=TEXT_COLOR,
            spaceAfter=2,
            leading=12,
            fontName='Helvetica'
        )
        footer_style = ParagraphStyle(
            name='Footer',
            fontSize=8,
            textColor=FOOTER_GRAY,
            alignment=TA_LEFT,
            leading=10
        )

        # Header with school name
        elements.append(Paragraph(student.school.name, title_style))
        elements.append(Paragraph("Monthly Student Report", title_style))
        elements.append(Spacer(1, 6*mm))

        # Student Details Section
        elements.append(Paragraph("Student Details", header_style))
        details_content = [
            Paragraph(f"<b>Name:</b> {student.name}", normal_style),
            Paragraph(f"<b>Registration Number:</b> {student.reg_num}", normal_style),
            Paragraph(f"<b>School:</b> {student.school.name}", normal_style),
            Paragraph(f"<b>Class:</b> {student.student_class}", normal_style),
            Paragraph(f"<b>Month/Date Range:</b> {period}", normal_style),
        ]
        elements.extend(details_content)
        elements.append(Spacer(1, 6*mm))

        # Attendance Section
        elements.append(Paragraph("Attendance", header_style))
        attendance_status_color = 'green' if attendance_data['percentage'] >= 75 else 'red' if attendance_data['percentage'] < 50 else 'orange'
        attendance_text = f"{attendance_data['present']}/{attendance_data['total_days']} days ({attendance_data['percentage']:.2f}%)"
        status_dot = f'<font color="{attendance_status_color}">●</font>'
        attendance_para = Paragraph(
            f"{attendance_text} {status_dot}",
            ParagraphStyle(
                name='Attendance',
                fontSize=12,
                textColor=TEXT_COLOR,
                alignment=TA_LEFT
            )
        )
        elements.append(attendance_para)
        elements.append(Spacer(1, 6*mm))

        # Lessons Table
        elements.append(Paragraph("Lessons Overview", header_style))
        if lessons_data:
            lessons_data_table = [['Date', 'Planned Topic', 'Achieved Topic']]
            for lesson in lessons_data:
                date_str = lesson['date']
                try:
                    date_obj = datetime.strptime(date_str, '%Y-%m-%d')
                    formatted_date = date_obj.strftime('%d %b %Y')
                except ValueError:
                    formatted_date = date_str

                achieved_mark = ''
                if lesson['planned_topic'] == lesson['achieved_topic'] and lesson['achieved_topic']:
                    achieved_mark = '<font color="green">✓</font>'

                lessons_data_table.append([
                    Paragraph(formatted_date, normal_style),
                    Paragraph(lesson['planned_topic'], normal_style),
                    Paragraph(f"{lesson['achieved_topic']} {achieved_mark}", normal_style)
                ])

            lessons_table = Table(lessons_data_table, colWidths=[30*mm, 65*mm, 65*mm])
            lessons_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), HEADER_BLUE),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('LEADING', (0, 0), (-1, -1), 11),
                ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, SECTION_BG]),
                ('WORDWRAP', (0, 0), (-1, -1), True),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ]))
            elements.append(lessons_table)
        else:
            elements.append(Paragraph("No lessons found for the selected date range.", normal_style))
        elements.append(Spacer(1, 6*mm))

        # Image Grid
        elements.append(Paragraph("Progress Images", header_style))
        image_slots = image_urls[:4] + [None] * (4 - min(len(image_urls), 4))
        image_table_data = []

        for i in range(0, 4, 2):
            row = []
            for j in range(2):
                idx = i + j
                if idx < len(image_slots) and image_slots[idx]:
                    try:
                        img_url = image_slots[idx]
                        img_data = fetch_image(img_url)
                        if img_data:
                            img = ImageReader(img_data)
                            img_width, img_height = 75*mm, 50*mm
                            img_ratio = img.getSize()[0] / img.getSize()[1]
                            if img_ratio > img_width / img_height:
                                img._width, img._height = img_width, img_width / img_ratio
                            else:
                                img._width, img._height = img_height * img_ratio, img_height
                            row.append(img)
                        else:
                            row.append(Paragraph(f"Image {idx+1} (Failed to load)", normal_style))
                    except Exception as e:
                        logger.error(f"Error processing image {idx+1} from {img_url}: {str(e)}")
                        row.append(Paragraph(f"Image {idx+1} (Error: {str(e)})", normal_style))
                else:
                    row.append(Paragraph("No Image", normal_style))
            image_table_data.append(row)

        image_table = Table(image_table_data, colWidths=[80*mm, 80*mm], rowHeights=55*mm)
        image_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BACKGROUND', (0, 0), (-1, -1), colors.white),
            ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(image_table)
        elements.append(Spacer(1, 6*mm))

        # Footer
        footer_text = (
            f"Teacher's Signature: ____________________<br/>"
            f"Generated on: {datetime.now().strftime('%B %d, %Y, %I:%M %p PKT')}<br/>"
            f"<i>Powered by {student.school.name}</i>"
        )
        elements.append(Paragraph(footer_text, footer_style))

        # Build PDF
        doc.build(elements)
        buffer.seek(0)
        response = HttpResponse(buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename=student_report_{student.reg_num}_{period.replace(" ", "_")}.pdf'
        return response

    except Exception as e:
        logger.error(f"Error in generate_pdf: {str(e)}")
        return Response({"error": str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_pdf_batch(request):
    """Generate PDF reports for multiple students and return as a ZIP file"""
    user = request.user
    try:
        data = request.data
        student_ids = data.get('student_ids', [])
        mode = data.get('mode')
        month = data.get('month')  # YYYY-MM
        start_date = data.get('start_date')  # YYYY-MM-DD
        end_date = data.get('end_date')  # YYYY-MM-DD
        school_id = data.get('school_id')
        student_class = data.get('student_class')

        # Validate inputs
        if not student_ids or not mode or (mode == 'month' and not month) or (mode == 'range' and not (start_date and end_date)):
            return Response({'error': 'Missing required parameters'}, status=400)

        # Validate school access for teachers
        if user.role == "Teacher":
            assigned_schools = user.assigned_schools.values_list("id", flat=True)
            if int(school_id) not in assigned_schools:
                return Response({"error": "Unauthorized access to this school"}, status=403)

        # Determine date range
        if mode == 'month':
            year, month_num = map(int, month.split('-'))
            start_date = datetime(year, month_num, 1).date()
            end_date = (datetime(year, month_num + 1, 1) - timedelta(days=1)).date() if month_num < 12 else datetime(year, 12, 31).date()
            period = datetime(year, month_num, 1).strftime('%B %Y')
        else:
            try:
                start_date = datetime.strptime(start_date, '%Y-%m-%d').date()
                end_date = datetime.strptime(end_date, '%Y-%m-%d').date()
                period = f"{start_date.strftime('%b %d, %Y')} to {end_date.strftime('%b %d, %Y')}"
            except ValueError:
                return Response({'error': 'Invalid date format'}, status=400)

        # Initialize ZIP buffer
        zip_buffer = BytesIO()
        zip_file = ZipFile(zip_buffer, 'w', compression=ZipFile.ZIP_DEFLATED)

        # Define colors
        HEADER_BLUE = colors.HexColor('#2c3e50')
        ACCENT_GREEN = colors.HexColor('#27ae60')
        SECTION_BG = colors.HexColor('#f8f9fa')
        TEXT_COLOR = colors.HexColor('#333333')
        BORDER_COLOR = colors.HexColor('#dddddd')
        FOOTER_GRAY = colors.HexColor('#7f8c8d')

        # Styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            name='Title',
            fontSize=18,
            textColor=HEADER_BLUE,
            alignment=TA_CENTER,
            spaceAfter=6,
            fontName='Helvetica-Bold'
        )
        header_style = ParagraphStyle(
            name='Header',
            fontSize=14,
            textColor=HEADER_BLUE,
            spaceAfter=4,
            fontName='Helvetica-Bold',
            underline=1
        )
        normal_style = ParagraphStyle(
            name='Normal',
            fontSize=10,
            textColor=TEXT_COLOR,
            spaceAfter=2,
            leading=12,
            fontName='Helvetica'
        )
        footer_style = ParagraphStyle(
            name='Footer',
            fontSize=8,
            textColor=FOOTER_GRAY,
            alignment=TA_LEFT,
            leading=10
        )

        for student_id in student_ids:
            student = Student.objects.filter(
                id=student_id, school_id=school_id, student_class=student_class
            ).first()
            if not student:
                logger.warning(f"Student {student_id} not found")
                continue

            # Fetch report data
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
                "percentage": 0.0  # Initialize percentage to 0
            }
            if total_days > 0:
                attendance_data["percentage"] = (attendance_data["present"] / total_days * 100)

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
                    "date": session_date.strftime('%Y-%m-%d'),
                    "planned_topic": planned_dict[session_date],
                    "achieved_topic": achieved_dict.get(session_date, "N/A")
                }
                for session_date in sorted(planned_dict.keys())
            ]

            folder_path = f"{student_id}/"
            response = supabase.storage.from_(settings.SUPABASE_BUCKET).list(folder_path)
            if "error" in response:
                logger.error(f"Error fetching images for student {student_id}: {response['error']['message']}")
                image_urls = []
            else:
                image_urls = [
                    supabase.storage.from_(settings.SUPABASE_BUCKET).create_signed_url(f"{folder_path}{file['name']}", 604800)['signedURL']
                    for file in response
                    if file["name"].startswith(month if mode == 'month' else start_date.strftime('%Y-%m'))
                ]

            # Generate PDF
            pdf_buffer = BytesIO()
            doc = SimpleDocTemplate(pdf_buffer, pagesize=A4, rightMargin=15*mm, leftMargin=15*mm, topMargin=15*mm, bottomMargin=15*mm)
            elements = []

            # Header with school name
            elements.append(Paragraph(student.school.name, title_style))
            elements.append(Paragraph("Monthly Student Report", title_style))
            elements.append(Spacer(1, 6*mm))

            # Student Details Section
            elements.append(Paragraph("Student Details", header_style))
            details_content = [
                Paragraph(f"<b>Name:</b> {student.name}", normal_style),
                Paragraph(f"<b>Registration Number:</b> {student.reg_num}", normal_style),
                Paragraph(f"<b>School:</b> {student.school.name}", normal_style),
                Paragraph(f"<b>Class:</b> {student.student_class}", normal_style),
                Paragraph(f"<b>Month/Date Range:</b> {period}", normal_style),
            ]
            elements.extend(details_content)
            elements.append(Spacer(1, 6*mm))

            # Attendance Section
            elements.append(Paragraph("Attendance", header_style))
            attendance_status_color = 'green' if attendance_data['percentage'] >= 75 else 'red' if attendance_data['percentage'] < 50 else 'orange'
            attendance_text = f"{attendance_data['present']}/{attendance_data['total_days']} days ({attendance_data['percentage']:.2f}%)"
            status_dot = f'<font color="{attendance_status_color}">●</font>'
            attendance_para = Paragraph(
                f"{attendance_text} {status_dot}",
                ParagraphStyle(
                    name='Attendance',
                    fontSize=12,
                    textColor=TEXT_COLOR,
                    alignment=TA_LEFT
                )
            )
            elements.append(attendance_para)
            elements.append(Spacer(1, 6*mm))

            # Lessons Table
            elements.append(Paragraph("Lessons Overview", header_style))
            if lessons_data:
                lessons_data_table = [['Date', 'Planned Topic', 'Achieved Topic']]
                for lesson in lessons_data:
                    date_str = lesson['date']
                    try:
                        date_obj = datetime.strptime(date_str, '%Y-%m-%d')
                        formatted_date = date_obj.strftime('%d %b %Y')
                    except ValueError:
                        formatted_date = date_str

                    achieved_mark = ''
                    if lesson['planned_topic'] == lesson['achieved_topic'] and lesson['achieved_topic']:
                        achieved_mark = '<font color="green">✓</font>'

                    lessons_data_table.append([
                        Paragraph(formatted_date, normal_style),
                        Paragraph(lesson['planned_topic'], normal_style),
                        Paragraph(f"{lesson['achieved_topic']} {achieved_mark}", normal_style)
                    ])

                lessons_table = Table(lessons_data_table, colWidths=[30*mm, 65*mm, 65*mm])
                lessons_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), HEADER_BLUE),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, -1), 9),
                    ('LEADING', (0, 0), (-1, -1), 11),
                    ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
                    ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                    ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, SECTION_BG]),
                    ('WORDWRAP', (0, 0), (-1, -1), True),
                    ('TOPPADDING', (0, 0), (-1, -1), 4),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
                ]))
                elements.append(lessons_table)
            else:
                elements.append(Paragraph("No lessons found for the selected date range.", normal_style))
            elements.append(Spacer(1, 6*mm))

            # Image Grid
            elements.append(Paragraph("Progress Images", header_style))
            image_slots = image_urls[:4] + [None] * (4 - min(len(image_urls), 4))
            image_table_data = []

            for i in range(0, 4, 2):
                row = []
                for j in range(2):
                    idx = i + j
                    if idx < len(image_slots) and image_slots[idx]:
                        try:
                            img_url = image_slots[idx]
                            img_data = fetch_image(img_url)
                            if img_data:
                                img = ImageReader(img_data)
                                img_width, img_height = 75*mm, 50*mm
                                img_ratio = img.getSize()[0] / img.getSize()[1]
                                if img_ratio > img_width / img_height:
                                    img._width, img._height = img_width, img_width / img_ratio
                                else:
                                    img._width, img._height = img_height * img_ratio, img_height
                                row.append(img)
                            else:
                                row.append(Paragraph(f"Image {idx+1} (Failed to load)", normal_style))
                        except Exception as e:
                            logger.error(f"Error processing image {idx+1} from {img_url}: {str(e)}")
                            row.append(Paragraph(f"Image {idx+1} (Error: {str(e)})", normal_style))
                    else:
                        row.append(Paragraph("No Image", normal_style))
                image_table_data.append(row)

            image_table = Table(image_table_data, colWidths=[80*mm, 80*mm], rowHeights=55*mm)
            image_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('BACKGROUND', (0, 0), (-1, -1), colors.white),
                ('BOX', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ]))
            elements.append(image_table)
            elements.append(Spacer(1, 6*mm))

            # Footer
            footer_text = (
                f"Teacher's Signature: ____________________<br/>"
                f"Generated on: {datetime.now().strftime('%B %d, %Y, %I:%M %p PKT')}<br/>"
                f"<i>Powered by {student.school.name}</i>"
            )
            elements.append(Paragraph(footer_text, footer_style))

            # Build PDF and add to ZIP
            doc.build(elements)
            pdf_buffer.seek(0)
            filename = f"student_report_{student.reg_num}_{period.replace(' ', '_')}.pdf"
            zip_file.writestr(filename, pdf_buffer.getvalue())

        # Finalize ZIP file
        zip_file.close()
        zip_buffer.seek(0)
        response = HttpResponse(zip_buffer, content_type='application/zip')
        response['Content-Disposition'] = f'attachment; filename=student_reports_{period.replace(" ", "_")}.zip'
        return response

    except Exception as e:
        logger.error(f"Error in generate_pdf_batch: {str(e)}")
        return Response({"error": str(e)}, status=500)