---
title: "Database indexing"
description: "An index turns a scan of every row into a short walk down a tree. Pick the right kind for the query."
tags: [core-concept]
---

# Database indexing

*An index turns a scan of every row into a short walk down a tree. Pick the right kind for the query.*

| Index | Use for | Example |
|---|---|---|
| B-tree | Equality + range + ORDER BY | created_at > X; composite (user_id, ts) |
| Hash | Equality only | session lookup |
| Geospatial (R-tree, geohash) | Nearby queries | Yelp, Uber, Gopuff |
| Inverted | Full-text search | Post search, Elasticsearch |
| Composite | Multi-column filters (leftmost prefix rule) | WHERE user_id=? ORDER BY ts |
| Covering | Index-only scans | INCLUDE (title) |

> [!TIP]
> **Say this in the interview:** "A composite index on (user_id, created_at DESC) makes the feed query a single range scan."

> [!WARNING]
> **Cost:** Every index slows writes; index only the hot queries.

## Checklist

1. Equality and ranges: B-tree (the default).
2. Several filters: a composite index, ordered by the leftmost-prefix rule.
3. Distance queries: a geospatial index (R-tree, geohash).
4. Full-text search: an inverted index.
5. Every index slows writes, so index only the queries you need.

## In the interview

> [!TIP]
> "A composite index on (user_id, created_at DESC) turns the feed query into one index range scan."

## Related

- Pattern: [Scaling reads](../patterns/scaling-reads.md)
