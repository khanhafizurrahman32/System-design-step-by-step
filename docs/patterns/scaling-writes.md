---
title: "Scaling writes"
description: "When writes outgrow one machine, absorb the spikes, write in batches, split the data, and write less."
tags: [pattern]
---

# Scaling writes

<span class="lvl lvl-i">Intermediate</span>

*When writes outgrow one machine, absorb the spikes, write in batches, split the data, and write less.*

> [!TIP]
> **One-page sketchnote:** [SCALING WRITES on a single page](../sketchnotes/pattern-scaling-writes.svg), for revision or printing.

## When to reach for it

- Sustained writes exceed what one primary handles (roughly 10k+ per second for simple rows).
- Write traffic is spiky: events, clicks, telemetry.
- Data is append-mostly and read in aggregate (counts, time series).

## The problem

Reads can be scaled with copies, as caches and replicas. **Writes can't**: every write must eventually land in the one place that owns that data. With one primary database, every write in the system goes through one machine. For simple rows, that machine tops out around 10k+ writes a second, and far less for complex transactions. Some systems blow straight past that: ad clicks, video views, sensor readings, metrics. They often arrive in **spikes**, when a big event starts or a campaign launches.

There are four moves, best applied in this order: **absorb** the spikes, **batch** the writes, **write less**, and only then **split** the data across machines.

## The idea, step by step

![Pattern 2: Scaling Writes](../diagrams/pattern-scaling-writes.svg)

1. **Start: every event is one synchronous database write.** The user's request waits for the database. A spike to 50k events a second means 50k individual inserts, the database falls behind, requests time out, and the retries make it worse.
2. **Absorb with a log, then batch.** The ingest service appends each event to **Kafka** and replies immediately. Appending to Kafka is very fast, and Kafka stores events durably, so nothing is lost even if the database is slow. **Consumers** read events at the pace the database can handle, and write them in **batches**: one insert of 1,000 rows is far cheaper than 1,000 inserts of one row. A spike now just makes the queue a bit longer for a few minutes, instead of an outage.
3. **Shard.** If the sustained rate is still more than one database can take, split the data across several databases by a key that spreads load evenly, such as `hash(ad_id)`. Each shard takes a fraction of the writes, and each Kafka partition can feed its own shard.
4. **Write less, and use storage built for writes.**
   - **Pre-aggregate:** if the product only ever needs "clicks per ad per minute", count them in the stream processor and write **one row per ad per minute** instead of one row per click. 10,000 clicks become 1 write.
   - Choose a **write-optimized** store (an LSM-tree database such as Cassandra), which turns random writes into sequential appends (see [DDIA Ch 3](../ddia/03-storage-and-retrieval.md)).

> [!WARNING]
> **Hot partition:** sharding spreads **different** keys. One very hot key, such as a viral ad or a celebrity's post, still lands on one shard and can overload it. Fixes: split that key across several sub-keys with a suffix (`ad42_0` … `ad42_9`) and add them up on read, or aggregate its events in memory before writing.

## Decision checklist

1. Can the client get a quick ack while the work happens later? Put a durable log (Kafka) in front.
2. Can writes be grouped? Batch inserts in consumers.
3. Can you store less? Pre-aggregate (one row per key per minute instead of one per event).
4. Still too much for one node? Shard by a key that spreads load evenly.
5. Write-heavy and simple key access? Use an LSM-based store such as Cassandra.

## In the interview

> [!TIP]
> "Clicks arrive at 10k/s with spikes, so they go to Kafka first. A stream job aggregates per ad per minute, which cuts the database writes by orders of magnitude."

## Common mistakes

- A hot partition: one key still lands on one shard.
- Losing data by acknowledging before anything is durable.
- Using a B-tree OLTP database for a firehose of append-only events.

## Problems that use it

- [Top-K videos (YouTube)](../problems/top-k-videos.md): The design falls straight out of one number: hundreds of thousands of views per second.
- [Ad click aggregator](../problems/ad-click-aggregator.md): Clicks are money, so the numbers must be fast for dashboards and exact for billing.
- [Web crawler](../problems/web-crawler.md): Ten billion pages in five days is a pipeline problem, constrained by politeness and network bandwidth.
- [Metrics monitoring (Datadog)](../problems/metrics-monitoring.md): Millions of data points per second arrive, and alerts must fire within a minute.
- [Fitness tracking (Strava)](../problems/fitness-tracking.md): The key insight is where the work happens: on the phone, not the server.
- [Post search (Facebook)](../problems/post-search.md): Search over billions of posts, where like counts change constantly.
- [Price tracker (CamelCamelCamel)](../problems/price-tracker.md): Five hundred million products can't all be crawled often, so decide what is worth checking.

## The theory underneath

- [DDIA Ch 3: Storage and retrieval](../ddia/03-storage-and-retrieval.md)
- [DDIA Ch 6: Partitioning](../ddia/06-partitioning.md)
- [DDIA Ch 11: Stream processing](../ddia/11-stream-processing.md)
