# books/importer.py
"""
CSV / JSON -> Book / Topic importer, shared by `manage.py import_books` and POST /api/books/upload/.

The CSV format (below) only carries titles and one line per activity. Use the JSON format
(see parse_json) to load everything the books already in the database have: lesson and chapter
HTML, and activities with introduction, numbered steps (+ images) and challenge.

CSV columns (header names are case-insensitive):
    Book             book title. A blank cell repeats the previous row's book.
                     Optional when a book title is passed in (--book / `book` form field),
                     which then overrides this column for every row.
    Topic            "<chapter>.<lesson> <title>", e.g. "2.3 Training and Testing Your AI"
    Class Activity   optional, e.g. "Class Activity 2 - Train and Test Your AI Model"
    Home Activity    optional
    Chapter Title    optional. Sets the chapter's title (chapters are created with a
                     placeholder title otherwise, and existing chapter titles are left alone).

A lesson may appear on several rows; each extra row adds another class/home activity.
Lesson codes are "<chapter>.<lesson>"; the lesson part may contain letters ("10.S" for a summary).
A stray ":" after the code ("12.1: Title") is ignored.

Design notes:
  * everything is validated BEFORE anything is written; any error aborts the whole import;
  * missing rows are created and nothing is ever deleted (safe to re-run). Existing rows are left
    alone unless update_existing=True, and even then hand-written activity content (anything more
    than the plain {type, order, content} an import produces) is never overwritten, because
    admins enrich those blocks with steps/images in the book editor;
  * the report lists rows that exist in the database but not in the CSV (e.g. hand-made ones);
  * one query loads the book's existing topics and rows are written with bulk operations,
    so a full book takes a handful of queries instead of hundreds;
  * MPTT's own save() is bypassed for speed, so the nested-set columns (tree_id/lft/rght/level)
    are recomputed here for the imported book only.
"""
import csv
import io
import json
import re

from django.db import transaction
from django.db.models import Max

from .models import Book, Topic

LESSON_CODE_RE = re.compile(r"^(\d+)\.([0-9A-Za-z]+)$")
REQUIRED_COLUMNS = ("topic", "class activity", "home activity")


class CsvImportError(Exception):
    """Raised with a list of human-readable problems (each mentions its CSV line)."""

    def __init__(self, errors):
        super().__init__("; ".join(errors))
        self.errors = errors


# --------------------------------------------------------------------------------------
# 1. Parse + validate (no database access)
# --------------------------------------------------------------------------------------
def parse_csv(text, book_title=None):
    """
    Returns {book_title: {"chapters": {code: {...}}, "lessons": {code: {...}}, "activities": [...]}}
    or raises CsvImportError.
    """
    errors = []
    reader = csv.DictReader(io.StringIO(text, newline=""))
    if not reader.fieldnames:
        raise CsvImportError(["Line 1: the file is empty or has no header row."])

    # case-insensitive, whitespace-tolerant header names
    columns = {(name or "").strip().lower(): name for name in reader.fieldnames}
    missing = [c.title() for c in REQUIRED_COLUMNS if c not in columns]
    if missing:
        raise CsvImportError([f"Line 1: missing column(s): {', '.join(missing)}. Found: {', '.join(reader.fieldnames)}"])
    if book_title is None and "book" not in columns:
        raise CsvImportError(["Line 1: there is no 'Book' column and no book title was given."])

    def cell(row, name):
        key = columns.get(name)
        return (row.get(key) or "").strip() if key else ""

    books = {}
    activity_counter = {}
    current_book = None

    for line, row in enumerate(reader, start=2):
        topic_text = cell(row, "topic")
        if not topic_text:
            continue

        # ---- which book ----
        if book_title:
            current_book = book_title
        elif cell(row, "book"):
            current_book = cell(row, "book")
        if not current_book:
            errors.append(f"Line {line}: no book title (the Book cell is blank and there is no earlier row to inherit from).")
            continue
        book = books.setdefault(current_book, {"chapters": {}, "lessons": {}, "activities": []})

        # ---- lesson code + title ----
        code, _, title = topic_text.partition(" ")
        code = code.rstrip(":.")  # "12.1: Title" is a typo for "12.1 Title"
        title = title.strip()
        m = LESSON_CODE_RE.match(code)
        if not m or not title:
            errors.append(f"Line {line}: Topic {topic_text!r} must look like '<chapter>.<lesson> <title>', e.g. '2.3 Loops'.")
            continue
        chapter_code = m.group(1)

        # ---- chapter ----
        chapter = book["chapters"].setdefault(
            chapter_code,
            {
                "title": None,
                # what the old importer used when a chapter had no explicit title
                "placeholder": f"Chapter {chapter_code}: {title.split(':', 1)[-1].strip() if ':' in title else title}",
            },
        )
        chapter_title = cell(row, "chapter title")
        if chapter_title:
            if chapter["title"] and chapter["title"] != chapter_title:
                errors.append(
                    f"Line {line}: chapter {chapter_code} has two different Chapter Titles "
                    f"({chapter['title']!r} and {chapter_title!r})."
                )
            chapter["title"] = chapter["title"] or chapter_title

        # ---- lesson (first row wins; repeat rows only add activities) ----
        book["lessons"].setdefault(code, {"title": title, "chapter": chapter_code})

        # ---- activities ----
        for act_type, content in (("class", cell(row, "class activity")), ("home", cell(row, "home activity"))):
            if not content:
                continue
            key = (current_book, code, act_type)
            order = activity_counter.get(key, 0) + 1
            activity_counter[key] = order

            prefix = "Class" if act_type == "class" else "Home"
            if ":" in content:
                head, desc = content.split(":", 1)
                num = re.search(r"\d+", head)
                number = int(num.group()) if num else order
                act_title = f"{prefix} Activity {number} – {desc.strip()}"
            else:
                act_title = f"{prefix} Activity {order} – {content}"

            book["activities"].append(
                {
                    "lesson": code,
                    "code": f"{code}.{act_type}.{order}",
                    "title": act_title,
                    "blocks": {"type": act_type, "order": order, "content": content},
                }
            )

    if not books and not errors:
        errors.append("The file has no topic rows.")
    if errors:
        raise CsvImportError(errors)
    return books


