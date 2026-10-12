---
title: "Business discovery (Yelp)"
description: "The trap is over-engineering: the whole dataset fits on one database server."
tags: [scaling-reads, medium]
---

# Business discovery (Yelp)

<span class="lvl lvl-i">Intermediate</span>

**Difficulty:** Medium · **Patterns:** [Scaling reads](../patterns/scaling-reads.md) · **DDIA:** [Ch 3](../ddia/03-storage-and-retrieval.md) geo indexes · [Ch 7](../ddia/07-transactions.md) atomic updates · [Ch 5](../ddia/05-replication.md) read replicas

*The trap is over-engineering: the whole dataset fits on one database server.*

> [!TIP]
> **One-page sketchnote:** [BUSINESS DISCOVERY (YELP) on a single page](../sketchnotes/problem-business-discovery.svg), for revision or printing.

## TL;DR

- Ten million businesses at ~1 KB each is about 10 GB, small enough for one Postgres instance.
- Two-dimensional "near me" queries need a geospatial index (PostGIS, geohash), not two B-tree indexes.
- Keep the average rating correct under concurrent reviews by updating it atomically in the same transaction.

## 1. Requirements

**Functional**

1. Search businesses by location + radius, category, text
2. View business details and reviews
3. Leave one review per user per business; see average rating

**Non-functional**

- Search p99 < 500ms
- 100M DAU, read-heavy
- Ratings can lag slightly (eventual)
- Reviews durable

## 2. Back-of-envelope numbers

10M businesses × 1KB = **10GB**, which fits in memory. Search: 100M × 5 / 86,400 ≈ **6k/s, ~20k/s peak**. Reviews ~12/s.

## 3. Core entities and API

```text
businesses(id, name, location, category, avg_rating, num_ratings)
reviews(id, business_id, user_id, rating, text, UNIQUE(user_id, business_id))
```

```http
GET /businesses?lat&lng&radius&category&q&cursor
GET /businesses/{id}
POST /businesses/{id}/reviews {rating, text}
```

## 4. v1: the simplest design, and where it breaks

![Business discovery (Yelp): v1 design](../diagrams/problem-business-discovery-v1.svg)

Store businesses in Postgres with `lat` and `lng` columns, and answer "near me" with a bounding box:

```sql
SELECT * FROM businesses
WHERE lat BETWEEN :lat1 AND :lat2
  AND lng BETWEEN :lng1 AND :lng2
  AND category = :cat;
```

with a normal B-tree index on `lat` and another on `lng`.

**Where it breaks:** a B-tree index sorts by **one** value. The `lat` index finds every business in a horizontal strip of the world: all businesses at that latitude, across every longitude. The `lng` index finds a vertical strip. The database must take one huge strip and filter it, or intersect two huge strips. Either way it reads far more rows than the few hundred businesses actually nearby. At **~20k searches a second** at peak, that's too slow for the 500 ms p99.

## 5. Evolving to the final design

![Business discovery (Yelp): final design](../diagrams/problem-business-discovery-final.svg)

Each step fixes one specific problem with the step before it.

### Step 1: use a geospatial index, and keep it in Postgres

**Why:** "nearby" is a **two-dimensional** question, and it needs an index that narrows both dimensions at once.

**How:** add **PostGIS** with a spatial (GiST, R-tree style) index on a `location` column, and query with `ST_DWithin(location, :point, :radius)`. The index groups nearby points together, so the query reads only rows close to the user. For searching by name, add a trigram index (`pg_trgm`). The whole dataset is about **10 GB**, which fits in one Postgres instance's memory, so there's no need yet for a separate search cluster to operate and keep in sync.

### Step 2: spread the read load

**Why:** about 20k searches a second at peak is a lot of geospatial queries for one database primary, which also has to handle writes.

**How:** send searches to **read replicas**, since search can be a few seconds stale, and cache the most-viewed business pages in **Redis**. The primary handles only writes: new reviews and business edits, about a dozen a second.

### Step 3: keep ratings and reviews correct

**Why:** two features have rules that concurrency can break: each user may review a business only once, and the average rating must count every review.

**How:** a **unique constraint** on `(user_id, business_id)` enforces one review per user. Store a **running sum and count** on the business row, and update them **in the same transaction** as the review insert, using an atomic `SET sum = sum + :rating, count = count + 1`. The average is `sum / count` at read time. See the deep dives below for why the alternatives fail.

## 6. Deep dives

### Which geo index?

**Why it matters:** each option has different strengths, and interviewers like to hear the trade-offs.

**How they work:**

- **Geohash:** divide the world into a grid and give each cell a string. Each extra character divides the cell further, so nearby places share a **prefix** (`9q8yy…`). It works with an ordinary B-tree index on a string column. The catch: two places can be close but sit either side of a cell edge, so query the user's cell **plus its 8 neighbours**.
- **Quadtree:** recursively split any square that holds too many businesses into four. Dense cities get small cells, empty deserts large ones, so each cell holds a similar number of businesses. It's usually kept in memory.
- **R-tree (PostGIS GiST):** groups nearby points into nested bounding rectangles. This is the **production default** in databases; you get it by adding a spatial index.

