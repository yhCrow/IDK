# CP Learning Hub

A personal study website for **Competitive Programming**, with:

- **Chapter notes** — written in Markdown, with maths (KaTeX), diagrams (Mermaid) and highlighted C++ code
- **Solved problems** — Luogu P5730, P1028, P1002, P1044 and high-precision arithmetic, each with the idea, full tested C++ code, the sample, and a link to its interactive trace
- **Link shelf** — 46 judges, guides, references, libraries and tools
- **Flashcards** — flip, then mark "Again" or "Got it"; keyboard shortcuts <kbd>Space</kbd> <kbd>1</kbd> <kbd>2</kbd>
- **Quizzes** — multiple choice with explanations; wrong answers are saved so you can **review mistakes**
- **Cheat sheet** — complexity limits, STL reference and templates, printable as PDF
- Search, progress tracking ("Mark as done"), dark mode, works on phones

It is a static site (no build step), hosted free on GitHub Pages at
**https://yhcrow.github.io/IDK/**.

## Turning on GitHub Pages (one time)

1. The repository must be **public** (or you need GitHub Pro).
2. Go to **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Push to the default branch (or run the workflow from the **Actions** tab). The site deploys in about a minute.

## Running it on your computer

Browsers block loading notes from `file://`, so start a tiny web server:

```bash
cd site
python3 -m http.server 8000
# open http://localhost:8000
```

## Adding your own content

Everything lives in `site/content/`:

```
site/content/
├── subjects.json          ← list of subjects, chapters and topics
└── cp/
    ├── 1.1-complexity.md   ← one Markdown file per topic
    ├── 3.1-p5730-display.md ← solved problems (chapter 3)
    ├── formulas.md         ← the cheat sheet
    └── cards.json          ← flashcards + quiz questions
```

### Add a note

1. Create a Markdown file, e.g. `site/content/cp/2.3-two-pointers.md`.
2. Register it in `site/content/subjects.json` under a chapter:
   ```json
   { "id": "2.3", "title": "Two Pointers", "file": "2.3-two-pointers.md" }
   ```

Inside notes you can use:

| Write | You get |
|---|---|
| `{{Prefix sum\|前缀和}}` | A bold term with its Chinese translation |
| `$O(n \log n)$` | Inline maths |
| `$$ ... $$` | A displayed equation |
| a ` ```mermaid ` code block | A flowchart / diagram |
| a ` ```cpp ` code block | Highlighted C++ |
| `> **Exam tip:** ...` | A highlighted tip box |

### Add flashcards and quiz questions

In `site/content/cp/cards.json`. Text can use `code`, **bold** and `$maths$`. Any text can also be `{ "en": ..., "zh": ... }` to show both languages:

```json
{
  "flashcards": [
    { "topic": "2.3", "front": "When do two pointers work?",
      "back": "When moving one pointer forward never requires moving the other one back." }
  ],
  "quiz": [
    { "id": "cp-2ptr-1", "topic": "2.3",
      "q": "What is the complexity of the two-pointer sweep?",
      "options": ["$O(n^2)$", "$O(n)$", "$O(\\log n)$", "$O(n \\log n)$"],
      "answer": 1,
      "explain": "Each pointer moves at most $n$ times in total." }
  ]
}
```

`answer` is the **index** of the correct option, starting from 0. Options are shuffled when shown. Give each quiz question a unique `id` so your saved mistakes stay linked to it.

### Add a new subject

Add an entry to `subjects.json` (`id`, `short`, `name`, `chapters`), and create a folder `site/content/<id>/` with the notes, `formulas.md` and `cards.json`. For a custom colour, add a `[data-subject="<id>"] { --accent: … }` rule in `site/assets/style.css`.

## Notes

- Progress, saved mistakes and your settings are stored in your browser (localStorage), so they are per device.
- Libraries are bundled in `site/vendor/` (marked, KaTeX, highlight.js, Mermaid), so the site does not depend on outside CDNs.