# --------------------------------------------------------------------------------------
# 1b. Parse + validate a JSON file (no database access)
# --------------------------------------------------------------------------------------
# kind -> (activity_blocks "type", topic-title prefix, block order). Same values the books already in
# the database use: class_activity / home_activity / challenge.
ACTIVITY_KINDS = {
    "class": ("class_activity", "Class Activity", 0),
    "home": ("home_activity", "Home Activity", 1),
    "challenge": ("challenge", "", 1),
}


def _text(value):
    return value.strip() if isinstance(value, str) else ""


def parse_json(text, book_title=None):
    """
    JSON layout (see backend/book_data/README or the sample book3.json):

      {"books": [ {"title": "Book 3", "chapters": [
          {"code": "1", "title": "...", "content": "<p>html</p>", "lessons": [
              {"code": "1.1", "title": "...", "content": "<p>html</p>", "activities": [
                  {"kind": "class" | "home" | "challenge", "number": 1, "title": "...",
                   "introduction": "...", "challenge": "...",
                   "steps": [{"number": 1, "title": "...", "content": "...", "image": "https://..."}]}
              ]}
          ]}
      ]} ]}

    `content`, `introduction`, `challenge`, `steps` and `image` are optional; a bare list of books, or a
    single book object, is accepted too. Returns the same plan structure as parse_csv().
    """
    try:
        doc = json.loads(text)
    except ValueError as e:
        raise CsvImportError([f"The file is not valid JSON: {e}"])

    if isinstance(doc, dict) and "books" in doc:
        doc = doc["books"]
    if isinstance(doc, dict):
        doc = [doc]
    if not isinstance(doc, list) or not doc:
        raise CsvImportError(["Expected a JSON object with a non-empty \"books\" list."])
    if book_title and len(doc) > 1:
        raise CsvImportError(["A book title was given but the file contains several books."])

    errors = []
    books = {}
    for bi, b in enumerate(doc):
        where = f"books[{bi}]"
        if not isinstance(b, dict):
            errors.append(f"{where}: must be an object.")
            continue
        title = book_title or _text(b.get("title"))
        if not title:
            errors.append(f"{where}: missing \"title\".")
            continue
        if title in books:
            errors.append(f"{where}: book {title!r} appears twice.")
            continue
        plan = books[title] = {"chapters": {}, "lessons": {}, "activities": []}

        chapters = b.get("chapters")
        if not isinstance(chapters, list) or not chapters:
            errors.append(f"{where}: \"chapters\" must be a non-empty list.")
            continue
        for ci, ch in enumerate(chapters):
            cw = f"{where}.chapters[{ci}]"
            if not isinstance(ch, dict):
                errors.append(f"{cw}: must be an object.")
                continue
            ccode = _text(str(ch.get("code", "")))
            if not ccode.isdigit():
                errors.append(f"{cw}: \"code\" must be the chapter number, e.g. \"3\" (got {ch.get('code')!r}).")
                continue
            if ccode in plan["chapters"]:
                errors.append(f"{cw}: chapter {ccode} appears twice.")
                continue
            if not _text(ch.get("title")):
                errors.append(f"{cw}: missing \"title\".")
                continue
            plan["chapters"][ccode] = {"title": _text(ch["title"]), "placeholder": _text(ch["title"]),
                                       "content": ch.get("content") if isinstance(ch.get("content"), str) else ""}

            for li, ls in enumerate(ch.get("lessons") or []):
                lw = f"{cw}.lessons[{li}]"
                if not isinstance(ls, dict):
                    errors.append(f"{lw}: must be an object.")
                    continue
                lcode = _text(str(ls.get("code", "")))
                m = LESSON_CODE_RE.match(lcode)
                if not m or m.group(1) != ccode:
                    errors.append(f"{lw}: \"code\" must look like \"{ccode}.1\" (or \"{ccode}.S\"), got {ls.get('code')!r}.")
                    continue
                if lcode in plan["lessons"]:
                    errors.append(f"{lw}: lesson {lcode} appears twice.")
                    continue
                if not _text(ls.get("title")):
                    errors.append(f"{lw}: missing \"title\".")
                    continue
                plan["lessons"][lcode] = {"title": _text(ls["title"]), "chapter": ccode,
                                          "content": ls.get("content") if isinstance(ls.get("content"), str) else ""}

                counters = {}
                for ai, act in enumerate(ls.get("activities") or []):
                    aw = f"{lw}.activities[{ai}]"
                    if not isinstance(act, dict):
                        errors.append(f"{aw}: must be an object.")
                        continue
                    kind = _text(act.get("kind")).lower() or "class"
                    if kind not in ACTIVITY_KINDS:
                        errors.append(f"{aw}: \"kind\" must be one of {', '.join(ACTIVITY_KINDS)} (got {act.get('kind')!r}).")
                        continue
                    block_type, prefix, order = ACTIVITY_KINDS[kind]
                    a_title = _text(act.get("title")) or ("Homework" if kind == "challenge" else "")
                    if not a_title and kind != "home":  # a home activity may be just its text ("Home Activity 3")
                        errors.append(f"{aw}: missing \"title\".")
                        continue
                    counters[kind] = counters.get(kind, 0) + 1
                    number = act.get("number")
                    if not isinstance(number, int):
                        number = counters[kind]
                    topic_title = (f"{prefix} {number}: {a_title}" if a_title else f"{prefix} {number}") if prefix else a_title

                    steps = []
                    raw_steps = act.get("steps") or []
                    if not isinstance(raw_steps, list):
                        errors.append(f"{aw}: \"steps\" must be a list.")
                        continue
                    for si, st in enumerate(raw_steps):
                        sw = f"{aw}.steps[{si}]"
                        if not isinstance(st, dict) or not (_text(st.get("title")) or _text(st.get("content"))):
                            errors.append(f"{sw}: each step needs a \"title\" and/or \"content\".")
                            continue
                        step = {"number": st.get("number") if isinstance(st.get("number"), int) else si + 1,
                                "title": _text(st.get("title")), "content": _text(st.get("content"))}
                        if _text(st.get("image")):
                            step["image"] = _text(st["image"])
                        steps.append(step)

                    block = {"type": block_type, "order": order, "title": topic_title,
                             "introduction": _text(act.get("introduction")), "steps": steps}
                    if _text(act.get("challenge")):
                        block["challenge"] = _text(act["challenge"])
                    plan["activities"].append({
                        "lesson": lcode, "code": f"{lcode}.{kind}.{counters[kind]}",
                        "title": topic_title, "blocks": [block], "rich": True,
                    })

    if errors:
        raise CsvImportError(errors)
    return books


