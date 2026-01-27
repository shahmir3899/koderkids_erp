"""
Export Book content to a structured PDF file
Run: python manage.py export_book_pdf [book_id]
"""
import os
import re
from django.core.management.base import BaseCommand
from books.models import Book, Topic
from html import unescape

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.lib.colors import HexColor


class Command(BaseCommand):
    help = 'Export book content to a structured PDF file'

    def add_arguments(self, parser):
        parser.add_argument('book_id', nargs='?', type=int, help='Book ID to export')
        parser.add_argument('--output', type=str, help='Output file path')

    def handle(self, *args, **options):
        book_id = options.get('book_id')

        if book_id:
            try:
                book = Book.objects.get(id=book_id)
            except Book.DoesNotExist:
                self.stdout.write(self.style.ERROR(f'Book with ID {book_id} not found.'))
                return
        else:
            # Find Book 2 by default
            book = None
            for pattern in ['Book 2', 'Koder Kids Book 2', 'KoderKids Book 2']:
                try:
                    book = Book.objects.get(title__icontains=pattern)
                    break
                except Book.DoesNotExist:
                    continue
                except Book.MultipleObjectsReturned:
                    book = Book.objects.filter(title__icontains=pattern).first()
                    break

            if not book:
                self.stdout.write(self.style.ERROR('Book not found.'))
                return

        self.stdout.write(f'Exporting: {book.title}')

        output_path = options.get('output') or 'Book2_Complete_Content.pdf'

        self.generate_pdf(book, output_path)

        self.stdout.write(self.style.SUCCESS(f'\nExported to: {output_path}'))

        # Stats
        chapters = Topic.objects.filter(book=book, type='chapter').order_by('code')
        total_lessons = Topic.objects.filter(book=book, type='lesson').count()

        self.stdout.write(f'\nBook Statistics:')
        self.stdout.write(f'  Total Chapters: {chapters.count()}')
        self.stdout.write(f'  Total Lessons: {total_lessons}')

    def generate_pdf(self, book, output_path):
        doc = SimpleDocTemplate(
            output_path,
            pagesize=A4,
            rightMargin=2*cm,
            leftMargin=2*cm,
            topMargin=2*cm,
            bottomMargin=2*cm
        )

        # Custom styles
        styles = getSampleStyleSheet()

        styles.add(ParagraphStyle(
            name='BookTitle',
            parent=styles['Title'],
            fontSize=28,
            spaceAfter=30,
            textColor=HexColor('#6B21A8'),
            alignment=TA_CENTER
        ))

        styles.add(ParagraphStyle(
            name='ChapterTitle',
            parent=styles['Heading1'],
            fontSize=20,
            spaceBefore=30,
            spaceAfter=15,
            textColor=HexColor('#7C3AED'),
            borderWidth=1,
            borderColor=HexColor('#7C3AED'),
            borderPadding=10,
            backColor=HexColor('#F3E8FF')
        ))

        styles.add(ParagraphStyle(
            name='LessonTitle',
            parent=styles['Heading2'],
            fontSize=16,
            spaceBefore=20,
            spaceAfter=10,
            textColor=HexColor('#059669')
        ))

        styles.add(ParagraphStyle(
            name='ActivityTitle',
            parent=styles['Heading3'],
            fontSize=13,
            spaceBefore=15,
            spaceAfter=8,
            textColor=HexColor('#DC2626')
        ))

        styles.add(ParagraphStyle(
            name='ContentText',
            parent=styles['Normal'],
            fontSize=11,
            spaceBefore=6,
            spaceAfter=6,
            alignment=TA_JUSTIFY
        ))

        styles.add(ParagraphStyle(
            name='StepText',
            parent=styles['Normal'],
            fontSize=10,
            spaceBefore=4,
            spaceAfter=4,
            leftIndent=20
        ))

        styles.add(ParagraphStyle(
            name='ChallengeText',
            parent=styles['Normal'],
            fontSize=10,
            spaceBefore=8,
            spaceAfter=8,
            leftIndent=20,
            textColor=HexColor('#B45309'),
            backColor=HexColor('#FEF3C7'),
            borderPadding=8
        ))

        story = []

        # Title page
        story.append(Spacer(1, 2*inch))
        story.append(Paragraph(book.title, styles['BookTitle']))
        story.append(Spacer(1, 0.5*inch))
        story.append(Paragraph('Complete Text Content', styles['Title']))
        story.append(Spacer(1, 1*inch))
        story.append(Paragraph('KoderKids - Empowering Young Minds', styles['Normal']))
        story.append(PageBreak())

        # Table of Contents
        story.append(Paragraph('Table of Contents', styles['BookTitle']))
        story.append(Spacer(1, 0.3*inch))

        chapters = Topic.objects.filter(book=book, type='chapter').order_by('code')
        for chapter in chapters:
            story.append(Paragraph(f"Chapter {chapter.code}: {chapter.title}", styles['ContentText']))
            lessons = Topic.objects.filter(book=book, parent=chapter, type='lesson').order_by('code')
            for lesson in lessons:
                story.append(Paragraph(f"    {lesson.code} {lesson.title}", styles['StepText']))

        story.append(PageBreak())

        # Content
        for chapter in chapters:
            story.extend(self.format_chapter(chapter, styles))

        doc.build(story)

    def format_chapter(self, chapter, styles):
        elements = []

        # Chapter header
        elements.append(Paragraph(f"Chapter {chapter.code}: {chapter.title}", styles['ChapterTitle']))

        # Chapter content
        if chapter.content:
            text = self.html_to_pdf_text(chapter.content)
            elements.append(Paragraph(text, styles['ContentText']))

        # Lessons
        lessons = Topic.objects.filter(book=chapter.book, parent=chapter, type='lesson').order_by('code')
        for lesson in lessons:
            elements.extend(self.format_lesson(lesson, styles))

        elements.append(PageBreak())
        return elements

    def format_lesson(self, lesson, styles):
        elements = []

        # Lesson header
        elements.append(Paragraph(f"{lesson.code} {lesson.title}", styles['LessonTitle']))

        # Lesson content
        if lesson.content:
            text = self.html_to_pdf_text(lesson.content)
            elements.append(Paragraph(text, styles['ContentText']))

        # Activity blocks
        if lesson.activity_blocks:
            for block in lesson.activity_blocks:
                elements.extend(self.format_activity_block(block, styles))

        return elements

    def format_activity_block(self, block, styles):
        elements = []

        title = block.get('title', 'Activity')
        introduction = block.get('introduction', '')
        steps = block.get('steps', [])
        challenge = block.get('challenge', '')

        # Activity header
        elements.append(Paragraph(title, styles['ActivityTitle']))

        # Introduction
        if introduction:
            elements.append(Paragraph(introduction, styles['ContentText']))

        # Steps
        if steps:
            for step in steps:
                step_num = step.get('number', '')
                step_title = step.get('title', '')
                step_content = step.get('content', '')
                step_text = f"<b>Step {step_num}: {step_title}</b> - {step_content}"
                elements.append(Paragraph(step_text, styles['StepText']))

        # Challenge
        if challenge:
            elements.append(Paragraph(f"<b>Challenge:</b> {challenge}", styles['ChallengeText']))

        elements.append(Spacer(1, 0.2*inch))
        return elements

    def html_to_pdf_text(self, html):
        """Convert HTML to reportlab-compatible text"""
        if not html:
            return ''

        text = html

        # Convert headers to bold
        text = re.sub(r'<h2>(.*?)</h2>', r'<b>\1</b><br/><br/>', text)
        text = re.sub(r'<h3>(.*?)</h3>', r'<b>\1</b><br/>', text)
        text = re.sub(r'<h4>(.*?)</h4>', r'<b>\1</b>', text)

        # Keep strong/bold
        text = re.sub(r'<strong>(.*?)</strong>', r'<b>\1</b>', text)
        text = re.sub(r'<em>(.*?)</em>', r'<i>\1</i>', text)

        # Convert lists
        text = re.sub(r'<li>(.*?)</li>', r'• \1<br/>', text)
        text = re.sub(r'<ul>', '', text)
        text = re.sub(r'</ul>', '<br/>', text)
        text = re.sub(r'<ol>', '', text)
        text = re.sub(r'</ol>', '<br/>', text)

        # Paragraphs
        text = re.sub(r'<p>(.*?)</p>', r'\1<br/><br/>', text)
        text = re.sub(r'<br\s*/?>', '<br/>', text)

        # Remove remaining HTML tags (except allowed ones)
        allowed_tags = ['b', 'i', 'u', 'br', 'br/']
        text = re.sub(r'<(?!/?(?:' + '|'.join(allowed_tags) + r')(?:\s|>|/))[^>]+>', '', text)

        # Decode HTML entities
        text = unescape(text)

        # Clean up multiple breaks
        text = re.sub(r'(<br/>){3,}', '<br/><br/>', text)

        return text.strip()
