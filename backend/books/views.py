# books/views.py
from rest_framework.viewsets import ReadOnlyModelViewSet, ModelViewSet
from rest_framework.views import APIView
from .models import Book, Topic, BookClassVisibility, TopicAssignment
from .serializers import (
    BookSerializer, BookListSerializer,
    AdminBookListSerializer, AdminBookDetailSerializer, AdminBookWriteSerializer,
    AdminTopicListSerializer, AdminTopicDetailSerializer, AdminTopicWriteSerializer
)
from rest_framework.permissions import IsAuthenticated, BasePermission
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.core.files.storage import default_storage
from django.http import HttpResponse
from django.utils import timezone
import csv
import chardet
import re
import io
from html import unescape
from django.db.models import Prefetch


class IsAdminOrTeacher(BasePermission):
    """Allow Admin or Teacher roles only"""
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        role = getattr(request.user, 'role', None)
        return role in ['Admin', 'Teacher']


class BookViewSet(ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    lookup_field = 'id'  # ← ADD THIS LINE (explicitly use primary key)

    def get_queryset(self):
        """
        List: Only book metadata
        Detail: Full topic tree with prefetch
        """
        if self.action == 'list':
            # Lightweight: no topics loaded
            return Book.objects.only("id", "title", "isbn", "school_id", "cover")
        else:
            # Detail: full hierarchy, N+1 safe
            return Book.objects.prefetch_related(self.get_full_topic_prefetch())

    def get_full_topic_prefetch(self):
        """
        Prefetch topic tree up to depth 3
        """
        level_3 = Topic.objects.only("id", "code", "title", "type", "parent_id", "activity_blocks")
        level_2 = Topic.objects.prefetch_related(Prefetch("children", queryset=level_3))
        level_1 = Topic.objects.prefetch_related(Prefetch("children", queryset=level_2))
        return Prefetch(
            "topics",
            queryset=Topic.objects.prefetch_related(Prefetch("children", queryset=level_1))
        )

    def get_serializer_class(self):
        """
        Use lightweight serializer for list
        """
        if self.action == 'list':
            return BookListSerializer
        return BookSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["request"] = self.request
        context["q"] = self.request.query_params.get("q", "")
        return context
    
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def upload_csv(request):
    if "csv_file" not in request.FILES:
        return Response({"error": "No file"}, status=400)

    file = request.FILES["csv_file"]
    path = default_storage.save("tmp/" + file.name, file)
    full_path = default_storage.path(path)

    # Auto-detect encoding
    with open(full_path, "rb") as f:
        raw = f.read(10000)
        encoding = chardet.detect(raw)["encoding"] or "utf-8"

    # Reuse your import logic
    from books.management.commands.import_books import Command

    cmd = Command()
    cmd.handle(csv_file=full_path)

    return Response({"success": "Imported!"}, status=200)


# ============================================
# ADMIN VIEWS - Book & Topic Management
# ============================================

class AdminBookViewSet(ModelViewSet):
    """
    Admin viewset for managing books (CRUD)
    """
    permission_classes = [IsAdminOrTeacher]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        return Book.objects.select_related('school').order_by('title')

    def get_serializer_class(self):
        if self.action == 'list':
            return AdminBookListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return AdminBookWriteSerializer
        return AdminBookDetailSerializer

    @action(detail=True, methods=['post'])
    def publish(self, request, pk=None):
        """Publish or unpublish a book"""
        book = self.get_object()
        book.is_published = not book.is_published
        book.save()
        return Response({
            'id': book.id,
            'is_published': book.is_published
        })

    @action(detail=True, methods=['get'])
    def topics(self, request, pk=None):
        """Get all topics for a book as flat list"""
        book = self.get_object()
        topics = book.topics.select_related('parent').order_by('tree_id', 'lft')
        serializer = AdminTopicListSerializer(topics, many=True)
        return Response(serializer.data)


class AdminTopicViewSet(ModelViewSet):
    """
    Admin viewset for managing topics (CRUD)
    """
    permission_classes = [IsAdminOrTeacher]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_queryset(self):
        queryset = Topic.objects.select_related('book', 'parent')

        # Filter by book if provided
        book_id = self.request.query_params.get('book')
        if book_id:
            queryset = queryset.filter(book_id=book_id)

        # Filter by parent if provided
        parent_id = self.request.query_params.get('parent')
        if parent_id:
            if parent_id == 'null' or parent_id == 'root':
                queryset = queryset.filter(parent=None)
            else:
                queryset = queryset.filter(parent_id=parent_id)

        return queryset.order_by('tree_id', 'lft')

    def get_serializer_class(self):
        if self.action == 'list':
            return AdminTopicListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return AdminTopicWriteSerializer
        return AdminTopicDetailSerializer

    def create(self, request, *args, **kwargs):
        """Create a new topic"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        # Return full detail serializer
        detail_serializer = AdminTopicDetailSerializer(serializer.instance)
        return Response(detail_serializer.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        """Update a topic"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        # Return full detail serializer
        detail_serializer = AdminTopicDetailSerializer(instance)
        return Response(detail_serializer.data)

    @action(detail=True, methods=['post'])
    def move(self, request, pk=None):
        """Move topic to new parent or position"""
        topic = self.get_object()
        new_parent_id = request.data.get('parent')
        position = request.data.get('position', 'last-child')

        if new_parent_id:
            try:
                new_parent = Topic.objects.get(id=new_parent_id)
                topic.move_to(new_parent, position)
            except Topic.DoesNotExist:
                return Response(
                    {'error': 'Parent topic not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            # Move to root
            topic.move_to(None, position)

        topic.refresh_from_db()
        return Response(AdminTopicDetailSerializer(topic).data)

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """Duplicate a topic (without children)"""
        original = self.get_object()

        # Create a copy
        new_topic = Topic.objects.create(
            book=original.book,
            parent=original.parent,
            code=f"{original.code}_copy",
            title=f"{original.title} (Copy)",
            type=original.type,
            content=original.content,
            activity_blocks=original.activity_blocks,
            video_url=original.video_url,
            video_duration_seconds=original.video_duration_seconds,
            estimated_time_minutes=original.estimated_time_minutes,
            is_required=original.is_required
        )

        return Response(
            AdminTopicDetailSerializer(new_topic).data,
            status=status.HTTP_201_CREATED
        )


@api_view(['POST'])
@permission_classes([IsAdminOrTeacher])
def upload_topic_image(request):
    """Upload image for topic content/activity blocks to Supabase storage."""
    if 'image' not in request.FILES:
        return Response({'error': 'No image file provided'}, status=400)

    image = request.FILES['image']
    topic_id = request.data.get('topic_id', 'general')
    book_id = request.data.get('book_id', 'general')

    try:
        from .storage import upload_topic_image as supabase_upload
        result = supabase_upload(image, book_id, topic_id)
        return Response({
            'url': result['url'],
            'path': result['path'],
            'filename': result['filename']
        })
    except Exception as e:
        return Response({'error': str(e)}, status=500)


# ============================================
# VISIBILITY & ASSIGNMENT MANAGEMENT
# ============================================

@api_view(['GET', 'POST'])
@permission_classes([IsAdminOrTeacher])
def book_visibility_list(request, book_id):
    """
    GET: List visibility rules for a book
    POST: Create/update visibility rule for a book
    """
    book = Book.objects.filter(id=book_id).first()
    if not book:
        return Response({'error': 'Book not found'}, status=404)

    if request.method == 'GET':
        rules = BookClassVisibility.objects.filter(book=book).select_related('school')
        data = [{
            'id': rule.id,
            'school_id': rule.school_id,
            'school_name': rule.school.name if rule.school else None,
            'student_class': rule.student_class,
            'is_visible': rule.is_visible,
            'created_at': rule.created_at,
        } for rule in rules]
        return Response(data)

    elif request.method == 'POST':
        school_id = request.data.get('school_id')
        student_class = request.data.get('student_class')
        is_visible = request.data.get('is_visible', True)

        if not school_id or not student_class:
            return Response(
                {'error': 'school_id and student_class are required'},
                status=400
            )

        rule, created = BookClassVisibility.objects.update_or_create(
            book=book,
            school_id=school_id,
            student_class=student_class,
            defaults={
                'is_visible': is_visible,
                'created_by': request.user
            }
        )

        return Response({
            'id': rule.id,
            'school_id': rule.school_id,
            'student_class': rule.student_class,
            'is_visible': rule.is_visible,
            'created': created
        }, status=201 if created else 200)


@api_view(['DELETE'])
@permission_classes([IsAdminOrTeacher])
def book_visibility_delete(request, book_id, rule_id):
    """Delete a visibility rule"""
    rule = BookClassVisibility.objects.filter(id=rule_id, book_id=book_id).first()
    if not rule:
        return Response({'error': 'Rule not found'}, status=404)
    rule.delete()
    return Response({'message': 'Rule deleted'})


@api_view(['GET', 'POST'])
@permission_classes([IsAdminOrTeacher])
def topic_assignment_list(request):
    """
    GET: List assignments (with filters)
    POST: Create a new assignment
    Query params:
        - school_id: Filter by school
        - student_class: Filter by class
        - topic_id: Filter by topic
        - book_id: Filter by book
    """
    if request.method == 'GET':
        assignments = TopicAssignment.objects.select_related(
            'topic', 'topic__book', 'school', 'assigned_by'
        )

        # Apply filters
        school_id = request.query_params.get('school_id')
        student_class = request.query_params.get('student_class')
        topic_id = request.query_params.get('topic_id')
        book_id = request.query_params.get('book_id')

        if school_id:
            assignments = assignments.filter(school_id=school_id)
        if student_class:
            assignments = assignments.filter(student_class=student_class)
        if topic_id:
            assignments = assignments.filter(topic_id=topic_id)
        if book_id:
            assignments = assignments.filter(topic__book_id=book_id)

        # For teachers, only show their assignments
        if request.user.role == 'Teacher':
            assignments = assignments.filter(assigned_by=request.user)

        data = [{
            'id': a.id,
            'topic_id': a.topic_id,
            'topic_title': a.topic.display_title,
            'topic_type': a.topic.type,
            'book_id': a.topic.book_id,
            'book_title': a.topic.book.title,
            'school_id': a.school_id,
            'school_name': a.school.name if a.school else None,
            'student_class': a.student_class,
            'assigned_by': a.assigned_by.username if a.assigned_by else None,
            'assigned_at': a.assigned_at,
            'deadline': a.deadline,
            'notes': a.notes,
            'is_mandatory': a.is_mandatory,
            'is_overdue': a.is_overdue,
        } for a in assignments]

        return Response(data)

    elif request.method == 'POST':
        topic_id = request.data.get('topic_id')
        school_id = request.data.get('school_id')
        student_class = request.data.get('student_class')
        deadline = request.data.get('deadline')
        notes = request.data.get('notes', '')
        is_mandatory = request.data.get('is_mandatory', True)

        if not all([topic_id, school_id, student_class]):
            return Response(
                {'error': 'topic_id, school_id, and student_class are required'},
                status=400
            )

        # Validate topic exists
        topic = Topic.objects.filter(id=topic_id).first()
        if not topic:
            return Response({'error': 'Topic not found'}, status=404)

        # Parse deadline if provided
        deadline_dt = None
        if deadline:
            from django.utils.dateparse import parse_datetime
            deadline_dt = parse_datetime(deadline)

        assignment, created = TopicAssignment.objects.update_or_create(
            topic_id=topic_id,
            school_id=school_id,
            student_class=student_class,
            defaults={
                'assigned_by': request.user,
                'deadline': deadline_dt,
                'notes': notes,
                'is_mandatory': is_mandatory,
            }
        )

        return Response({
            'id': assignment.id,
            'topic_id': assignment.topic_id,
            'topic_title': assignment.topic.display_title,
            'school_id': assignment.school_id,
            'student_class': assignment.student_class,
            'deadline': assignment.deadline,
            'notes': assignment.notes,
            'is_mandatory': assignment.is_mandatory,
            'created': created
        }, status=201 if created else 200)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAdminOrTeacher])
def topic_assignment_detail(request, assignment_id):
    """
    GET: Get assignment details
    PUT: Update assignment
    DELETE: Delete assignment
    """
    assignment = TopicAssignment.objects.select_related(
        'topic', 'topic__book', 'school'
    ).filter(id=assignment_id).first()

    if not assignment:
        return Response({'error': 'Assignment not found'}, status=404)

    # Teachers can only manage their own assignments
    if request.user.role == 'Teacher' and assignment.assigned_by != request.user:
        return Response({'error': 'Permission denied'}, status=403)

    if request.method == 'GET':
        return Response({
            'id': assignment.id,
            'topic_id': assignment.topic_id,
            'topic_title': assignment.topic.display_title,
            'book_id': assignment.topic.book_id,
            'book_title': assignment.topic.book.title,
            'school_id': assignment.school_id,
            'school_name': assignment.school.name,
            'student_class': assignment.student_class,
            'deadline': assignment.deadline,
            'notes': assignment.notes,
            'is_mandatory': assignment.is_mandatory,
            'is_overdue': assignment.is_overdue,
            'assigned_at': assignment.assigned_at,
        })

    elif request.method == 'PUT':
        deadline = request.data.get('deadline')
        if deadline:
            from django.utils.dateparse import parse_datetime
            assignment.deadline = parse_datetime(deadline)
        elif 'deadline' in request.data:
            assignment.deadline = None

        if 'notes' in request.data:
            assignment.notes = request.data['notes']
        if 'is_mandatory' in request.data:
            assignment.is_mandatory = request.data['is_mandatory']

        assignment.save()

        return Response({
            'id': assignment.id,
            'deadline': assignment.deadline,
            'notes': assignment.notes,
            'is_mandatory': assignment.is_mandatory,
        })

    elif request.method == 'DELETE':
        assignment.delete()
        return Response({'message': 'Assignment deleted'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_assignments(request):
    """
    Get assignments for the current student.
    Returns topics assigned to the student's school/class with deadline info.
    GET /api/books/student/assignments/
    """
    if request.user.role != 'Student':
        return Response({'error': 'Only students can access this endpoint'}, status=403)

    from students.models import Student
    student = Student.objects.filter(user=request.user).first()
    if not student:
        return Response({'error': 'Student profile not found'}, status=404)

    assignments = TopicAssignment.objects.filter(
        school=student.school,
        student_class=student.student_class
    ).select_related('topic', 'topic__book')

    # Get progress for these topics
    from courses.models import CourseEnrollment, TopicProgress
    enrollments = CourseEnrollment.objects.filter(student=student)
    progress_map = {}
    for enrollment in enrollments:
        for tp in TopicProgress.objects.filter(enrollment=enrollment):
            progress_map[tp.topic_id] = {
                'status': tp.status,
                'completed_at': tp.completed_at
            }

    data = []
    for a in assignments:
        progress = progress_map.get(a.topic_id, {})
        data.append({
            'id': a.id,
            'topic_id': a.topic_id,
            'topic_title': a.topic.display_title,
            'topic_type': a.topic.type,
            'book_id': a.topic.book_id,
            'book_title': a.topic.book.title,
            'deadline': a.deadline,
            'notes': a.notes,
            'is_mandatory': a.is_mandatory,
            'is_overdue': a.is_overdue,
            'progress_status': progress.get('status', 'not_started'),
            'completed_at': progress.get('completed_at'),
        })

    # Sort by deadline (None last), then by mandatory
    data.sort(key=lambda x: (
        x['deadline'] is None,
        x['deadline'] or timezone.now() + timezone.timedelta(days=365),
        not x['is_mandatory']
    ))

    return Response(data)


# ============================================
# PDF EXPORT API
# ============================================

def html_to_pdf_text(html):
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


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_book_pdf(request, book_id):
    """
    Generate and download a structured PDF for a book.
    Fetches all data from the database and generates PDF on-the-fly.
    """
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch, cm
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak
        from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
        from reportlab.lib.colors import HexColor
    except ImportError:
        return Response(
            {'error': 'ReportLab library not installed. Run: pip install reportlab'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    # Fetch book from database
    try:
        book = Book.objects.get(id=book_id)
    except Book.DoesNotExist:
        return Response(
            {'error': f'Book with ID {book_id} not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Create PDF in memory
    buffer = io.BytesIO()

    doc = SimpleDocTemplate(
        buffer,
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

    # Fetch chapters from database
    chapters = Topic.objects.filter(book=book, type='chapter').order_by('code')

    # Table of Contents
    story.append(Paragraph('Table of Contents', styles['BookTitle']))
    story.append(Spacer(1, 0.3*inch))

    for chapter in chapters:
        story.append(Paragraph(f"Chapter {chapter.code}: {chapter.title}", styles['ContentText']))
        lessons = Topic.objects.filter(book=book, parent=chapter, type='lesson').order_by('code')
        for lesson in lessons:
            story.append(Paragraph(f"    {lesson.code} {lesson.title}", styles['StepText']))

    story.append(PageBreak())

    # Content - Chapters
    for chapter in chapters:
        # Chapter header
        story.append(Paragraph(f"Chapter {chapter.code}: {chapter.title}", styles['ChapterTitle']))

        # Chapter content
        if chapter.content:
            text = html_to_pdf_text(chapter.content)
            story.append(Paragraph(text, styles['ContentText']))

        # Lessons
        lessons = Topic.objects.filter(book=book, parent=chapter, type='lesson').order_by('code')
        for lesson in lessons:
            # Lesson header
            story.append(Paragraph(f"{lesson.code} {lesson.title}", styles['LessonTitle']))

            # Lesson content
            if lesson.content:
                text = html_to_pdf_text(lesson.content)
                story.append(Paragraph(text, styles['ContentText']))

            # Activity blocks
            if lesson.activity_blocks:
                for block in lesson.activity_blocks:
                    title = block.get('title', 'Activity')
                    introduction = block.get('introduction', '')
                    steps = block.get('steps', [])
                    challenge = block.get('challenge', '')

                    # Activity header
                    story.append(Paragraph(title, styles['ActivityTitle']))

                    # Introduction
                    if introduction:
                        story.append(Paragraph(introduction, styles['ContentText']))

                    # Steps
                    if steps:
                        for step in steps:
                            step_num = step.get('number', '')
                            step_title = step.get('title', '')
                            step_content = step.get('content', '')
                            step_text = f"<b>Step {step_num}: {step_title}</b> - {step_content}"
                            story.append(Paragraph(step_text, styles['StepText']))

                    # Challenge
                    if challenge:
                        story.append(Paragraph(f"<b>Challenge:</b> {challenge}", styles['ChallengeText']))

                    story.append(Spacer(1, 0.2*inch))

        story.append(PageBreak())

    # Build PDF
    doc.build(story)

    # Get PDF from buffer
    buffer.seek(0)
    pdf_data = buffer.getvalue()
    buffer.close()

    # Create response
    filename = f"{book.title.replace(' ', '_')}_Content.pdf"
    response = HttpResponse(pdf_data, content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    response['Content-Length'] = len(pdf_data)

    return response