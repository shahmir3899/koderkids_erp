import logging
import re
from calendar import monthrange
from datetime import date

from celery import shared_task
from django.core.management import call_command
from django.utils import timezone

logger = logging.getLogger(__name__)


def _trim_to_max_sentences(text, max_sentences=3):
    """
    Deterministic backstop: local small models (tested: Ollama/Mistral-7B)
    don't reliably self-enforce a sentence-count instruction even when it's
    spelled out explicitly and repeated. Rather than keep re-wording the
    prompt indefinitely, guarantee the hard ceiling in code — the prompt
    still does the real work of tone/content/no-salutation.
    """
    if not text:
        return text
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    return ' '.join(sentences[:max_sentences]).strip()


@shared_task
def purge_old_student_report_generation_events():
    call_command('purge_old_report_generation_events')


# =============================================================================
# MONTHLY AI NARRATIVE
# =============================================================================

NARRATIVE_SYSTEM_PROMPT = """You are writing a short monthly progress note for a parent, about their child's month at KoderKids, a coding/AI school for kids.

Rules:
- Write AT MOST 3 sentences total — 2 is fine, 3 is the hard ceiling, never 4 or more.
- You must fit ALL provided data points into those 2-3 sentences — do not drop a fact just to stay short. Instead, COMBINE facts into the same sentence using commas, "and", "while", or an em-dash, rather than giving each fact its own sentence.
- Do not add a separate closing/encouragement sentence on top of the 2-3 required. If you want to end on encouragement, fold it into the final sentence rather than tacking on an extra one (e.g. NOT an extra "Keep it up!" sentence by itself).
- Plain prose only. No markdown, no bullet points, no headers, no line breaks.
- Do NOT use a greeting or salutation (no "Dear Parent", no "Hi there", no "Dear [Name]").
- Do NOT use a sign-off or closing (no "Best regards", no "Sincerely", no "[Your Name]", no signature of any kind).
- Do NOT invent facts. Only use the data given to you.
- If a data point is zero, low, or missing, mention it kindly and encouragingly rather than skipping the month.
- Warm, specific, and personal in tone — not corporate, not generic, not a form letter.

Example 1 — no badges this month (2 sentences, all facts combined):

Data:
- Student: Alex
- Attendance: 90% (9 of 10 days)
- Streak: 4 days
- Photos: 2
- Teacher note: "Practiced shapes"
- Badges: none

Output:
Alex had a strong July, attending 9 out of 10 sessions and building a 4-day streak along the way. Their teacher noted great progress practicing shapes, and with 2 new activity photos from this month to look back on, the momentum is clearly building.

Example 2 — badges earned this month (2 sentences, still all facts combined, nothing dropped):

Data:
- Student: Sara
- Attendance: 100% (8 of 8 days)
- Streak: 8 days
- Photos: 4
- Teacher note: "Learned about robots"
- Badges: AI Creator

Output:
Sara had a perfect August, attending all 8 sessions and building an impressive 8-day streak, with 4 new activity photos capturing her progress along the way. She's been learning about robots in class, and she even earned the AI Creator badge at this month's AI Gala — what a month!"""


def _build_narrative_prompt(student, data):
    badges_text = ", ".join(data['badge_names']) if data['badge_names'] else "none this month"
    note_text = data['teacher_note'] or "none this month"
    return f"""Write the monthly note for this student, following the exact rules and style above.

Data:
- Student: {student.name}
- Month: {data['month_label']}
- Attendance: {data['percentage']}% ({data['present_days']} of {data['total_days']} days)
- Current streak this month: {data['streak']} days
- Activity photos this month: {data['photo_count']}
- Most recent teacher note: {note_text}
- AI Gala badges earned this month: {badges_text}

Output:"""


