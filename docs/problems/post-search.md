---
title: "Post search (Facebook)"
description: "Search over billions of posts, where like counts change constantly."
tags: [scaling-writes, medium]
---

# Post search (Facebook)

**Difficulty:** Medium · **Patterns:** [Scaling writes](../patterns/scaling-writes.md) · [Scaling reads](../patterns/scaling-reads.md) · **DDIA:** [Ch 3](../ddia/03-storage-and-retrieval.md) inverted index · [Ch 6](../ddia/06-partitioning.md) term-partitioned index · [Ch 11](../ddia/11-stream-processing.md) stream indexing

*Search over billions of posts, where like counts change constantly.*

## TL;DR

- Build an inverted index (term → post IDs) from the stream of new posts, sharded by term.
- Keep two orderings per term, recency and likes, and update like-based ranking only at thresholds or in batches.
- Keep hot postings in memory, move old ones to cheaper storage, and cache popular queries.

## 1. Requirements

**Functional**

1. Search posts by keyword
2. Sort results by recency or by likes
3. (Inputs: create posts, like posts)

**Non-functional**

- Search < 500ms
- New posts searchable within ~1 minute
- Huge write volume (posts and likes)
- Read volume ~10k searches/s

## 2. Back-of-envelope numbers

~1B posts/day ≈ 12k/s and ~10× that in likes. Indexing every like individually is far too much write load, so batch it.

## 3. Core entities and API

```text
inverted index: term → post IDs (recency list) and term → ZSET(post_id, like_bucket)
```

```http
GET /search?q&sort=recency|likes&cursor
```

## 4. v1: the simplest design, and where it breaks

![Post search (Facebook): v1 design](../diagrams/problem-post-search-v1.svg)

Naive: LIKE '%term%' on the posts table, a full scan at any real scale.

## 5. Evolving to the final design

![Post search (Facebook): final design](../diagrams/problem-post-search-final.svg)

Each step fixes one specific problem with the step before it:

1. Naive: LIKE '%term%' on the posts table, a full scan at any real scale.
2. Build an **inverted index** (term → post IDs) from the event stream, sharded by term. New posts are searchable within seconds.
3. Two orderings: a recency list and a likes-sorted set. Don't reindex on every like; update the score only when the count crosses thresholds (powers of 2) or in per-minute batches.
4. Keep hot postings in memory and move older ones to blob storage; cache popular queries; intersect posting lists for multi-word queries.

## 6. Deep dives

### Why not just Elasticsearch?

In a real design it is a fine answer; know its sharding (document-partitioned, scatter-gather) and refresh interval. This problem tests whether you understand the inverted index underneath.

### Likes change constantly?

Threshold or batched updates to the ranking score; exact counts live elsewhere.

### Multi-keyword?

Intersect posting lists, smallest first; consider bigram indexes.

### Hot term?

Term-partitioned index means one shard per term, so replicate hot terms.

## 7. Interview script (45 minutes)

| Time | What you do | Content |
|---|---|---|
| 0–5 | Functional requirements | Search posts by keyword; Sort results by recency or by likes; (Inputs: create posts, like posts) |
| 5–8 | Non-functional requirements | Search < 500ms; New posts searchable within ~1 minute; Huge write volume (posts and likes); Read volume ~10k searches/s |
| 8–10 | Numbers that drive the design | ~1B posts/day ≈ 12k/s and ~10× that in likes. Indexing every like individually is far too much write load, so batch it. |
| 10–13 | Entities and API | Keep it short: the endpoints in §3, idempotency keys on writes. |
| 13–25 | v1, then evolve it | Draw v1 and show where it breaks. Then add, in order: Kafka → Indexing workers → Inverted index → Query service → Like batcher → Cold postings → S3 → Query cache. Justify each addition with a number. |
| 25–40 | Deep dives | Why not just Elasticsearch? · Likes change constantly? · Multi-keyword? · Hot term? |
| 40–45 | Wrap-up | Remaining bottlenecks, failure modes, what you would monitor. |

## 8. Common mistakes

- A Postgres LIKE scan, or re-indexing on every like.
- Adding components before showing which number makes them necessary.
- Skipping failure handling: what happens on timeouts, retries and crashes.

## Related

- **Patterns:** [Scaling writes](../patterns/scaling-writes.md) · [Scaling reads](../patterns/scaling-reads.md)
- **DDIA:** [Ch 3](../ddia/03-storage-and-retrieval.md) inverted index · [Ch 6](../ddia/06-partitioning.md) term-partitioned index · [Ch 11](../ddia/11-stream-processing.md) stream indexing
- **Similar problems:** [Top-K videos (YouTube)](top-k-videos.md) · [Ad click aggregator](ad-click-aggregator.md) · [Web crawler](web-crawler.md) · [Metrics monitoring (Datadog)](metrics-monitoring.md)
