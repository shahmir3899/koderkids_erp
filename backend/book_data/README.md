# book_data

| File | What it is |
|---|---|
| `book3.json` | Book 3, chapters 1-12, built from **`Koder Kids Book 3 Ver-1.pdf`** (the PDF's own text). Ready to import. |
| `book3_chapter13_extra.json` | The PDF's 13th chapter section (pp. 175-184). It repeats chapter 9's M3D GO lessons, so it is kept **separate** - import it only if you want it. |
| `Book1_Book2_Word_vs_DB_comparison.xlsx` | Side-by-side of the Word books against the database (Book 1: `Book1 ver 2.docx`, Book 2: `KK Books/Koder Kids Book 2.docx`), plus a sheet comparing the Book 3 sources. |

## Importing Book 3

Upload page (Admin/Teacher): `/books-upload` -> choose the file -> **Preview** -> **Import**.

Terminal (from `backend/`):

    python manage.py import_books book_data/book3.json --dry-run
    python manage.py import_books book_data/book3.json

Re-running is safe: missing rows are created, nothing is deleted, existing rows are left alone unless you add
`--update-existing` (which never removes step images or hand-written activity text).

## JSON format

    {"books": [{"title": "Book 3", "chapters": [
      {"code": "1", "title": "...", "content": "<h2>html</h2>",
       "lessons": [
         {"code": "1.1", "title": "...", "content": "<p>html</p>",
          "activities": [
            {"kind": "class", "number": 1, "title": "...", "introduction": "...", "challenge": "...",
             "steps": [{"number": 1, "title": "Step 1", "content": "...", "image": "https://..."}]},
            {"kind": "home", "number": 1, "title": "", "introduction": "text of the home activity"},
            {"kind": "challenge", "title": "Homework", "introduction": "..."}
          ]}
       ]}
    ]}]}

Only `code` / `title` are required (a home activity may have an empty title -> "Home Activity N"). Summary
lessons use code `N.S`. Validation errors name the exact path, e.g. `books[0].chapters[2].lessons[1].activities[0].steps[3]`.

## About the Book 3 PDF

* The PDF's contents page lists 12 chapters but the body has 13 sections; chapter 9 and chapter 13 are the same
  M3D GO material, and the contents page describes chapter 9 differently (9.1-9.4, Lifter / Distance Sensor) from
  the body (9.1-9.3, movement blocks). The body is what was imported.
* Steps have titles only in chapters 11-12; elsewhere they are titled "Step N" (the PDF gives numbered cards only).
* No images are included, and the PDF has no separate activity introductions beyond the sentence under each title.
* Text is verbatim from the PDF apart from `Al` -> `AI` (font artefact) and one heading typo ("Summaryand").
  A few typos and one apparent content error (5.2 step 2) exist in the PDF itself - see the workbook's
  "Sources & notes" sheet.
