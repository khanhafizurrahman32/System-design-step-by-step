---
title: "Collaborative editor (Google Docs)"
description: "The challenge is correctness, not scale: everyone must end up with the same document."
tags: [real-time-updates, hard]
---

# Collaborative editor (Google Docs)

<span class="lvl lvl-a">Advanced</span>

**Difficulty:** Hard · **Patterns:** [Real-time updates](../patterns/real-time-updates.md) · **DDIA:** [Ch 5](../ddia/05-replication.md) conflict resolution · [Ch 9](../ddia/09-consistency-and-consensus.md) total order · [Ch 11](../ddia/11-stream-processing.md) event log

*The challenge is correctness, not scale: everyone must end up with the same document.*

> [!TIP]
> **One-page sketchnote:** [COLLABORATIVE EDITOR (GOOGLE DOCS) on a single page](../sketchnotes/problem-collaborative-editor.svg), for revision or printing.

## TL;DR

- Send small operations, not whole documents; last-write-wins on documents loses people's work.
- One server per document orders operations and transforms concurrent ones (OT); CRDTs are the serverless alternative.
- Append every operation to a log before acknowledging it, and snapshot periodically for fast loading.

## 1. Requirements

**Functional**

1. Create and open documents
2. Many users edit concurrently and see each other's changes live
3. See collaborators' cursors and presence

**Non-functional**

- Remote edits visible < 100ms
- All replicas converge to the same document
- No lost edits (durable)
- ~100 concurrent editors per doc; millions of docs

## 2. Back-of-envelope numbers

Each keystroke is an op (~100B). 100 editors × 5 ops/s = 500 ops/s per hot doc, which one server handles easily. The challenge is correctness, not scale.

## 3. Core entities and API

```text
doc_ops(doc_id, version, op) append-only
doc_snapshots(doc_id, version, content)
```

```http
WS /docs/{id}: send op {type, pos, char, base_version}; receive transformed ops
GET /docs/{id} (snapshot + version)
```

## 4. v1: the simplest design, and where it breaks

![Collaborative editor (Google Docs): v1 design](../diagrams/problem-collaborative-editor-v1.svg)

Each user edits a local copy of the document, and the app **saves the whole document** to the server every few seconds. Other users periodically reload it.

**Where it breaks:** Alice and Bob both open the doc. Alice fixes a typo in paragraph 1; Bob adds a sentence to paragraph 5. Both save. The server keeps whichever save arrives **last**, so the other person's work **disappears** without warning (last write wins). With 100 people editing, almost everyone's changes get overwritten. And edits only appear after the next save and reload, nowhere near the 100 ms target for seeing others type.

## 5. Evolving to the final design

![Collaborative editor (Google Docs): final design](../diagrams/problem-collaborative-editor-final.svg)

Each step fixes one specific problem with the step before it.

### Step 1: send operations, ordered and transformed by one server

**Why:** whole-document saves can't be merged. Small **operations** can, but concurrent operations interfere. If Alice inserts 3 characters at position 2 while Bob deletes the character at position 10, by the time Bob's delete arrives, the character he meant is now at position 13. Applying "delete at 10" blindly deletes the wrong character.

**How:** each keystroke becomes an operation like `insert("x", pos 5)`, tagged with the **document version** it was based on, sent over a WebSocket. One server per document receives all operations, puts them in a **single order**, and **transforms** each one against any operations it hadn't seen. Bob's "delete at 10, based on version 41" is adjusted to "delete at 13", because Alice's insert (version 42) shifted the text. This is **Operational Transformation (OT)**. The server broadcasts the transformed operation to everyone, and all copies end up identical.

### Step 2: make every operation durable before acknowledging it

**Why:** an acknowledged edit must never be lost, even if the server crashes. And loading a document by replaying millions of operations from the start would be slow.

**How:** append each operation to an **op log** (`doc_ops(doc_id, version, op)`) **before** acknowledging and broadcasting it. Periodically save a **snapshot** of the full document at a version. To open a document, load the latest snapshot and apply only the operations after it.

### Step 3: route every editor of a document to the same server

**Why:** OT needs **one** place deciding the order for each document. If two servers both accepted operations for the same doc, they'd order them differently and the copies would diverge.

**How:** route WebSocket connections by `doc_id` using **consistent hashing**, so all editors of a document reach the same server. Record which server **owns** which document in a coordination service (ZooKeeper or etcd), so after a server failure ownership moves cleanly to exactly one new server, which reloads the snapshot and op log.

## 6. Deep dives

### OT or CRDT?

**Why there are two approaches:** both solve "concurrent edits must converge", in different ways.

**How they differ:**

