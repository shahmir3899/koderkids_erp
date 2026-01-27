"""
Import Book 2 Chapter 8: Advanced Digital Art with Canva
Run: python manage.py import_book2_chapter8
"""
from django.core.management.base import BaseCommand
from books.models import Book, Topic


class Command(BaseCommand):
    help = 'Import Book 2 Chapter 8 content'

    def handle(self, *args, **options):
        book = self._get_book()
        if not book:
            return

        self.stdout.write(f'Found book: {book.title} (ID: {book.id})')

        # Chapter 8
        chapter8, created = Topic.objects.update_or_create(
            book=book,
            code='8',
            defaults={
                'title': 'Advanced Digital Art with Canva',
                'type': 'chapter',
                'parent': None,
                'content': '''<h2>Welcome to Advanced Canva!</h2>
<p>Canva is your art studio! In Book 1, you opened and edited templates. Now, you'll create fancier designs with layers, animations, and teamwork, like posters or moving graphics. Get ready to shine!</p>

<h3>What's Advanced Canva?</h3>
<p>Using cool tools to make pro-level art.</p>

<h3>Why Learn More?</h3>
<p>Design for school, festivals, or fun with friends!</p>

<h3>Activity Preview:</h3>
<p>You'll review Book 1 skills first!</p>

<h3>Instructions:</h3>
<p>Ask an adult to help you sign into www.canva.com.</p>''',
            }
        )
        self.stdout.write(f'{"Created" if created else "Updated"} Chapter 8')

        # Lesson 8.1
        self._create_lesson(book, chapter8, {
            'code': '8.1',
            'title': 'Revisiting Canva Basics (Book 1 Review)',
            'content': '''<p>Let's refresh Book 1! You learned to open templates (ready-made designs) and edit them by changing text or images. This helps us start our advanced journey.</p>

<h3>Key Skills:</h3>
<ul>
<li>Open a template: Pick a design to start.</li>
<li>Edit: Change words, colors, or pictures.</li>
</ul>

<p><strong>Fun Fact:</strong> Canva has templates for everything, even Pakistani weddings!</p>

<h3>Activity:</h3>
<p>Review with a template.</p>''',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 1: Create an Art Show Poster',
                    'introduction': "Let's practice Book 1 skills! You'll open and edit a template to make a quick poster, warming up for advanced Canva.",
                    'steps': [
                        {'number': 1, 'title': 'Open Canva', 'content': 'Go to www.canva.com and click "Create a design" > "Poster."'},
                        {'number': 2, 'title': 'Choose Template', 'content': 'Choose a colorful poster template (search "art").'},
                        {'number': 3, 'title': 'Edit Title', 'content': 'Change the title to "Lahore Art Show."'},
                        {'number': 4, 'title': 'Replace Image', 'content': 'Replace an image with a new one (search "painting" in "Elements").'},
                        {'number': 5, 'title': 'Change Color', 'content': 'Change the text color to blue or red.'},
                        {'number': 6, 'title': 'Download', 'content': 'Download it as "ArtPoster.png."'},
                    ],
                    'challenge': 'Add "By [Your Name]" to the poster at the end.',
                    'order': 0,
                },
                {
                    'type': 'home_activity',
                    'title': 'Home Activity 1',
                    'introduction': 'Edit a family poster online.',
                    'steps': [],
                    'order': 1,
                },
            ],
        })

        # Lesson 8.2
        self._create_lesson(book, chapter8, {
            'code': '8.2',
            'title': 'Exploring Advanced Canva Features',
            'content': '''<p>Advanced Canva lets you use layers (stacking images/text) and grids (organizing designs). These make your art look neat and professional, like a real designer!</p>

<h3>What's a Layer?</h3>
<p>Each part (text, image) sits on its own level, like stacking papers.</p>

<h3>What's a Grid?</h3>
<p>Lines to align your design perfectly.</p>

<h3>Activity Preview:</h3>
<p>You'll design with layers next.</p>

<p><strong>Parent Tip:</strong> Ask your child to explain their design!</p>''',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 2: Create an Invitation Card',
                    'introduction': "Let's stack layers to make a cool invitation! You'll place text and images on different levels for a neat look.",
                    'steps': [
                        {'number': 1, 'title': 'Open Canva', 'content': 'Open www.canva.com and click "Create a design" > "Invitation."'},
                        {'number': 2, 'title': 'Choose Template', 'content': 'Choose a blank design or simple template.'},
                        {'number': 3, 'title': 'Add Background', 'content': 'Add a background: Search "pattern" in "Elements" and pick one.'},
                        {'number': 4, 'title': 'Add Image', 'content': 'Add an image: Search "flower" and place it on top.'},
                        {'number': 5, 'title': 'Add Text', 'content': 'Add text: Type "Eid Party!" in a big font.'},
                        {'number': 6, 'title': 'Use Layers', 'content': 'Click "Position" > "Layers" to move text above the flower.'},
                        {'number': 7, 'title': 'Download', 'content': 'Download as "EidInvite.png."'},
                    ],
                    'challenge': '',
                    'order': 0,
                },
                {
                    'type': 'home_activity',
                    'title': 'Home Activity 2',
                    'introduction': 'Add a Pakistani touch, like "at Badshahi Mosque."',
                    'steps': [],
                    'order': 1,
                },
            ],
        })

        # Lesson 8.3
        self._create_lesson(book, chapter8, {
            'code': '8.3',
            'title': 'Creating Animations in Canva',
            'content': '''<p>Animations make your designs move, like a dancing kite! Canva lets you add effects to create GIFs or videos, perfect for sharing online.</p>

<h3>What's an Animation?</h3>
<p>A moving picture, like a mini-cartoon.</p>

<h3>Why Animate?</h3>
<p>Make your art fun for festivals or school!</p>

<h3>Class Activity Preview:</h3>
<p>You will create an animated post next.</p>

<p><strong>DIY Idea:</strong> Present your animated designs to family members.</p>''',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 3: Design an Animated Post',
                    'introduction': "Let's make a moving social media post for Basant! You'll add animation effects to text and images.",
                    'steps': [
                        {'number': 1, 'title': 'Open Canva', 'content': 'Go to www.canva.com and click "Create a design" > "Social Media Post."'},
                        {'number': 2, 'title': 'Choose Template', 'content': 'Choose a blank design or search "festival" for a template.'},
                        {'number': 3, 'title': 'Add Image', 'content': 'Add an image: Search "kite" in "Elements" and place it.'},
                        {'number': 4, 'title': 'Add Text', 'content': 'Add text: "Fly High at Basant!" in a bold font.'},
                        {'number': 5, 'title': 'Animate', 'content': 'Click "Animate" > choose "Rise" for the text and "Pan" for the kite.'},
                        {'number': 6, 'title': 'Download GIF', 'content': 'Download as a GIF ("Share" > "Download" > "GIF").'},
                    ],
                    'challenge': 'Add a second kite with a different animation.',
                    'order': 0,
                },
                {
                    'type': 'home_activity',
                    'title': 'Home Activity 3',
                    'introduction': 'Add more Animations to Basant card.',
                    'steps': [],
                    'order': 1,
                },
            ],
        })

        # Lesson 8.4
        self._create_lesson(book, chapter8, {
            'code': '8.4',
            'title': 'Designing Presentations',
            'content': '''<p>Presentations are like digital stories! In Canva, you can make interactive slides with images, text, and effects, better than PowerPoint from Chapter 1.</p>

<h3>What's a Presentation?</h3>
<p>Slides to share ideas, like a school project.</p>

<h3>Why Interactive?</h3>
<p>Add buttons or links to make slides fun!</p>

<h3>Activity Preview:</h3>
<p>You'll make a 3-slide presentation next.</p>

<p><strong>DIY Idea:</strong> Present your slides to your family!</p>''',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 4: Create a 3-Slide Presentation',
                    'introduction': "Let's design a presentation about your favorite animal! You'll make slides with images and interactive elements.",
                    'steps': [
                        {'number': 1, 'title': 'Open Canva', 'content': 'Open www.canva.com and click "Create a design" > "Presentation."'},
                        {'number': 2, 'title': 'Slide 1 - Title', 'content': 'Slide 1: Add a title, "My Favorite Animal: Peacock."'},
                        {'number': 3, 'title': 'Slide 2 - Content', 'content': 'Slide 2: Add an image (search "peacock" in "Elements") and text: "Peacocks dance!"'},
                        {'number': 4, 'title': 'Slide 3 - End', 'content': 'Slide 3: Add text: "The End" and a button (search "button" in "Elements").'},
                    ],
                    'challenge': 'Add animations to each slide!',
                    'order': 0,
                },
                {
                    'type': 'home_activity',
                    'title': 'Home Activity 4',
                    'introduction': 'Create a presentation about your favorite Pakistani place.',
                    'steps': [],
                    'order': 1,
                },
            ],
        })

        # Lesson 8.5
        self._create_lesson(book, chapter8, {
            'code': '8.5',
            'title': 'Collaborative Design Projects',
            'content': '''<p>Teamwork makes art better! In Canva, you can share designs with friends and work together, like a real design studio. Let's collaborate on a project!</p>

<h3>What's Collaboration?</h3>
<p>Working with others on the same design online.</p>

<h3>Why Collaborate?</h3>
<p>Share ideas and create amazing art together!</p>

<h3>Activity Preview:</h3>
<p>You'll make a newsletter with a partner.</p>

<p><strong>Parent Tip:</strong> Help your child share designs safely!</p>''',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 5: Design a Newsletter',
                    'introduction': "Let's create a class newsletter with a partner! You'll share and edit together in Canva.",
                    'steps': [
                        {'number': 1, 'title': 'Open Canva', 'content': 'Open www.canva.com and click "Create a design" > "Newsletter."'},
                        {'number': 2, 'title': 'Choose Template', 'content': 'Pick a simple newsletter template.'},
                        {'number': 3, 'title': 'Add Title', 'content': 'Add a title: "Our Class News."'},
                        {'number': 4, 'title': 'Share Design', 'content': 'Click "Share" > "Anyone with the link" > "Can edit."'},
                        {'number': 5, 'title': 'Partner Edits', 'content': 'Send the link to a partner - they add a sentence about school.'},
                        {'number': 6, 'title': 'Download', 'content': 'Download as "ClassNews.pdf."'},
                    ],
                    'challenge': 'Add an image your partner suggests!',
                    'order': 0,
                },
                {
                    'type': 'home_activity',
                    'title': 'Home Activity 5',
                    'introduction': 'Create a family newsletter with a sibling or parent.',
                    'steps': [],
                    'order': 1,
                },
            ],
        })

        # Chapter 8 Summary and Final Activity
        self._create_lesson(book, chapter8, {
            'code': '8.S',
            'title': 'Chapter 8 Summary and Final Activity',
            'content': '''<h2>You're a Canva Pro! You:</h2>

<p><strong>8.1:</strong> Reviewed Canva basics and created an art poster.</p>
<p><strong>8.2:</strong> Used layers to design an invitation card.</p>
<p><strong>8.3:</strong> Created animated posts with GIF effects.</p>
<p><strong>8.4:</strong> Designed interactive presentations.</p>
<p><strong>8.5:</strong> Collaborated on a newsletter with a partner.</p>

<h3>Skills You Learned:</h3>
<ul>
<li>Opening and editing templates</li>
<li>Using layers to stack elements</li>
<li>Adding animations and effects</li>
<li>Creating GIFs for social media</li>
<li>Designing multi-slide presentations</li>
<li>Adding interactive elements</li>
<li>Collaborating with others online</li>
</ul>

<h3>What's Next?</h3>
<p>Use your Canva skills with Arduino projects (Chapter 9) and AI audio (Chapter 10)!</p>''',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Final Activity: Design a Festival Card',
                    'introduction': "Let's make a festival card for Mela Chiraghan! You'll use all your Canva skills.",
                    'steps': [
                        {'number': 1, 'title': 'Open Canva', 'content': 'Open www.canva.com and click "Create a design" > "Card."'},
                        {'number': 2, 'title': 'Choose Template', 'content': 'Pick a festive template or start blank.'},
                        {'number': 3, 'title': 'Add Title', 'content': 'Add title: "Happy Mela Chiraghan!"'},
                        {'number': 4, 'title': 'Add Image', 'content': 'Add an image: Search "lamp" or "lights" in Elements.'},
                        {'number': 5, 'title': 'Use Layers', 'content': 'Use layers to put the image behind the text.'},
                        {'number': 6, 'title': 'Add Animation', 'content': 'Add animation: Choose "Fade" for the text.'},
                        {'number': 7, 'title': 'Download', 'content': 'Download as a GIF: "MelaCard.gif."'},
                    ],
                    'challenge': '',
                    'order': 0,
                },
                {
                    'type': 'home_activity',
                    'title': 'Final Home Activity',
                    'introduction': 'Create an animated poster for your favorite Pakistani festival and share it with family!',
                    'steps': [],
                    'order': 1,
                },
                {
                    'type': 'challenge',
                    'title': 'Homework',
                    'introduction': 'Design a 5-slide presentation about Pakistan and present it to your class or family.',
                    'steps': [],
                    'order': 2,
                },
            ],
        })

        self.stdout.write(self.style.SUCCESS('\nSuccessfully imported Chapter 8!'))

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
