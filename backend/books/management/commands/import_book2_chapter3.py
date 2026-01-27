"""
Import Book 2 Chapter 3: Scratch - Beginning to Code
Run: python manage.py import_book2_chapter3
"""
from django.core.management.base import BaseCommand
from books.models import Book, Topic


class Command(BaseCommand):
    help = 'Import Book 2 Chapter 3 content'

    def handle(self, *args, **options):
        # Find Book 2
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
            self.stdout.write(self.style.ERROR('Book 2 not found.'))
            return

        self.stdout.write(f'Found book: {book.title} (ID: {book.id})')

        # Chapter 3
        chapter3, created = Topic.objects.update_or_create(
            book=book,
            code='3',
            defaults={
                'title': 'Scratch: Beginning to Code',
                'type': 'chapter',
                'parent': None,
                'content': '''<h2>Welcome to Scratch!</h2>
<p>Get ready to create your own games and animations!</p>
<p>In Book 1, you learned about basic computer skills. Now, you'll use Scratch, a fun coding language made just for kids, to bring your ideas to life! You'll make characters move, add sounds, and create your very own stories and games.</p>

<h3>What is Scratch?</h3>
<p>Scratch is a free coding platform where you snap colorful blocks together to make programs, like building with digital LEGO!</p>

<h3>Why Learn Scratch?</h3>
<p>You can create games, animations, and interactive stories while learning how computers think!</p>

<h3>Chapter Preview:</h3>
<p>You'll explore the Scratch world, make sprites move, create interactive cards, and build your first mini-game.</p>

<h3>Instructions:</h3>
<p>Ask an adult to open scratch.mit.edu in a web browser on your computer. Click "Create" to start!</p>''',
            }
        )
        self.stdout.write(f'{"Created" if created else "Updated"} Chapter 3')

        # Lesson 3.1: Exploring the Scratch Interface
        self._create_lesson(book, chapter3, {
            'code': '3.1',
            'title': 'Exploring the Scratch Interface',
            'content': '''<p>Welcome to the Scratch world! Just like exploring a new playground, you'll discover all the cool things Scratch can do. The Scratch screen has different areas: a Stage where your creations come to life, a Sprite area for your characters, and a Block palette with all the coding pieces you'll use.</p>

<h3>What's a Sprite?</h3>
<p>A sprite is any character or object in your Scratch project. The default sprite is Scratch Cat!</p>

<h3>What's the Stage?</h3>
<p>The stage is like a theater where your sprites perform. It's the big white area on the right side of the screen.</p>

<h3>Key Areas in Scratch:</h3>
<ul>
<li><strong>Characters Area</strong> - Shows all your sprites</li>
<li><strong>Stage</strong> - Where you see your project run</li>
<li><strong>Programming Area</strong> - Where you build your code with blocks</li>
</ul>

<p><strong>Fun Fact:</strong> Scratch was created at MIT and is used by millions of kids around the world!</p>

<h3>Class Activity Preview:</h3>
<p>You'll explore Scratch and make the cat move next.</p>''',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 1: Meet Scratch Cat',
                    'introduction': "Let's explore Scratch and make the cat move! You'll learn where everything is and create your first simple program.",
                    'steps': [
                        {'number': 1, 'title': 'Open Scratch', 'content': 'Go to scratch.mit.edu and click the "Create" button at the top of the page.'},
                        {'number': 2, 'title': 'Find the Stage', 'content': 'Look at the right side of the screen. You\'ll see the Scratch Cat on a white background. This is the Stage!'},
                        {'number': 3, 'title': 'Find the Blocks', 'content': 'Look at the left side. You\'ll see colorful categories like "Motion" (blue), "Looks" (purple), and "Sound" (pink). Click on "Motion."'},
                        {'number': 4, 'title': 'Make the Cat Move', 'content': 'Find the block that says "move 10 steps." Drag it to the middle area (Programming Area).'},
                        {'number': 5, 'title': 'Run Your Code', 'content': 'Click on the block you just placed. Watch the cat move on the stage!'},
                        {'number': 6, 'title': 'Make it Move More', 'content': 'Click on the number "10" in the block and change it to "50". Click the block again to see your cat move further!'},
                    ],
                    'challenge': 'Change the number to 100 and see how far the cat moves!',
                    'order': 0,
                },
                {
                    'type': 'home_activity',
                    'title': 'Home Activity 1',
                    'introduction': 'Open Scratch at home and explore the different block categories. What colors do you see? Try dragging different blocks to the programming area!',
                    'steps': [],
                    'order': 1,
                },
            ],
        })

        # Lesson 3.2: Creating a Dancing Animation
        self._create_lesson(book, chapter3, {
            'code': '3.2',
            'title': 'Creating a Dancing Animation',
            'content': '''<p>Now let's make the cat dance! In Scratch, you can combine Motion and Looks blocks to create fun animations. You'll make Scratch Cat perform dance moves!</p>

<h3>What are Motion Blocks?</h3>
<p>Motion blocks are blue blocks that control where and how your sprite moves on the stage.</p>

<h3>What are Looks Blocks?</h3>
<p>Looks blocks are purple blocks that change how your sprite appears - like costumes and speech bubbles!</p>

<h3>Key Blocks for Dancing:</h3>
<ul>
<li><strong>move steps</strong> - Moves the sprite</li>
<li><strong>turn degrees</strong> - Rotates the sprite</li>
<li><strong>next costume</strong> - Changes the sprite's look</li>
<li><strong>wait seconds</strong> - Pauses between actions</li>
</ul>

<p><strong>Parent Tip:</strong> Encourage your child to experiment with different numbers in the blocks!</p>

<h3>Class Activity Preview:</h3>
<p>You'll make the cat do a dance routine next.</p>''',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 2: Make the Cat Dance',
                    'introduction': "Let's make Scratch Cat dance! You'll combine motion and looks blocks to create a fun animation.",
                    'steps': [
                        {'number': 1, 'title': 'Open Scratch', 'content': 'Go to scratch.mit.edu and click "Create" to start a new project.'},
                        {'number': 2, 'title': 'Add Green Flag Event', 'content': 'Click on "Events" (yellow). Drag "when green flag clicked" to the Programming Area.'},
                        {'number': 3, 'title': 'Add Dance Moves', 'content': 'From Motion (blue), add "move 10 steps". From Looks (purple), add "next costume". From Control (orange), add "wait 0.5 seconds".'},
                        {'number': 4, 'title': 'Build the Dance', 'content': 'Stack these blocks under the green flag: move, next costume, wait. Then add turn 15 degrees.'},
                        {'number': 5, 'title': 'Repeat for More Moves', 'content': 'Repeat steps 3-4 twice for more dance moves.'},
                        {'number': 6, 'title': 'Test Your Dance', 'content': 'Click the green flag to test. The cat should dance!'},
                    ],
                    'challenge': 'Change the message to "Happy Eid!"',
                    'order': 0,
                },
                {
                    'type': 'home_activity',
                    'title': 'Home Activity 2',
                    'introduction': 'Create an animation where the Scratch Cat says a Pakistani greeting.',
                    'steps': [],
                    'order': 1,
                },
            ],
        })

        # Lesson 3.3: Adding Interactions with Events
        self._create_lesson(book, chapter3, {
            'code': '3.3',
            'title': 'Adding Interactions with Events',
            'content': '''<p>Events make projects interactive! Event blocks, like "when this sprite clicked," let users control actions. You'll make a clickable greeting card.</p>

<h3>What's an Event?</h3>
<p>A trigger, like clicking, that starts code.</p>

<h3>Example:</h3>
<p>Click the cat, and it talks!</p>

<h3>Activity Preview:</h3>
<p>You'll create a card next.</p>

<p><strong>DIY Idea:</strong> Draw a paper card to match your Scratch one!</p>''',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 3: Build a Clickable Greeting Card',
                    'introduction': "Let's make an interactive card! When you click the Scratch Cat, it says a special message, perfect for celebrations.",
                    'steps': [
                        {'number': 1, 'title': 'Open a New Project', 'content': 'Open a new Scratch project with the Scratch Cat.'},
                        {'number': 2, 'title': 'Add Click Event', 'content': 'Drag "when this sprite clicked" (Events) to the coding area.'},
                        {'number': 3, 'title': 'Add Greeting Message', 'content': 'Add "say Happy Basant! for 2 secs" (Looks).'},
                        {'number': 4, 'title': 'Test It', 'content': 'Click the cat on the Stage to test - it talks!'},
                        {'number': 5, 'title': 'Change the Background', 'content': 'Change the Stage: Click "Backdrops" (bottom left) and pick a festive one (e.g., party).'},
                        {'number': 6, 'title': 'Add Sound', 'content': 'Add "play sound meow until done" (Sound).'},
                    ],
                    'challenge': 'Change to "Happy Birthday!" for a friend.',
                    'order': 0,
                },
                {
                    'type': 'home_activity',
                    'title': 'Home Activity 3',
                    'introduction': 'Make a greeting card for a Pakistani festival like Eid.',
                    'steps': [],
                    'order': 1,
                },
            ],
        })

        # Lesson 3.4: Building a Mini-Game
        self._create_lesson(book, chapter3, {
            'code': '3.4',
            'title': 'Building a Mini-Game',
            'content': '''<p>Games are super fun to code! You'll make a "Catch the Mango" game, like Chapter 4's robot challenges, where the Scratch Cat catches falling mangoes (a Pakistani favorite).</p>

<h3>What's a Game?</h3>
<p>A project where players do tasks, like collecting items.</p>

<h3>Example:</h3>
<p>Move the cat to grab mangoes!</p>

<h3>Activity Preview:</h3>
<p>You'll code your game next.</p>

<p><strong>Parent Tip:</strong> Play the game with your child!</p>''',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 4: Create a "Catch the Mango" Game',
                    'introduction': "Let's build a game! The Scratch Cat moves with arrow keys to catch falling mangoes, using skills from earlier sections.",
                    'steps': [
                        {'number': 1, 'title': 'Open a New Project', 'content': 'Open a new Scratch project.'},
                        {'number': 2, 'title': 'Add an Apple Sprite', 'content': 'Add an Apple sprite: Click "Choose a Sprite" and pick an Apple.'},
                        {'number': 3, 'title': 'Program the Apple', 'content': 'For Apple: Add "when green flag clicked" (Events). Add "go to x: 0 y: 100" (Motion). Add "glide 3 secs to x: 0 y: -150" (Motion).'},
                        {'number': 4, 'title': 'Program Cat Movement (Right)', 'content': 'For Scratch Cat: Add "when right arrow key pressed" (Events). Add "change x by 10" (Motion).'},
                        {'number': 5, 'title': 'Program Cat Movement (Left)', 'content': 'For Scratch Cat: Add "when left arrow key pressed". "change x by -10" (Motion).'},
                        {'number': 6, 'title': 'Test Your Game', 'content': 'Click the green flag and use arrows to catch the Apple.'},
                    ],
                    'challenge': 'Add "say Yum! for 2 secs" (Looks) when cat touches Apple (use "touching" from Sensing).',
                    'order': 0,
                },
            ],
        })

        # Chapter 3 Summary
        self._create_lesson(book, chapter3, {
            'code': '3.5',
            'title': 'Chapter 3 Summary and Final Home Activity',
            'content': '''<h2>You're a Scratch coder! You:</h2>

<p><strong>3.1:</strong> Explored the Scratch interface and moved the cat.</p>
<p><strong>3.2:</strong> Created a dancing animation with Motion and Looks.</p>
<p><strong>3.3:</strong> Made an interactive greeting card with Events.</p>
<p><strong>3.4:</strong> Built a "Catch the Apple" game.</p>''',
            'activity_blocks': [
                {
                    'type': 'home_activity',
                    'title': 'Home Activity 4',
                    'introduction': 'Code a new game where the Scratch Cat catches kites.',
                    'steps': [],
                    'order': 0,
                },
                {
                    'type': 'challenge',
                    'title': 'Homework',
                    'introduction': 'Share your "Catch the Apple" game with your family!',
                    'steps': [],
                    'order': 1,
                },
            ],
        })

        self.stdout.write(self.style.SUCCESS(f'\nSuccessfully imported Chapter 3!'))

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
