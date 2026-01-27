"""
Import Book 2 Chapter 1: Mastering Pixel Art with Pixilart
Run: python manage.py import_book2_chapter1
"""
from django.core.management.base import BaseCommand
from books.models import Book, Topic


class Command(BaseCommand):
    help = 'Import Book 2 Chapter 1 content'

    def handle(self, *args, **options):
        # Find Book 2 by title or ID
        book = None
        # Try common patterns
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
            # List available books
            books = Book.objects.all()
            self.stdout.write(self.style.WARNING('Available books:'))
            for b in books:
                self.stdout.write(f'  ID={b.id}: {b.title}')
            self.stdout.write(self.style.ERROR('\nBook 2 not found. Please create it first or specify ID.'))
            return

        self.stdout.write(f'Found book: {book.title} (ID: {book.id})')

        # Chapter 1 data
        chapter1_data = {
            'code': '1',
            'title': 'Mastering Pixel Art with Pixilart',
            'type': 'chapter',
            'content': '''<h2>Welcome to Pixel Art Magic!</h2>
<p>Get ready to create awesome digital art!</p>
<p>In Book 1, you learned simple drawing using paint. Now, you'll learn how to make amazing pictures and even animations using tiny colored squares called pixels. We'll use a cool website called Pixilart to make your art shine.</p>
<p>Let's get started!</p>

<h3>What is Pixel Art?</h3>
<p>It's a special kind of digital drawing where you use tiny squares of color.</p>

<h3>Why Learn Pixel Art?</h3>
<p>You can make fun characters, cool scenes, and even animations, just like in your favorite video games!</p>

<h3>Chapter Preview:</h3>
<p>You'll draw with pixels, make art move, create scenes, and tell a story with your pixel art.</p>

<h3>Instructions:</h3>
<p>Ask an adult to open www.pixilart.com in a web browser on your computer.</p>''',
        }

        # Create or update Chapter 1
        chapter1, created = Topic.objects.update_or_create(
            book=book,
            code='1',
            defaults={
                'title': chapter1_data['title'],
                'type': 'chapter',
                'content': chapter1_data['content'],
                'parent': None,
            }
        )
        self.stdout.write(f'{"Created" if created else "Updated"} Chapter 1: {chapter1.title}')

        # Lesson 1.1
        lesson_1_1 = self._create_lesson(book, chapter1, {
            'code': '1.1',
            'title': 'Understanding Pixel Art Basics',
            'content': '''<p>Great pixel art looks neat and clear! You'll learn about pixels (the tiny squares!), choose your drawing size, and pick colors to make your art pop, just like the bold designs on a Pakistani truck art painting. Understanding these basics helps people understand your pixel art ideas.</p>

<h3>Why Focus on Pixel Basics?</h3>
<p>It makes your art interesting and easy to see.</p>

<h3>Key Tips:</h3>
<ul>
<li>Start with a small drawing area</li>
<li>Choose bright, clear colors</li>
<li>Every tiny square matters!</li>
</ul>

<p><strong>Fun Fact:</strong> Many classic video games, like Super Mario were made with pixel art!</p>

<h3>Class Activity Preview:</h3>
<p>You'll create your first pixel drawing next.</p>''',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 1: Draw a Pixel Festival Icon',
                    'introduction': "Let's make a tiny pixel drawing for a Pakistani festival! You'll choose a small drawing area and use colors to create a simple pixel icon.",
                    'steps': [
                        {'number': 1, 'title': 'Open Pixilart', 'content': 'Go to www.pixilart.com and click "Start Drawing" at the top of the page.'},
                        {'number': 2, 'title': 'Start a New Drawing', 'content': 'On the pop-up, choose a small size like 64x64 pixels (or a similar small size if 64x64 isn\'t a direct option, e.g., 50x50 or 32x32), then click "New Drawing."'},
                        {'number': 3, 'title': 'Find Your Tools', 'content': 'Look for the Pencil tool on the left side. Choose a color from the right side (the color palette) similar to Paint.'},
                        {'number': 4, 'title': 'Draw Your Icon', 'content': "Carefully click tiny squares to draw a simple picture of a kite. Remember, it's pixel art, so it will look blocky!"},
                        {'number': 5, 'title': 'Color it In', 'content': 'Select the Paint Bucket tool (it looks like a spilling bucket) and click inside your kite drawing to fill it with color.'},
                        {'number': 6, 'title': 'Save', 'content': 'Click the "File" menu (usually at the top left, a small floppy disk icon or similar) and select "Save As .pixil". Name it "MyKite.pixil" and save it to your computer.'},
                    ],
                    'challenge': 'Change the color of your kite, or add a tiny string to it.',
                    'order': 0,
                },
                {
                    'type': 'home_activity',
                    'title': 'Home Activity 1',
                    'introduction': 'Design a pixel art icon for your favorite food (e.g., a small pixel biryani plate, a pixel samosa) with custom colors.',
                    'steps': [],
                    'order': 1,
                },
            ],
        })

        # Lesson 1.2
        lesson_1_2 = self._create_lesson(book, chapter1, {
            'code': '1.2',
            'title': 'Making Pixel Art Move: Simple Animations',
            'content': '''<p>Animations make your pixel art come alive, like a dancing kite! In Pixilart, you create a series of drawings called frames, each slightly different. When you play them fast, it looks like movement! These tricks make your pixel art fun, like coding animations in Scratch (Chapter 3).</p>

<h3>What's a Frame?</h3>
<p>It's one single picture in a sequence that makes up an animation.</p>

<h3>What's Animation in Pixilart?</h3>
<p>Drawing a little bit differently on each frame to show something moving or changing.</p>

<h3>Class Activity Preview:</h3>
<p>You'll animate your pixel art next.</p>

<p><strong>Parent Tip:</strong> Watch your child's pixel animations and cheer them on!</p>''',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 2: Animate Your Pixel Icon',
                    'introduction': "Let's make your pixel kite dance! You'll add frames and make small changes to create a simple animation, building on your festival icon.",
                    'steps': [
                        {'number': 1, 'title': 'Open Your Project', 'content': 'Go to www.pixilart.com. Click "File" > "Open .pixil" and open your "MyKite.pixil" file.'},
                        {'number': 2, 'title': 'Find Frames', 'content': 'Go to the GIF Frames file at bottom of the screen.'},
                        {'number': 3, 'title': 'Duplicate Frames', 'content': 'You\'ll see "Frame 1." Click the "+" button or "Duplicate Frame" icon to add "Frame 2" that looks exactly like Frame 1. Do this a few times until you have 3 or 4 frames.'},
                        {'number': 4, 'title': 'Make Changes', 'content': 'Click on Frame 2. Use the Pencil tool or Eraser to make a tiny change to your kite (e.g., make the string wiggle a little, or change a color slightly). Click on Frame 3. Make another tiny change.'},
                        {'number': 5, 'title': 'Play Animation', 'content': 'Click the "Preview" button to see your kite move!'},
                        {'number': 6, 'title': 'Adjust Speed', 'content': 'If it\'s too fast or too slow, change the "FPS" (Frames Per Second) number bottom of the frame. A smaller number (like 100ms) makes it slower.'},
                        {'number': 7, 'title': 'Save as GIF', 'content': 'Click the "File" menu again, then "Export". Choose "Animated GIF" and click "Download." Name it "AnimatedKite.gif" and save it.'},
                    ],
                    'challenge': 'Make your kite animation loop smoothly by making the last frame almost match the first frame.',
                    'order': 0,
                },
                {
                    'type': 'home_activity',
                    'title': 'Home Activity 2',
                    'introduction': 'Copy a paint drawing file to a new folder called "My Art."',
                    'steps': [],
                    'order': 1,
                },
            ],
        })

        # Lesson 1.3
        lesson_1_3 = self._create_lesson(book, chapter1, {
            'code': '1.3',
            'title': 'Building Pixel Scenes and Characters',
            'content': '''<p>Keyboard shortcuts make organizing faster, like a magic trick! Instead of right-clicking, use keys to cut, copy, or undo, speeding up your work like in PowerPoint (Chapter 1).</p>

<h3>Why Build Scenes/Characters?</h3>
<p>It makes your pixel art lively and fun, like designing your own game world!</p>

<h3>Example:</h3>
<p>You can draw a pixelated version of your school, or a tiny pixel robot exploring a city.</p>

<h3>Class Activity Preview:</h3>
<p>You'll draw a small pixel scene or character next.</p>

<p><strong>DIY Idea:</strong> Draw a pixelated version of your own house or favorite street of village.</p>''',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 3: Create a Pixel Scene',
                    'introduction': "Let's make your pixel art world bigger! You'll draw a small scene or a simple character, combining different pixel art elements.",
                    'steps': [
                        {'number': 1, 'title': 'Open Pixilart', 'content': 'Go to www.pixilart.com and click "Start Drawing."'},
                        {'number': 2, 'title': 'Start a New Drawing', 'content': 'Choose a slightly larger canvas size, like 128x128 pixels. Click "New Drawing."'},
                        {'number': 3, 'title': 'Draw a Background', 'content': 'Use the Pencil and Paint Bucket tools to create a simple background, like a blue sky and green grass.'},
                        {'number': 4, 'title': 'Add Elements', 'content': 'Draw a pixelated tree (a brown trunk and green leaves). Draw a small pixel cloud in the sky. Try drawing a simple pixel character (like a stick figure or a small robot).'},
                        {'number': 5, 'title': 'Use Different Colors', 'content': 'Experiment with different colors from the palette to make your scene vibrant.'},
                        {'number': 6, 'title': 'Save', 'content': 'Click "File" > "Save As .pixil" and name it "MyPixelScene.pixil."'},
                    ],
                    'challenge': 'Can you add your animated pixel kite from Activity 2 into this scene? (You might need to copy and paste parts of your kite or redraw it here!)',
                    'order': 0,
                },
            ],
        })

        # Lesson 1.4
        lesson_1_4 = self._create_lesson(book, chapter1, {
            'code': '1.4',
            'title': 'Designing a 5-Frame Pixel Story',
            'content': '''<p>Now combine all your amazing pixel art skills to tell a short story! You'll create 5 different pixel art pictures, like a mini-comic book or storybook, using your designs and maybe even little animations. This is like planning a whole story.</p>

<h3>What's a Pixel Story?</h3>
<p>It's a series of pixel art drawings that tell a simple tale or show a sequence of events.</p>

<h3>Example:</h3>
<p>A story about a pixel character meeting a friend, or a day at a pixel festival!</p>

<h3>Class Activity Preview:</h3>
<p>You'll build a 5-panel pixel story next.</p>

<p><strong>Parent Tip:</strong> Tell a pixel story with your child at home!</p>''',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 4: Build a 5-Panel Pixel Story',
                    'introduction': "Let's create a 5-panel story about a topic you like! You'll use all your Pixilart skills to make it awesome.",
                    'steps': [
                        {'number': 1, 'title': 'Open Pixilart', 'content': 'Go to www.pixilart.com and click "Start Drawing."'},
                        {'number': 2, 'title': 'Start a New Drawing', 'content': 'Choose a canvas size like 160x160 pixels.'},
                        {'number': 3, 'title': 'Plan Your Story', 'content': 'Think of a simple story with a beginning, middle, and end.'},
                        {'number': 4, 'title': 'Create Your Panels', 'content': '''Panel 1 (Frame 1): Draw the beginning of your story (e.g., a character standing in a field).
Panel 2 (Frame 2): Click the "copy frame" button in the animation section to duplicate the frame. Draw the next part of your story (e.g., the character starting to walk).
Panel 3 (Frame 3): Copy frame. Draw the middle part (e.g., the character sees something interesting).
Panel 4 (Frame 4): Copy frame. Draw a new event or a challenge (e.g., a pixel monster appears!).
Panel 5 (Frame 5): Copy frame. Draw the ending (e.g., the character runs away or solves the problem).'''},
                        {'number': 5, 'title': 'Play Your Story', 'content': 'Click the "Play" button in the animation section to see your story unfold! Adjust the FPS if needed.'},
                        {'number': 6, 'title': 'Save as GIF', 'content': 'Click "File" > "Export" > "Animated GIF." Name it "MyPixelStory.gif" and save it.'},
                    ],
                    'challenge': 'Add a tiny pixel detail related to Pakistan in your story, like a small pixel flag or a pixel chai cup.',
                    'order': 0,
                },
            ],
        })

        # Chapter Summary
        summary = self._create_lesson(book, chapter1, {
            'code': '1.5',
            'title': 'Chapter 1 Summary and Pixel Art Challenge!',
            'content': '''<h2>You're a Pixel Art Pro! You:</h2>

<p><strong>1.1</strong> - Understood pixel art basics and drew your first icon.</p>
<p><strong>1.2</strong> - Added animations to make your pixel art move.</p>
<p><strong>1.3</strong> - Built pixel art scenes and characters.</p>
<p><strong>1.4</strong> - Created a 5-panel pixel story!</p>''',
            'activity_blocks': [
                {
                    'type': 'home_activity',
                    'title': 'Home Activity 3: Make a Festival Folder',
                    'introduction': 'Create a pixel art picture about your family or a pixelated scene of your favorite family activity (e.g., a pixel picnic, a pixel game night, or a pixel picture of your family in traditional Pakistani clothes). Save it as a .pixil file or export it as a .png image.',
                    'steps': [],
                    'order': 0,
                },
                {
                    'type': 'challenge',
                    'title': 'Homework',
                    'introduction': 'Present your family pixel art to your parents and tell them the story behind it!',
                    'steps': [],
                    'order': 1,
                },
            ],
        })

        self.stdout.write(self.style.SUCCESS(f'\nSuccessfully imported Chapter 1 with {Topic.objects.filter(book=book, code__startswith="1").count()} topics!'))

    def _create_lesson(self, book, parent, data):
        """Helper to create a lesson topic"""
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
        action = 'Created' if created else 'Updated'
        self.stdout.write(f'  {action} {data["code"]}: {data["title"]}')
        return topic
