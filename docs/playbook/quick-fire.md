---
title: "Quick-fire practice"
description: "Eighteen short questions interviewers ask between deep dives. Answer out loud before opening each one."
---

# Quick-fire practice

<span class="lvl lvl-i">Intermediate</span>

Answer each question out loud in under 30 seconds, then open it to compare.

<details>
<summary><strong>1. Cache-aside vs write-through?</strong></summary>

Cache-aside: app reads cache, on miss reads DB and fills cache; writes update DB then delete key. Write-through writes both synchronously: fresher, slower writes.

</details>

<details>
<summary><strong>2. How do you stop a cache stampede?</strong></summary>

Single-flight lock per key (only one request recomputes), jittered TTLs, serve stale while revalidating, pre-warm hot keys.

</details>

<details>
<summary><strong>3. SSE vs WebSocket vs long polling?</strong></summary>

SSE: server→client over HTTP with auto-reconnect. WebSocket: bidirectional, stateful. Long polling: fallback. Pick the simplest that fits the traffic direction.

</details>

<details>
<summary><strong>4. Two users book the last seat. What exactly goes wrong and how do you fix it?</strong></summary>

Check-then-act race (write skew). An atomic conditional UPDATE … WHERE status=AVAILABLE, or a lock with TTL; exactly one row update succeeds.

</details>

<details>
<summary><strong>5. Why not 2PC across microservices?</strong></summary>

It blocks on coordinator failure and couples availability. Use a saga with compensations, outbox, and idempotent consumers.

</details>

<details>
<summary><strong>6. What is the outbox pattern?</strong></summary>

Write the business row and an event row in one local transaction; a relay/CDC publishes the event. No dual-write inconsistency.

</details>

<details>
<summary><strong>7. At-least-once vs exactly-once?</strong></summary>

Delivery is at-least-once in practice; make processing idempotent (dedupe by ID, upserts) to get an effectively-once result.

</details>

<details>
<summary><strong>8. When do you shard?</strong></summary>

When the calculated write load or data size exceeds one primary (~10–50k TPS, multiple TB) after caching and replicas. Pick the key from the hottest query.

</details>

<details>
<summary><strong>9. Consistent hashing in one sentence?</strong></summary>

Nodes and keys on a ring, key → next node clockwise; adding a node moves ~1/N of keys; virtual nodes balance load.

</details>

<details>
<summary><strong>10. Hot key, e.g., a celebrity or viral item?</strong></summary>

Split the key with suffixes, cache with local L1, buffer writes and aggregate, or special-case it (hybrid fan-out).

</details>

<details>
<summary><strong>11. Presigned URLs: why?</strong></summary>

Clients upload and download directly to object storage; app servers never carry the bytes; multipart allows resumable parallel chunks.

</details>

<details>
<summary><strong>12. Kafka vs SQS?</strong></summary>

Kafka: ordered partitions, replay, multiple consumer groups, stream processing. SQS: simple task queue with per-message retry, visibility timeout, DLQ.

</details>

<details>
<summary><strong>13. How do you make an API retry-safe?</strong></summary>

Client-generated Idempotency-Key stored with a unique constraint; return the stored result on duplicates.

</details>

<details>
<summary><strong>14. Replication lag bites how?</strong></summary>

Read-your-writes failures, non-monotonic reads, causally reordered reads. Fixes: read-from-leader after write, sticky replicas, partition by causal key.

</details>

<details>
<summary><strong>15. Redis lock is enough for correctness?</strong></summary>

No. GC pauses or clock issues can leave two holders. Add a fencing token checked by the resource, or use DB conditional writes.

</details>

<details>
<summary><strong>16. CAP in an interview?</strong></summary>

Per feature: during a partition choose to reject (CP) or serve stale (AP). Booking and payments CP; feeds and search AP.

</details>

<details>
<summary><strong>17. p99 vs average?</strong></summary>

Users feel the tail; with fan-out, tail latency compounds. Set SLOs on p99; use timeouts and hedged requests.

</details>

<details>
<summary><strong>18. LSM vs B-tree?</strong></summary>

LSM: sequential writes, compaction, great for write-heavy (Cassandra). B-tree: in-place pages, predictable reads, transactions (Postgres).

</details>

## Related

- [Phrases, signals and traps](phrases-and-traps.md)
- Every [problem page](../problems/index.md) ends with deep-dive questions in the same style.
