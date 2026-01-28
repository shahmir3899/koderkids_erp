"""
Import Book 1 Chapter 4: Introduction to Python Programming
Run: python manage.py import_book1_chapter4
"""
from django.core.management.base import BaseCommand
from books.models import Book, Topic


class Command(BaseCommand):
    help = 'Import Book 1 Chapter 4 content'

    def handle(self, *args, **options):
        book = self._get_book()
        if not book:
            return

        # Chapter 4
        chapter4, created = Topic.objects.update_or_create(
            book=book,
            code='4',
            defaults={
                'title': 'Introduction to Python Programming',
                'type': 'chapter',
                'parent': None,
                'content': '''<h2>Welcome to Python!</h2>
<p>In this chapter, you'll learn to write real Python code!</p>''',
            }
        )
        self.stdout.write(f'{"Created" if created else "Updated"} Chapter 4: {chapter4.title}')

        # =============================================
        # Lesson 4.1 - What is Python?
        # =============================================
        lesson_4_1 = self._create_lesson(book, chapter4, {
            'code': '4.1',
            'title': 'What is Python?',
            'content': '''<p>Python is a programming language used to create websites, games, apps, and much more. It's popular because it's simple and easy to read which makes it a great language for beginners.</p>

<h3>Why Learn Python?</h3>
<ul>
<li>Python is used by companies like Google, YouTube, and NASA.</li>
<li>It's a great way to learn how to think like a programmer by writing instructions (called code) that the computer can follow.</li>
</ul>''',
        })

        # =============================================
        # Lesson 4.2 - Basics of Python
        # =============================================
        lesson_4_2 = self._create_lesson(book, chapter4, {
            'code': '4.2',
            'title': 'Basics of Python',
            'content': '''<h3>Print Function</h3>
<p><strong>Syntax:</strong> print(). Print function is used to display Text, numbers, etc.</p>
<p>We will use the print function a lot in this Chapter.</p>

<h3>Syntax</h3>
<ul>
<li>Syntax is like a magic spell.</li>
<li>You have to write the code exactly the right way for it to work.</li>
<li>If something is out of place, the computer won't understand, and the program won't run.</li>
</ul>

<p>For example, in Python:</p>
<ul>
<li><strong>Correct Syntax:</strong> print("Hello, world!")</li>
<li><strong>Incorrect Syntax:</strong> print("Hello, world!</li>
</ul>''',
        })

        # =============================================
        # Lesson 4.3 - Using Google Colab
        # =============================================
        lesson_4_3 = self._create_lesson(book, chapter4, {
            'code': '4.3',
            'title': 'Using Google Colab for Python Programming',
            'content': '''<p>To start coding in Python, we will use an online platform called Google Colab. Google Colab allows you to write and run your code directly in the browser without installing anything.</p>

<ol>
<li><strong>Open Google Colab:</strong> Go to the website: https://colab.research.google.com. If you don't have an account, you can sign up for free.</li>
<li><strong>Create a New Python Project:</strong> Once you're logged in, click on File. Click on "New notebook in Drive". You will see a blank page where you can start writing your Python code. This page is called Notebook.</li>
</ol>''',
        })

        # =============================================
        # Lesson 4.4 - Writing Your First Python Program
        # =============================================
        lesson_4_4 = self._create_lesson(book, chapter4, {
            'code': '4.4',
            'title': 'Writing Your First Python Program',
            'content': '''<p>The first program you will write is a "Hello, World!" program.</p>''',
        })

        self._create_activity(book, lesson_4_4, {
            'code': '4.4.class.1',
            'title': 'Class Activity 1: "Hello, World!" Program',
            'activity_blocks': [{
                'type': 'class_activity',
                'title': 'Class Activity 1: "Hello, World!" Program',
                'introduction': 'Let\'s write your first Python program!',
                'steps': [
                    {'number': 1, 'title': 'Type the Code', 'content': 'In the notebook, Type the following code: print("Hello, World!")'},
                    {'number': 2, 'title': 'Run the Program', 'content': 'Click the Run button at the left of the cell. OR Use Ctrl+Enter. You should see the words "Hello, World!" appear on the right side of the screen.'},
                ],
                'challenge': 'Congratulations! You just wrote and ran your first Python program!',
                'order': 0,
            }],
        })

        # =============================================
        # Lesson 4.5 - Variables in Python
        # =============================================
        lesson_4_5 = self._create_lesson(book, chapter4, {
            'code': '4.5',
            'title': 'Variables in Python',
            'content': '''<p>Variables are like magic boxes where you can keep your favorite things! You can name the box and put something inside it.</p>

<h3>Type of Variables</h3>
<ul>
<li>If you put numbers in the box, it becomes a number box (e.g., age = 10).</li>
<li>If you put words in the box, it becomes a word box (e.g., name = "Alice").</li>
</ul>''',
        })

        self._create_activity(book, lesson_4_5, {
            'code': '4.5.class.1',
            'title': 'Class Activity 2: Let us make some Boxes',
            'activity_blocks': [{
                'type': 'class_activity',
                'title': 'Class Activity 2: Let us make some Boxes',
                'introduction': 'Let\'s create variables in Python!',
                'steps': [
                    {'number': 1, 'title': 'Example 1: A number box', 'content': 'In the code cell, Type the following code: age = 10. Then type: print("Age:", age). Click the Run button at the left of the cell. OR Use Ctrl + Enter.'},
                    {'number': 2, 'title': 'Example 2: A word box', 'content': 'In the code cell, Type the following code: name="Alice". Then type: print("Name:", name). Click the Run button at the left of the cell. OR Use Ctrl + Enter.'},
                ],
                'challenge': '',
                'order': 0,
            }],
        })

        # =============================================
        # Lesson 4.6 - More about Variables
        # =============================================
        lesson_4_6 = self._create_lesson(book, chapter4, {
            'code': '4.6',
            'title': 'More about Variables',
            'content': '''<p>Let's explore more examples of variables!</p>

<h3>Example 3: Storing your height</h3>
<p>In the code cell, Type the following code: height = 5. Then: print("Height:", height). Click the Run button.</p>

<h3>Example 4: Combining variables in a message</h3>
<p>In the code cell, Type the following code:</p>
<ul>
<li>age = 8</li>
<li>friend = "Bob"</li>
<li>print("My friend", friend, "is", age, "years old.")</li>
</ul>
<p>Click the Run button at the left of the cell. OR Use Ctrl + Enter.</p>''',
        })

        self._create_activity(book, lesson_4_6, {
            'code': '4.6.home.1',
            'title': 'Home Activity 1: Variables',
            'activity_blocks': [{
                'type': 'home_activity',
                'title': 'Home Activity 1: Variables',
                'introduction': 'Write a code on a paper showing 2 variables. Draw the variables on a paper and write its value.',
                'steps': [],
                'challenge': 'Example variables provided: Name, Ali, Age, 24',
                'order': 0,
            }],
        })

        # =============================================
        # Lesson 4.7 - Mathematics in Python
        # =============================================
        lesson_4_7 = self._create_lesson(book, chapter4, {
            'code': '4.7',
            'title': 'Mathematics in Python',
            'content': '''<p>Python can also help you do math. You can use the print() function to add numbers and display the result.</p>''',
        })

        self._create_activity(book, lesson_4_7, {
            'code': '4.7.class.1',
            'title': 'Class Activity 3: Add Two Numbers Using Python',
            'activity_blocks': [{
                'type': 'class_activity',
                'title': 'Class Activity 3: Add Two Numbers Using Python',
                'introduction': 'Let\'s do math with Python!',
                'steps': [
                    {'number': 1, 'title': 'Open Google Colab', 'content': 'Open a new notebook.'},
                    {'number': 2, 'title': 'Type the Code', 'content': 'Type the following code: print(3+5)'},
                    {'number': 3, 'title': 'Run the Program', 'content': 'Click the Run button again. You should see results below the code block (e.g. 8).'},
                    {'number': 4, 'title': 'Try More Math', 'content': 'Use the print() function to try subtraction, multiplication, and division: print(10-4), print(6 * 7), print(12/3)'},
                ],
                'challenge': '',
                'order': 0,
            }],
        })

        self._create_activity(book, lesson_4_7, {
            'code': '4.7.home.1',
            'title': 'Home Activity 2: Some Mathematics',
            'activity_blocks': [{
                'type': 'home_activity',
                'title': 'Home Activity 2: Some Mathematics',
                'introduction': 'Compare Python with Calculator:',
                'steps': [
                    {'number': 1, 'title': 'Calculator', 'content': 'Add 2 numbers of your choice using a calculator.'},
                    {'number': 2, 'title': 'Python', 'content': 'Add the same number using a Python script.'},
                    {'number': 3, 'title': 'Compare', 'content': 'See if the results are the same?'},
                ],
                'challenge': '',
                'order': 0,
            }],
        })

        # =============================================
        # Lesson 4.8 - Some More Codes
        # =============================================
        lesson_4_8 = self._create_lesson(book, chapter4, {
            'code': '4.8',
            'title': 'Some More Codes',
            'content': '''<p>For practice purposes, run the following codes in your notebooks.</p>''',
        })

        self._create_activity(book, lesson_4_8, {
            'code': '4.8.class.1',
            'title': 'Class Activity 4: More Coding Practice',
            'activity_blocks': [{
                'type': 'class_activity',
                'title': 'Class Activity 4: More Coding Practice',
                'introduction': 'Practice these Python examples:',
                'steps': [
                    {'number': 1, 'title': 'Example 1: Show a simple message', 'content': 'print("Hello, Python!")'},
                    {'number': 2, 'title': 'Example 2: Mix of words and variable', 'content': 'name="Charlie"\nage=12\nprint("My name is", name, "and I am", age, "years old.")'},
                    {'number': 3, 'title': 'Example 3: Printing a math result', 'content': 'result = 5+3\nprint("The result of 5+3 is", result)'},
                    {'number': 4, 'title': 'Example 4: Printing a fun pattern', 'content': 'print("*")\nprint("***")\nprint("*****")'},
                ],
                'challenge': '',
                'order': 0,
            }],
        })

        self._create_activity(book, lesson_4_8, {
            'code': '4.8.home.1',
            'title': 'Home Activity 3: Use Print Function',
            'activity_blocks': [{
                'type': 'home_activity',
                'title': 'Home Activity 3: Use Print Function',
                'introduction': 'Use variables to store:',
                'steps': [
                    {'number': 1, 'title': 'Variables', 'content': 'Your name, Father\'s name, Mother\'s name'},
                    {'number': 2, 'title': 'Print', 'content': 'In the next code block print the line: My name is ---, My father name is ---, My mother name is ---.'},
                ],
                'challenge': '',
                'order': 0,
            }],
        })

        # =============================================
        # Lesson 4.9 - Chapter Wrap-Up
        # =============================================
        lesson_4_9 = self._create_lesson(book, chapter4, {
            'code': '4.9',
            'title': 'Chapter Wrap-Up',
            'content': '''<h2>You did amazing, Koder Kids!</h2>

<p>In this chapter, you:</p>
<ul>
<li>Wrote real Python code.</li>
<li>Printed messages and numbers.</li>
<li>Used variables.</li>
<li>Solved math problems.</li>
</ul>

<h3>Next Up</h3>
<p>Time to make awesome slides in PowerPoint!</p>

<p><strong>Fun Fact:</strong> Python is used to make video games, websites, and even space programs!</p>''',
        })

        self.stdout.write(self.style.SUCCESS(f'\nSuccessfully imported Chapter 4!'))

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
