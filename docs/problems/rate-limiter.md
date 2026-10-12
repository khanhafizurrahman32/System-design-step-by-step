---
title: "Rate limiter"
description: "Every public API needs one, and the obvious implementation has a race condition."
tags: [scaling-reads, medium]
---

# Rate limiter

<span class="lvl lvl-i">Intermediate</span>

**Difficulty:** Medium · **Patterns:** [Scaling reads](../patterns/scaling-reads.md) · [Dealing with contention](../patterns/contention.md) · **DDIA:** [Ch 7](../ddia/07-transactions.md) lost update · [Ch 6](../ddia/06-partitioning.md) shard by key

*Every public API needs one, and the obvious implementation has a race condition.*

> [!TIP]
> **One-page sketchnote:** [RATE LIMITER on a single page](../sketchnotes/problem-rate-limiter.svg), for revision or printing.

## TL;DR

- Counting per server gives each client N times its limit; the counter must be shared, usually in Redis.
- Read-then-write on a shared counter races. Do the refill, check and decrement atomically in one Lua script.
- Decide what happens when Redis is down: allow traffic (fail-open) or block it (fail-closed), per endpoint.

## 1. Requirements

**Functional**

1. Limit requests per client (user, IP, API key) by configurable rules
2. Return 429 with Retry-After and rate-limit headers

**Non-functional**

- Adds < 10ms latency
- Accurate across many API servers
- Highly available (choose fail-open vs fail-closed)
- 1M requests/sec total

## 2. Back-of-envelope numbers

1M req/s = 1M Redis ops/s; one Redis node does ~100k ops/s, so a **~10–20 shard Redis Cluster** keyed by client. 10M active keys × 100B ≈ **1GB** of memory.

## 3. Core entities and API

```text
rules(endpoint, limit, window)
bucket:{client}:{rule} → {tokens, last_refill}
```

```http
isAllowed(client_key, rule) → {allowed, remaining, reset_at}
Response headers: X-RateLimit-Limit / Remaining / Reset
```

## 4. v1: the simplest design, and where it breaks

![Rate limiter: v1 design](../diagrams/problem-rate-limiter-v1.svg)

The simplest rate limiter lives inside each API server: an in-memory map from client to a request counter. When a request arrives, increment the client's counter. If it's over the limit (say 100 a minute), return `429 Too Many Requests`.

**Where it breaks:** the API runs on **many servers** behind a load balancer, and each server counts only the requests **it** sees. With 50 servers, a client spreading requests across them can make 100 per minute **on each one**, which is **50× the limit**. Adding servers to handle traffic makes the limit even weaker. The count has to be **shared**.

## 5. Evolving to the final design

![Rate limiter: final design](../diagrams/problem-rate-limiter-final.svg)

Each step fixes one specific problem with the step before it.

### Step 1: move the counters to a shared store

**Why:** every server must see the same count for a client, or the limit is multiplied by the number of servers.

**How:** keep the counters in **Redis**, keyed by client and rule (`bucket:{api_key}:{rule}`). Every API server reads and updates the same key. Redis answers in well under a millisecond on the same network, which fits the "adds under 10 ms" requirement. At 1M requests a second, use a Redis Cluster of about 10–20 shards. Keys are spread by client, so each shard handles its share.

### Step 2: make the check-and-update atomic

**Why:** the obvious code is "GET the count, check it, SET count + 1". Two servers handling the same client at the same moment both GET 99, both decide 99 < 100, and both allow the request. That's a **lost update** race, and under load it lets clients exceed their limits.

**How:** do the whole check **inside Redis** in one step. Redis runs commands one at a time, so a **Lua script** that refills the client's tokens, checks and decrements runs **atomically**, and no other command can sneak in between. It's also one network round trip instead of two. For a simple fixed window, `INCR` followed by `EXPIRE` is atomic enough, because `INCR` returns the new value.

### Step 3: load rules from config, and decide what happens when Redis fails

**Why:** limits change (a customer upgrades their plan), and you can't redeploy every server to change a number. And Redis is now on the path of every request: if it's unreachable, every request must still get an answer, allow or block.

**How:** store rules (endpoint, limit, window) in a config store and cache them in each gateway, refreshing every few seconds. For Redis outages, decide **per endpoint**: **fail-open** (allow traffic) for normal APIs, because blocking everyone is worse than briefly allowing too much; **fail-closed** (block) for sensitive endpoints such as login or payments, where abuse is the bigger risk.

## 6. Deep dives

### Which algorithm?

**Why it matters:** different algorithms let through different bursts and cost different amounts of memory.

**How they compare:**

- **Token bucket** (the industry default): each client has a bucket holding up to *capacity* tokens, refilled at a steady *rate*. Each request spends one, and an empty bucket means 429. It allows short bursts up to the capacity while enforcing the average rate, and it stores just two numbers per client.
- **Fixed window:** count requests per calendar minute. It's simple, but a client can send 100 at 10:00:59 and another 100 at 10:01:00, which is **200 in two seconds**.
- **Sliding-window log:** store every request timestamp and count those in the last 60 seconds. It's exact, but stores one entry per request.
- **Sliding-window counter:** blend the current and previous fixed windows by how far into the current window you are. It's a close approximation with fixed-window cost.

