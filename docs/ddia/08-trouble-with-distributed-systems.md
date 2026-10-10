---
title: "DDIA Ch 8: The Trouble with Distributed Systems"
description: "On one machine, things either work or crash."
tags: [ddia]
---

# DDIA Chapter 8: The Trouble with Distributed Systems

> These DDIA pages are study notes in our own words and diagrams, connecting the book to interview problems. They don't replace the book; *Designing Data-Intensive Applications* by Martin Kleppmann is worth reading in full.

## TL;DR

On one machine, things either work or crash. Across machines you get **partial failure**: some parts work, some don't, and you often can't tell which. The three villains are unreliable networks, unreliable clocks, and process pauses.

**Key ideas:** partial failure · timeouts · clock skew · LWW danger · GC pauses · leases · fencing tokens · majority quorum

## The network: you cannot tell why there was no reply

*Unreliable networks*

![The network: you cannot tell why there was no reply](../diagrams/ddia-08-1.svg)

1. ① The request was lost in the network (or is still queued in a switch).
2. ② The request arrived, but the server crashed or is in a long GC pause.
3. ③ The server **did the work**, but the reply was lost. A retry runs it twice.
4. The client only knows "no reply before the timeout". That is why every retried operation must be **idempotent**.

> [!TIP]
> **Say this in the interview:** "Payment calls to the provider can time out after the charge succeeded. Every request carries an idempotency key, so a retry is safe."

> [!NOTE]
> **Choosing a timeout:** Too short means healthy nodes are declared dead and failover storms follow. Too long means users wait. Use p99.9 latency × margin, or adaptive (phi-accrual) detectors.

## Clocks: last-write-wins can drop the newer write

*Unreliable clocks*

![Clocks: last-write-wins can drop the newer write](../diagrams/ddia-08-2.svg)

1. Node 1's clock runs a few ms fast. Client A's write gets timestamp 42.004.
2. Client B writes later in real time, but Node 2's accurate clock says 42.003.
3. Last-write-wins compares timestamps, and the causally later write **loses**. No error is raised. NTP accuracy is only tens of ms at best.

> [!NOTE]
> **Two kinds of clock:** **Time-of-day** (System.currentTimeMillis) can jump backwards after an NTP sync. Never use it to measure durations. **Monotonic** (System.nanoTime) only moves forward and is for durations and timeouts.

> [!IMPORTANT]
> **Interviewer asks:** Google Spanner uses **TrueTime**: clocks return an interval [earliest, latest], and a commit waits out the uncertainty (~7ms).

## Process pauses: the expired-lease bug

*GC pauses*

![Process pauses: the expired-lease bug](../diagrams/ddia-08-3.svg)

1. Client 1 takes a lease, a lock with a timeout.
2. Then it pauses: a GC pause, VM migration, swapping, or a laptop lid closing. The thread doesn't know it paused.
3. The lease expires and is given to Client 2.
4. Client 2 writes, correctly.
5. Client 1 wakes up, checks nothing, and writes. Two writers think they own the lock.

> [!WARNING]
> **Checking the time does not help:** "Check lease validity before writing" still races, because the pause can happen **between** the check and the write.

## Fencing tokens: the fix

*Fencing*

![Fencing tokens: the fix](../diagrams/ddia-08-4.svg)

1. Every lock grant comes with a **monotonically increasing token**. ZooKeeper's zxid or an etcd revision works.
2. The storage remembers the highest token it has seen.
3. A late writer with an old token is rejected. The protection is enforced by the **resource**, not trusted to the client.

> [!TIP]
> **Say this in the interview:** "A Redis lock alone isn't safe under GC pauses. I'd pair the lock with a fencing token, for example a version column the DB checks: UPDATE … WHERE version < :token."

> [!NOTE]
> **Truth = majority:** A node can't trust its own view ("am I still leader?"). Decisions are made by a **quorum** of nodes, which is the basis of Ch 9.

## System models and Byzantine faults

*Assumptions*

| Model | Assumes | Reality |
|---|---|---|
| Timing: synchronous | Bounded network delay, pauses, clock drift | Not realistic |
| Timing: partially synchronous | Usually bounded, sometimes not | **The realistic model**; algorithms must stay safe when bounds break |
| Timing: asynchronous | No timing assumptions at all | Very restrictive; no timeouts |
| Node: crash-stop | Crashed nodes never return | Simplifies proofs |
| Node: crash-recovery | Nodes crash and return; disk survives, RAM doesn't | **Realistic** for datacenters |
| Node: Byzantine | Nodes may lie or act maliciously | Blockchains, aerospace. Rarely needed inside one company. |

> [!NOTE]
> **Safety vs liveness:** **Safety**: nothing bad ever happens (no two leaders). This must always hold. **Liveness**: something good eventually happens (a leader gets elected). This may wait for the network to heal.

## In the interview

> [!IMPORTANT]
> **Interviewer asks:** "What if the payment provider times out?"  
> → Outcome unknown. Retry with the **same idempotency key**, or reconcile with a status query. Never blindly charge again.

> [!IMPORTANT]
> **Interviewer asks:** "Distributed lock with Redis?"  
> → Fine for efficiency (avoid duplicate work). For correctness add **fencing tokens**, or use the DB's own conditional writes.

> [!IMPORTANT]
> **Interviewer asks:** "Order events by timestamp?"  
> → Wall clocks skew. Use a sequence from one leader, a Kafka partition offset, or logical clocks (Ch 9).

> [!IMPORTANT]
> **Interviewer asks:** "How do you detect a dead node?"  
> → Heartbeats + timeouts tuned to p99.9, and accept false positives. Leader election by majority, with epochs to fence the old leader.

---

← [Ch 7: Transactions](07-transactions.md) · [Ch 9: Consistency and consensus](09-consistency-and-consensus.md) →
