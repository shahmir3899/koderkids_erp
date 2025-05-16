from django.http import HttpResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
import weasyprint
import datetime
import json
import logging

# Configure logging
logger = logging.getLogger(__name__)

@csrf_exempt
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def generate_pdf_view(request):
    try:
        # Parse and sanitize JSON input
        logger.info("Received request to generate PDF")
        try:
            report_data = json.loads(request.body.decode('utf-8'))
            logger.debug(f"Raw report_data: {report_data}")
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {str(e)}")
            return Response({"error": "Invalid JSON data"}, status=400)

        # Sanitize string fields to ensure UTF-8 compatibility
        def sanitize_dict(d):
            for key, value in d.items():
                if isinstance(value, dict):
                    sanitize_dict(value)
                elif isinstance(value, list):
                    for item in value:
                        if isinstance(item, dict):
                            sanitize_dict(item)
                elif isinstance(value, str):
                    d[key] = value.encode('utf-8', errors='ignore').decode('utf-8')

        sanitize_dict(report_data)
        logger.debug(f"Sanitized report_data: {report_data}")

        student_data = report_data.get('studentData', {})
        attendance_data = report_data.get('attendanceData', {})
        lessons_data = report_data.get('lessonsData', {})
        selected_images = report_data.get('selectedImages', [])
        formatted_month = report_data.get('formattedMonth', '')
        attendance_percentage = float(report_data.get('attendancePercentage', 0))
        attendance_status_color = report_data.get('attendanceStatusColor', 'gray')

        if not student_data.get('reg_num'):
            logger.warning("Missing reg_num in studentData")
            return Response({"error": "studentData.reg_num is required"}, status=400)

        max_rows_per_page = 10
        lessons = lessons_data.get('lessons', [])
        lesson_chunks = [lessons[i:i + max_rows_per_page] for i in range(0, len(lessons), max_rows_per_page)]

        lesson_chunks_html = ''
        for i, chunk in enumerate(lesson_chunks):
            chunk_rows = ''
            for lesson in chunk:
                lesson_date = datetime.datetime.strptime(lesson['date'], '%Y-%m-%d').strftime('%d %b %Y') if lesson.get('date') else 'N/A'
                planned_topic = lesson.get('planned_topic', 'N/A')
                achieved_topic = lesson.get('achieved_topic', 'N/A')
                achieved_icon = '✓' if planned_topic == achieved_topic and achieved_topic else ''
                chunk_rows += f'{lesson_date}\t{planned_topic}\t{achieved_topic}{achieved_icon}<br>'
            chunk_html = f'<table><thead><tr><th>Date</th><th>Planned Topic</th><th>Achieved Topic</th></tr></thead><tbody>{chunk_rows}</tbody></table>'
            lesson_chunks_html += chunk_html

        images_html = ''
        for i, img in enumerate(selected_images + [None] * (4 - len(selected_images))):
            image_content = f'Image {i + 1}<br>' if img else '[No Image]<br>'
            images_html += f'{image_content}'

        attendance_text = 'No school days recorded' if not attendance_data or attendance_data.get('total_days', 0) == 0 else f"{attendance_data.get('present_days', 0)}/{attendance_data.get('total_days', 0)} days ({attendance_percentage:.2f}%)"

        # Temporarily comment out logo to isolate issue
        # logo_url = request.build_absolute_uri('/static/logo.png')
        # header_html = f'<img src="{logo_url}" alt="Koder Kids Logo" style="width: 100px; height: auto;" /><br>Monthly Student Report<br>'
        header_html = 'Monthly Student Report<br>'

        html_content = f"""
        <html>
        <body>
            {header_html}
            <h3>Student Details</h3>
            <p>Name: {student_data.get('name', 'N/A')}</p>
            <p>Reg Num: {student_data.get('reg_num', 'N/A')}</p>
            <p>School: {student_data.get('school', 'N/A')}</p>
            <p>Class: {student_data.get('class', 'N/A')}</p>
            <p>Month: {formatted_month or 'N/A'}</p>

            <h3>Attendance</h3>
            <p>{attendance_text}</p>

            <h3>Lessons Overview</h3>
            {lesson_chunks_html if lesson_chunks else '<p>No lessons recorded</p>'}

            <h3>Progress Images</h3>
            <p>{images_html}</p>
        </body>
        </html>
        """

        logger.debug("Generating PDF with WeasyPrint")
        pdf_file = weasyprint.HTML(string=html_content, base_url=request.build_absolute_uri('/')).write_pdf()
        logger.info("PDF generated successfully")

        name = student_data.get('name', 'Unknown').replace(' ', '_')
        reg_num = student_data.get('reg_num', 'Unknown')
        filename = f"Student_Report_{name}_{reg_num}.pdf"

        # Use HttpResponse to avoid JSON serialization
        response = HttpResponse(pdf_file, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename="{filename}"'
        response['Content-Length'] = len(pdf_file)
        logger.info(f"Returning PDF response: {filename}")
        return response

    except Exception as e:
        logger.error(f"Error generating PDF: {str(e)}", exc_info=True)
        return Response({"error": f"Error generating PDF: {str(e)}"}, status=500)