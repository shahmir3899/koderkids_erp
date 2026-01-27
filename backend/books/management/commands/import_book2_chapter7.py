"""
Import Book 2 Chapter 7: Getting Started with Google Drive
Run: python manage.py import_book2_chapter7
"""
from django.core.management.base import BaseCommand
from books.models import Book, Topic


class Command(BaseCommand):
    help = 'Import Book 2 Chapter 7 content'

    def handle(self, *args, **options):
        book = self._get_book()
        if not book:
            return

        self.stdout.write(f'Found book: {book.title} (ID: {book.id})')

        # Chapter 7
        chapter7, created = Topic.objects.update_or_create(
            book=book,
            code='7',
            defaults={
                'title': 'Getting Started with Google Drive',
                'type': 'chapter',
                'parent': None,
                'content': '''<h2>Welcome to Google Drive!</h2>
<p>Google Drive is like a magic backpack in the cloud! You can store files, share them, and work with friends online. In this chapter, you'll create files, folders, and more, just like you organized files on your computer!</p>

<h3>What is Google Drive?</h3>
<p>A free online place to save and share files.</p>

<h3>Why Use It?</h3>
<p>Keep your schoolwork safe and work with others anywhere!</p>

<h3>Activity Preview:</h3>
<p>You'll make a folder today!</p>

<h3>Instructions:</h3>
<p>Ask an adult to help you sign into drive.google.com.</p>''',
            }
        )
        self.stdout.write(f'{"Created" if created else "Updated"} Chapter 7')

        # Lesson 7.1
        self._create_lesson(book, chapter7, {
            'code': '7.1',
            'title': 'Exploring Google Drive',
            'content': '''<p>Google Drive looks like a big shelf for your files! You'll see folders, documents, and buttons to create new things. It's like the File Explorer from Chapter 2, but online!</p>

<h3>Key Parts:</h3>
<ul>
<li>My Drive: Where your files live.</li>
<li>New Button: To create files or folders.</li>
<li>Share Button: To send files to others.</li>
</ul>

<p><strong>Fun Fact:</strong> Google Drive saves your work so you never lose it!</p>

<h3>Pre Class Activity:</h3>
<p>Look around Drive.</p>''',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 1: Create a School Folder',
                    'introduction': "Let's make a folder to organize your files, like you did on your computer! Folders help you keep schoolwork neat.",
                    'steps': [
                        {'number': 1, 'title': 'Open Google Drive', 'content': 'Open drive.google.com.'},
                        {'number': 2, 'title': 'Create New Folder', 'content': 'Click "New" > "Folder."'},
                        {'number': 3, 'title': 'Name Your Folder', 'content': 'Type a name, like "My School Projects."'},
                        {'number': 4, 'title': 'Create Folder', 'content': 'Click "Create" to upload your folder.'},
                        {'number': 5, 'title': 'Open Folder', 'content': 'Double-click the folder to open it - it\'s empty now!'},
                    ],
                    'challenge': 'Make another folder called "My Drawings."',
                    'order': 0,
                },
                {
                    'type': 'home_activity',
                    'title': 'Home Activity 1',
                    'introduction': 'Create a folder for family photos online.',
                    'steps': [],
                    'order': 1,
                },
            ],
        })

        # Lesson 7.2
        self._create_lesson(book, chapter7, {
            'code': '7.2',
            'title': 'Creating Files in Google Drive',
            'content': '''<p>You can create files in Google Drive, like stories or drawings, without leaving the website! Google Docs is for writing, like Microsoft Word from Chapter 2. Let's make a file next!</p>

<h3>What's a File?</h3>
<p>A document, like a story or list, saved in Drive.</p>

<h3>Why Create Files?</h3>
<p>Write homework or notes and save them online.</p>

<h3>Activity Preview:</h3>
<p>You'll write a story file.</p>

<p><strong>Parent Tip:</strong> Read your child's story with them!</p>''',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 2: Make a Story File',
                    'introduction': "Let's write a short story in Google Docs! You'll create a file and type in it.",
                    'steps': [
                        {'number': 1, 'title': 'Open Folder', 'content': 'Open drive.google.com and go to "My School Projects" folder.'},
                        {'number': 2, 'title': 'Create New Doc', 'content': 'Click "New" > "Google Docs."'},
                        {'number': 3, 'title': 'Add Title', 'content': 'Type a title, like "My Adventure Story."'},
                        {'number': 4, 'title': 'Write Story', 'content': 'Write one sentence, e.g., "I met a talking parrot!"'},
                        {'number': 5, 'title': 'Save File', 'content': 'Click the blue "Share" button to save (it autosaves too).'},
                    ],
                    'challenge': 'Add a second sentence about a Pakistani place, like "in Lahore\'s park."',
                    'order': 0,
                },
                {
                    'type': 'home_activity',
                    'title': 'Home Activity 2',
                    'introduction': 'Write a short online note about your favorite animal.',
                    'steps': [],
                    'order': 1,
                },
            ],
        })

        # Lesson 7.3
        self._create_lesson(book, chapter7, {
            'code': '7.3',
            'title': 'Organizing Files in Folders',
            'content': '''<p>Just like moving files on your computer, you can move files into folders in Google Drive to stay organized. Let's practice moving your story!</p>

<h3>Why Organize?</h3>
<p>It's easier to find files for school or fun.</p>

<h3>Example:</h3>
<p>Put all homework in a "School" folder.</p>

<h3>Activity:</h3>
<p>Move your story file.</p>
<ul>
<li>Go to "My Drive" in drive.google.com.</li>
<li>Find your story file (e.g., "My Adventure Story").</li>
<li>Drag it into "My School Projects" folder.</li>
</ul>''',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 3: Organize a File',
                    'introduction': "Let's practice organizing! You'll move another file and rename it to make it clear.",
                    'steps': [
                        {'number': 1, 'title': 'Open Google Drive', 'content': 'Open drive.google.com.'},
                        {'number': 2, 'title': 'Create New File', 'content': 'Click "New" > "Google Docs" to create a new file.'},
                        {'number': 3, 'title': 'Name and Write', 'content': 'Name it "Homework" and type one sentence, e.g., "I love math!"'},
                        {'number': 4, 'title': 'Rename File', 'content': 'Right-click the file, select "Rename," and change it to "Math Notes."'},
                        {'number': 5, 'title': 'Move to Folder', 'content': 'Drag "Math Notes" into "My School Projects" folder.'},
                    ],
                    'challenge': 'Create a "Science Notes" file and move it too.',
                    'order': 0,
                },
                {
                    'type': 'home_activity',
                    'title': 'Home Activity 3',
                    'introduction': 'Move a file to a new online folder for drawings.',
                    'steps': [],
                    'order': 1,
                },
            ],
        })

        # Lesson 7.4
        self._create_lesson(book, chapter7, {
            'code': '7.4',
            'title': 'Editing Files in Google Drive',
            'content': '''<p>Editing means changing a file, like adding words to your story. Google Docs lets you edit anytime, and changes save automatically!</p>

<h3>What's Editing?</h3>
<p>Fixing or adding to your work, like in Chapter 2's Word files.</p>

<h3>Why Edit?</h3>
<p>Make your files better for school or sharing.</p>

<h3>Activity Preview:</h3>
<p>You'll edit your story next.</p>

<p><strong>DIY Idea:</strong> Print your story to show your teacher!</p>''',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 4: Edit Your Story File',
                    'introduction': "Let's make your story longer! You'll open your story file and add more sentences.",
                    'steps': [
                        {'number': 1, 'title': 'Open Folder', 'content': 'Open drive.google.com and go to "My School Projects."'},
                        {'number': 2, 'title': 'Open Story', 'content': 'Double-click "My Adventure Story" to open it.'},
                        {'number': 3, 'title': 'Add Sentences', 'content': 'Add two new sentences, e.g., "The parrot flew to Badshahi Mosque. It sang a song!"'},
                        {'number': 4, 'title': 'Auto Save', 'content': 'Click anywhere - it autosaves!'},
                        {'number': 5, 'title': 'Check Story', 'content': 'Check your story - does it sound fun?'},
                    ],
                    'challenge': 'Add a sentence about a Pakistani festival, like "We saw Basant kites!"',
                    'order': 0,
                },
                {
                    'type': 'home_activity',
                    'title': 'Home Activity 4',
                    'introduction': 'Edit an online story with a new sentence about a festival.',
                    'steps': [],
                    'order': 1,
                },
            ],
        })

        # Lesson 7.5
        self._create_lesson(book, chapter7, {
            'code': '7.5',
            'title': 'Deleting Files Safely',
            'content': '''<p>Sometimes you don't need a file anymore, like an old note. In Google Drive, deleting is like moving files to the Recycle Bin in Chapter 2. Let's learn to delete safely!</p>

<h3>Why Delete?</h3>
<p>To keep your Drive tidy and free up space.</p>

<h3>Tip:</h3>
<p>Deleted files go to Trash, so you can get them back if needed.</p>''',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 5: Delete a Test File',
                    'introduction': "Let's practice deleting a file safely.",
                    'steps': [
                        {'number': 1, 'title': 'Open Google Drive', 'content': 'Open drive.google.com.'},
                        {'number': 2, 'title': 'Create Test File', 'content': 'Click "New" > "Google Docs" and name it "Test File."'},
                        {'number': 3, 'title': 'Delete File', 'content': 'Right-click "Test File" and select "Move to Trash."'},
                    ],
                    'challenge': '',
                    'order': 0,
                },
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 6: Delete and Restore',
                    'introduction': "Let's practice deleting and bringing back a file! This helps you clean Drive without losing important work.",
                    'steps': [
                        {'number': 1, 'title': 'Open My Drive', 'content': 'Open drive.google.com and go to "My Drive."'},
                        {'number': 2, 'title': 'Create File', 'content': 'Create a new Google Doc named "Old Note."'},
                        {'number': 3, 'title': 'Delete File', 'content': 'Right-click "Old Note" and click "Remove" to delete it.'},
                        {'number': 4, 'title': 'Open Trash', 'content': 'Click "Trash" on the left to see deleted files.'},
                        {'number': 5, 'title': 'Restore File', 'content': 'Right-click "Old Note" in Trash and select "Restore."'},
                    ],
                    'challenge': 'Delete "Old Note" again and empty Trash (ask an adult).',
                    'order': 1,
                },
                {
                    'type': 'home_activity',
                    'title': 'Home Activity 5',
                    'introduction': 'Create and delete another file in presence of family.',
                    'steps': [],
                    'order': 2,
                },
                {
                    'type': 'home_activity',
                    'title': 'Home Activity 6',
                    'introduction': 'Delete an old online note and restore it.',
                    'steps': [],
                    'order': 3,
                },
            ],
        })

        # Chapter 7 Summary
        self._create_lesson(book, chapter7, {
            'code': '7.S',
            'title': 'Chapter 7 Summary and Final Home Activity',
            'content': '''<h2>Great job, cloud explorer! You:</h2>

<p><strong>7.1:</strong> Explored Google Drive and created a school folder.</p>
<p><strong>7.2:</strong> Created files using Google Docs.</p>
<p><strong>7.3:</strong> Organized files by moving and renaming them.</p>
<p><strong>7.4:</strong> Edited files to make them better.</p>
<p><strong>7.5:</strong> Deleted files safely and restored them from Trash.</p>

<h3>Skills You Learned:</h3>
<ul>
<li>Created and organized folders and files in Google Drive.</li>
<li>Moved, renamed, edited, and deleted files.</li>
</ul>

<h3>What's Next?</h3>
<p>Use Google Drive to save your VEXcode VR screenshots (Chapter 4), Python notebooks (Chapter 5), and AI images (Chapter 6)!</p>''',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Final Activity: Make a Festival Folder',
                    'introduction': "Let's create a festival folder and add a document to it!",
                    'steps': [
                        {'number': 1, 'title': 'Open Google Drive', 'content': 'Open drive.google.com.'},
                        {'number': 2, 'title': 'Create Folder', 'content': 'Click "New" > "Folder" and name it "Basant Festival."'},
                        {'number': 3, 'title': 'Create Document', 'content': 'Create a Google Doc inside it called "Kite Plan."'},
                        {'number': 4, 'title': 'Write Content', 'content': 'Write one sentence, e.g., "I\'ll make a red kite!"'},
                        {'number': 5, 'title': 'Move File', 'content': 'Move "Kite Plan" to "My School Projects" if you want!'},
                    ],
                    'challenge': '',
                    'order': 0,
                },
                {
                    'type': 'challenge',
                    'title': 'Homework',
                    'introduction': 'Add a sentence to "Kite Plan" about your favorite festival.',
                    'steps': [],
                    'order': 1,
                },
            ],
        })

        self.stdout.write(self.style.SUCCESS('\nSuccessfully imported Chapter 7!'))

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
