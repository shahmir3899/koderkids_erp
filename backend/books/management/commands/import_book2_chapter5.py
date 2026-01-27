"""
Import Book 2 Chapter 5: Python - Variables and Input
Run: python manage.py import_book2_chapter5
"""
from django.core.management.base import BaseCommand
from books.models import Book, Topic


class Command(BaseCommand):
    help = 'Import Book 2 Chapter 5 content'

    def handle(self, *args, **options):
        book = self._get_book()
        if not book:
            return

        self.stdout.write(f'Found book: {book.title} (ID: {book.id})')

        # Chapter 5
        chapter5, created = Topic.objects.update_or_create(
            book=book,
            code='5',
            defaults={
                'title': 'Python: Variables and Input',
                'type': 'chapter',
                'parent': None,
                'content': '''<h2>Welcome to Python!</h2>
<p>Python is a fun coding language to create programs! In this chapter, you'll use Google Colab to store information with variables and make interactive programs, like asking someone's name. It's like telling a computer your story!</p>

<h3>What's Python?</h3>
<p>A language to give instructions to computers.</p>

<h3>Why Python?</h3>
<p>It's easy and used by coders worldwide!</p>

<h3>Chapter Preview:</h3>
<p>You'll store data, ask questions, make programs, and build a quiz.</p>

<h3>Instructions:</h3>
<p>Ask an adult to open colab.google.com.</p>''',
            }
        )
        self.stdout.write(f'{"Created" if created else "Updated"} Chapter 5')

        # Lesson 5.1
        self._create_lesson(book, chapter5, {
            'code': '5.1',
            'title': 'Introduction to Variables in Python',
            'content': '''<p>Variables are like boxes that hold information, such as numbers or names. You give the box a name and put data inside, like in Scratch's blocks (Chapter 3). Let's try it in Google Colab!</p>

<h3>What's a Variable?</h3>
<p>A named box for storing data, e.g. "score = 10."</p>

<h3>Why Use Variables?</h3>
<p>Save data to use later, like a game score.</p>

<p><strong>Fun Fact:</strong> Python is named after a funny TV show, not a snake!</p>

<h3>Class Activity Preview:</h3>
<p>You'll create a variable next.</p>''',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 1: Create a Number Variable',
                    'introduction': "Let's make a variable to store a number! You'll use Google Colab to create and show it, like storing a score in a game.",
                    'steps': [
                        {'number': 1, 'title': 'Open Google Colab', 'content': 'Open colab.google.com and sign in (with teacher help).'},
                        {'number': 2, 'title': 'Create New Notebook', 'content': 'Click "File" > "New notebook" to start a project.'},
                        {'number': 3, 'title': 'Create Variable', 'content': 'In the code cell, type: score = 10'},
                        {'number': 4, 'title': 'Print Variable', 'content': 'Below, type: print(score) to show the number.'},
                        {'number': 5, 'title': 'Run Code', 'content': 'Click the "Play" button (triangle) next to the cell to run.'},
                        {'number': 6, 'title': 'Change Value', 'content': 'Change 10 to 20 and run again.'},
                    ],
                    'challenge': 'Make a variable age = 8 and print it.',
                    'order': 0,
                },
                {
                    'type': 'home_activity',
                    'title': 'Home Activity 1',
                    'introduction': 'Create a variable for your roll number and print it.',
                    'steps': [],
                    'order': 1,
                },
            ],
        })

        # Lesson 5.2
        self._create_lesson(book, chapter5, {
            'code': '5.2',
            'title': 'Using input() to Get User Input',
            'content': '''<p>The input() function lets you ask users for information, like their name, and store it in a variable. It's like asking a friend a question! This makes programs interactive.</p>

<h3>What's input()?</h3>
<p>A way to get answers from users, e.g. "What's your name?"</p>

<h3>Why Use It?</h3>
<p>Make programs talk to people, like a chat.</p>

<h3>Class Activity Preview:</h3>
<p>You'll ask for a name next.</p>

<p><strong>Parent Tip:</strong> Type your name when your child runs the program!</p>''',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 2: Ask for a Name',
                    'introduction': "Let's ask for a name and say hello! You'll use input() in Google Colab to make an interactive program, building on variables.",
                    'steps': [
                        {'number': 1, 'title': 'Open Colab', 'content': 'Open a new notebook on colab.google.com.'},
                        {'number': 2, 'title': 'Ask for Name', 'content': 'In a code cell, type: name = input("What is your name? ")'},
                        {'number': 3, 'title': 'Say Hello', 'content': 'Below, type: print("Hello, " + name + "!")'},
                        {'number': 4, 'title': 'Run and Test', 'content': 'Click the "Play" button, type your name (e.g., "Ayesha") in the box, and press Enter.'},
                        {'number': 5, 'title': 'See Output', 'content': 'See the output, like "Hello, Ayesha!" Google colab automatically saves your notebook.'},
                        {'number': 6, 'title': 'Rename Notebook', 'content': 'You can rename the notebook name. Double click the name (above File Menu).'},
                    ],
                    'challenge': 'Add age = input("How old are you? ") and print "You are [age]! years old"',
                    'order': 0,
                },
                {
                    'type': 'home_activity',
                    'title': 'Home Activity 2',
                    'introduction': 'Make a program that asks for your favorite color and prints it.',
                    'steps': [],
                    'order': 1,
                },
            ],
        })

        # Lesson 5.3
        self._create_lesson(book, chapter5, {
            'code': '5.3',
            'title': 'Writing Programs with Variables and Input',
            'content': '''<p>Combine variables and input() to make fun programs! You'll ask for more information, like favorite foods, and create messages, like mixing Scratch's stories (Chapter 3). Let's code in Colab!</p>

<h3>What's a Program?</h3>
<p>Code that does something, like making a greeting.</p>

<h3>Example:</h3>
<p>Ask for a food and say "Yum!"</p>

<h3>Class Activity Preview:</h3>
<p>You'll make a food program next.</p>

<p><strong>DIY Idea:</strong> Write a list of your favorite foods to inspire your code!</p>''',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 3: Create a Food Program',
                    'introduction': "Let's make a program that asks for a name and favorite food! You'll use variables and input() in Google Colab to create a fun message.",
                    'steps': [
                        {'number': 1, 'title': 'Open Colab', 'content': 'Open a new notebook on colab.google.com.'},
                        {'number': 2, 'title': 'Ask for Name', 'content': 'In a code cell, type: name = input("What is your name? ")'},
                        {'number': 3, 'title': 'Ask for Food', 'content': 'Type: food = input("What is your favorite food? ")'},
                        {'number': 4, 'title': 'Print Message', 'content': 'Type: print(name, " loves ", food, "!")'},
                        {'number': 5, 'title': 'Run and Test', 'content': 'Click "Play," enter a name (e.g., "Bilal") and food (e.g., "biryani"), press Enter.'},
                        {'number': 6, 'title': 'See Result', 'content': 'See "Bilal loves biryani!".'},
                    ],
                    'challenge': 'Add color = input("Favorite color? ") and print it with food.',
                    'order': 0,
                },
                {
                    'type': 'home_activity',
                    'title': 'Home Activity 3',
                    'introduction': 'Create a program that asks for a favorite animal and prints a sentence about it.',
                    'steps': [],
                    'order': 1,
                },
            ],
        })

        # Lesson 5.4
        self._create_lesson(book, chapter5, {
            'code': '5.4',
            'title': 'Creating a Simple Quiz Program',
            'content': '''<p>Quizzes are exciting programs! You'll use variables, input(), and "if" conditions (like Tynker's conditions in Chapter 9) in Google Colab to ask questions and check answers.</p>

<h3>What's a Quiz?</h3>
<p>A program that asks questions and tells you if you're right.</p>

<h3>Example:</h3>
<p>Answer the quiz with your child for fun!</p>

<h3>Class Activity Preview:</h3>
<p>You'll build a quiz next.</p>

<p><strong>Parent Tip:</strong> "What's the capital of Pakistan?"</p>''',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 4: Code a Quiz Game',
                    'introduction': "Let's create a quiz! You'll ask a question, check the answer, and say if it's right, using all your Python skills in Google Colab.",
                    'steps': [
                        {'number': 1, 'title': 'Open Colab', 'content': 'Open a new notebook on colab.google.com.'},
                        {'number': 2, 'title': 'Create Question', 'content': 'In a code cell, type: question = "What is the capital of Pakistan?"'},
                        {'number': 3, 'title': 'Ask Question', 'content': 'Type: answer = input(question + " ")'},
                        {'number': 4, 'title': 'Check Answer', 'content': 'Type: if answer == "Islamabad": print("Correct!")'},
                        {'number': 5, 'title': 'Add Wrong Answer', 'content': 'Type: else: print("Oops, it\'s Islamabad.")'},
                        {'number': 6, 'title': 'Test Quiz', 'content': 'Click "Play," answer the question, see the result.'},
                    ],
                    'challenge': 'Add a second question, like "What is 5 + 5?" (answer: "10").',
                    'order': 0,
                },
                {
                    'type': 'home_activity',
                    'title': 'Home Activity 4',
                    'introduction': 'Make a quiz program with a question about a Pakistani festival.',
                    'steps': [],
                    'order': 1,
                },
            ],
        })

        # Chapter 5 Summary
        self._create_lesson(book, chapter5, {
            'code': '5.S',
            'title': 'Chapter 5 Summary and Final Home Activity',
            'content': '''<h2>You're a Python coder! You:</h2>

<p><strong>5.1:</strong> Created variables to store data.</p>
<p><strong>5.2:</strong> Used input() to ask questions.</p>
<p><strong>5.3:</strong> Made interactive programs with name and food.</p>
<p><strong>5.4:</strong> Built a quiz game with conditions.</p>''',
            'activity_blocks': [
                {
                    'type': 'home_activity',
                    'title': 'Home Activity 5',
                    'introduction': 'Code a program that asks for your favorite city in Pakistan and prints a fact about it. Share your quiz game with your family!',
                    'steps': [],
                    'order': 0,
                },
            ],
        })

        self.stdout.write(self.style.SUCCESS('\nSuccessfully imported Chapter 5!'))

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
