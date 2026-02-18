"""
Homework Upload Guide - PDF Generator
======================================
Generates a student-friendly PDF guide for the homework upload section.

Run:   python generate_homework_guide.py
Output: homework_upload_guide.pdf (in same directory)

To update: Edit the GUIDE_CONTENT list below, then re-run the script.
Requires: pip install reportlab
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer,
    Table, TableStyle, ListFlowable, ListItem,
)
from reportlab.lib.units import inch, mm
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from datetime import datetime
import os

# ── EDITABLE CONTENT ──────────────────────────────────
# Edit the sections below and re-run to regenerate the PDF.
# Each section has a "title" and a list of "bullets".
# Use type: "header" for the main title (no bullets).

GUIDE_TITLE = "How to Upload Your Homework"
GUIDE_SUBTITLE = "A Step-by-Step Guide for Students"

GUIDE_CONTENT = [
    {
        "title": "Step 1: Open Your Lesson",
        "bullets": [
            "Go to the <b>Learning</b> tab in the sidebar.",
            "Click on your assigned lesson from the <b>My Lessons</b> page.",
            "Navigate to the topic that has a <b>home activity</b> (green icon).",
        ],
    },
    {
        "title": "Step 2: Complete the Activity",
        "bullets": [
            "Read through the lesson content carefully (a reading timer tracks your time).",
            "Complete the activity using the recommended software (Scratch, Canva, Python, etc.).",
            "Take a <b>screenshot</b> of your completed work on your device.",
        ],
    },
    {
        "title": "Step 3: Upload Your Screenshot",
        "bullets": [
            "Scroll down to the <b>Upload Your Work</b> section (green dashed box).",
            "Tap <b>Take a Photo or Choose Image</b> to select your screenshot.",
            "Choose the <b>software you used</b> from the dropdown menu.",
            "Optionally add notes describing what you made.",
            "Tap the <b>Submit Homework</b> button.",
            "Wait for the success message - your image is automatically compressed and uploaded.",
        ],
    },
    {
        "title": "Step 4: Wait for Teacher Review",
        "bullets": [
            "After uploading, your status changes to <b>Waiting for Teacher Review</b>.",
            "Your teacher will review your screenshot and provide feedback.",
            "If your work is <b>approved</b>, you move to the next step.",
            "If your work is <b>rejected</b>, you will need to re-upload with improvements.",
        ],
    },
    {
        "title": "Step 5: Guardian Review",
        "bullets": [
            "This step can only be done <b>outside school hours</b> (after 3:00 PM).",
            "Ask your parent or guardian to sit with you.",
            "Show them your completed activity and the teacher's feedback.",
            "Your guardian will review and approve your work on this device.",
            "Once approved, the topic is <b>fully completed</b>!",
        ],
    },
    {
        "title": "Tips & Troubleshooting",
        "bullets": [
            "Images are automatically compressed - no need to resize before uploading.",
            "Maximum file size before compression: <b>10 MB</b>.",
            "Supported formats: JPG, PNG, and other common image types.",
            "You can only submit <b>one screenshot per topic</b>.",
            "If the upload fails, check your internet connection and try again.",
            "If you see 'User session not found', refresh the page and log in again.",
        ],
    },
]

# ── END EDITABLE CONTENT ──────────────────────────────

# Color palette (matches the app's book theme)
COLOR_PRIMARY = HexColor("#6B21A8")       # Purple heading
COLOR_SECONDARY = HexColor("#10B981")     # Green (home activity)
COLOR_TEXT = HexColor("#1E293B")          # Dark text
COLOR_MUTED = HexColor("#64748B")        # Muted text
COLOR_BG_LIGHT = HexColor("#F0FDF4")     # Light green background
COLOR_BORDER = HexColor("#E2E8F0")       # Light border
COLOR_STEP_BG = HexColor("#F8FAFC")      # Step background


def build_styles():
    """Create custom paragraph styles for the PDF."""
    base = getSampleStyleSheet()

    styles = {
        "title": ParagraphStyle(
            "GuideTitle",
            parent=base["Title"],
            fontSize=24,
            textColor=COLOR_PRIMARY,
            spaceAfter=6,
            alignment=TA_CENTER,
            fontName="Helvetica-Bold",
        ),
        "subtitle": ParagraphStyle(
            "GuideSubtitle",
            parent=base["Normal"],
            fontSize=12,
            textColor=COLOR_MUTED,
            spaceAfter=24,
            alignment=TA_CENTER,
            fontName="Helvetica",
        ),
        "section_title": ParagraphStyle(
            "SectionTitle",
            parent=base["Heading2"],
            fontSize=14,
            textColor=COLOR_PRIMARY,
            spaceBefore=16,
            spaceAfter=8,
            fontName="Helvetica-Bold",
            borderWidth=0,
            borderPadding=0,
        ),
        "bullet": ParagraphStyle(
            "BulletText",
            parent=base["Normal"],
            fontSize=10,
            textColor=COLOR_TEXT,
            fontName="Helvetica",
            leading=14,
            leftIndent=20,
            spaceBefore=2,
            spaceAfter=2,
        ),
        "footer": ParagraphStyle(
            "Footer",
            parent=base["Normal"],
            fontSize=8,
            textColor=COLOR_MUTED,
            alignment=TA_CENTER,
            fontName="Helvetica",
        ),
    }
    return styles


def generate_pdf(output_path="homework_upload_guide.pdf"):
    """Generate the homework guide PDF."""
    styles = build_styles()

    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        topMargin=30 * mm,
        bottomMargin=20 * mm,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
    )

    story = []

    # Title
    story.append(Paragraph(GUIDE_TITLE, styles["title"]))
    story.append(Paragraph(GUIDE_SUBTITLE, styles["subtitle"]))
    story.append(Spacer(1, 8))

    # Divider line
    divider_data = [["" ]]
    divider_table = Table(divider_data, colWidths=[doc.width])
    divider_table.setStyle(TableStyle([
        ("LINEBELOW", (0, 0), (-1, -1), 1, COLOR_SECONDARY),
    ]))
    story.append(divider_table)
    story.append(Spacer(1, 12))

    # Content sections
    for section in GUIDE_CONTENT:
        # Section title
        story.append(Paragraph(section["title"], styles["section_title"]))

        # Bullets as a numbered/bulleted list
        if section.get("bullets"):
            items = []
            for bullet_text in section["bullets"]:
                items.append(
                    ListItem(
                        Paragraph(bullet_text, styles["bullet"]),
                        bulletColor=COLOR_SECONDARY,
                        value="circle",
                    )
                )
            bullet_list = ListFlowable(
                items,
                bulletType="bullet",
                bulletFontSize=6,
                bulletOffsetY=-1,
                start="circle",
            )
            story.append(bullet_list)
            story.append(Spacer(1, 6))

    # Footer
    story.append(Spacer(1, 30))
    divider_table2 = Table([["" ]], colWidths=[doc.width])
    divider_table2.setStyle(TableStyle([
        ("LINEBELOW", (0, 0), (-1, -1), 0.5, COLOR_BORDER),
    ]))
    story.append(divider_table2)
    story.append(Spacer(1, 8))

    gen_date = datetime.now().strftime("%B %d, %Y")
    story.append(Paragraph(
        f"Generated on {gen_date} | School Management System",
        styles["footer"],
    ))

    # Build PDF
    doc.build(story)
    print(f"PDF generated: {os.path.abspath(output_path)}")


if __name__ == "__main__":
    # Output PDF next to this script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output = os.path.join(script_dir, "homework_upload_guide.pdf")
    generate_pdf(output)
