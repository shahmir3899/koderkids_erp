"""
Upload activity step images from a local folder to Supabase and update topic activity_blocks.

Usage:
  python manage.py upload_section_images "path/to/Chapter 1 Section 1.3"
  python manage.py upload_section_images "path/to/Chapter 1 Section 1.3" --dry-run
"""
import os
from django.core.management.base import BaseCommand
from django.core.files.uploadedfile import SimpleUploadedFile
from books.models import Book, Topic


# Mapping: image_filename -> (topic_code, block_index, step_index_or_'new')
# step_index is 0-based; 'new' means append a new step
IMAGE_MAPPING = {
    # ===================================================
    # CHAPTER 1, SECTION 1.3 — Paint (already uploaded)
    # ===================================================
    '2.png':  ('1.3.class.1', 0, 0),   # Step 1: Start Menu
    '3.png':  ('1.3.class.1', 0, 1),   # Step 2: Type Paint
    '4.png':  ('1.3.class.1', 0, 2),   # Step 3: Paint Interface
    '5.png':  ('1.3.class.1', 0, 'new', 'Tools Overview', 'Explore the tools: pencil, eraser, text, color picker, magnifier, brushes, shapes, and colors.'),

    '6.png':  ('1.3.class.2', 0, 0),   # Step 1: Select the Square Shape
    '7.png':  ('1.3.class.2', 0, 1),   # Step 2: Draw the Base of the House
    '8.png':  ('1.3.class.2', 0, 2),   # Step 3: Draw the Roof
    '9.png':  ('1.3.class.2', 0, 3),   # Step 4: Add Windows
    '10.png': ('1.3.class.2', 0, 4),   # Step 5: Draw the Door
    '11.png': ('1.3.class.2', 0, 5),   # Step 6: Color Your House
    '12.png': ('1.3.class.2', 0, 6),   # Step 7: Save Your Drawing

    '14.png': ('1.3.class.3', 0, 'new', 'Draw Shapes', 'Try drawing different shapes like triangles, diamonds, arrows, lightning bolts, and clouds!'),

    '16.png': ('1.3.class.4', 0, 0),   # Step 1: Body and Arms
    '17.png': ('1.3.class.4', 0, 1),   # Step 2: Eyes and Head
    '18.png': ('1.3.class.4', 0, 2),   # Step 3: Legs and Antenna
    '19.png': ('1.3.class.4', 0, 3),   # Step 4: Details
    '20.png': ('1.3.class.4', 0, 4),   # Step 5: Finish

    '22.png': ('1.3.class.5', 0, 0),   # Step 1: Open Text Tool
    '23.png': ('1.3.class.5', 0, 1),   # Step 2: Type Your Name
    '24.png': ('1.3.class.5', 0, 2),   # Step 3: Format Text
    '25.png': ('1.3.class.5', 0, 3),   # Step 4: Decorate

    # ===================================================
    # CHAPTER 1, SECTION 1.4 — Calculator
    # ===================================================
    '33.png': ('1.4.class.1', 0, 0),   # Step 1: Addition (8+5=13)
    '36.png': ('1.4.class.1', 0, 1),   # Step 2: Subtraction (10-3=7)
    '39.png': ('1.4.class.1', 0, 2),   # Step 3: Multiplication (6x4=24)
    '42.png': ('1.4.class.1', 0, 3),   # Step 4: Division (12/4=3)
    '32.png': ('1.4.class.2', 0, 0),   # Step 1: Addition (8+5=)
    '35.png': ('1.4.class.2', 0, 1),   # Step 2: Subtraction (10-3)
    '38.png': ('1.4.class.2', 0, 2),   # Step 3: Multiplication (6x4)
    '41.png': ('1.4.class.2', 0, 3),   # Step 4: Division (12/4)
    '43.png': ('1.4.class.4', 0, 0),   # Step 1: Solve (3x4=12)

    # ===================================================
    # CHAPTER 2 — Introduction to Scratch Jr
    # ===================================================
    # 2.1.class.1 — "Scratch Jr Tour" (4 steps)
    '46.png': ('2.1.class.1', 0, 0),   # Step 1: Open App (splash screen)
    '47.png': ('2.1.class.1', 0, 1),   # Step 2: Main Screen (My Projects)
    '50.png': ('2.1.class.1', 0, 2),   # Step 3: New Project (clicking +)
    '48.png': ('2.1.class.1', 0, 3),   # Step 4: Explore (editor with labels)

    # 2.2.class.1 — "Create a Moving Character" (4 steps)
    '51.png': ('2.2.class.1', 0, 0),   # Step 1: Add a Character (wizard + Tac)
    '52.png': ('2.2.class.1', 0, 1),   # Step 2: Add Move Blocks (green flag + move)
    '53.png': ('2.2.class.1', 0, 2),   # Step 3: Test Your Program (yellow blocks)
    '54.png': ('2.2.class.1', 0, 3),   # Step 4: Add More Movement (longer chain)

    # 2.2.class.2 — "Decorate the Stage" (4 steps)
    '56.png': ('2.2.class.2', 0, 0),   # Step 1: Background (stage toolbar)
    '57.png': ('2.2.class.2', 0, 1),   # Step 2: Choose Background (Park selection)
    '59.png': ('2.2.class.2', 0, 2),   # Step 3: Add Character (two characters in park)

    # 2.3.class.1 — "Create a Moving Character" (3 steps)
    '61.png': ('2.3.class.1', 0, 0),   # Step 1: Add Move Left Block
    '62.png': ('2.3.class.1', 0, 1),   # Step 2: Add Move Up and Down Blocks
    '63.png': ('2.3.class.1', 0, 2),   # Step 3: Test Your Program

    # 2.3.class.2 — "Coding Race" (4 steps)
    '66.png': ('2.3.class.2', 0, 0),   # Step 1: Add Characters (dog in park)
    '67.png': ('2.3.class.2', 0, 1),   # Step 2: Add Movement (dog with blocks)
    '68.png': ('2.3.class.2', 0, 2),   # Step 3: Start Race (fullscreen)

    # 2.4.class.1 — "Create a Talking Character Animation" (4 steps)
    '70.png': ('2.4.class.1', 0, 0),   # Step 1: Add a Speech Block (purple say)
    '71.png': ('2.4.class.1', 0, 1),   # Step 2: Write a Message ("Hello Kashif")
    '72.png': ('2.4.class.1', 0, 2),   # Step 3: Add a Motion Block (say + move)

    # 2.4.class.2 — "Code a Dance" (3 steps)
    '75.png': ('2.4.class.2', 0, 0),   # Step 1: Movement Blocks
    '76.png': ('2.4.class.2', 0, 2),   # Step 3: Combine (purple + blue)

    # 2.5.class.1 — "New Scene (Multipage)" (4 steps)
    '78.png': ('2.5.class.1', 0, 1),   # Step 2: New Background (autumn forest)
    '79.png': ('2.5.class.1', 0, 2),   # Step 3: Characters (dog in forest)

    # ===================================================
    # CHAPTER 3 — Starting VEX Code VR
    # ===================================================
    # 3.1.class.1 — "Explore the Site" (4 steps)
    '81.png': ('3.1.class.1', 0, 0),   # Step 1: Starting VEX (vr.vex.com)
    '82.png': ('3.1.class.1', 0, 1),   # Step 2: Interface (coding area + blocks)
    '83.png': ('3.1.class.1', 0, 2),   # Step 3: Playground (selection screen)
    '85.png': ('3.1.class.1', 0, 3),   # Step 4: Explore (robot on grid)

    # 3.2.class.1 — "Move Robot Forward" (4 steps)
    '86.png': ('3.2.class.1', 0, 1),   # Step 2: Select Playground
    '87.png': ('3.2.class.1', 0, 2),   # Step 3: Add Move Forward Block
    '88.png': ('3.2.class.1', 0, 3),   # Step 4: Run the Program

    # 3.2.class.2 — "Drive Backward" (4 steps)
    '90.png': ('3.2.class.2', 0, 0),   # Step 1: Add Reverse Block
    '91.png': ('3.2.class.2', 0, 3),   # Step 4: Mix It (forward + reverse)

    # 3.3.class.1 — "Program the Robot to Move and Turn" (3 steps)
    '93.png': ('3.3.class.1', 0, 0),   # Step 1: Add Turn Block (forward + turn)
    '94.png': ('3.3.class.1', 0, 1),   # Step 2: Add Another Move Forward
    '95.png': ('3.3.class.1', 0, 2),   # Step 3: Run the Program

    # 3.3.class.2 — "Square Challenge" (4 steps)
    '98.png': ('3.3.class.2', 0, 2),   # Step 3: Repeat (full square program)

    # 3.4.class.1 — "Adjust and Test" (3 steps)
    '100.png': ('3.4.class.1', 0, 1),  # Step 2: Change Turn Angle (90 deg)
    '101.png': ('3.4.class.1', 0, 2),  # Step 3: Run Program (45 deg)

    # 3.5.class.1 — "Robot Dance Party" (4 steps)
    '96.png': ('3.5.class.1', 0, 3),   # Step 4: Watch (complex program running)

    # 3.6.class.1 — "Treasure Hunt" (3 steps)
    '104.png': ('3.6.class.1', 0, 1),  # Step 2: Choose Treasure Square

    # ===================================================
    # CHAPTER 4 — Introduction to Python Programming
    # ===================================================
    # 4.4.class.1 — "Hello, World!" (2 steps)
    '107.png': ('4.4.class.1', 0, 0),  # Step 1: Type Code (Google Colab)
    '109.png': ('4.4.class.1', 0, 1),  # Step 2: Run Program (Hello World!)

    # 4.5.class.1 — "Let us make some Boxes" (2 steps)
    '113.png': ('4.5.class.1', 0, 0),  # Step 1: Variables (age, name, height)

    # 4.7.class.1 — "Add Two Numbers" (4 steps)
    '114.png': ('4.7.class.1', 0, 2),  # Step 3: Run Program (print(3+5)=8)

    # ===================================================
    # CHAPTER 5 — Creating Your First PowerPoint
    # ===================================================
    # 5.2.class.1 — "Create Your First Slide" (4 steps)
    '116.png': ('5.2.class.1', 0, 0),  # Step 1: Add a Title
    '117.png': ('5.2.class.1', 0, 1),  # Step 2: Add a Subtitle
    '118.png': ('5.2.class.1', 0, 2),  # Step 3: Change the Font
    '119.png': ('5.2.class.1', 0, 3),  # Step 4: Add Background Color

    # 5.3.class.1 — "Add Text and Images" (4 steps)
    '122.png': ('5.3.class.1', 0, 1),  # Step 2: Add Text (Favorite Animals)
    '123.png': ('5.3.class.1', 0, 2),  # Step 3: Insert Image (cat search)
    '124.png': ('5.3.class.1', 0, 3),  # Step 4: Resize Image (cat inserted)

    # 5.4.class.1 — "Build 3-Slide Presentation" (4 steps)
    '126.png': ('5.4.class.1', 0, 0),  # Step 1: Title Slide
    '127.png': ('5.4.class.1', 0, 1),  # Step 2: Text and Images
    '128.png': ('5.4.class.1', 0, 2),  # Step 3: Conclusion (Thank You)
    '129.png': ('5.4.class.1', 0, 3),  # Step 4: Transitions

    # 5.5.class.1 — "Present Your PowerPoint" (2 steps)
    '131.png': ('5.5.class.1', 0, 0),  # Step 1: Start Presentation
    '132.png': ('5.5.class.1', 0, 1),  # Step 2: Navigate Slides

    # ===================================================
    # CHAPTER 6 — Scratch Jr Story Time
    # ===================================================
    # 6.2.class.1 — "Add Characters and Change Background" (3 steps)
    '134.png': ('6.2.class.1', 0, 0),  # Step 1: Add New Character (two horses)
    '135.png': ('6.2.class.1', 0, 1),  # Step 2: Change Background (Farm)
    '136.png': ('6.2.class.1', 0, 2),  # Step 3: Arrange Characters

    # 6.3.class.1 — "Make Two Characters Talk" (4 steps)
    '138.png': ('6.3.class.1', 0, 0),  # Step 1: Select Character (purple blocks)
    '139.png': ('6.3.class.1', 0, 1),  # Step 2: Add Speech Block ("Hello")
    '140.png': ('6.3.class.1', 0, 2),  # Step 3: Second Speech ("I'm good")
    '141.png': ('6.3.class.1', 0, 3),  # Step 4: Test (both speech bubbles)

    # 6.4.class.1 — "Make Characters Move and Interact" (3 steps)
    '143.png': ('6.4.class.1', 0, 0),  # Step 1: Move While Talking
    '144.png': ('6.4.class.1', 0, 1),  # Step 2: Add More Movements
    '145.png': ('6.4.class.1', 0, 2),  # Step 3: Test Program

    # 6.5.class.1 — "Add a New Scene" (4 steps)
    '147.png': ('6.5.class.1', 0, 0),  # Step 1: Add New Page (blank stage)
    '148.png': ('6.5.class.1', 0, 1),  # Step 2: Change Background (forest)
    '149.png': ('6.5.class.1', 0, 2),  # Step 3: Move Characters
    '150.png': ('6.5.class.1', 0, 3),  # Step 4: Add New Actions

    # 6.6.class.1 — "Share Your Story" (3 steps)
    '152.png': ('6.6.class.1', 0, 0),  # Step 1: Run Story (farm fullscreen)
    '153.png': ('6.6.class.1', 0, 1),  # Step 2: Show Friends (forest + speech)

    # ===================================================
    # CHAPTER 7 — Introduction to Web Browsing
    # ===================================================
    # 7.1.class.1 — "Open a Web Browser" (4 steps)
    '155.png': ('7.1.class.1', 0, 0),  # Step 1: Open Start Menu (search Chrome)
    '156.png': ('7.1.class.1', 0, 1),  # Step 2: Open Chrome (Google homepage)
    '157.png': ('7.1.class.1', 0, 2),  # Step 3: Find Address Bar (red arrow)
    '159.png': ('7.1.class.1', 0, 3),  # Step 4: Visit Kiddle

    # 7.3.class.1 — "Search Safari" (4 steps)
    '162.png': ('7.3.class.1', 0, 1),  # Step 2: Search "Pakistani festivals"
    '163.png': ('7.3.class.1', 0, 2),  # Step 3: Pick a fact (Eid article)

    # 7.4.class.1 — "Bookmark a Website" (4 steps)
    '165.png': ('7.4.class.1', 0, 0),  # Step 1: Visit Website (Kiddle)
    '166.png': ('7.4.class.1', 0, 1),  # Step 2: Bookmark (dialog)
    '167.png': ('7.4.class.1', 0, 2),  # Step 3: Find Bookmark (menu)

    # ===================================================
    # CHAPTER 8 — Basics of Digital Art (Canva)
    # ===================================================
    # 8.1.class.1 — "Open Canva" (4 steps)
    '169.png': ('8.1.class.1', 0, 0),  # Step 1: Go to Canva (homepage)
    '170.png': ('8.1.class.1', 0, 1),  # Step 2: Sign In (login modal)
    '171.png': ('8.1.class.1', 0, 2),  # Step 3: Create a Design (dashboard)
    '172.png': ('8.1.class.1', 0, 3),  # Step 4: Explore (poster templates)

    # 8.2.class.1 — "Make an Eid Poster" (5 steps)
    '174.png': ('8.2.class.1', 0, 1),  # Step 2: Pick Template (floral)
    '175.png': ('8.2.class.1', 0, 2),  # Step 3: Add Title ("Eid Mubarak")
    '176.png': ('8.2.class.1', 0, 3),  # Step 4: Add Elements (crescent moon)
    '177.png': ('8.2.class.1', 0, 4),  # Step 5: Save (Share panel)

    # 8.3.class.1 — "Shape Party" (5 steps)
    '179.png': ('8.3.class.1', 0, 0),  # Step 1: Open Poster
    '180.png': ('8.3.class.1', 0, 1),  # Step 2: Add Shapes (star)
    '181.png': ('8.3.class.1', 0, 2),  # Step 3: Change Colors (picker)
    '182.png': ('8.3.class.1', 0, 3),  # Step 4: Decorate (finished poster)

    # 8.4.class.1 — "Art Gallery" (4 steps)
    '184.png': ('8.4.class.1', 0, 0),  # Step 1: Finish poster ("From Koder Kids")

    # ===================================================
    # CHAPTER 9 — Introduction to AI
    # ===================================================
    # 9.1.class.1 — "AI Detective" (4 steps)
    '186.png': ('9.1.class.1', 0, 0),  # Step 1: Open AI (ChatGPT homepage)
    '187.png': ('9.1.class.1', 0, 1),  # Step 2: Ask Question ("What is a star?")

    # 9.2.class.1 — "Chat with AI" (3 steps)
    '189.png': ('9.2.class.1', 0, 0),  # Step 1: Open AI (Grok homepage)
    '190.png': ('9.2.class.1', 0, 1),  # Step 2: Ask Prompt (Pakistani animals)

    # 9.3.class.1 — "AI Story Time" (4 steps)
    '192.png': ('9.3.class.1', 0, 0),  # Step 1: Open AI (Grok homepage)
    '193.png': ('9.3.class.1', 0, 1),  # Step 2: Give Prompt (markhor story)
    '194.png': ('9.3.class.1', 0, 2),  # Step 3: Draw (story about Milo the Markhor)

    # 9.4.class.1 — "AI Riddle Game" (4 steps)
    '196.png': ('9.4.class.1', 0, 0),  # Step 1: Open Chatbot (Grok)
    '197.png': ('9.4.class.1', 0, 1),  # Step 2: Ask for Riddle (Pakistani fruit)

    # ===================================================
    # CHAPTER 10 — Exploring Electronics
    # ===================================================
    # 10.2.class.1 — "Hold and Guess" (3 steps)
    '199.png': ('10.2.class.1', 0, 0),  # Step 1: Pick Up (bulb & holder photo)
    '200.png': ('10.2.class.1', 0, 2),  # Step 3: Draw (bulb symbol)

    # 10.3.class.1 — "Feel the Power" (3 steps)
    '205.png': ('10.3.class.1', 0, 0),  # Step 1: Hold (battery holder photo)
    '209.png': ('10.3.class.1', 0, 1),  # Step 2: Connect (wire photo)

    # 10.4.class.1 — "Spin Test" (3 steps)
    '201.png': ('10.4.class.1', 0, 0),  # Step 1: Hold (motor & propeller)
    '202.png': ('10.4.class.1', 0, 2),  # Step 3: Draw (fan diagram)

    # 10.5.class.1 — "Switch Play" (3 steps)
    '203.png': ('10.5.class.1', 0, 0),  # Step 1: Flip (switch photos)
    '207.png': ('10.5.class.1', 0, 1),  # Step 2: Clip (alligator clips)
    '204.png': ('10.5.class.1', 0, 2),  # Step 3: Draw (switch symbol)

    # 10.6.class.1 — "Clip and Bend" (3 steps)
    '208.png': ('10.6.class.1', 0, 0),  # Step 1: Bend (paper clips photo)

    # 10.7.class.1 — "Bulb Light" (3 steps)
    '211.png': ('10.7.class.1', 0, 0),  # Step 1: Set Up (bulb & holder)
    '212.png': ('10.7.class.1', 0, 1),  # Step 2: Connect (circuit diagram)
    '214.png': ('10.7.class.1', 0, 2),  # Step 3: Celebrate (labeled circuit)

    # 10.8.class.1 — "Motor Spin" (3 steps)
    '217.png': ('10.8.class.1', 0, 0),  # Step 1: Set Up (motor components)
    '216.png': ('10.8.class.1', 0, 2),  # Step 3: Watch (motor symbol)

    # 10.9.class.1 — "Switch Control" (3 steps)
    '213.png': ('10.9.class.1', 0, 0),  # Step 1: Add Switch (switch symbols)

    # 10.11.class.1 — "Clip Circuit" (3 steps)
    '215.png': ('10.11.class.1', 0, 0),  # Step 1: Bend Clips (paper clips)
    '218.png': ('10.11.class.1', 0, 2),  # Step 3: Test (circuit diagram)
}