### Average rating with concurrent reviews?

**Why it's hard:** the naive way is "read the current average and count, compute the new average, write it back". Two reviews at the same moment both read the same old values, and one of them is **lost** (a lost update, [DDIA Ch 7](../ddia/07-transactions.md)).

**How:** store `rating_sum` and `rating_count`, not the average, and update them with an **atomic** statement in the same transaction as the review insert:

```sql
UPDATE businesses SET rating_sum = rating_sum + :r, rating_count = rating_count + 1
WHERE id = :business_id;
```

The database applies these one at a time to the row, so nothing is lost. The average is computed at read time.

### One review per user?

**Why the obvious way fails:** "check if this user already reviewed, and if not, insert" is a check-then-act race. Two quick double-clicks both see "no review yet", and both insert.

**How:** let the database enforce it with a **unique constraint** on `(user_id, business_id)`. The second insert fails with a constraint violation, and the API returns "you've already reviewed this place" (or turns it into an edit).

### When would you add Elasticsearch?

**Why not at the start:** it's a second system to run and keep in sync, and Postgres with PostGIS and trigram indexes already handles 10 GB and these query types well.

**When it becomes worth it:** when search needs relevance ranking, typo tolerance, synonyms and facets ("open now, $$, 4+ stars") beyond what Postgres does well, or when query volume outgrows the replicas. Then feed it from Postgres using **CDC**, so it follows the database's change log. Never write to both from the application (the dual-write problem, see [DDIA Ch 11](../ddia/11-stream-processing.md)).

## 7. Interview script (45 minutes)

| Time | What you do | Content |
|---|---|---|
| 0–5 | Functional requirements | Search businesses by location + radius, category, text; View business details and reviews; Leave one review per user per business; see average rating |
| 5–8 | Non-functional requirements | Search p99 < 500ms; 100M DAU, read-heavy; Ratings can lag slightly (eventual); Reviews durable |
| 8–10 | Numbers that drive the design | 10M businesses × 1KB = **10GB**, which fits in memory. Search: 100M × 5 / 86,400 ≈ **6k/s, ~20k/s peak**. Reviews ~12/s. |
| 10–13 | Entities and API | Keep it short: the endpoints in §3, idempotency keys on writes. |
| 13–25 | v1, then evolve it | Draw v1 and show where it breaks. Then add, in order: PostGIS GiST + pg_trgm → Read replicas → Review service. Justify each addition with a number. |
| 25–40 | Deep dives | Which geo index? · Average rating with concurrent reviews? · One review per user? · When would you add Elasticsearch? |
| 40–45 | Wrap-up | Remaining bottlenecks, failure modes, what you would monitor. |


## Staff-level lens

| Question | Staff answer |
|---|---|
| **The real problem** | 2-D "near me" search and correct ratings, without over-engineering. |
| **Deciding number** | 10M businesses × 1 KB ≈ 10 GB; ~20k searches/s at peak. |
| **Staff call and trade-off** | One Postgres + PostGIS + replicas + page cache. Accept simpler ranking for far less to operate; add Elasticsearch only when relevance needs it. |
| **Raise before you're asked** | Replica lag hiding a new review; hot cities skewing load; review spam. |
| **Senior stops at** | Adds a geo index. |
| **Staff goes on to** | Uses the 10 GB number to argue against a search cluster, and defines the trigger and CDC migration path for adding one later. |
| **Run it** | Watch search p99, replica lag, cache hit. Trigger for Elasticsearch: fuzzy relevance or QPS beyond replicas. |

All 29 problems through this lens: [Staff-level answers](../playbook/staff-level.md).

## 8. Common mistakes

- A geo-sharded cluster for 10GB of data. One Postgres with PostGIS plus replicas is enough.
- Adding components before showing which number makes them necessary.
- Skipping failure handling: what happens on timeouts, retries and crashes.

## Self-check

Try to answer before you open each one.

<details class="question" markdown>
<summary>Why is one Postgres instance enough for the business data?</summary>

Ten million businesses at about 1 KB each is about 10 GB, which fits comfortably on one server with replicas for reads.

</details>

<details class="question" markdown>
<summary>Why not two B-tree indexes on latitude and longitude?</summary>

Each index narrows only one dimension, so a "near me" query still scans a long strip. A geospatial index (PostGIS, geohash) narrows both at once.

</details>

<details class="question" markdown>
<summary>How do you keep the average rating correct with concurrent reviews?</summary>

Update the stored sum and count atomically in the same transaction as the review insert, rather than reading, computing and writing back.

</details>

## Related

- **Patterns:** [Scaling reads](../patterns/scaling-reads.md)
- **DDIA:** [Ch 3](../ddia/03-storage-and-retrieval.md) geo indexes · [Ch 7](../ddia/07-transactions.md) atomic updates · [Ch 5](../ddia/05-replication.md) read replicas
- **Similar problems:** [URL shortener (Bitly)](url-shortener.md) · [Rate limiter](rate-limiter.md) · [News feed (Facebook)](news-feed.md) · [News aggregator (Google News)](news-aggregator.md)
