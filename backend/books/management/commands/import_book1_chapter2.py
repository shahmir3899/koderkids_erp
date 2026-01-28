"""
Import Book 1 Chapter 2: Introduction to Scratch Jr
Run: python manage.py import_book1_chapter2
"""
from django.core.management.base import BaseCommand
from books.models import Book, Topic


class Command(BaseCommand):
    help = 'Import Book 1 Chapter 2 content'

    def handle(self, *args, **options):
        # Find Book 1
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
            books = Book.objects.all()
            self.stdout.write(self.style.WARNING('Available books:'))
            for b in books:
                self.stdout.write(f'  ID={b.id}: {b.title}')
            self.stdout.write(self.style.ERROR('\nBook 1 not found. Please create it first.'))
            return

        self.stdout.write(f'Found book: {book.title} (ID: {book.id})')

        # Chapter 2 data
        chapter2, created = Topic.objects.update_or_create(
            book=book,
            code='2',
            defaults={
                'title': 'Introduction to Scratch Jr',
                'type': 'chapter',
                'parent': None,
                'content': '''<h2>Welcome to Coding Fun!</h2>
<p>Hey, Koder Kids! In this chapter we will dive into the land of Scratch Jr. Here, we don't just play games—we make them! You'll build stories, move characters, and even make them talk. Are you ready to code like a pro? Let's go!</p>

<p><strong>Fun Fact:</strong> Scratch Jr was made just for kids like you to learn coding with fun blocks!</p>''',
            }
        )
        self.stdout.write(f'{"Created" if created else "Updated"} Chapter 2: {chapter2.title}')

        # =============================================
        # Lesson 2.1 - Getting to Know Scratch Jr
        # =============================================
        lesson_2_1 = self._create_lesson(book, chapter2, {
            'code': '2.1',
            'title': 'Getting to Know Scratch Jr',
            'content': '''<p>Scratch Jr is a fun way to learn coding by creating stories and games with simple blocks. In this section, you'll learn what Scratch Jr is and how it works.</p>

<h3>What is Scratch Jr?</h3>
<p>Scratch Jr is a coding app where you control characters by dragging and dropping blocks. Each block tells the character to do something, like move or jump.</p>

<h3>How Does Scratch Jr Work?</h3>
<p>In Scratch Jr, you snap together blocks to create instructions for your characters. You can make them walk, talk, dance, and more by combining different blocks.</p>''',
        })

        # Activity 2.1.class.1
        self._create_activity(book, lesson_2_1, {
            'code': '2.1.class.1',
            'title': 'Class Activity 1: Scratch Jr Tour',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 1: Scratch Jr Tour',
                    'introduction': 'Let\'s explore the Scratch Jr interface!',
                    'steps': [
                        {'number': 1, 'title': 'Open App', 'content': 'Open the Scratch Jr app with help from your teacher.'},
                        {'number': 2, 'title': 'Main Screen', 'content': 'Tap the house icon to go to the main screen.'},
                        {'number': 3, 'title': 'New Project', 'content': 'Look at the plus (+) sign, that\'s how you start a new project.'},
                        {'number': 4, 'title': 'Explore', 'content': 'Explore where are: Characters area, Stage, Code blocks, Programming area.'},
                    ],
                    'challenge': '',
                    'order': 0,
                },
            ],
        })

        # Activity 2.1.home.1
        self._create_activity(book, lesson_2_1, {
            'code': '2.1.home.1',
            'title': 'Home Activity 1: Meet the Blocks',
            'activity_blocks': [
                {
                    'type': 'home_activity',
                    'title': 'Home Activity 1: Meet the Blocks',
                    'introduction': 'Ask a grown-up to help you open Scratch Jr at home. Look for:',
                    'steps': [
                        {'number': 1, 'title': 'Blue Blocks', 'content': 'Blue blocks (movement)'},
                        {'number': 2, 'title': 'Purple Blocks', 'content': 'Purple blocks (talking/looks)'},
                        {'number': 3, 'title': 'Green Flag', 'content': 'Green flag (to start your code)'},
                    ],
                    'challenge': 'Draw 5 different blocks on a paper and write what it does!',
                    'order': 0,
                },
            ],
        })

        # =============================================
        # Lesson 2.2 - Creating Your First Project
        # =============================================
        lesson_2_2 = self._create_lesson(book, chapter2, {
            'code': '2.2',
            'title': 'Creating Your First Project',
            'content': '''<p>Let's start your first project in Scratch Jr by adding a character and creating some movement.</p>

<ul>
<li>Open the Scratch Jr app on your computer or tablet.</li>
<li>Click the Home button (house icon).</li>
<li>Select the plus (+) sign to create a new project.</li>
</ul>''',
        })

        # Activity 2.2.class.1
        self._create_activity(book, lesson_2_2, {
            'code': '2.2.class.1',
            'title': 'Class Activity 2: Create a Moving Character',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 2: Create a Moving Character in Scratch Jr',
                    'introduction': 'Let\'s make your first character move!',
                    'steps': [
                        {'number': 1, 'title': 'Add a Character', 'content': 'When you start a new project, you\'ll see Tic on the screen. This is your first character. To add a new character, click the blue circle with the Tic on the left side. Choose a character and click the checkmark to add it to your stage.'},
                        {'number': 2, 'title': 'Add Move Blocks', 'content': 'At the bottom of the screen, you\'ll see blue blocks (motion blocks). Drag a Right block to the programming area.'},
                        {'number': 3, 'title': 'Test Your Program', 'content': 'Drag the green flag and place it before the Right Block. Click the green flag to see your character move right.'},
                        {'number': 4, 'title': 'Add More Movement', 'content': 'Drag another Move Right block to the programming area and snap it to the first block. Test again by clicking the green flag. Now your character will move!'},
                    ],
                    'challenge': '',
                    'order': 0,
                },
            ],
        })

        # Activity 2.2.home.1
        self._create_activity(book, lesson_2_2, {
            'code': '2.2.home.1',
            'title': 'Home Activity 1: Make It Walk',
            'activity_blocks': [
                {
                    'type': 'home_activity',
                    'title': 'Home Activity 1: Make It Walk',
                    'introduction': 'Try adding more Move Right blocks. Can you make your character walk across the screen? Try it and show it to a family member!',
                    'steps': [],
                    'challenge': 'You can make your Scratch Jr world more fun by: Changing the background, Adding more characters, Using different blocks.',
                    'order': 0,
                },
            ],
        })

        # Activity 2.2.class.2
        self._create_activity(book, lesson_2_2, {
            'code': '2.2.class.2',
            'title': 'Class Activity 3: Decorate the Stage',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 3: Decorate the Stage',
                    'introduction': 'Let\'s make your project look amazing!',
                    'steps': [
                        {'number': 1, 'title': 'Background', 'content': 'Tap the background icon (top-right corner).'},
                        {'number': 2, 'title': 'Choose Background', 'content': 'Choose a background like the park, space, or beach.'},
                        {'number': 3, 'title': 'Add Character', 'content': 'Use the + button to add another character (a dog, fish or dragon!).'},
                        {'number': 4, 'title': 'Resize', 'content': 'Use the Grow or Shrink blocks to change their size.'},
                    ],
                    'challenge': '',
                    'order': 0,
                },
            ],
        })

        # Activity 2.2.home.2
        self._create_activity(book, lesson_2_2, {
            'code': '2.2.home.2',
            'title': 'Home Activity 2: Add a Surprise',
            'activity_blocks': [
                {
                    'type': 'home_activity',
                    'title': 'Home Activity 2: Add a Surprise',
                    'introduction': 'Try adding a new character at home and make it say something fun using the purple say block!',
                    'steps': [],
                    'challenge': '',
                    'order': 0,
                },
            ],
        })

        # =============================================
        # Lesson 2.3 - Moving Characters with Blocks
        # =============================================
        lesson_2_3 = self._create_lesson(book, chapter2, {
            'code': '2.3',
            'title': 'Moving Characters with Blocks',
            'content': '''<p>Now that you know how to make your character move right, let's explore how to make your character move in different directions.</p>''',
        })

        # Activity 2.3.class.1
        self._create_activity(book, lesson_2_3, {
            'code': '2.3.class.1',
            'title': 'Class Activity 4: Create a Moving Character',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 4: Create a Moving Character in Scratch Jr',
                    'introduction': 'Open Scratch Jr, start a new project.',
                    'steps': [
                        {'number': 1, 'title': 'Add Move Left Block', 'content': 'Click the blue blocks and drag a Move Left block to the programming area.'},
                        {'number': 2, 'title': 'Add Move Up and Down Blocks', 'content': 'Add a Move Up block (arrow pointing up) and a Move Down block (arrow pointing down) in the same way. (Do not snap to each other.) Click on these blocks one by one and see your character move.'},
                        {'number': 3, 'title': 'Test Your Program', 'content': 'Combine / snap the blue Block and add the green flag button at the start. (To combine, bring the blocks closer) Click the green flag to see your character move right, left, up, and down.'},
                    ],
                    'challenge': 'Try making your character move in a square by repeating the directions.',
                    'order': 0,
                },
            ],
        })

        # Activity 2.3.class.2
        self._create_activity(book, lesson_2_3, {
            'code': '2.3.class.2',
            'title': 'Class Activity 5: Coding Race',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 5: Coding Race',
                    'introduction': 'Let\'s have fun with movement blocks by making a race!',
                    'steps': [
                        {'number': 1, 'title': 'Add Characters', 'content': 'Add two characters.'},
                        {'number': 2, 'title': 'Add Movement', 'content': 'Place Move Right blocks for both characters. Click on each character to see separate coding / programming area.'},
                        {'number': 3, 'title': 'Start Race', 'content': 'Tap the green flag and see which one moves faster.'},
                        {'number': 4, 'title': 'Speed Up', 'content': 'Try using more blocks to speed them up!'},
                    ],
                    'challenge': '',
                    'order': 0,
                },
            ],
        })

        # Activity 2.3.home.1
        self._create_activity(book, lesson_2_3, {
            'code': '2.3.home.1',
            'title': 'Home Activity 3: Speed Challenge',
            'activity_blocks': [
                {
                    'type': 'home_activity',
                    'title': 'Home Activity 3: Speed Challenge',
                    'introduction': 'Make a character go super far! Stack 5 or more Move Right blocks. Whoosh!',
                    'steps': [],
                    'challenge': '',
                    'order': 0,
                },
            ],
        })

        # =============================================
        # Lesson 2.4 - Creating Simple Animations
        # =============================================
        lesson_2_4 = self._create_lesson(book, chapter2, {
            'code': '2.4',
            'title': 'Creating Simple Animations',
            'content': '''<p>Let's use Scratch Jr to create a short animation where your character moves and says something.</p>''',
        })

        # Activity 2.4.class.1
        self._create_activity(book, lesson_2_4, {
            'code': '2.4.class.1',
            'title': 'Class Activity 6: Create a Talking Character Animation',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 6: Create a Talking Character Animation',
                    'introduction': 'Let\'s make your character talk and move!',
                    'steps': [
                        {'number': 1, 'title': 'Add a Speech Block', 'content': 'Click the purple blocks (looks) to make your character talk. Drag a Hi Block to the programming area (it looks like a speech bubble). Combine it with your green flag.'},
                        {'number': 2, 'title': 'Write a Message', 'content': 'Click on the text in the speech bubble block and write what you want your character to say (e.g. "Hello Kashif!").'},
                        {'number': 3, 'title': 'Add a Motion Block', 'content': 'Drag a Move Right block again and snap it after the speech block.'},
                        {'number': 4, 'title': 'Test Your Animation', 'content': 'Click the green flag to see your character say something and then move.'},
                    ],
                    'challenge': '',
                    'order': 0,
                },
            ],
        })

        # Activity 2.4.class.2
        self._create_activity(book, lesson_2_4, {
            'code': '2.4.class.2',
            'title': 'Class Activity 7: Code a Dance',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 7: Code a Dance',
                    'introduction': 'Let\'s make your characters dance or move in fun ways.',
                    'steps': [
                        {'number': 1, 'title': 'Movement Blocks', 'content': 'Use Move Up, Down, Left, and Right blocks.'},
                        {'number': 2, 'title': 'Say Block', 'content': 'Add a Say block: "Let\'s Dance!".'},
                        {'number': 3, 'title': 'Combine', 'content': 'Combine blocks to make the character wiggle or jump!'},
                    ],
                    'challenge': '',
                    'order': 0,
                },
            ],
        })

        # Activity 2.4.home.1
        self._create_activity(book, lesson_2_4, {
            'code': '2.4.home.1',
            'title': 'Home Activity 4: Dance & Tell',
            'activity_blocks': [
                {
                    'type': 'home_activity',
                    'title': 'Home Activity 4: Dance & Tell',
                    'introduction': 'Make your character dance and then say something like, "I love to code!"',
                    'steps': [],
                    'challenge': '',
                    'order': 0,
                },
            ],
        })

        # =============================================
        # Lesson 2.5 - Creating Scenes with Multiple Pages
        # =============================================
        lesson_2_5 = self._create_lesson(book, chapter2, {
            'code': '2.5',
            'title': 'Creating Scenes with Multiple Pages',
            'content': '''<p>Your story can have more than one scene—just like a cartoon!</p>''',
        })

        # Activity 2.5.class.1
        self._create_activity(book, lesson_2_5, {
            'code': '2.5.class.1',
            'title': 'Class Activity 8: New Scene (Multipage)',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 8: New Scene (Multipage)',
                    'introduction': 'Let\'s add multiple pages to your project!',
                    'steps': [
                        {'number': 1, 'title': 'New Page', 'content': 'Tap the + at the top to add a new page.'},
                        {'number': 2, 'title': 'New Background', 'content': 'Pick a new background.'},
                        {'number': 3, 'title': 'Characters', 'content': 'Add your characters again.'},
                        {'number': 4, 'title': 'Story', 'content': 'Make something new happen on this page!'},
                    ],
                    'challenge': '',
                    'order': 0,
                },
            ],
        })

        # Activity 2.5.class.2
        self._create_activity(book, lesson_2_5, {
            'code': '2.5.class.2',
            'title': 'Class Activity 9: My First Story',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 9: My First Story',
                    'introduction': 'Let\'s create a story with multiple scenes!',
                    'steps': [
                        {'number': 1, 'title': 'Scene 1', 'content': 'A dragon flies across the sky.'},
                        {'number': 2, 'title': 'Scene 2', 'content': 'The dragon lands and talks to a bird.'},
                        {'number': 3, 'title': 'Add Blocks', 'content': 'Use Say and Move blocks in each scene. Don\'t forget the green flag!'},
                    ],
                    'challenge': '',
                    'order': 0,
                },
            ],
        })

        # Activity 2.5.home.1
        self._create_activity(book, lesson_2_5, {
            'code': '2.5.home.1',
            'title': 'Home Activity 5: Story Time Challenge',
            'activity_blocks': [
                {
                    'type': 'home_activity',
                    'title': 'Home Activity 5: Story Time Challenge',
                    'introduction': 'Make a 3-scene story at home.',
                    'steps': [
                        {'number': 1, 'title': 'Scene 1', 'content': 'Start a journey.'},
                        {'number': 2, 'title': 'Scene 2', 'content': 'Something happens.'},
                        {'number': 3, 'title': 'Scene 3', 'content': 'The happy ending!'},
                    ],
                    'challenge': '',
                    'order': 0,
                },
            ],
        })

        # =============================================
        # Lesson 2.6 - Chapter Wrap-Up
        # =============================================
        lesson_2_6 = self._create_lesson(book, chapter2, {
            'code': '2.6',
            'title': 'Chapter Wrap-Up',
            'content': '''<h2>You did it, Koder Kids!</h2>

<p>In this chapter, you:</p>
<ul>
<li>Made characters move.</li>
<li>Built animations.</li>
<li>Created your first story with multiple scenes!</li>
</ul>

<p><strong>You are now a Junior Coder with Scratch Jr!</strong></p>''',
        })
        # No activities for 2.6

        self.stdout.write(self.style.SUCCESS(f'\nSuccessfully imported Chapter 2!'))

    def _create_lesson(self, book, parent, data):
        """Helper to create a lesson topic (no activity_blocks on lessons)"""
        topic, created = Topic.objects.update_or_create(
            book=book,
            code=data['code'],
            defaults={
                'title': data['title'],
                'type': 'lesson',
                'content': data['content'],
                'parent': parent,
                'activity_blocks': [],  # Lessons don't have activity_blocks
            }
        )
        action = 'Created' if created else 'Updated'
        self.stdout.write(f'  {action} Lesson {data["code"]}: {data["title"]}')
        return topic

    def _create_activity(self, book, parent, data):
        """Helper to create an activity topic (child of lesson)"""
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
        action = 'Created' if created else 'Updated'
        self.stdout.write(f'    {action} Activity {data["code"]}: {data["title"]}')
        return topic