### Race between servers?

**Why it happens:** read-modify-write from several servers on the same counter is the classic lost update ([DDIA Ch 7](../ddia/07-transactions.md)). Both servers read the old value before either writes.

**How:** never split the read and the write across round trips. Use a Lua script that does refill, check and decrement in one atomic step, or atomic commands like `INCR`. Redis is single-threaded per shard, so these are applied one after another.

### Redis is down?

**Why it matters:** every request now depends on Redis, so its outage must not become your outage.

**How:** fall back to **local** limiting in each server, using the limit divided by the number of servers. It's imprecise, but it still stops floods. Whether to fail open or closed is a **product decision per endpoint**: open for browsing APIs, closed for login, signup and payments. Put a short timeout on the Redis call (a few milliseconds) so a slow Redis can't slow every request.

### Very hot client?

**Why it's a problem:** one client's key always maps to **one** Redis shard. A client sending 100k requests a second sends all of that load to a single shard.

**How:** give each API server a **local allowance**, a share of that client's limit that it can spend without asking Redis, and sync the counts every few hundred milliseconds. Redis sees one update per server per interval instead of one per request. The trade-off is accuracy: the client might slightly exceed the limit between syncs. That's usually acceptable for very high limits.

## 7. Interview script (45 minutes)

| Time | What you do | Content |
|---|---|---|
| 0–5 | Functional requirements | Limit requests per client (user, IP, API key) by configurable rules; Return 429 with Retry-After and rate-limit headers |
| 5–8 | Non-functional requirements | Adds < 10ms latency; Accurate across many API servers; Highly available (choose fail-open vs fail-closed); 1M requests/sec total |
| 8–10 | Numbers that drive the design | 1M req/s = 1M Redis ops/s; one Redis node does ~100k ops/s, so a **~10–20 shard Redis Cluster** keyed by client. 10M active keys × 100B ≈ **1GB** of memory. |
| 10–13 | Entities and API | Keep it short: the endpoints in §3, idempotency keys on writes. |
| 13–25 | v1, then evolve it | Draw v1 and show where it breaks. Then add, in order: Redis Cluster → Lua script → Rules config. Justify each addition with a number. |
| 25–40 | Deep dives | Which algorithm? · Race between servers? · Redis is down? · Very hot client? |
| 40–45 | Wrap-up | Remaining bottlenecks, failure modes, what you would monitor. |


## Staff-level lens

| Question | Staff answer |
|---|---|
| **The real problem** | Count requests atomically across many gateways while adding under 10 ms. |
| **Deciding number** | 1M checks/s ≈ 10–20 Redis shards; ~1 GB of bucket state. |
| **Staff call and trade-off** | Token bucket in a Redis Lua script. Accept approximate limits for very hot tenants (local allowances synced periodically). |
| **Raise before you're asked** | Redis outage: fail-open or fail-closed, decided per endpoint; clock skew in refill (use Redis time); one tenant overloading a shard. |
| **Senior stops at** | Algorithm + Redis. |
| **Staff goes on to** | Plan tiers, global vs regional limits, rules as versioned config with shadow mode, and protecting the limiter itself. |
| **Run it** | Watch rejection rate per rule, limiter p99, Redis CPU. Roll out new rules in shadow (log-only) first. |

All 29 problems through this lens: [Staff-level answers](../playbook/staff-level.md).

## 8. Common mistakes

- Counters in Postgres: 1M writes/sec of throwaway data.
- Adding components before showing which number makes them necessary.
- Skipping failure handling: what happens on timeouts, retries and crashes.

## Self-check

Try to answer before you open each one.

<details class="question" markdown>
<summary>Why can't each API server count requests on its own?</summary>

With N servers behind a load balancer each client effectively gets N times its limit. The counter must be shared, typically in Redis.

</details>

<details class="question" markdown>
<summary>How do you avoid races between servers updating the same counter?</summary>

Do the refill, check and decrement atomically in one Redis Lua script (or an atomic INCR with expiry), not read-then-write.

</details>

<details class="question" markdown>
<summary>What happens when Redis is down?</summary>

You choose per endpoint: fail-open (allow traffic, risk abuse) for most APIs, fail-closed (block) for sensitive ones such as login or payments.

</details>

## Related

- **Patterns:** [Scaling reads](../patterns/scaling-reads.md) · [Dealing with contention](../patterns/contention.md)
- **DDIA:** [Ch 7](../ddia/07-transactions.md) lost update · [Ch 6](../ddia/06-partitioning.md) shard by key
- **Similar problems:** [URL shortener (Bitly)](url-shortener.md) · [Business discovery (Yelp)](business-discovery.md) · [News feed (Facebook)](news-feed.md) · [News aggregator (Google News)](news-aggregator.md)
