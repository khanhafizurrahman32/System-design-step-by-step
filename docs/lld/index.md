---
title: Low-level design
description: How to approach object-oriented design interviews, plus four worked problems with class diagrams and Java code.
---

# Low-level design

<span class="lvl lvl-i">Intermediate</span>

Low-level design (LLD) interviews ask you to model one component in code: its classes, their responsibilities, and how they behave when many threads use them at once.

## The approach

1. **Clarify requirements.** List the operations (`mkdir`, `book`, `log`, `transfer`) and the rules (no double booking, levels filter logs).
2. **Find the entities.** Nouns in the requirements become candidate classes. Keep only the ones with behavior or state.
3. **Assign responsibilities.** Each class should have one reason to change. Put a method on the class that owns the data it needs.
4. **Choose relationships.** Prefer composition ("has a") to inheritance; use interfaces where behavior varies (sinks, strategies).
5. **Handle concurrency.** Ask "what if two threads do this at once?" for every operation that reads then writes. Lock at the right granularity.
6. **Plan for change.** Show where a new requirement plugs in: a new sink, a new seat type, a new storage backend.

> [!TIP]
> **Say this in the interview:** "I'll start with the entities and their responsibilities, then walk through each operation, and then check every read-then-write for race conditions."

## Patterns that come up again and again

| Pattern | Use it for | Example here |
|---|---|---|
| **Composite** | Trees where leaves and containers share an interface | [File system](file-system.md) |
| **Strategy** | Interchangeable behavior | Log formatters in the [logger](logger.md) |
| **Observer** | Notify others when something happens | Low-stock alerts in [inventory](inventory.md) |
| **Producer–consumer** | Decouple callers from slow work | Async log dispatch |
| **Fine-grained locking** | Concurrency without one global lock | Per-show locks in [movie booking](movie-booking.md) |
| **Lock ordering** | Avoid deadlocks when taking two locks | Warehouse transfers in [inventory](inventory.md) |

## Problems

| Problem | Main idea |
|---|---|
| [In-memory file system](file-system.md) | Composite tree, path resolution, read/write locking |
| [Movie ticket booking](movie-booking.md) | Atomic all-or-nothing seat holds with expiry, locked per show |
| [Logging library](logger.md) | Levels, pluggable sinks and formatters, async dispatch |
| [Inventory management](inventory.md) | Per-warehouse locks, deadlock-free transfers, low-stock observers |
