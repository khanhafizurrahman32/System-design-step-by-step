# System Design, Step by Step

A free, diagram-first handbook for system design interviews and for real systems.

Most resources show you a finished architecture and expect you to memorize it. This one shows **how you get there**: start with the simplest design that works, calculate where it breaks, fix only that, and repeat. Every page has hand-drawn diagrams you can open and edit in [Excalidraw](https://excalidraw.com).

![How this handbook fits together](docs/diagrams/handbook-map.svg)

## Two ways to use it

| If you want to… | Do this |
|---|---|
| **Learn** | Read in order: Foundations → Core concepts → Patterns → Problems. Each problem page walks from a naive **v1** to the final design. |
| **Prepare for an interview** | Go straight to a problem page and use **§7 Interview script**: a minute-by-minute plan for 45 minutes. Read the *Common mistakes* the night before. |

## Contents

This is the **pilot**: four pages in the final format. The rest follows the same template.

| Section | Pages | Status |
|---|---|---|
| Foundations | NFRs and how to quantify them · numbers to know · CAP and PACELC | planned |
| Core concepts | [Caching](docs/core-concepts/caching.md) · networking · API design · data modeling · indexing · sharding · consistent hashing · CAP · numbers | ✅ 1 of 9 |
| Patterns | Scaling reads · scaling writes · real-time updates · contention · multi-step processes · large blobs · long-running tasks | planned |
| Technologies | Postgres · Redis · Kafka · Cassandra · DynamoDB · Elasticsearch · Flink · ZooKeeper · API gateway | planned |
| DDIA, chapter by chapter | [Ch 5 Replication](docs/ddia/05-replication.md) · partitioning · transactions · distributed-systems failures · consistency and consensus … | ✅ 1 of 12 |
| Problems | [Ticketmaster](docs/problems/ticketmaster.md) · URL shortener · news feed · chat · ride sharing · payments · … (29 total) | ✅ 1 of 29 |
| Low-level design | File system · movie booking · logger · inventory | planned |
| Interview playbook | 45-minute delivery script · NFR checklist · phrases that signal seniority · traps | planned |

## How every problem page is structured

1. **TL;DR**: three lines you could say out loud.
2. **Requirements**: functional, then non-functional with numbers. The NFRs drive every later decision.
3. **Back-of-envelope numbers**: only the ones that change the design.
4. **Core entities and API**
5. **v1, and where it breaks**: the simplest design, with a diagram of the failure.
6. **Final design**: a diagram, plus a table of *why each component exists*.
7. **Deep dives**: the questions an interviewer will push on.
8. **Interview script**: what to do and say, minute by minute.
9. **Common mistakes** and **related** pages.

## Contributing

Fixes and new pages are welcome. See [CONTRIBUTING](CONTRIBUTING.md) for the page template and how to edit diagrams.

## Credits

Written in our own words, with our own diagrams. The DDIA pages are study summaries of *Designing Data-Intensive Applications* by Martin Kleppmann; please read the book. Diagrams use the open-source [Excalifont](https://plus.excalidraw.com/excalifont) (SIL OFL 1.1). Not affiliated with any company or course mentioned.

<!-- Generated from docs/index.md by scripts/sync_readme.py. Edit that file instead. -->
