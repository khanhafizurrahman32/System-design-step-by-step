---
title: "Metrics monitoring (Datadog)"
description: "Millions of data points per second arrive, and alerts must fire within a minute."
tags: [scaling-writes, hard]
---

# Metrics monitoring (Datadog)

<span class="lvl lvl-a">Advanced</span>

**Difficulty:** Hard · **Patterns:** [Scaling writes](../patterns/scaling-writes.md) · **DDIA:** [Ch 3](../ddia/03-storage-and-retrieval.md) LSM, compression · [Ch 11](../ddia/11-stream-processing.md) stream alerting

*Millions of data points per second arrive, and alerts must fire within a minute.*

> [!TIP]
> **One-page sketchnote:** [METRICS MONITORING (DATADOG) on a single page](../sketchnotes/problem-metrics-monitoring.svg), for revision or printing.

## TL;DR

- Buffer the write firehose through Kafka into a time-series database built for appends and compression.
- Downsample old data and move it to cheap storage; dashboards read rollups.
- Evaluate alert rules on the stream itself instead of polling the database.

## 1. Requirements

**Functional**

1. Ingest metrics from 500k servers
2. Query dashboards over time ranges
3. Alert rules with notifications

**Non-functional**

- 5M datapoints/s ingest
- Recent-data queries < 1s
- Alerts within ~1 minute
- Late/out-of-order tolerant, durable

## 2. Back-of-envelope numbers

500k hosts × 100 metrics ÷ 10s = **5M points/s**. Gorilla compression ≈ 1.4B/point → ~600GB/day; downsample after 7 days.

## 3. Core entities and API

```text
series(metric, tags) → (ts, value) blocks
rollups 1m / 1h
alert_rules
```

```http
POST /ingest (batched points from agents)
GET /query?metric&tags&from&to&step
POST /alerts {rule, threshold, channel}
```

## 4. v1: the simplest design, and where it breaks

![Metrics monitoring (Datadog): v1 design](../diagrams/problem-metrics-monitoring-v1.svg)

An agent on each server sends its metrics (CPU, memory, request counts…) every 10 seconds. The ingest service inserts **one row per data point**, `(metric, tags, ts, value)`, into Postgres with a B-tree index. Dashboards query a time range, and an alert job runs every rule as a query every minute.

**Where it breaks:**

- **Write volume:** 500k servers × 100 metrics ÷ 10 s = **5 million data points a second**. A relational database with B-tree indexes manages tens of thousands of inserts a second, about **100× too few**.
- **Storage:** each row with its index entries costs maybe 50–100 bytes, so 5M a second means tens of terabytes a day.
- **Alerting:** thousands of alert rules each querying the database every minute adds a large read load on top of the write firehose.

## 5. Evolving to the final design

![Metrics monitoring (Datadog): final design](../diagrams/problem-metrics-monitoring-final.svg)

Each step fixes one specific problem with the step before it.

### Step 1: buffer through Kafka into a time-series database

**Why:** metrics data has a very particular shape. It's **append-only** (you never update a past CPU reading), always written in time order, and always read as "one series over a time range". A general-purpose database pays for flexibility this data doesn't need.

**How:** agents send batches to an ingest tier, which writes them to **Kafka**. Kafka absorbs spikes and lets the storage tier fall behind briefly without losing anything. Consumers write into a **time-series database (TSDB)**, such as Prometheus-style storage, M3, VictoriaMetrics or InfluxDB:

- Each series' points are grouped into **blocks** by time.
- Writes are sequential appends (LSM-style), with no random index updates.
- Values are **heavily compressed**. Timestamps arrive at regular intervals, so storing the *difference of differences* is mostly zeros. Consecutive values are similar, so XOR-ing them leaves mostly zero bits. That gets each point down to about **1.4 bytes** instead of 16 or more, roughly 600 GB a day.

### Step 2: downsample and tier old data

**Why:** nobody needs 10-second resolution for last year's CPU graph, but keeping it all at full resolution would cost a fortune and make long-range queries slow.

**How:** keep raw data for about 7 days. Background jobs compute **rollups**: per-minute aggregates (min, max, average, count), then per-hour. Older raw blocks are deleted, and rollups move to cheap object storage (S3). A dashboard for "last 30 days" reads hourly rollups, a few hundred points per series, so it loads in well under a second.

### Step 3: evaluate alerts on the stream

**Why:** polling the TSDB with thousands of alert queries every minute adds heavy read load and latency, and an alert can only fire as fast as the polling interval.

**How:** a stream processor (such as Flink) reads the **same Kafka stream** and evaluates alert rules **as data arrives**, using time windows ("average CPU over 5 minutes > 90%"). When a rule triggers, it sends the event to an **alert manager**, which deduplicates, groups and routes notifications (pager, Slack, email). Alerts fire within about a minute of the problem, without touching the database.

## 6. Deep dives

### Why a TSDB?

**Why not a normal database:** relational databases are built for random reads and updates, transactions and flexible queries, none of which metrics need. And they pay for those features in write throughput and storage.

