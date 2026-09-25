# CP Learning Hub

Solved competitive programming problems. Each project page has an interactive step-by-step demo built into the page, followed by the full C++ solution.

Live site: **https://yhcrow.github.io/IDK/**

| Project | Topic | Demo |
|---|---|---|
| Luogu P5730 显示屏 | Simulation | LCD Digits, Row by Row |
| Luogu P1028 数的计算 | DP | Half Prefix |
| Luogu P1002 过河卒 | Grid DP | River Pawn |
| Luogu P1044 栈 | Catalan numbers | Stack Permutation Trace |
| 高精度运算 | Big-number arithmetic | 高精度运算演示 |

Every solution was compiled and checked against its problem's sample.

## How it works

It is a static site with no build step. GitHub Actions publishes the `site/` folder to GitHub Pages on every push to the default branch (**Settings → Pages → Source: GitHub Actions**).

To run it on your computer, start a small web server (browsers block loading files from `file://`):

```bash
cd site
python3 -m http.server 8000
# open http://localhost:8000
```

## Adding a project

1. Write the explanation and code in a Markdown file, e.g. `site/content/projects/p1216.md`. You can use `$maths$`, `$$display maths$$`, tables and ` ```cpp ` code blocks.
2. Put the interactive demo, a self-contained HTML page, in `site/demos/`, e.g. `site/demos/p1216.html`.
3. Add an entry to `site/content/projects.json`:

```json
{
  "id": "p1216",
  "code": "P1216",
  "title": "数字三角形 · Number Triangle",
  "summary": "One sentence about the problem.",
  "tags": ["DP"],
  "file": "p1216.md",
  "demos": [
    { "name": "Demo name", "page": "demos/p1216.html", "desc": "What the demo shows." }
  ]
}
```

Projects appear on the home page in the order they are listed.

## Notes

- The demos in `site/demos/` are copies of the original interactive artifacts, so they work for every visitor. Each also opens on its own page with **Open full page**.
- Libraries are bundled in `site/vendor/` (marked, KaTeX, highlight.js), so the site does not depend on outside CDNs.
