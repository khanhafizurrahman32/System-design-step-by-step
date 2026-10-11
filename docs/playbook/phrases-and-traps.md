---
title: Phrases, signals and traps
description: What senior-level answers sound like, the habits that give away a junior answer, and phrases to avoid.
---

# Phrases, signals and traps

<span class="lvl lvl-i">Intermediate</span>

## What a senior answer sounds like

| Signal | Example |
|---|---|
| **Quantify the break** | "At 100k reads per second a single Postgres falls over, so the first thing I'd add is a cache. Traffic is skewed, so I expect an 80%+ hit rate." |
| **Name the trade-off** | "Fan-out on write makes reads one lookup but costs one write per follower, so I'll switch to pull above ~100k followers." |
| **Choose consistency per feature** | "The stock decrement is strongly consistent through a conditional update; the product page is cached and can be a few seconds stale." |
| **Raise failure modes unprompted** | "If the payment call times out we don't know whether it charged, so the order stays pending and we reconcile by our idempotency key." |
| **Start simple, on purpose** | "One Postgres handles this write rate, so I won't shard. If writes grow 10×, I'd shard by user ID." |
| **Tie choices to requirements** | "We need replay and several consumers, so Kafka rather than a queue." |

## Habits that give away a junior answer

- Listing technologies without saying what problem each solves.
- "We'll use microservices and Kafka" before any numbers.
- Ignoring retries, timeouts and partial failure.
- Sharding at a few hundred requests per second.
- Treating the whole system as either "strongly" or "eventually" consistent.
- Designing in silence, then presenting.

## Phrases to avoid, and what to say instead

| Instead of | Say |
|---|---|
| "It's eventually consistent" (about money) | "Payments are strongly consistent; only the dashboard is eventually consistent." |
| "Just add more servers" (for a hot key) | "More servers don't help one hot key. I'll split the key or cache it locally." |
| "We'll use a distributed transaction across services" | "I'll use a saga with compensating steps and idempotent handlers." |
| "Redis lock, done" | "A Redis lock with a TTL plus a fencing check in the database, so a paused process can't write late." |
| "NoSQL scales better" | "This access pattern is key-based at 50k writes/s, which suits Cassandra. Postgres would need sharding to match." |
| "We'll cache everything" | "We'll cache the read-heavy, tolerant-of-staleness paths; checkout reads the database." |

## NFR checklist for the first five minutes

- [ ] Scale: DAU, peak QPS, read:write ratio
- [ ] Latency: which path, which percentile
- [ ] Availability target, and what can degrade
- [ ] Consistency: where stale or duplicate data is unacceptable
- [ ] Durability: can anything ever be lost?
- [ ] Data size and growth
- [ ] Anything special: security, privacy, cost, regions

## Related

- [The 45-minute delivery framework](delivery-framework.md)
- [Non-functional requirements](../foundations/nfrs.md)