# Images to skip (chapter titles, separators, blanks, duplicates, intermediates)
SKIP_IMAGES = {
    # Chapter title cards
    '1.png', '45.png', '80.png', '106.png', '115.png',
    '133.png', '154.png', '168.png', '185.png', '198.png',
    # Maroon/blank separators
    '13.png', '15.png', '21.png', '26.png', '29.png',
    '49.png', '55.png', '60.png', '65.png', '69.png',
    '74.png', '77.png', '84.png', '89.png', '92.png',
    '97.png', '99.png', '103.png', '105.png', '108.png',
    '112.png', '120.png', '125.png', '130.png', '137.png',
    '142.png', '146.png', '151.png', '158.png', '161.png',
    '164.png', '173.png', '178.png', '183.png', '188.png',
    '191.png', '195.png', '210.png',
    # Duplicates
    '44.png', '102.png', '110.png', '111.png', '160.png',
    # Intermediate calculator screenshots (result images used instead)
    '27.png', '28.png', '30.png', '31.png',
    '34.png', '37.png', '40.png',
    # Other intermediate/unused
    '58.png', '64.png', '73.png', '121.png', '206.png',
}


class Command(BaseCommand):
    help = 'Upload activity step images from a local folder to Supabase and update topics'

    def add_arguments(self, parser):
        parser.add_argument('folder', type=str, help='Path to folder containing numbered PNG images')
        parser.add_argument('--dry-run', action='store_true', help='Preview mapping without uploading')

    def handle(self, *args, **options):
        folder = options['folder']
        dry_run = options['dry_run']

        if not os.path.isdir(folder):
            self.stdout.write(self.style.ERROR(f'Folder not found: {folder}'))
            return

        # Find Book 1
        book = self._find_book()
        if not book:
            return

        self.stdout.write(f'Book: {book.title} (ID: {book.id})')

        # Cache topics by code
        topic_codes = set()
        for entry in IMAGE_MAPPING.values():
            topic_codes.add(entry[0])

        topics = {}
        for code in sorted(topic_codes):
            try:
                topic = Topic.objects.get(book=book, code=code)
                topics[code] = topic
                self.stdout.write(f'  Found topic: {code} — {topic.title} (ID: {topic.id})')
            except Topic.DoesNotExist:
                self.stdout.write(self.style.ERROR(f'  Topic not found: {code}'))

        if dry_run:
            self.stdout.write(self.style.WARNING('\n=== DRY RUN ===\n'))

        # Process images in order
        success_count = 0
        skip_count = 0
        already_count = 0
        error_count = 0

        for filename in sorted(IMAGE_MAPPING.keys(), key=lambda x: int(x.split('.')[0])):
            filepath = os.path.join(folder, filename)

            if not os.path.isfile(filepath):
                self.stdout.write(self.style.WARNING(f'  SKIP {filename}: file not found'))
                skip_count += 1
                continue

            entry = IMAGE_MAPPING[filename]
            topic_code = entry[0]
            block_index = entry[1]

            if topic_code not in topics:
                self.stdout.write(self.style.ERROR(f'  SKIP {filename}: topic {topic_code} not in DB'))
                error_count += 1
                continue

            topic = topics[topic_code]
            blocks = topic.activity_blocks or []

            if block_index >= len(blocks):
                self.stdout.write(self.style.ERROR(
                    f'  SKIP {filename}: block index {block_index} out of range for {topic_code}'
                ))
                error_count += 1
                continue

            block = blocks[block_index]
            steps = block.get('steps', [])

            is_new_step = len(entry) > 3 and entry[2] == 'new'

            if is_new_step:
                step_title = entry[3]
                step_content = entry[4] if len(entry) > 4 else ''
                # Check if this new step was already added (idempotency)
                existing = [s for s in steps if s.get('title') == step_title and s.get('image')]
                if existing:
                    self.stdout.write(f'  ALREADY {filename}: new step "{step_title}" exists with image')
                    already_count += 1
                    continue
                step_desc = f'NEW step "{step_title}"'
            else:
                step_index = entry[2]
                if step_index >= len(steps):
                    self.stdout.write(self.style.ERROR(
                        f'  SKIP {filename}: step index {step_index} out of range for {topic_code} block {block_index}'
                    ))
                    error_count += 1
                    continue
                # Skip if step already has an image (idempotency)
                if steps[step_index].get('image'):
                    self.stdout.write(f'  ALREADY {filename}: {topic_code} step {step_index + 1} has image')
                    already_count += 1
                    continue
                step_desc = f'step {step_index + 1} "{steps[step_index].get("title", "")}"'

            if dry_run:
                self.stdout.write(f'  {filename} -> {topic_code} block {block_index}, {step_desc}')
                success_count += 1
                continue

            # Upload to Supabase
            try:
                url = self._upload_image(filepath, filename, book.id, topic.id)
                self.stdout.write(self.style.SUCCESS(f'  Uploaded {filename} -> {url[:80]}...'))
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'  FAIL {filename}: {e}'))
                error_count += 1
                continue

            # Update the step's image field
            if is_new_step:
                new_step = {
                    'number': len(steps) + 1,
                    'title': step_title,
                    'content': step_content,
                    'image': url,
                }
                steps.append(new_step)
                block['steps'] = steps
            else:
                steps[step_index]['image'] = url

            blocks[block_index] = block
            topic.activity_blocks = blocks
            topic.save(update_fields=['activity_blocks'])

            success_count += 1

        # Summary
        self.stdout.write('')
        if dry_run:
            self.stdout.write(self.style.WARNING(
                f'DRY RUN complete: {success_count} to upload, {already_count} already done, '
                f'{skip_count} skipped, {error_count} errors'
            ))
        else:
            self.stdout.write(self.style.SUCCESS(
                f'Done: {success_count} uploaded, {already_count} already done, '
                f'{skip_count} skipped, {error_count} errors'
            ))

    def _find_book(self):
        for pattern in ['Book 1', 'Koder Kids Book 1', 'KoderKids Book 1']:
            try:
                return Book.objects.get(title__icontains=pattern)
            except Book.DoesNotExist:
                continue
            except Book.MultipleObjectsReturned:
                return Book.objects.filter(title__icontains=pattern).first()

        books = Book.objects.all()
        self.stdout.write(self.style.WARNING('Available books:'))
        for b in books:
            self.stdout.write(f'  ID={b.id}: {b.title}')
        self.stdout.write(self.style.ERROR('Book 1 not found.'))
        return None

    def _upload_image(self, filepath, filename, book_id, topic_id):
        from books.storage import upload_topic_image

        with open(filepath, 'rb') as f:
            content = f.read()

        uploaded_file = SimpleUploadedFile(
            name=filename,
            content=content,
            content_type='image/png',
        )

        result = upload_topic_image(uploaded_file, book_id, str(topic_id))
        return result['url']
