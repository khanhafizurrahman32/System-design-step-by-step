---
title: "URL shortener (Bitly)"
description: "It sounds like a toy, but it is the cleanest example of a read-heavy system: almost every request is a redirect."
tags: [scaling-reads, easy]
---

# URL shortener (Bitly)

<span class="lvl lvl-b">Beginner-friendly</span>

**Difficulty:** Easy · **Patterns:** [Scaling reads](../patterns/scaling-reads.md) · **DDIA:** [Ch 5](../ddia/05-replication.md) replicas · [Ch 6](../ddia/06-partitioning.md) hash sharding

*It sounds like a toy, but it is the cleanest example of a read-heavy system: almost every request is a redirect.*

> [!TIP]
> **One-page sketchnote:** [URL SHORTENER (BITLY) on a single page](../sketchnotes/problem-url-shortener.svg), for revision or printing.

## TL;DR

- Redirects outnumber new links about 100 to 1, so the design is mostly about serving reads fast.
- Generate short codes from a counter encoded in base62: unique by construction, no collision checks.
- Put a cache in front of the database; a small share of links gets most clicks, so the hit rate is high.

## 1. Requirements

**Functional**

1. Create a short URL for a long URL (optional custom alias, expiry)
2. Redirect short URL → original URL

**Non-functional**

- Redirect p99 < 100ms
- 99.99% available for redirects
- Short codes globally unique
- Read:write ≈ 100:1

## 2. Back-of-envelope numbers

100M DAU × 10 clicks = 1B redirects/day ≈ **12k/s avg, ~100k/s peak**. Writes ~1M/day ≈ 12/s. 1B URLs × 500B = **500GB**, which fits one Postgres.

## 3. Core entities and API

```text
urls(code PK, long_url, user_id, created_at, expires_at)
```

```http
POST /urls {long_url, alias?, expires_at?} → short_url
GET /{code} → 302 Location: long_url
```

## 4. v1: the simplest design, and where it breaks

Start simple: a write service creates a code and stores it in Postgres. ~12 writes/sec is nothing.

## 5. Evolving to the final design

![URL shortener (Bitly): final design](../diagrams/problem-url-shortener-final.svg)

Each step fixes one specific problem with the step before it:

1. Start simple: a write service creates a code and stores it in Postgres. ~12 writes/sec is nothing.
2. Redirects are 100× more frequent. 100k reads/sec straight to Postgres is what breaks first.
3. Add a Redis cache (code → URL). Clicks follow Pareto, so 80%+ hit the cache in under 1ms. Postgres only sees misses; add replicas if needed.
4. Generate codes from a global counter: Redis INCR + base62. 7 chars = 3.5 trillion codes, no collisions. Servers grab IDs in batches of 1,000.

## 6. Deep dives

### How do you guarantee unique codes?

Counter + base62 is unique by construction. Hashing (MD5 prefix) needs a unique constraint plus retry on collision. Counters are guessable, so add a reversible shuffle if that matters.

### 301 or 302?

**302**: every click reaches you (analytics, expiry, editing). 301 lets browsers cache it, which cuts load but loses analytics.

### What if the counter node dies?

Redis with AOF + replica, or servers lease ranges from a Postgres sequence. A crash wastes a range; gaps are harmless.

### Custom aliases?

Same table with a unique constraint; the insert fails if taken. Keep namespaces apart (e.g., counter codes are 7 chars, aliases ≥ 8).

## 7. Interview script (45 minutes)

| Time | What you do | Content |
|---|---|---|
| 0–5 | Functional requirements | Create a short URL for a long URL (optional custom alias, expiry); Redirect short URL → original URL |
| 5–8 | Non-functional requirements | Redirect p99 < 100ms; 99.99% available for redirects; Short codes globally unique; Read:write ≈ 100:1 |
| 8–10 | Numbers that drive the design | 100M DAU × 10 clicks = 1B redirects/day ≈ **12k/s avg, ~100k/s peak**. Writes ~1M/day ≈ 12/s. 1B URLs × 500B = **500GB**, which fits one Postgres. |
| 10–13 | Entities and API | Keep it short: the endpoints in §3, idempotency keys on writes. |
| 13–25 | v1, then evolve it | Draw v1 and show where it breaks. Then add, in order: Redirect service → Redis cache → Redis counter. Justify each addition with a number. |
| 25–40 | Deep dives | How do you guarantee unique codes? · 301 or 302? · What if the counter node dies? · Custom aliases? |
| 40–45 | Wrap-up | Remaining bottlenecks, failure modes, what you would monitor. |


## Staff-level lens

| Question | Staff answer |
|---|---|
| **The real problem** | Serve redirects fast at 100:1 read-heavy, and make codes unique without coordination. |
| **Deciding number** | ~100k redirects/s peak vs ~12 writes/s; 1B links × 500 B ≈ 500 GB, one Postgres. |
| **Staff call and trade-off** | Cache-aside Redis plus replicas; counter + base62 with servers leasing ID ranges. Accept guessable codes, or add a reversible shuffle. |
| **Raise before you're asked** | A viral link expiring from cache (stampede); losing the counter node (leased ranges make gaps harmless); phishing links. |
| **Senior stops at** | Cache in front of the DB. |
| **Staff goes on to** | Treats 301 vs 302 as a product decision (analytics vs load), adds abuse scanning, serves redirects from the edge for global latency. |
| **Run it** | SLO: p99 redirect < 100 ms. Watch hit ratio and DB miss QPS. Next step at 10×: edge key-value store at the CDN. |

All 29 problems through this lens: [Staff-level answers](../playbook/staff-level.md).

## 8. Common mistakes

- Sharding 500GB at 12 writes/sec. It fits one machine; scale reads with cache and replicas.
- Adding components before showing which number makes them necessary.
- Skipping failure handling: what happens on timeouts, retries and crashes.

## Related

- **Patterns:** [Scaling reads](../patterns/scaling-reads.md)
- **DDIA:** [Ch 5](../ddia/05-replication.md) replicas · [Ch 6](../ddia/06-partitioning.md) hash sharding
- **Similar problems:** [Rate limiter](rate-limiter.md) · [Business discovery (Yelp)](business-discovery.md) · [News feed (Facebook)](news-feed.md) · [News aggregator (Google News)](news-aggregator.md)