def _compute_month_data(student, year, month_num):
    """Assembles the same data points Learning Journey already uses on the
    mobile app: attendance %, a month-scoped streak, photo count, latest
    teacher note, and AI Gala badges earned in the month.
    """
    from students.models import Attendance, StudentBadge
    from students.utils import fetch_progress_images_for_student

    first_day = date(year, month_num, 1)
    last_day = date(year, month_num, monthrange(year, month_num)[1])
    month_str = f"{year:04d}-{month_num:02d}"

    month_attendance = list(
        Attendance.objects.filter(
            student=student, session_date__gte=first_day, session_date__lte=last_day
        ).order_by('session_date')
    )

    present_days = sum(1 for a in month_attendance if a.status == 'Present')
    total_days = len(month_attendance)
    percentage = round((present_days / total_days * 100), 1) if total_days > 0 else 0

    # Longest run of consecutive Present entries within the month.
    streak = 0
    longest_streak = 0
    for a in month_attendance:
        if a.status == 'Present':
            streak += 1
            longest_streak = max(longest_streak, streak)
        else:
            streak = 0

    latest_note_entry = next(
        (a for a in reversed(month_attendance) if a.achieved_topic),
        None
    )
    teacher_note = latest_note_entry.achieved_topic if latest_note_entry else None

    try:
        images = fetch_progress_images_for_student(student.id, month_str)
        photo_count = len(images) if images is not None else 0
    except Exception:
        logger.warning(f"Could not fetch progress images for student {student.id}, month {month_str}", exc_info=True)
        photo_count = 0

    badge_names = list(
        StudentBadge.objects.filter(
            student=student,
            badge__badge_type__startswith='gala_',
            earned_at__year=year,
            earned_at__month=month_num,
        ).values_list('badge__name', flat=True)
    )

    return {
        'present_days': present_days,
        'total_days': total_days,
        'percentage': percentage,
        'streak': longest_streak,
        'teacher_note': teacher_note,
        'photo_count': photo_count,
        'badge_names': badge_names,
        'month_str': month_str,
        'month_label': first_day.strftime('%B %Y'),
    }


@shared_task
def generate_monthly_narratives(month_str=None, force=False, student_id=None):
    """
    Generate and cache an AI narrative summary for each active student's month.
    Scheduled via Celery Beat on the 28th of each month (alongside the existing
    monthly report reminder). Can also be called directly with an explicit
    month_str="YYYY-MM" and force=True for manual generation/backfill, or
    student_id=<id> to (re)generate for a single student only — e.g. for
    testing, or regenerating one student's narrative on request.
    """
    from students.models import Student
    from ai.llm_client import get_llm_client
    from .models import MonthlyNarrative

    today = timezone.now().date()
    if month_str:
        year, month_num = map(int, month_str.split('-'))
    else:
        year, month_num = today.year, today.month
        month_str = f"{year:04d}-{month_num:02d}"

    llm = get_llm_client()
    created, skipped, failed = 0, 0, 0

    students = Student.objects.filter(status='Active').select_related('school')
    if student_id is not None:
        students = students.filter(id=student_id)
    for student in students:
        if not force and MonthlyNarrative.objects.filter(student=student, month=month_str).exists():
            skipped += 1
            continue

        try:
            data = _compute_month_data(student, year, month_num)
            prompt = _build_narrative_prompt(student, data)
            result = llm.generate_sync(
                prompt=prompt,
                system_prompt=NARRATIVE_SYSTEM_PROMPT,
                max_tokens=130,
                temperature=0.4,
            )

            if not result['success']:
                logger.warning(
                    f"Narrative generation failed for student {student.id} ({month_str}): {result.get('error')}"
                )
                failed += 1
                continue

            narrative_text = _trim_to_max_sentences((result['response'] or '').strip(), max_sentences=3)
            MonthlyNarrative.objects.update_or_create(
                student=student,
                month=month_str,
                defaults={'narrative': narrative_text, 'provider': result.get('provider') or ''},
            )
            created += 1
        except Exception:
            logger.exception(f"Error generating narrative for student {student.id} ({month_str})")
            failed += 1

    result_summary = f"generate_monthly_narratives({month_str}): created={created} skipped={skipped} failed={failed}"
    logger.info(result_summary)
    return result_summary
