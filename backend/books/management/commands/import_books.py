# books/management/commands/import_books.py
import csv
from django.core.management.base import BaseCommand
from books.models import Book, Topic


class Command(BaseCommand):
    help = "Import books from CSV file"

    def add_arguments(self, parser):
        parser.add_argument("csv_file", type=str, help="Path to CSV file")

    def handle(self, *args, **options):
        csv_file = options["csv_file"]
        created = 0

        with open(csv_file, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                book_title = row["Book"].strip()
                book, _ = Book.objects.get_or_create(title=book_title)

                topic_text = row["Topic"].strip()
                code = topic_text.split(" ", 1)[0] if " " in topic_text else ""
                title = topic_text[len(code):].strip() if code else topic_text

                Topic.objects.create(
                    book=book,
                    code=code,
                    title=title,
                    activity_blocks=[
                        {
                            "type": "class",
                            "title": f"Class Activity – {title}",
                            "content": row["Class Activity"],
                            "order": 0,
                        },
                        {
                            "type": "home",
                            "title": f"Home Activity – {title}",
                            "content": row["Home Activity"],
                            "order": 1,
                        },
                    ],
                )
                created += 1

        self.stdout.write(
            self.style.SUCCESS(f"Successfully imported {created} topics!")
        )