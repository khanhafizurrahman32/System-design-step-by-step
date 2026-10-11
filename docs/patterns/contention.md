---
title: "Dealing with contention"
description: "Many users want the same thing at the same moment. Exactly one should win, every time."
tags: [pattern]
---

# Dealing with contention

<span class="lvl lvl-i">Intermediate</span>

*Many users want the same thing at the same moment. Exactly one should win, every time.*

> [!TIP]
> **One-page sketchnote:** [DEALING WITH CONTENTION on a single page](../sketchnotes/pattern-contention.svg), for revision or printing.

## When to reach for it

- Limited resources: seats, stock, a username, a driver, the highest bid.
- Any "check, then act" sequence that two requests can run at the same time.

## The idea in one diagram

![Pattern 4: Dealing with Contention](../diagrams/pattern-contention.svg)

1. Check-then-act from two users: both see AVAILABLE, both book. A race condition (DDIA Ch 7 write skew).
2. Make the check and the write **one atomic statement**. The database guarantees only one succeeds.
3. Other tools: pessimistic lock (high contention), optimistic version check (low contention), distributed lock with TTL (holds across services), or a per-item queue (extreme contention).

| Tool | Use when |
|---|---|
| Atomic conditional UPDATE | Single row, single DB: the default |
| SELECT … FOR UPDATE | Multi-step logic on few rows, high contention |
| Optimistic (version column) | Low contention; retry on conflict |
| Redis lock SET NX PX | Temporary holds across services (seat hold, driver lock) |
| Queue per resource | Extreme hot spots (auction last seconds) |

## Decision checklist

1. Can the check and the write be one statement? Use a conditional UPDATE (… WHERE status = AVAILABLE). This is the default.
2. Multi-step logic on a few rows with high contention? SELECT … FOR UPDATE, locking rows in a fixed order.
3. Low contention? Optimistic concurrency with a version column; retry on conflict.
4. A temporary hold that spans services? A lock with a TTL (Redis SET NX EX), plus a fencing token if correctness depends on it.
5. Extremely hot single item? Serialize requests through a queue partitioned by item.

## In the interview

> [!TIP]
> "The check and the write must be atomic, so the hold is a single conditional UPDATE. One row updated means you got the seat; zero means someone else did."

## Common mistakes

- Check-then-act in application code.
- Holding database locks while waiting on a human (payment, form).
- Trusting a distributed lock without fencing when a paused process could wake up later.

## Problems that use it

- [Rate limiter](../problems/rate-limiter.md): Every public API needs one, and the obvious implementation has a race condition.
- [Online auction](../problems/online-auction.md): Many people bid on one row at the same time, and exactly one of them must win each race.
- [Ticketmaster](../problems/ticketmaster.md): Millions of people arrive for one on-sale, and no seat may ever be sold twice.

## The theory underneath

- [DDIA Ch 7: Transactions](../ddia/07-transactions.md)
- [DDIA Ch 8: Trouble with distributed systems](../ddia/08-trouble-with-distributed-systems.md)
