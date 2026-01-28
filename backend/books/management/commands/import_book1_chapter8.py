"""
Import Book 1 Chapter 8: Basics of Digital Art
Run: python manage.py import_book1_chapter8
"""
from django.core.management.base import BaseCommand
from books.models import Book, Topic


class Command(BaseCommand):
    help = 'Import Book 1 Chapter 8 content'

    def handle(self, *args, **options):
        book = self._get_book()
        if not book:
            return

        # Chapter 8
        chapter8, created = Topic.objects.update_or_create(
            book=book,
            code='8',
            defaults={
                'title': 'Basics of Digital Art',
                'type': 'chapter',
                'parent': None,
                'content': '''<h2>Welcome to the Art Studio!</h2>
<p>Hey, Koder Kids! Chip the Computer Chip here, ready to make you digital artists! You'll use Canva to design posters and cards, just like you drew in Paint (Chapter 1) or made slides in PowerPoint (Chapter 5). Let's create something colorful!</p>

<p><strong>Fun Fact:</strong> Digital art is used in Pakistani animated shows, like "Burka Avenger"!</p>''',
            }
        )
        self.stdout.write(f'{"Created" if created else "Updated"} Chapter 8: {chapter8.title}')

        # =============================================
        # Lesson 8.1 - What is Canva
        # =============================================
        lesson_8_1 = self._create_lesson(book, chapter8, {
            'code': '8.1',
            'title': 'What is Canva',
            'content': '''<p>Canva is a free online tool for making posters, cards, or invitations with pictures, text, and shapes. It's like a digital Paint program!</p>

<h3>Definition:</h3>
<p>Digital art is art made on a computer. Canva gives you templates (ready-made designs) to start, like a PowerPoint slide layout (Chapter 5).</p>

<h3>Explanation:</h3>
<ul>
<li>Pick a template, add text, change colors, or drag in pictures.</li>
<li>It's like coding a Scratch Jr scene (Chapter 2) but for art!</li>
</ul>''',
        })

        self._create_activity(book, lesson_8_1, {
            'code': '8.1.class.1',
            'title': 'Class Activity 1: Open Canva',
            'activity_blocks': [{
                'type': 'class_activity',
                'title': 'Class Activity 1: Open Canva',
                'introduction': 'Let\'s explore Canva for the first time!',
                'steps': [
                    {'number': 1, 'title': 'Go to Canva', 'content': 'With your teacher, go to www.canva.com in a browser (like Chapter 7).'},
                    {'number': 2, 'title': 'Sign In', 'content': 'Click on Sign in and continue with any Google account.'},
                    {'number': 3, 'title': 'Create a Design', 'content': 'Click the + Button on the left-hand side, "Create a design" and choose "Poster".'},
                    {'number': 4, 'title': 'Explore', 'content': 'See the templates and tools? That\'s your art studio!'},
                ],
                'challenge': 'Sketch a second design for Pakistan Day (March 23).',
                'order': 0,
            }],
        })

        self._create_activity(book, lesson_8_1, {
            'code': '8.1.home.1',
            'title': 'Home Activity 1: Dream Design',
            'activity_blocks': [{
                'type': 'home_activity',
                'title': 'Home Activity 1: Dream Design',
                'introduction': 'Explore Canva at home!',
                'steps': [
                    {'number': 1, 'title': 'Open Templates', 'content': 'Open a few templates.'},
                    {'number': 2, 'title': 'Change Text', 'content': 'Try to change text.'},
                    {'number': 3, 'title': 'Resize Images', 'content': 'Try to change the size of images etc.'},
                    {'number': 4, 'title': 'Explore', 'content': 'Explore as much as you can.'},
                ],
                'challenge': '',
                'order': 0,
            }],
        })

        # =============================================
        # Lesson 8.2 - Creating Your First Design
        # =============================================
        lesson_8_2 = self._create_lesson(book, chapter8, {
            'code': '8.2',
            'title': 'Creating Your First Design',
            'content': '''<p>Let's make a poster for a Pakistani festival, like you animated stories in Scratch Jr (Chapter 6)!</p>

<h3>Steps to Create a Poster:</h3>
<ul>
<li>Choose a template with bright colors.</li>
<li>Add text, like a title.</li>
<li>Drag in images or shapes.</li>
</ul>''',
        })

        self._create_activity(book, lesson_8_2, {
            'code': '8.2.class.1',
            'title': 'Class Activity 2: Make an Eid Poster',
            'activity_blocks': [{
                'type': 'class_activity',
                'title': 'Class Activity 2: Make an Eid Poster',
                'introduction': 'Let\'s create a beautiful Eid poster!',
                'steps': [
                    {'number': 1, 'title': 'Select Poster', 'content': 'In Canva, select "Poster" under "Create a design".'},
                    {'number': 2, 'title': 'Pick a Template', 'content': 'Pick a template with stars or lanterns. On the left-hand side, we have a number of tools, elements, text, etc. Explore those.'},
                    {'number': 3, 'title': 'Add Title', 'content': 'Using Text, Type "Eid Mubarak!" as the title.'},
                    {'number': 4, 'title': 'Add Elements', 'content': 'Click "Elements" and search for "moon" to add a crescent moon.'},
                    {'number': 5, 'title': 'Save', 'content': 'Save by clicking "Share" and "Download" (ask your teacher).'},
                ],
                'challenge': '',
                'order': 0,
            }],
        })

        self._create_activity(book, lesson_8_2, {
            'code': '8.2.home.1',
            'title': 'Home Activity 2: Poster Power',
            'activity_blocks': [{
                'type': 'home_activity',
                'title': 'Home Activity 2: Poster Power',
                'introduction': 'Create your own poster at home!',
                'steps': [
                    {'number': 1, 'title': 'Make a Poster', 'content': 'With a grown-up, make a Canva poster with your name and a Pakistani symbol (e.g., jasmine flower).'},
                    {'number': 2, 'title': 'Share', 'content': 'Show it to your family!'},
                ],
                'challenge': 'Add a second picture (e.g., a minaret) and import it into a PowerPoint slide (Chapter 5).',
                'order': 0,
            }],
        })

        # =============================================
        # Lesson 8.3 - Adding Colors and Shapes
        # =============================================
        lesson_8_3 = self._create_lesson(book, chapter8, {
            'code': '8.3',
            'title': 'Adding Colors and Shapes',
            'content': '''<p>Colors and shapes make your art shine.</p>''',
        })

        self._create_activity(book, lesson_8_3, {
            'code': '8.3.class.1',
            'title': 'Class Activity 3: Shape Party',
            'activity_blocks': [{
                'type': 'class_activity',
                'title': 'Class Activity 3: Shape Party',
                'introduction': 'Let\'s add shapes to your poster!',
                'steps': [
                    {'number': 1, 'title': 'Open Poster', 'content': 'Open your Eid poster in Canva.'},
                    {'number': 2, 'title': 'Add Shapes', 'content': 'Click "Elements" and add three shapes (e.g., star, circle, heart).'},
                    {'number': 3, 'title': 'Change Colors', 'content': 'Change their colors using the color picker.'},
                    {'number': 4, 'title': 'Decorate', 'content': 'Move shapes to decorate your poster.'},
                    {'number': 5, 'title': 'Compare', 'content': 'Link to Chapter 1: How is this like drawing shapes in Paint? Which one is easy: Paint or Canva?'},
                ],
                'challenge': 'Add a shape pattern (e.g., repeating stars) to your poster.',
                'order': 0,
            }],
        })

        self._create_activity(book, lesson_8_3, {
            'code': '8.3.home.1',
            'title': 'Home Activity 3: Color Splash',
            'activity_blocks': [{
                'type': 'home_activity',
                'title': 'Home Activity 3: Color Splash',
                'introduction': 'Compare Paint and Canva!',
                'steps': [
                    {'number': 1, 'title': 'Make in Paint', 'content': 'Make a poster on Paint.'},
                    {'number': 2, 'title': 'Make in Canva', 'content': 'Try to make the same poster on Canva.'},
                    {'number': 3, 'title': 'Choose a Theme', 'content': 'Choose the Pakistan Flag OR any other poster you like.'},
                    {'number': 4, 'title': 'Show and Compare', 'content': 'Show both to your parents. What do they say?'},
                ],
                'challenge': '',
                'order': 0,
            }],
        })

        # =============================================
        # Lesson 8.4 - Sharing Your Artwork
        # =============================================
        lesson_8_4 = self._create_lesson(book, chapter8, {
            'code': '8.4',
            'title': 'Sharing Your Artwork',
            'content': '''<p>Share your art like presenting a PowerPoint (Chapter 5)!</p>

<h3>Steps to Share:</h3>
<ul>
<li>Click "Share" in Canva and "Download" to save as a picture.</li>
<li>Print or show it on a screen.</li>
</ul>''',
        })

        self._create_activity(book, lesson_8_4, {
            'code': '8.4.class.1',
            'title': 'Class Activity 4: Art Gallery',
            'activity_blocks': [{
                'type': 'class_activity',
                'title': 'Class Activity 4: Art Gallery',
                'introduction': 'Let\'s share our artwork with the class!',
                'steps': [
                    {'number': 1, 'title': 'Finish and Download', 'content': 'Finish your Eid poster and download it.'},
                    {'number': 2, 'title': 'Display', 'content': 'Show it to the class (teacher will display).'},
                    {'number': 3, 'title': 'Share', 'content': 'Tell one thing you love about your poster.'},
                    {'number': 4, 'title': 'Celebrate', 'content': 'Clap for everyone\'s art!'},
                ],
                'challenge': '',
                'order': 0,
            }],
        })

        self._create_activity(book, lesson_8_4, {
            'code': '8.4.home.1',
            'title': 'Home Activity 4: Art Show',
            'activity_blocks': [{
                'type': 'home_activity',
                'title': 'Home Activity 4: Art Show',
                'introduction': 'Create a special card for someone!',
                'steps': [
                    {'number': 1, 'title': 'Make a Card', 'content': 'Make a Canva card for a family member (choose "Card").'},
                    {'number': 2, 'title': 'Add Pakistani Touch', 'content': 'Add a Pakistani touch (e.g. truck art style).'},
                    {'number': 3, 'title': 'Give It', 'content': 'Give it to them!'},
                ],
                'challenge': 'Create a second card for a teacher and email it (ask a grown-up).',
                'order': 0,
            }],
        })

        # =============================================
        # Lesson 8.5 - Chapter Wrap-Up
        # =============================================
        lesson_8_5 = self._create_lesson(book, chapter8, {
            'code': '8.5',
            'title': 'Chapter Wrap-Up',
            'content': '''<h2>Great job, Koder Kids! You're digital artists!</h2>

<p>You used Canva to make Eid posters, added shapes, and shared your art.</p>

<h3>What We Did:</h3>
<ul>
<li>Made posters like in Paint and PowerPoint.</li>
<li>Added Pakistani-inspired colors and shapes.</li>
<li>Shared our art with friends.</li>
</ul>

<h3>Next Up</h3>
<p>Discover the magic of AI!</p>

<p><strong>Fun Fact:</strong> Pakistani truck art uses bright colors, just like your Canva designs!</p>''',
        })

        self.stdout.write(self.style.SUCCESS(f'\nSuccessfully imported Chapter 8!'))

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

    def _create_activity(book, parent, data):
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
