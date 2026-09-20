# Book content analysis (Books 1-3): DB vs PDF vs Word

Status as of 20 Sep 2026. Detailed tables: `backend/book_data/Book_Differences_by_Topic_and_Page.xlsx`
(topic-wise and page-wise sheets for each book). Earlier Word-vs-DB workbook:
`backend/book_data/Book1_Book2_Word_vs_DB_comparison.xlsx`.

## Why the numbers looked inconsistent

Each book exists in several editions, and the "Word" file you look at is often an older one.

| Book | Edition | Chapters | Where |
|---|---|---|---|
| 1 | Word plan "Book1 ver 2.docx", Mar 2025 | **6** | `D:\personal\KoderKids\book1 ver 2\` (the same-named file in "Koder Kids Book1 - 5" is empty, 0 bytes) |
| 1 | `Kids Book Class 1(old).pdf`, 64 pp | **6** | "Koder Kids Book1 - 5" |
| 1 | `Kids Book Class 1(ver2).pdf.pdf`, 106 pp, Jul 2025 | **10** | `D:\personal\KoderKids\` |
| 1 | `KK Books\Koder Kids Book 1.docx`, Jan 2026 | **10** | source of the DB |
| 1 | **Database** | **10** | Book 1 (id 2), 183 topics |
| 2 | Word Oct 2024 (older edition) | 6 | "Koder Kids Book1 - 5" |
| 2 | Word Jan 2026, PDF Ver-3.1 (Sep 2025, 183 pp), **Database** | **12** | matches |
| 3 | Word Oct 2024 (first draft) | 6 | "Koder Kids Book1 - 5" |
| 3 | Word Aug 2026 | 12 | `KK Books\` |
| 3 | `Koder Kids Book 3 Ver-1.pdf`, Jun 2026, 184 pp | 12 (+ a 13th section) | "Koder Kids Book1 - 5" - treated as the actual content |
| 3 | **Database** | **12** | Book 3 (id 4), imported from the PDF, 168 topics |

* **Book 1:** the database has 10 chapters, not 6. The 6-chapter Word file is the March 2025 plan; the
  10-chapter PDF ver2 (Jul 2025) and the Jan 2026 Word file are the later edition the database follows.
* **Book 2:** correct - database, Word (Jan 2026) and PDF Ver-3.1 all have the same 12 chapters.
* **Book 3:** the first version I produced (6 chapters) came from the Oct 2024 Word draft. The PDF is the
  actual content, so the database import was rebuilt from the PDF's own text.

## Book 1 - database vs PDF ver2 (topic-wise)

* Chapters: 9 of 10 identical titles (ch. 5: DB "Creating Your First PowerPoint", PDF "Introduction to PowerPoint").
* Lessons: 46 identical, 20 with different wording, 1 only in the database (chapter 5 wrap-up), and 5 that exist
  only in the 6-chapter Word plan (2.6, 5.6, 5.7, 5.8, 6.7).
* Versus the Word plan (Mar 2025): 40 of its 45 lessons match by title, but only about half of its class and home
  activities survive unchanged in the database.

## Book 2 - database vs PDF Ver-3.1

* Chapters: 11 identical, 1 differs. Lessons: 33 identical, 18 wording differs, 9 title differs, 2 different content.
* 9 lessons exist only in the database: duplicate summaries (`5.S`/`5.5`, `6.S`, ...) and the leftover
  `12.1:` / `12.2:` lessons (a colon typo from the first import; the correct `12.1` / `12.2` also exist).
* Chapters 9 and 10 have newer lesson titles in the database (from the Jan 2026 Word file) than in the Sep 2025 PDF.

## Book 3 - database vs PDF Ver-1

* 60 of 60 imported lessons and 12 of 12 chapters are identical to the PDF text.
* Not imported: chapter 13 (PDF pp. 175-184; a near-copy of chapter 9), kept in `book3_chapter13_extra.json`.
  Lesson 9.4 "Building an M3Go Project" exists only in the Word file / PDF contents page, not in the PDF body.
* The Aug 2026 Word file differs from the PDF in about half of its text units, so it was not used.
* PDF inconsistencies: the contents page and body disagree for chapter 1's title, and for chapter 9 (9.1-9.4 vs 9.1-9.3);
  lesson 5.2 step 2 shows Python code in a Google Docs activity; the text layer writes "AI" as "Al".

## How the workbook is organised

* `Summary` - source inventory and status counts per book.
* `Book N - topic wise` - one row per chapter and lesson: titles in the DB / PDF / each Word file, PDF page range,
  class/home activity counts, title match %, and word coverage in both directions (how much of the PDF topic's wording is in
  the DB topic, and the reverse). Status: Same / Wording differs / Title differs / Different content / Only in DB /
  Only in source.
* `Book N - page wise` - every PDF page: role (contents, chapter opener, lesson start, continuation), chapter,
  lesson, class/home activity markers, and whether the database has that topic.

Method notes: word coverage compares distinct words of 3+ letters, so it measures wording, not layout or images.
Page ranges come from the PDF headings (a lesson runs from its first page to the page before the next heading).