# --------------------------------------------------------------------------------------
# 2. Write (or preview) one book
# --------------------------------------------------------------------------------------
def _new_topic(book, code, type_, title, blocks, parent, content=""):
    # tree columns are placeholders; _rebuild_tree_columns() fills them in
    return Topic(book=book, code=code, type=type_, title=title, content=content or "", activity_blocks=blocks,
                 parent=parent, tree_id=0, lft=0, rght=0, level=0)


def _is_import_shaped(blocks):
    """True for activity_blocks that are empty or exactly what an import writes (safe to replace)."""
    if not blocks:
        return True
    return isinstance(blocks, dict) and set(blocks) <= {"type", "order", "content"}


def _merge_blocks(existing, new):
    """
    New activity blocks laid over existing ones without losing hand-added material: values the file
    leaves empty keep the existing value, and step images (added in the book editor) are carried over
    by step number.
    """
    if not isinstance(existing, list) or not existing:
        return new
    merged = []
    for i, nb in enumerate(new):
        eb = existing[i] if i < len(existing) and isinstance(existing[i], dict) else {}
        block = dict(eb)
        for key, value in nb.items():
            if key == "steps":
                if value:
                    old = {s.get("number"): s for s in eb.get("steps") or [] if isinstance(s, dict)}
                    steps = []
                    for s in value:
                        s = dict(s)
                        image = old.get(s.get("number"), {}).get("image")
                        if image and not s.get("image"):
                            s["image"] = image
                        steps.append(s)
                    block["steps"] = steps
            elif value not in ("", None, [], {}) or key not in block:
                block[key] = value
        merged.append(block)
    merged.extend(existing[len(new):])
    return merged


