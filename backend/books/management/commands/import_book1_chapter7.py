"""
Import Book 1 Chapter 7: Introduction to Web Browsing
Run: python manage.py import_book1_chapter7
"""
from django.core.management.base import BaseCommand
from books.models import Book, Topic


class Command(BaseCommand):
    help = 'Import Book 1 Chapter 7 content'

    def handle(self, *args, **options):
        book = self._get_book()
        if not book:
            return

        # Chapter 7
        chapter7, created = Topic.objects.update_or_create(
            book=book,
            code='7',
            defaults={
                'title': 'Introduction to Web Browsing',
                'type': 'chapter',
                'parent': None,
                'content': '''<h2>Welcome to the Internet Adventure!</h2>
<p>Hey, Koder Kids! In this chapter we will take you on a super cool journey through the World Wide Web! You'll learn to explore the internet safely, find fun facts about Pakistan, and save your favorite websites. Ready to surf the web like a pro? Let's dive in!</p>

<p><strong>Fun Fact:</strong> The internet connects billions of computers, like a giant digital marketplace, just like Karachi's Empress Market!</p>''',
            }
        )
        self.stdout.write(f'{"Created" if created else "Updated"} Chapter 7: {chapter7.title}')

        # =============================================
        # Lesson 7.1 - What is the Internet?
        # =============================================
        lesson_7_1 = self._create_lesson(book, chapter7, {
            'code': '7.1',
            'title': 'What is the Internet?',
            'content': '''<p>The internet is like a huge library connecting computers worldwide. It lets you find information, watch videos, and play games using a web browser, just like you used Paint in Chapter 1!</p>

<h3>Definition:</h3>
<ul>
<li>A <strong>web browser</strong> (e.g., Google Chrome) is a program that takes you to websites.</li>
<li>A <strong>website</strong> is a page with pictures, words, or videos, like a digital storybook.</li>
</ul>

<h3>Explanation:</h3>
<ul>
<li>Type a website's address (like www.kiddle.co) in the browser to visit it.</li>
<li>Use a search engine like Kiddle (kid-safe) to find things, similar to how you searched for shapes in Scratch Jr (Chapter 2).</li>
</ul>''',
        })

        self._create_activity(book, lesson_7_1, {
            'code': '7.1.class.1',
            'title': 'Class Activity 1: Open a Web Browser',
            'activity_blocks': [{
                'type': 'class_activity',
                'title': 'Class Activity 1: Open a Web Browser',
                'introduction': 'Let\'s learn to open and use a web browser!',
                'steps': [
                    {'number': 1, 'title': 'Open Start Menu', 'content': 'Click the Start Menu (Windows icon), just like opening Paint in Chapter 1.'},
                    {'number': 2, 'title': 'Open Chrome', 'content': 'Type "Chrome" and click to open the browser.'},
                    {'number': 3, 'title': 'Find the Address Bar', 'content': 'Look at the address bar at the top—that\'s where you type a website!'},
                    {'number': 4, 'title': 'Visit a Website', 'content': 'With your teacher, visit www.kiddle.co and search "facts about Lahore".'},
                ],
                'challenge': 'Search for "Quaid-e-Azam" on Kiddle and write one fact you learned.',
                'order': 0,
            }],
        })

        self._create_activity(book, lesson_7_1, {
            'code': '7.1.home.1',
            'title': 'Home Activity 1: Draw the Internet',
            'activity_blocks': [{
                'type': 'home_activity',
                'title': 'Home Activity 1: Draw the Internet',
                'introduction': 'Use your imagination to visualize the internet!',
                'steps': [
                    {'number': 1, 'title': 'Draw', 'content': 'Draw what you think the internet looks like (e.g., a web or a cloud).'},
                    {'number': 2, 'title': 'Add Flag', 'content': 'Add a Pakistani flag to your drawing!'},
                    {'number': 3, 'title': 'Share', 'content': 'Show it to your family.'},
                ],
                'challenge': '',
                'order': 0,
            }],
        })

        # =============================================
        # Lesson 7.2 - Safe Web Browsing
        # =============================================
        lesson_7_2 = self._create_lesson(book, chapter7, {
            'code': '7.2',
            'title': 'Safe Web Browsing',
            'content': '''<p>The internet is fun, but you need to stay safe, like when you follow rules in a Scratch Jr story (Chapter 6)! Always ask a grown-up before going online.</p>

<h3>Tips for Safe Browsing:</h3>
<ul>
<li>Don't share your name or address online.</li>
<li>Use kid-safe sites like Kiddle.</li>
<li>Tell a grown-up if something looks strange.</li>
</ul>''',
        })

        self._create_activity(book, lesson_7_2, {
            'code': '7.2.class.1',
            'title': 'Class Activity 2: Spot Safe Websites',
            'activity_blocks': [{
                'type': 'class_activity',
                'title': 'Class Activity 2: Spot Safe Websites',
                'introduction': 'Let\'s learn to identify safe websites!',
                'steps': [
                    {'number': 1, 'title': 'Compare Websites', 'content': 'Your teacher will show two websites: one kid-friendly (e.g., www.kiddle.co) and one not for kids.'},
                    {'number': 2, 'title': 'Look for Clues', 'content': 'Look for clues: Bright colors and simple words mean it\'s safe!'},
                    {'number': 3, 'title': 'Write', 'content': 'Write one thing that makes a website safe.'},
                    {'number': 4, 'title': 'Discuss', 'content': 'Example: Is a site about Pakistani festivals (like Eid) safe? Discuss!'},
                ],
                'challenge': '',
                'order': 0,
            }],
        })

        self._create_activity(book, lesson_7_2, {
            'code': '7.2.home.1',
            'title': 'Home Activity 2: Internet Rules Poster',
            'activity_blocks': [{
                'type': 'home_activity',
                'title': 'Home Activity 2: Internet Rules Poster',
                'introduction': 'Create your own internet safety poster!',
                'steps': [
                    {'number': 1, 'title': 'Make a Poster', 'content': 'Make a poster with three internet safety rules (e.g. "Ask Ammi or Abbu first!").'},
                    {'number': 2, 'title': 'Decorate', 'content': 'Decorate with stars or a crescent moon.'},
                    {'number': 3, 'title': 'Display', 'content': 'Hang it near your computer.'},
                ],
                'challenge': 'Add a fourth rule to your poster like "Respect others online".',
                'order': 0,
            }],
        })

        # =============================================
        # Lesson 7.3 - Searching for Information
        # =============================================
        lesson_7_3 = self._create_lesson(book, chapter7, {
            'code': '7.3',
            'title': 'Searching for Information',
            'content': '''<p>A search engine finds things using keywords, like coding blocks in Scratch Jr (Chapter 2).</p>

<h3>How to Search:</h3>
<ol>
<li>Open Kiddle (www.kiddle.co).</li>
<li>Type keywords (e.g. "Pakistani culture").</li>
<li>Press Enter and pick a website.</li>
</ol>''',
        })

        self._create_activity(book, lesson_7_3, {
            'code': '7.3.class.1',
            'title': 'Class Activity 3: Search Safari',
            'activity_blocks': [{
                'type': 'class_activity',
                'title': 'Class Activity 3: Search Safari',
                'introduction': 'Let\'s go on a search adventure!',
                'steps': [
                    {'number': 1, 'title': 'Open Kiddle', 'content': 'Open Kiddle with your teacher.'},
                    {'number': 2, 'title': 'Search', 'content': 'Search "facts about Pakistani festivals".'},
                    {'number': 3, 'title': 'Share', 'content': 'Pick one fact (e.g., about Basant or Eid) and share it with the class.'},
                    {'number': 4, 'title': 'Connect', 'content': 'Link to Chapter 6: How could you make a Scratch Jr story about this festival?'},
                ],
                'challenge': '',
                'order': 0,
            }],
        })

        self._create_activity(book, lesson_7_3, {
            'code': '7.3.home.1',
            'title': 'Home Activity 3: Fact Finder',
            'activity_blocks': [{
                'type': 'home_activity',
                'title': 'Home Activity 3: Fact Finder',
                'introduction': 'Find interesting facts about Pakistan!',
                'steps': [
                    {'number': 1, 'title': 'Search', 'content': 'With a grown-up, search for a fact about your favorite Pakistani animal (e.g. markhor) on Kiddle.'},
                    {'number': 2, 'title': 'Draw and Write', 'content': 'Draw the animal and write the fact.'},
                ],
                'challenge': 'Find two facts and make a mini PowerPoint slide (like Chapter 5) to show them.',
                'order': 0,
            }],
        })

        # =============================================
        # Lesson 7.4 - Saving Favorite Websites
        # =============================================
        lesson_7_4 = self._create_lesson(book, chapter7, {
            'code': '7.4',
            'title': 'Saving Favorite Websites',
            'content': '''<p>Bookmarks save websites you like, so you can visit them fast, like saving a Python program in Chapter 4!</p>

<h3>How to Bookmark:</h3>
<ol>
<li>Visit a website (e.g. www.kiddle.co).</li>
<li>Click the star icon in the address bar.</li>
<li>Name it (e.g. "Kiddle") and click Save.</li>
</ol>''',
        })

        self._create_activity(book, lesson_7_4, {
            'code': '7.4.class.1',
            'title': 'Class Activity 4: Bookmark a Website',
            'activity_blocks': [{
                'type': 'class_activity',
                'title': 'Class Activity 4: Bookmark a Website',
                'introduction': 'Let\'s save your favorite websites!',
                'steps': [
                    {'number': 1, 'title': 'Visit Website', 'content': 'Visit www.kiddle.co.'},
                    {'number': 2, 'title': 'Bookmark', 'content': 'Bookmark it by clicking the star icon.'},
                    {'number': 3, 'title': 'Find Bookmark', 'content': 'Open the bookmark menu (ask your teacher) and find Kiddle.'},
                    {'number': 4, 'title': 'Visit Again', 'content': 'Click to visit it again!'},
                ],
                'challenge': '',
                'order': 0,
            }],
        })

        self._create_activity(book, lesson_7_4, {
            'code': '7.4.home.1',
            'title': 'Home Activity 4: Bookmark Treasure',
            'activity_blocks': [{
                'type': 'home_activity',
                'title': 'Home Activity 4: Bookmark Treasure',
                'introduction': 'Create your bookmark collection!',
                'steps': [
                    {'number': 1, 'title': 'Bookmark Sites', 'content': 'With a grown-up, bookmark two kid-friendly websites (e.g., one about Pakistani stories).'},
                    {'number': 2, 'title': 'Draw', 'content': 'Draw a treasure chest with their names inside.'},
                ],
                'challenge': 'Create a bookmark folder called "Pakistan Fun" and add one more site.',
                'order': 0,
            }],
        })

        # =============================================
        # Lesson 7.5 - Chapter Wrap-Up
        # =============================================
        lesson_7_5 = self._create_lesson(book, chapter7, {
            'code': '7.5',
            'title': 'Chapter Wrap-Up',
            'content': '''<h2>Wow, Koder Kids! You're internet explorers now!</h2>

<p>You opened a browser, searched safely for Pakistani facts, and bookmarked websites.</p>

<h3>What We Did:</h3>
<ul>
<li>Visited kid-safe websites like Kiddle.</li>
<li>Learned internet safety, like in a Scratch Jr story.</li>
<li>Searched for facts about Pakistan and saved websites.</li>
</ul>

<h3>Next Up</h3>
<p>Create awesome art in Canva!</p>

<p><strong>Fun Fact:</strong> Pakistan's first internet connection started in 1995, when computers were super slow!</p>''',
        })

        self.stdout.write(self.style.SUCCESS(f'\nSuccessfully imported Chapter 7!'))

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
