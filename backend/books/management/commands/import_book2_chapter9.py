"""
Import Book 2 Chapter 9: Introduction to Arduino Basics
Run: python manage.py import_book2_chapter9
"""
from django.core.management.base import BaseCommand
from books.models import Book, Topic


class Command(BaseCommand):
    help = 'Import Book 2 Chapter 9 content'

    def handle(self, *args, **options):
        book = self._get_book()
        if not book:
            return

        self.stdout.write(f'Found book: {book.title} (ID: {book.id})')

        # Chapter 9
        chapter9, created = Topic.objects.update_or_create(
            book=book,
            code='9',
            defaults={
                'title': 'Introduction to Arduino Basics',
                'type': 'chapter',
                'parent': None,
                'content': '''<h2>Welcome to Arduino!</h2>
<p>Arduino is a tiny computer you can program to do cool things, like blinking lights or making sounds! In this chapter, you'll learn what Arduino is, set it up, and write your first program. It's like coding in Python (Chapter 5), but with real hardware!</p>

<h3>What is Arduino?</h3>
<p>A small board that controls electronics, like LEDs or sensors.</p>

<h3>Why Learn Arduino?</h3>
<p>Build robots, games, or smart gadgets!</p>

<h3>Activity Preview:</h3>
<p>You'll blink an LED today!</p>

<h3>Instructions:</h3>
<p>Ask an adult to help you set up the Arduino IDE.</p>''',
            }
        )
        self.stdout.write(f'{"Created" if created else "Updated"} Chapter 9')

        # Lesson 9.1
        self._create_lesson(book, chapter9, {
            'code': '9.1',
            'title': 'What is Arduino?',
            'content': '''<p>Arduino is a small computer board that talks to electronics! It has pins to connect LEDs, buttons, and sensors. You write code to tell it what to do, like blinking a light or playing music.</p>

<h3>Key Parts:</h3>
<ul>
<li>Board: The main computer (like Arduino Uno).</li>
<li>Pins: Connect wires and components.</li>
<li>USB Port: Connects to your computer for coding.</li>
</ul>

<p><strong>Fun Fact:</strong> Arduino is named after a bar in Italy where the inventors met!</p>

<h3>Activity Preview:</h3>
<p>Explore an Arduino board next.</p>''',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 1: Explore an Arduino Board',
                    'introduction': "Let's look at an Arduino board and learn its parts! You'll identify the key components.",
                    'steps': [
                        {'number': 1, 'title': 'Get Arduino', 'content': 'Get an Arduino Uno board from your teacher (or look at a picture).'},
                        {'number': 2, 'title': 'Find USB Port', 'content': 'Find the USB port - it connects to your computer.'},
                        {'number': 3, 'title': 'Find Digital Pins', 'content': 'Find the digital pins (numbered 0-13) - they connect LEDs.'},
                        {'number': 4, 'title': 'Find Power Pins', 'content': 'Find the power pins (5V, GND) - they give electricity.'},
                        {'number': 5, 'title': 'Draw Diagram', 'content': 'Draw a simple diagram of the board in your notebook.'},
                    ],
                    'challenge': 'Label the reset button on your diagram!',
                    'order': 0,
                },
                {
                    'type': 'home_activity',
                    'title': 'Home Activity 1',
                    'introduction': 'Draw an Arduino board and explain its parts to your family.',
                    'steps': [],
                    'order': 1,
                },
            ],
        })

        # Lesson 9.2
        self._create_lesson(book, chapter9, {
            'code': '9.2',
            'title': 'Setting Up the Arduino IDE',
            'content': '''<p>The Arduino IDE is a program where you write code for your Arduino, like Google Colab for Python (Chapter 5). You'll download it and connect your board to start coding!</p>

<h3>What's an IDE?</h3>
<p>A place to write and upload code to Arduino.</p>

<h3>Why Setup?</h3>
<p>Without the IDE, you can't talk to your Arduino!</p>

<h3>Activity Preview:</h3>
<p>You'll install the IDE and connect your board.</p>

<p><strong>Parent Tip:</strong> Help your child download the Arduino IDE safely!</p>''',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 2: Install and Connect Arduino IDE',
                    'introduction': "Let's set up the Arduino IDE and connect your board! You'll be ready to code in no time.",
                    'steps': [
                        {'number': 1, 'title': 'Open Website', 'content': 'Go to www.arduino.cc/en/software (with adult help).'},
                        {'number': 2, 'title': 'Download IDE', 'content': 'Download the Arduino IDE for your computer (Windows, Mac, or Linux).'},
                        {'number': 3, 'title': 'Install IDE', 'content': 'Install the IDE by following the instructions.'},
                        {'number': 4, 'title': 'Connect Arduino', 'content': 'Connect your Arduino Uno to the computer using a USB cable.'},
                        {'number': 5, 'title': 'Select Board', 'content': 'In the IDE, go to Tools > Board > Arduino Uno.'},
                        {'number': 6, 'title': 'Select Port', 'content': 'Go to Tools > Port and select the correct port (e.g., COM3).'},
                    ],
                    'challenge': 'Take a screenshot of your IDE with the board connected!',
                    'order': 0,
                },
                {
                    'type': 'home_activity',
                    'title': 'Home Activity 2',
                    'introduction': 'Practice opening the Arduino IDE and finding the Tools menu.',
                    'steps': [],
                    'order': 1,
                },
            ],
        })

        # Lesson 9.3
        self._create_lesson(book, chapter9, {
            'code': '9.3',
            'title': 'Your First Arduino Program: Blinking LED',
            'content': '''<p>Let's make an LED blink! You'll write a simple program (called a "sketch" in Arduino) to turn a light on and off. It's like a Python loop (Chapter 5), but controls real hardware!</p>

<h3>What's a Sketch?</h3>
<p>A program for Arduino, written in the IDE.</p>

<h3>Key Functions:</h3>
<ul>
<li>setup(): Runs once at the start.</li>
<li>loop(): Runs over and over forever.</li>
</ul>

<h3>Activity Preview:</h3>
<p>You'll blink the built-in LED next.</p>

<p><strong>DIY Idea:</strong> Try changing the blink speed!</p>''',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 3: Blink the Built-in LED',
                    'introduction': "Let's write your first Arduino sketch to blink the built-in LED on your board!",
                    'steps': [
                        {'number': 1, 'title': 'Open Arduino IDE', 'content': 'Open the Arduino IDE on your computer.'},
                        {'number': 2, 'title': 'Open Blink Example', 'content': 'Go to File > Examples > 01.Basics > Blink.'},
                        {'number': 3, 'title': 'Read Code', 'content': 'Read the code - it uses digitalWrite() to turn the LED on/off.'},
                        {'number': 4, 'title': 'Upload Sketch', 'content': 'Click the Upload button (right arrow) to send the code to Arduino.'},
                        {'number': 5, 'title': 'Watch LED', 'content': 'Watch the built-in LED (near pin 13) blink on and off!'},
                        {'number': 6, 'title': 'Change Speed', 'content': 'Change delay(1000) to delay(500) and upload again - it blinks faster!'},
                    ],
                    'challenge': 'Make the LED blink in a pattern: fast, fast, slow!',
                    'order': 0,
                },
                {
                    'type': 'home_activity',
                    'title': 'Home Activity 3',
                    'introduction': 'Experiment with different delay values and record what happens.',
                    'steps': [],
                    'order': 1,
                },
            ],
        })

        # Lesson 9.4
        self._create_lesson(book, chapter9, {
            'code': '9.4',
            'title': 'Adding External Components',
            'content': '''<p>Now let's connect an external LED to your Arduino! You'll use a breadboard and wires to build a circuit. It's like building with LEGO, but for electronics!</p>

<h3>What's a Breadboard?</h3>
<p>A board with holes to connect wires and components without soldering.</p>

<h3>What You Need:</h3>
<ul>
<li>Arduino Uno</li>
<li>Breadboard</li>
<li>LED (any color)</li>
<li>220 ohm resistor</li>
<li>Jumper wires</li>
</ul>

<h3>Activity Preview:</h3>
<p>You'll build a circuit and blink an external LED.</p>

<p><strong>Safety Tip:</strong> Always disconnect the USB before changing wires!</p>''',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 4: Blink an External LED',
                    'introduction': "Let's build a circuit and blink an external LED! You'll connect components on a breadboard.",
                    'steps': [
                        {'number': 1, 'title': 'Disconnect USB', 'content': 'Disconnect the USB cable from your Arduino.'},
                        {'number': 2, 'title': 'Place LED', 'content': 'Place the LED on the breadboard - long leg is positive (+).'},
                        {'number': 3, 'title': 'Add Resistor', 'content': 'Connect the resistor from the short leg of LED to the GND rail.'},
                        {'number': 4, 'title': 'Connect Positive', 'content': 'Connect a wire from the long leg of LED to pin 9 on Arduino.'},
                        {'number': 5, 'title': 'Connect Ground', 'content': 'Connect a wire from GND rail to GND on Arduino.'},
                        {'number': 6, 'title': 'Modify Code', 'content': 'Change the Blink code: replace LED_BUILTIN with 9.'},
                        {'number': 7, 'title': 'Upload and Test', 'content': 'Connect USB, upload, and watch your external LED blink!'},
                    ],
                    'challenge': 'Add a second LED on pin 10 and make them blink alternately!',
                    'order': 0,
                },
                {
                    'type': 'home_activity',
                    'title': 'Home Activity 4',
                    'introduction': 'Draw your circuit diagram and explain it to your family.',
                    'steps': [],
                    'order': 1,
                },
            ],
        })

        # Chapter 9 Summary
        self._create_lesson(book, chapter9, {
            'code': '9.S',
            'title': 'Chapter 9 Summary and Final Activity',
            'content': '''<h2>You're an Arduino Explorer! You:</h2>

<p><strong>9.1:</strong> Learned what Arduino is and explored the board.</p>
<p><strong>9.2:</strong> Set up the Arduino IDE and connected your board.</p>
<p><strong>9.3:</strong> Wrote your first sketch to blink the built-in LED.</p>
<p><strong>9.4:</strong> Built a circuit with an external LED on a breadboard.</p>

<h3>Skills You Learned:</h3>
<ul>
<li>Identifying Arduino board components</li>
<li>Installing and using the Arduino IDE</li>
<li>Writing and uploading sketches</li>
<li>Understanding setup() and loop() functions</li>
<li>Using digitalWrite() and delay()</li>
<li>Building circuits on a breadboard</li>
<li>Connecting external LEDs with resistors</li>
</ul>

<h3>What's Next?</h3>
<p>Combine Arduino with AI audio (Chapter 10) to create amazing projects!</p>''',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Final Activity: Traffic Light Project',
                    'introduction': "Let's build a mini traffic light with three LEDs! You'll use everything you learned.",
                    'steps': [
                        {'number': 1, 'title': 'Setup Circuit', 'content': 'Connect three LEDs (red, yellow, green) to pins 9, 10, 11.'},
                        {'number': 2, 'title': 'Add Resistors', 'content': 'Add a 220 ohm resistor to each LED.'},
                        {'number': 3, 'title': 'Write Code', 'content': 'Write code to turn on green for 5 seconds, then yellow for 2 seconds, then red for 5 seconds.'},
                        {'number': 4, 'title': 'Upload and Test', 'content': 'Upload and watch your traffic light work!'},
                    ],
                    'challenge': '',
                    'order': 0,
                },
                {
                    'type': 'home_activity',
                    'title': 'Final Home Activity',
                    'introduction': 'Create a blinking pattern that spells your name in Morse code!',
                    'steps': [],
                    'order': 1,
                },
                {
                    'type': 'challenge',
                    'title': 'Homework',
                    'introduction': 'Research one Arduino project you would like to build and present it to your class.',
                    'steps': [],
                    'order': 2,
                },
            ],
        })

        self.stdout.write(self.style.SUCCESS('\nSuccessfully imported Chapter 9!'))

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
