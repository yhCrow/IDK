# CP Learning Hub

Solved competitive programming problems, each with the full C++ solution and a link to its interactive step-by-step demo.

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
2. Add an entry to `site/content/projects.json`:

```json
{
  "id": "p1216",
  "code": "P1216",
  "title": "数字三角形 · Number Triangle",
  "summary": "One sentence about the problem.",
  "tags": ["DP"],
  "file": "p1216.md",
  "demos": [
    { "name": "Demo name", "url": "https://claude.ai/artifact/...", "desc": "What the demo shows." }
  ]
}
```

Projects appear on the home page in the order they are listed.

## Notes

- The demo links point to Claude artifacts, which are private until you share them from each artifact's Share menu.
- Libraries are bundled in `site/vendor/` (marked, KaTeX, highlight.js), so the site does not depend on outside CDNs.
