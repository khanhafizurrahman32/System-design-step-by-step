---
title: "DDIA Ch 11: Stream Processing"
description: "Batch with the input never ending."
tags: [ddia]
---

# DDIA Chapter 11: Stream Processing

> These DDIA pages are study notes in our own words and diagrams, connecting the book to interview problems. They don't replace the book; *Designing Data-Intensive Applications* by Martin Kleppmann is worth reading in full.

## TL;DR

Batch with the input never ending. Events are processed shortly after they happen. This is Kafka, CDC, the outbox pattern, event sourcing, windowed aggregation, and exactly-once semantics: the backbone of most modern interview designs.

**Key ideas:** message brokers · Kafka partitions · consumer groups · CDC · outbox · event sourcing · windows · watermarks · exactly-once

## Two kinds of message broker

*Queue vs log*

|  | Queue (RabbitMQ, SQS, JMS) | Log (Kafka, Kinesis, Pulsar) |
|---|---|---|
| After consume | Message deleted once acked | Message stays; consumer just advances an offset |
| Ordering | Lost under parallel consumers + redelivery | Strict order **within a partition** |
| Parallelism | Any consumer takes any message (load balancing) | One consumer per partition per group |
| Replay | No: gone after ack | Yes: reset offset, re-read days of history |
| Slow message | Others continue (per-message ack) | Blocks its partition (head-of-line) |
| Best for | Task queues: send email, resize image, each job independent | Event streams: ordering matters, multiple consumers, replay, CDC |

> [!TIP]
> **Say this in the interview:** "Image resize jobs go on SQS, since they are independent with per-message retry. Booking events go on Kafka, since order per booking matters and several services consume them."

## Kafka: partitions, offsets, consumer groups

*Log-based broker*

![Kafka: partitions, offsets, consumer groups](../diagrams/ddia-11-2.svg)

1. A topic is split into **partitions**, each an append-only log. The producer picks a partition by hashing the key, so all events for one booking land in one partition, in order.
2. Within a **consumer group**, each partition is read by exactly one consumer, so maximum parallelism equals the partition count. Consumers commit their **offset**; after a crash they resume from it.
3. Another group reads the same data independently with its own offsets. Adding consumers doesn't cost the producer anything.

> [!NOTE]
> **Numbers:** ~5–10k msg/sec per partition is a comfortable planning number; a broker handles ~1M msg/sec. Default retention is 7 days. Choose partitions = target throughput ÷ per-consumer throughput.

## The dual-write problem

*Why not just write to both?*

![The dual-write problem](../diagrams/ddia-11-3.svg)

1. Two clients update the same item, and the DB applies them in one order.
2. The search index receives them in a different order (the network reorders them).
3. The two systems now disagree **permanently**, and nothing will repair it.
4. And if the app crashes between the two writes, one system has the change and the other doesn't. Writing to two systems is never atomic.

> [!TIP]
> **Say this in the interview:** "I won't dual-write to Postgres and Elasticsearch. I'll write only to Postgres and stream changes to Elasticsearch with CDC, so one order, defined by the DB log, reaches every consumer."

## Change data capture (CDC) and the outbox pattern

*One source of truth → many views*

![Change data capture (CDC) and the outbox pattern](../diagrams/ddia-11-4.svg)

1. **Outbox**: in the **same transaction** as the business write, insert an event row into an outbox table. Either both commit or neither does, so there is no dual-write problem.
2. A CDC connector tails the database's replication log (Ch 5) and publishes each change, including the outbox rows, to Kafka in commit order.
3. Every derived system (search, cache, warehouse) consumes the log and updates itself. Each can be rebuilt by replaying from offset 0, or from a snapshot plus the log.

> [!NOTE]
> **Consumers must be idempotent:** The relay can publish an event twice (crash after publish, before marking sent). Consumers dedupe by event ID or use upserts.

## Event sourcing: store what happened, derive the state

*Events as the source of truth*

![Event sourcing: store what happened, derive the state](../diagrams/ddia-11-5.svg)

