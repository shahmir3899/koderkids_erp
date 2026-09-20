# books/management/commands/import_books.py
from django.core.management.base import BaseCommand, CommandError

from books.importer import CsvImportError, format_report, import_books_text


class Command(BaseCommand):
    help = (
        "Import books/chapters/lessons/activities from a CSV or JSON file (safe to re-run: creates missing "
        "rows, deletes nothing). CSV columns: Book, Topic ('2.3 Title'), Class Activity, Home Activity, "
        "optionally Chapter Title. JSON carries everything (lesson HTML, activity steps, challenges, "
        "images). See books/importer.py for both formats."
    )

    def add_arguments(self, parser):
        parser.add_argument("csv_file", type=str, help="Path to the CSV or JSON file")
        parser.add_argument("--book", type=str, default=None,
                            help="Import every row into this book title (overrides the CSV's Book column)")
        parser.add_argument("--dry-run", action="store_true", help="Validate and preview without saving")
        parser.add_argument("--update-existing", action="store_true",
                            help="Also overwrite titles / import-generated activity text of rows that already exist "
                                 "(hand-written activity content is never overwritten)")

    def handle(self, *args, **options):
        path = options["csv_file"]
        try:
            with open(path, "rb") as f:
                raw = f.read()
        except OSError as e:
            raise CommandError(f"Cannot read {path}: {e}")

        # utf-8-sig drops the BOM Excel adds; fall back to Windows-1252 for old Excel exports
        try:
            text = raw.decode("utf-8-sig")
        except UnicodeDecodeError:
            text = raw.decode("cp1252")

        try:
            report = import_books_text(
                text, book_title=options["book"], dry_run=options["dry_run"],
                update_existing=options["update_existing"],
            )
        except CsvImportError as e:
            for err in e.errors:
                self.stderr.write(self.style.ERROR(err))
            raise CommandError(f"{len(e.errors)} problem(s) found - nothing was imported.")

        self.stdout.write(format_report(report))
        if options["dry_run"]:
            self.stdout.write(self.style.WARNING("DRY RUN: nothing was saved."))
        else:
            self.stdout.write(self.style.SUCCESS("Import complete."))
