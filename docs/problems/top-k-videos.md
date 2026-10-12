---
title: "Top-K videos (YouTube)"
description: "The design falls straight out of one number: hundreds of thousands of views per second."
tags: [scaling-writes, hard]
---

# Top-K videos (YouTube)

<span class="lvl lvl-a">Advanced</span>

**Difficulty:** Hard · **Patterns:** [Scaling writes](../patterns/scaling-writes.md) · **DDIA:** [Ch 11](../ddia/11-stream-processing.md) windows, partitioned streams · [Ch 6](../ddia/06-partitioning.md) partition by key

*The design falls straight out of one number: hundreds of thousands of views per second.*

> [!TIP]
> **One-page sketchnote:** [TOP-K VIDEOS (YOUTUBE) on a single page](../sketchnotes/problem-top-k-videos.svg), for revision or printing.

## TL;DR

- A counter row per video in a database can't take ~800k updates per second.
- Stream views through Kafka partitioned by video ID; each consumer counts its videos in memory and keeps a local top-K.
- Merge the per-partition top-K lists; the result is exact because each video lives in exactly one partition.

## 1. Requirements

**Functional**

1. Top K most-viewed videos for the last hour, day, month, and all time

**Non-functional**

- Query latency < 100ms
- Freshness ~1 minute
- Accurate counts (billing-grade not required, but no big drift)
- Massive view volume

## 2. Back-of-envelope numbers

70B views/day ≈ **~800k views/s**. 4B videos × 8B counters ≈ 32GB of state, spread over partitions.

## 3. Core entities and API

```text
view events (video_id, ts) → per-minute counts per video → per-window top-K heap
```

```http
GET /topk?window=hour|day|month|all&k=100
```

## 4. v1: the simplest design, and where it breaks

![Top-K videos (YouTube): v1 design](../diagrams/problem-top-k-videos-v1.svg)

Keep a `views` counter column on each video row. Every view runs `UPDATE videos SET views = views + 1 WHERE id = ?`. The top-K query is `SELECT … ORDER BY views DESC LIMIT 100`.

**Where it breaks:**

- **Writes:** about 70 billion views a day is **~800k updates a second**. Popular videos get thousands of updates a second **on the same row**, and each update must wait for the row lock held by the previous one. No single database can do this.
- **Reads:** `ORDER BY views` over **4 billion** videos is a huge sort, and an index on a constantly changing column would be updated 800k times a second.
- **Time windows:** a single all-time counter can't answer "top videos in the **last hour**".

## 5. Evolving to the final design

![Top-K videos (YouTube): final design](../diagrams/problem-top-k-videos-final.svg)

Each step fixes one specific problem with the step before it.

### Step 1: stream views through Kafka, partitioned by video

**Why:** 800k writes a second needs to be spread over many machines, and each video's views must be counted in **one** place, or you'd need to combine partial counts for every video.

**How:** each view becomes an event on **Kafka**, keyed by `video_id`. Kafka hashes the key, so **every view of a given video goes to the same partition**, and so to the same consumer. With, say, 100 partitions, each consumer handles about 8k views a second, which is easy to count in memory.

### Step 2: count in memory and keep a local top-K

**Why:** writing every single view to a database is exactly the problem we're escaping. And we only care about the **top** few, not the exact count of every one of 4 billion videos at every moment.

**How:** each consumer keeps per-video counts **in memory**, in per-minute buckets, and maintains a **min-heap of its top K** videos (K = 100). A min-heap keeps the smallest of the top K at the root, so checking whether a video now belongs takes O(1), and replacing takes O(log K). An aggregator collects each partition's top K, 100 partitions × 100 candidates = 10,000 videos, and picks the overall top 100. That merge is **exact**, not approximate (see the first deep dive).

### Step 3: support time windows, cache results, keep a safety net

**Why:** users want the top videos for the last hour, day and month, not just all time. And in-memory counts need a backup if consumers lose state.

**How:** with per-minute buckets, the **last hour** is the sum of the last 60 buckets. Each minute, add the new bucket and **subtract the one that just fell out**, so you never rescan. Longer windows use hourly or daily buckets. The finished top-K lists are written to a cache and served from there in well under 100 ms. Raw view events also land in **S3**, so a batch job can recompute exact counts if a stream bug is ever found.

## 6. Deep dives

### Why is the merge exact?

**Why you might doubt it:** merging "top 100 from each partition" sounds like it could miss a video that's 101st in two partitions but large overall.

**Why it's exact:** that can only happen if a video's views are **split** across partitions. Here they never are: Kafka sends all views of a video to the same partition, so each partition holds the **complete** count for its videos. If a video is in the global top 100, it must beat everything in its own partition except at most 99 others, so it is in that partition's local top 100. The global top K is therefore always inside the union of the local top Ks.

