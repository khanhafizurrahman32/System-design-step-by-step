---
title: "Ad click aggregator"
description: "Clicks are money, so the numbers must be fast for dashboards and exact for billing."
tags: [scaling-writes, hard]
---

# Ad click aggregator

<span class="lvl lvl-a">Advanced</span>

**Difficulty:** Hard · **Patterns:** [Scaling writes](../patterns/scaling-writes.md) · **DDIA:** [Ch 11](../ddia/11-stream-processing.md) windows, exactly-once · [Ch 12](../ddia/12-future-of-data-systems.md) Lambda · [Ch 3](../ddia/03-storage-and-retrieval.md) column stores

*Clicks are money, so the numbers must be fast for dashboards and exact for billing.*

> [!TIP]
> **One-page sketchnote:** [AD CLICK AGGREGATOR on a single page](../sketchnotes/problem-ad-click-aggregator.svg), for revision or printing.

## TL;DR

- Redirect immediately and publish the click to Kafka; never aggregate raw rows at query time.
- A stream processor counts clicks per ad per minute and writes them to a column store for fast queries.
- Deduplicate by a signed impression ID, and recount from raw logs in a nightly batch job for billing accuracy.

## 1. Requirements

**Functional**

1. Click on an ad redirects the user to the advertiser
2. Advertisers query click metrics over time (minute granularity), with filters

**Non-functional**

- 10k clicks/s peak, 100M/day
- Never lose or double-count clicks (it is billing)
- Metrics queries < 1s
- Freshness ~1 minute

## 2. Back-of-envelope numbers

100M clicks × 100B ≈ **10GB/day raw**. Aggregated rows: ads × minutes, which is small. A 10k/s peak is easy for Kafka.

## 3. Core entities and API

```text
click(impression_id, ad_id, ts, user) → agg(ad_id, minute, count)
```

```http
GET /click?ad_id&impression_id → 302 advertiser_url
GET /metrics?ad_id&from&to&granularity
```

## 4. v1: the simplest design, and where it breaks

![Ad click aggregator: v1 design](../diagrams/problem-ad-click-aggregator-v1.svg)

When a user clicks an ad, the click service inserts a row `(ad_id, ts, user)` into Postgres and redirects the user to the advertiser. Advertisers' dashboards run `SELECT ad_id, date_trunc('minute', ts), count(*) … GROUP BY …` over the time range they ask for.

**Where it breaks:**

- **Queries:** 100M clicks a day adds up to **billions of rows** within weeks. "Clicks per minute for my ads over the last 30 days" means scanning and grouping millions of rows on every dashboard load, nowhere near the 1-second target.
- **Contention:** those heavy queries run on the same database that's absorbing up to **10k inserts a second**, so each slows the other down.
- **Correctness:** clicks are **money**, since advertisers pay per click. Double-clicks, retries and bots must not be counted twice or at all, and nothing can be lost.

## 5. Evolving to the final design

![Ad click aggregator: final design](../diagrams/problem-ad-click-aggregator-final.svg)

Each step fixes one specific problem with the step before it.

### Step 1: redirect immediately, aggregate in a stream

**Why:** the user should never wait for click accounting, and counting at query time is too slow. Counts should be **precomputed** as clicks arrive.

**How:** the click service publishes each click to **Kafka** (durable, handles 10k/s easily) and immediately returns the `302` redirect. A **Flink** job reads the stream and counts clicks per `(ad_id, minute)`, using the click's **event time** so late-arriving clicks land in the right minute. Every minute it **upserts** the counts into an **OLAP column store** (such as ClickHouse or Druid). Dashboards now read a few thousand small pre-aggregated rows instead of scanning raw clicks.

### Step 2: deduplicate with a signed impression ID

**Why:** the same click can arrive more than once: a double-click, a browser retry, a replay after a Flink restart. Fraudsters may also forge clicks. Each duplicate or fake overcharges the advertiser.

**How:** when an ad is **shown**, the ad server generates a unique **impression ID** and **signs** it with a secret key, embedding it in the ad's click URL. The click service verifies the signature, which rejects forged clicks. Flink keeps the impression IDs it has seen (with an expiry) and counts each ID **once**, so repeats are ignored.

### Step 3: reconcile with a nightly batch job

**Why:** streaming systems are fast, but bugs, edge cases with very late events, or a misconfigured deploy can make counts drift. For billing, "probably right" isn't enough.

**How:** every raw click is also written to **S3**, partitioned by date and never modified. A nightly **batch job** recomputes exact counts from those raw files and corrects the aggregates. The streaming numbers serve live dashboards; the batch numbers are what invoices use. This is the Lambda pattern ([DDIA Ch 12](../ddia/12-future-of-data-systems.md)).

## 6. Deep dives

### Flink crashes?

**Why it's a risk:** Flink keeps its running counts in memory. A crash could lose counts, or, on restart, re-read clicks it already counted and count them again.

