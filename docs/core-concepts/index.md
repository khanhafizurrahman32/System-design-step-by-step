---
title: "Core concepts"
description: "The building blocks every system design uses."
---

# Core concepts

The vocabulary every design uses. Each page has a diagram, a checklist and a sentence you can say in the interview.

| Concept | In one line |
|---|---|
| [Networking essentials](networking.md) | Protocols, load balancers, and which to use when |
| [Load balancing](load-balancing.md) | L4 vs L7, algorithms, health checks, sticky sessions |
| [API design](api-design.md) | Resources, pagination, idempotency, auth |
| [Data modeling](data-modeling.md) | Start from the queries, then keys and indexes |
| [Database indexing](indexing.md) | B-tree, composite, geospatial, inverted |
| [B-trees and B+ trees](b-trees.md) | Page-sized nodes, page splits, linked leaves for range scans |
| [Caching](caching.md) | Cache-aside, stampedes, hot keys |
| [Sharding](sharding.md) | Shard keys, hot spots, and when not to shard |
| [Consistent hashing](consistent-hashing.md) | Add nodes without moving everything |
| [Merkle trees](merkle-trees.md) | Find differences between replicas and prove data is untouched, with a few hashes |
| [Probabilistic data structures](probabilistic-data-structures.md) | Bloom filter, Count-min sketch, HyperLogLog: big answers in kilobytes |
| [Gossip and failure detection](gossip-and-failure-detection.md) | Who is alive, without a central server: heartbeats, phi accrual, SWIM, gossip |
| [CAP theorem and PACELC](cap-theorem.md) | Consistency vs availability, per feature |
| [Disaster recovery and multi-region](disaster-recovery.md) | Backups, RPO/RTO, pilot light to active-active |
| [Monolith vs microservices](monolith-vs-microservices.md) | When to split, service boundaries, discovery and service mesh |
| [Encryption and secrets](encryption-and-secrets.md) | TLS and mTLS, encryption at rest, KMS envelope encryption, secrets managers |
| [Authorization](authorization.md) | RBAC, ABAC and relationship-based access (Zanzibar) |

Also essential: [Numbers and estimation](../foundations/numbers-and-estimation.md).
