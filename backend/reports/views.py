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
    """Remove token parameter from Supabase URL if present"""
    if not url or not isinstance(url, str):
        return None
    try:
        parsed = urllib.parse.urlparse(url)
        if 'supabase.co' in parsed.netloc and 'token=' in parsed.query:
            clean_url = f"{parsed.scheme}://{parsed.netloc}{parsed.path}"
            return clean_url
        return url
    except Exception as e:
        logger.error(f"Error cleaning image URL: {str(e)}")
        return url

def fetch_image(url, timeout=15):
    """Fetch image with proper headers and error handling"""
    if not url:
        return None
    clean_url = get_clean_image_url(url)
    if not clean_url:
        return None
    try:
        headers = {'User-Agent': 'Mozilla/5.0', 'Referer': 'https://koderkids.pk/'}
        response = requests.get(clean_url, headers=headers, timeout=timeout)
        response.raise_for_status()
        if not response.headers.get('Content-Type', '').startswith('image/'):
            raise ValueError("URL does not point to an image")
        return BytesIO(response.content)
    except Exception as e:
        logger.error(f"Failed to fetch image from {clean_url}: {str(e)}")
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
            "percentage": (attendance_data["present"] / total_days * 100) if total_days > 0 else 0
        }

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
            "percentage": (attendance_data["present"] / total_days * 100) if total_days > 0 else 0
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
            [session_date.strftime('%Y-%m-%d'), planned_dict[session_date], achieved_dict.get(session_date, "N/A")]
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
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=15*mm, leftMargin=15*mm, topMargin=10*mm, bottomMargin=10*mm)
        styles = getSampleStyleSheet()
        elements = []

        # Custom styles
        title_style = ParagraphStyle(
            name='TitleStyle',
            parent=styles['Title'],
            fontSize=16,
            leading=20,
            alignment=TA_CENTER,
            spaceAfter=12
        )
        heading_style = ParagraphStyle(
            name='HeadingStyle',
            parent=styles['Heading2'],
            fontSize=14,
            leading=16,
            spaceAfter=8
        )
        normal_style = ParagraphStyle(
            name='NormalStyle',
            parent=styles['Normal'],
            fontSize=10,
            leading=12
        )

        # Cover Page
        elements.append(Paragraph("Student Progress Report", title_style))
        elements.append(Spacer(1, 10*mm))
        elements.append(Paragraph(f"Name: {student.name}", normal_style))
        elements.append(Paragraph(f"Registration Number: {student.reg_num}", normal_style))
        elements.append(Paragraph(f"Class: {student.student_class}", normal_style))
        elements.append(Paragraph(f"School: {student.school.name}", normal_style))
        elements.append(Paragraph(f"Period: {period}", normal_style))
        elements.append(Spacer(1, 20*mm))
        elements.append(Paragraph("Generated by School Management System", normal_style))

        # Attendance Section
        elements.append(Paragraph("Attendance Summary", heading_style))
        attendance_table_data = [
            ['Status', 'Days'],
            ['Present', attendance_data['present']],
            ['Absent', attendance_data['absent']],
            ['Not Marked', attendance_data['not_marked']],
            ['Total Days', attendance_data['total_days']],
            ['Attendance %', f"{attendance_data['percentage']:.2f}%"]
        ]
        attendance_table = Table(attendance_table_data, colWidths=[100*mm, 60*mm])
        attendance_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        elements.append(attendance_table)
        elements.append(Spacer(1, 10*mm))

        # Lessons Section
        elements.append(Paragraph("Lessons Covered", heading_style))
        lessons_table_data = [['Date', 'Planned Topic', 'Achieved Topic']] + lessons_data
        lessons_table = Table(lessons_table_data, colWidths=[40*mm, 80*mm, 80*mm])
        lessons_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE')
        ]))
        elements.append(lessons_table)
        elements.append(Spacer(1, 10*mm))

        # Images Section
        elements.append(Paragraph("Progress Images", heading_style))
        if not image_urls:
            elements.append(Paragraph("No images available for this period.", normal_style))
        else:
            max_images_per_row = 2
            image_width = 80*mm
            image_height = 60*mm
            for i in range(0, len(image_urls), max_images_per_row):
                row_images = image_urls[i:i + max_images_per_row]
                image_row = []
                for url in row_images:
                    img_data = fetch_image(url)
                    if img_data:
                        img = Image(img_data, width=image_width, height=image_height)
                        img.hAlign = 'CENTER'
                        image_row.append(img)
                    else:
                        image_row.append(Paragraph("Image not available", normal_style))
                while len(image_row) < max_images_per_row:
                    image_row.append(Paragraph("", normal_style))
                image_table = Table([image_row], colWidths=[image_width + 10*mm] * max_images_per_row)
                image_table.setStyle(TableStyle([
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ]))
                elements.append(image_table)
                elements.append(Spacer(1, 5*mm))

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

        # Generate PDF for each student
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            name='TitleStyle',
            parent=styles['Title'],
            fontSize=16,
            leading=20,
            alignment=TA_CENTER,
            spaceAfter=12
        )
        heading_style = ParagraphStyle(
            name='HeadingStyle',
            parent=styles['Heading2'],
            fontSize=14,
            leading=16,
            spaceAfter=8
        )
        normal_style = ParagraphStyle(
            name='NormalStyle',
            parent=styles['Normal'],
            fontSize=10,
            leading=12
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
                "percentage": (attendance_data["present"] / total_days * 100) if total_days > 0 else 0
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
                [session_date.strftime('%Y-%m-%d'), planned_dict[session_date], achieved_dict.get(session_date, "N/A")]
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
            doc = SimpleDocTemplate(pdf_buffer, pagesize=A4, rightMargin=15*mm, leftMargin=15*mm, topMargin=10*mm, bottomMargin=10*mm)
            elements = []

            # Cover Page
            elements.append(Paragraph("Student Progress Report", title_style))
            elements.append(Spacer(1, 10*mm))
            elements.append(Paragraph(f"Name: {student.name}", normal_style))
            elements.append(Paragraph(f"Registration Number: {student.reg_num}", normal_style))
            elements.append(Paragraph(f"Class: {student.student_class}", normal_style))
            elements.append(Paragraph(f"School: {student.school.name}", normal_style))
            elements.append(Paragraph(f"Period: {period}", normal_style))
            elements.append(Spacer(1, 20*mm))
            elements.append(Paragraph("Generated by School Management System", normal_style))

            # Attendance Section
            elements.append(Paragraph("Attendance Summary", heading_style))
            attendance_table_data = [
                ['Status', 'Days'],
                ['Present', attendance_data['present']],
                ['Absent', attendance_data['absent']],
                ['Not Marked', attendance_data['not_marked']],
                ['Total Days', attendance_data['total_days']],
                ['Attendance %', f"{attendance_data['percentage']:.2f}%"]
            ]
            attendance_table = Table(attendance_table_data, colWidths=[100*mm, 60*mm])
            attendance_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 12),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black)
            ]))
            elements.append(attendance_table)
            elements.append(Spacer(1, 10*mm))

            # Lessons Section
            elements.append(Paragraph("Lessons Covered", heading_style))
            lessons_table_data = [['Date', 'Planned Topic', 'Achieved Topic']] + lessons_data
            lessons_table = Table(lessons_table_data, colWidths=[40*mm, 80*mm, 80*mm])
            lessons_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, 0), 10),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE')
            ]))
            elements.append(lessons_table)
            elements.append(Spacer(1, 10*mm))

            # Images Section
            elements.append(Paragraph("Progress Images", heading_style))
            if not image_urls:
                elements.append(Paragraph("No images available for this period.", normal_style))
            else:
                max_images_per_row = 2
                image_width = 80*mm
                image_height = 60*mm
                for i in range(0, len(image_urls), max_images_per_row):
                    row_images = image_urls[i:i + max_images_per_row]
                    image_row = []
                    for url in row_images:
                        img_data = fetch_image(url)
                        if img_data:
                            img = Image(img_data, width=image_width, height=image_height)
                            img.hAlign = 'CENTER'
                            image_row.append(img)
                        else:
                            image_row.append(Paragraph("Image not available", normal_style))
                    while len(image_row) < max_images_per_row:
                        image_row.append(Paragraph("", normal_style))
                    image_table = Table([image_row], colWidths=[image_width + 10*mm] * max_images_per_row)
                    image_table.setStyle(TableStyle([
                        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                    ]))
                    elements.append(image_table)
                    elements.append(Spacer(1, 5*mm))

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