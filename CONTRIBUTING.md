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

## 5. Final design
![alt text](../diagrams/<name>-final.svg)
| Component | Why it exists |
|---|---|

## 6. Deep dives
### 6.1 <question the interviewer will ask>

## 7. Interview script (45 minutes)
| Time | What you do | What you say |
|---|---|---|

## 8. Common mistakes

## Related
````
