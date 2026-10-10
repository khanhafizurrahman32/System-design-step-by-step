---
title: Numbers and estimation
description: What modern hardware can do, and a fast method for back-of-envelope estimates that actually change design decisions.
---

# Numbers and estimation

Estimates exist for one reason: to decide whether you need a given component. Calculate only what changes a decision, round aggressively, and say the number out loud.

## Conversions you'll use every time

| Fact | Use it as |
|---|---|
| 1 day ≈ 86,400 s ≈ 10⁵ s | 1M requests/day ≈ 12/s; 1B/day ≈ 12k/s |
| Peak ≈ 2–5 × average | Design for peak, quote both |
| 1 KB × 1M = 1 GB; 1 KB × 1B = 1 TB | Storage per year: daily items × size × 365 |
| 1 Gbps ≈ 125 MB/s | Bandwidth: requests/s × response size |

## What one machine or service can handle

These are planning numbers for well-configured systems on modern hardware. Real numbers depend on payload size and query shape, so use them to find orders of magnitude, not exact limits.

| Component | Rough capacity |
|---|---|
| Modern server | 64–128 cores, 256 GB–1 TB RAM, 10–25 Gbps network |
| Postgres / MySQL primary | ~10–50k simple transactions/s; multiple TB of data |
| Redis (one node) | ~100k+ simple operations/s, sub-millisecond; data must fit in RAM |
| Kafka | ~5–10k messages/s per partition is a comfortable plan; ~1M messages/s per broker |
| Cassandra node | ~10k+ writes/s |
| Elasticsearch | Thousands of queries/s per cluster tier; new documents searchable in ~1 s |
| WebSocket server | ~100k–1M concurrent connections when tuned |
| Stateless app server | Thousands of requests/s, depending on work per request |

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
