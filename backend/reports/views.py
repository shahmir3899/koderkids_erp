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
import brotli
from PIL import Image as PILImage

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
    Determines format from URL extension and validates accordingly.
    Returns BytesIO object with image data or None if failed.
    """
    if not url:
        logger.warning("No URL provided for fetching image")
        return None

    try:
        # Extract file extension from URL (before any query params)
        url_path = url.split('?')[0]
        extension = url_path.split('.')[-1].lower()
        supported_formats = {
            'jpeg': b'\xff\xd8',
            'jpg': b'\xff\xd8',
            'png': b'\x89PNG'
        }
        if extension not in supported_formats:
            logger.warning(f"Unsupported image format: {extension}")
            return None

        expected_signature = supported_formats[extension]

        # Disable compression explicitly, but handle it if it occurs
        headers = {
            'User-Agent': 'Mozilla/5.0',
            'Referer': 'https://koderkids-erp.onrender.com/',
            'Accept-Encoding': 'identity'  # Prefer no compression
        }
        logger.debug(f"Attempting to fetch image from {url}")
        response = requests.get(url, headers=headers, timeout=timeout, allow_redirects=True)
        logger.info(f"Image fetch response - Status: {response.status_code}, Size: {len(response.content)} bytes, Headers: {response.headers}")
        response.raise_for_status()

        content = response.content
        # Fallback for Brotli compression if server ignores 'identity'
        if response.headers.get('Content-Encoding') == 'br':
            logger.debug("Decompressing Brotli-encoded content")
            try:
                content = brotli.decompress(content)
            except brotli.error as e:
                logger.error(f"Brotli decompression error: {str(e)}", exc_info=True)
                return None

        # Validate image signature based on extension
        if not content.startswith(expected_signature):
            logger.warning(f"Invalid image signature for {extension}: {content[:8].hex()}")
            return None

        # Process image with PIL for validation, resizing, and format consistency
        try:
            img = PILImage.open(BytesIO(content))

            # Convert to RGB if PNG with alpha channel
            if img.mode in ('RGBA', 'LA'):
                background = PILImage.new('RGB', img.size, (255, 255, 255))
                background.paste(img, mask=img.split()[-1])
                img = background

            # Resize if needed
            if max_size:
                img.thumbnail(max_size, PILImage.LANCZOS)

            # Save to buffer
            output_buffer = BytesIO()
            img_format = 'JPEG' if extension in ('jpeg', 'jpg') else 'PNG'
            img.save(output_buffer, format=img_format, quality=85)
            output_buffer.seek(0)

            # Check final size to prevent memory issues
            final_size = output_buffer.getbuffer().nbytes
            if final_size > 10 * 1024 * 1024:  # 10 MB limit
                logger.warning(f"Image size too large after processing: {final_size} bytes")
                return None

            logger.debug(f"Image processed successfully: {img.size}")
            return output_buffer

        except Exception as pil_error:
            logger.error(f"PIL processing error: {str(pil_error)}", exc_info=True)
            return None

    except requests.RequestException as e:
        logger.error(f"Network error fetching image: {str(e)}", exc_info=True)
        return None
    except Exception as e:
        logger.error(f"Unexpected error processing image: {str(e)}", exc_info=True)
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

        if not student_id or not mode or (mode == 'month' and not month) or (mode == 'range' and not (start_date and end_date)):
            return Response({'error': 'Missing required parameters'}, status=400)

        if user.role == "Teacher":
            assigned_schools = user.assigned_schools.values_list("id", flat=True)
            if int(school_id) not in assigned_schools:
                return Response({"error": "Unauthorized access to this school"}, status=403)

        student = Student.objects.filter(
            id=student_id, school_id=school_id, student_class=student_class
        ).first()
        if not student:
            return Response({'error': 'Student not found'}, status=404)

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
            "percentage": 0.0
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
                "date": session_date,
                "planned_topic": planned_dict[session_date],
                "achieved_topic": achieved_dict.get(session_date, "N/A")
            }
            for session_date in sorted(planned_dict.keys())
        ]

        folder_path = f"{student_id}/"
        response = supabase.storage.from_(settings.SUPABASE_BUCKET).list(folder_path)
        if "error" in response:
            logger.error(f"Error fetching images for student {student_id}: {response['error']['message']}", exc_info=True)
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
        logger.error(f"Error in student_report_data: {str(e)}", exc_info=True)
        return Response({"error": str(e)}, status=500)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def generate_pdf(request):
    """Generate a PDF report for a single student with improved image handling"""
    user = request.user
    try:
        # Parameter extraction and validation
        student_id = request.GET.get('student_id')
        mode = request.GET.get('mode')
        month = request.GET.get('month')
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        school_id = request.GET.get('school_id')
        student_class = request.GET.get('student_class')
        image_ids = [x.strip() for x in request.GET.get('image_ids', '').split(',') if x.strip()]

        # Validate required parameters
        if not all([student_id, mode, school_id, student_class]):
            return Response({'error': 'Missing required parameters'}, status=400)
        
        if mode == 'month' and not month:
            return Response({'error': 'Month required for monthly reports'}, status=400)
        if mode == 'range' and not (start_date and end_date):
            return Response({'error': 'Start and end dates required for range reports'}, status=400)

        # Authorization check
        if user.role == "Teacher":
            if int(school_id) not in user.assigned_schools.values_list("id", flat=True):
                return Response({"error": "Unauthorized access to this school"}, status=403)

        # Get student and date range
        student = Student.objects.filter(
            id=student_id, school_id=school_id, student_class=student_class
        ).first()
        if not student:
            return Response({'error': 'Student not found'}, status=404)

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

        # Fetch attendance data
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
            "percentage": 0.0
        }
        if total_days > 0:
            attendance_data["percentage"] = (attendance_data["present"] / total_days * 100)

        # Fetch lessons data
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
                "achieved_topic": (
                    achieved_lesson["achieved_topic"] if (achieved_lesson := next(
                        (al for al in achieved_lessons if al["session_date"] == lesson["session_date"]), None
                    )) else "N/A"
                )
            }
            for lesson in planned_lessons
        ]

        # Fetch and process images
        folder_path = f"{student_id}/"
        supabase_response = supabase.storage.from_(settings.SUPABASE_BUCKET).list(folder_path)
        
        if "error" in supabase_response:
            logger.error(f"Supabase error: {supabase_response['error']['message']}", exc_info=True)
            image_urls = []
        else:
            all_images = [
                supabase.storage.from_(settings.SUPABASE_BUCKET).create_signed_url(
                    f"{folder_path}{file['name']}", 
                    3600  # 1 hour expiry
                )['signedURL']
                for file in supabase_response
                if file["name"].startswith(month if mode == 'month' else start_date.strftime('%Y-%m'))
            ]
            
            # Filter selected images if specified
            if image_ids:
                selected_images = []
                for img_id in image_ids:
                    try:
                        idx = int(img_id) - 1
                        if 0 <= idx < len(all_images):
                            selected_images.append(all_images[idx])
                    except ValueError:
                        for img_url in all_images:
                            if img_url.split('/')[-1].split('?')[0] == img_id:
                                selected_images.append(img_url)
                                break
                image_urls = selected_images[:4]
            else:
                image_urls = all_images[:4]

        # PDF Generation
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=15*mm,
            leftMargin=15*mm,
            topMargin=15*mm,
            bottomMargin=15*mm
        )
        
        elements = []

        # Styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            name='Title',
            fontSize=18,
            textColor=colors.HexColor('#2c3e50'),
            alignment=TA_CENTER,
            spaceAfter=6,
            fontName='Helvetica-Bold'
        )
        
        header_style = ParagraphStyle(
            name='Header',
            fontSize=14,
            textColor=colors.HexColor('#2c3e50'),
            spaceAfter=4,
            fontName='Helvetica-Bold',
            underline=1
        )
        
        normal_style = ParagraphStyle(
            name='Normal',
            fontSize=10,
            textColor=colors.HexColor('#333333'),
            spaceAfter=2,
            leading=12,
            fontName='Helvetica'
        )
        
        footer_style = ParagraphStyle(
            name='Footer',
            fontSize=8,
            textColor=colors.HexColor('#7f8c8d'),
            alignment=TA_LEFT,
            leading=10
        )

        # Header
        elements.append(Paragraph(student.school.name, title_style))
        elements.append(Paragraph("Monthly Student Report", title_style))
        elements.append(Spacer(1, 6*mm))

        # Student Details
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

        # Attendance
        elements.append(Paragraph("Attendance", header_style))
        attendance_status_color = (
            'green' if attendance_data['percentage'] >= 75 
            else 'red' if attendance_data['percentage'] < 50 
            else 'orange'
        )
        attendance_text = (
            f"{attendance_data['present']}/{attendance_data['total_days']} days "
            f"({attendance_data['percentage']:.2f}%)"
        )
        status_dot = f'<font color="{attendance_status_color}">●</font>'
        attendance_para = Paragraph(
            f"{attendance_text} {status_dot}",
            ParagraphStyle(
                name='Attendance',
                fontSize=12,
                textColor=colors.black,
                alignment=TA_LEFT
            )
        )
        elements.append(attendance_para)
        elements.append(Spacer(1, 6*mm))

        # Lessons Overview
        elements.append(Paragraph("Lessons Overview", header_style))
        if lessons_data:
            lessons_table = Table(
                [['Date', 'Planned Topic', 'Achieved Topic']] + [
                    [
                        Paragraph(datetime.strptime(lesson['date'], '%Y-%m-%d').strftime('%d %b %Y'), normal_style),
                        Paragraph(lesson['planned_topic'], normal_style),
                        Paragraph(
                            f"{lesson['achieved_topic']} " + 
                            ('<font color="green">✓</font>' 
                             if lesson['planned_topic'] == lesson['achieved_topic'] 
                             and lesson['achieved_topic'] != "N/A" 
                             else ''),
                            normal_style
                        )
                    ]
                    for lesson in lessons_data
                ],
                colWidths=[30*mm, 65*mm, 65*mm]
            )
            
            lessons_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2c3e50')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('LEADING', (0, 0), (-1, -1), 11),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#dddddd')),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f8f9fa')]),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ]))
            elements.append(lessons_table)
        else:
            elements.append(Paragraph("No lessons found for the selected date range.", normal_style))
        elements.append(Spacer(1, 6*mm))

        # Progress Images
        elements.append(Paragraph("Progress Images", header_style))

        # Prepare image grid (2x2)
        image_table_data = []
        image_slots = image_urls[:4] + [None] * (4 - min(len(image_urls), 4))
        image_buffers = []  # Keep buffers alive until PDF is built

        for i in range(0, 4, 2):
            row = []
            for j in range(2):
                idx = i + j
                if idx < len(image_slots) and image_slots[idx]:
                    try:
                        img_url = image_slots[idx]
                        logger.debug(f"Processing image {idx+1} from {img_url}")
                        
                        img_data = fetch_image(img_url)
                        if img_data is None:
                            logger.warning(f"fetch_image returned None for {img_url}")
                            row.append(Paragraph(f"Image {idx+1} (Failed to fetch)", normal_style))
                            continue

                        # Ensure the buffer is at the start
                        img_data.seek(0)
                        buffer_size = img_data.getbuffer().nbytes
                        logger.debug(f"Image buffer size: {buffer_size} bytes")
                        if buffer_size == 0:
                            logger.warning(f"Empty image buffer for {img_url}")
                            row.append(Paragraph(f"Image {idx+1} (Empty buffer)", normal_style))
                            continue

                        # Create ImageReader and convert to Image
                        img_reader = ImageReader(img_data)
                        image_buffers.append(img_data)  # Prevent garbage collection
                        
                        # Validate dimensions
                        img_size = img_reader.getSize()
                        logger.debug(f"Image size from ImageReader: {img_size}")
                        if img_size[0] <= 0 or img_size[1] <= 0:
                            logger.warning(f"Invalid image dimensions for {img_url}: {img_size}")
                            row.append(Paragraph(f"Image {idx+1} (Invalid dimensions)", normal_style))
                            continue

                        # Create ReportLab Image object
                        img = Image(img_reader)
                        img.drawHeight = img_size[1] * mm
                        img.drawWidth = img_size[0] * mm

                        # Calculate dimensions while maintaining aspect ratio
                        target_width, target_height = 75*mm, 50*mm
                        img_ratio = img_size[0] / img_size[1] if img_size[1] > 0 else 1
                        
                        if img_ratio > target_width / target_height:
                            img.drawWidth = target_width
                            img.drawHeight = target_width / img_ratio
                        else:
                            img.drawHeight = target_height
                            img.drawWidth = target_height * img_ratio

                        # Test render the image to catch rendering issues
                        temp_buffer = BytesIO()
                        temp_doc = SimpleDocTemplate(temp_buffer, pagesize=A4)
                        try:
                            temp_doc.build([img])
                            logger.debug(f"Image {idx+1} rendered successfully in test PDF")
                        except Exception as e:
                            logger.error(f"Test render failed for image {idx+1}: {str(e)}", exc_info=True)
                            row.append(Paragraph(f"Image {idx+1} (Render error: {str(e)})", normal_style))
                            continue

                        row.append(img)
                    except Exception as e:
                        logger.error(f"Error processing image {idx+1}: {str(e)}", exc_info=True)
                        row.append(Paragraph(f"Image {idx+1} (Error: {str(e)})", normal_style))
                else:
                    row.append(Paragraph("No Image", normal_style))
            image_table_data.append(row)

        # Add image table to PDF
        image_table = Table(
            image_table_data,
            colWidths=[80*mm, 80*mm],
            rowHeights=55*mm
        )
        
        image_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BACKGROUND', (0, 0), (-1, -1), colors.white),
            ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#dddddd')),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        
        elements.append(image_table)
        
        if len(image_urls) > 4:
            elements.append(Paragraph(
                f"Note: Showing 4 of {len(image_urls)} images available.", 
                ParagraphStyle(
                    name='Small',
                    fontSize=8,
                    textColor=colors.gray,
                    alignment=TA_CENTER
                )
            ))
        
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
        
        # Prepare response
        response = HttpResponse(buffer, content_type='application/pdf')
        response['Content-Disposition'] = (
            f'attachment; filename=student_report_'
            f'{student.reg_num}_{period.replace(" ", "_")}.pdf'
        )
        
        return response

    except Exception as e:
        logger.error(f"Error in generate_pdf: {str(e)}", exc_info=True)
        return Response(
            {"error": "Failed to generate PDF", "details": str(e)},
            status=500
        )



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
        image_ids = [x.strip() for x in data.get('image_ids', '').split(',') if x.strip()]

        if not student_ids or not mode or (mode == 'month' and not month) or (mode == 'range' and not (start_date and end_date)):
            return Response({'error': 'Missing required parameters'}, status=400)

        if user.role == "Teacher":
            assigned_schools = user.assigned_schools.values_list("id", flat=True)
            if int(school_id) not in assigned_schools:
                return Response({"error": "Unauthorized access to this school"}, status=403)

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

        from zipfile import ZipFile

        zip_buffer = BytesIO()
        zip_file = ZipFile(zip_buffer, 'w', compression=ZipFile.ZIP_DEFLATED)

        # Styles for PDF
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            name='Title',
            fontSize=18,
            textColor=colors.HexColor('#2c3e50'),
            alignment=TA_CENTER,
            spaceAfter=6,
            fontName='Helvetica-Bold'
        )
        header_style = ParagraphStyle(
            name='Header',
            fontSize=14,
            textColor=colors.HexColor('#2c3e50'),
            spaceAfter=4,
            fontName='Helvetica-Bold',
            underline=1
        )
        normal_style = ParagraphStyle(
            name='Normal',
            fontSize=10,
            textColor=colors.HexColor('#333333'),
            spaceAfter=2,
            leading=12,
            fontName='Helvetica'
        )
        footer_style = ParagraphStyle(
            name='Footer',
            fontSize=8,
            textColor=colors.HexColor('#7f8c8d'),
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
                "percentage": 0.0
            }
            if total_days > 0:
                attendance_data["percentage"] = (attendance_data["present"] / total_days * 100)

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
                    "achieved_topic": (
                        achieved_lesson["achieved_topic"] if (achieved_lesson := next(
                            (al for al in achieved_lessons if al["session_date"] == lesson["session_date"]), None
                        )) else "N/A"
                    )
                }
                for lesson in planned_lessons
            ]

            folder_path = f"{student_id}/"
            response = supabase.storage.from_(settings.SUPABASE_BUCKET).list(folder_path)
            if "error" in response:
                logger.error(f"Error fetching images for student {student_id}: {response['error']['message']}", exc_info=True)
                image_urls = []
            else:
                all_images = [
                    supabase.storage.from_(settings.SUPABASE_BUCKET).create_signed_url(
                        f"{folder_path}{file['name']}", 3600
                    )['signedURL']
                    for file in response
                    if file["name"].startswith(month if mode == 'month' else start_date.strftime('%Y-%m'))
                ]
                if image_ids:
                    selected_images = []
                    for img_id in image_ids:
                        try:
                            idx = int(img_id) - 1
                            if 0 <= idx < len(all_images):
                                selected_images.append(all_images[idx])
                        except ValueError:
                            for img_url in all_images:
                                if img_url.split('/')[-1].split('?')[0] == img_id:
                                    selected_images.append(img_url)
                                    break
                    image_urls = selected_images[:4]
                else:
                    image_urls = all_images[:4]

            pdf_buffer = BytesIO()
            doc = SimpleDocTemplate(pdf_buffer, pagesize=A4, rightMargin=15*mm, leftMargin=15*mm, topMargin=15*mm, bottomMargin=15*mm)
            elements = []

            elements.append(Paragraph(student.school.name, title_style))
            elements.append(Paragraph("Monthly Student Report", title_style))
            elements.append(Spacer(1, 6*mm))

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

            elements.append(Paragraph("Attendance", header_style))
            attendance_status_color = 'green' if attendance_data['percentage'] >= 75 else 'red' if attendance_data['percentage'] < 50 else 'orange'
            attendance_text = f"{attendance_data['present']}/{attendance_data['total_days']} days ({attendance_data['percentage']:.2f}%)"
            status_dot = f'<font color="{attendance_status_color}">●</font>'
            attendance_para = Paragraph(
                f"{attendance_text} {status_dot}",
                ParagraphStyle(
                    name='Attendance',
                    fontSize=12,
                    textColor=colors.black,
                    alignment=TA_LEFT
                )
            )
            elements.append(attendance_para)
            elements.append(Spacer(1, 6*mm))

            elements.append(Paragraph("Lessons Overview", header_style))
            if lessons_data:
                lessons_table = Table(
                    [['Date', 'Planned Topic', 'Achieved Topic']] + [
                        [
                            Paragraph(datetime.strptime(lesson['date'], '%Y-%m-%d').strftime('%d %b %Y'), normal_style),
                            Paragraph(lesson['planned_topic'], normal_style),
                            Paragraph(
                                f"{lesson['achieved_topic']} " + 
                                ('<font color="green">✓</font>' if lesson['planned_topic'] == lesson['achieved_topic'] and lesson['achieved_topic'] != "N/A" else ''),
                                normal_style
                            )
                        ]
                        for lesson in lessons_data
                    ],
                    colWidths=[30*mm, 65*mm, 65*mm]
                )
                lessons_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2c3e50')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTSIZE', (0, 0), (-1, -1), 9),
                    ('LEADING', (0, 0), (-1, -1), 11),
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#dddddd')),
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
            for i in range(0, 4, 2):
                row = []
                for j in range(2):
                    idx = i + j
                    if idx < len(image_slots) and image_slots[idx]:
                        try:
                            img_url = image_slots[idx]
                            logger.debug(f"Processing image {idx+1} from {img_url}")
                            img_data = fetch_image(img_url)
                            if img_data and img_data.getbuffer().nbytes > 0:
                                img = ImageReader(img_data)
                                img_size = img.getSize()
                                logger.debug(f"Image size: {img_size}")
                                if img_size[0] <= 0 or img_size[1] <= 0:
                                    raise ValueError("Invalid image dimensions")
                                img_width, img_height = 75*mm, 50*mm
                                img_ratio = img_size[0] / img_size[1] if img_size[1] > 0 else 1
                                if img_ratio > img_width / img_height:
                                    img._width, img._height = img_width, img_width / img_ratio
                                else:
                                    img._width, img._height = img_height * img_ratio, img_height
                                row.append(img)
                            else:
                                logger.warning(f"Empty or invalid image data for {img_url}")
                                row.append(Paragraph(f"Image {idx+1} (Failed to load)", normal_style))
                        except Exception as e:
                            logger.error(f"Error processing image {idx+1}: {str(e)}", exc_info=True)
                            row.append(Paragraph(f"Image {idx+1} (Error)", normal_style))
                    else:
                        row.append(Paragraph("No Image", normal_style))
                image_table_data.append(row)

            image_table = Table(image_table_data, colWidths=[80*mm, 80*mm], rowHeights=55*mm)
            image_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('BACKGROUND', (0, 0), (-1, -1), colors.white),
                ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor('#dddddd')),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ]))
            elements.append(image_table)

            if len(image_urls) > 4:
                elements.append(Paragraph(
                    f"Note: Showing 4 of {len(image_urls)} images.", 
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
            pdf_buffer.seek(0)
            filename = f"student_report_{student.reg_num}_{period.replace(' ', '_')}.pdf"
            zip_file.writestr(filename, pdf_buffer.getvalue())

        zip_file.close()
        zip_buffer.seek(0)
        response = HttpResponse(zip_buffer, content_type='application/zip')
        response['Content-Disposition'] = f'attachment; filename=student_reports_{period.replace(" ", "_")}.zip'
        return response

    except Exception as e:
        logger.error(f"Error in generate_pdf_batch: {str(e)}", exc_info=True)
        return Response({"error": str(e)}, status=500)