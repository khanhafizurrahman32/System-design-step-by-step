---
title: Numbers and estimation
description: What modern hardware can do, and a fast method for back-of-envelope estimates that actually change design decisions.
---

# Numbers and estimation

<span class="lvl lvl-b">Beginner-friendly</span>

Estimates exist for one reason: to decide whether you need a given component. Calculate only what changes a decision, round aggressively, and say the number out loud.

## Conversions you'll use every time

| Fact | Use it as |
|---|---|
| 1 day ≈ 86,400 s ≈ 10⁵ s | 1M requests/day ≈ 12/s; 1B/day ≈ 12k/s |
| Peak ≈ 2–5 × average | Design for peak, quote both |
| 1 KB × 1M = 1 GB; 1 KB × 1B = 1 TB | Storage per year: daily items × size × 365 |
| 1 Gbps ≈ 125 MB/s | Bandwidth: requests/s × response size |

## What one machine or service can handle

These are **planning numbers** for well-configured systems on modern hardware. Real numbers depend on payload size, query shape and configuration, so use them to find orders of magnitude, not exact limits. Managed-service quotas change over time; check the provider's documentation before relying on one.

How to read the table: **Limited by** is the resource that runs out first, which tells you what to scale. **Reach for it when** is the problem it solves. **Seen in** links to problems that use it.

### Compute and the edge

| Component | Rough capacity | Limited by | Reach for it when | Seen in |
|---|---|---|---|---|
| Modern server | 64–128+ cores, 256 GB–1 TB+ RAM, NVMe SSD, 10–25 Gbps network (up to 100) | Whatever your workload uses most: CPU, RAM or network | Before distributing anything: check whether one big machine is enough | [Business discovery](../problems/business-discovery.md) |
| Stateless app server | ~1k–10k requests/s per instance | CPU per request, and calls it waits on | Always; scale out horizontally behind a load balancer | Every problem |
| L7 load balancer (nginx, Envoy, cloud ALB) | Tens of thousands of requests/s per instance; managed ones scale automatically | CPU for TLS and routing; connection count | Routing by path or header, TLS termination, sticky routing | [Live comments](../problems/live-comments.md), [Collaborative editor](../problems/collaborative-editor.md) |
| L4 load balancer | Millions of packets/s; cheap per connection | Network bandwidth | Long-lived TCP / WebSocket connections at very high volume | [Chat app](../problems/chat-app.md) |
| CDN | Effectively unlimited for cacheable content; edge latency ~10–50 ms; aim for a 90%+ hit ratio | Cache hit ratio: misses go to your origin | Static files, media, and responses that are the same for many users | [Video platform](../problems/video-platform.md), [News aggregator](../problems/news-aggregator.md), [Photo sharing](../problems/photo-sharing.md) |
| API gateway | Tens of thousands of requests/s per instance; managed gateways often have a default per-account rate limit (around 10k req/s) that can be raised | Per-request work: auth, rate limits | One entry point for auth, rate limiting, routing and logging | [Rate limiter](../problems/rate-limiter.md) |
| WebSocket / SSE server | ~100k–1M concurrent connections when tuned; tens of KB of memory each | Memory per connection, file descriptors, fan-out CPU | Pushing updates to clients in real time | [Chat app](../problems/chat-app.md), [Live comments](../problems/live-comments.md), [LLM chat](../problems/llm-chat.md) |
| GPU inference node | A handful to dozens of concurrent requests per GPU; tens to hundreds of tokens/s per stream, model-dependent | GPU memory and compute; the most expensive resource in the system | Running ML models; put a queue with priorities in front | [LLM chat](../problems/llm-chat.md) |

### Databases

