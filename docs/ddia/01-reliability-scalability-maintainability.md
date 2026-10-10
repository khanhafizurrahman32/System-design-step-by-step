---
title: "DDIA Ch 1: Reliable, Scalable, Maintainable"
description: "The three words every NFR discussion comes back to."
tags: [ddia]
---

# DDIA Chapter 1: Reliable, Scalable, Maintainable

> These DDIA pages are study notes in our own words and diagrams, connecting the book to interview problems. They don't replace the book; *Designing Data-Intensive Applications* by Martin Kleppmann is worth reading in full.

> [!TIP]
> **One-page sketchnote:** [DDIA 1 · RELIABLE, SCALABLE, MAINTAINABLE on a single page](../sketchnotes/ddia-01.svg), for revision or printing.

## TL;DR

The three words every NFR discussion comes back to. This chapter gives them precise meaning: reliability means tolerating faults, scalability means describing load and performance with numbers, and maintainability means keeping the system easy to run and change.

**Key ideas:** faults vs failures · load parameters · p99 latency · tail amplification · scale up vs out

## Fault ≠ failure

*Reliability*

![Fault ≠ failure](../diagrams/ddia-01-1.svg)

1. A **fault** is one component going wrong. Faults are normal and constant at scale.
2. The design goal is mechanisms that absorb faults: replicas, retries, timeouts, canary deploys.
3. If the fault is absorbed, the user never notices. That is reliability.
4. A **failure** is when the whole system stops serving users. You design so faults don't become failures.

> [!NOTE]
> **Scale makes faults routine:** Disks fail at roughly 2–5% per year. With 10,000 disks, expect **about one disk to die every day**.

> [!WARNING]
> **Most dangerous fault:** A **software** fault is correlated: the same bug hits every replica at once (leap second, bad deploy). Redundancy doesn't help, so you need staged rollouts.

## Describing load: the Twitter timeline

*Scalability · load parameters*

Load is not "lots of users". Load is a specific number, such as reads per second or the fan-out per post. Twitter's key number: 4.6k tweets/sec written, 300k timeline reads/sec.

![Describing load: the Twitter timeline](../diagrams/ddia-01-2.svg)

1. Approach 1: writes are cheap, just insert the tweet.
2. But every timeline read joins follows × tweets. At 300k reads/sec the database can't keep up.
3. Approach 2: when someone tweets, a worker pushes the tweet ID into each follower's timeline cache.
4. Reads become one cache lookup. The cost moved to write time. A celebrity with 30M followers means 30M pushes, so Twitter uses a **hybrid**: celebrities are fanned out on read.

> [!TIP]
> **Say this in the interview:** "The load parameter that matters here is fan-out per post, not total users. That number decides push vs pull."

## Describing performance: percentiles and tail latency

*Scalability · performance*

![Describing performance: percentiles and tail latency](../diagrams/ddia-01-3.svg)

1. Most requests are fast, with a long tail of slow ones. Averages hide that tail.
2. Use percentiles. p50 is the typical user; p99 is your heaviest users, who often have the most data and are the most valuable.
3. **Tail latency amplification**: one user request fans out to many backends in parallel.
4. The user waits for the **slowest** backend. With 100 backends at 1% slow each, 63% of user requests hit at least one slow call.

> [!NOTE]
> **The math:** P(no slow call) = 0.99^100 ≈ 0.37 → **63% of requests are slow**. This is why p99 of each service matters more than its average.

> [!TIP]
> **Say this in the interview:** "I'll set the SLO on p99, not average. Because the page fans out to several services, the tail compounds, so I'll add timeouts and hedged requests."

## Scaling up vs scaling out, and maintainability

*Scalability · maintainability*

| Choice | What it means | When it wins |
|---|---|---|
| Scale up (vertical) | Bigger machine: more cores, RAM, NVMe | Simple, no distribution bugs. A single Postgres box handles 10–50k TPS. Start here. |
| Scale out (horizontal) | More machines, shared-nothing | When one box is not enough or you need fault tolerance. Stateless services scale out easily; stateful ones (databases) are hard. |
| Elastic | Add or remove capacity automatically | Unpredictable load. Manual scaling is simpler and has fewer surprises. |
| Operability | Easy for ops to keep running | Monitoring, good defaults, predictable behaviour, runbooks. |
| Simplicity | Remove accidental complexity | Good abstractions, for example SQL hiding storage and concurrency. |
| Evolvability | Easy to change later | Loose coupling, schema evolution (Ch 4), tests. |

> [!WARNING]
> **Over-scaling:** There is no "magic scaling sauce". An architecture for 100k req/sec of 1KB reads looks nothing like one for 3 req/min of 2GB uploads. **Design for the load parameters you calculated.**

## In the interview

> [!IMPORTANT]
> **Interviewer asks:** "How will this scale?"  
> → Name the **load parameter** (reads/sec, fan-out, data size), calculate it, then say which component breaks first.

> [!IMPORTANT]
> **Interviewer asks:** "What's your latency target?"  
> → **p99 < 200ms** for reads, not averages. Mention tail amplification if requests fan out.

> [!IMPORTANT]
> **Interviewer asks:** "What if a node dies?"  
> → Separate fault from failure: "A node dying is a fault. Replicas plus health checks mean it never becomes a failure."

> [!TIP]
> **Say this in the interview:** "Before choosing components, let me pin down the load parameters: DAU, read:write ratio, and peak QPS, because they decide whether we need any distribution at all."

---

[Ch 2: Data models](02-data-models.md) →
