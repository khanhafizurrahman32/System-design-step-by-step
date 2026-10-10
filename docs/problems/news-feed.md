---
title: "News feed (Facebook)"
description: "The canonical fan-out problem: build a personalised feed for billions of users in a few hundred milliseconds."
tags: [scaling-reads, medium]
---

# News feed (Facebook)

**Difficulty:** Medium · **Patterns:** [Scaling reads](../patterns/scaling-reads.md) · **DDIA:** [Ch 1](../ddia/01-reliability-scalability-maintainability.md) Twitter load · [Ch 11](../ddia/11-stream-processing.md) materialized views · [Ch 6](../ddia/06-partitioning.md) hot keys

*The canonical fan-out problem: build a personalised feed for billions of users in a few hundred milliseconds.*

> [!TIP]
> **One-page sketchnote:** [NEWS FEED (FACEBOOK) on a single page](../sketchnotes/problem-news-feed.svg), for revision or printing.

## TL;DR

- Computing the feed on every read means hundreds of queries per page view, so precompute it when people post.
- Push new post IDs into each follower's feed list in Redis (fan-out on write); a feed read becomes one lookup.
- Accounts with millions of followers break fan-out on write, so pull their posts at read time instead (hybrid).

## 1. Requirements

**Functional**

1. Create posts
2. Follow users
3. View feed of followed users' posts, newest first, paginated

**Non-functional**

- Feed p99 < 500ms
- 2B users; eventual consistency (post appears within ~1 min)
- Handle accounts with millions of followers
- Highly available

## 2. Back-of-envelope numbers

1B DAU × 10 feed loads = **~115k feed reads/s**. ~500M posts/day ≈ 6k/s. With ~200 followers each, fan-out on write ≈ **1.2M feed inserts/s**.

## 3. Core entities and API

```text
posts(id, author_id, content, ts) partitioned by author
follows(follower_id, followee_id) + reverse index
feed:{user} = Redis ZSET(ts, post_id), capped at 500
```

```http
POST /posts {content}
PUT /users/{id}/followers
GET /feed?cursor=(ts,post_id)
```

## 4. v1: the simplest design, and where it breaks

![News feed (Facebook): v1 design](../diagrams/problem-news-feed-v1.svg)

Fan-out on **read**: look up 200 followees, then their posts, on every feed load. At 115k feeds/sec that is millions of queries/sec.

## 5. Evolving to the final design

![News feed (Facebook): final design](../diagrams/problem-news-feed-final.svg)

Each step fixes one specific problem with the step before it:

1. Fan-out on **read**: look up 200 followees, then their posts, on every feed load. At 115k feeds/sec that is millions of queries/sec.
2. Fan-out on **write**: a new post goes to Kafka; workers push its ID into every follower's Redis sorted set. A feed load becomes one ZREVRANGE.
3. Celebrity problem: one post to 100M followers means 100M writes. Hybrid: skip fan-out above ~100k followers and merge their recent posts at read time.
4. Hydrate post IDs into content from the posts store, with a post cache. Cursor pagination on (ts, post_id).

## 6. Deep dives

### Celebrity with 100M followers?

Hybrid. Don't fan out; followers pull celebrity posts at read time and merge. Threshold ~100k–1M followers.

### How much memory for feeds?

Only active users, only IDs, capped at 500: 300M × 500 × ~8B ≈ 1.2TB across a Redis cluster. Inactive users get rebuilt on demand.

### Pagination?

Cursor = (ts, post_id) of the last item. Offsets shift as new posts arrive.

### User follows someone new?

An async job backfills the followee's recent posts into the follower's feed.

## 7. Interview script (45 minutes)

| Time | What you do | Content |
|---|---|---|
| 0–5 | Functional requirements | Create posts; Follow users; View feed of followed users' posts, newest first, paginated |
| 5–8 | Non-functional requirements | Feed p99 < 500ms; 2B users; eventual consistency (post appears within ~1 min); Handle accounts with millions of followers; Highly available |
| 8–10 | Numbers that drive the design | 1B DAU × 10 feed loads = **~115k feed reads/s**. ~500M posts/day ≈ 6k/s. With ~200 followers each, fan-out on write ≈ **1.2M feed inserts/s**. |
| 10–13 | Entities and API | Keep it short: the endpoints in §3, idempotency keys on writes. |
| 13–25 | v1, then evolve it | Draw v1 and show where it breaks. Then add, in order: Kafka → Fan-out workers → Redis feeds → Celebrity posts. Justify each addition with a number. |
| 25–40 | Deep dives | Celebrity with 100M followers? · How much memory for feeds? · Pagination? · User follows someone new? |
| 40–45 | Wrap-up | Remaining bottlenecks, failure modes, what you would monitor. |


## Staff-level lens

| Question | Staff answer |
|---|---|
| **The real problem** | Fan-out cost at write time vs latency at read time. |
| **Deciding number** | 115k feed reads/s; ~1.2M feed inserts/s with fan-out on write; celebrities with 100M followers. |
| **Staff call and trade-off** | Hybrid: push to followers below a threshold (~100k), pull celebrity posts at read. Accept a merge step at read and feeds up to a minute stale. |
| **Raise before you're asked** | Fan-out backlog after a celebrity post; Redis memory (only active users, capped lists); deletes and unfollows propagating. |
| **Senior stops at** | Fan-out on write. |
| **Staff goes on to** | Picks the threshold from numbers, rebuilds feeds for inactive users on demand, separates ranking into its own service, counts memory cost. |
| **Run it** | Watch feed p99, fan-out lag, worker queue depth, Redis memory. Next: candidate generation + ranking model. |

All 29 problems through this lens: [Staff-level answers](../playbook/staff-level.md).

## 8. Common mistakes

- Fan-out on write for everyone: one celebrity post means 100M writes and workers hours behind.
- Adding components before showing which number makes them necessary.
- Skipping failure handling: what happens on timeouts, retries and crashes.

## Related

- **Patterns:** [Scaling reads](../patterns/scaling-reads.md)
- **DDIA:** [Ch 1](../ddia/01-reliability-scalability-maintainability.md) Twitter load · [Ch 11](../ddia/11-stream-processing.md) materialized views · [Ch 6](../ddia/06-partitioning.md) hot keys
- **Similar problems:** [URL shortener (Bitly)](url-shortener.md) · [Rate limiter](rate-limiter.md) · [Business discovery (Yelp)](business-discovery.md) · [News aggregator (Google News)](news-aggregator.md)
