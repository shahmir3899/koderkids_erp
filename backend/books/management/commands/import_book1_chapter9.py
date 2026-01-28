"""
Import Book 1 Chapter 9: Introduction to AI
Run: python manage.py import_book1_chapter9
"""
from django.core.management.base import BaseCommand
from books.models import Book, Topic


class Command(BaseCommand):
    help = 'Import Book 1 Chapter 9 content'

    def handle(self, *args, **options):
        book = self._get_book()
        if not book:
            return

        # Chapter 9
        chapter9, created = Topic.objects.update_or_create(
            book=book,
            code='9',
            defaults={
                'title': 'Introduction to AI',
                'type': 'chapter',
                'parent': None,
                'content': '''<h2>Welcome to the AI Adventure!</h2>
<p>Hey, Koder Kids! Let us show you artificial intelligence (AI)! AI is like a smart helper that answers questions or recognizes pictures, kind of like coding a robot in VEXcode VR (Chapter 3). Let's explore AI with ChatGPT!</p>

<p><strong>Fun Fact:</strong> AI helps apps like YouTube suggest videos, even in Pakistan!</p>''',
            }
        )
        self.stdout.write(f'{"Created" if created else "Updated"} Chapter 9: {chapter9.title}')

        # =============================================
        # Lesson 9.1 - What is AI?
        # =============================================
        lesson_9_1 = self._create_lesson(book, chapter9, {
            'code': '9.1',
            'title': 'What is AI?',
            'content': '''<p>AI is when computers think a bit like people, answering questions or solving problems.</p>

<h3>Definition:</h3>
<p>Artificial Intelligence (AI) is a program that does smart things, like chatting with you or spotting a markhor in a photo.</p>

<h3>Explanation:</h3>
<ul>
<li>AI learns from examples, like how you learned to code in Python (Chapter 4).</li>
<li>For example, if you ask AI about the moon, it finds the best answer!</li>
</ul>''',
        })

        self._create_activity(book, lesson_9_1, {
            'code': '9.1.class.1',
            'title': 'Class Activity 1: AI Detective',
            'activity_blocks': [{
                'type': 'class_activity',
                'title': 'Class Activity 1: AI Detective',
                'introduction': 'Let\'s discover how AI works!',
                'steps': [
                    {'number': 1, 'title': 'Open AI Chatbot', 'content': 'Your teacher will open you an AI chatbot (e.g., a ChatGPT or Grok).'},
                    {'number': 2, 'title': 'Ask a Question', 'content': 'Ask it: "What is a star?" It will give you a lot of text. Try to read it.'},
                    {'number': 3, 'title': 'Share', 'content': 'Read / Listen to the answer and share one thing you learned.'},
                    {'number': 4, 'title': 'Compare', 'content': 'Link to Chapter 7: How is this like searching on Kiddle?'},
                ],
                'challenge': '',
                'order': 0,
            }],
        })

        self._create_activity(book, lesson_9_1, {
            'code': '9.1.home.1',
            'title': 'Home Activity 1: AI Imagination',
            'activity_blocks': [{
                'type': 'home_activity',
                'title': 'Home Activity 1: AI Imagination',
                'introduction': 'Imagine your own AI helper!',
                'steps': [
                    {'number': 1, 'title': 'Draw', 'content': 'Draw an AI robot helping you (e.g. teaching you about Pakistan).'},
                    {'number': 2, 'title': 'Write', 'content': 'Write one sentence about it.'},
                ],
                'challenge': 'Add a Pakistani flag to your robot drawing.',
                'order': 0,
            }],
        })

        # =============================================
        # Lesson 9.2 - Exploring AI with Questions
        # =============================================
        lesson_9_2 = self._create_lesson(book, chapter9, {
            'code': '9.2',
            'title': 'Exploring AI with Questions',
            'content': '''<p>AI can answer questions like a friend, using words you understand!</p>

<h3>How AI Chats:</h3>
<p>AI listens to your question (called a prompt) and gives an answer based on what it knows, like a super-smart Calculator (Chapter 1).</p>''',
        })

        self._create_activity(book, lesson_9_2, {
            'code': '9.2.class.1',
            'title': 'Class Activity 2: Chat with AI',
            'activity_blocks': [{
                'type': 'class_activity',
                'title': 'Class Activity 2: Chat with AI',
                'introduction': 'Let\'s chat with AI about Pakistan!',
                'steps': [
                    {'number': 1, 'title': 'Open AI Chatbot', 'content': 'Your teacher will open you an AI chatbot (e.g., a ChatGPT or Grok).'},
                    {'number': 2, 'title': 'Ask a Prompt', 'content': 'Ask this prompt: "Tell me a fun fact about Pakistani animals". It will generate a lot of text about a number of animals. See for your favourite one.'},
                    {'number': 3, 'title': 'Share', 'content': 'Share the fact with the class (about your favorite animal).'},
                ],
                'challenge': '',
                'order': 0,
            }],
        })

        # =============================================
        # Lesson 9.3 - Making AI Tell Stories
        # =============================================
        lesson_9_3 = self._create_lesson(book, chapter9, {
            'code': '9.3',
            'title': 'Making AI Tell Stories',
            'content': '''<p>AI can create stories, like your Scratch Jr stories (Chapter 6)! You give it a prompt, and it writes something fun.</p>''',
        })

        self._create_activity(book, lesson_9_3, {
            'code': '9.3.class.1',
            'title': 'Class Activity 3: AI Story Time',
            'activity_blocks': [{
                'type': 'class_activity',
                'title': 'Class Activity 3: AI Story Time',
                'introduction': 'Let\'s make AI tell us a story!',
                'steps': [
                    {'number': 1, 'title': 'Open AI Chatbot', 'content': 'Your teacher will open you an AI chatbot (e.g., a ChatGPT or Grok).'},
                    {'number': 2, 'title': 'Give a Prompt', 'content': 'Give this prompt: "Tell a short story about a markhor in the mountains of Pakistan".'},
                    {'number': 3, 'title': 'Draw', 'content': 'Listen / Read the story and draw one scene from it.'},
                    {'number': 4, 'title': 'Share', 'content': 'Share your drawing with the class.'},
                ],
                'challenge': 'Link to Chapter 6: Turn your AI story into a one-scene Scratch Jr project.',
                'order': 0,
            }],
        })

        self._create_activity(book, lesson_9_3, {
            'code': '9.3.home.1',
            'title': 'Home Activity: Story Starter',
            'activity_blocks': [{
                'type': 'home_activity',
                'title': 'Home Activity: Story Starter',
                'introduction': 'Create your own story prompt!',
                'steps': [
                    {'number': 1, 'title': 'Draw', 'content': 'Draw a picture of a Pakistani festival (e.g., Basant).'},
                    {'number': 2, 'title': 'Write a Prompt', 'content': 'Write a prompt for an AI to make a story about it (e.g. "Tell a story about a kite in Lahore").'},
                ],
                'challenge': '',
                'order': 0,
            }],
        })

        # =============================================
        # Lesson 9.4 - Playing Games with AI
        # =============================================
        lesson_9_4 = self._create_lesson(book, chapter9, {
            'code': '9.4',
            'title': 'Playing Games with AI',
            'content': '''<p>AI can play simple games, like guessing or riddles, similar to coding a VEXcode robot (Chapter 3)!</p>''',
        })

        self._create_activity(book, lesson_9_4, {
            'code': '9.4.class.1',
            'title': 'Class Activity 4: AI Riddle Game',
            'activity_blocks': [{
                'type': 'class_activity',
                'title': 'Class Activity 4: AI Riddle Game',
                'introduction': 'Let\'s play a riddle game with AI!',
                'steps': [
                    {'number': 1, 'title': 'Open Chatbot', 'content': 'Use the chatbot with your teacher.'},
                    {'number': 2, 'title': 'Ask for Riddle', 'content': 'Give this prompt: "Give me a riddle about a Pakistani fruit".'},
                    {'number': 3, 'title': 'Guess', 'content': 'Try to guess the answer (e.g., mango).'},
                    {'number': 4, 'title': 'Share', 'content': 'Share the riddle with a friend and see if they can solve it!'},
                ],
                'challenge': 'Ask the AI for a second riddle and solve it with your family.',
                'order': 0,
            }],
        })

        self._create_activity(book, lesson_9_4, {
            'code': '9.4.home.1',
            'title': 'Home Activity 3: Riddle Creator',
            'activity_blocks': [{
                'type': 'home_activity',
                'title': 'Home Activity 3: Riddle Creator',
                'introduction': 'Create your own riddle!',
                'steps': [
                    {'number': 1, 'title': 'Write a Riddle', 'content': 'Write a riddle about something Pakistani (e.g., a truck).'},
                    {'number': 2, 'title': 'Ask', 'content': 'Ask a grown-up what an AI might say about it.'},
                    {'number': 3, 'title': 'Draw', 'content': 'Draw the answer.'},
                ],
                'challenge': '',
                'order': 0,
            }],
        })

        # =============================================
        # Lesson 9.5 - Chapter Wrap-Up
        # =============================================
        lesson_9_5 = self._create_lesson(book, chapter9, {
            'code': '9.5',
            'title': 'Chapter Wrap-Up',
            'content': '''<h2>Amazing work, Koder Kids!</h2>

<p>You explored AI, chatted with ChatGPT, made stories, and played games. You're AI superstars!</p>

<h3>What We Did:</h3>
<ul>
<li>Learned AI, like coding in Python.</li>
<li>Asked questions and made stories about Pakistan.</li>
<li>Played riddle games with AI.</li>
</ul>

<p><strong>Fun Fact:</strong> AI is used in Pakistan to predict weather for farmers!</p>''',
        })

        self.stdout.write(self.style.SUCCESS(f'\nSuccessfully imported Chapter 9!'))

    def _get_book(self):
        book = None
        for pattern in ['Book 1', 'Koder Kids Book 1', 'KoderKids Book 1']:
            try:
                book = Book.objects.get(title__icontains=pattern)
                break
            except Book.DoesNotExist:
                continue
            except Book.MultipleObjectsReturned:
                book = Book.objects.filter(title__icontains=pattern).first()
                break
        if not book:
            self.stdout.write(self.style.ERROR('Book 1 not found.'))
        else:
            self.stdout.write(f'Found book: {book.title} (ID: {book.id})')
        return book

    def _create_lesson(self, book, parent, data):
        topic, created = Topic.objects.update_or_create(
            book=book,
            code=data['code'],
            defaults={
                'title': data['title'],
                'type': 'lesson',
                'content': data['content'],
                'parent': parent,
                'activity_blocks': [],
            }
        )
        self.stdout.write(f'  {"Created" if created else "Updated"} Lesson {data["code"]}: {data["title"]}')
        return topic

    def _create_activity(self, book, parent, data):
        topic, created = Topic.objects.update_or_create(
            book=book,
            code=data['code'],
            defaults={
                'title': data['title'],
                'type': 'activity',
                'content': '',
                'parent': parent,
                'activity_blocks': data.get('activity_blocks', []),
            }
        )
        self.stdout.write(f'    {"Created" if created else "Updated"} Activity {data["code"]}: {data["title"]}')
        return topic