| Component | Rough capacity | Limited by | Reach for it when | Seen in |
|---|---|---|---|---|
| Postgres / MySQL primary | ~10–50k simple transactions/s; multiple TB of data | Write throughput of one primary; disk I/O; locks on hot rows | Default source of truth: transactions, joins, constraints | [Ticketmaster](../problems/ticketmaster.md), [Payment system](../problems/payment-system.md), [URL shortener](../problems/url-shortener.md) |
| Read replica | Adds roughly one primary's worth of read capacity each; lag of milliseconds to seconds | Replication lag; the primary's write rate | Read-heavy traffic that can tolerate slight staleness | [Business discovery](../problems/business-discovery.md), [Local delivery](../problems/local-delivery.md) |
| Cassandra node | ~10k+ writes/s per node; scales roughly linearly with nodes | Disk and compaction; reads cost more than writes | Huge write volume with simple key-based access | [Chat app](../problems/chat-app.md), [Dating app](../problems/dating-app.md), [Live comments](../problems/live-comments.md) |
| DynamoDB | Single-digit ms at any table size; each partition handles about 3,000 reads and 1,000 writes (1 KB) per second | Hot partition keys | Managed key-value access on AWS without running a cluster | [Job scheduler](../problems/job-scheduler.md) |
| MongoDB | Similar order to Postgres per node; sharding built in | Same as other single-leader databases | Flexible documents read as a whole | — |
| Elasticsearch | Thousands of queries/s per cluster tier; thousands to tens of thousands of documents indexed/s per node; new documents searchable after ~1 s; shards of ~10–50 GB work well | Shard count and size; heavy aggregations | Full-text search, relevance, facets, geo + text | [Post search](../problems/post-search.md), [Ticketmaster](../problems/ticketmaster.md) |
| Column store / OLAP (ClickHouse, Druid, BigQuery) | Scans hundreds of millions of rows/s per server; sub-second aggregations over billions of rows | Scan size; data layout and partitioning | Dashboards and analytics over large event volumes | [Ad click aggregator](../problems/ad-click-aggregator.md) |
| Time-series database | Hundreds of thousands to ~1M samples/s per node; compressed to ~1–2 bytes per sample | Cardinality (number of distinct series) | Metrics and other timestamped numbers | [Metrics monitoring](../problems/metrics-monitoring.md), [Price tracker](../problems/price-tracker.md) |

### Caches and coordination

| Component | Rough capacity | Limited by | Reach for it when | Seen in |
|---|---|---|---|---|
| Redis (one node) | ~100k+ simple ops/s, sub-millisecond; much more with pipelining; tens to hundreds of GB | RAM; a single thread executes commands, so one hot key can saturate a node | Cache, counters, rate limits, locks, leaderboards, geo, pub/sub | [Rate limiter](../problems/rate-limiter.md), [News feed](../problems/news-feed.md), [Ride sharing](../problems/ride-sharing.md) |
| Memcached | Several hundred thousand ops/s per node (multi-threaded) | RAM; no persistence or data structures | A plain, very fast key-value cache | [Distributed cache](../problems/distributed-cache.md) |
| ZooKeeper / etcd | Thousands of writes/s; reads scale with members; keep data small (MBs to a few GB) | Every write needs a majority round trip | Leader election, locks with fencing tokens, cluster config | [Job scheduler](../problems/job-scheduler.md), [Collaborative editor](../problems/collaborative-editor.md) |
| Bloom filter | ~10 bits (1.2 bytes) per item for a ~1% false-positive rate | Memory; items can't be removed (use a counting filter) | "Have I seen this before?" checks without storing every item | [Web crawler](../problems/web-crawler.md), [Dating app](../problems/dating-app.md) |

### Messaging and processing

| Component | Rough capacity | Limited by | Reach for it when | Seen in |
|---|---|---|---|---|
| Kafka | ~5–10k messages/s per partition is a comfortable plan (tens of MB/s); ~1M messages/s per broker; 7-day default retention | Partition count caps consumer parallelism; ordering only within a partition | Buffering write spikes, event streams, CDC, replay, several consumers | [Ad click aggregator](../problems/ad-click-aggregator.md), [Top-K videos](../problems/top-k-videos.md), [News feed](../problems/news-feed.md) |
| SQS | Standard queues: nearly unlimited throughput; FIFO queues: about 300 messages/s per API action (higher with batching); delays up to 15 minutes | FIFO ordering limits throughput | Independent jobs with per-message retries and dead-letter queues | [Online judge](../problems/online-judge.md), [Job scheduler](../problems/job-scheduler.md), [Web crawler](../problems/web-crawler.md) |
| RabbitMQ | Tens of thousands of messages/s per node | Memory when queues back up | Task queues with routing rules, acknowledgements, priorities | [LLM chat](../problems/llm-chat.md) |
| Flink (stream processor) | Hundreds of thousands of events/s per task slot for simple jobs; scales with parallelism | State size; checkpoint duration | Windowed counts, joins and alerts on live streams | [Ad click aggregator](../problems/ad-click-aggregator.md), [Metrics monitoring](../problems/metrics-monitoring.md) |
| Spark (batch) | Terabytes per hour across a cluster | Shuffle (network) and cluster size | Large batch jobs: recounts, rebuilding indexes, reconciliation | [Web crawler](../problems/web-crawler.md), [Ad click aggregator](../problems/ad-click-aggregator.md) |