**How:** Flink **checkpoints** periodically, saving its state (counts and seen impression IDs) **together with** the Kafka offsets it had reached. After a crash it restores the last checkpoint and re-reads Kafka from those offsets, so nothing is lost. Some clicks are re-processed, so the sink must tolerate repeats. It **upserts** `(ad_id, minute) → count`, which **overwrites** the row with the correct total instead of adding to it. Replays become harmless.

### Hot ad (Super Bowl)?

**Why it's a problem:** partitioning by `ad_id` sends every click on one ad to **one** Flink task. A Super Bowl ad might get a huge share of all clicks within minutes, overloading that one task.

**How:** spread the hot ad across several partitions by keying on `ad_id + random(0..N)`, so N tasks each count part of its clicks. Then add a **second aggregation step** that sums the N partial counts per `(ad_id, minute)`. Only do this for ads you know are hot, because it adds a step.

### Why also batch?

**Why have two paths?** Streaming gives numbers within a minute but is complex, with late data, restarts and deduplication state, so small errors can creep in. Batch is slower but simple: it reads immutable raw data, computes once, and can be re-run any time.

**How they work together:** dashboards show the streaming numbers; billing uses the batch-corrected numbers. If the stream has a bug, fix it and re-run batch over the raw clicks. Nothing is lost, because the raw data was never modified.

### Why OLAP?

**Why not Postgres for the aggregates?** Advertisers slice the data many ways: by campaign, country or device, over days or months. Those queries scan and sum many rows.

**How a column store helps:** it stores each column separately and compresses it heavily, so a query reads only the columns it needs. Combined with pre-aggregated per-minute rows, queries over billions of underlying clicks return in under a second (see [DDIA Ch 3](../ddia/03-storage-and-retrieval.md) on column storage).

## 7. Interview script (45 minutes)

| Time | What you do | Content |
|---|---|---|
| 0–5 | Functional requirements | Click on an ad redirects the user to the advertiser; Advertisers query click metrics over time (minute granularity), with filters |
| 5–8 | Non-functional requirements | 10k clicks/s peak, 100M/day; Never lose or double-count clicks (it is billing); Metrics queries < 1s; Freshness ~1 minute |
| 8–10 | Numbers that drive the design | 100M clicks × 100B ≈ **10GB/day raw**. Aggregated rows: ads × minutes, which is small. A 10k/s peak is easy for Kafka. |
| 10–13 | Entities and API | Keep it short: the endpoints in §3, idempotency keys on writes. |
| 13–25 | v1, then evolve it | Draw v1 and show where it breaks. Then add, in order: Kafka → Flink → OLAP → Advertiser → S3 raw → Spark nightly. Justify each addition with a number. |
| 25–40 | Deep dives | Flink crashes? · Hot ad (Super Bowl)? · Why also batch? · Why OLAP? |
| 40–45 | Wrap-up | Remaining bottlenecks, failure modes, what you would monitor. |


## Staff-level lens

| Question | Staff answer |
|---|---|
| **The real problem** | Counts that are fast for dashboards and exact for billing. |
| **Deciding number** | 10k clicks/s at peak, 100M/day, ~10 GB/day raw. |
| **Staff call and trade-off** | Kafka → Flink (dedupe by signed impression ID) → OLAP store, plus a nightly batch recount. Accept running two paths to get money right. |
| **Raise before you're asked** | Click fraud; double counting on replay (idempotent upserts); events arriving after the window closed. |
| **Senior stops at** | Stream aggregation. |
| **Staff goes on to** | Adds batch reconciliation because it is money, signed impression IDs, and an audit trail for advertiser disputes. |
| **Run it** | Watch stream vs batch difference, consumer lag, dedupe rate. |

All 29 problems through this lens: [Staff-level answers](../playbook/staff-level.md).

## 8. Common mistakes

- Aggregating raw rows at query time in the OLTP database.
- Adding components before showing which number makes them necessary.
- Skipping failure handling: what happens on timeouts, retries and crashes.

## Self-check

Try to answer before you open each one.

<details class="question" markdown>
<summary>Why redirect immediately and publish the click to Kafka?</summary>

The user shouldn't wait for counting; Kafka durably buffers the click stream for the stream processor.

</details>

<details class="question" markdown>
<summary>How do you avoid counting the same click twice?</summary>

Deduplicate by a signed impression ID, so replays and retries of the same click are ignored.

</details>

<details class="question" markdown>
<summary>Why also run a nightly batch job if the stream is already counting?</summary>

Billing needs exact numbers; the batch recount from raw logs corrects any stream errors (the Lambda-style reconciliation).

</details>

## Related

- **Patterns:** [Scaling writes](../patterns/scaling-writes.md)
- **DDIA:** [Ch 11](../ddia/11-stream-processing.md) windows, exactly-once · [Ch 12](../ddia/12-future-of-data-systems.md) Lambda · [Ch 3](../ddia/03-storage-and-retrieval.md) column stores
- **Similar problems:** [Top-K videos (YouTube)](top-k-videos.md) · [Web crawler](web-crawler.md) · [Metrics monitoring (Datadog)](metrics-monitoring.md) · [Fitness tracking (Strava)](fitness-tracking.md)
