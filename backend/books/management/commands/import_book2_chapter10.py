"""
Import Book 2 Chapter 10: AI for Audio Creation
Run: python manage.py import_book2_chapter10
"""
from django.core.management.base import BaseCommand
from books.models import Book, Topic


class Command(BaseCommand):
    help = 'Import Book 2 Chapter 10 content'

    def handle(self, *args, **options):
        book = self._get_book()
        if not book:
            return

        self.stdout.write(f'Found book: {book.title} (ID: {book.id})')

        # Chapter 10
        chapter10, created = Topic.objects.update_or_create(
            book=book,
            code='10',
            defaults={
                'title': 'AI for Audio Creation',
                'type': 'chapter',
                'parent': None,
                'content': '''<h2>Welcome to AI Audio!</h2>
<p>AI can make music and sounds, just like it makes images (Chapter 6)! In this chapter, you'll use Chrome Music Lab to explore sounds and Suno AI to create songs with prompts. It's like being a DJ with a smart computer helper!</p>

<h3>What is AI Audio?</h3>
<p>Using AI to make music, sounds, or voices from your ideas.</p>

<h3>Why Learn AI Audio?</h3>
<p>Create songs for school projects, festivals, or fun!</p>

<h3>Activity Preview:</h3>
<p>You'll make sounds and songs today!</p>

<h3>Instructions:</h3>
<p>Ask an adult to help you access Chrome Music Lab and Suno AI.</p>''',
            }
        )
        self.stdout.write(f'{"Created" if created else "Updated"} Chapter 10')

        # Lesson 10.1
        self._create_lesson(book, chapter10, {
            'code': '10.1',
            'title': 'Exploring Chrome Music Lab',
            'content': '''<p>Chrome Music Lab is a fun website where you can make music by clicking and dragging! It's like a playground for sounds, perfect for beginners before we use AI.</p>

<h3>What is Chrome Music Lab?</h3>
<p>A free website by Google with music experiments.</p>

<h3>Key Experiments:</h3>
<ul>
<li>Song Maker: Create melodies and beats.</li>
<li>Rhythm: Tap out drum patterns.</li>
<li>Melody Maker: Draw tunes with your mouse.</li>
</ul>

<p><strong>Fun Fact:</strong> Chrome Music Lab works on any device with a browser!</p>

<h3>Activity Preview:</h3>
<p>You'll create a melody next.</p>''',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 1: Create a Melody in Song Maker',
                    'introduction': "Let's make a simple melody using Chrome Music Lab's Song Maker! You'll click to add notes.",
                    'steps': [
                        {'number': 1, 'title': 'Open Website', 'content': 'Go to musiclab.chromeexperiments.com (with adult help).'},
                        {'number': 2, 'title': 'Open Song Maker', 'content': 'Click on "Song Maker" to open the experiment.'},
                        {'number': 3, 'title': 'Add Notes', 'content': 'Click on the grid to add notes - higher rows are higher sounds.'},
                        {'number': 4, 'title': 'Add Beats', 'content': 'Click on the bottom section to add drum beats.'},
                        {'number': 5, 'title': 'Play Song', 'content': 'Press the Play button to hear your melody!'},
                        {'number': 6, 'title': 'Save Link', 'content': 'Click "Save" to get a link you can share.'},
                    ],
                    'challenge': 'Try to create a melody that sounds like "Twinkle Twinkle Little Star"!',
                    'order': 0,
                },
                {
                    'type': 'home_activity',
                    'title': 'Home Activity 1',
                    'introduction': 'Create a melody and share the link with your family.',
                    'steps': [],
                    'order': 1,
                },
            ],
        })

        # Lesson 10.2
        self._create_lesson(book, chapter10, {
            'code': '10.2',
            'title': 'Introduction to Suno AI',
            'content': '''<p>Suno AI is like ChatGPT for music! You type a prompt describing what you want, and it creates a song for you. It can make any style, from pop to classical to Pakistani music!</p>

<h3>What is Suno AI?</h3>
<p>An AI tool that creates songs from text prompts.</p>

<h3>Why Use Suno?</h3>
<p>Make professional-sounding music without any instruments!</p>

<h3>Example Prompts:</h3>
<ul>
<li>"A happy birthday song for a kid"</li>
<li>"A peaceful melody about the moon"</li>
<li>"An upbeat Pakistani celebration song"</li>
</ul>

<h3>Activity Preview:</h3>
<p>You'll create your first AI song next.</p>

<p><strong>Parent Tip:</strong> Help your child sign up for Suno AI safely!</p>''',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 2: Create Your First AI Song',
                    'introduction': "Let's use Suno AI to create a simple song! You'll write a prompt and hear AI music.",
                    'steps': [
                        {'number': 1, 'title': 'Open Suno', 'content': 'Go to suno.ai (with adult help) and sign in.'},
                        {'number': 2, 'title': 'Click Create', 'content': 'Click the "Create" button to start making music.'},
                        {'number': 3, 'title': 'Write Prompt', 'content': 'Type a prompt: "A happy song about playing in the park"'},
                        {'number': 4, 'title': 'Generate Song', 'content': 'Click "Create" and wait for the AI to generate your song.'},
                        {'number': 5, 'title': 'Listen', 'content': 'Listen to the song - does it match your prompt?'},
                        {'number': 6, 'title': 'Download', 'content': 'Download the song if you like it!'},
                    ],
                    'challenge': 'Try a prompt about your favorite Pakistani place!',
                    'order': 0,
                },
                {
                    'type': 'home_activity',
                    'title': 'Home Activity 2',
                    'introduction': 'Create an AI song for a family member\'s birthday.',
                    'steps': [],
                    'order': 1,
                },
            ],
        })

        # Lesson 10.3
        self._create_lesson(book, chapter10, {
            'code': '10.3',
            'title': 'Creating Songs with Detailed Prompts',
            'content': '''<p>Just like AI images (Chapter 6), detailed prompts make better songs! Add style, mood, instruments, and tempo to get exactly what you want.</p>

<h3>Prompt Elements:</h3>
<ul>
<li>Style: pop, classical, folk, rock</li>
<li>Mood: happy, sad, peaceful, energetic</li>
<li>Instruments: piano, guitar, drums, flute</li>
<li>Tempo: slow, medium, fast</li>
</ul>

<h3>Example:</h3>
<p>"A slow, peaceful classical song with piano about a sunset in Karachi"</p>

<h3>Activity Preview:</h3>
<p>You'll create a detailed song next.</p>

<p><strong>DIY Idea:</strong> Combine your AI song with a Canva presentation (Chapter 8)!</p>''',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 3: Create a Detailed AI Song',
                    'introduction': "Let's make a better song with a detailed prompt! You'll specify style, mood, and more.",
                    'steps': [
                        {'number': 1, 'title': 'Open Suno', 'content': 'Go to suno.ai and click "Create."'},
                        {'number': 2, 'title': 'Write Detailed Prompt', 'content': 'Type: "An upbeat, happy pop song with guitar about flying kites at Basant festival"'},
                        {'number': 3, 'title': 'Generate Song', 'content': 'Click "Create" and wait for the AI.'},
                        {'number': 4, 'title': 'Compare', 'content': 'Compare this song to your first one - is it better?'},
                        {'number': 5, 'title': 'Try Another', 'content': 'Try another prompt: "A slow, peaceful song with flute about the Indus River"'},
                        {'number': 6, 'title': 'Save Favorites', 'content': 'Download your favorite songs!'},
                    ],
                    'challenge': 'Create a song in two different styles and compare them!',
                    'order': 0,
                },
                {
                    'type': 'home_activity',
                    'title': 'Home Activity 3',
                    'introduction': 'Create an AI song about a Pakistani festival with detailed prompts.',
                    'steps': [],
                    'order': 1,
                },
            ],
        })

        # Lesson 10.4
        self._create_lesson(book, chapter10, {
            'code': '10.4',
            'title': 'Building an Audio Project',
            'content': '''<p>Combine your skills to create complete audio projects! You will mix melodies, effects, and songs to make a podcast intro or story soundtrack.</p>

<h3>What is an Audio Project?</h3>
<p>A mix of sounds for stories or presentations.</p>

<h3>Example:</h3>
<p>A podcast intro with music and effects!</p>

<h3>Class Activity Preview:</h3>
<p>You'll add sounds to a story next.</p>

<p><strong>DIY Idea:</strong> Act out the story with your sounds!</p>''',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 4: Create a Market Sound Story',
                    'introduction': "Let's make a market story with sounds! You'll create a melody and effect for a tale, like in Chapter 9's robot story.",
                    'steps': [
                        {'number': 1, 'title': 'Open Song Maker', 'content': 'Open www.musiclab.chromeexperiments.com and click "Song Maker."'},
                        {'number': 2, 'title': 'Create Melody', 'content': 'Make a short melody (4-5 blocks) for a market tune.'},
                        {'number': 3, 'title': 'Save Melody', 'content': 'Save the melody link.'},
                        {'number': 4, 'title': 'Create Effect', 'content': 'Make a "ding" effect (2-3 blocks, fast notes) for a cart.'},
                        {'number': 5, 'title': 'Save Effect', 'content': 'Save the effect link.'},
                        {'number': 6, 'title': 'Write Story', 'content': 'Write a story sentence: "I heard music and a cart in the market!"'},
                    ],
                    'challenge': 'Add a Pakistani detail, like "in Anarkali Bazaar."',
                    'order': 0,
                },
                {
                    'type': 'home_activity',
                    'title': 'Home Activity 4',
                    'introduction': 'Add sounds to a family story at home.',
                    'steps': [],
                    'order': 1,
                },
            ],
        })

        # Lesson 10.5
        self._create_lesson(book, chapter10, {
            'code': '10.5',
            'title': 'Building an Audio Project',
            'content': '''<p>Let's combine all your skills! You'll create a podcast intro with music and effects, like a radio show for your class, using both AI tools.</p>

<h3>What's a Podcast Intro?</h3>
<p>A short audio to start a talk show.</p>

<h3>Example:</h3>
<p>"Welcome to my Eid show!" with music.</p>

<h3>Activity:</h3>
<p>Make a podcast intro.</p>''',
            'activity_blocks': [
                {
                    'type': 'class_activity',
                    'title': 'Class Activity 5: Design a Podcast Intro',
                    'introduction': "Let's make a podcast intro for an Eid show! You'll mix a melody and a jingle for a cool opening.",
                    'steps': [
                        {'number': 1, 'title': 'Open Song Maker', 'content': 'Go to www.musiclab.chromeexperiments.com and click "Song Maker."'},
                        {'number': 2, 'title': 'Create Melody', 'content': 'Create a 5-block melody with a "Piano" instrument.'},
                        {'number': 3, 'title': 'Save Melody', 'content': 'Save the melody link.'},
                        {'number': 4, 'title': 'Create Jingle', 'content': 'Go to www.suno.ai and type: "A fun jingle for an Eid podcast."'},
                        {'number': 5, 'title': 'Save Jingle', 'content': 'Save the jingle MP3 (ask an adult).'},
                        {'number': 6, 'title': 'Write Intro', 'content': 'Write: "Welcome to my Eid Podcast!" to say with your sounds.'},
                    ],
                    'challenge': 'Add "from Lahore!" to your jingle prompt.',
                    'order': 0,
                },
                {
                    'type': 'home_activity',
                    'title': 'Home Activity 5',
                    'introduction': 'Create a podcast intro for a Basant festival.',
                    'steps': [],
                    'order': 1,
                },
            ],
        })

        # Chapter 10 Summary and Final Home Activity
        self._create_lesson(book, chapter10, {
            'code': '10.S',
            'title': 'Chapter 10 Summary and Final Home Activity',
            'content': '''<h2>You're an AI Audio Star! You:</h2>

<p><strong>10.1:</strong> Made melodies and effects with Chrome Music Lab.</p>
<p><strong>10.2:</strong> Created songs and jingles with Suno AI.</p>
<p><strong>10.3:</strong> Added sounds to stories and a podcast intro.</p>
<p><strong>10.4:</strong> Built audio projects with market sounds.</p>
<p><strong>10.5:</strong> Designed podcast intros combining both tools.</p>

<h3>Skills You Learned:</h3>
<ul>
<li>Using Chrome Music Lab's Song Maker</li>
<li>Creating melodies, beats, and sound effects</li>
<li>Writing prompts for AI music with Suno AI</li>
<li>Understanding style, mood, and tempo</li>
<li>Building complete audio projects</li>
<li>Creating podcast intros</li>
</ul>

<h3>What's Next?</h3>
<p>In Chapter 11, you'll learn about automation and making computers work together with n8n!</p>''',
            'activity_blocks': [
                {
                    'type': 'home_activity',
                    'title': 'Final Home Activity: Make a Festival Sound',
                    'introduction': "Create a complete festival soundtrack combining Chrome Music Lab and Suno AI!",
                    'steps': [
                        {'number': 1, 'title': 'Open Song Maker', 'content': 'Open www.musiclab.chromeexperiments.com and click "Song Maker."'},
                        {'number': 2, 'title': 'Create Melody', 'content': 'Create a melody for a Mela Chiraghan festival (6 blocks).'},
                        {'number': 3, 'title': 'Save Link', 'content': 'Save the link.'},
                        {'number': 4, 'title': 'Create AI Song', 'content': 'Go to www.suno.ai and type: "A song about Mela Chiraghan lamps."'},
                        {'number': 5, 'title': 'Save MP3', 'content': 'Save the MP3.'},
                    ],
                    'challenge': 'Share your festival sound with your teacher!',
                    'order': 0,
                },
            ],
        })

        self.stdout.write(self.style.SUCCESS('\nSuccessfully imported Chapter 10!'))

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