### Storage and network

| Component | Rough capacity | Limited by | Reach for it when | Seen in |
|---|---|---|---|---|
| Object storage (S3) | 3,500 writes/s and 5,500 reads/s per key prefix (spread prefixes to go higher); objects up to 5 TB; multipart upload up to 10,000 parts; 11 nines of durability | Request rate per prefix; per-request latency (tens of ms) | Files, images, video, backups, raw logs | [Video platform](../problems/video-platform.md), [File sync](../problems/file-sync.md), [Photo sharing](../problems/photo-sharing.md) |
| NVMe SSD | Hundreds of thousands to 1M+ random reads/s; several GB/s sequential | Random write endurance | Databases and anything latency-sensitive on disk | — |
| Hard disk (HDD) | ~100–200 random reads/s; ~100–250 MB/s sequential | Seek time | Cheap bulk storage read sequentially | — |
| Network link | 1 Gbps ≈ 125 MB/s; 10 Gbps ≈ 1.25 GB/s | Bandwidth, especially for media | Size fleets that move bytes (crawlers, video) by bandwidth, not CPU | [Web crawler](../problems/web-crawler.md), [Video platform](../problems/video-platform.md) |

### Rules of thumb from this table

- **Fits on one machine? Keep it there.** 10 GB of data, or a few thousand writes per second, does not need sharding.
- **Reads too high → cache, replicas, CDN, in that order.** Each removes most of the load before the next is needed.
- **Writes too high → buffer, batch, pre-aggregate, then shard.** Sharding is the last step, not the first.
- **Find the scarce resource.** It is usually the database primary, RAM for caches, the network for media, or GPUs for models. Design around that one.
- **Watch for single hot things.** One hot row, Redis key, Kafka partition or DynamoDB partition caps you no matter how many machines you add.

## Latency ladder

| Operation | Time |
|---|---|
| Read from RAM | ~100 ns |
| Read from SSD | ~100 µs |
| Round trip within a datacenter | ~0.5 ms |
| Redis GET (same datacenter) | ~0.5–1 ms |
| Indexed database read | ~1–10 ms |
| Round trip across a continent | ~50–100 ms |
| Round trip across the world | ~150–250 ms |

## The method

1. **Users → requests:** DAU × actions per user per day ÷ 86,400 = average QPS. Multiply by 3 for peak.
2. **Split reads and writes:** apply the read:write ratio.
3. **Storage:** new items per day × size × retention.
4. **Compare** each number with the table above. If it fits one component with headroom, you don't need to scale that part yet.

### Example: photo-sharing app

- 500M DAU × 20 feed views = 10B reads/day ≈ **115k reads/s** → needs caching (one Postgres can't serve this).
- 100M uploads/day ≈ **1.2k writes/s** → one primary could take the metadata, but…
- 100M × 2 MB = **200 TB of media per day** → object storage plus a CDN, never the database.

Three numbers, three decisions.

> [!TIP]
> **Say this in the interview:** "1B requests a day is about 12k per second on average, maybe 40k at peak. A single Redis handles that; Postgres needs a cache in front."

## Common mistakes

- Spending ten minutes on arithmetic that doesn't change any decision.
- Using outdated limits and sharding systems that fit on one modern machine.
- Forgetting peak traffic, or forgetting bandwidth for large responses.
