"""
Data Migration: Move activity_blocks from lessons to tree activity nodes.

Problem: Activity data is duplicated in two places:
1. Lesson's activity_blocks (FULL content - 6 steps)
2. Tree activity nodes (PARTIAL content - 1 step)

Solution: Copy FULL data from lessons to tree children, then clear lessons.

Usage:
    python manage.py migrate_activity_blocks          # Dry run (preview)
    python manage.py migrate_activity_blocks --apply  # Actually apply changes
"""

from django.core.management.base import BaseCommand
from books.models import Topic, Book


class Command(BaseCommand):
    help = 'Migrate activity_blocks from lessons to tree activity nodes'

    def add_arguments(self, parser):
        parser.add_argument(
            '--apply',
            action='store_true',
            help='Actually apply the migration (default is dry run)',
        )
        parser.add_argument(
            '--book',
            type=str,
            help='Only migrate specific book by title',
        )
        parser.add_argument(
            '--create-missing',
            action='store_true',
            help='Create missing child activities for orphan blocks',
        )

    def handle(self, *args, **options):
        dry_run = not options['apply']
        book_filter = options.get('book')
        create_missing = options.get('create_missing', False)

        if dry_run:
            self.stdout.write(self.style.WARNING('\n=== DRY RUN MODE (use --apply to make changes) ===\n'))
        else:
            self.stdout.write(self.style.SUCCESS('\n=== APPLYING MIGRATION ===\n'))

        if create_missing:
            self.stdout.write(self.style.WARNING('Will create missing child activities\n'))

        # Get lessons with activity_blocks
        lessons_qs = Topic.objects.filter(type='lesson').exclude(activity_blocks=[])

        if book_filter:
            lessons_qs = lessons_qs.filter(book__title=book_filter)

        total_lessons = lessons_qs.count()
        self.stdout.write(f'Found {total_lessons} lessons with activity_blocks to migrate\n')

        migrated_count = 0
        skipped_count = 0
        no_child_count = 0

        for lesson in lessons_qs:
            self.stdout.write(f'\n--- Lesson: {lesson.code} "{lesson.title[:50]}" ---')
            self.stdout.write(f'    Book: {lesson.book.title}')
            self.stdout.write(f'    Blocks: {len(lesson.activity_blocks)}')

            for block in lesson.activity_blocks:
                block_type = block.get('type', '')
                block_title = block.get('title', 'Untitled')[:40]
                steps_count = len(block.get('steps', []))

                self.stdout.write(f'    Block: type={block_type}, steps={steps_count}, "{block_title}"')

                # Find matching child activity by code pattern
                child = None
                if 'class' in block_type.lower():
                    child = lesson.get_children().filter(code__contains='.class.').first()
                elif 'home' in block_type.lower():
                    child = lesson.get_children().filter(code__contains='.home.').first()
                elif 'challenge' in block_type.lower():
                    child = lesson.get_children().filter(code__contains='.challenge.').first()
                else:
                    self.stdout.write(self.style.WARNING(f'      SKIP: Unknown block type "{block_type}"'))
                    skipped_count += 1
                    continue

                if child:
                    # Handle different activity_blocks structures
                    old_steps = 0
                    if child.activity_blocks:
                        if isinstance(child.activity_blocks, list) and len(child.activity_blocks) > 0:
                            first_block = child.activity_blocks[0]
                            if isinstance(first_block, dict):
                                old_steps = len(first_block.get('steps', []))
                        elif isinstance(child.activity_blocks, dict):
                            old_steps = len(child.activity_blocks.get('steps', []))
                    self.stdout.write(f'      -> Matched to: {child.code} (old steps: {old_steps}, new steps: {steps_count})')

                    if not dry_run:
                        # Replace child's activity_blocks with full data from lesson
                        child.activity_blocks = [block]
                        child.save()

                    migrated_count += 1
                else:
                    if create_missing:
                        # Determine code suffix based on type
                        if 'class' in block_type.lower():
                            suffix = 'class'
                        elif 'home' in block_type.lower():
                            suffix = 'home'
                        elif 'challenge' in block_type.lower():
                            suffix = 'challenge'
                        else:
                            suffix = 'activity'

                        # Count existing activities of this type to get next number
                        existing = lesson.get_children().filter(code__contains=f'.{suffix}.').count()
                        new_code = f'{lesson.code}.{suffix}.{existing + 1}'

                        self.stdout.write(self.style.SUCCESS(f'      CREATING: {new_code} - "{block_title}"'))

                        if not dry_run:
                            # Create the missing child activity
                            new_child = Topic.objects.create(
                                book=lesson.book,
                                parent=lesson,
                                code=new_code,
                                title=block_title,
                                type='activity',
                                activity_blocks=[block],
                            )
                            self.stdout.write(self.style.SUCCESS(f'      Created: {new_child.id}'))

                        migrated_count += 1
                    else:
                        self.stdout.write(self.style.WARNING(f'      NO CHILD FOUND for type={block_type}'))
                        no_child_count += 1

            # Clear lesson's activity_blocks
            if not dry_run:
                lesson.activity_blocks = []
                lesson.save()
                self.stdout.write(self.style.SUCCESS(f'    Cleared lesson activity_blocks'))

        # Summary
        self.stdout.write('\n' + '=' * 60)
        self.stdout.write(self.style.SUCCESS(f'\nSUMMARY:'))
        self.stdout.write(f'  Lessons processed: {total_lessons}')
        self.stdout.write(f'  Blocks migrated: {migrated_count}')
        self.stdout.write(f'  Blocks skipped (unknown type): {skipped_count}')
        self.stdout.write(f'  Blocks with no matching child: {no_child_count}')

        if dry_run:
            self.stdout.write(self.style.WARNING('\n*** DRY RUN - No changes made. Use --apply to execute. ***'))
        else:
            self.stdout.write(self.style.SUCCESS('\n*** Migration complete! ***'))

        # Post-migration verification
        if not dry_run:
            remaining = Topic.objects.filter(type='lesson').exclude(activity_blocks=[]).count()
            self.stdout.write(f'\nVerification: {remaining} lessons still have activity_blocks')
