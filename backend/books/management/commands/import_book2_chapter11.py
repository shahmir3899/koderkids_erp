"""
Import Book 2 Chapter 11: Introduction to Automation with n8n
Run: python manage.py import_book2_chapter11
"""
from django.core.management.base import BaseCommand
from books.models import Book, Topic


class Command(BaseCommand):
    help = 'Import Book 2 Chapter 11 content'

    def handle(self, *args, **options):
        book = self._get_book()
        if not book:
            return

        self.stdout.write(f'Found book: {book.title} (ID: {book.id})')

        # Chapter 11
        chapter11, created = Topic.objects.update_or_create(
            book=book,
            code='11',
            defaults={
                'title': 'Making Computers Work Together with n8n',
                'type': 'chapter',
                'parent': None,
                'content': '''<h2>Welcome to Automation Magic!</h2>
<p>Get ready to make computers do amazing things for you! In Book 1, you learned simple coding. Now, you'll learn how to teach different computer programs (like your email app, or a game app) to talk to each other and do tasks automatically! We'll explore an idea called "automation" using a tool called n8n (say "n-eight-n"). It's like building smart chains for your computer, just like connecting different parts of a train! Let's get started!</p>

<h3>What is Automation?</h3>
<p>It's when computers do tasks by themselves, following rules you set, so you don't have to do them every time.</p>

<h3>Why Learn Automation?</h3>
<p>You can create exciting projects, like having your computer send you a message when your favorite show starts!</p>

<h3>Chapter Preview:</h3>
<p>You'll learn about starting points (triggers), what happens next (actions), connecting different computer tools, and planning your own automation.</p>

<h3>Instructions:</h3>
<p>Ask an adult to help you visit www.n8n.io to see what the n8n website looks like and explore its visual workflow builder. This chapter focuses on understanding how automation works, so you won't need to sign up for an account or install anything for now - we're learning the ideas behind it!</p>''',
            }
        )
        self.stdout.write(f'{"Created" if created else "Updated"} Chapter 11')

        # Lesson 11.1
        self._create_lesson(book, chapter11, {
            'code': '11.1',
            'title': 'Understanding "Triggers" and "Actions"',
            'content': '''<p>Every automatic task starts with something happening, and then something else happens! Imagine a domino effect: one domino falls (Trigger), and it makes another domino fall (Action). In computers, a Trigger is the event that starts an automation, and an Action is what the computer does because of that trigger. Good planning of triggers and actions helps your automation work perfectly, just like planning all the steps for cooking a delicious biryani!</p>

<h3>Why Focus on Triggers & Actions?</h3>
<p>They are the two main parts of every automation chain.</p>

<h3>Key Tip:</h3>
<ul>
<li>An automation always starts with a Trigger (the "if this..." part).</li>
<li>An Action is what you want the computer to do (the "...then that" part).</li>
</ul>

<p><strong>Fun Fact:</strong> When you get an email, your phone showing a notification is an automation (email arriving is the trigger, notification is the action)!</p>

<h3>Class Activity Preview:</h3>
<p>You'll identify triggers and actions in simple stories next.</p>''',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 1: Identify Triggers and Actions',
                    'introduction': "Let's find triggers and actions in everyday stories! Your teacher will read stories and you'll identify what starts the action.",
                    'steps': [
                        {'number': 1, 'title': 'Read the Story', 'content': 'Your teacher or an adult will read a short story or describe a situation.'},
                        {'number': 2, 'title': 'Find the Trigger', 'content': 'Listen carefully for what starts the event. What is the "if this..."?'},
                        {'number': 3, 'title': 'Find the Action', 'content': 'Listen for what happens next because of the trigger. What is the "...then that" or "...then this happens"?'},
                    ],
                    'challenge': 'Think of your own simple everyday event. What is the trigger and what is the action?',
                    'order': 0,
                },
                {
                    'type': 'home_activity',
                    'title': 'Home Activity 1',
                    'introduction': 'With a parent, find one trigger and action pair in your home routine (e.g., "When the alarm rings, I wake up," or "When the doorbell rings, the dog barks").',
                    'steps': [],
                    'order': 1,
                },
            ],
        })

        # Lesson 11.2
        self._create_lesson(book, chapter11, {
            'code': '11.2',
            'title': 'Building Simple Computer Chains (Workflows)',
            'content': '''<p>Just like you can link many dominoes to create a long chain, you can link many triggers and actions to create a workflow! A workflow is a series of steps where one computer task leads to another. These chains make your computer do many things automatically, one after the other.</p>

<h3>What's a Chain/Workflow?</h3>
<p>It's a series of connected steps that make computers do multiple tasks automatically, like a path from start to finish.</p>

<h3>How to Build a Chain?</h3>
<p>You start with a trigger, then connect it to an action, and that action can lead to another action, and so on!</p>

<h3>Class Activity Preview:</h3>
<p>You'll draw your first computer workflow chain next.</p>

<p><strong>Parent Tip:</strong> Discuss real-life "chains" with your child (e.g., "If I put my dirty clothes in the basket, then the washing machine washes them, then they get dried, then I fold them").</p>''',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 2: Draw Your First Computer Chain',
                    'introduction': "Let's design a simple computer chain (workflow)! You'll draw out the steps for a computer to follow for a fun task.",
                    'steps': [
                        {'number': 1, 'title': 'Get Ready', 'content': 'Get a piece of paper and a pencil, or open a simple drawing app on your computer.'},
                        {'number': 2, 'title': 'Choose a Goal', 'content': 'We want to automate this: "When my favorite online video game is ready to play, send me a message on my tablet."'},
                        {'number': 3, 'title': 'Draw the Trigger', 'content': 'Draw a box or circle. Inside, write: "Trigger: Game Ready" (You can draw a small game controller icon!).'},
                        {'number': 4, 'title': 'Draw the First Action', 'content': 'Draw another box or circle. Inside, write: "Action 1: Find Game Link" (Draw a small magnifying glass icon!).'},
                        {'number': 5, 'title': 'Draw the Second Action', 'content': 'Draw a third box or circle. Inside, write: "Action 2: Send Message to Tablet" (Draw a small message bubble icon!).'},
                        {'number': 6, 'title': 'Connect Them', 'content': 'Draw arrows from the "Trigger" box to "Action 1," and from "Action 1" to "Action 2." This shows the chain!'},
                    ],
                    'challenge': 'Add a new action to your chain: "If the game is a new update, also send a message to my friend!" (This introduces a simple "if/then" idea).',
                    'order': 0,
                },
                {
                    'type': 'home_activity',
                    'title': 'Home Activity 2',
                    'introduction': 'Draw a simple chain (workflow) for how your favorite app works from when you open it to when it does something cool (e.g., "When I open YouTube, it loads my profile, then it shows new videos").',
                    'steps': [],
                    'order': 1,
                },
            ],
        })

        # Lesson 11.3
        self._create_lesson(book, chapter11, {
            'code': '11.3',
            'title': 'Connecting Different Computer "Tools" (Apps)',
            'content': '''<p>Automation is super powerful because it can make many different computer programs, or "apps," work together! n8n helps these different "tools" share information and tasks, just like different instruments playing together in an orchestra. You can connect your email app to a messaging app, or a weather app to a calendar app! You'll try to imagine connecting these tools next!</p>

<h3>Why Connect Tools?</h3>
<p>To make different computer programs work as a team, so you don't have to copy-paste information or jump between apps!</p>

<h3>Example:</h3>
<p>Connect an online photo album to a friend's sharing app.</p>

<h3>Class Activity Preview:</h3>
<p>You'll imagine connecting different apps.</p>

<p><strong>DIY Idea:</strong> Think about two apps you use often. What would happen if they could talk to each other? What new cool thing could they do?</p>''',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 3: Imagine Connecting Your Favorite Apps',
                    'introduction': "Let's be super creative and imagine connecting our favorite computer apps to do something new!",
                    'steps': [
                        {'number': 1, 'title': 'Pick Your Apps', 'content': 'Choose 2 or 3 of your favorite computer apps or online tools (e.g., a drawing app, a game, a music player, a video chat app, a calendar app).'},
                        {'number': 2, 'title': 'Choose a Trigger App', 'content': 'Decide which app will be the Trigger (the one that starts the automation).'},
                        {'number': 3, 'title': 'Choose Action Apps', 'content': 'Decide what other apps will do the Actions.'},
                        {'number': 4, 'title': 'Draw Your Idea', 'content': 'Draw each chosen app as a box. You can draw their logos inside! Draw arrows showing how you would want them to share information or trigger actions. Write a simple sentence explaining what your automation does!'},
                    ],
                    'challenge': 'Add a decision step: "If it\'s raining, then send message: \'Let\'s play indoor games!\'" (This is like an "if/then" rule within your workflow).',
                    'order': 0,
                },
                {
                    'type': 'home_activity',
                    'title': 'Home Activity 3: Make a Festival Folder',
                    'introduction': 'Create a pixel art picture about your family or a pixelated scene of your favorite family activity (e.g., a pixel picnic, a pixel game night, or a pixel picture of your family in traditional Pakistani clothes). Save it as a .pixil file or export it as a .png image.',
                    'steps': [],
                    'order': 1,
                },
            ],
        })

        # Lesson 11.4
        self._create_lesson(book, chapter11, {
            'code': '11.4',
            'title': 'Planning a 5-Step Computer Automation Project',
            'content': '''<p>Now combine all your new knowledge to plan your very own computer automation! You'll create a simple 5-step plan for an automation project, like writing down all the ingredients and steps before you bake a cake. This is like outlining a story on Google Drive (Chapter 7).</p>

<h3>What's an Automation Project?</h3>
<p>It's an idea for how to use triggers, actions, and connected apps to make a computer do a helpful task automatically.</p>

<h3>Example:</h3>
<p>An automation that tells you when your favorite game has a new update, or when a friend posts a new drawing online.</p>

<h3>Class Activity Preview:</h3>
<p>You'll plan your own 5-step automation idea next.</p>

<p><strong>Parent Tip:</strong> Discuss simple ways automation could help in your family's daily life!</p>''',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 4: Plan Your Automation Invention',
                    'introduction': "Let's create a 5-step plan for an amazing automation invention you can imagine! You'll use all your n8n-thinking skills to make it awesome.",
                    'steps': [
                        {'number': 1, 'title': 'The Goal', 'content': 'What problem do you want your automation to solve, or what cool thing do you want it to do? Example: "I want to know immediately when my favorite online cartoon updates."'},
                        {'number': 2, 'title': 'The Trigger', 'content': 'What event will start your automation? Example: "The cartoon website updates."'},
                        {'number': 3, 'title': 'The First Action', 'content': 'What\'s the very first thing the computer does? Example: "The computer checks the cartoon website for new pictures."'},
                        {'number': 4, 'title': 'The Second Action', 'content': 'What else does the computer do after that? Example: "If there are new pictures, the computer sends a message to my parents\' phone, saying \'New comic!\'"'},
                        {'number': 5, 'title': 'The Final Result', 'content': 'What\'s the final cool thing that happens because of your automation? Example: "My parents tell me right away, and I get to read the new comic without even looking for it!"'},
                    ],
                    'challenge': 'Add a "smart" decision to your plan. Example: "If it\'s past bedtime, don\'t send the message, just save the link for tomorrow!"',
                    'order': 0,
                },
                {
                    'type': 'home_activity',
                    'title': 'Home Activity 4',
                    'introduction': 'Share your automation idea with your family and explain how it would help make life easier!',
                    'steps': [],
                    'order': 1,
                },
            ],
        })

        # Chapter 11 Summary
        self._create_lesson(book, chapter11, {
            'code': '11.S',
            'title': 'Chapter 11 Summary',
            'content': '''<h2>You're an Automation Expert!</h2>

<p><strong>11.1:</strong> Understanding "Triggers" and "Actions" - learned how automations start with triggers and respond with actions.</p>
<p><strong>11.2:</strong> Building Simple Computer Chains (Workflows) - created workflow diagrams connecting triggers to multiple actions.</p>
<p><strong>11.3:</strong> Connecting Different Computer "Tools" (Apps) - imagined how different apps can work together.</p>
<p><strong>11.4:</strong> Planning a 5-Step Computer Automation Project - designed your own automation invention.</p>

<h3>Skills You Learned:</h3>
<ul>
<li>Identifying triggers and actions in everyday situations</li>
<li>Drawing workflow chains with connected steps</li>
<li>Understanding how apps can communicate</li>
<li>Planning automation projects step by step</li>
<li>Adding "if/then" decisions to workflows</li>
</ul>

<h3>What's Next?</h3>
<p>In Chapter 12, you'll use these automation concepts with real robots using M3D GO!</p>''',
            'activity_blocks': [
                {
                    'type': 'challenge',
                    'title': 'Homework',
                    'introduction': 'Present your family pixel art to your parents and tell them the story behind it!',
                    'steps': [],
                    'order': 0,
                },
            ],
        })

        self.stdout.write(self.style.SUCCESS('\nSuccessfully imported Chapter 11!'))

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