### Sliding windows?

**Why it's hard:** "the last hour" changes every minute. Recounting 60 minutes of events each time would mean rescanning millions of events.

**How:** keep a **ring buffer** of per-minute counts for each active video (60 slots for an hour). Every minute, the window total is updated as `total += newest minute − minute that just expired`. That's constant work per video, not a rescan. For a month, use **hourly** buckets (720 slots), because minute precision isn't needed at that range.

### Very hot video?

**Why it's a problem:** partitioning by video means a viral video sends all its views to **one** partition. Millions of views a second on one video can overload that consumer.

**How:** **pre-aggregate before Kafka**. Each server producing view events counts views per video locally for a second, then sends **one** event, "video 7: +3,412 views", instead of 3,412 events. The hot video's partition receives a few hundred messages a second instead of millions, and the total is identical.

### Approximate is OK?

**Why consider it:** exact counting needs memory for every active video, and careful partitioning.

**How:** a **Count-Min Sketch** estimates counts for any number of items in **fixed memory**. It may overestimate slightly, but never underestimates. Pair it with a heap of the current top candidates. That's ideal for "trending now", where small errors don't matter. Anything that pays people, like creator revenue, uses the exact partitioned counts.

## 7. Interview script (45 minutes)

| Time | What you do | Content |
|---|---|---|
| 0–5 | Functional requirements | Top K most-viewed videos for the last hour, day, month, and all time |
| 5–8 | Non-functional requirements | Query latency < 100ms; Freshness ~1 minute; Accurate counts (billing-grade not required, but no big drift); Massive view volume |
| 8–10 | Numbers that drive the design | 70B views/day ≈ **~800k views/s**. 4B videos × 8B counters ≈ 32GB of state, spread over partitions. |
| 10–13 | Entities and API | Keep it short: the endpoints in §3, idempotency keys on writes. |
| 13–25 | v1, then evolve it | Draw v1 and show where it breaks. Then add, in order: Kafka → Counter P0 → Counter P1 … Pn → Aggregator → Redis / cache → S3 raw → batch. Justify each addition with a number. |
| 25–40 | Deep dives | Why is the merge exact? · Sliding windows? · Very hot video? · Approximate is OK? |
| 40–45 | Wrap-up | Remaining bottlenecks, failure modes, what you would monitor. |


## Staff-level lens

| Question | Staff answer |
|---|---|
| **The real problem** | Count ~800k events/s and rank across hour, day, month and all time. |
| **Deciding number** | 70B views/day ≈ 800k/s; 4B videos × 8 B ≈ 32 GB of counters. |
| **Staff call and trade-off** | Kafka partitioned by video; in-memory counts and local heaps; merge. Accept ~1 min freshness, with a batch recount for exact totals. |
| **Raise before you're asked** | One viral video skewing a partition (pre-aggregate at producers); counts lost on restart (checkpoint); late events. |
| **Senior stops at** | Streaming counts. |
| **Staff goes on to** | Proves the merge is exact, chooses exact vs Count-Min per window, adds a reconciliation path. |
| **Run it** | Watch consumer lag, window freshness, stream vs batch difference. |

All 29 problems through this lens: [Staff-level answers](../playbook/staff-level.md).

## 8. Common mistakes

- A counter row per video in the DB: 800k writes/sec on hot rows.
- Adding components before showing which number makes them necessary.
- Skipping failure handling: what happens on timeouts, retries and crashes.

## Self-check

Try to answer before you open each one.

<details class="question" markdown>
<summary>Why not keep a counter row per video in a database?</summary>

About 800k updates a second on hot rows is far beyond what a database can take with row-level contention.

</details>

<details class="question" markdown>
<summary>Why is merging per-partition top-K lists exact?</summary>

Partitioning by video ID means each video's full count lives in exactly one partition, so its true count is in that partition's list.

</details>

<details class="question" markdown>
<summary>How would you handle one extremely hot video?</summary>

Pre-aggregate before Kafka (count locally for a second, then send one update) so one partition isn't overwhelmed.

</details>

## Related

- **Patterns:** [Scaling writes](../patterns/scaling-writes.md)
- **DDIA:** [Ch 11](../ddia/11-stream-processing.md) windows, partitioned streams · [Ch 6](../ddia/06-partitioning.md) partition by key
- **Similar problems:** [Ad click aggregator](ad-click-aggregator.md) · [Web crawler](web-crawler.md) · [Metrics monitoring (Datadog)](metrics-monitoring.md) · [Fitness tracking (Strava)](fitness-tracking.md)
