from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.utils import ImageReader
import datetime
import base64
import requests
from io import BytesIO

@api_view(['POST'])
@csrf_exempt
def generate_pdf(request):
    if request.method == 'POST':
        try:
            # Extract data from request
            data = request.data
            student_data = data.get('studentData', {})
            attendance_data = data.get('attendanceData', {})
            lessons_data = data.get('lessonsData', {})
            selected_images = data.get('selectedImages', [])
            formatted_month = data.get('formattedMonth', '')
            attendance_percentage = data.get('attendancePercentage', 0)
            attendance_status_color = data.get('attendanceStatusColor', 'gray')

            # Define colors (matching LaTeX palette)
            HEADER_BLUE = colors.HexColor('#4A90E2')
            ATTENDANCE_GREEN = colors.HexColor('#2ECC71')
            TABLE_HEADER = colors.HexColor('#34495E')
            FOOTER_GRAY = colors.HexColor('#7F8C8D')
            TABLE_ROW_LIGHT = colors.HexColor('#F5F5F5')
            TABLE_BORDER = colors.HexColor('#DDDDDD')

            # Create PDF document
            response = HttpResponse(content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="Student_Report_{student_data.get('name', 'Unknown')}_{student_data.get('reg_num', 'Unknown')}.pdf"'
            doc = SimpleDocTemplate(response, pagesize=A4, rightMargin=inch, leftMargin=inch, topMargin=inch, bottomMargin=inch)
            elements = []

            # Styles
            styles = getSampleStyleSheet()
            title_style = ParagraphStyle(name='Title', fontSize=24, textColor=HEADER_BLUE, alignment=1)
            header_style = ParagraphStyle(name='Header', fontSize=18, textColor=HEADER_BLUE, spaceAfter=12)
            normal_style = ParagraphStyle(name='Normal', fontSize=12, spaceAfter=6, wordWrap='CJK')  # Enable word wrapping

            # Header
            elements.append(Paragraph("<b>Monthly Student Report</b>", title_style))
            elements.append(Spacer(1, 10))
            elements.append(Paragraph("<hr/>", normal_style))

            # Basic Data
            elements.append(Paragraph("<b>Student Details</b>", header_style))
            data_table = [
                ['<b>Name:</b>', Paragraph(student_data.get('name', 'N/A'), normal_style)],
                ['<b>Registration Number:</b>', Paragraph(student_data.get('reg_num', 'N/A'), normal_style)],
                ['<b>School:</b>', Paragraph(student_data.get('school', 'N/A'), normal_style)],
                ['<b>Class:</b>', Paragraph(student_data.get('class', 'N/A'), normal_style)],
                ['<b>Month/Date Range:</b>', Paragraph(formatted_month, normal_style)],
            ]
            table = Table(data_table, colWidths=[1.5*inch, 5*inch])
            table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.white),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 12),
                ('LEADING', (0, 0), (-1, -1), 14),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ]))
            elements.append(table)
            elements.append(Spacer(1, 12))

            # Attendance
            elements.append(Paragraph("<b>Attendance</b>", header_style))
            attendance_text = f"Attendance: {attendance_data.get('present_days', 0)}/{attendance_data.get('total_days', 0)} days ({attendance_percentage:.2f}%)"
            elements.append(Paragraph(attendance_text, ParagraphStyle(name='Attendance', fontSize=14, textColor=ATTENDANCE_GREEN, alignment=1)))
            status_color = {'green': colors.green, 'orange': colors.orange, 'red': colors.red, 'gray': colors.gray}.get(attendance_status_color, colors.gray)
            elements.append(Paragraph("<hr color='%s' width='2cm' height='5'/>" % status_color.hexval()[2:], normal_style))
            elements.append(Spacer(1, 12))

            # Lessons Table
            elements.append(Paragraph("<b>Lessons Overview</b>", header_style))
            if lessons_data.get('lessons'):
                lessons_data_table = [['Date', 'Planned Topic', 'Achieved Topic']]
                for lesson in lessons_data['lessons']:
                    achieved_mark = '<font color="green">✓</font>' if lesson.get('planned_topic') == lesson.get('achieved_topic') and lesson.get('achieved_topic') else ''
                    lessons_data_table.append([
                        Paragraph(lesson.get('date', 'N/A'), normal_style),
                        Paragraph(lesson.get('planned_topic', 'N/A'), normal_style),
                        Paragraph(f"{lesson.get('achieved_topic', 'N/A')} {achieved_mark}", normal_style)
                    ])
                lessons_table = Table(lessons_data_table, colWidths=[1.5*inch, 3.5*inch, 3.5*inch])  # Increased colWidths
                lessons_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), TABLE_HEADER),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                    ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                    ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                    ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
                    ('FONTSIZE', (0, 0), (-1, -1), 10),  # Reduced font size to prevent overflow
                    ('BACKGROUND', (0, 1), (-1, -1), TABLE_ROW_LIGHT),
                    ('GRID', (0, 0), (-1, -1), 1, TABLE_BORDER),
                    ('LEADING', (0, 0), (-1, -1), 12),
                    ('WORDWRAP', (0, 0), (-1, -1), True),  # Enable word wrapping
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
                        # Fetch and encode image (placeholder logic)
                        try:
                            response = requests.get(image_slots[idx], timeout=5)
                            response.raise_for_status()
                            img_data = BytesIO(response.content)
                            img = ImageReader(img_data)
                            row.append(img)
                        except Exception:
                            row.append(Paragraph(f"Image {idx + 1}<br/>(Failed to load)", normal_style))
                    else:
                        row.append(Paragraph("No Image", normal_style))
                image_table_data.append(row)
            image_table = Table(image_table_data, colWidths=[2.5*inch, 2.5*inch], rowHeights=1.5*inch)
            image_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.black),
                ('BOX', (0, 0), (-1, -1), 0.5, colors.black),
            ]))
            elements.append(image_table)
            elements.append(Spacer(1, 12))

            # Footer
            elements.append(Paragraph("<hr/>", normal_style))
            footer_text = f"Teacher’s Signature: ____________________<br/>Generated on: {datetime.datetime.now().strftime('%B %d, %Y, %I:%M %p PKT')}"
            elements.append(Paragraph(footer_text, ParagraphStyle(name='Footer', fontSize=10, textColor=FOOTER_GRAY, alignment=1)))
            elements.append(Paragraph("Powered by " + student_data.get('school', 'Your School Name'), ParagraphStyle(name='FooterRight', fontSize=10, textColor=FOOTER_GRAY, alignment=2)))

            # Build PDF
            doc.build(elements)
            return response

        except Exception as e:
            return Response({'error': 'An error occurred', 'details': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    return Response({'error': 'Method not allowed'}, status=status.HTTP405_METHOD_NOT_ALLOWED)