1. Instead of updating a row in place, append immutable **events** that describe what the user did.
2. A cancellation is a new event, not a deletion. History is never lost.
3. State is a **derived view**, a fold over the events. You can build new views later by replaying, and debug by replaying to any point in time.

> [!WARNING]
> **Costs:** Replay gets slow, so you need snapshots. Schema evolution of old events is hard (Ch 4). "Delete my data" (GDPR) conflicts with immutability. Use it for audit-heavy domains (payments, ledgers), not everywhere.

> [!NOTE]
> **CDC vs event sourcing:** CDC derives events from DB row changes (low level). Event sourcing makes app-level events the truth (high level, intent preserved).

## Time and windows

*Event time vs processing time*

![Time and windows](../diagrams/ddia-11-6.svg)

1. **Tumbling**: "clicks per minute". Each event belongs to exactly one window.
2. **Hopping**: a 5-minute average updated every minute. Windows overlap, so each event belongs to several.
3. **Sliding**: "two failed logins within 5 minutes of each other". The window is defined by the events themselves.
4. **Session**: group a user's activity until a gap, as in web analytics and Strava activities.

> [!WARNING]
> **Event time ≠ processing time:** A phone offline in a tunnel sends events 10 minutes late. Bucket by **event time** (when it happened), not arrival time. A **watermark** says "probably all events up to T have arrived"; later stragglers are dropped or used to correct the result.

## Stream joins

*Three kinds*

| Join | Example | How |
|---|---|---|
| Stream–stream (window join) | Search event + click event within 1 hour → click-through rate | Buffer both streams in state, indexed by session ID, for the window length |
| Stream–table (enrichment) | Click event + user profile → add country and age | Keep a **local copy** of the table in the processor, updated by CDC. No remote DB call per event. |
| Table–table (materialized view) | Tweets ⋈ follows → each user's timeline cache | Both are changelogs; maintain the joined view incrementally (fan-out on write from Ch 1) |

> [!NOTE]
> **Time-dependence:** A join with a changing table depends on **when**: tax rate at sale time vs today's rate. To keep a join reproducible, give versioned records an ID and join on that version.

## Exactly-once really means effectively-once

*Fault tolerance*

![Exactly-once really means effectively-once](../diagrams/ddia-11-8.svg)

1. A failure mid-stream means some events were processed but their results weren't saved, or vice versa.
2. **Checkpointing** (Flink): barriers flow through the data. Each operator snapshots its state and the source offsets together. On failure, restore the snapshot and replay from those offsets. Spark does the same with **micro-batches**.
3. Replay means some outputs are sent twice. Make the sink **idempotent** (upsert by key, dedupe by event ID) or **transactional** (Kafka transactions commit offsets + outputs atomically). Duplicates still happen; they just have no effect.

> [!TIP]
> **Say this in the interview:** "Flink checkpoints every 10s. The sink upserts (ad_id, minute) → count, so replays after a failure overwrite instead of double-counting."

## In the interview

> [!IMPORTANT]
> **Interviewer asks:** "Ad click aggregation at 10k/sec?"  
> → Kafka partitioned by ad_id → Flink 1-min tumbling windows on event time → OLAP store. Raw clicks to S3 for batch reconciliation.

> [!IMPORTANT]
> **Interviewer asks:** "Keep search, cache, and DB in sync?"  
> → CDC (Debezium) or outbox → Kafka → idempotent consumers. Never dual-write.

> [!IMPORTANT]
> **Interviewer asks:** "Kafka or SQS?"  
> → Ordering, replay, or many consumers → Kafka. Independent tasks with per-message retry and DLQ → SQS.

> [!IMPORTANT]
> **Interviewer asks:** "Exactly-once?"  
> → "At-least-once delivery plus idempotent processing equals effectively-once. I make the consumer idempotent with an event ID."

---

← [Ch 10: Batch processing](10-batch-processing.md) · [Ch 12: The future of data systems](12-future-of-data-systems.md) →
