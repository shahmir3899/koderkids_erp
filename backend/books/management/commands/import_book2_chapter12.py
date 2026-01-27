"""
Import Book 2 Chapter 12: Getting Started with M3D GO Robotics
Run: python manage.py import_book2_chapter12
"""
from django.core.management.base import BaseCommand
from books.models import Book, Topic


class Command(BaseCommand):
    help = 'Import Book 2 Chapter 12 content'

    def handle(self, *args, **options):
        book = self._get_book()
        if not book:
            return

        self.stdout.write(f'Found book: {book.title} (ID: {book.id})')

        # Chapter 12
        chapter12, created = Topic.objects.update_or_create(
            book=book,
            code='12',
            defaults={
                'title': 'Getting Started with M3D GO Robotics',
                'type': 'chapter',
                'parent': None,
                'content': '''<h2>Welcome to M3D GO Adventures!</h2>
<p>The M3D GO robotics kit provides an accessible platform for exploring fundamental concepts in robotics and coding. This chapter focuses on initial setup procedures, followed by introductory activities to facilitate practical engagement. By understanding the kit's components and establishing a reliable connection, learners can transition to basic exploratory tasks, such as free robot movements. This foundational knowledge supports subsequent chapters on advanced controls.</p>

<h3>What is M3D GO?</h3>
<p>A comprehensive robotics kit including a programmable robot, attachments, and integration tools for educational coding.</p>

<h3>Why Learn It?</h3>
<p>It develops skills in technology and problem-solving, applicable to real-world scenarios like automated systems in Pakistani industries.</p>

<h3>Chapter Preview:</h3>
<p>The content covers kit exploration, connection setup, and introductory free movement activities. Instructions: Ensure adult supervision during unpacking to maintain safety.</p>''',
            }
        )
        self.stdout.write(f'{"Created" if created else "Updated"} Chapter 12')

        # Lesson 12.1
        self._create_lesson(book, chapter12, {
            'code': '12.1',
            'title': 'Exploring the M3D GO Kit',
            'content': '''<p>The M3D GO kit comprises the core robot, charger, and various attachments designed for plug-and-play functionality. These include the OLED screen for displays, distance and line sensors for detection, and servo motor with extensions such as the dumper, pen holder, dozer, forklift, and Lego adapter. Familiarity with these elements is essential prior to setup, as attachments must be connected before powering on the robot to ensure accurate detection. This section prepares users for systematic assembly.</p>

<h3>Why Explore Attachments?</h3>
<p>Each component extends the robot's capabilities, enabling diverse applications from display outputs to physical interactions.</p>

<h3>Key Tips:</h3>
<ul>
<li>Handle attachments carefully to avoid connector damage; verify compatibility with designated ports.</li>
</ul>

<p><strong>Fun Fact:</strong> Similar robotics kits are utilized in Pakistani STEM programs to promote innovation in fields like agriculture and education.</p>

<h3>Class Activity Preview:</h3>
<p>The following activity focuses on practical identification and attachment.</p>''',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 1: Unpack, Identify, and Attach Kit Parts',
                    'introduction': 'This activity emphasizes the initial setup phase by guiding users through unpacking and attachment, ensuring a solid foundation for subsequent operations.',
                    'steps': [
                        {'number': 1, 'title': 'Unpack Kit', 'content': 'Carefully open the M3D GO kit and organize all components: the robot base, charger, LED screen, sensors, and servo motor attachments.'},
                        {'number': 2, 'title': 'Identify Parts', 'content': "Identify each part; for example, note the LED screen's display function and the distance sensor's measurement role."},
                        {'number': 3, 'title': 'Attach Component', 'content': 'Select one attachment, such as the LED screen, and connect it to the top port on the robot.'},
                        {'number': 4, 'title': 'Power On', 'content': 'Press the side button to power on the robot; observe the red blinking light.'},
                    ],
                    'challenge': '',
                    'order': 0,
                },
                {
                    'type': 'home_activity',
                    'title': 'Home Activity 1: Practice Kit Identification',
                    'introduction': 'At home, review the unpacked kit and attach a different component, such as the line sensor. Power on the robot and note any visual indicators. Create a diagram labeling at least five parts and their functions. Kit Setup Extensions: If connectivity issues arise during home practice, refer to basic power checks, such as ensuring the charger is functional. This builds confidence for classroom progression.',
                    'steps': [],
                    'order': 1,
                },
            ],
        })

        # Lesson 12.2
        self._create_lesson(book, chapter12, {
            'code': '12.2',
            'title': 'Setting Up and Connecting the Robot',
            'content': '''<p>Establishing a connection via Bluetooth and the Scratch platform is critical for operational control. This section details the process, ensuring users can verify setup before advancing to activities.</p>

<h3>Why Set Up Properly?</h3>
<p>A stable connection enables reliable command execution and prevents interruptions in learning.</p>

<h3>Key Tips:</h3>
<p>Use a compatible browser and ensure the robot is in pairing mode, indicated by slow blinking.</p>

<p><strong>Fun Fact:</strong> Bluetooth technology, essential for such connections, draws from historical unification efforts, paralleling collaborative STEM initiatives in Pakistan.</p>

<h3>Activity Preview:</h3>
<p>The activity centers on completing and verifying the connection.</p>''',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 2: Connect and Verify Your Robot Setup',
                    'introduction': 'This activity guides you through connecting your M3D GO robot to the Scratch platform via Bluetooth.',
                    'steps': [
                        {'number': 1, 'title': 'Open Browser', 'content': 'With the robot powered on and in pairing mode, open a web browser and navigate to https://scratchmarkhor3d.com/.'},
                        {'number': 2, 'title': 'Access Extensions', 'content': 'Access the extensions menu via the bottom-left icon and select the M3D GO extension.'},
                        {'number': 3, 'title': 'Pair Robot', 'content': "In the pairing dialog, choose the robot's name and confirm the connection; observe the success message."},
                        {'number': 4, 'title': 'Verify Connection', 'content': 'If the dialog does not appear, manually connect via the M3D GO blocks section, ensuring the button turns green.'},
                    ],
                    'challenge': "Confirm setup by checking for the robot's name in the interface.",
                    'order': 0,
                },
                {
                    'type': 'home_activity',
                    'title': 'Home Activity 2: Reconnect and Verify',
                    'introduction': 'Replicate the connection process at home, powering on the robot and pairing via Scratch. Note the time taken and any variations in indicators. Practice disconnecting and reconnecting to build familiarity. Connection Verification Practice: Use the "M3D GO is Connected" block to confirm status; this ensures readiness for exploratory tasks.',
                    'steps': [],
                    'order': 1,
                },
            ],
        })

        # Lesson 12.3
        self._create_lesson(book, chapter12, {
            'code': '12.3',
            'title': 'Introduction to Basic Robot Activities',
            'content': '''<p>With setup complete, this section introduces fundamental activities, such as free movements using controls, to demonstrate immediate application.</p>

<h3>Why Start with Basics?</h3>
<p>It allows users to experience robot responsiveness, fostering motivation for advanced topics.</p>

<h3>Key Tips:</h3>
<p>Connect an online photo album to a friend's sharing app.</p>

<p><strong>Fun Fact:</strong> Basic controls in robotics mirror those used in Pakistani educational tools for early STEM exposure.</p>

<h3>Class Activity Preview:</h3>
<p>The activity involves guided free movements.</p>''',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 3: Free Robot Movements and Exploration',
                    'introduction': 'This activity lets you control your robot using arrow keys for basic movements.',
                    'steps': [
                        {'number': 1, 'title': 'Load Project', 'content': 'With the robot connected, upload the M3D GO Basic Controls.sb3 file to your project using File Menu → Load from Computer.'},
                        {'number': 2, 'title': 'Use Arrow Keys', 'content': 'Experiment with arrow keys for directional control: up for forward, left/right for turns, down for backward.'},
                        {'number': 3, 'title': 'Navigate', 'content': 'Navigate the robot in an open area, creating simple paths like straight lines or gentle curves.'},
                        {'number': 4, 'title': 'Observe Response', 'content': "Observe and note the robot's response to commands, adjusting for smoother operation."},
                    ],
                    'challenge': 'Guide the robot around a marked point without collisions.',
                    'order': 0,
                },
                {
                    'type': 'home_activity',
                    'title': 'Home Activity 3: Customize Free Movements',
                    'introduction': 'At home, reconnect the robot and use keys to create a custom path, such as a figure-eight pattern. Document the sequence of directions used and any observations on responsiveness. Movement Customization: Experiment with varying durations for each direction to refine control.',
                    'steps': [],
                    'order': 1,
                },
            ],
        })

        # Chapter 12 Summary
        self._create_lesson(book, chapter12, {
            'code': '12.S',
            'title': 'Chapter 12 Summary and Final Home Activity',
            'content': '''<h2>Chapter 12 Summary</h2>
<p>This chapter has equipped users with essential setup knowledge and initial hands-on experience. You have explored the kit, established connections, and engaged in basic free movements.</p>

<p>Award yourself a "Setup Explorer!" badge for mastering these foundations.</p>

<h3>Skills You Learned:</h3>
<ul>
<li>Identifying M3D GO kit components and their functions</li>
<li>Connecting attachments properly before powering on</li>
<li>Setting up Bluetooth connection with Scratch platform</li>
<li>Verifying connection status using M3D GO blocks</li>
<li>Controlling robot movement with arrow keys</li>
<li>Creating simple navigation paths</li>
</ul>

<h3>Chapter Review:</h3>
<p>Reflect on kit components, connection steps, and free movement experiences; address potential glitches like unresponsive controls by verifying Bluetooth status.</p>

<h3>Integrated Basic Troubleshooting:</h3>
<p>If movements falter, recheck the connection using the green indicator and test with a single command.</p>''',
            'activity_blocks': [
                {
                    'type': 'home_activity',
                    'title': 'Final Home Activity: Combined Setup and Movement Review',
                    'introduction': 'Reverify your setup by connecting the robot, then perform a free movement sequence around a home object. Draw the path and note any adjustments made. Submit your drawing for class discussion.',
                    'steps': [],
                    'order': 0,
                },
            ],
        })

        self.stdout.write(self.style.SUCCESS('\nSuccessfully imported Chapter 12!'))

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
