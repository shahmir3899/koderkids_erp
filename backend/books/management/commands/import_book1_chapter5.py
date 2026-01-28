"""
Import Book 1 Chapter 5: Creating Your First PowerPoint
Run: python manage.py import_book1_chapter5
"""
from django.core.management.base import BaseCommand
from books.models import Book, Topic


class Command(BaseCommand):
    help = 'Import Book 1 Chapter 5 content'

    def handle(self, *args, **options):
        book = self._get_book()
        if not book:
            return

        # Chapter 5
        chapter5, created = Topic.objects.update_or_create(
            book=book,
            code='5',
            defaults={
                'title': 'Creating Your First PowerPoint',
                'type': 'chapter',
                'parent': None,
                'content': '''<h2>Welcome to Presentations!</h2>
<p>In this chapter, you will learn how to create a simple presentation with slides, text, and images using PowerPoint.</p>''',
            }
        )
        self.stdout.write(f'{"Created" if created else "Updated"} Chapter 5: {chapter5.title}')

        # =============================================
        # Lesson 5.1 - Introduction to PowerPoint
        # =============================================
        lesson_5_1 = self._create_lesson(book, chapter5, {
            'code': '5.1',
            'title': 'Introduction to PowerPoint',
            'content': '''<p>PowerPoint is a program used to create presentations. You can use it to show pictures, text, and even videos. In this chapter, you will learn how to create a simple presentation with slides, text, and images.</p>

<h3>What is PowerPoint?</h3>
<p>PowerPoint helps you present your ideas visually using slides. Each slide can have text, images, and more, and you can show them one after another to create a full presentation.</p>

<h3>Why Use PowerPoint?</h3>
<p>PowerPoint is a great tool for school projects, showing your ideas to a group, or creating fun slideshows for your friends and family.</p>''',
        })

        # =============================================
        # Lesson 5.2 - Designing Your First Slide
        # =============================================
        lesson_5_2 = self._create_lesson(book, chapter5, {
            'code': '5.2',
            'title': 'Designing Your First Slide',
            'content': '''<p>Let's get started by designing your very first slide in PowerPoint!</p>

<h3>How to Start PowerPoint:</h3>
<ol>
<li>Click the Start Menu (Windows icon).</li>
<li>Type PowerPoint in the search bar and click the PowerPoint app to open it.</li>
<li>Click Blank Presentation to start a new project.</li>
</ol>''',
        })

        self._create_activity(book, lesson_5_2, {
            'code': '5.2.class.1',
            'title': 'Class Activity 1: Create Your First Slide',
            'activity_blocks': [{
                'type': 'class_activity',
                'title': 'Class Activity 1: Create Your First Slide',
                'introduction': 'Let\'s create your first PowerPoint slide!',
                'steps': [
                    {'number': 1, 'title': 'Add a Title', 'content': 'At the top of the blank slide, you will see "Click to add title". Click there and type the title of your presentation (e.g. "My Favorite Things").'},
                    {'number': 2, 'title': 'Add a Subtitle', 'content': 'Under the title, click "Click to add subtitle" and type your name (e.g. By [Your Name]).'},
                    {'number': 3, 'title': 'Change the Font', 'content': 'Highlight the text you just typed. Go to the Home tab at the top and choose a new font from the font dropdown menu. You can also make the text bold, italic, or change its color.'},
                    {'number': 4, 'title': 'Add a Background Color', 'content': 'Right-click anywhere on the slide and select Format Background. Choose a color from the Fill options to change the background of your slide.'},
                ],
                'challenge': '',
                'order': 0,
            }],
        })

        # =============================================
        # Lesson 5.3 - Adding Text and Images
        # =============================================
        lesson_5_3 = self._create_lesson(book, chapter5, {
            'code': '5.3',
            'title': 'Adding Text and Images',
            'content': '''<p>Now that you've created your first slide, let's add some text and images to make it more interesting.</p>''',
        })

        self._create_activity(book, lesson_5_3, {
            'code': '5.3.class.1',
            'title': 'Class Activity 2: Add a Slide with Text and Images',
            'activity_blocks': [{
                'type': 'class_activity',
                'title': 'Class Activity 2: Add a Slide with Text and Images',
                'introduction': 'Let\'s add text and images to a new slide!',
                'steps': [
                    {'number': 1, 'title': 'Add a New Slide', 'content': 'In the Home tab, click the New Slide button. Select the layout called Title and Content.'},
                    {'number': 2, 'title': 'Add Text', 'content': 'Click "Click to add title" and type the title for your slide (e.g. "My Favorite Animals"). In the text box below, type a list of your favorite animals (e.g., "1. Cats, 2. Dogs, 3. Elephants").'},
                    {'number': 3, 'title': 'Insert an Image', 'content': 'Click Insert in the top menu and then select Pictures. Choose Online Pictures to search for images from the internet. Search for a picture of your favorite animal and click Insert to add it to your slide.'},
                    {'number': 4, 'title': 'Resize the Image', 'content': 'Click on the image you added. Drag the corners to make it bigger or smaller, and move it to where you want it on the slide.'},
                ],
                'challenge': '',
                'order': 0,
            }],
        })

        # =============================================
        # Lesson 5.4 - Creating a 3-Slide Presentation
        # =============================================
        lesson_5_4 = self._create_lesson(book, chapter5, {
            'code': '5.4',
            'title': 'Creating a 3-Slide Presentation',
            'content': '''<p>Now, let's put everything together and create a full 3-slide presentation.</p>''',
        })

        self._create_activity(book, lesson_5_4, {
            'code': '5.4.class.1',
            'title': 'Class Activity 3: Build Your 3-Slide Presentation',
            'activity_blocks': [{
                'type': 'class_activity',
                'title': 'Class Activity 3: Build Your 3-Slide Presentation',
                'introduction': 'Let\'s build a complete presentation!',
                'steps': [
                    {'number': 1, 'title': 'Slide 1: Title Slide', 'content': 'This is the slide you created in the first activity. It should have the title of your presentation and your name.'},
                    {'number': 2, 'title': 'Slide 2: Text and Images', 'content': 'Add text and images about one of your favorite topics. For example, you could list your favorite animals or foods, and add pictures to match.'},
                    {'number': 3, 'title': 'Slide 3: Conclusion', 'content': 'Create one more slide to finish your presentation. Click New Slide and choose the Title and Content layout. Title the slide "Thank You!" or "The End". Add a short message to thank your audience for watching.'},
                    {'number': 4, 'title': 'Add Transitions (optional)', 'content': 'Click the Transitions tab at the top. Choose a transition effect (like Fade or Wipe) to make your slides move smoothly from one to the next.'},
                ],
                'challenge': '',
                'order': 0,
            }],
        })

        # =============================================
        # Lesson 5.5 - Saving and Presenting Your PowerPoint
        # =============================================
        lesson_5_5 = self._create_lesson(book, chapter5, {
            'code': '5.5',
            'title': 'Saving and Presenting Your PowerPoint',
            'content': '''<p>Once your presentation is ready, it's important to save your work so you can present it later.</p>

<h3>Steps to Save Your PowerPoint:</h3>
<ol>
<li>Click the File menu in the top-left corner.</li>
<li>Select Save As.</li>
<li>Choose a location to save your file, such as Documents.</li>
<li>Name your presentation (e.g. "My Favorite Things") and click Save.</li>
</ol>''',
        })

        self._create_activity(book, lesson_5_5, {
            'code': '5.5.class.1',
            'title': 'Class Activity 4: Present Your PowerPoint',
            'activity_blocks': [{
                'type': 'class_activity',
                'title': 'Class Activity 4: Present Your PowerPoint',
                'introduction': 'Let\'s present your work!',
                'steps': [
                    {'number': 1, 'title': 'Start Your Presentation', 'content': 'Click the Slide Show tab at the top. Click From Beginning to start your slideshow.'},
                    {'number': 2, 'title': 'Navigate Through the Slides', 'content': 'Use the arrow keys on your keyboard to move from slide to slide. Present your ideas to an audience by explaining what\'s on each slide.'},
                ],
                'challenge': '',
                'order': 0,
            }],
        })

        # =============================================
        # Lesson 5.6 - Chapter Wrap-Up
        # =============================================
        lesson_5_6 = self._create_lesson(book, chapter5, {
            'code': '5.6',
            'title': 'Chapter Wrap-Up',
            'content': '''<h2>You did amazing, Koder Kids!</h2>

<p>In this chapter, you learned:</p>
<ul>
<li>What is PowerPoint?</li>
<li>How it is used?</li>
<li>You made a basic 3-slide presentation.</li>
</ul>

<h3>Next Up</h3>
<p>Now it's time to gain expertise in Scratch Jr.</p>''',
        })

        self.stdout.write(self.style.SUCCESS(f'\nSuccessfully imported Chapter 5!'))

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
