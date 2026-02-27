"""
Learning System Guide - PDF Generator
======================================
Generates a comprehensive student guide covering:
  - Accessing and starting courses
  - Book viewer navigation
  - 5-Step Validation Pipeline
  - Homework upload process
  - Guardian review
  - Troubleshooting

Run:   python generate_homework_guide.py
Output: learning_system_guide.pdf (in same directory)

To update: Edit the GUIDE_SECTIONS list below, then re-run the script.
Requires: pip install reportlab
"""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer,
    Table, TableStyle, ListFlowable, ListItem,
    PageBreak, HRFlowable,
)
from reportlab.lib.units import inch, mm
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from datetime import datetime
import os

# ── EDITABLE CONTENT ──────────────────────────────────
# Edit the sections below and re-run to regenerate the PDF.
#
# Section types:
#   "heading"  — Large section header (starts a new visual block)
#   "steps"    — Numbered step with bullets
#   "info"     — Info box with bullets
#   "table"    — A simple two-column table (uses "rows" instead of "bullets")
#   "pagebreak"— Forces a new page

GUIDE_TITLE = "Learning System - Student Guide"
GUIDE_SUBTITLE = "Complete guide to courses, activities, validations, and homework uploads"

GUIDE_SECTIONS = [
    # ─── SECTION 1: GETTING STARTED ───────────────────
    {
        "type": "heading",
        "title": "Section 1: Getting Started with My Lessons",
    },
    {
        "type": "info",
        "title": "What is My Lessons?",
        "bullets": [
            "My Lessons is your personal learning dashboard inside the <b>Learning</b> tab.",
            "It shows all the courses (books) your teacher has assigned to your class.",
            "Each course contains multiple <b>topics</b> that you work through in order.",
            "Your progress is tracked automatically as you read and complete activities.",
        ],
    },
    {
        "type": "steps",
        "title": "How to Access Your Lessons",
        "bullets": [
            "Log in to the School Management System with your student account.",
            "Click on the <b>Learning</b> tab in the left sidebar.",
            "You will see the <b>My Lessons</b> page with your assigned courses.",
            "Each course card shows: title, number of topics, duration, and your progress.",
            "Click <b>Continue</b> on any course to open the Book Viewer.",
        ],
    },
    {
        "type": "info",
        "title": "Understanding Course Cards",
        "bullets": [
            "<b>Progress bar</b> — Shows your overall completion percentage.",
            "<b>Colored dots</b> — Each dot represents one topic in the course:",
            "    Green dot = Topic fully completed",
            "    Yellow dot = Topic in progress",
            "    Red dot = Topic needs your action (re-upload or guardian review)",
            "    Gray dot = Topic not started yet",
            "If no courses appear, your teacher has not yet assigned lessons to your class.",
        ],
    },

    {"type": "pagebreak"},

    # ─── SECTION 2: BOOK VIEWER ───────────────────────
    {
        "type": "heading",
        "title": "Section 2: Using the Book Viewer",
    },
    {
        "type": "info",
        "title": "What is the Book Viewer?",
        "bullets": [
            "The Book Viewer is where you read lesson content and complete activities.",
            "It looks like a digital textbook with pages you navigate through.",
            "The left sidebar shows all topics — click any <b>unlocked</b> topic to jump to it.",
            "Topics are <b>sequential</b> — you must fully complete one before the next unlocks.",
        ],
    },
    {
        "type": "steps",
        "title": "Navigating the Book Viewer",
        "bullets": [
            "Use the <b>sidebar</b> (left side) to see all topics and your progress on each.",
            "Locked topics show a <b>lock icon</b> — complete the previous topic to unlock.",
            "The main area shows the current topic's content: text, images, and activities.",
            "A <b>Reading Timer</b> at the bottom tracks how long you have been reading.",
            "You must read for the <b>required time</b> before you can mark the topic complete.",
            "The required reading time is calculated from the content length (longer topics need more time).",
        ],
    },
    {
        "type": "info",
        "title": "Types of Content Blocks",
        "bullets": [
            "<b>Reading blocks</b> — Regular lesson text and images. Just read through them.",
            "<b>Class Activity</b> (purple) — An activity to do in class with your teacher.",
            "<b>Home Activity</b> (green) — An activity to do at home. Requires screenshot upload.",
            "<b>Key Vocabulary</b> — Important terms and definitions to remember.",
            "<b>Fun Fact</b> — Interesting facts related to the lesson.",
        ],
    },

    {"type": "pagebreak"},

    # ─── SECTION 3: VALIDATION PIPELINE ───────────────
    {
        "type": "heading",
        "title": "Section 3: The 5-Step Validation Pipeline",
    },
    {
        "type": "info",
        "title": "What is Validation?",
        "bullets": [
            "Topics with <b>Home Activities</b> require a 5-step validation process.",
            "You can see your current step in the <b>Validation Stepper</b> bar at the top of the topic.",
            "Each step must be completed in order before the topic is marked as fully done.",
            "Topics <b>without</b> home activities only require reading time + mark complete (no 5-step process).",
        ],
    },
    {
        "type": "table",
        "title": "The 5 Validation Steps",
        "columns": ["Step", "What Happens"],
        "rows": [
            ["Step 1: Reading Time", "Read the topic for the required time. A timer tracks your progress. You cannot skip ahead until the timer completes."],
            ["Step 2: Complete Activity", "After reading, click 'Mark Activity Complete' to confirm you did the class activity."],
            ["Step 3: Upload Screenshot", "Take a screenshot of your home activity work and upload it (see Section 4 below)."],
            ["Step 4: Teacher Review", "Your teacher reviews your uploaded screenshot. They will approve or request changes. You wait during this step."],
            ["Step 5: Guardian Review", "Your parent/guardian reviews and approves your work. This can only be done outside school hours (see Section 5 below)."],
        ],
    },
    {
        "type": "info",
        "title": "How Scoring Works",
        "bullets": [
            "Your topic score is calculated from 4 components:",
            "    <b>Reading (20%)</b> — Based on time spent reading the content.",
            "    <b>Activity (30%)</b> — Completing the class and home activities.",
            "    <b>Teacher Rating (30%)</b> — The rating your teacher gives your uploaded work (1-5 stars).",
            "    <b>Guardian Review (20%)</b> — Completion of the guardian review step.",
            "All 4 components together make up your total score for each topic.",
        ],
    },

    {"type": "pagebreak"},

    # ─── SECTION 4: UPLOADING HOMEWORK ────────────────
    {
        "type": "heading",
        "title": "Section 4: Uploading Your Homework",
    },
    {
        "type": "steps",
        "title": "How to Upload Your Screenshot",
        "bullets": [
            "Complete Steps 1 and 2 (reading time + activity) first.",
            "Scroll down to the <b>Upload Your Work</b> section (green dashed box).",
            "Tap <b>Take a Photo or Choose Image</b> to open your camera or file picker.",
            "Select or take a photo of your completed work.",
            "A <b>preview</b> of your image will appear. Tap the X to change it if needed.",
            "Select the <b>software you used</b> from the dropdown (Scratch, Python, Canva, etc.).",
            "Optionally type <b>notes</b> describing what you created.",
            "Tap the green <b>Submit Homework</b> button.",
            "Wait for the success message — a green toast will confirm 'Homework uploaded successfully!'",
        ],
    },
    {
        "type": "info",
        "title": "Upload Details",
        "bullets": [
            "Images are <b>automatically compressed</b> before upload — no need to resize.",
            "Maximum file size: <b>10 MB</b> (before compression).",
            "Supported formats: JPG, PNG, and other common image types.",
            "You can only submit <b>one screenshot per topic</b>.",
            "Your image is stored securely in your personal student folder.",
            "File naming: images are saved as <b>YYYY-MM-DD_uniqueid.jpg</b> in your folder.",
        ],
    },
    {
        "type": "info",
        "title": "If Upload Fails",
        "bullets": [
            "A red toast notification will show the specific error reason.",
            "Common reasons: no internet connection, file too large, session expired.",
            "If you see <b>'User session not found'</b>, refresh the page and log in again.",
            "If the error persists, try a different image or contact your teacher.",
        ],
    },

    {"type": "pagebreak"},

    # ─── SECTION 5: GUARDIAN REVIEW ───────────────────
    {
        "type": "heading",
        "title": "Section 5: Guardian Review Process",
    },
    {
        "type": "info",
        "title": "What is Guardian Review?",
        "bullets": [
            "Guardian Review is the <b>final step</b> (Step 5) of the validation pipeline.",
            "It ensures a parent or guardian has seen and approved your completed work.",
            "This step is only available <b>outside school hours</b> (after 3:00 PM).",
            "You cannot complete this step during school time.",
        ],
    },
    {
        "type": "steps",
        "title": "How to Complete Guardian Review",
        "bullets": [
            "Make sure Steps 1-4 are already completed (your teacher has approved your work).",
            "Open the topic in the Book Viewer <b>after 3:00 PM</b>.",
            "You will see <b>'Guardian Review Required'</b> in the validation stepper.",
            "Ask your <b>parent or guardian</b> to sit with you at the device.",
            "Show them your completed activity and the teacher's feedback.",
            "Your guardian will <b>review and approve</b> your work on the device.",
            "Once approved, the topic turns <b>green</b> — fully completed!",
            "The next topic in the course will now <b>unlock</b> automatically.",
        ],
    },

    {"type": "pagebreak"},

    # ─── SECTION 6: TROUBLESHOOTING ───────────────────
    {
        "type": "heading",
        "title": "Section 6: Troubleshooting & FAQ",
    },
    {
        "type": "table",
        "title": "Common Issues",
        "columns": ["Problem", "Solution"],
        "rows": [
            ["No courses on My Lessons page", "Your teacher has not assigned lessons to your class yet. Ask your teacher to assign a lesson plan."],
            ["Topic is locked", "Complete the previous topic first. Topics must be done in order."],
            ["Reading timer not moving", "Make sure the page is active and in focus. The timer pauses if you switch tabs."],
            ["'Mark Complete' button is disabled", "You haven't read for long enough. Keep reading until the timer finishes."],
            ["Upload button not appearing", "Complete Steps 1 and 2 first (reading + activity). The upload section appears after."],
            ["Upload failed error", "Check your internet connection. Try a smaller image. Refresh the page and try again."],
            ["'User session not found'", "Your login session expired. Refresh the page and log in again."],
            ["Stuck on 'Waiting for Teacher'", "Your teacher needs to review your screenshot. Be patient or ask your teacher."],
            ["Guardian review not available", "This step only works after 3:00 PM (outside school hours)."],
            ["Work was rejected by teacher", "Read the teacher's feedback, improve your work, and upload a new screenshot."],
        ],
    },
    {
        "type": "info",
        "title": "Need More Help?",
        "bullets": [
            "Ask your <b>teacher</b> for help with lesson content or activity questions.",
            "Ask your <b>parent/guardian</b> for help with the guardian review step.",
            "If you experience technical issues, report them to your school's IT support.",
        ],
    },
]

