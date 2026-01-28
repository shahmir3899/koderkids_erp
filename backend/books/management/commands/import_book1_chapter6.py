"""
Import Book 1 Chapter 6: Scratch Jr Story Time
Run: python manage.py import_book1_chapter6
"""
from django.core.management.base import BaseCommand
from books.models import Book, Topic


class Command(BaseCommand):
    help = 'Import Book 1 Chapter 6 content'

    def handle(self, *args, **options):
        book = self._get_book()
        if not book:
            return

        # Chapter 6
        chapter6, created = Topic.objects.update_or_create(
            book=book,
            code='6',
            defaults={
                'title': 'Scratch Jr Story Time',
                'type': 'chapter',
                'parent': None,
                'content': '''<h2>Welcome to Story Time!</h2>
<p>In this chapter, we will use Scratch Jr to create a fun and interactive story. You'll learn how to add characters, change backgrounds, and make the characters interact by moving, talking and doing actions.</p>''',
            }
        )
        self.stdout.write(f'{"Created" if created else "Updated"} Chapter 6: {chapter6.title}')

        # =============================================
        # Lesson 6.1 - Building Stories in Scratch Jr
        # =============================================
        lesson_6_1 = self._create_lesson(book, chapter6, {
            'code': '6.1',
            'title': 'Building Stories in Scratch Jr',
            'content': '''<p>In this chapter, we will use Scratch Jr to create a fun and interactive story. You'll learn how to add characters, change backgrounds, and make the characters interact by moving, talking and doing actions.</p>

<h3>What is a Story in Scratch Jr?</h3>
<ul>
<li>A story in Scratch Jr is created by using coding blocks to control what the characters do.</li>
<li>You can make the characters talk, move around, and interact with each other.</li>
</ul>

<h3>Why Build Stories?</h3>
<ul>
<li>Building stories in Scratch Jr is a fun way to use your imagination while practicing coding.</li>
<li>You can tell your own stories and see them come to life on the screen.</li>
</ul>''',
        })

        # =============================================
        # Lesson 6.2 - Adding Characters and Backgrounds
        # =============================================
        lesson_6_2 = self._create_lesson(book, chapter6, {
            'code': '6.2',
            'title': 'Adding Characters and Backgrounds',
            'content': '''<p>Before we create the story, let's add some characters and backgrounds to make it more exciting.</p>''',
        })

        self._create_activity(book, lesson_6_2, {
            'code': '6.2.class.1',
            'title': 'Class Activity 1: Add Multiple Characters and Change the Background',
            'activity_blocks': [{
                'type': 'class_activity',
                'title': 'Class Activity 1: Add Multiple Characters and Change the Background',
                'introduction': 'Let\'s set up our story with characters and a background!',
                'steps': [
                    {'number': 1, 'title': 'Add a New Character', 'content': 'Open Scratch Jr and start a new project. Click the blue circle with the cat to add a new character. Choose a second character (like a dog or a dinosaur) and click the checkmark to add it to the stage.'},
                    {'number': 2, 'title': 'Change the Background', 'content': 'Click the background icon in the top-right corner of the stage. Choose a new background for your story (e.g., a park, beach, or space). Click the checkmark to set the background.'},
                    {'number': 3, 'title': 'Arrange the Characters', 'content': 'Click and drag each character to place them where you want them on the stage.'},
                ],
                'challenge': '',
                'order': 0,
            }],
        })

        # =============================================
        # Lesson 6.3 - Making Characters Talk
        # =============================================
        lesson_6_3 = self._create_lesson(book, chapter6, {
            'code': '6.3',
            'title': 'Making Characters Talk',
            'content': '''<p>Now that you have your characters and background, let's make the characters talk to each other.</p>''',
        })

        self._create_activity(book, lesson_6_3, {
            'code': '6.3.class.1',
            'title': 'Class Activity 2: Make Two Characters Talk',
            'activity_blocks': [{
                'type': 'class_activity',
                'title': 'Class Activity 2: Make Two Characters Talk',
                'introduction': 'Let\'s make your characters have a conversation!',
                'steps': [
                    {'number': 1, 'title': 'Select a Character', 'content': 'Click on one of the characters on the stage to select it.'},
                    {'number': 2, 'title': 'Add a Speech Block', 'content': 'Click the purple blocks (looks) at the bottom of the screen. Drag the Say Block (speech bubble) into the programming area. Type a message (e.g. "Hello! How are you?").'},
                    {'number': 3, 'title': 'Add a Second Speech Block', 'content': 'Click on the other character to select it. Add a Say Block for this character and type a reply (e.g. "I\'m good, thank you!").'},
                    {'number': 4, 'title': 'Test Your Story', 'content': 'Add the green flag to the start of the say block for all characters. Click the green flag to see the characters talk to each other.'},
                ],
                'challenge': '',
                'order': 0,
            }],
        })

        # =============================================
        # Lesson 6.4 - Moving and Interacting with Blocks
        # =============================================
        lesson_6_4 = self._create_lesson(book, chapter6, {
            'code': '6.4',
            'title': 'Moving and Interacting with Blocks',
            'content': '''<p>Next, let's make the characters move while they are talking to add more action to the story.</p>''',
        })

        self._create_activity(book, lesson_6_4, {
            'code': '6.4.class.1',
            'title': 'Class Activity 3: Make Characters Move and Interact',
            'activity_blocks': [{
                'type': 'class_activity',
                'title': 'Class Activity 3: Make Characters Move and Interact',
                'introduction': 'Let\'s add movement to your story!',
                'steps': [
                    {'number': 1, 'title': 'Move a Character While Talking', 'content': 'Select one of the characters and add a Move Right Block from the blue motion blocks. Snap it after the Say Block so the character will talk and then move.'},
                    {'number': 2, 'title': 'Add More Movements', 'content': 'Add a Move Left Block for the second character after their Say Block. You can also add a Move Up or Move Down block to make the character move in different directions.'},
                    {'number': 3, 'title': 'Test Your Program', 'content': 'Click the green flag to watch the characters talk and move.'},
                ],
                'challenge': 'Try making the characters walk to each other while they talk.',
                'order': 0,
            }],
        })

        # =============================================
        # Lesson 6.5 - Creating Scenes with Multiple Pages
        # =============================================
        lesson_6_5 = self._create_lesson(book, chapter6, {
            'code': '6.5',
            'title': 'Creating Scenes with Multiple Pages',
            'content': '''<p>Stories in Scratch Jr can have multiple scenes, just like chapters in a book. Let's create a second scene to continue the story.</p>''',
        })

        self._create_activity(book, lesson_6_5, {
            'code': '6.5.class.1',
            'title': 'Class Activity 4: Add a New Scene to Your Story',
            'activity_blocks': [{
                'type': 'class_activity',
                'title': 'Class Activity 4: Add a New Scene to Your Story',
                'introduction': 'Let\'s add multiple scenes to your story!',
                'steps': [
                    {'number': 1, 'title': 'Add a New Page', 'content': 'At the top of the screen, click the plus (+) sign to add a new page (scene) to your story.'},
                    {'number': 2, 'title': 'Change the Background', 'content': 'Just like in the first scene, click the background icon and choose a different background for the new page.'},
                    {'number': 3, 'title': 'Move Your Characters', 'content': 'Your characters from the first scene will appear on the new page. Drag them to different positions to match the new scene.'},
                    {'number': 4, 'title': 'Add New Actions', 'content': 'Create new dialogue and movements for the characters in the second scene using the same steps as before.'},
                ],
                'challenge': '',
                'order': 0,
            }],
        })

        # =============================================
        # Lesson 6.6 - Sharing Your First Story
        # =============================================
        lesson_6_6 = self._create_lesson(book, chapter6, {
            'code': '6.6',
            'title': 'Sharing Your First Story',
            'content': '''<p>Once your story is complete, it's time to share it with others.</p>''',
        })

        self._create_activity(book, lesson_6_6, {
            'code': '6.6.class.1',
            'title': 'Class Activity 5: Share Your Story',
            'activity_blocks': [{
                'type': 'class_activity',
                'title': 'Class Activity 5: Share Your Story',
                'introduction': 'Let\'s share your completed story!',
                'steps': [
                    {'number': 1, 'title': 'Run the Story', 'content': 'Click the green flag to watch your story from beginning to end. Make sure everything works as planned—characters should talk, move, and transition smoothly between scenes.'},
                    {'number': 2, 'title': 'Show It to Friends or Family', 'content': 'Invite friends or family to watch your story. Click the green flag and tell them the story as it plays out.'},
                    {'number': 3, 'title': 'Save Your Story', 'content': 'Click the home button in Scratch Jr to save your project. Give your story a name (e.g. "My Fun Story") and click Save.'},
                ],
                'challenge': '',
                'order': 0,
            }],
        })

        # =============================================
        # Lesson 6.7 - Chapter Wrap-Up
        # =============================================
        lesson_6_7 = self._create_lesson(book, chapter6, {
            'code': '6.7',
            'title': 'Chapter Wrap-Up',
            'content': '''<h2>You did amazing, Koder Kids!</h2>

<p>In this chapter, you learned:</p>
<ul>
<li>More about Scratch Jr.</li>
<li>Created a multipage story in Scratch Jr.</li>
</ul>

<p><strong>Well Done!</strong></p>

<p><strong>Fun Fact:</strong> Scratch Jr helps develop problem-solving skills, creativity, and computational thinking.</p>

<h3>Next Up</h3>
<p>Next we move to Web Browsing.</p>''',
        })

        self.stdout.write(self.style.SUCCESS(f'\nSuccessfully imported Chapter 6!'))

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