def _import_book(title, data, dry_run, update_existing):
    counts = {kind: {"created": 0, "updated": 0, "unchanged": 0, "kept": 0} for kind in ("chapters", "lessons", "activities")}

    book = Book.objects.filter(title=title).order_by("id").first()
    existing = {}
    if book:
        rows = Topic.objects.filter(book_id=book.id).only("id", "code", "type", "title", "content", "activity_blocks", "parent_id")
        existing = {(t.code, t.type): t for t in rows}

    to_create = {"chapter": [], "lesson": [], "activity": []}
    to_update = []
    objects = {}  # (code, type) -> Topic (existing or about to be created)
    seen = set()

    def sync(kind, type_, code, new_title, blocks, parent_key, content=None, merge=False):
        key = (code, type_)
        seen.add(key)
        current = existing.get(key)
        if current is None:
            counts[kind]["created"] += 1
            if not dry_run:
                parent = objects.get(parent_key) if parent_key else None
                obj = _new_topic(book, code, type_, new_title, blocks, parent, content)
                to_create[type_].append(obj)
                objects[key] = obj
            return
        objects[key] = current
        changed = differs = False
        if new_title is not None and current.title != new_title:
            differs = True
            if update_existing:
                current.title = new_title
                changed = True
        if content is not None and current.content != content:
            differs = True
            if update_existing:
                current.content = content
                changed = True
        if blocks is not None:
            if merge:
                merged = _merge_blocks(current.activity_blocks, blocks)
                if merged != current.activity_blocks:
                    differs = True
                    if update_existing:
                        current.activity_blocks = merged
                        changed = True
            elif current.activity_blocks != blocks:
                differs = True
                if update_existing and _is_import_shaped(current.activity_blocks):
                    current.activity_blocks = blocks
                    changed = True
        if changed:
            counts[kind]["updated"] += 1
            to_update.append(current)
        elif differs:
            counts[kind]["kept"] += 1
        else:
            counts[kind]["unchanged"] += 1

    if not dry_run and not book:
        book = Book.objects.create(title=title)

    for code, ch in data["chapters"].items():
        current = existing.get((code, "chapter"))
        # explicit Chapter Title wins; otherwise new chapters get the placeholder and existing
        # ones keep whatever title they have (they are usually renamed by hand afterwards)
        new_title = ch["title"] or (None if current else ch["placeholder"])
        sync("chapters", "chapter", code, new_title, [] if not current else None, None,
             content=ch.get("content") or None)

    for code, lesson in data["lessons"].items():
        sync("lessons", "lesson", code, lesson["title"], [] if (code, "lesson") not in existing else None,
             (lesson["chapter"], "chapter"), content=lesson.get("content") or None)

    for act in data["activities"]:
        sync("activities", "activity", act["code"], act["title"], act["blocks"], (act["lesson"], "lesson"),
             merge=act.get("rich", False))

    counts["not_in_csv"] = sorted(f"{code} ({type_})" for code, type_ in existing if (code, type_) not in seen)

    if dry_run:
        return counts

    # parents are created before their children so their primary keys exist
    for type_ in ("chapter", "lesson", "activity"):
        for obj in to_create[type_]:
            if obj.parent is not None and obj.parent.pk is None:
                raise RuntimeError(f"parent of {obj.code} was not saved")  # cannot happen; guards ordering
        if to_create[type_]:
            Topic.objects.bulk_create(to_create[type_], batch_size=500)
    if to_update:
        Topic.objects.bulk_update(to_update, ["title", "content", "activity_blocks"], batch_size=500)
    if any(to_create.values()):
        _rebuild_tree_columns(book)
    return counts


