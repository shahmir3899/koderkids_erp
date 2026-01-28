"""
Import Book 1 Chapter 3: Starting VEX Code VR
Run: python manage.py import_book1_chapter3
"""
from django.core.management.base import BaseCommand
from books.models import Book, Topic


class Command(BaseCommand):
    help = 'Import Book 1 Chapter 3 content'

    def handle(self, *args, **options):
        book = self._get_book()
        if not book:
            return

        # Chapter 3
        chapter3, created = Topic.objects.update_or_create(
            book=book,
            code='3',
            defaults={
                'title': 'Starting VEX Code VR',
                'type': 'chapter',
                'parent': None,
                'content': '''<h2>Welcome to Robot World!</h2>
<p>Hey, Koder Kids! In this chapter we will learn about VEX. VEXcode VR—a virtual robot playground! You'll learn to make a robot move, turn, and even explore a map. Ready to code like a robotics expert? Let's roll!</p>

<p><strong>Fun Fact:</strong> Real robots are used in space, hospitals, and even in underwater research!</p>''',
            }
        )
        self.stdout.write(f'{"Created" if created else "Updated"} Chapter 3: {chapter3.title}')

        # =============================================
        # Lesson 3.1 - Introduction to VEXcode VR
        # =============================================
        lesson_3_1 = self._create_lesson(book, chapter3, {
            'code': '3.1',
            'title': 'Introduction to VEXcode VR',
            'content': '''<p>VEXcode VR is a virtual environment where you can program robots. Instead of using a real robot, you will program a virtual robot that you can control with coding blocks.</p>

<h3>What is VEXcode VR?</h3>
<p>VEXcode VR is an online platform that allows you to program robots using blocks, just like you do in Scratch Jr. It helps you learn how robots work and how to control them using code.</p>''',
        })

        self._create_activity(book, lesson_3_1, {
            'code': '3.1.class.1',
            'title': 'Class Activity 1: Explore the Site',
            'activity_blocks': [{
                'type': 'class_activity',
                'title': 'Class Activity 1: Explore the Site',
                'introduction': 'Let\'s explore VEXcode VR!',
                'steps': [
                    {'number': 1, 'title': 'Starting VEX', 'content': 'Go to https://vr.vex.com/. Get help from the class teacher.'},
                    {'number': 2, 'title': 'Interface', 'content': 'Look at the left side (coding area) and right side (robot playground).'},
                    {'number': 3, 'title': 'Playground', 'content': 'Click on the "Playground" button and pick Grid Map.'},
                    {'number': 4, 'title': 'Explore', 'content': 'Move your mouse around to explore!'},
                ],
                'challenge': '',
                'order': 0,
            }],
        })

        self._create_activity(book, lesson_3_1, {
            'code': '3.1.home.1',
            'title': 'Home Activity 1: VEXcode VR Safari',
            'activity_blocks': [{
                'type': 'home_activity',
                'title': 'Home Activity 1: VEXcode VR Safari',
                'introduction': 'Ask a grown-up to help you open VEXcode VR at home. Look for:',
                'steps': [
                    {'number': 1, 'title': 'Motion Blocks', 'content': 'Motion blocks (blue)'},
                    {'number': 2, 'title': 'Playground Button', 'content': 'Playground button'},
                    {'number': 3, 'title': 'Robot', 'content': 'Robot on the screen'},
                ],
                'challenge': 'Draw a picture of the robot and its map!',
                'order': 0,
            }],
        })

        # =============================================
        # Lesson 3.2 - Moving the Virtual Robot
        # =============================================
        lesson_3_2 = self._create_lesson(book, chapter3, {
            'code': '3.2',
            'title': 'Moving the Virtual Robot',
            'content': '''<p>Let's get started with your first task in VEXcode VR: making your virtual robot move! We'll begin by learning how to control the robot's movements with basic commands like moving forward and turning.</p>''',
        })

        self._create_activity(book, lesson_3_2, {
            'code': '3.2.class.1',
            'title': 'Class Activity 2: Move Robot Forward',
            'activity_blocks': [{
                'type': 'class_activity',
                'title': 'Class Activity 2: Move Robot Forward',
                'introduction': 'Let\'s make the robot move forward!',
                'steps': [
                    {'number': 1, 'title': 'Open VEXcode VR', 'content': 'Go to the website: https://vr.vex.com/. Once it loads, you\'ll see a programming area on the left and a virtual world on the right.'},
                    {'number': 2, 'title': 'Select the Playground', 'content': 'Click the Playground button in the top right corner. Select the Grid Map to use as your robot\'s environment.'},
                    {'number': 3, 'title': 'Add a Move Forward Block', 'content': 'In the programming area, find the blue motion blocks. Drag the [Drive Forward for 200mm] block into the workspace.'},
                    {'number': 4, 'title': 'Run the Program', 'content': 'Click the green play button to run the program. You\'ll see the robot move forward in the grid.'},
                ],
                'challenge': '',
                'order': 0,
            }],
        })

        self._create_activity(book, lesson_3_2, {
            'code': '3.2.home.1',
            'title': 'Home Activity 2: Long Drive',
            'activity_blocks': [{
                'type': 'home_activity',
                'title': 'Home Activity 2: Long Drive',
                'introduction': 'Try different distances: 100, 250, 500. What happens?',
                'steps': [],
                'challenge': 'Write down your favorite distance and draw a robot driving far!',
                'order': 0,
            }],
        })

        self._create_activity(book, lesson_3_2, {
            'code': '3.2.class.2',
            'title': 'Class Activity 3: Drive Backward',
            'activity_blocks': [{
                'type': 'class_activity',
                'title': 'Class Activity 3: Drive Backward',
                'introduction': 'Your robot can also go backward!',
                'steps': [
                    {'number': 1, 'title': 'Add Reverse Block', 'content': 'Add Drive reverse for 200 mm.'},
                    {'number': 2, 'title': 'Run the Code', 'content': 'Run the code.'},
                    {'number': 3, 'title': 'Observe', 'content': 'What direction does the robot go?'},
                    {'number': 4, 'title': 'Mix It', 'content': 'Now try mixing it: Drive forward 300 mm and then reverse 100 mm.'},
                ],
                'challenge': '',
                'order': 0,
            }],
        })

        self._create_activity(book, lesson_3_2, {
            'code': '3.2.home.2',
            'title': 'Home Activity 3: Robot Zigzag',
            'activity_blocks': [{
                'type': 'home_activity',
                'title': 'Home Activity 3: Robot Zigzag',
                'introduction': 'Try this at home:',
                'steps': [
                    {'number': 1, 'title': 'Forward', 'content': 'Drive forward 200 mm'},
                    {'number': 2, 'title': 'Reverse', 'content': 'Reverse 200 mm'},
                    {'number': 3, 'title': 'Forward Again', 'content': 'Forward again 200 mm'},
                ],
                'challenge': 'Draw the zigzag path it makes!',
                'order': 0,
            }],
        })

        # =============================================
        # Lesson 3.3 - Programming a Simple Path
        # =============================================
        lesson_3_3 = self._create_lesson(book, chapter3, {
            'code': '3.3',
            'title': 'Programming a Simple Path',
            'content': '''<p>Now that you've made the robot move forward, let's add more blocks to create a simple path for the robot to follow. The robot will move forward, turn, and then move forward again.</p>

<h3>Making a Square</h3>
<p>Use your movement and turn blocks to make the robot move in a square!</p>''',
        })

        self._create_activity(book, lesson_3_3, {
            'code': '3.3.class.1',
            'title': 'Class Activity 4: Program the Robot to Move and Turn',
            'activity_blocks': [{
                'type': 'class_activity',
                'title': 'Class Activity 4: Program the Robot to Move and Turn',
                'introduction': 'Let\'s create a path with turns!',
                'steps': [
                    {'number': 1, 'title': 'Add a Turn Block', 'content': 'Add a drive forward block. In the blue motion blocks, find the [Turn Right for 90 degrees] block. Drag the block into the workspace and place it after the Drive Forward block.'},
                    {'number': 2, 'title': 'Add Another Move Forward Block', 'content': 'Drag another [Drive Forward for 200mm] block and place it after the turn block.'},
                    {'number': 3, 'title': 'Run the Program', 'content': 'Click the green play button to see the robot move forward, turn 90 degrees, and move forward again.'},
                ],
                'challenge': 'Try adding more turns and movements to create a longer path for the robot.',
                'order': 0,
            }],
        })

        self._create_activity(book, lesson_3_3, {
            'code': '3.3.class.2',
            'title': 'Class Activity 5: Square Challenge',
            'activity_blocks': [{
                'type': 'class_activity',
                'title': 'Class Activity 5: Square Challenge',
                'introduction': 'Make the robot move in a square!',
                'steps': [
                    {'number': 1, 'title': 'Drive Forward', 'content': 'Drive forward 200 mm.'},
                    {'number': 2, 'title': 'Turn Right', 'content': 'Turn right 90 degrees.'},
                    {'number': 3, 'title': 'Repeat', 'content': 'Repeat 4 times.'},
                    {'number': 4, 'title': 'Watch', 'content': 'Watch the robot return to the start!'},
                ],
                'challenge': '',
                'order': 0,
            }],
        })

        self._create_activity(book, lesson_3_3, {
            'code': '3.3.home.1',
            'title': 'Home Activity 4: Maze Designer',
            'activity_blocks': [{
                'type': 'home_activity',
                'title': 'Home Activity 4: Maze Designer',
                'introduction': 'Make your own maze on paper. Then try to write blocks that help the robot get through it in VEXcode VR!',
                'steps': [],
                'challenge': '',
                'order': 0,
            }],
        })

        # =============================================
        # Lesson 3.4 - Testing Robot Movements
        # =============================================
        lesson_3_4 = self._create_lesson(book, chapter3, {
            'code': '3.4',
            'title': 'Testing Robot Movements',
            'content': '''<p>Once you've programmed your robot to move and turn, it's important to test and refine your code. Sometimes, the robot might not move exactly as you planned, and that's okay! You can always adjust the program and try again.</p>

<h3>Be a Robot Fixer!</h3>
<p>Being a good coder means testing your robot often!</p>''',
        })

        self._create_activity(book, lesson_3_4, {
            'code': '3.4.class.1',
            'title': 'Class Activity 6: Adjust and Test the Robot\'s Path',
            'activity_blocks': [{
                'type': 'class_activity',
                'title': 'Class Activity 6: Adjust and Test the Robot\'s Path',
                'introduction': 'Let\'s learn to adjust and test!',
                'steps': [
                    {'number': 1, 'title': 'Change the Distance', 'content': 'In your Drive Forward blocks, try changing the distance from 200mm to 300mm. This will make the robot move farther. Click on the number 200 and type 300 to change the distance.'},
                    {'number': 2, 'title': 'Change the Turn Angle', 'content': 'In your Turn Right block, change the angle from 90 degrees to 45 degrees. This will make the robot turn less sharply. Click on 90 degrees and type 45 to update the turn.'},
                    {'number': 3, 'title': 'Run the Program', 'content': 'Test the new movements by clicking the play button. See how the changes affect the robot\'s path.'},
                ],
                'challenge': '',
                'order': 0,
            }],
        })

        self._create_activity(book, lesson_3_4, {
            'code': '3.4.class.2',
            'title': 'Class Activity 7: Fix My Robot!',
            'activity_blocks': [{
                'type': 'class_activity',
                'title': 'Class Activity 7: Fix My Robot!',
                'introduction': 'Your teacher will give you a "broken" code. Find what\'s wrong and fix it so the robot moves in a square.',
                'steps': [],
                'challenge': '',
                'order': 0,
            }],
        })

        self._create_activity(book, lesson_3_4, {
            'code': '3.4.home.1',
            'title': 'Home Activity 5: Two Versions',
            'activity_blocks': [{
                'type': 'home_activity',
                'title': 'Home Activity 5: Two Versions',
                'introduction': 'Make two versions:',
                'steps': [
                    {'number': 1, 'title': 'Correct Version', 'content': 'One with correct turns'},
                    {'number': 2, 'title': 'Mistake Version', 'content': 'One with a mistake'},
                ],
                'challenge': 'Show someone the difference!',
                'order': 0,
            }],
        })

        # =============================================
        # Lesson 3.5 - Make a Robot Dance!
        # =============================================
        lesson_3_5 = self._create_lesson(book, chapter3, {
            'code': '3.5',
            'title': 'Make a Robot Dance!',
            'content': '''<p>Let's get creative and make your robot spin and zoom like it's dancing!</p>''',
        })

        self._create_activity(book, lesson_3_5, {
            'code': '3.5.class.1',
            'title': 'Class Activity 8: Robot Dance Party',
            'activity_blocks': [{
                'type': 'class_activity',
                'title': 'Class Activity 8: Robot Dance Party',
                'introduction': 'Let\'s make the robot dance!',
                'steps': [
                    {'number': 1, 'title': 'Add Moves', 'content': 'Add turns, drives, and short moves.'},
                    {'number': 2, 'title': 'Spin and Drive', 'content': 'Try Turn right 360 and Drive forward 100.'},
                    {'number': 3, 'title': 'Add Variety', 'content': 'Add pauses or repeats (if available).'},
                    {'number': 4, 'title': 'Watch', 'content': 'Watch the dance!'},
                ],
                'challenge': '',
                'order': 0,
            }],
        })

        self._create_activity(book, lesson_3_5, {
            'code': '3.5.home.1',
            'title': 'Home Activity 6: Music + Robot',
            'activity_blocks': [{
                'type': 'home_activity',
                'title': 'Home Activity 6: Music + Robot',
                'introduction': 'Play your favorite song and run your robot program. Dance with it!',
                'steps': [],
                'challenge': '',
                'order': 0,
            }],
        })

        # =============================================
        # Lesson 3.6 - Challenge Time!
        # =============================================
        lesson_3_6 = self._create_lesson(book, chapter3, {
            'code': '3.6',
            'title': 'Challenge Time!',
            'content': '''<p>Now that you know how to move, turn, and test, it's time for a mission!</p>''',
        })

        self._create_activity(book, lesson_3_6, {
            'code': '3.6.class.1',
            'title': 'Class Activity 9: Treasure Hunt',
            'activity_blocks': [{
                'type': 'class_activity',
                'title': 'Class Activity 9: Treasure Hunt',
                'introduction': 'Let\'s go on a treasure hunt!',
                'steps': [
                    {'number': 1, 'title': 'Use Grid Map', 'content': 'Use the Grid Map.'},
                    {'number': 2, 'title': 'Choose Treasure Square', 'content': 'Choose a "Treasure Square". Select one square as the Treasure Square.'},
                    {'number': 3, 'title': 'Program the Robot', 'content': 'Can your robot find the treasure? Program the Robot to move to the Treasure Square.'},
                ],
                'challenge': '',
                'order': 0,
            }],
        })

        self._create_activity(book, lesson_3_6, {
            'code': '3.6.home.1',
            'title': 'Home Activity 7: Robot to the Rescue!',
            'activity_blocks': [{
                'type': 'home_activity',
                'title': 'Home Activity 7: Robot to the Rescue!',
                'introduction': 'Complete this mission at home:',
                'steps': [
                    {'number': 1, 'title': 'Pick a Square', 'content': 'Pick a square on the map.'},
                    {'number': 2, 'title': 'Write Code', 'content': 'Write the code to get there.'},
                    {'number': 3, 'title': 'Share', 'content': 'Share your steps with a friend or family member.'},
                ],
                'challenge': '',
                'order': 0,
            }],
        })

        # =============================================
        # Lesson 3.7 - Chapter Wrap-Up
        # =============================================
        lesson_3_7 = self._create_lesson(book, chapter3, {
            'code': '3.7',
            'title': 'Chapter Wrap-Up',
            'content': '''<h2>Great job, Koder kids!</h2>

<p>You:</p>
<ul>
<li>Learned about VEXcode VR.</li>
<li>Made your robot move and turn.</li>
<li>Created paths, squares, and dances.</li>
<li>Fixed mistakes like a real coder.</li>
</ul>

<h3>Up Next</h3>
<p>Python programming!</p>

<p><strong>Fun Fact:</strong> Robots can help astronauts explore planets far, far away!</p>''',
        })

        self.stdout.write(self.style.SUCCESS(f'\nSuccessfully imported Chapter 3!'))

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
