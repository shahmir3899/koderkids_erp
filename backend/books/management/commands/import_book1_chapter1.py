"""
Import Book 1 Chapter 1: Exploring the Computer
Run: python manage.py import_book1_chapter1
"""
from django.core.management.base import BaseCommand
from books.models import Book, Topic


class Command(BaseCommand):
    help = 'Import Book 1 Chapter 1 content'

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

        # Chapter 1 data
        chapter1, created = Topic.objects.update_or_create(
            book=book,
            code='1',
            defaults={
                'title': 'Exploring the Computer',
                'type': 'chapter',
                'parent': None,
                'content': '''<h2>Welcome to Computer World</h2>
<p>Hey there, Koder kids! We will be going through this awesome adventure into the world of computers. Get ready to learn what computers are, what they're made of, and how to use them!</p>

<p><strong>Fun Fact:</strong> The word "computer" comes from the word "compute," which means to do math!</p>''',
            }
        )
        self.stdout.write(f'{"Created" if created else "Updated"} Chapter 1: {chapter1.title}')

        # =============================================
        # Lesson 1.1 - Introduction to Computers
        # =============================================
        lesson_1_1 = self._create_lesson(book, chapter1, {
            'code': '1.1',
            'title': 'Introduction to Computers',
            'content': '''<p>Computers help us with many tasks like writing, drawing, playing games, and finding information. To get started, let's learn what a computer is made of and how it works.</p>

<h3>Definition</h3>
<p>A computer is a machine that helps us perform different tasks by using programs (software) and hardware (parts we can touch).</p>

<h3>Explanation</h3>
<p>Every computer has two main parts:</p>
<ul>
<li><strong>Software:</strong> Programs inside the computer that help it run, like Paint and Calculator.</li>
<li><strong>Hardware:</strong> These are the physical parts of the computer that you can touch, like the monitor and keyboard.</li>
</ul>''',
        })
        # No activities for 1.1

        # =============================================
        # Lesson 1.2 - Basic Computer Hardware
        # =============================================
        lesson_1_2 = self._create_lesson(book, chapter1, {
            'code': '1.2',
            'title': 'Basic Computer Hardware',
            'content': '''<p>Let's take a closer look at the most important hardware parts of the computer:</p>

<ul>
<li><strong>Monitor:</strong> This is the screen where you can see everything that happens on the computer.</li>
<li><strong>Keyboard:</strong> The part you type on. It has letters, numbers, and symbols.</li>
<li><strong>Mouse:</strong> A small device we move to point and click on things.</li>
<li><strong>CPU (Central Processing Unit):</strong> The "brain" of the computer that makes everything work. It is often in a box near the monitor.</li>
</ul>

<h3>Activity: Identify the Parts of the Computer</h3>
<p>Follow these steps to identify the parts of the computer you're using:</p>
<ol>
<li><strong>Find the Monitor:</strong> Look at the screen. That's the monitor.</li>
<li><strong>Find the Keyboard:</strong> The part you're using to type is the keyboard.</li>
<li><strong>Find the Mouse:</strong> The small device you move with your hand to click on things is the mouse.</li>
<li><strong>Find the CPU:</strong> Look for a box near the monitor. This is the CPU—the computer's brain.</li>
</ol>''',
        })

        # Activity 1.2.class.1
        self._create_activity(book, lesson_1_2, {
            'code': '1.2.class.1',
            'title': 'Class Activity 1: Identify the Parts of the Computer',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 1: Identify the Parts of the Computer',
                    'introduction': 'Color the parts of the computer and match each by drawing a line towards the correct picture.',
                    'steps': [
                        {'number': 1, 'title': 'Monitor', 'content': 'Find the Monitor. Look at the screen. That\'s the monitor.'},
                        {'number': 2, 'title': 'Keyboard', 'content': 'Find the Keyboard. The part you\'re using to type is the keyboard.'},
                        {'number': 3, 'title': 'Mouse', 'content': 'Find the Mouse. The small device you move with your hand to click on things is the mouse.'},
                        {'number': 4, 'title': 'CPU', 'content': 'Find the CPU. Look for a box near the monitor. This is the CPU—the computer\'s brain.'},
                    ],
                    'challenge': '',
                    'order': 0,
                },
            ],
        })

        # Activity 1.2.home.1
        self._create_activity(book, lesson_1_2, {
            'code': '1.2.home.1',
            'title': 'Home Activity 1: Draw and Label',
            'activity_blocks': [
                {
                    'type': 'home_activity',
                    'title': 'Home Activity 1: Draw and Label',
                    'introduction': 'Draw a computer and its parts (monitor, keyboard, mouse, CPU). Draw a computer placed on a table. Color it nicely and bring it to class!',
                    'steps': [],
                    'challenge': '',
                    'order': 0,
                },
            ],
        })

        # =============================================
        # Lesson 1.3 - Using Paint for Simple Drawing
        # =============================================
        lesson_1_3 = self._create_lesson(book, chapter1, {
            'code': '1.3',
            'title': 'Using Paint for Simple Drawing',
            'content': '''<p>Paint is a program on the computer that lets you draw pictures using different tools like pencils, shapes, and colors.</p>''',
        })

        # Activity 1.3.class.1
        self._create_activity(book, lesson_1_3, {
            'code': '1.3.class.1',
            'title': 'Class Activity 2: Open and Explore Paint',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 2: Open and Explore Paint',
                    'introduction': 'Let\'s open Paint and explore its features!',
                    'steps': [
                        {'number': 1, 'title': 'Start Menu', 'content': 'Click/tap the Start Menu (Windows icon) in the bottom-left corner of your screen.'},
                        {'number': 2, 'title': 'Type Paint', 'content': 'Type "paint" and click on the Paint App. Let\'s Get Creative! You can draw in Paint.'},
                        {'number': 3, 'title': 'Paint Interface', 'content': 'Explore the Paint interface: Painting canvas, Tools Section, Menu Bar. Use the text tool to write your name. Use shapes like stars, hearts, and circles. Use the brush for free drawing. Use color palette to select color.'},
                    ],
                    'challenge': '',
                    'order': 0,
                },
            ],
        })

        # Activity 1.3.class.2
        self._create_activity(book, lesson_1_3, {
            'code': '1.3.class.2',
            'title': 'Class Activity 3: Draw a Simple House in Paint',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 3: Draw a Simple House in Paint',
                    'introduction': 'Let\'s draw a house step by step!',
                    'steps': [
                        {'number': 1, 'title': 'Select the Square Shape', 'content': 'Once Paint is open, in Shapes look for the square/rectangle tool. Click/tap on it.'},
                        {'number': 2, 'title': 'Draw the Base of the House', 'content': 'Select the rectangle shape, click and drag to draw the base of the house.'},
                        {'number': 3, 'title': 'Draw the Roof', 'content': 'Select the Triangle Shape from Shapes. Click and drag to draw a triangle on top of the square for the roof. Match the base lines manually.'},
                        {'number': 4, 'title': 'Add Windows', 'content': 'Use the Rectangle Tool to draw four small squares for the windows.'},
                        {'number': 5, 'title': 'Draw the Door', 'content': 'Use the Rectangle Tool again to draw a tall rectangle for the door. And use the circle tool to draw a circle inside the roof triangle.'},
                        {'number': 6, 'title': 'Color Your House', 'content': 'Use the color palette and Bucket tool to paint the house.'},
                        {'number': 7, 'title': 'Save Your Drawing', 'content': 'Click the File menu in the top-left corner. Select Save As, choose a location to save, and name your drawing (e.g. "My House"). Click Save.'},
                    ],
                    'challenge': '',
                    'order': 0,
                },
            ],
        })

        # Activity 1.3.class.3 (Bonus)
        self._create_activity(book, lesson_1_3, {
            'code': '1.3.class.3',
            'title': 'Class Activity (Bonus): Shape Safari',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity (Bonus): Shape Safari',
                    'introduction': 'In Paint, find and use 5 different shapes. Try to draw the shapes.',
                    'steps': [],
                    'challenge': 'Who can make a rocket or robot?',
                    'order': 0,
                },
            ],
        })

        # Activity 1.3.home.1
        self._create_activity(book, lesson_1_3, {
            'code': '1.3.home.1',
            'title': 'Home Activity 2: Paint Message',
            'activity_blocks': [
                {
                    'type': 'home_activity',
                    'title': 'Home Activity 2: Paint Message',
                    'introduction': 'Open Paint and write a message like "Hello, world!". Decorate it with colors and shapes!',
                    'steps': [],
                    'challenge': 'Hint: Use the A button.',
                    'order': 0,
                },
            ],
        })

        # Activity 1.3.class.4
        self._create_activity(book, lesson_1_3, {
            'code': '1.3.class.4',
            'title': 'Class Activity 4: Draw and Color a Robot',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 4: Draw and Color a Robot',
                    'introduction': 'Let\'s create a robot in Paint!',
                    'steps': [
                        {'number': 1, 'title': 'Body and Arms', 'content': 'Open Paint and use rectangles for the robot\'s body and arms.'},
                        {'number': 2, 'title': 'Eyes and Head', 'content': 'Use circles for eyes and head.'},
                        {'number': 3, 'title': 'Legs and Antenna', 'content': 'Use lines or triangle shapes for legs or an antenna.'},
                        {'number': 4, 'title': 'Details', 'content': 'Add a smile and buttons!'},
                        {'number': 5, 'title': 'Finish', 'content': 'Color your robot and save your robot.'},
                    ],
                    'challenge': '',
                    'order': 0,
                },
            ],
        })

        # Activity 1.3.class.5
        self._create_activity(book, lesson_1_3, {
            'code': '1.3.class.5',
            'title': 'Class Activity 5: Create a Name Card',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 5: Create a Name Card',
                    'introduction': 'Let\'s make a personalized name card!',
                    'steps': [
                        {'number': 1, 'title': 'Open Text Tool', 'content': 'Open Paint and click the text tool (looks like an "A").'},
                        {'number': 2, 'title': 'Type Your Name', 'content': 'Type your first name.'},
                        {'number': 3, 'title': 'Format Text', 'content': 'Select Text. (Ask your teacher how to select text.) Choose your favorite font and size from the text menu.'},
                        {'number': 4, 'title': 'Decorate', 'content': 'Decorate your name with stars, hearts, and colors!'},
                    ],
                    'challenge': '',
                    'order': 0,
                },
            ],
        })

        # Activity 1.3.home.2
        self._create_activity(book, lesson_1_3, {
            'code': '1.3.home.2',
            'title': 'Home Activity 3: Create Your Dream House',
            'activity_blocks': [
                {
                    'type': 'home_activity',
                    'title': 'Home Activity 3: Create Your Dream House',
                    'introduction': 'Using Paint at home, draw your dream house. Try adding trees, clouds, and even a sun! Save your drawing and show it in class tomorrow.',
                    'steps': [],
                    'challenge': '',
                    'order': 0,
                },
            ],
        })

        # =============================================
        # Lesson 1.4 - Exploring the Calculator
        # =============================================
        lesson_1_4 = self._create_lesson(book, chapter1, {
            'code': '1.4',
            'title': 'Exploring the Calculator',
            'content': '''<p>Calculator helps us do maths. Let us start the app.</p>

<ol>
<li><strong>Click Windows Icon:</strong> Click the Start Menu (Windows icon) in the bottom-left corner of your screen.</li>
<li><strong>Type Calculator:</strong> Type "Calculator" in the search bar and click on the Calculator app to open it.</li>
</ol>''',
        })

        # Activity 1.4.class.1
        self._create_activity(book, lesson_1_4, {
            'code': '1.4.class.1',
            'title': 'Class Activity 6: Practice Basic Math Operations',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 6: Practice Basic Math Operations in Calculator',
                    'introduction': 'Follow these steps to practice using the Calculator:',
                    'steps': [
                        {'number': 1, 'title': 'Addition', 'content': 'Enter the first number (e.g. 8). Click the + button. Enter the second number (e.g. 5). Click the = button. The result will appear (e.g. 13).'},
                        {'number': 2, 'title': 'Subtraction', 'content': 'Enter the first number (e.g. 10). Click the - button. Enter the second number (e.g. 3). Click the = button. The result will appear (e.g. 7).'},
                        {'number': 3, 'title': 'Multiplication', 'content': 'Enter the first number (e.g. 6). Click the x button. Enter the second number (e.g. 4). Click the = button. The result will appear (e.g. 24).'},
                        {'number': 4, 'title': 'Division', 'content': 'Enter the first number (e.g. 12). Click the ÷ button. Enter the second number (e.g. 4). Click the = button. The result will appear (e.g. 3).'},
                    ],
                    'challenge': '',
                    'order': 0,
                },
            ],
        })

        # Activity 1.4.class.2
        self._create_activity(book, lesson_1_4, {
            'code': '1.4.class.2',
            'title': 'Class Activity 7: Practice Basic Math',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 7: Practice Basic Math in Calculator',
                    'introduction': 'Let\'s try some basic math:',
                    'steps': [
                        {'number': 1, 'title': 'Addition', 'content': 'Type 8+5 and press =. What do you get? Write below.'},
                        {'number': 2, 'title': 'Subtraction', 'content': 'Type 10−3 and press =. What do you get? Write below.'},
                        {'number': 3, 'title': 'Multiplication', 'content': 'Type 6×4 and press =. What do you get? Write below.'},
                        {'number': 4, 'title': 'Division', 'content': 'Type 12÷4 and press =. What do you get? Write below.'},
                    ],
                    'challenge': '',
                    'order': 0,
                },
            ],
        })

        # Activity 1.4.home.1
        self._create_activity(book, lesson_1_4, {
            'code': '1.4.home.1',
            'title': 'Home Activity 4: Be a Number Wizard!',
            'activity_blocks': [
                {
                    'type': 'home_activity',
                    'title': 'Home Activity 4: Be a Number Wizard!',
                    'introduction': 'At home, try these with Calculator:',
                    'steps': [
                        {'number': 1, 'title': 'Problem 1', 'content': '9+6=?'},
                        {'number': 2, 'title': 'Problem 2', 'content': '15−7=?'},
                        {'number': 3, 'title': 'Problem 3', 'content': '3×5=?'},
                        {'number': 4, 'title': 'Problem 4', 'content': '18÷2=?'},
                    ],
                    'challenge': 'Write these questions and your answers on paper and decorate your page with +, −, x symbols!',
                    'order': 0,
                },
            ],
        })

        # Activity 1.4.class.3 (Fun with Numbers)
        self._create_activity(book, lesson_1_4, {
            'code': '1.4.class.3',
            'title': 'Fun with Numbers',
            'activity_blocks': [
                {
                    'type': 'note',
                    'title': 'Fun with Numbers',
                    'introduction': 'You can use Calculator for more!',
                    'steps': [
                        {'number': 1, 'title': 'Count Toys', 'content': 'Add up your toys.'},
                        {'number': 2, 'title': 'Multiply', 'content': 'Multiply how many pencils in 5 boxes.'},
                        {'number': 3, 'title': 'Big Numbers', 'content': 'Try big numbers like 123+456.'},
                    ],
                    'challenge': '',
                    'order': 0,
                },
            ],
        })

        # Activity 1.4.class.4
        self._create_activity(book, lesson_1_4, {
            'code': '1.4.class.4',
            'title': 'Class Activity 8: Math Story Time',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 8: Math Story Time',
                    'introduction': '"If I have 3 computers and each has 4 games, how many games do I have?" Solve it with Calculator!',
                    'steps': [
                        {'number': 1, 'title': 'Solve', 'content': 'The calculator shows: 3×4=12'},
                    ],
                    'challenge': '',
                    'order': 0,
                },
            ],
        })

        # Activity 1.4.home.2
        self._create_activity(book, lesson_1_4, {
            'code': '1.4.home.2',
            'title': 'Home Activity 5: Calculator Art',
            'activity_blocks': [
                {
                    'type': 'home_activity',
                    'title': 'Home Activity 5: Calculator Art',
                    'introduction': 'Use numbers like 0, 1, 3, 8 to make faces on your calculator screen. Show your friends your number art!',
                    'steps': [],
                    'challenge': '',
                    'order': 0,
                },
            ],
        })

        # =============================================
        # Lesson 1.5 - Chapter Wrap-Up
        # =============================================
        lesson_1_5 = self._create_lesson(book, chapter1, {
            'code': '1.5',
            'title': 'Chapter Wrap-Up',
            'content': '''<h2>Great work, Koder Kids!</h2>

<p>Let's review what we learned:</p>
<ul>
<li>A computer is a smart machine made of hardware and software.</li>
<li>Hardware includes parts you can touch like the monitor, keyboard, mouse, and CPU.</li>
<li>You can draw in Paint and do math with the Calculator!</li>
</ul>

<h3>What We Did</h3>
<ul>
<li>Drew houses.</li>
<li>Solved math problems.</li>
<li>Named computer parts.</li>
</ul>

<h3>Next Up</h3>
<p>We'll start coding with Scratch Jr!</p>

<p><strong>FUN FACT:</strong> THE FIRST COMPUTERS WERE AS BIG AS A WHOLE ROOM!</p>''',
        })
        # No activities for 1.5

        self.stdout.write(self.style.SUCCESS(f'\nSuccessfully imported Chapter 1!'))

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
