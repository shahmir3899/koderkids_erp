"""
Import Book 1 Chapter 10: Exploring Electronics
Run: python manage.py import_book1_chapter10
"""
from django.core.management.base import BaseCommand
from books.models import Book, Topic


class Command(BaseCommand):
    help = 'Import Book 1 Chapter 10 content'

    def handle(self, *args, **options):
        book = self._get_book()
        if not book:
            return

        # Chapter 10
        chapter10, created = Topic.objects.update_or_create(
            book=book,
            code='10',
            defaults={
                'title': 'Exploring Electronics',
                'type': 'chapter',
                'parent': None,
                'content': '''<h2>Welcome to Electronics Fun!</h2>
<p>Get ready, Koder Kids, for an exciting journey into electronics! You'll use parts like bulbs and motors to build gadgets, just like coding a robot in VEXcode VR (Chapter 3). Let's light up and spin things up!</p>

<p><strong>Fun Fact:</strong> Electricity powers lights in Pakistani villages, just like your projects today!</p>

<p><strong>Teacher Tip:</strong> Ensure batteries are ready and supervise wire connections for safety.</p>''',
            }
        )
        self.stdout.write(f'{"Created" if created else "Updated"} Chapter 10: {chapter10.title}')

        # =============================================
        # Lesson 10.1 - What is inside Kit
        # =============================================
        lesson_10_1 = self._create_lesson(book, chapter10, {
            'code': '10.1',
            'title': 'What is inside Kit',
            'content': '''<p>Let us go through our kit and see what is inside.</p>

<table>
<tr><th>Part Name</th><th>Symbol for Paper</th></tr>
<tr><td>Bulb and Holder</td><td>Normal state</td></tr>
<tr><td>Fan motor and propeller</td><td>-</td></tr>
<tr><td>Switch Button</td><td>-</td></tr>
<tr><td>Battery Clips</td><td>+</td></tr>
<tr><td>Paper Pin</td><td>-</td></tr>
<tr><td>Wire pieces</td><td>-</td></tr>
<tr><td>Battery and Holder</td><td>-</td></tr>
</table>''',
        })

        # =============================================
        # Lesson 10.2 - Light System (Bulb and Holder)
        # =============================================
        lesson_10_2 = self._create_lesson(book, chapter10, {
            'code': '10.2',
            'title': 'Light System (Bulb and Holder)',
            'content': '''<p>A light bulb glows when electricity flows through it, like a star in a Scratch Jr story (Chapter 6)! A lamp holder keeps the bulb safe.</p>

<h3>What They Do:</h3>
<table>
<tr><th>Part</th><th>Function</th></tr>
<tr><td>Bulb</td><td>Lights up with power</td></tr>
<tr><td>Holder</td><td>Holds the bulb securely</td></tr>
</table>

<p><strong>Mini-Task:</strong> Hold the bulb and guess how it lights up.</p>''',
        })

        self._create_activity(book, lesson_10_2, {
            'code': '10.2.class.1',
            'title': 'Class Activity 1: Hold and Guess',
            'activity_blocks': [{
                'type': 'class_activity',
                'title': 'Class Activity 1: Hold and Guess',
                'introduction': 'Let\'s explore the bulb and holder!',
                'steps': [
                    {'number': 1, 'title': 'Pick Up', 'content': 'Pick up the bulb and holder.'},
                    {'number': 2, 'title': 'Guess', 'content': 'Guess how they work together (ask your teacher).'},
                    {'number': 3, 'title': 'Draw', 'content': 'Draw the bulb symbol on your page.'},
                ],
                'challenge': '',
                'order': 0,
            }],
        })

        self._create_activity(book, lesson_10_2, {
            'code': '10.2.home.1',
            'title': 'Home Activity 1: Bulb Drawing',
            'activity_blocks': [{
                'type': 'home_activity',
                'title': 'Home Activity 1: Bulb Drawing',
                'introduction': 'Draw and learn about bulbs!',
                'steps': [
                    {'number': 1, 'title': 'Draw', 'content': 'Draw a bulb and holder on a page at home.'},
                    {'number': 2, 'title': 'Add', 'content': 'Add an old fashioned lantern next to it!'},
                ],
                'challenge': '',
                'order': 0,
            }],
        })

        # =============================================
        # Lesson 10.3 - Power System (Battery and Wire)
        # =============================================
        lesson_10_3 = self._create_lesson(book, chapter10, {
            'code': '10.3',
            'title': 'Power System (Battery and Wire)',
            'content': '''<p>A battery gives power, like the brain in a computer (Chapter 1). Wires carry the power like roads!</p>

<h3>What They Do:</h3>
<ul>
<li><strong>Battery:</strong> Provides energy (traditional symbol: long line - short line).</li>
<li><strong>Wire:</strong> Connects parts (traditional symbol: straight line -).</li>
</ul>

<p><strong>Mini-Task:</strong> Touch the wire to the battery and feel if it's warm (ask a grown-up). Draw the battery symbol!</p>''',
        })

        self._create_activity(book, lesson_10_3, {
            'code': '10.3.class.1',
            'title': 'Class Activity 2: Feel the Power',
            'activity_blocks': [{
                'type': 'class_activity',
                'title': 'Class Activity 2: Feel the Power',
                'introduction': 'Let\'s explore batteries and wires!',
                'steps': [
                    {'number': 1, 'title': 'Hold', 'content': 'Hold the battery and wire (with teacher help).'},
                    {'number': 2, 'title': 'Connect', 'content': 'Connect the battery and bulb with the help of wires and clips.'},
                    {'number': 3, 'title': 'Observe', 'content': 'See if the bulb turns ON.'},
                ],
                'challenge': '',
                'order': 0,
            }],
        })

        self._create_activity(book, lesson_10_3, {
            'code': '10.3.home.1',
            'title': 'Home Activity 2: Wire Drawing',
            'activity_blocks': [{
                'type': 'home_activity',
                'title': 'Home Activity 2: Wire Drawing',
                'introduction': 'Draw the power system!',
                'steps': [
                    {'number': 1, 'title': 'Draw', 'content': 'Draw a battery and wire.'},
                    {'number': 2, 'title': 'Add Symbol', 'content': 'Add the wire symbol (-)!'},
                ],
                'challenge': '',
                'order': 0,
            }],
        })

        # =============================================
        # Lesson 10.4 - Motion System (Motor and Fan Blade)
        # =============================================
        lesson_10_4 = self._create_lesson(book, chapter10, {
            'code': '10.4',
            'title': 'Motion System (Motor and Fan Blade)',
            'content': '''<p>A motor spins when powered, like a VEXcode robot (Chapter 3)! A fan blade makes air move.</p>

<h3>What They Do:</h3>
<table>
<tr><th>Part</th><th>Function</th></tr>
<tr><td>Motor</td><td>Turns with electricity (traditional symbol: circle with M inside)</td></tr>
<tr><td>Fan Blade</td><td>Spins to cool things</td></tr>
</table>

<p><strong>Mini-Task:</strong> Spin the fan blade by hand and imagine it with power. Draw the motor symbol!</p>''',
        })

        self._create_activity(book, lesson_10_4, {
            'code': '10.4.class.1',
            'title': 'Class Activity 3: Spin Test',
            'activity_blocks': [{
                'type': 'class_activity',
                'title': 'Class Activity 3: Spin Test',
                'introduction': 'Let\'s explore motors and fan blades!',
                'steps': [
                    {'number': 1, 'title': 'Hold', 'content': 'Hold the motor and fan blade.'},
                    {'number': 2, 'title': 'Spin', 'content': 'Spin the blade by hand.'},
                    {'number': 3, 'title': 'Draw', 'content': 'Draw the motor symbol on your page.'},
                ],
                'challenge': '',
                'order': 0,
            }],
        })

        self._create_activity(book, lesson_10_4, {
            'code': '10.4.home.1',
            'title': 'Home Activity 3: Fan Art',
            'activity_blocks': [{
                'type': 'home_activity',
                'title': 'Home Activity 3: Fan Art',
                'introduction': 'Draw a creative motor design!',
                'steps': [
                    {'number': 1, 'title': 'Draw', 'content': 'Draw a motor with a fan blade.'},
                    {'number': 2, 'title': 'Add Design', 'content': 'Add a Pakistani fan design!'},
                ],
                'challenge': '',
                'order': 0,
            }],
        })

        # =============================================
        # Lesson 10.5 - Control System (Switchgear and Spring Clip)
        # =============================================
        lesson_10_5 = self._create_lesson(book, chapter10, {
            'code': '10.5',
            'title': 'Control System (Switchgear and Spring Clip)',
            'content': '''<p>A switch turns power on or off, like a Scratch Jr start button (Chapter 2)! Spring clips hold wires tight.</p>

<h3>What They Do:</h3>
<table>
<tr><th>Part</th><th>Function</th></tr>
<tr><td>Switchgear</td><td>Controls electricity (traditional symbol: 1-1-1 with a break)</td></tr>
<tr><td>Spring Clip</td><td>Grips wires (connector)</td></tr>
</table>

<p><strong>Mini-Task:</strong> Flip the switch and clip a wire with the spring clip. Draw the switch symbol!</p>''',
        })

        self._create_activity(book, lesson_10_5, {
            'code': '10.5.class.1',
            'title': 'Class Activity 4: Switch Play',
            'activity_blocks': [{
                'type': 'class_activity',
                'title': 'Class Activity 4: Switch Play',
                'introduction': 'Let\'s explore switches and clips!',
                'steps': [
                    {'number': 1, 'title': 'Flip', 'content': 'Flip the switch on and off.'},
                    {'number': 2, 'title': 'Clip', 'content': 'Clip a wire with the spring clip (ask teacher).'},
                    {'number': 3, 'title': 'Draw', 'content': 'Draw the switch symbol (Normal state and When activated or pressed).'},
                ],
                'challenge': '',
                'order': 0,
            }],
        })

        self._create_activity(book, lesson_10_5, {
            'code': '10.5.home.1',
            'title': 'Home Activity 4: Clip Craft',
            'activity_blocks': [{
                'type': 'home_activity',
                'title': 'Home Activity 4: Clip Craft',
                'introduction': 'Draw your control system!',
                'steps': [
                    {'number': 1, 'title': 'Draw', 'content': 'Draw a switch and spring clip.'},
                    {'number': 2, 'title': 'Add Design', 'content': 'Add a Pakistani kite string to your drawing!'},
                ],
                'challenge': '',
                'order': 0,
            }],
        })

        # =============================================
        # Lesson 10.6 - Extra Connector (Paper Clip)
        # =============================================
        lesson_10_6 = self._create_lesson(book, chapter10, {
            'code': '10.6',
            'title': 'Extra Connector (Paper Clip)',
            'content': '''<p>A paper clip can connect parts, like variables in Python (Chapter 4)!</p>

<h3>What It Does:</h3>
<p><strong>Paper Clip:</strong> Joins wires (no specific symbol, described as a U-shaped connector).</p>

<p><strong>Mini-Task:</strong> Bend a paper clip and imagine connecting wires. Draw a U shape for the paper clip!</p>''',
        })

        self._create_activity(book, lesson_10_6, {
            'code': '10.6.class.1',
            'title': 'Class Activity 5: Clip and Bend',
            'activity_blocks': [{
                'type': 'class_activity',
                'title': 'Class Activity 5: Clip and Bend',
                'introduction': 'Let\'s explore paper clips as connectors!',
                'steps': [
                    {'number': 1, 'title': 'Bend', 'content': 'Bend a paper clip into a U shape.'},
                    {'number': 2, 'title': 'Imagine', 'content': 'Imagine it connecting wires (ask teacher).'},
                    {'number': 3, 'title': 'Draw', 'content': 'Draw the U shape on your page.'},
                ],
                'challenge': '',
                'order': 0,
            }],
        })

        self._create_activity(book, lesson_10_6, {
            'code': '10.6.home.1',
            'title': 'Home Activity 5: Clip Design',
            'activity_blocks': [{
                'type': 'home_activity',
                'title': 'Home Activity 5: Clip Design',
                'introduction': 'Draw a creative connector!',
                'steps': [
                    {'number': 1, 'title': 'Draw', 'content': 'Draw a paper clip connecting two wires.'},
                    {'number': 2, 'title': 'Add Design', 'content': 'Add a Pakistani truck art pattern!'},
                ],
                'challenge': '',
                'order': 0,
            }],
        })

        # =============================================
        # Lesson 10.7 - Lighting a Bulb
        # =============================================
        lesson_10_7 = self._create_lesson(book, chapter10, {
            'code': '10.7',
            'title': 'Lighting a Bulb',
            'content': '''<p>Let's make a bulb light up, like creating art in Paint (Chapter 1)!</p>

<h3>Steps:</h3>
<ol>
<li><strong>STEP 1:</strong> Place the bulb in the holder.</li>
<li><strong>STEP 2:</strong> Connect wires from the holder to the battery (use spring clips).</li>
<li><strong>STEP 3:</strong> Watch it glow when connected!</li>
</ol>

<h3>A SIMPLE ELECTRIC CIRCUIT includes:</h3>
<ul>
<li>Electric battery</li>
<li>Light bulb</li>
<li>Electrical conductor</li>
<li>Switch (ON/OFF)</li>
</ul>''',
        })

        self._create_activity(book, lesson_10_7, {
            'code': '10.7.class.1',
            'title': 'Class Activity 6: Bulb Light',
            'activity_blocks': [{
                'type': 'class_activity',
                'title': 'Class Activity 6: Bulb Light',
                'introduction': 'Let\'s light up a bulb!',
                'steps': [
                    {'number': 1, 'title': 'Set Up', 'content': 'Set up the bulb, holder, wires, and battery with your teacher.'},
                    {'number': 2, 'title': 'Connect', 'content': 'Connect them and turn on the circuit.'},
                    {'number': 3, 'title': 'Celebrate', 'content': 'Cheer when the bulb lights up!'},
                ],
                'challenge': '',
                'order': 0,
            }],
        })

        self._create_activity(book, lesson_10_7, {
            'code': '10.7.home.1',
            'title': 'Home Activity 6: Home Glow',
            'activity_blocks': [{
                'type': 'home_activity',
                'title': 'Home Activity 6: Home Glow',
                'introduction': 'Light a bulb at home!',
                'steps': [
                    {'number': 1, 'title': 'Light', 'content': 'With a grown-up, light a bulb at home.'},
                    {'number': 2, 'title': 'Draw', 'content': 'Draw the circuit with symbols!'},
                ],
                'challenge': '',
                'order': 0,
            }],
        })

        # =============================================
        # Lesson 10.8 - Running a Motor
        # =============================================
        lesson_10_8 = self._create_lesson(book, chapter10, {
            'code': '10.8',
            'title': 'Running a Motor',
            'content': '''<p>Let's make a motor spin using electricity!</p>''',
        })

        self._create_activity(book, lesson_10_8, {
            'code': '10.8.class.1',
            'title': 'Class Activity 7: Motor Spin',
            'activity_blocks': [{
                'type': 'class_activity',
                'title': 'Class Activity 7: Motor Spin',
                'introduction': 'Let\'s make the motor spin!',
                'steps': [
                    {'number': 1, 'title': 'Set Up', 'content': 'Set up the motor with wires and battery.'},
                    {'number': 2, 'title': 'Connect', 'content': 'Connect the circuit with your teacher\'s help.'},
                    {'number': 3, 'title': 'Watch', 'content': 'Watch the motor spin!'},
                ],
                'challenge': '',
                'order': 0,
            }],
        })

        self._create_activity(book, lesson_10_8, {
            'code': '10.8.home.1',
            'title': 'Home Activity 7: Spin Fun',
            'activity_blocks': [{
                'type': 'home_activity',
                'title': 'Home Activity 7: Spin Fun',
                'introduction': 'Explore motors at home!',
                'steps': [
                    {'number': 1, 'title': 'Explore', 'content': 'With a grown-up, explore how motors work.'},
                    {'number': 2, 'title': 'Draw', 'content': 'Draw a motor circuit.'},
                ],
                'challenge': '',
                'order': 0,
            }],
        })

        # =============================================
        # Lesson 10.9 - Making a Switch Work
        # =============================================
        lesson_10_9 = self._create_lesson(book, chapter10, {
            'code': '10.9',
            'title': 'Making a Switch Work',
            'content': '''<p>Let's add a switch to control your circuit!</p>''',
        })

        self._create_activity(book, lesson_10_9, {
            'code': '10.9.class.1',
            'title': 'Class Activity 8: Switch Control',
            'activity_blocks': [{
                'type': 'class_activity',
                'title': 'Class Activity 8: Switch Control',
                'introduction': 'Let\'s add a switch to the circuit!',
                'steps': [
                    {'number': 1, 'title': 'Add Switch', 'content': 'Add a switch to your bulb circuit.'},
                    {'number': 2, 'title': 'Test', 'content': 'Turn the switch on and off.'},
                    {'number': 3, 'title': 'Observe', 'content': 'Watch how the switch controls the bulb!'},
                ],
                'challenge': '',
                'order': 0,
            }],
        })

        self._create_activity(book, lesson_10_9, {
            'code': '10.9.home.1',
            'title': 'Home Activity 8: Switch Play',
            'activity_blocks': [{
                'type': 'home_activity',
                'title': 'Home Activity 8: Switch Play',
                'introduction': 'Practice with switches!',
                'steps': [
                    {'number': 1, 'title': 'Find Switches', 'content': 'Find switches at home (light switches, etc.).'},
                    {'number': 2, 'title': 'Draw', 'content': 'Draw a circuit with a switch.'},
                ],
                'challenge': '',
                'order': 0,
            }],
        })

        # =============================================
        # Lesson 10.10 - Building a Simple Fan
        # =============================================
        lesson_10_10 = self._create_lesson(book, chapter10, {
            'code': '10.10',
            'title': 'Building a Simple Fan',
            'content': '''<p>Let's build a simple fan using a motor and fan blade!</p>''',
        })

        self._create_activity(book, lesson_10_10, {
            'code': '10.10.class.1',
            'title': 'Class Activity 9: Fan Build',
            'activity_blocks': [{
                'type': 'class_activity',
                'title': 'Class Activity 9: Fan Build',
                'introduction': 'Let\'s build a working fan!',
                'steps': [
                    {'number': 1, 'title': 'Attach Blade', 'content': 'Attach the fan blade to the motor.'},
                    {'number': 2, 'title': 'Connect', 'content': 'Connect the motor to the battery.'},
                    {'number': 3, 'title': 'Feel', 'content': 'Feel the breeze from your fan!'},
                ],
                'challenge': '',
                'order': 0,
            }],
        })

        self._create_activity(book, lesson_10_10, {
            'code': '10.10.home.1',
            'title': 'Home Activity 9: Fan Breeze',
            'activity_blocks': [{
                'type': 'home_activity',
                'title': 'Home Activity 9: Fan Breeze',
                'introduction': 'Explore fans at home!',
                'steps': [
                    {'number': 1, 'title': 'Explore', 'content': 'With a grown-up, explore how fans work at home.'},
                    {'number': 2, 'title': 'Draw', 'content': 'Draw your fan circuit design.'},
                ],
                'challenge': '',
                'order': 0,
            }],
        })

        # =============================================
        # Lesson 10.11 - Creating a Paper Clip Circuit
        # =============================================
        lesson_10_11 = self._create_lesson(book, chapter10, {
            'code': '10.11',
            'title': 'Creating a Paper Clip Circuit',
            'content': '''<p>Let's use paper clips to create a simple circuit!</p>''',
        })

        self._create_activity(book, lesson_10_11, {
            'code': '10.11.class.1',
            'title': 'Class Activity 10: Clip Circuit',
            'activity_blocks': [{
                'type': 'class_activity',
                'title': 'Class Activity 10: Clip Circuit',
                'introduction': 'Let\'s create a circuit using paper clips!',
                'steps': [
                    {'number': 1, 'title': 'Bend Clips', 'content': 'Bend paper clips to act as connectors.'},
                    {'number': 2, 'title': 'Connect', 'content': 'Use them to connect parts of your circuit.'},
                    {'number': 3, 'title': 'Test', 'content': 'Test if your circuit works!'},
                ],
                'challenge': '',
                'order': 0,
            }],
        })

        self._create_activity(book, lesson_10_11, {
            'code': '10.11.home.1',
            'title': 'Home Activity 10: Clip Challenge',
            'activity_blocks': [{
                'type': 'home_activity',
                'title': 'Home Activity 10: Clip Challenge',
                'introduction': 'Create your own clip circuit!',
                'steps': [
                    {'number': 1, 'title': 'Create', 'content': 'With a grown-up, create a paper clip circuit.'},
                    {'number': 2, 'title': 'Draw', 'content': 'Draw your circuit design.'},
                ],
                'challenge': '',
                'order': 0,
            }],
        })

        # =============================================
        # Lesson 10.12 - Chapter Wrap-Up
        # =============================================
        lesson_10_12 = self._create_lesson(book, chapter10, {
            'code': '10.12',
            'title': 'Chapter Wrap-Up',
            'content': '''<h2>Amazing work, Koder Kids!</h2>

<p>You explored electronics, built circuits, lit bulbs, spun motors, and created fans!</p>

<h3>What We Did:</h3>
<ul>
<li>Learned about electronic components.</li>
<li>Built simple circuits with bulbs, motors, and switches.</li>
<li>Created working fans and paper clip circuits.</li>
</ul>

<p><strong>Congratulations on completing Book 1!</strong></p>''',
        })

        self.stdout.write(self.style.SUCCESS(f'\nSuccessfully imported Chapter 10!'))

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