- **OT (Operational Transformation):** a central server orders operations and transforms them against each other. Operations stay small and simple, but you need that coordinator per document. Google Docs works this way.
- **CRDTs (Conflict-free Replicated Data Types):** each character gets a unique, ordered identifier, so operations **commute**: they can be applied in any order and still converge. No central server is needed, which suits offline editing and peer-to-peer. The cost is extra metadata per character, and more complex data structures. Figma's multiplayer and libraries like Yjs and Automerge take this approach.

In an interview, OT with a server per document is the simpler story when there's always a server. Mention CRDTs for offline-first.

### Why one server per doc?

**Why it's needed:** OT's correctness depends on every operation being transformed against a **single, agreed order** of the operations before it. That's a **total order**, which requires one place making the decision ([DDIA Ch 9](../ddia/09-consistency-and-consensus.md)).

**Why it's fine:** a hot document has ~100 editors doing a few operations a second each, about **500 operations a second**, which one server handles easily. The many millions of documents are spread across many servers, so the system scales by documents, not by splitting one document.

### Offline edits?

**Why it's tricky:** a user edits on a plane for an hour. Meanwhile, others changed the same document hundreds of times.

**How:** the client **buffers** its operations locally, each tagged with the **base version** it last saw. On reconnect, it sends them. The server transforms them against **every** operation since that version, in order, then applies and broadcasts the results. The client also receives the missed operations and transforms its view similarly. Very long divergences may be shown as suggestions instead.

### Cursors?

**Why they're different:** showing where collaborators' cursors are, and who's present, is important for the experience but has no long-term value. Old cursor positions are worthless.

**How:** send cursor and presence updates over the **same WebSocket**, but treat them as **ephemeral**: broadcast to other editors, throttled to a few updates a second, and **never** written to the op log or database. If one is lost, the next update replaces it.

## 7. Interview script (45 minutes)

| Time | What you do | Content |
|---|---|---|
| 0–5 | Functional requirements | Create and open documents; Many users edit concurrently and see each other's changes live; See collaborators' cursors and presence |
| 5–8 | Non-functional requirements | Remote edits visible < 100ms; All replicas converge to the same document; No lost edits (durable); ~100 concurrent editors per doc; millions of docs |
| 8–10 | Numbers that drive the design | Each keystroke is an op (~100B). 100 editors × 5 ops/s = 500 ops/s per hot doc, which one server handles easily. The challenge is correctness, not scale. |
| 10–13 | Entities and API | Keep it short: the endpoints in §3, idempotency keys on writes. |
| 13–25 | v1, then evolve it | Draw v1 and show where it breaks. Then add, in order: Document server → Op log → Snapshots → LB → ZooKeeper. Justify each addition with a number. |
| 25–40 | Deep dives | OT or CRDT? · Why one server per doc? · Offline edits? · Cursors? |
| 40–45 | Wrap-up | Remaining bottlenecks, failure modes, what you would monitor. |


## Staff-level lens

| Question | Staff answer |
|---|---|
| **The real problem** | Every client must converge to the same document. |
| **Deciding number** | ~500 ops/s on a hot document; correctness, not scale. |
| **Staff call and trade-off** | One owner server per document running OT, with an op log and snapshots. Accept a short pause when the owner fails over. |
| **Raise before you're asked** | Owner failover; merging offline edits; very large documents. |
| **Senior stops at** | Names OT or CRDT. |
| **Staff goes on to** | Chooses between them from requirements (offline, server cost), assigns ownership via a coordination service, plans version history. |
| **Run it** | Watch op latency, convergence errors, snapshot size. |

All 29 problems through this lens: [Staff-level answers](../playbook/staff-level.md).

## 8. Common mistakes

- Locking the document or paragraph, which defeats real-time collaboration.
- Adding components before showing which number makes them necessary.
- Skipping failure handling: what happens on timeouts, retries and crashes.

## Self-check

Try to answer before you open each one.

<details class="question" markdown>
<summary>Why send operations instead of whole documents?</summary>

Last-write-wins on whole documents loses concurrent edits; small operations can be merged.

</details>

<details class="question" markdown>
<summary>Why one server per document?</summary>

It gives a single place to order and transform concurrent operations (OT).

</details>

<details class="question" markdown>
<summary>When would you choose CRDTs over OT?</summary>

When you need offline or peer-to-peer editing without a central server ordering operations.

</details>

## Related

- **Patterns:** [Real-time updates](../patterns/real-time-updates.md)
- **DDIA:** [Ch 5](../ddia/05-replication.md) conflict resolution · [Ch 9](../ddia/09-consistency-and-consensus.md) total order · [Ch 11](../ddia/11-stream-processing.md) event log
- **Similar problems:** [Ride sharing (Uber)](ride-sharing.md) · [Live comments (Facebook Live)](live-comments.md) · [Stock trading (Robinhood)](stock-trading.md) · [Online auction](online-auction.md)
