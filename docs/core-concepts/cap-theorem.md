---
title: "CAP theorem and PACELC"
description: "When the network splits, choose between refusing requests and answering with possibly stale data, separately for each feature."
tags: [core-concept]
---

# CAP theorem and PACELC

*When the network splits, choose between refusing requests and answering with possibly stale data, separately for each feature.*

![Concept 8: CAP theorem](../diagrams/concept-cap-theorem.svg)

1. The network between two replicas breaks. Partitions **will** happen, so P is not optional.
2. A user asks the node that can't see the latest write.
3. Either refuse (consistent, unavailable) or answer with stale data (available, inconsistent).

| Feature | Choice |
|---|---|
| Booking, payments, inventory | CP: never oversell or double-charge |
| Search, feeds, reviews, likes | AP: stale for seconds is fine |
| Usernames / unique constraints | CP (linearizable) |

> [!TIP]
> **Say this in the interview:** "CAP is a per-feature choice: the booking path is CP, browsing is AP."

## Checklist

1. Partitions will happen, so the real choice is C or A during one.
2. Choose per feature, not per system.
3. Money, inventory and uniqueness: consistency (CP).
4. Feeds, search, reviews, counters: availability (AP).
5. PACELC: even without partitions, stronger consistency costs latency.

## In the interview

> [!TIP]
> "Booking is CP: I'd rather reject than double-sell. Browsing is AP: a few seconds stale is fine."

## Related

- Pattern: [Dealing with contention](../patterns/contention.md)
