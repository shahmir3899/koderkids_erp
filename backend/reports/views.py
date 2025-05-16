from django.http import HttpResponse
from django.views import View
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
import weasyprint
import datetime
import json
from django.conf import settings

@csrf_exempt  # Exempt from CSRF for Postman testing; remove in production with frontend
@api_view(["POST"])
@permission_classes([IsAuthenticated])
class GeneratePDFView(View):
    def post(self, request, *args, **kwargs):
        try:
            # Parse the report data from the request
            report_data = request.POST.dict() if request.POST else request.body
            if isinstance(report_data, bytes):
                report_data = json.loads(report_data.decode('utf-8'))

            # Extract data with defaults
            student_data = report_data.get('studentData', {})
            attendance_data = report_data.get('attendanceData', {})
            lessons_data = report_data.get('lessonsData', {})
            selected_images = report_data.get('selectedImages', [])
            formatted_month = report_data.get('formattedMonth', '')
            attendance_percentage = float(report_data.get('attendancePercentage', 0))
            attendance_status_color = report_data.get('attendanceStatusColor', 'gray')

            # Validate required fields
            if not student_data.get('reg_num'):
                return Response({"error": "studentData.reg_num is required"}, status=400)

            # Split lessons into chunks for page breaks (10 rows per page)
            max_rows_per_page = 10
            lessons = lessons_data.get('lessons', [])
            lesson_chunks = [
                lessons[i:i + max_rows_per_page]
                for i in range(0, len(lessons), max_rows_per_page)
            ]

            # Generate lessons table rows
            lesson_chunks_html = ''
            for i, chunk in enumerate(lesson_chunks):
                chunk_rows = ''
                for lesson in chunk:
                    lesson_date = (
                        datetime.datetime.strptime(lesson['date'], '%Y-%m-%d').strftime('%d %b %Y')
                        if lesson.get('date')
                        else 'N/A'
                    )
                    planned_topic = lesson.get('planned_topic', 'N/A')
                    achieved_topic = lesson.get('achieved_topic', 'N/A')
                    achieved_icon = (
                        '<span style="color: green; margin-left: 5px;">✓</span>'
                        if planned_topic == achieved_topic and achieved_topic
                        else ''
                    )
                    chunk_rows += (
                        f'<tr>'
                        f'<td>{lesson_date}</td>'
                        f'<td>{planned_topic}</td>'
                        f'<td>{achieved_topic}{achieved_icon}</td>'
                        f'</tr>'
                    )
                chunk_html = (
                    f'<div class="lesson-chunk{" first-chunk" if i == 0 else ""}">'
                    f'<table>'
                    f'<thead><tr><th>Date</th><th>Planned Topic</th><th>Achieved Topic</th></tr></thead>'
                    f'<tbody>{chunk_rows}</tbody>'
                    f'</table>'
                    f'</div>'
                )
                lesson_chunks_html += chunk_html

            # Generate images grid
            images_html = ''
            for i, img in enumerate(selected_images + [None] * (4 - len(selected_images))):
                image_content = (
                    f'<div style="text-align: center; width: 100%;">'
                    f'<img src="{img}" alt="Progress {i + 1}" onerror="this.onerror=null; this.parentElement.innerHTML=\'<span class=\\\'placeholder\\\'>[Image Failed to Load]</span>\'">'
                    f'<p>Image {i + 1}</p>'
                    f'</div>'
                    if img
                    else '<span class="placeholder">[No Image]</span>'
                )
                images_html += f'<div class="image-slot">{image_content}</div>'

            # Generate attendance text
            attendance_text = (
                'No school days recorded'
                if not attendance_data or attendance_data.get('total_days', 0) == 0
                else f"{attendance_data.get('present_days', 0)}/{attendance_data.get('total_days', 0)} days ({attendance_percentage:.2f}%)"
            )

            # Construct logo URL with fallback
            logo_url = request.build_absolute_uri('/static/logo.png')
            header_html = f"""
            <div class="header">
                <h2>Monthly Student Report</h2>
                <img src="{logo_url}" alt="School Logo" onerror="this.onerror=null; this.src='https://via.placeholder.com/40';">
            </div>
            """

            # Construct the full HTML
            html_content = f"""
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Student Report</title>
                <style>
                    @page {{ size: A4; margin: 5mm; }}
                    body {{ margin: 0; font-family: 'Roboto', sans-serif; color: #333; }}
                    .report-container {{ width: 210mm; padding: 10mm; background-color: #f9f9f9; }}
                    .header {{ padding: 10mm; display: flex; justify-content: space-between; align-items: center; }}
                    .header h2 {{ font-size: 24px; }}
                    .header img {{ height: 40px; border-radius: 5px; }}
                    .student-details {{ padding: 5mm; border-bottom: 2px solid #4A90E2; }}
                    .student-details p {{ margin: 3px 0; font-size: 14px; }}
                    .attendance {{ padding: 5mm; background-color: rgba(46, 204, 113, 0.1); }}
                    .attendance p {{ margin: 3px 0; }}
                    .lessons {{ margin-top: 10mm; }}
                    .lessons table {{ width: 100%; border-collapse: collapse; }}
                    .lessons th, .lessons td {{ padding: 8px; border: 1px solid #ddd; }}
                    .images {{ margin-top: 10mm; }}
                    .images-grid {{ display: grid; grid-template-columns: repeat(2, 1fr); gap: 8mm; }}
                    .image-slot {{ border: 1px solid #ddd; padding: 5mm; text-align: center; }}
                    .placeholder {{ font-style: italic; color: #999; }}
                </style>
            </head>
            <body>
                <div class="report-container">
                    {header_html}
                    <div class="student-details">
                        <h3>Student Details</h3>
                        <p><strong>Name:</strong> {student_data.get('name', 'N/A')}</p>
                        <p><strong>Reg Num:</strong> {student_data.get('reg_num', 'N/A')}</p>
                        <p><strong>School:</strong> {student_data.get('school', 'N/A')}</p>
                        <p><strong>Class:</strong> {student_data.get('class', 'N/A')}</p>
                        <p><strong>Month:</strong> {formatted_month or 'N/A'}</p>
                    </div>
                    <div class="attendance">
                        <h3>Attendance</h3>
                        <p>{attendance_text} <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background-color: {attendance_status_color};"></span></p>
                    </div>
                    <div class="lessons">
                        <h3>Lessons Overview</h3>
                        {lesson_chunks_html if lesson_chunks else '<p>No lessons recorded</p>'}
                    </div>
                    <div class="images">
                        <h3>Progress Images</h3>
                        <div class="images-grid">
                            {images_html}
                        </div>
                    </div>
                </div>
            </body>
            </html>
            """

            # Generate PDF using WeasyPrint
            pdf_file = weasyprint.HTML(string=html_content, base_url=request.build_absolute_uri('/')).write_pdf()

            # Set response headers for PDF download
            response = Response(pdf_file, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="Student_Report_{student_data.get('name', 'Unknown').replace(' ', '_')}_{student_data.get('reg_num', 'Unknown')}.pdf"'
            response['Content-Length'] = len(pdf_file)
            return response

        except Exception as e:
            return Response({"error": f"Error generating PDF: {str(e)}"}, status=500)
