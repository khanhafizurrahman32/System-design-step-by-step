---
title: "Distributed cache"
description: "Design Redis itself: data structures inside one node, then distribution across many."
tags: [scaling-reads, medium]
---

# Distributed cache

**Difficulty:** Medium · **Patterns:** [Scaling reads](../patterns/scaling-reads.md) · [Long-running tasks](../patterns/long-running-tasks.md) · **DDIA:** [Ch 6](../ddia/06-partitioning.md) consistent hashing · [Ch 5](../ddia/05-replication.md) async replication

*Design Redis itself: data structures inside one node, then distribution across many.*

## TL;DR

- One node is a hash map plus a doubly linked list for O(1) least-recently-used eviction.
- Spread keys with consistent hashing and virtual nodes, so adding a node moves only a small share of keys.
- Replicate asynchronously for failover, and spread hot keys over several nodes.

## 1. Requirements

**Functional**

1. get(key), set(key, value, ttl), delete(key)
2. LRU eviction when full

**Non-functional**

- p99 ~1ms
- ~1TB data, 100k+ ops/s
- Survive node failure
- Eventual consistency acceptable

## 2. Back-of-envelope numbers

1TB ÷ ~32GB usable per node ≈ **32+ nodes** (+ replicas). Each node handles ≫ 100k ops/s, so memory, not CPU, sets the node count.

## 3. Core entities and API

```text
per node: HashMap key → node in a doubly linked list (LRU order) + expiry
```

```http
GET /cache/{key}
PUT /cache/{key} {value, ttl}
DELETE /cache/{key}
```

## 4. v1: the simplest design, and where it breaks

![Distributed cache: v1 design](../diagrams/problem-distributed-cache-v1.svg)

One node: a HashMap for O(1) lookup plus a doubly linked list for LRU order (move to head on access, evict the tail). TTL by lazy check plus a background sweep.

## 5. Evolving to the final design

![Distributed cache: final design](../diagrams/problem-distributed-cache-final.svg)

Each step fixes one specific problem with the step before it:

1. One node: a HashMap for O(1) lookup plus a doubly linked list for LRU order (move to head on access, evict the tail). TTL by lazy check plus a background sweep.
2. Shard across nodes with **consistent hashing** (with virtual nodes). The client computes the owner directly, so there is no extra hop.
3. Each primary replicates asynchronously to a replica; on failure the replica is promoted. Some recent writes may be lost, which is acceptable for a cache.
4. Ring membership lives in a config service; clients watch it. Hot keys get replicated across several nodes or a short-TTL local cache.

## 6. Deep dives

### LRU in O(1)?

HashMap → linked-list node; get = move to head; evict = remove tail.

### Add a node?

Consistent hashing moves ~1/N of keys; vnodes keep load even; warm gradually.

### Hot key?

Copies key#0..k on several nodes with random reads, or a client-side L1 cache.

### Why not hash % N?

Every scale event remaps ~all keys, and the cold cache stampedes the database.

## 7. Interview script (45 minutes)

| Time | What you do | Content |
|---|---|---|
| 0–5 | Functional requirements | get(key), set(key, value, ttl), delete(key); LRU eviction when full |
| 5–8 | Non-functional requirements | p99 ~1ms; ~1TB data, 100k+ ops/s; Survive node failure; Eventual consistency acceptable |
| 8–10 | Numbers that drive the design | 1TB ÷ ~32GB usable per node ≈ **32+ nodes** (+ replicas). Each node handles ≫ 100k ops/s, so memory, not CPU, sets the node count. |
| 10–13 | Entities and API | Keep it short: the endpoints in §3, idempotency keys on writes. |
| 13–25 | v1, then evolve it | Draw v1 and show where it breaks. Then add, in order: Cache node A → Cache node B → Cache node C → Replica A′ → Replica B′ → Replica C′ → Config / ZK. Justify each addition with a number. |
| 25–40 | Deep dives | LRU in O(1)? · Add a node? · Hot key? · Why not hash % N? |
| 40–45 | Wrap-up | Remaining bottlenecks, failure modes, what you would monitor. |

## 8. Common mistakes

- hash(key) % N sharding.
- Adding components before showing which number makes them necessary.
- Skipping failure handling: what happens on timeouts, retries and crashes.

## Related

- **Patterns:** [Scaling reads](../patterns/scaling-reads.md) · [Long-running tasks](../patterns/long-running-tasks.md)
- **DDIA:** [Ch 6](../ddia/06-partitioning.md) consistent hashing · [Ch 5](../ddia/05-replication.md) async replication
- **Similar problems:** [URL shortener (Bitly)](url-shortener.md) · [Rate limiter](rate-limiter.md) · [Business discovery (Yelp)](business-discovery.md) · [News feed (Facebook)](news-feed.md)
