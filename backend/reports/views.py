from django.shortcuts import render

# Create your views here.
from django.http import HttpResponse
from django.views import View
import weasyprint
import datetime
import json

class GeneratePDFView(View):
    def post(self, request, *args, **kwargs):
        try:
            # Parse the report data from the request
            report_data = request.POST.dict() if request.POST else request.body
            if isinstance(report_data, bytes):
                report_data = json.loads(report_data.decode('utf-8'))

            # Extract data (same structure as sent from the client)
            student_data = report_data.get('studentData', {})
            attendance_data = report_data.get('attendanceData', {})
            lessons_data = report_data.get('lessonsData', {})
            selected_images = report_data.get('selectedImages', [])
            formatted_month = report_data.get('formattedMonth', '')
            attendance_percentage = float(report_data.get('attendancePercentage', 0))
            attendance_status_color = report_data.get('attendanceStatusColor', 'gray')

            # Split lessons into chunks for page breaks (10 rows per page)
            max_rows_per_page = 10
            lessons = lessons_data.get('lessons', [])
            lesson_chunks = [
                lessons[i:i + max_rows_per_page]
                for i in range(0, len(lessons), max_rows_per_page)
            ]

            # Generate HTML content for the report
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
                    .report-container {{
                        width: 210mm;
                        height: auto;
                        padding: 10mm;
                        background-color: #f9f9f9;
                        box-sizing: border-box;
                        position: relative;
                    }}
                    .watermark {{
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%) rotate(-45deg);
                        font-size: 30px;
                        color: rgba(0, 0, 0, 0.05);
                        pointer-events: none;
                        max-width: 150mm;
                        overflow: hidden;
                        text-overflow: ellipsis;
                    }}
                    .header {{
                        background: linear-gradient(90deg, #4A90E2, #ffffff);
                        padding: 10mm;
                        border-radius: 5px;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        margin-bottom: 10mm;
                    }}
                    .header h2 {{
                        font-family: 'Montserrat', sans-serif;
                        font-size: 24px;
                        font-weight: bold;
                        color: #333;
                        margin: 0;
                    }}
                    .header img {{
                        height: 40px;
                        border-radius: 5px;
                        object-fit: contain;
                    }}
                    .section {{
                        margin-bottom: 10mm;
                    }}
                    .student-details {{
                        padding: 5mm;
                        border-bottom: 2px solid #4A90E2;
                        line-height: 1.6;
                        page-break-after: always;
                    }}
                    .student-details h3, .attendance h3, .lessons h3, .images h3 {{
                        font-family: 'Montserrat', sans-serif;
                        font-size: 18px;
                        font-weight: bold;
                        color: #4A90E2;
                        margin-bottom: 5px;
                    }}
                    .student-details p, .attendance p {{
                        margin: 3px 0;
                        font-size: 14px;
                    }}
                    .attendance {{
                        padding: 5mm;
                        background-color: rgba(46, 204, 113, 0.1);
                        border-radius: 5px;
                        display: flex;
                        align-items: center;
                        gap: 10px;
                        page-break-inside: avoid;
                    }}
                    .attendance .icon {{
                        font-size: 20px;
                        color: #2ECC71;
                    }}
                    .attendance .status-dot {{
                        display: inline-block;
                        width: 10px;
                        height: 10px;
                        border-radius: 50%;
                        margin-left: 5px;
                    }}
                    .lessons {{
                        page-break-before: always;
                    }}
                    .lessons table {{
                        width: 100%;
                        border-collapse: collapse;
                        border-radius: 5px;
                        overflow: visible;
                    }}
                    .lessons thead tr {{
                        background-color: #4A90E2;
                        color: white;
                    }}
                    .lessons th, .lessons td {{
                        padding: 8px;
                        text-align: left;
                        border: 1px solid #ddd;
                    }}
                    .lessons th {{
                        font-weight: bold;
                    }}
                    .lessons tbody tr:nth-child(even) {{
                        background-color: #f5f5f5;
                    }}
                    .lessons tbody tr {{
                        page-break-inside: avoid;
                    }}
                    .lesson-chunk {{
                        page-break-before: always;
                        margin-bottom: 5mm;
                    }}
                    .lesson-chunk:first-child {{
                        page-break-before: avoid;
                    }}
                    .images {{
                        page-break-before: always;
                    }}
                    .images h3 {{
                        font-size: 16px;
                        text-align: center;
                    }}
                    .images-grid {{
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        grid-template-rows: repeat(2, 50mm);
                        gap: 8mm;
                        padding: 5mm;
                        background-color: white;
                        border-radius: 5px;
                        page-break-inside: avoid;
                    }}
                    .image-slot {{
                        width: 100%;
                        height: 100%;
                        border: 1px solid #ddd;
                        border-radius: 5px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        background-color: #f5f5f5;
                        overflow: hidden;
                        page-break-inside: avoid;
                    }}
                    .image-slot img {{
                        max-width: 100%;
                        max-height: 100%;
                        object-fit: contain;
                        border-radius: 5px;
                    }}
                    .image-slot p {{
                        font-size: 10px;
                        color: #666;
                        margin: 3px 0;
                    }}
                    .image-slot .placeholder {{
                        font-size: 28px;
                        color: #999;
                        font-style: italic;
                    }}
                    .footer {{
                        border-top: 1px solid #ddd;
                        padding-top: 5mm;
                        font-size: 10px;
                        color: #666;
                        margin-top: 10mm;
                        page-break-inside: avoid;
                    }}
                    .footer .flex {{
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }}
                    .footer .powered-by {{
                        background-color: #e5e5e5;
                        padding: 3px 10px;
                        border-radius: 3px;
                    }}
                </style>
            </head>
            <body>
                <div class="report-container">
                    <div class="watermark">{student_data.get('school', '')}</div>

                    <div class="header">
                        <h2>Monthly Student Report</h2>
                        <img src="{request.build_absolute_uri('/static/logo.png')}" alt="School Logo">
                    </div>

                    <div class="section student-details">
                        <h3>Student Details</h3>
                        <p><strong>Student Name:</strong> {student_data.get('name', 'N/A')}</p>
                        <p><strong>Registration Number:</strong> {student_data.get('reg_num', 'N/A')}</p>
                        <p><strong>School:</strong> {student_data.get('school', 'N/A')}</p>
                        <p><strong>Class:</strong> {student_data.get('class', 'N/A')}</p>
                        <p><strong>Month:</strong> {formatted_month or 'N/A'}</p>
                    </div>

                    <div class="section attendance">
                        <span class="icon">✔</span>
                        <div>
                            <h3>Attendance</h3>
                            <p>
                                {
                                    'No school days recorded' if not attendance_data or attendance_data.get('total_days', 0) == 0
                                    else f"{attendance_data.get('present_days', 0)}/{attendance_data.get('total_days', 0)} days ({attendance_percentage:.2f}%)"
                                }
                                <span class="status-dot" style="background-color: {attendance_status_color}"></span>
                            </p>
                        </div>
                    </div>

                    <div class="section lessons">
                        <h3>Lessons Overview</h3>
                        {
                            '<p style="color: #666; font-style: italic; font-size: 14px; text-align: center;">No lessons found for the selected date range.</p>'
                            if not lesson_chunks
                            else ''.join([
                                f'''
                                <div class="lesson-chunk{' first-chunk' if i == 0 else ''}">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th>Planned Topic</th>
                                                <th>Achieved Topic</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {
                                                ''.join([
                                                    f"""
                                                    <tr>
                                                        <td>{
                                                            datetime.datetime.strptime(lesson['date'], '%Y-%m-%d').strftime('%d %b %Y')
                                                            if lesson.get('date')
                                                            else 'N/A'
                                                        }</td>
                                                        <td>{lesson.get('planned_topic', 'N/A')}</td>
                                                        <td>
                                                            {lesson.get('achieved_topic', 'N/A')}
                                                            {
                                                                '<span style="color: green; margin-left: 5px;">✓</span>'
                                                                if lesson.get('planned_topic') == lesson.get('achieved_topic') and lesson.get('achieved_topic')
                                                                else ''
                                                            }
                                                        </td>
                                                    </tr>
                                                    """
                                                    for lesson in chunk
                                                ])
                                            }
                                        </tbody>
                                    </table>
                                </div>
                                '''
                                for i, chunk in enumerate(lesson_chunks)
                            ])
                        }
                    </div>

                    <div class="section images">
                        <h3>Progress Images</h3>
                        {
                            '<p style="color: red; margin-bottom: 10px; text-align: center;">No progress images available for this student.</p>'
                            if not selected_images
                            else ''
                        }
                        <div class="images-grid">
                            {
                                ''.join([
                                    f'''
                                    <div class="image-slot">
                                        {
                                            f"""
                                            <div style="text-align: center; width: 100%;">
                                                <img src="{img}" alt="Progress {i + 1}">
                                                <p>Image {i + 1}</p>
                                            </div>
                                            """
                                            if img
                                            else '<span class="placeholder">[No Image]</span>'
                                        }
                                    </div>
                                    '''
                                    for i, img in enumerate(selected_images + [None] * (4 - len(selected_images)))
                                ])
                            }
                        </div>
                    </div>

                    <div class="footer">
                        <div class="flex">
                            <div>
                                <p style="margin: 0 0 5px 0;">
                                    Teacher’s Signature: <span style="border-bottom: 1px dotted #666; display: inline-block; width: 100px;"></span>
                                </p>
                                <p style="margin: 0;">Generated on: May 16, 2025</p>
                            </div>
                            <div class="powered-by">
                                Powered by {student_data.get('school', 'School Name')}
                            </div>
                        </div>
                    </div>
                </div>
            </body>
            </html>
            """

            # Generate PDF using WeasyPrint
            pdf_file = weasyprint.HTML(string=html_content, base_url=request.build_absolute_uri('/')).write_pdf()

            # Set response headers for PDF download
            response = HttpResponse(pdf_file, content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="Student_Report_{student_data.get("name", "Unknown").replace(" ", "_")}_{student_data.get("reg_num", "Unknown")}.pdf"'
            response['Content-Length'] = len(pdf_file)
            return response

        except Exception as e:
            return HttpResponse(f"Error generating PDF: {str(e)}", status=500)