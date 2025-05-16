from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.lib.utils import ImageReader
from reportlab.lib.enums import TA_LEFT, TA_CENTER
import datetime
import requests
from io import BytesIO
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@api_view(['POST'])
@csrf_exempt
def generate_pdf(request):
    if request.method != 'POST':
        return Response({'error': 'Method not allowed'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

    logger.info("Starting PDF generation")
    pdf_response = HttpResponse(content_type='application/pdf')
    
    try:
        # Extract data from request
        data = request.data
        logger.info("Data fetched: %s", data)
        student_data = data.get('studentData', {})
        attendance_data = data.get('attendanceData', {})
        lessons_data = data.get('lessonsData', {})
        selected_images = data.get('selectedImages', [])
        formatted_month = data.get('formattedMonth', '')
        attendance_percentage = data.get('attendancePercentage', 0)
        attendance_status_color = data.get('attendanceStatusColor', 'gray')

        # Set PDF metadata
        student_name = student_data.get('name', 'Unknown').replace(' ', '_')
        student_reg_num = student_data.get('reg_num', 'Unknown')
        pdf_response['Content-Disposition'] = f'attachment; filename="Student_Report_{student_name}_{student_reg_num}.pdf"'

        # Define colors
        HEADER_BLUE = colors.HexColor('#4A90E2')
        ATTENDANCE_GREEN = colors.HexColor('#2ECC71')
        TABLE_HEADER = colors.HexColor('#34495E')
        FOOTER_GRAY = colors.HexColor('#7F8C8D')
        TABLE_ROW_LIGHT = colors.HexColor('#F5F5F5')
        TABLE_BORDER = colors.HexColor('#DDDDDD')

        # Create PDF document
        doc = SimpleDocTemplate(pdf_response, pagesize=A4, rightMargin=15*mm, leftMargin=15*mm, topMargin=20*mm, bottomMargin=15*mm)
        elements = []

        # Styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(name='Title', fontSize=22, textColor=HEADER_BLUE, alignment=TA_CENTER, spaceAfter=8, fontName='Helvetica-Bold')
        header_style = ParagraphStyle(name='Header', fontSize=16, textColor=HEADER_BLUE, spaceAfter=6, fontName='Helvetica-Bold')
        normal_style = ParagraphStyle(name='Normal', fontSize=10, spaceAfter=4, wordWrap='CJK', fontName='Helvetica')
        footer_style = ParagraphStyle(name='Footer', fontSize=9, textColor=FOOTER_GRAY, alignment=TA_LEFT, leading=12)

        # Logo
        logo_url = 'https://koderkids-erp.onrender.com/static/logo.png'  # Replace with actual logo URL
        try:
            logo_response = requests.get(logo_url, timeout=10, headers={'User-Agent': 'Mozilla/5.0'})
            logo_response.raise_for_status()
            logo_data = BytesIO(logo_response.content)
            logo = ImageReader(logo_data)
            logo_width, logo_height = 50*mm, 15*mm
            logo_ratio = logo.getSize()[0] / logo.getSize()[1]
            if logo_ratio > logo_width / logo_height:
                logo._width, logo._height = logo_width, logo_width / logo_ratio
            else:
                logo._width, logo._height = logo_height * logo_ratio, logo_height
            logo.hAlign = 'CENTER'
            elements.append(logo)
        except Exception as e:
            logger.error("Failed to load logo from %s: %s", logo_url, e)
            elements.append(Paragraph("Mazen Schools Quaid Campus", title_style))  # Fallback to text
        elements.append(Spacer(1, 10*mm))

        # Header
        elements.append(Paragraph("Monthly Student Report", title_style))
        elements.append(Paragraph("<hr/>", normal_style))
        elements.append(Spacer(1, 10*mm))

        # Student Details
        elements.append(Paragraph("Student Details", header_style))
        data_table = [
            ['Name:', Paragraph(student_data.get('name', 'N/A'), normal_style)],
            ['Registration Number:', Paragraph(student_data.get('reg_num', 'N/A'), normal_style)],
            ['School:', Paragraph(student_data.get('school', 'N/A'), normal_style)],
            ['Class:', Paragraph(student_data.get('class', 'N/A'), normal_style)],
            ['Month/Date Range:', Paragraph(formatted_month, normal_style)],
        ]
        table = Table(data_table, colWidths=[40*mm, 120*mm])
        table.setStyle(TableStyle([
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (1, 0), (1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('LEADING', (0, 0), (-1, -1), 12),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('GRID', (0, 0), (-1, -1), 0.5, TABLE_BORDER),
            ('BACKGROUND', (0, 0), (-1, -1), colors.white),
            ('BOX', (0, 0), (-1, -1), 0.5, TABLE_BORDER),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(table)
        elements.append(Spacer(1, 10*mm))

        # Attendance
        elements.append(Paragraph("Attendance", header_style))
        attendance_text = f"{attendance_data.get('present_days', 0)}/{attendance_data.get('total_days', 0)} days ({attendance_percentage:.2f}%)"
        elements.append(Paragraph(attendance_text, ParagraphStyle(name='Attendance', fontSize=12, textColor=ATTENDANCE_GREEN, alignment=TA_CENTER)))
        status_color = {'green': colors.green, 'orange': colors.orange, 'red': colors.red, 'gray': colors.gray}.get(attendance_status_color, colors.gray)
        elements.append(Paragraph("<hr color='%s' width='20mm' height='5'/>" % status_color.hexval()[2:], normal_style))
        elements.append(Spacer(1, 10*mm))

        # Lessons Table
        elements.append(Paragraph("Lessons Overview", header_style))
        if lessons_data.get('lessons'):
            lessons_data_table = [['Date', 'Planned Topic', 'Achieved Topic']]
            for lesson in lessons_data['lessons']:
                date_str = lesson.get('date', 'N/A')
                try:
                    date_obj = datetime.datetime.strptime(date_str, '%Y-%m-%d')
                    formatted_date = date_obj.strftime('%d %b %Y')
                except ValueError:
                    formatted_date = date_str
                achieved_mark = '<font color="green">✓</font>' if lesson.get('planned_topic') == lesson.get('achieved_topic') and lesson.get('achieved_topic') else ''
                lessons_data_table.append([
                    Paragraph(formatted_date, normal_style),
                    Paragraph(lesson.get('planned_topic', 'N/A'), normal_style),
                    Paragraph(f"{lesson.get('achieved_topic', 'N/A')} {achieved_mark}", normal_style)
                ])
            lessons_table = Table(lessons_data_table, colWidths=[30*mm, 65*mm, 65*mm])
            lessons_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('LEADING', (0, 0), (-1, -1), 11),
                ('BACKGROUND', (0, 1), (-1, -1), TABLE_ROW_LIGHT),
                ('GRID', (0, 0), (-1, -1), 0.5, TABLE_BORDER),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('WORDWRAP', (0, 0), (-1, -1), True),
                ('TOPPADDING', (0, 0), (-1, -1), 4),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
            ]))
            elements.append(lessons_table)
        else:
            elements.append(Paragraph("No lessons found for the selected date range.", normal_style))
        elements.append(Spacer(1, 10*mm))

        # Image Grid
        elements.append(Paragraph("Progress Images", header_style))
        image_slots = selected_images + [None] * (4 - len(selected_images))
        image_table_data = []
        for i in range(0, 4, 2):
            row = []
            for j in range(2):
                idx = i + j
                if idx < len(image_slots) and image_slots[idx]:
                    try:
                        # Validate URL
                        if not image_slots[idx].startswith(('http://', 'https://')):
                            raise ValueError("Invalid URL scheme")
                        logger.info("Fetching image %d: %s", idx + 1, image_slots[idx])
                        img_response = requests.get(image_slots[idx], timeout=15, headers={'User-Agent': 'Mozilla/5.0'})
                        img_response.raise_for_status()
                        img_data = BytesIO(img_response.content)
                        img = ImageReader(img_data)
                        img_width, img_height = 75*mm, 50*mm
                        img_ratio = img.getSize()[0] / img.getSize()[1]
                        if img_ratio > img_width / img_height:
                            img._width, img._height = img_width, img_width / img_ratio
                        else:
                            img._width, img._height = img_height * img_ratio, img_height
                        img.hAlign = 'CENTER'
                        row.append(img)
                    except Exception as e:
                        logger.error("Failed to load image %d from %s: %s", idx + 1, image_slots[idx], e)
                        row.append(Paragraph(f"Image {idx + 1} (Failed to load)", normal_style))
                else:
                    row.append(Paragraph("No Image", normal_style))
            image_table_data.append(row)
        image_table = Table(image_table_data, colWidths=[80*mm, 80*mm], rowHeights=55*mm)
        image_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('INNERGRID', (0, 0), (-1, -1), 0.5, TABLE_BORDER),
            ('BOX', (0, 0), (-1, -1), 0.5, TABLE_BORDER),
            ('BACKGROUND', (0, 0), (-1, -1), colors.white),
            ('TOPPADDING', (0, 0), (-1, -1), 4),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ]))
        elements.append(image_table)
        elements.append(Spacer(1, 10*mm))

        # Footer
        elements.append(Paragraph("<hr/>", normal_style))
        footer_text = (
            f"Teacher’s Signature: ____________________<br/>"
            f"Generated on: {datetime.datetime.now().strftime('%B %d, %Y, %I:%M %p PKT')}<br/>"
            f"Powered by {student_data.get('school', 'Your School Name')}"
        )
        elements.append(Paragraph(footer_text, footer_style))

        logger.info("Building PDF with %d elements", len(elements))
        doc.build(elements)
        logger.info("PDF built successfully")
        return pdf_response

    except Exception as e:
        logger.error("Exception occurred: %s", e)
        return Response({'error': 'Failed to generate PDF', 'details': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)