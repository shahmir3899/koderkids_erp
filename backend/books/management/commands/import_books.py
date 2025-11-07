# books/management/commands/import_books.py
import csv
from django.core.management.base import BaseCommand
from books.models import Book, Topic
from django.db import transaction

class Command(BaseCommand):
    help = "Import hierarchical topics from CSV (safe, idempotent)"

    def add_arguments(self, parser):
        parser.add_argument("csv_file", type=str, help="Path to CSV file")
        parser.add_argument("--dry-run", action="store_true", help="Preview without saving")

    def handle(self, *args, **options):
        csv_file = options["csv_file"]
        dry_run = options["dry_run"]

        book, _ = Book.objects.get_or_create(title="Book 1")

        # Track order per (lesson_code, activity_type)
        lesson_orders = {}

        created_count = 0

        with open(csv_file, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row_num, row in enumerate(reader, start=2):  # start=2 for line number
                topic_text = row["Topic"].strip()
                if not topic_text:
                    continue

                # Extract code and title
                parts = topic_text.split(" ", 1)
                code = parts[0] if len(parts) > 1 else ""
                title = parts[1] if len(parts) > 1 else topic_text

                class_content = row["Class Activity"].strip()
                home_content = row["Home Activity"].strip()

                # === CHAPTER ===
                chapter_num = code.split(".")[0]
                chapter_code = chapter_num
                chapter_title = f"Chapter {chapter_num}: {title.split(':', 1)[-1].strip() if ':' in title else title}"

                chapter_defaults = {
                    "title": chapter_title,
                    "activity_blocks": [],
                    "parent": None,
                }
                chapter, ch_created = Topic.objects.get_or_create(
                    book=book,
                    code=chapter_code,
                    type="chapter",
                    defaults=chapter_defaults,
                )
                if ch_created and not dry_run:
                    created_count += 1
                    self.stdout.write(f"Created chapter: {chapter_code}")

                # === LESSON ===
                lesson_defaults = {
                    "title": title,
                    "activity_blocks": [],
                    "parent": chapter,
                }
                lesson, ls_created = Topic.objects.get_or_create(
                    book=book,
                    code=code,
                    type="lesson",
                    defaults=lesson_defaults,
                )
                if ls_created and not dry_run:
                    created_count += 1
                    self.stdout.write(f"  Created lesson: {code}")

                # === ACTIVITIES ===
                for act_type, content in [("class", class_content), ("home", home_content)]:
                    if not content:
                        continue

                    key = (code, act_type)
                    order = lesson_orders.get(key, 0) + 1
                    lesson_orders[key] = order

                    act_code = f"{code}.{act_type}.{order}"
                    act_title = f"{act_type.capitalize()} Activity – {title}"
                    act_payload = {
                        "type": act_type,
                        "order": order,
                        "content": content,
                    }

                    act_defaults = {
                        "title": act_title,
                        "activity_blocks": act_payload,
                        "parent": lesson,
                    }

                    if dry_run:
                        self.stdout.write(f"    [DRY] Would create: {act_code}")
                        created_count += 1
                        continue

                    activity, act_created = Topic.objects.get_or_create(
                        book=book,
                        code=act_code,
                        type="activity",
                        defaults=act_defaults,
                    )
                    if act_created:
                        created_count += 1
                        self.stdout.write(f"    Created activity: {act_code}")

        if not dry_run:
            Topic.objects.rebuild()
            self.stdout.write(self.style.SUCCESS(f"Imported {created_count} nodes. Tree rebuilt."))
        else:
            self.stdout.write(self.style.WARNING(f"DRY RUN: Would create {created_count} nodes."))