# ── END EDITABLE CONTENT ──────────────────────────────

# Color palette (matches the app's book theme)
COLOR_PRIMARY = HexColor("#6B21A8")       # Purple heading
COLOR_SECONDARY = HexColor("#10B981")     # Green (home activity)
COLOR_ACCENT = HexColor("#3B82F6")        # Blue (info)
COLOR_TEXT = HexColor("#1E293B")          # Dark text
COLOR_MUTED = HexColor("#64748B")        # Muted text
COLOR_BG_LIGHT = HexColor("#F0FDF4")     # Light green background
COLOR_BG_INFO = HexColor("#EFF6FF")      # Light blue background
COLOR_BORDER = HexColor("#E2E8F0")       # Light border
COLOR_TABLE_HEADER = HexColor("#F1F5F9") # Table header bg
COLOR_WHITE = HexColor("#FFFFFF")


def build_styles():
    """Create custom paragraph styles for the PDF."""
    base = getSampleStyleSheet()

    styles = {
        "title": ParagraphStyle(
            "GuideTitle",
            parent=base["Title"],
            fontSize=26,
            textColor=COLOR_PRIMARY,
            spaceAfter=6,
            alignment=TA_CENTER,
            fontName="Helvetica-Bold",
        ),
        "subtitle": ParagraphStyle(
            "GuideSubtitle",
            parent=base["Normal"],
            fontSize=11,
            textColor=COLOR_MUTED,
            spaceAfter=20,
            alignment=TA_CENTER,
            fontName="Helvetica",
        ),
        "heading": ParagraphStyle(
            "SectionHeading",
            parent=base["Heading1"],
            fontSize=18,
            textColor=COLOR_PRIMARY,
            spaceBefore=10,
            spaceAfter=12,
            fontName="Helvetica-Bold",
        ),
        "section_title": ParagraphStyle(
            "SectionTitle",
            parent=base["Heading2"],
            fontSize=13,
            textColor=COLOR_ACCENT,
            spaceBefore=14,
            spaceAfter=6,
            fontName="Helvetica-Bold",
            borderWidth=0,
            borderPadding=0,
        ),
        "bullet": ParagraphStyle(
            "BulletText",
            parent=base["Normal"],
            fontSize=9.5,
            textColor=COLOR_TEXT,
            fontName="Helvetica",
            leading=13,
            leftIndent=16,
            spaceBefore=1,
            spaceAfter=1,
        ),
        "table_header": ParagraphStyle(
            "TableHeader",
            parent=base["Normal"],
            fontSize=9.5,
            textColor=COLOR_PRIMARY,
            fontName="Helvetica-Bold",
            leading=12,
        ),
        "table_cell": ParagraphStyle(
            "TableCell",
            parent=base["Normal"],
            fontSize=9,
            textColor=COLOR_TEXT,
            fontName="Helvetica",
            leading=12,
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


def generate_pdf(output_path="learning_system_guide.pdf"):
    """Generate the learning system guide PDF."""
    styles = build_styles()

    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        topMargin=25 * mm,
        bottomMargin=20 * mm,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
    )

    story = []

    # ── Title page ──
    story.append(Spacer(1, 40))
    story.append(Paragraph(GUIDE_TITLE, styles["title"]))
    story.append(Paragraph(GUIDE_SUBTITLE, styles["subtitle"]))
    story.append(Spacer(1, 8))

    # Divider
    story.append(HRFlowable(
        width="80%", thickness=2, color=COLOR_SECONDARY,
        spaceAfter=12, spaceBefore=4,
    ))

    # Table of contents
    toc_title = ParagraphStyle(
        "TOCTitle", parent=styles["section_title"],
        textColor=COLOR_PRIMARY, fontSize=12, alignment=TA_CENTER,
    )
    story.append(Paragraph("Table of Contents", toc_title))
    story.append(Spacer(1, 8))

    toc_items = [
        "Section 1: Getting Started with My Lessons",
        "Section 2: Using the Book Viewer",
        "Section 3: The 5-Step Validation Pipeline",
        "Section 4: Uploading Your Homework",
        "Section 5: Guardian Review Process",
        "Section 6: Troubleshooting & FAQ",
    ]
    for i, item in enumerate(toc_items, 1):
        story.append(Paragraph(
            f"{i}. {item}",
            ParagraphStyle("TOCItem", parent=styles["bullet"],
                           fontSize=10, spaceBefore=3, spaceAfter=3,
                           leftIndent=40, textColor=COLOR_TEXT),
        ))

    story.append(PageBreak())

    # ── Content sections ──
    for section in GUIDE_SECTIONS:
        sec_type = section.get("type", "info")

        # Page break
        if sec_type == "pagebreak":
            story.append(PageBreak())
            continue

        # Large heading
        if sec_type == "heading":
            story.append(Paragraph(section["title"], styles["heading"]))
            story.append(HRFlowable(
                width="100%", thickness=1, color=COLOR_SECONDARY,
                spaceAfter=8, spaceBefore=2,
            ))
            continue

        # Section title
        story.append(Paragraph(section["title"], styles["section_title"]))

        # Bullet list
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
                bulletFontSize=5,
                bulletOffsetY=-1,
                start="circle",
            )
            story.append(bullet_list)
            story.append(Spacer(1, 4))

        # Table
        if section.get("rows"):
            columns = section.get("columns", ["", ""])
            col_widths = [doc.width * 0.30, doc.width * 0.70]

            # Build table data
            header_row = [
                Paragraph(columns[0], styles["table_header"]),
                Paragraph(columns[1], styles["table_header"]),
            ]
            table_data = [header_row]
            for row in section["rows"]:
                table_data.append([
                    Paragraph(row[0], ParagraphStyle(
                        "CellBold", parent=styles["table_cell"],
                        fontName="Helvetica-Bold",
                    )),
                    Paragraph(row[1], styles["table_cell"]),
                ])

            t = Table(table_data, colWidths=col_widths, repeatRows=1)
            t.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), COLOR_TABLE_HEADER),
                ("TEXTCOLOR", (0, 0), (-1, 0), COLOR_PRIMARY),
                ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("GRID", (0, 0), (-1, -1), 0.5, COLOR_BORDER),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [COLOR_WHITE, COLOR_BG_LIGHT]),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ]))
            story.append(t)
            story.append(Spacer(1, 8))

    # ── Footer ──
    story.append(Spacer(1, 20))
    story.append(HRFlowable(
        width="100%", thickness=0.5, color=COLOR_BORDER,
        spaceAfter=8, spaceBefore=4,
    ))

    gen_date = datetime.now().strftime("%B %d, %Y")
    story.append(Paragraph(
        f"Generated on {gen_date} | School Management System | Learning Module Guide",
        styles["footer"],
    ))

    # Build PDF
    doc.build(story)
    print(f"PDF generated: {os.path.abspath(output_path)}")


if __name__ == "__main__":
    # Output PDF next to this script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    output = os.path.join(script_dir, "learning_system_guide.pdf")
    generate_pdf(output)
