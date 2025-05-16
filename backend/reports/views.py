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

@api_view(['POST'])
@csrf_exempt
def generate_pdf(request):
    if request.method != 'POST':
        return Response({'error': 'Method not allowed'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

    print("Starting PDF generation")
    pdf_response = HttpResponse(content_type='application/pdf')
    
    try:
        # Extract data from request
        data = request.data
        print("Data fetched:", data)
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
        title_style = ParagraphStyle(name='Title', fontSize=22, textColor=HEADER_BLUE, alignment=TA_CENTER, spaceAfter=10)
        header_style = ParagraphStyle(name='Header', fontSize=16, textColor=HEADER_BLUE, spaceAfter=8)
        normal_style = ParagraphStyle(name='Normal', fontSize=10, spaceAfter=4, wordWrap='CJK')
        footer_style = ParagraphStyle(name='Footer', fontSize=9, textColor=FOOTER_GRAY, alignment=TA_LEFT)

        # Logo
        logo_url = 'https://koderkids-erp.onrender.com/static/logo.png'  # Replace with actual logo URL or static file path
        try:
            logo_response = requests.get(logo_url, timeout=5)
            logo_response.raise_for_status()
            logo_data = BytesIO(logo_response.content)
            logo = ImageReader(logo_data)
            logo_width, logo_height = 50*mm, 15*mm
            logo_ratio = logo.getSize()[0] / logo.getSize()[1]
            if logo.getSize()[0] > logo_width:
                logo._width, logo._height = logo_width, logo_width / logo_ratio
            if logo._height > logo_height:
                logo._width, logo._height = logo_height * logo_ratio, logo_height
            elements.append(logo)
        except Exception as e:
            print(f"Failed to load logo: {e}")
            elements.append(Paragraph("Logo not available", normal_style))

        # Header
        elements.append(Paragraph("<b>Monthly Student Report</b>", title_style))
        elements.append(Paragraph("<hr/>", normal_style))
        elements.append(Spacer(1, 10))

        # Student Details
        elements.append(Paragraph("<b>Student Details</b>", header_style))
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
        ]))
        elements.append(table)
        elements.append(Spacer(1, 12))

        # Attendance
        elements.append(Paragraph("<b>Attendance</b>", header_style))
        attendance_text = f"{attendance_data.get('present_days', 0)}/{attendance_data.get('total_days', 0)} days ({attendance_percentage:.2f}%)"
        elements.append(Paragraph(attendance_text, ParagraphStyle(name='Attendance', fontSize=12, textColor=ATTENDANCE_GREEN, alignment=TA_CENTER)))
        status_color = {'green': colors.green, 'orange': colors.orange, 'red': colors.red, 'gray': colors.gray}.get(attendance_status_color, colors.gray)
        elements.append(Paragraph("<hr color='%s' width='2cm' height='5'/>" % status_color.hexval()[2:], normal_style))
        elements.append(Spacer(1, 12))

        # Lessons Table
        elements.append(Paragraph("<b>Lessons Overview</b>", header_style))
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
            lessons_table = Table(lessons_data_table, colWidths=[40*mm, 60*mm, 60*mm])
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
            ]))
            elements.append(lessons_table)
        else:
            elements.append(Paragraph("No lessons found for the selected date range.", normal_style))
        elements.append(Spacer(1, 12))

        # Image Grid
        elements.append(Paragraph("<b>Progress Images</b>", header_style))
        image_slots = selected_images + [None] * (4 - len(selected_images))
        image_table_data = []
        for i in range(0, 4, 2):
            row = []
            for j in range(2):
                idx = i + j
                if idx < len(image_slots) and image_slots[idx]:
                    try:
                        img_response = requests.get(image_slots[idx], timeout=10)
                        img_response.raise_for_status()
                        img_data = BytesIO(img_response.content)
                        img = ImageReader(img_data)
                        img_width, img_height = 75*mm, 50*mm
                        img_ratio = img.getSize()[0] / img.getSize()[1]
                        if img_ratio > img_width / img_height:
                            img._width, img._height = img_width, img_width / img_ratio
                        else:
                            img._width, img._height = img_height * img_ratio, img_height
                        row.append(img)
                    except Exception as e:
                        print(f"Failed to load image {idx + 1}: {e}")
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
        ]))
        elements.append(image_table)
        elements.append(Spacer(1, 12))

        # Footer
        elements.append(Paragraph("<hr/>", normal_style))
        footer_text = (
            f"Teacher’s Signature: ____________________<br/>"
            f"Generated on: {datetime.datetime.now().strftime('%B %d, %Y, %I:%M %p PKT')}<br/>"
            f"Powered by {student_data.get('school', 'Your School Name')}"
        )
        elements.append(Paragraph(footer_text, footer_style))

        print("Building PDF with elements:", len(elements))
        doc.build(elements)
        print("PDF built successfully")
        return pdf_response

    except Exception as e:
        print("Exception occurred:", str(e))
        return Response({'error': 'Failed to generate PDF', 'details': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)