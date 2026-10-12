---
title: Contributing
---

# Contributing

Thanks for helping. Two rules keep this handbook useful:

1. **Every design starts simple and earns its complexity.** Don't add a component without saying which number made it necessary.
2. **Your own words, your own diagrams.** Don't paste text or figures from books, courses or blogs. Link to them instead.

## Run the site locally

```bash
pip install -r requirements.txt
mkdocs serve          # http://127.0.0.1:8000
```

## Diagrams

Each diagram is defined once in `diagrams-src/*.js` as a short list of boxes and arrows. One command generates both:

- `docs/diagrams/<name>.svg`: the hand-drawn image shown on GitHub and the site.
- `docs/diagrams/<name>.excalidraw`: open it at [excalidraw.com](https://excalidraw.com) (*Open* → choose the file) to tweak the layout by hand.

Hand-written specs live in `diagrams-src/*.js`; specs generated during the first conversion live in `diagrams-src/generated/*.json`. Edit either, then rebuild:

```bash
npm install
npm run diagrams
```

## The PDF

```bash
pip install playwright pypdf pyyaml && playwright install chromium
mkdocs build && python scripts/build_pdf.py
```

This writes `docs/downloads/system-design-step-by-step.pdf` in navigation order, with bookmarks.

## Sketchnotes

Each one-page sketchnote is a JSON spec in `diagrams-src/sketchnotes/` (panels with text, bullets, highlighted numbers, tables and embedded diagrams). Rebuild them and their PDF with:

```bash
node tools/sketchnote.js diagrams-src/sketchnotes docs/sketchnotes
python scripts/build_sketch_pdf.py
```

Text in each panel shrinks automatically to fit; the tool warns if a panel still overflows.

A diagram should explain **one** idea. If it needs a paragraph to decode, split it in two.

## Problem page template

Copy this into `docs/problems/<name>.md`.

````markdown
---
title: <Problem name>
description: <one sentence: what makes this problem interesting>
tags: [<pattern>, <difficulty>]
---

# <Problem>: <the hard part, in a few words>

**Difficulty:** · **Patterns:** · **Core concepts:** · **DDIA:**

## TL;DR
- Three bullets you could say out loud.

## 1. Requirements
**Functional:** 3 numbered items. *Out of scope:* …

**Non-functional:**
| NFR | Target | Why it matters here |
|---|---|---|

## 2. Back-of-envelope numbers
Only the numbers that change a decision.

## 3. Core entities and API

## 4. v1: the simplest design, and where it breaks
![alt text](../diagrams/<name>-v1.svg)
What v1 is and how one request flows through it.

**Where it breaks:** the specific failure, with a number from section 2.

## 5. Evolving to the final design
![alt text](../diagrams/<name>-final.svg)

### Step 1: <what you add>
**Why:** the problem with the previous step, in plain words.

**How:** how the fix works, step by step, with the key query or command if there is one.

## 6. Deep dives
### <question the interviewer will ask>
**Why it's hard:** what goes wrong with the obvious approach, as a concrete scenario.

**How:** the solution and why it works, plus the trade-off you accept.

## 7. Interview script (45 minutes)
| Time | What you do | What you say |
|---|---|---|

## 8. Common mistakes

## Self-check

<details class="question" markdown>
<summary>A question the reader should be able to answer after this page</summary>

The answer in one or two sentences.

</details>

## Related
````

Every section must make sense on its own to someone new to the topic: say **why** the problem happens (a concrete scenario beats an abstract rule) and **how** the fix works, step by step. Sketchnotes are for revision; they never replace the explanation on the page.

Every page ends with three self-check questions in `<details>` blocks like the one above. They fold open on the website and on GitHub.
