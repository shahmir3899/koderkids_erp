"""
Import Book 2 Chapter 2: Teaching AI with Google Teachable Machine
Run: python manage.py import_book2_chapter2
"""
from django.core.management.base import BaseCommand
from books.models import Book, Topic


class Command(BaseCommand):
    help = 'Import Book 2 Chapter 2 content'

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

        # Chapter 2
        chapter2, created = Topic.objects.update_or_create(
            book=book,
            code='2',
            defaults={
                'title': 'Teaching AI with Google Teachable Machine',
                'type': 'chapter',
                'parent': None,
                'content': '''<h2>Welcome to AI Magic!</h2>
<p>Get ready to meet Artificial Intelligence (AI)!</p>
<p>In Book 1, you learned how to code simple games. Now, you'll learn how to teach computers to be smart using a tool called Google Teachable Machine. You'll teach machine to recognize things, sounds, or even your movements, just like a smart robot!</p>

<h3>What is AI?</h3>
<p>It's like making computers smart so they can learn and do amazing things, like recognize faces or understand your voice.</p>

<h3>Why Learn AI?</h3>
<p>Create exciting projects, like a festival story!</p>

<h3>Chapter Preview:</h3>
<p>You'll collect examples, train AI, try different types of AI, and plan your own AI project.</p>

<h3>Instructions:</h3>
<p>Ask an adult to open Google Teachable Machine in a web browser on your computer. (Search for "Google Teachable Machine").</p>''',
            }
        )
        self.stdout.write(f'{"Created" if created else "Updated"} Chapter 2')

        # Lesson 2.1
        self._create_lesson(book, chapter2, {
            'code': '2.1',
            'title': 'Understanding How AI "Learns"',
            'content': '''<p>Great AI models learn from good examples! Imagine teaching a new trick to a pet - you show them what to do clearly. AI works similarly: you give it many examples so it can learn patterns. We call these examples "data." The better your examples, the smarter your AI will be, like preparing all the right ingredients for a delicious Pakistani dish! Good examples help AI understand your ideas.</p>

<p>Great slides look neat and professional! You'll customize layouts, add colors, and choose fonts to make your slides pop, like a poster for a festival. Good design helps people understand your ideas.</p>

<h3>Why Focus on Examples?</h3>
<p>It makes your AI smart and accurate.</p>

<h3>Key Tips:</h3>
<p>Use clear, different examples for what you want the AI to learn.</p>

<p><strong>Fun Fact:</strong> AI helps recommend videos or songs you might like online!</p>

<h3>Class Activity Preview:</h3>
<p>You'll collect examples for AI next.</p>''',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 1: Collect Examples for AI',
                    'introduction': "Let's teach our AI to recognize something! You'll collect different examples to help your AI understand what you want it to learn, just like teaching it new words.",
                    'steps': [
                        {'number': 1, 'title': 'Open Teachable Machine', 'content': 'In your web browser, go to teachablemachine.withgoogle.com and click "Get Started."'},
                        {'number': 2, 'title': 'Start a New Project', 'content': 'Click "Image Project." Select Standard Image Model.'},
                        {'number': 3, 'title': 'Create Classes', 'content': 'You\'ll see "Class 1" and "Class 2." Rename "Class 1" to "Happy Face" and "Class 2" to "Sad Face."'},
                        {'number': 4, 'title': 'Add Examples', 'content': 'Click "Webcam" under "Happy Face." Make a happy face and click "Hold to Record" many times to capture at least 20 pictures. Click "Webcam" under "Sad Face." Make a sad face and click "Hold to Record" many times to capture at least 20 pictures.'},
                        {'number': 5, 'title': 'Save', 'content': 'Click the "File" menu (usually a small icon like three lines or a gear) and then "Download project." Name it "MyFacesAI" and save it. (You\'ll load it next time!)'},
                    ],
                    'challenge': 'Add a third class called "Surprised Face" and collect examples for it!',
                    'order': 0,
                },
                {
                    'type': 'home_activity',
                    'title': 'Home Activity 1',
                    'introduction': 'Open your model, Add a third class called "Surprised Face" and collect examples for it!',
                    'steps': [],
                    'order': 1,
                },
            ],
        })

        # Lesson 2.2
        self._create_lesson(book, chapter2, {
            'code': '2.2',
            'title': 'Training and Testing Your AI',
            'content': '''<p>Once you have examples, it's time to train your AI! Training is when the computer looks at all your examples and learns from them. It's like studying for a big test! Then, you test your AI to see if it understood correctly. These steps make your AI smart and fun, just like practicing your coding in Scratch (Chapter 3).</p>

<h3>What's Training?</h3>
<p>AI looks at your examples again and again to find patterns and learn.</p>

<h3>What's Testing?</h3>
<p>You show new things to your AI to see if it can guess what they are based on what it learned.</p>

<h3>Class Activity Preview:</h3>
<p>You'll train your AI and test it next.</p>

<p><strong>Parent Tip:</strong> Watch your child train their AI and help them test it with different examples!</p>''',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 2: Train and Test Your AI Model',
                    'introduction': "Let's make your AI smart! You'll train the model you created and then test it to see if it can guess correctly.",
                    'steps': [
                        {'number': 1, 'title': 'Open Your Project', 'content': 'Go to teachablemachine.withgoogle.com, click "Get Started," then "Image Project." Click the "File" menu (top left) and "Open project from computer" to load your "MyFacesAI" file.'},
                        {'number': 2, 'title': 'Train Your AI', 'content': 'Click the big blue button that says "Train Model." Wait for it to finish - it might take a minute!'},
                        {'number': 3, 'title': 'Test Your AI', 'content': 'Once training is done, look at the "Preview" section on the right. Make a happy face. Does the "Happy Face" bar go up? Now make a sad face. Does the "Sad Face" bar go up? Try a silly face! What does the AI guess?'},
                        {'number': 4, 'title': 'Save', 'content': 'Remember to save your project again by clicking "File" > "Download project" to update your changes.'},
                    ],
                    'challenge': 'Test your AI with a very serious face or a confused face. What does it guess? Can you make it guess wrong on purpose?',
                    'order': 0,
                },
                {
                    'type': 'home_activity',
                    'title': 'Home Activity 2',
                    'introduction': 'Use your "MyFacesAI" project from before. Can you train it even better by adding more examples of happy and sad faces? Test it with new family members!',
                    'steps': [],
                    'order': 1,
                },
            ],
        })

        # Lesson 2.3
        self._create_lesson(book, chapter2, {
            'code': '2.3',
            'title': 'Using Sound and Pose for AI',
            'content': '''<p>AI isn't just about pictures! It can also learn from sounds and body movements (called "poses"). Adding different types of information makes your AI super exciting and engaging, like adding sounds in Scratch (Chapter 3) or Tynker (Chapter 9)! You'll try this next!</p>

<h3>Why Add Different Media?</h3>
<p>AI can understand and react to different kinds of information around us.</p>

<h3>Example:</h3>
<p>Make an AI that recognizes if you clap your hands or if your arms are raised.</p>

<h3>Class Activity Preview:</h3>
<p>You'll create a sound or pose model next.</p>

<p><strong>DIY Idea:</strong> Record your own short sound, like a "hello" or a funny noise, for the AI to recognize!</p>''',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 3: Create a Sound or Pose Model',
                    'introduction': "Let's make your AI listen or watch your movements! You'll add an audio clip or teach a pose to your AI, building on your learning.",
                    'steps': [
                        {'number': 1, 'title': 'Open Teachable Machine', 'content': 'Go to teachablemachine.withgoogle.com and click "Get Started."'},
                        {'number': 2, 'title': 'Choose a New Project Type', 'content': 'Sound: Click "Audio Project." Rename "Class 1" to "Clap" and "Class 2" to "No Sound." Record many claps for "Clap" and record quiet sounds for "No Sound." Pose: Click "Pose Project." Rename "Class 1" to "Arms Up" and "Class 2" to "Arms Down." Stand up and use your webcam to capture pictures with your arms up and arms down.'},
                        {'number': 3, 'title': 'Train Model', 'content': 'Click "Train Model."'},
                        {'number': 4, 'title': 'Test Model', 'content': 'If Audio: Clap your hands! Does the "Clap" bar go up? If Pose: Put your arms up or down! Does the AI guess correctly?'},
                        {'number': 5, 'title': 'Save', 'content': 'Click "File" > "Download project." Name it "MySoundAI" or "MyPoseAI."'},
                    ],
                    'challenge': 'Add a third sound (e.g., a "Whistle") or a third pose (e.g., "Sitting") to your project.',
                    'order': 0,
                },
            ],
        })

        # Lesson 2.4
        self._create_lesson(book, chapter2, {
            'code': '2.4',
            'title': 'Building Your Own AI Invention Plan',
            'content': '''<p>Now it's time to combine your skills and plan your own AI invention! You'll create a simple plan for an AI project about a topic you love, using ideas about examples, training, and different types of AI data. This is like outlining a story before you write it, especially for sharing your ideas on Google Drive (Chapter 7).</p>

<h3>What's an AI Project?</h3>
<p>It's a creative way to use AI to solve a small problem or make something fun and interactive.</p>

<h3>Example:</h3>
<p>An AI that guesses if you're holding a fruit or a vegetable, or an AI that reacts to a specific sound you make!</p>

<h3>Class Activity Preview:</h3>
<p>You'll build a 5-step plan for your own AI invention next.</p>

<p><strong>Parent Tip:</strong> Brainstorm cool AI ideas with your child at home!</p>''',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 4: Plan Your AI Invention',
                    'introduction': "Let's create a 5-step plan for an amazing AI invention you can build! You'll use all your Teachable Machine skills to make it awesome.",
                    'steps': [
                        {'number': 1, 'title': 'The Idea', 'content': 'What will your AI guess or do? Write down your cool idea! Example: My AI will guess if I am holding a red object or a blue object.'},
                        {'number': 2, 'title': 'The Examples', 'content': 'What examples (pictures, sounds, or poses) will you give your AI so it can learn? Example: I will show it many red toys and many blue toys.'},
                        {'number': 3, 'title': 'The Teach', 'content': 'How will you teach your AI? (Hint: Think about "Train Model"!) Example: I will click "Train Model" and wait for it to learn!'},
                        {'number': 4, 'title': 'The Test', 'content': 'How will you know if your AI is smart and guesses correctly? Example: I will show it new red and blue things that it has never seen before!'},
                        {'number': 5, 'title': 'The Fun', 'content': 'What cool thing can your AI do once it\'s smart?'},
                        {'number': 6, 'title': 'Save Your Plan', 'content': 'Save your document as "MyAIPlan.txt" or keep your paper safe!'},
                    ],
                    'challenge': 'Add a detail about how your AI could help someone or make a game even more fun! Example: "My AI could help sort recycling by guessing if an item is plastic or paper!"',
                    'order': 0,
                },
                {
                    'type': 'home_activity',
                    'title': 'Home Activity 3',
                    'introduction': '''Create a simple Teachable Machine project to recognize something fun related to your family!
• Idea 1: An AI that guesses if it sees a picture of a "Toy Car" or a "Book" from your house.
• Idea 2: An AI that recognizes two different sounds you and a family member can make (e.g., your clap vs. your parent's snap).
• Idea 3: An AI that recognizes two different poses you and a sibling can do.''',
                    'steps': [],
                    'order': 1,
                },
            ],
        })

        # Chapter 2 Summary
        self._create_lesson(book, chapter2, {
            'code': '2.5',
            'title': 'Chapter 2 Summary and AI Challenge!',
            'content': '''<h2>You're an AI Pro! You:</h2>

<p><strong>2.1</strong> - Learned how AI "learns" from examples.</p>
<p><strong>2.2</strong> - Trained and tested your very first AI models.</p>
<p><strong>2.3</strong> - Explored different types of data like sound and pose.</p>
<p><strong>2.4</strong> - Planned your own awesome AI invention!</p>''',
            'activity_blocks': [
                {
                    'type': 'challenge',
                    'title': 'Homework',
                    'introduction': 'Show your family AI project or your AI invention plan to your parents and explain how it works!',
                    'steps': [],
                    'order': 0,
                },
            ],
        })

        self.stdout.write(self.style.SUCCESS(f'\nSuccessfully imported Chapter 2!'))

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
