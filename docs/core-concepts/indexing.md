---
title: "Database indexing"
description: "An index turns a scan of every row into a short walk down a tree. Pick the right kind for the query."
tags: [core-concept]
---

# Database indexing

<span class="lvl lvl-b">Beginner-friendly</span>

*An index turns a scan of every row into a short walk down a tree. Pick the right kind for the query.*

## What an index is

Without an index, finding "all orders for user 42" means reading **every row** in the orders table and checking each one: a *full table scan*. With 100 million rows, that takes seconds or minutes. An **index** is a separate, sorted structure that maps values to row locations, like the index at the back of a book. The database jumps straight to user 42's entries, typically in 3–4 disk reads, whatever the table size.

The default index is a **B-tree**: a shallow, sorted tree. It answers equality (`= 42`), ranges (`created_at > '2026-01-01'`) and sorting (`ORDER BY created_at`). See [DDIA Chapter 3](../ddia/03-storage-and-retrieval.md) for how it works inside.

## Pick the right kind

| Index | Use for | Example |
|---|---|---|
| B-tree | Equality + range + ORDER BY | created_at > X; composite (user_id, ts) |
| Hash | Equality only | session lookup |
| Geospatial (R-tree, geohash) | Nearby queries | Yelp, Uber, Gopuff |
| Inverted | Full-text search | Post search, Elasticsearch |
| Composite | Multi-column filters (leftmost prefix rule) | WHERE user_id=? ORDER BY ts |
| Covering | Index-only scans | INCLUDE (title) |

Three that come up constantly in interviews:

- **Composite index.** An index on `(user_id, created_at)` is sorted by user first, then by time within each user. The query `WHERE user_id = 42 ORDER BY created_at DESC LIMIT 20` jumps to user 42 and reads 20 entries already in order, with no sorting needed. The **leftmost-prefix rule**: the index helps queries that filter on `user_id`, or on `user_id` and `created_at`, but **not** queries on `created_at` alone, just as a phone book sorted by surname then first name doesn't help you find everyone called "Asha".
- **Geospatial index.** "Restaurants within 2 km" filters on two dimensions at once. Two separate B-tree indexes on latitude and longitude each narrow only one dimension, leaving a long strip to scan. A geospatial index (PostGIS R-tree, geohash, quadtree) narrows both at once.
- **Inverted index.** For text search, map each **word** to the list of documents containing it: `"pizza" → [doc 3, doc 17, …]`. A search for "cheap pizza" intersects two lists. This is what Elasticsearch is built on.

> [!TIP]
> **Say this in the interview:** "A composite index on (user_id, created_at DESC) makes the feed query a single range scan."

> [!WARNING]
> **Indexes cost writes.** Every insert or update has to update every index on the table, and each index uses disk and memory. Add indexes for the **hot queries** you identified, not for every column.

> [!TIP]
> **One-page sketchnote:** [DATABASE INDEXING on a single page](../sketchnotes/concept-indexing.svg), for revision or printing.

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