def _rebuild_tree_columns(book):
    """
    Recompute tree_id / lft / rght / level for this book's topics (nested-set columns that
    django-mptt normally maintains in save()). Each chapter is its own tree. Existing trees keep
    their tree_id; new chapters get fresh ones. Children are laid out in natural code order.
    """
    from .serializers import topic_sort_key  # local import: serializers imports models too

    rows = list(Topic.objects.filter(book_id=book.id).only("id", "parent_id", "code", "title", "tree_id", "lft", "rght", "level"))
    children_of = {}
    for t in rows:
        children_of.setdefault(t.parent_id, []).append(t)

    next_tree_id = (Topic.objects.aggregate(m=Max("tree_id"))["m"] or 0) + 1
    changed = []

    def walk(node, tree_id, counter, level):
        node_lft = counter
        counter += 1
        for child in sorted(children_of.get(node.id, []), key=topic_sort_key):
            counter = walk(child, tree_id, counter, level + 1)
        values = (tree_id, node_lft, counter, level)
        if (node.tree_id, node.lft, node.rght, node.level) != values:
            node.tree_id, node.lft, node.rght, node.level = values
            changed.append(node)
        return counter + 1

    used_tree_ids = set()
    for root in sorted(children_of.get(None, []), key=topic_sort_key):
        tree_id = root.tree_id if root.tree_id and root.tree_id not in used_tree_ids else None
        if tree_id is None:
            tree_id = next_tree_id
            next_tree_id += 1
        used_tree_ids.add(tree_id)
        walk(root, tree_id, 1, 0)

    if changed:
        Topic.objects.bulk_update(changed, ["tree_id", "lft", "rght", "level"], batch_size=500)


# --------------------------------------------------------------------------------------
# 3. Public entry point
# --------------------------------------------------------------------------------------
def import_books_text(text, book_title=None, dry_run=False, update_existing=False):
    """
    Import the text of a CSV or JSON file (JSON is detected by its first character). Returns
    {book title: {"chapters"|"lessons"|"activities": {created, updated, unchanged, kept},
    "not_in_csv": [...]}}. "kept" = exists but differs from the file and was left alone (pass
    update_existing=True to overwrite titles / content; hand-added activity content is preserved).
    Raises CsvImportError (nothing is written) if the file has problems.
    """
    book_title = (book_title or "").strip() or None
    if text.lstrip().startswith(("{", "[")):
        parsed = parse_json(text, book_title=book_title)
    else:
        parsed = parse_csv(text, book_title=book_title)

    report = {}
    with transaction.atomic():
        for title, data in parsed.items():
            report[title] = _import_book(title, data, dry_run, update_existing)

    if not dry_run:
        from core.cache_helpers import bump_version
        bump_version("books")  # bulk operations skip the model signals that normally do this
    return report


import_books_csv = import_books_text  # old name, kept for callers written before JSON support


def format_report(report):
    lines = []
    for title, counts in report.items():
        lines.append(title)
        for kind in ("chapters", "lessons", "activities"):
            c = counts[kind]
            text = f"{c['created']} new, {c['updated']} updated, {c['unchanged']} unchanged"
            if c["kept"]:
                text += f", {c['kept']} kept (differ from the file; use update-existing to overwrite)"
            lines.append(f"  {kind}: {text}")
        stale = counts["not_in_csv"]
        if stale:
            shown = ", ".join(stale[:15]) + (f", ... (+{len(stale) - 15} more)" if len(stale) > 15 else "")
            lines.append(f"  in the database but not in this file ({len(stale)}, left untouched): {shown}")
    return "\n".join(lines)
