# Study Hub

A personal study website for **Biology**, **Physics** and **Competitive Programming**, with:

- **Chapter notes** — written in Markdown, with maths (KaTeX), diagrams (Mermaid) and highlighted C++ code
- **Flashcards** — flip, then mark "Again" or "Got it"; keyboard shortcuts <kbd>Space</kbd> <kbd>1</kbd> <kbd>2</kbd>
- **Quizzes** — multiple choice with explanations; wrong answers are saved so you can **review mistakes**
- **Formula sheets** — one per subject, printable as PDF
- **Bilingual terms** — Biology and Physics show English + 中文; the **中** button hides/shows the Chinese
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
├── biology/
│   ├── 1.1-cell-structure.md   ← one Markdown file per topic
│   ├── formulas.md             ← the subject's formula sheet
│   └── cards.json              ← flashcards + quiz questions
├── physics/ …
└── cp/ …
```

### Add a note

1. Create a Markdown file, e.g. `site/content/biology/3.1-photosynthesis.md`.
2. Register it in `site/content/subjects.json` under a chapter:
   ```json
   { "id": "3.1", "title": { "en": "Photosynthesis", "zh": "光合作用" }, "file": "3.1-photosynthesis.md" }
   ```

Inside notes you can use:

| Write | You get |
|---|---|
| `{{Chloroplast\|叶绿体}}` | A bold term with its Chinese translation (hidden by the 中 button) |
| `$E_k = \tfrac12 mv^2$` | Inline maths |
| `$$ ... $$` | A displayed equation |
| a ` ```mermaid ` code block | A flowchart / diagram |
| a ` ```cpp ` code block | Highlighted C++ |
| `> **Exam tip:** ...` | A highlighted tip box |

### Add flashcards and quiz questions

In the subject's `cards.json`. Any text can be a plain string (English only) or `{ "en": ..., "zh": ... }`:

```json
{
  "flashcards": [
    { "topic": "3.1", "front": { "en": "Where does photosynthesis happen?", "zh": "光合作用在哪里进行？" },
      "back": { "en": "In the chloroplasts.", "zh": "在叶绿体中。" } }
  ],
  "quiz": [
    { "id": "bio-photo-1", "topic": "3.1",
      "q": "Which gas is released by photosynthesis?",
      "options": ["Carbon dioxide", "Oxygen", "Nitrogen", "Hydrogen"],
      "answer": 1,
      "explain": "Oxygen is released as a by-product." }
  ]
}
```

`answer` is the **index** of the correct option, starting from 0. Options are shuffled when shown. Give each quiz question a unique `id` so your saved mistakes stay linked to it.

### Add a new subject

Add an entry to `subjects.json` (`id`, `short`, `name`, `chapters`), and create a folder `site/content/<id>/` with the notes, `formulas.md` and `cards.json`. For a custom colour, add a `[data-subject="<id>"] { --accent: … }` rule in `site/assets/style.css`.

## Notes

- Progress, saved mistakes and your settings are stored in your browser (localStorage), so they are per device.
- Libraries are bundled in `site/vendor/` (marked, KaTeX, highlight.js, Mermaid), so the site does not depend on outside CDNs.
