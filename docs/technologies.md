---
title: Choosing technologies
description: Nine technologies that cover most designs, with when to use each, when not to, the numbers, and the gotcha interviewers probe.
---

# Choosing technologies

You need fewer technologies than you think. Start with **Postgres**, add **Redis** for speed and **Kafka** for streams, and reach for the others only when a requirement asks for them.

| Need | Default choice |
|---|---|
| Source of truth with transactions | Postgres |
| Cache, counters, locks, leaderboards, geo, pub/sub | Redis |
| Durable event stream, buffering writes, change data capture | Kafka |
| Huge write volume with simple key access | Cassandra (or DynamoDB on AWS) |
| Full-text and faceted search | Elasticsearch (fed from the source of truth) |
| Windowed aggregation over streams | Flink |
| Leader election, locks with fencing, cluster metadata | ZooKeeper or etcd |
| Single entry point: auth, rate limits, routing | API gateway |

---

## Postgres

**What it is:** a relational database with ACID transactions, rich indexing (B-tree, GIN, GiST/PostGIS) and JSON support.

- **Use when:** you need transactions, relations, constraints, or you're not sure yet. It is the right default.
- **Avoid when:** writes exceed what one primary can take even after batching (tens of thousands per second sustained), or data is tens of TB of append-only events.
- **Numbers:** ~10–50k simple transactions/s per primary; multiple TB per node; read replicas for read scaling.
- **Gotcha:** the default isolation (Read Committed) does not prevent write skew. Use conditional updates or `SELECT … FOR UPDATE` for bookings and inventory.

> [!TIP]
> "Postgres is the source of truth. I'll only move data elsewhere when a specific number says it doesn't fit."

## Redis

**What it is:** an in-memory data-structure server: strings, hashes, sorted sets, streams, geo indexes, pub/sub. Commands run on a single thread, which makes each one atomic.

- **Use when:** caching, rate limiting (atomic Lua scripts), counters, leaderboards (sorted sets), short-lived locks (`SET NX EX`), geo lookups, fan-out of messages between servers.
- **Avoid when:** the data must survive anything (it's not your durable record), or it doesn't fit in memory.
- **Numbers:** ~100k+ operations/s per node, sub-millisecond latency.
- **Gotcha:** a lock in Redis isn't safe on its own if a process can pause and wake up after the lock expired. Use fencing tokens, or make the database enforce the rule.

## Kafka

**What it is:** a partitioned, replicated, append-only log. Consumers track their own offsets, so many independent consumers can read the same data and replay it.

- **Use when:** buffering write spikes, event-driven pipelines, change data capture, stream processing, several consumers of the same events.
- **Avoid when:** you need per-message work queues with individual retries and delays (use SQS/RabbitMQ), or request/response.
- **Numbers:** plan ~5–10k messages/s per partition; ~1M messages/s per broker; 7-day default retention.
- **Gotcha:** ordering is guaranteed only **within a partition**, and parallelism is capped by the number of partitions. Choose the partition key deliberately (e.g. `booking_id`).

## Cassandra

**What it is:** a leaderless, wide-column database built on LSM trees. Very fast writes, tunable consistency.

- **Use when:** massive write volume with simple access by key: chat history, metrics, activity logs, swipes.
- **Avoid when:** you need joins, ad-hoc queries or multi-row transactions.
- **Numbers:** ~10k+ writes/s per node; scales linearly by adding nodes.
- **Gotcha:** you model tables **per query**; a query without the partition key is expensive. Concurrent writes resolve by last-write-wins.

## DynamoDB

**What it is:** a managed key-value and document store on AWS with automatic scaling and single-digit-millisecond latency.

- **Use when:** you're on AWS and want predictable key-based access without running a cluster.
- **Avoid when:** access patterns are unknown or relational.
- **Gotcha:** one hot partition key throttles; global secondary indexes are eventually consistent.

## Elasticsearch

**What it is:** a distributed search engine built on inverted indexes, with relevance ranking, fuzzy matching, facets and geo queries.

- **Use when:** full-text search, faceted filtering, log search.
- **Avoid when:** you'd make it the source of truth, or `pg_trgm` / Postgres full-text already covers the need.
- **Numbers:** new documents become searchable after a refresh interval (~1 s).
- **Gotcha:** feed it from the database through change data capture. Never write to both the database and the index from application code.

## Flink

**What it is:** a stateful stream processor with event-time windows, checkpoints and exactly-once state.

- **Use when:** real-time aggregation (clicks per minute, top-K), alerting on streams, complex event patterns.
- **Avoid when:** a simple consumer writing to a database is enough.
- **Gotcha:** "exactly once" means effectively once. Sinks must be idempotent (upserts) or transactional.

## ZooKeeper / etcd

**What it is:** a small, strongly consistent key-value store built on a consensus protocol.

- **Use when:** electing a leader, holding locks with fencing tokens, storing cluster membership and configuration that clients watch.
- **Avoid when:** storing application data. It's built for small metadata.
- **Gotcha:** every write needs a majority round trip, so keep traffic low.

## API gateway

**What it is:** the single entry point in front of your services.

- **Use when:** you need authentication, rate limiting, TLS termination, routing and request logging in one place.
- **Avoid:** putting business logic in it.

---

## Related

- [The 7 patterns](patterns/index.md): when each technology earns its place.
- [Numbers and estimation](foundations/numbers-and-estimation.md)
