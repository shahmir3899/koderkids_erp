"""
Import Book 2 Chapter 4: VEXcode VR - Exploring Obstacle Courses
Run: python manage.py import_book2_chapter4
"""
from django.core.management.base import BaseCommand
from books.models import Book, Topic


class Command(BaseCommand):
    help = 'Import Book 2 Chapter 4 content'

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

        # Chapter 4
        chapter4, created = Topic.objects.update_or_create(
            book=book,
            code='4',
            defaults={
                'title': 'VEXcode VR: Exploring Obstacle Courses',
                'type': 'chapter',
                'parent': None,
                'content': '''<h2>Welcome to VEXcode VR!</h2>
<p>VEXcode VR lets you code virtual robots to explore mazes! In this chapter, you'll program robots to move, loop actions, use sensors, and complete challenges, like robot games in Tynker (Chapter 9). It's like being a robot explorer!</p>

<h3>What's VEXcode VR?</h3>
<p>A free website to code robots in virtual worlds.</p>

<h3>Why Code Robots?</h3>
<p>Learn problem-solving and have fun!</p>

<h3>Chapter Preview:</h3>
<p>You'll navigate courses, use loops, avoid obstacles, and build a challenge.</p>

<h3>Instructions:</h3>
<p>Ask an adult to open vr.vex.com.</p>''',
            }
        )
        self.stdout.write(f'{"Created" if created else "Updated"} Chapter 4')

        # Lesson 4.1: Navigating an Obstacle Course
        self._create_lesson(book, chapter4, {
            'code': '4.1',
            'title': 'Navigating an Obstacle Course',
            'content': '''<p>Robots can follow paths in VEXcode VR, like avoiding walls in a maze. You'll give commands to move your robot.</p>

<h3>Why Navigate?</h3>
<p>Teaches robots to make decisions, like in real life.</p>

<h3>Key Tip:</h3>
<p>Use Drive and Turn blocks carefully.</p>

<p><strong>Fun Fact:</strong> VEXcode VR is used in schools for robotics competitions!</p>

<h3>Class Activity Preview:</h3>
<p>You'll program a robot path next.</p>''',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 1: Program a Robot Path',
                    'introduction': "Let's code a robot to navigate a maze! You'll use Motion blocks to create a simple path.",
                    'steps': [
                        {'number': 1, 'title': 'Open VEXcode VR', 'content': 'Open vr.vex.com and click "Playground" > "Wall Maze."'},
                        {'number': 2, 'title': 'Add Drive Forward', 'content': 'Drag "Drive Forward for 200mm" (Motion) to the coding area.'},
                        {'number': 3, 'title': 'Test Your Code', 'content': 'Run the program by clicking the play button!'},
                        {'number': 4, 'title': 'Add Turn Block', 'content': 'Add "Turn Left for 90 degrees" (Motion) after Drive Forward.'},
                        {'number': 5, 'title': 'Build the Path', 'content': 'Add Move Left for 90 degree, Move Right for 90 degree and Move Forward Block to move the robot. Test and adjust the distance to avoid walls.'},
                        {'number': 6, 'title': 'Complete the Maze', 'content': 'Complete till End Point. Save your code as a screenshot. Use Snipping tool for saving screenshot. We will use it in Google Drive (Chapter 7).'},
                    ],
                    'challenge': 'Make the robot point 1, 2 and 3 instead of finish point.',
                    'order': 0,
                },
                {
                    'type': 'home_activity',
                    'title': 'Home Activity 1',
                    'introduction': 'Program a robot to move in a straight line in a new playground.',
                    'steps': [],
                    'order': 1,
                },
            ],
        })

        # Lesson 4.2: Using Loops to Repeat Actions
        self._create_lesson(book, chapter4, {
            'code': '4.2',
            'title': 'Using Loops to Repeat Actions',
            'content': '''<p>Loops repeat code to make it efficient, like repeating moves in Scratch (Chapter 3). You'll use loops to shorten your robot's path.</p>

<h3>What's a Loop?</h3>
<p>A block that repeats actions, e.g. "repeat 4 times."</p>

<h3>Why Loops?</h3>
<p>Save time for complex paths.</p>

<h3>Class Activity Preview:</h3>
<p>You'll loop a robot movement next.</p>

<p><strong>Parent Tip:</strong> Count the repeats with your child!</p>''',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 2: Loop a Robot Movement',
                    'introduction': "Let's make your robot repeat actions! You'll use a loop to create a square path in the maze.",
                    'steps': [
                        {'number': 1, 'title': 'Select Grid Maze', 'content': 'Open vr.vex.com and select "Grid Maze" from the Playground options.'},
                        {'number': 2, 'title': 'Add Repeat Block', 'content': 'Drag the "Repeat Block" from (Logic - Control) to the coding area.'},
                        {'number': 3, 'title': 'Add Movement Inside Loop', 'content': 'Inside the loop, add "Drive Forward for 200 mm" and "Turn Right 90 degrees" from Drivetrain category.'},
                        {'number': 4, 'title': 'Set Up Drawing', 'content': 'Before the loop from Drawing category add the following: "move pen down" to start drawing, "set pen color to black" for the line color, "set pen width to thin" for the line thickness.'},
                        {'number': 5, 'title': 'Set Loop Count', 'content': 'Set the loop to "4 times" and click play - the robot draws a square! Increase the distance, See moving in a bigger square.'},
                        {'number': 6, 'title': 'Save Your Work', 'content': 'Save your code as a screenshot. Use Snipping tool for saving screenshot. We will use it in Google Drive (Chapter 7).'},
                    ],
                    'challenge': 'Change the loop to "3 times" for a triangle path.',
                    'order': 0,
                },
                {
                    'type': 'home_activity',
                    'title': 'Home Activity 2',
                    'introduction': 'Use a loop to make the robot turn in a circle.',
                    'steps': [],
                    'order': 1,
                },
            ],
        })

        # Lesson 4.3: Using Sensors to Avoid Obstacles
        self._create_lesson(book, chapter4, {
            'code': '4.3',
            'title': 'Using Sensors to Avoid Obstacles',
            'content': '''<p>Sensors let robots "see" obstacles, like eyes! You'll use sensor blocks to make your robot turn when it detects something, like in Tynker (Chapter 9).</p>

<h3>What's a Sensor?</h3>
<p>A tool to detect walls or objects, e.g. Distance Sensor.</p>

<h3>Why Sensors?</h3>
<p>Help robots change paths automatically.</p>

<h3>Class Activity Preview:</h3>
<p>You'll code sensor avoidance next.</p>

<p><strong>DIY Idea:</strong> Pretend to be a robot avoiding toys at home!</p>''',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 3: Avoid Obstacles with Sensors',
                    'introduction': "Let's make a smart robot! You'll use the Front Distance sensor from the Sensing category to measure how close obstacles are and help the robot turn to avoid them in the maze. The Front Distance sensor gives a number in millimeters (mm) that shows the distance, so you can set a rule like \"turn if closer than 50mm.\"",
                    'steps': [
                        {'number': 1, 'title': 'Select Wall Maze', 'content': 'Open vr.vex.com and select "Wall Maze" from the Playground options.'},
                        {'number': 2, 'title': 'Add Forever Loop', 'content': 'Drag a "forever" loop (from the Logic category) to the coding area to keep the robot moving continuously.'},
                        {'number': 3, 'title': 'Add Small Movement', 'content': 'Inside the loop, add "Drive Forward for 50mm" (from the Drivetrain category) so the robot advances in small steps to allow time for sensing.'},
                        {'number': 4, 'title': 'Add Condition Block', 'content': 'After the drive block, add an "if then" block (Logic category). On empty coding area: Drag the "Front Distance in mm" block (Sensing - Distance category). This is a round block that measures how far an object is. Drag the "<" comparison operator (from the Operators category under Logic - Math). This creates a diamond-shaped condition to check if the distance is less than a number.'},
                        {'number': 5, 'title': 'Build the Condition', 'content': 'Combine both blocks into one: Place "Front Distance in mm" on the left side of diamond, use the "<" operator in the middle, set the right side to "50" (see image). This checks if the obstacle is closer than 50mm.'},
                        {'number': 6, 'title': 'Add Turn Action', 'content': 'Drag your new combined condition block directly into the diamond slot of the "if then" block. Inside the "if then" block (from Logic), add "Turn Left for 90 degrees" (from the Drivetrain category) to make the robot change direction when an obstacle is closer than 50mm.'},
                        {'number': 7, 'title': 'Test Your Code', 'content': 'Run the code. Robot will now avoid walls. It will move to left when a Wall is detected at 50mm.'},
                        {'number': 8, 'title': 'Experiment', 'content': 'Change the distance from 50mm to 10mm, 20mm, 70mm and 100mm. What difference do you see.'},
                    ],
                    'challenge': 'Use other Playground for same code.',
                    'order': 0,
                },
            ],
        })

        # Lesson 4.4: Creating a Robot Challenge
        self._create_lesson(book, chapter4, {
            'code': '4.4',
            'title': 'Creating a Robot Challenge',
            'content': '''<p>Combine your skills for a full challenge! You'll program a robot to complete a maze, using loops and sensors, like a Pakistani adventure quest.</p>

<h3>What's a Challenge?</h3>
<p>A complete program to solve a puzzle.</p>

<h3>Example:</h3>
<p>Navigate a maze to the finish!</p>

<h3>Class Activity Preview:</h3>
<p>You'll code a maze challenge next.</p>

<p><strong>Parent Tip:</strong> Cheer your child as the robot wins!</p>''',
            'activity_blocks': [],
        })

        # Lesson 4.5: Code a Maze Challenge
        self._create_lesson(book, chapter4, {
            'code': '4.5',
            'title': 'Code a Maze Challenge',
            'content': '''<p>Let's build a robot to complete the maze! You'll use Motion, loops, and sensors for a winning path.</p>''',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 4: Complete a Maze Challenge',
                    'introduction': "Put everything together! Use motion blocks, loops, and sensors to navigate the robot through the maze to the finish.",
                    'steps': [
                        {'number': 1, 'title': 'Open Wall Maze', 'content': 'Open vr.vex.com and select "Wall Maze."'},
                        {'number': 2, 'title': 'Plan Your Path', 'content': 'Plan your path: Add "Drive Forward" and "Turn" blocks for turns.'},
                        {'number': 3, 'title': 'Add Loops', 'content': 'Add a loop for repeated moves (e.g., "repeat 3 times").'},
                        {'number': 4, 'title': 'Add Sensors', 'content': 'Insert sensor blocks to avoid walls (e.g., "if close, turn").'},
                        {'number': 5, 'title': 'Test and Debug', 'content': 'Run your code and watch the robot. If it hits a wall, adjust the distances or add more sensor checks.'},
                        {'number': 6, 'title': 'Complete the Challenge', 'content': 'Keep improving until your robot reaches the finish point!'},
                    ],
                    'challenge': 'Try to complete the maze in the fewest blocks possible!',
                    'order': 0,
                },
            ],
        })

        # Chapter 4 Summary
        self._create_lesson(book, chapter4, {
            'code': '4.S',
            'title': 'Chapter 4 Summary and Final Home Activity',
            'content': '''<h2>You're a Robot Programmer! You:</h2>

<p><strong>4.1:</strong> Navigated an obstacle course with motion blocks.</p>
<p><strong>4.2:</strong> Used loops to repeat robot movements efficiently.</p>
<p><strong>4.3:</strong> Added sensors to avoid obstacles automatically.</p>
<p><strong>4.4:</strong> Learned about robot challenges.</p>
<p><strong>4.5:</strong> Completed a full maze challenge!</p>

<h3>Skills You Learned:</h3>
<ul>
<li>Drive Forward and Turn blocks for movement</li>
<li>Repeat/Loop blocks for efficiency</li>
<li>Distance sensors for obstacle detection</li>
<li>If-then conditions for smart decisions</li>
<li>Combining skills for complex challenges</li>
</ul>''',
            'activity_blocks': [
                {
                    'type': 'home_activity',
                    'title': 'Home Activity 3',
                    'introduction': 'Create your own maze challenge and share it with a friend or family member!',
                    'steps': [],
                    'order': 0,
                },
                {
                    'type': 'challenge',
                    'title': 'Homework',
                    'introduction': 'Practice coding different paths in VEXcode VR playgrounds. Try the "Dynamic Wall Maze" for an extra challenge!',
                    'steps': [],
                    'order': 1,
                },
            ],
        })

        self.stdout.write(self.style.SUCCESS(f'\nSuccessfully imported Chapter 4!'))

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