**What a TSDB does instead:** time-ordered **appends** suit LSM-style storage (sequential writes, very high throughput). Specialized **compression** gets about 10× smaller storage. Queries are **range scans** over one series' blocks, read in order. It's a database shaped exactly like the data.

### High cardinality?

**Why it's dangerous:** each unique combination of metric name and tag values is a separate **series**, with its own index entry and buffers. A tag like `host` (500k values) is fine. Add a tag like `user_id` (100M values), and one metric becomes 100 million series, exploding memory and index size. This is the most common way to break a metrics system.

**How:** **limit cardinality**: reject or drop labels with too many unique values, enforce per-customer series limits, and alert on fast-growing series counts. Per-user or per-request data belongs in **logs or traces**, not metrics.

### Late data?

**Why it happens:** an agent loses network for 5 minutes, then sends its buffered points. They arrive late, after the windows they belong to may already have been computed.

**How:** process by **event time** (the timestamp on the point), not arrival time. Windows use a **watermark**, the stream processor's estimate of "all data up to time T has arrived", plus an **allowed lateness** period during which late points still update the window. Points later than that are stored in the TSDB but don't re-trigger alerts.

### Alert flapping?

**Why it happens:** a metric hovering around its threshold (CPU at 89%, 91%, 88%…) fires and resolves an alert over and over, flooding the on-call engineer with pages.

**How:** require the condition to hold for **N consecutive windows** (or a set duration, such as "for 5 minutes") before firing. Use a lower threshold to resolve than to fire (*hysteresis*). And let the alert manager **deduplicate and group** related alerts, for example 50 servers in one cluster becoming one notification.

## 7. Interview script (45 minutes)

| Time | What you do | Content |
|---|---|---|
| 0–5 | Functional requirements | Ingest metrics from 500k servers; Query dashboards over time ranges; Alert rules with notifications |
| 5–8 | Non-functional requirements | 5M datapoints/s ingest; Recent-data queries < 1s; Alerts within ~1 minute; Late/out-of-order tolerant, durable |
| 8–10 | Numbers that drive the design | 500k hosts × 100 metrics ÷ 10s = **5M points/s**. Gorilla compression ≈ 1.4B/point → ~600GB/day; downsample after 7 days. |
| 10–13 | Entities and API | Keep it short: the endpoints in §3, idempotency keys on writes. |
| 13–25 | v1, then evolve it | Draw v1 and show where it breaks. Then add, in order: Kafka → TSDB writers → TSDB → Query service → Rollups → S3 → Flink alert eval → Alert manager → PagerDuty. Justify each addition with a number. |
| 25–40 | Deep dives | Why a TSDB? · High cardinality? · Late data? · Alert flapping? |
| 40–45 | Wrap-up | Remaining bottlenecks, failure modes, what you would monitor. |


## Staff-level lens

| Question | Staff answer |
|---|---|
| **The real problem** | A write firehose plus alerts within a minute. |
| **Deciding number** | 5M points/s; ~600 GB/day compressed. |
| **Staff call and trade-off** | Kafka → time-series DB with compression and downsampling; alerts evaluated on the stream. Accept lower resolution for old data. |
| **Raise before you're asked** | Cardinality explosion from user-ID tags; who monitors the monitoring; alert storms. |
| **Senior stops at** | A TSDB. |
| **Staff goes on to** | Cardinality limits as policy, alert path separate from query path, retention tiers priced out. |
| **Run it** | Watch ingest lag, dropped points, alert evaluation latency, active series count. |

All 29 problems through this lens: [Staff-level answers](../playbook/staff-level.md).

## 8. Common mistakes

- Row-per-point in Postgres, and alerting by polling queries.
- Adding components before showing which number makes them necessary.
- Skipping failure handling: what happens on timeouts, retries and crashes.

## Self-check

Try to answer before you open each one.

<details class="question" markdown>
<summary>Why a time-series database instead of Postgres?</summary>

It is built for append-heavy, time-ordered writes with heavy compression and fast range scans and rollups.

</details>

<details class="question" markdown>
<summary>How do you keep long-term storage cheap?</summary>

Downsample old data into rollups and move it to cheaper storage; dashboards read rollups for long ranges.

</details>

<details class="question" markdown>
<summary>Why evaluate alerts on the stream?</summary>

Alerts fire as data arrives without repeatedly querying the database for every rule.

</details>

## Related

- **Operating systems:** [OS 7: Storage devices](../os/07-storage-devices.md) (why write-heavy stores are append-only)
- **Patterns:** [Scaling writes](../patterns/scaling-writes.md)
- **DDIA:** [Ch 3](../ddia/03-storage-and-retrieval.md) LSM, compression · [Ch 11](../ddia/11-stream-processing.md) stream alerting
- **Similar problems:** [Top-K videos (YouTube)](top-k-videos.md) · [Ad click aggregator](ad-click-aggregator.md) · [Web crawler](web-crawler.md) · [Fitness tracking (Strava)](fitness-tracking.md)
