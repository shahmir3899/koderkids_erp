"""
Export Book content to a structured text/PDF file
Run: python manage.py export_book_text [book_id]
"""
import os
import re
from django.core.management.base import BaseCommand
from books.models import Book, Topic
from html import unescape


class Command(BaseCommand):
    help = 'Export book content to a structured text file'

    def add_arguments(self, parser):
        parser.add_argument('book_id', nargs='?', type=int, help='Book ID to export')
        parser.add_argument('--output', type=str, help='Output file path')
        parser.add_argument('--format', type=str, choices=['txt', 'md'], default='md', help='Output format')

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

        output_format = options.get('format', 'md')
        output_path = options.get('output') or f'Book2_Content.{output_format}'

        content = self.generate_content(book, output_format)

        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(content)

        self.stdout.write(self.style.SUCCESS(f'\nExported to: {output_path}'))

        # Also generate summary stats
        chapters = Topic.objects.filter(book=book, type='chapter').order_by('code')
        total_lessons = Topic.objects.filter(book=book, type='lesson').count()

        self.stdout.write(f'\nBook Statistics:')
        self.stdout.write(f'  Total Chapters: {chapters.count()}')
        self.stdout.write(f'  Total Lessons: {total_lessons}')

    def generate_content(self, book, fmt='md'):
        lines = []

        # Title
        if fmt == 'md':
            lines.append(f'# {book.title}')
            lines.append('')
            lines.append('---')
            lines.append('')
        else:
            lines.append('=' * 80)
            lines.append(book.title.center(80))
            lines.append('=' * 80)
            lines.append('')

        # Get all chapters ordered by code
        chapters = Topic.objects.filter(book=book, type='chapter').order_by('code')

        for chapter in chapters:
            lines.extend(self.format_chapter(chapter, fmt))

        return '\n'.join(lines)

    def format_chapter(self, chapter, fmt):
        lines = []

        # Chapter header
        if fmt == 'md':
            lines.append(f'## Chapter {chapter.code}: {chapter.title}')
            lines.append('')
        else:
            lines.append('')
            lines.append('-' * 80)
            lines.append(f'CHAPTER {chapter.code}: {chapter.title.upper()}')
            lines.append('-' * 80)
            lines.append('')

        # Chapter content
        if chapter.content:
            lines.append(self.html_to_text(chapter.content, fmt))
            lines.append('')

        # Get lessons for this chapter
        lessons = Topic.objects.filter(book=chapter.book, parent=chapter, type='lesson').order_by('code')

        for lesson in lessons:
            lines.extend(self.format_lesson(lesson, fmt))

        lines.append('')
        return lines

    def format_lesson(self, lesson, fmt):
        lines = []

        # Lesson header
        if fmt == 'md':
            lines.append(f'### {lesson.code} {lesson.title}')
            lines.append('')
        else:
            lines.append('')
            lines.append(f'{lesson.code} {lesson.title}')
            lines.append('~' * len(f'{lesson.code} {lesson.title}'))
            lines.append('')

        # Lesson content
        if lesson.content:
            lines.append(self.html_to_text(lesson.content, fmt))
            lines.append('')

        # Activity blocks
        if lesson.activity_blocks:
            for block in lesson.activity_blocks:
                lines.extend(self.format_activity_block(block, fmt))

        return lines

    def format_activity_block(self, block, fmt):
        lines = []

        block_type = block.get('type', 'activity')
        title = block.get('title', 'Activity')
        introduction = block.get('introduction', '')
        steps = block.get('steps', [])
        challenge = block.get('challenge', '')

        # Activity header
        if fmt == 'md':
            lines.append(f'#### {title}')
            lines.append('')
        else:
            lines.append(f'  {title}')
            lines.append(f'  {"-" * len(title)}')
            lines.append('')

        # Introduction
        if introduction:
            lines.append(introduction)
            lines.append('')

        # Steps
        if steps:
            for step in steps:
                step_num = step.get('number', '')
                step_title = step.get('title', '')
                step_content = step.get('content', '')

                if fmt == 'md':
                    lines.append(f'**Step {step_num}: {step_title}**')
                    lines.append(f'{step_content}')
                    lines.append('')
                else:
                    lines.append(f'    Step {step_num}: {step_title}')
                    lines.append(f'    {step_content}')
                    lines.append('')

        # Challenge
        if challenge:
            if fmt == 'md':
                lines.append(f'**Challenge:** {challenge}')
            else:
                lines.append(f'    Challenge: {challenge}')
            lines.append('')

        return lines

    def html_to_text(self, html, fmt='md'):
        """Convert HTML to plain text or markdown"""
        if not html:
            return ''

        text = html

        if fmt == 'md':
            # Convert HTML to markdown
            text = re.sub(r'<h2>(.*?)</h2>', r'**\1**\n', text)
            text = re.sub(r'<h3>(.*?)</h3>', r'**\1**\n', text)
            text = re.sub(r'<h4>(.*?)</h4>', r'**\1**', text)
            text = re.sub(r'<strong>(.*?)</strong>', r'**\1**', text)
            text = re.sub(r'<b>(.*?)</b>', r'**\1**', text)
            text = re.sub(r'<em>(.*?)</em>', r'*\1*', text)
            text = re.sub(r'<i>(.*?)</i>', r'*\1*', text)
            text = re.sub(r'<li>(.*?)</li>', r'- \1\n', text)
            text = re.sub(r'<ul>', '', text)
            text = re.sub(r'</ul>', '\n', text)
            text = re.sub(r'<ol>', '', text)
            text = re.sub(r'</ol>', '\n', text)
            text = re.sub(r'<p>(.*?)</p>', r'\1\n', text)
            text = re.sub(r'<br\s*/?>', '\n', text)
        else:
            # Convert HTML to plain text
            text = re.sub(r'<h[23]>(.*?)</h[23]>', r'\n\1\n', text)
            text = re.sub(r'<h4>(.*?)</h4>', r'\1', text)
            text = re.sub(r'<strong>(.*?)</strong>', r'\1', text)
            text = re.sub(r'<b>(.*?)</b>', r'\1', text)
            text = re.sub(r'<em>(.*?)</em>', r'\1', text)
            text = re.sub(r'<i>(.*?)</i>', r'\1', text)
            text = re.sub(r'<li>(.*?)</li>', r'  * \1\n', text)
            text = re.sub(r'<ul>', '', text)
            text = re.sub(r'</ul>', '', text)
            text = re.sub(r'<ol>', '', text)
            text = re.sub(r'</ol>', '', text)
            text = re.sub(r'<p>(.*?)</p>', r'\1\n', text)
            text = re.sub(r'<br\s*/?>', '\n', text)

        # Remove any remaining HTML tags
        text = re.sub(r'<[^>]+>', '', text)

        # Decode HTML entities
        text = unescape(text)

        # Clean up multiple newlines
        text = re.sub(r'\n{3,}', '\n\n', text)

        return text.strip()
