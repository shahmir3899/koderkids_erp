"""
Import Book 2 Chapter 6: AI for Image Creation
Run: python manage.py import_book2_chapter6
"""
from django.core.management.base import BaseCommand
from books.models import Book, Topic


class Command(BaseCommand):
    help = 'Import Book 2 Chapter 6 content'

    def handle(self, *args, **options):
        book = self._get_book()
        if not book:
            return

        self.stdout.write(f'Found book: {book.title} (ID: {book.id})')

        # Chapter 6
        chapter6, created = Topic.objects.update_or_create(
            book=book,
            code='6',
            defaults={
                'title': 'AI for Image Creation',
                'type': 'chapter',
                'parent': None,
                'content': '''<h2>What is AI and How Does It Work?</h2>
<p>AI (Artificial Intelligence) is like a smart computer brain that learns from examples to do tasks, like drawing pictures or answering questions. In this chapter, we'll use prompts with Grok and ChatGPT to create images, and Google Colab to code prompts. AI is fun and safe with adult help, like coding in Python (Chapter 5)!</p>

<h3>What is Prompt?</h3>
<p>A prompt is a sentence you type to tell AI what to do, e.g., "Draw a camel."</p>

<h3>AI Tip:</h3>
<p>Good prompts are clear and detailed.</p>

<p><strong>Fun Fact:</strong> AI helps in games and stories, like Scratch (Chapter 3).</p>

<h3>Preview:</h3>
<p>Let's start with simple images!</p>''',
            }
        )
        self.stdout.write(f'{"Created" if created else "Updated"} Chapter 6')

        # Lesson 6.1
        self._create_lesson(book, chapter6, {
            'code': '6.1',
            'title': 'Exploring AI Image Tools',
            'content': '''<h2>Welcome to AI Image Magic!</h2>
<p>AI turns your words into pictures! In this chapter, you'll use Grok and ChatGPT to create images, like a camel or a festival scene. You'll type prompts to make art, and explore Google Colab for AI coding. It's like painting with words!</p>

<h3>What is AI Image Creation?</h3>
<p>AI makes pictures from your prompts.</p>

<h3>Why Use AI?</h3>
<p>It's fun and creates art without drawing!</p>

<h3>Tools:</h3>
<p>Grok (grok.com), ChatGPT (chat.openai.com), and Google Colab for prompts.</p>

<h3>Chapter Preview:</h3>
<p>You'll explore tools, add details, create scenes, and use complex prompts.</p>

<h3>Key Tools:</h3>
<ul>
<li>Grok: Type prompts in a chat for images.</li>
<li>ChatGPT: Ask for pictures via DALL-E.</li>
<li>Colab: For coding AI tasks.</li>
</ul>

<p><strong>Fun Fact:</strong> AI learns from millions of images to draw for you!</p>

<h3>Instructions:</h3>
<p>Ask an adult to open grok.com or chat.openai.com.</p>''',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 1: Generate a Camel Image',
                    'introduction': "Let's make a camel with a simple prompt! You'll use Grok or ChatGPT to generate your first AI picture.",
                    'steps': [
                        {'number': 1, 'title': 'Open AI Tool', 'content': 'Open grok.com or chat.openai.com (with adult help).'},
                        {'number': 2, 'title': 'Type Prompt', 'content': 'Type: "Create an image of A camel standing in a desert."'},
                        {'number': 3, 'title': 'Generate Image', 'content': 'Press enter and wait for the image.'},
                        {'number': 4, 'title': 'Check Image', 'content': 'Check the camel - does it have humps?'},
                        {'number': 5, 'title': 'Save Image', 'content': 'Download the image and rename to camel.jpeg'},
                    ],
                    'challenge': 'Try "a camel with a hat" for fun!',
                    'order': 0,
                },
                {
                    'type': 'home_activity',
                    'title': 'Home Activity 1',
                    'introduction': 'Create an AI image of a Pakistani animal like a Markhor. Add details like in Jungle, in Woods, On mountains etc.',
                    'steps': [],
                    'order': 1,
                },
            ],
        })

        # Lesson 6.2
        self._create_lesson(book, chapter6, {
            'code': '6.2',
            'title': 'Adding Details to Prompts',
            'content': '''<p>Detailed prompts make AI images better! Add colors or places, like "a green bird on a mango tree." This is like Scratch's animations (Chapter 3). Let's get creative!</p>

<h3>Why Details?</h3>
<p>They make your picture unique, like a story.</p>

<h3>Example:</h3>
<p>A bird in a Pakistani garden!</p>

<h3>Class Activity Preview:</h3>
<p>You'll create a bird next.</p>

<p><strong>Parent Tip:</strong> Ask your child what colors they love!</p>''',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 2: Generate a Bird',
                    'introduction': "Let's use a detailed prompt to make a bird picture! You'll tell AI exactly what you want with Grok or ChatGPT.",
                    'steps': [
                        {'number': 1, 'title': 'Open AI Tool', 'content': 'Open grok.com or chat.openai.com.'},
                        {'number': 2, 'title': 'Type Detailed Prompt', 'content': 'Type: "Create an image of A green parrot on a mango tree in a sunny garden."'},
                        {'number': 3, 'title': 'Generate Image', 'content': 'Press enter to see the image.'},
                        {'number': 4, 'title': 'Check Image', 'content': 'Check the parrot - does it look happy?'},
                        {'number': 5, 'title': 'Save Image', 'content': 'Download the image. Rename as "MyParrot.jpg"'},
                    ],
                    'challenge': 'Add more details to your image. Add a detail, like "near a Rickshaw, flying above Rickshaw" etc.',
                    'order': 0,
                },
                {
                    'type': 'home_activity',
                    'title': 'Home Activity 2',
                    'introduction': 'Make an AI image of a fruit like a mango tree. Add more details to prompt.',
                    'steps': [],
                    'order': 1,
                },
            ],
        })

        # Lesson 6.3
        self._create_lesson(book, chapter6, {
            'code': '6.3',
            'title': 'Creating Scenes with AI',
            'content': '''<p>AI can make whole scenes, like a festival! Use prompts with places and actions, like "kids at a fair." You'll try this with Grok or ChatGPT, and Colab for AI coding later.</p>

<h3>What's a Scene?</h3>
<p>A picture with many things, like people and objects.</p>

<h3>Example:</h3>
<p>A Basant festival with kites!</p>

<h3>Class Activity Preview:</h3>
<p>You'll make a festival scene next.</p>

<p><strong>DIY Idea:</strong> Draw your scene on paper first!</p>''',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 3: Generate a Festival Scene',
                    'introduction': "Let's make a Basant festival picture! You'll use a scene prompt in Grok or ChatGPT for a lively image.",
                    'steps': [
                        {'number': 1, 'title': 'Open AI Tool', 'content': 'Open grok.com or chat.openai.com.'},
                        {'number': 2, 'title': 'Type Scene Prompt', 'content': 'Type: "Create an image of Kids flying colorful kites at a Basant festival in Lahore with a sunset."'},
                        {'number': 3, 'title': 'Generate Image', 'content': 'Press enter - see the kites?'},
                        {'number': 4, 'title': 'Save Image', 'content': 'Save as "BasantScene.jpg"'},
                        {'number': 5, 'title': 'Try Another Prompt', 'content': 'Try a new prompt: "Create an image of A Mela Chiraghan fair with lamps."'},
                    ],
                    'challenge': 'Add "near Minar-e-Pakistan" to your prompt.',
                    'order': 0,
                },
                {
                    'type': 'home_activity',
                    'title': 'Home Activity 3',
                    'introduction': 'Create an AI scene of a Pakistani landmark like the Badshahi Mosque.',
                    'steps': [],
                    'order': 1,
                },
            ],
        })

        # Lesson 6.4
        self._create_lesson(book, chapter6, {
            'code': '6.4',
            'title': 'Complex Prompts for Big Ideas',
            'content': '''<p>Complex prompts mix many ideas, like "a superhero flying over Karachi in a comic style." You'll use Grok or ChatGPT, and try a Python script in Colab to code prompts. Get ready for big dreams!</p>

<h3>Why Complex?</h3>
<p>Create special art, like a movie poster.</p>

<h3>Example:</h3>
<p>A Pakistani superhero adventure!</p>

<h3>Class Activity Preview:</h3>
<p>You'll make a superhero and code a prompt next.</p>

<p><strong>DIY Idea:</strong> Draw your superhero on paper after AI makes it!</p>''',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 4: Generate a Superhero Scene',
                    'introduction': "Let's design a superhero with a complex prompt! You'll use Grok or ChatGPT to make a big picture.",
                    'steps': [
                        {'number': 1, 'title': 'Open AI Tool', 'content': 'Open grok.com or chat.openai.com.'},
                        {'number': 2, 'title': 'Type Complex Prompt', 'content': 'Type: "Create an image of A Pakistani superhero in a green cape flying over Karachi at night in a cartoon style."'},
                        {'number': 3, 'title': 'Generate Image', 'content': 'Press enter to see the superhero.'},
                        {'number': 4, 'title': 'Save Image', 'content': 'Save as "MySuperheroScene.jpg"'},
                        {'number': 5, 'title': 'Try Another Prompt', 'content': 'Try another: "Create image of A robot hero in a futuristic Islamabad."'},
                    ],
                    'challenge': 'Name your superhero, like "Jinnah Super"!',
                    'order': 0,
                },
                {
                    'type': 'home_activity',
                    'title': 'Home Activity 4',
                    'introduction': 'Make an AI image of a Pakistani story scene.',
                    'steps': [],
                    'order': 1,
                },
                {
                    'type': 'home_activity',
                    'title': 'Home Activity 5',
                    'introduction': 'Code a prompt in Colab for a family picnic image.',
                    'steps': [],
                    'order': 2,
                },
                {
                    'type': 'challenge',
                    'title': 'Homework',
                    'introduction': 'Share your superhero image with your family!',
                    'steps': [],
                    'order': 3,
                },
            ],
        })

        # Chapter 6 Summary
        self._create_lesson(book, chapter6, {
            'code': '6.S',
            'title': 'Chapter 6 Summary',
            'content': '''<h2>You're an AI Artist! You:</h2>

<p><strong>6.1:</strong> Explored AI tools and generated a camel image.</p>
<p><strong>6.2:</strong> Added details to prompts for better images.</p>
<p><strong>6.3:</strong> Created festival scenes with AI.</p>
<p><strong>6.4:</strong> Used complex prompts for superhero art.</p>

<h3>Skills You Learned:</h3>
<ul>
<li>Using Grok and ChatGPT for image generation</li>
<li>Writing clear and detailed prompts</li>
<li>Creating scenes with multiple elements</li>
<li>Complex prompts for creative projects</li>
<li>Saving and naming AI-generated images</li>
</ul>''',
            'activity_blocks': [],
        })

        self.stdout.write(self.style.SUCCESS('\nSuccessfully imported Chapter 6!'))

    def _get_book(self):
        for pattern in ['Book 2', 'Koder Kids Book 2', 'KoderKids Book 2']:
            try:
                return Book.objects.get(title__icontains=pattern)
            except Book.DoesNotExist:
                continue
            except Book.MultipleObjectsReturned:
                return Book.objects.filter(title__icontains=pattern).first()
        self.stdout.write(self.style.ERROR('Book 2 not found.'))
        return None

    def _create_lesson(self, book, parent, data):
        topic, created = Topic.objects.update_or_create(
            book=book,
            code=data['code'],
            defaults={
                'title': data['title'],
                'type': 'lesson',
                'content': data['content'],
                'parent': parent,
                'activity_blocks': data.get('activity_blocks', []),
            }
        )
        self.stdout.write(f'  {"Created" if created else "Updated"} {data["code"]}: {data["title"]}')
        return topic
