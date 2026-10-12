---
title: "DDIA Ch 6: Partitioning (Sharding)"
description: "How to split data across machines: key-range vs hash partitioning, hot keys, secondary indexes, rebalancing, consistent hashing and request routing."
tags: [ddia]
---

# DDIA Chapter 6: Partitioning (Sharding)

<span class="lvl lvl-a">Advanced</span>

> These DDIA pages are study notes in our own words and diagrams, connecting the book to interview problems. They don't replace the book; *Designing Data-Intensive Applications* by Martin Kleppmann is worth reading in full.

> [!TIP]
> **One-page sketchnote:** [DDIA 6 · PARTITIONING (SHARDING) on a single page](../sketchnotes/ddia-06.svg), for revision or printing.

## TL;DR

When data or write load is too big for one machine, split it. Each record belongs to exactly one partition. The goals are to spread data and load evenly, avoid **hot spots**, and move as little data as possible when nodes are added.

**Key ideas:** key-range · hash partitioning · hot spots · secondary indexes · rebalancing · consistent hashing · request routing

## Key-range vs hash partitioning

*How to split*

Replication (Chapter 5) puts **copies of the same data** on several machines. Partitioning, also called **sharding**, is different: it splits the data so each machine holds **a different part**. You need it when the data is too big for one machine, or there are too many writes for one machine. Every record lives in exactly one partition, and the first decision is **how to choose the partition for a key**.

![Key-range vs hash partitioning](../diagrams/ddia-06-1.svg)

1. **By key range.** Like volumes of an encyclopedia: A–F on partition 1, G–M on partition 2, and so on. Keys stay sorted, so a range query such as "all orders from 1 to 7 March" reads one or two neighbouring partitions. The danger is keys that arrive **in order**. If the key is a timestamp or an auto-increment ID, every new write lands at the end, in the **same** partition. That partition gets all the write load while the others sit idle. This is a **hot spot**.
2. **By hash of the key.** Run the key through a hash function and use the result to pick the partition. Similar keys get completely different hashes, so data and load spread evenly. The cost: neighbouring keys are now scattered, so a range query over the key has to ask every partition.

A common way to get both is a **compound key**. Hash the first part, for example `user_id`, to pick the partition, and keep rows **sorted by the second part**, for example a timestamp, inside it. "User 42's messages from last week" then lives in one partition, already in order. This is how Cassandra's partition key plus clustering key works.

> [!TIP]
> **Say this in the interview:** "I'll partition messages by hash(conversation_id) and cluster by message timestamp, so one conversation's history is a single-partition range scan."

## Skew and hot spots: the celebrity problem

*Hot keys*

Hashing spreads **different keys** evenly, but it can't help when **one key** gets a huge share of the traffic. Every write for that key goes to the same partition, whatever the hash function.

![Skew and hot spots: the celebrity problem](../diagrams/ddia-06-2.svg)

1. A celebrity posts, and millions of likes and comments for that **one post ID** hit one partition. The rest of the cluster is fine; that one node is overloaded.
2. The fix is to **split the key**. Append a random number from 00 to 99 to it (`post123_07`, `post123_42`…), so the writes spread across up to 100 partitions.
3. The cost moves to reads: to get the full count or all the comments, you now read all 100 sub-keys and combine them. So only split keys you **know** are hot, and keep a list of which ones they are so readers know to combine.

> [!NOTE]
> **Interview examples:** live comments on a celebrity post, a Taylor Swift on-sale on Ticketmaster, YouTube view counters, an ad campaign's click counter. All use **key splitting** or **write buffering**: absorb the writes in Redis or Kafka and apply them in batches.

## Secondary indexes: local vs global

*Partitioning + indexes*

Partitioning by the primary key makes "get item 123" easy: hash the key, go to that partition. But what about "find all **red** cars"? Colour is not the partition key, so red cars are spread over every partition. A **secondary index** is needed, and there are two ways to partition it.

![Secondary indexes: local vs global](../diagrams/ddia-06-3.svg)

1. **Local index** (one index per partition): each partition indexes only its own records. Writing a car touches one partition, simple and fast. But a query for red cars must ask **every** partition and merge the answers (*scatter-gather*). The query is as slow as the slowest partition, and that gets worse as partitions are added (tail latency amplification, Chapter 1). MongoDB, Cassandra and Elasticsearch work this way.
2. **Global index** (the index is partitioned by the indexed value): all the "red" entries live on one index partition, so a query reads one place. But writing one car may now update index partitions on other machines. That is usually done **asynchronously**, so the index lags behind for a moment. DynamoDB's global secondary indexes work this way.

> [!WARNING]
> **DynamoDB GSI:** global secondary indexes are **eventually consistent**. A read through the GSI right after a write may not see it yet.

## Rebalancing: never use hash mod N

*Adding nodes*

Sooner or later you add machines, and some data must move to them. Moving data is expensive (network, disk, slower queries while it happens), so a good scheme moves **as little as possible**.

![Rebalancing: never use hash mod N](../diagrams/ddia-06-4.svg)

1. The tempting approach is `partition = hash(key) mod N`, where N is the number of nodes. Going from 3 to 4 nodes changes the result of `mod N` for about **75% of keys**, so nearly all the data has to move at once.
2. Better: create **many more partitions than nodes** from the start, for example 1,000 partitions on 10 nodes (100 each). The key-to-partition mapping is fixed forever. Only the **partition-to-node** assignment changes.
3. When an 11th node joins, it takes **a few whole partitions** from each existing node until all are even. Only those partitions move. Elasticsearch, Kafka, Riak and Couchbase work this way. Consistent hashing, next, is the same idea arranged as a ring.

> [!NOTE]
> **Other strategies:** **dynamic partitioning** splits a partition when it grows past a size, such as about 10 GB, and merges small ones (HBase, MongoDB). **Per-node partitioning** gives each node a fixed number of partitions (Cassandra's virtual nodes).

## Consistent hashing: the ring

*Consistent hashing*

**Consistent hashing** is a way to assign keys to nodes so that adding or removing a node moves only a small share of keys. It is used by caches, Cassandra and DynamoDB.

![Consistent hashing: the ring](../diagrams/ddia-06-5.svg)

1. Picture a circle of hash values. Hash each **node** to a point on the circle, and hash each **key** to a point too.
2. A key belongs to the **first node clockwise** from it.
3. Add a new node E. It lands somewhere on the circle and takes over only the keys between its position and the previous node, keys that used to belong to the next node clockwise. Everything else stays put. On average about **1/N** of the keys move, not 75%.
4. With only a few nodes, their points can land unevenly, leaving one node a huge arc. **Virtual nodes** fix this: each server is placed at many points (say 100) around the circle, so arcs average out. A bigger server can be given more points so it takes more load.

> [!TIP]
> **Say this in the interview:** "Cache keys are placed on a consistent-hash ring with virtual nodes, so adding a cache node remaps only about 1/N of keys and avoids a cold-cache stampede on the database."

## Request routing: who knows where key K lives?

*Service discovery*

Once data is split across machines, every request needs to reach the right one. And because partitions move during rebalancing, the answer changes over time. There are three common designs:

![Request routing: who knows where key K lives?](../diagrams/ddia-06-6.svg)

1. **① Ask any node.** The client connects to any node. If that node doesn't hold the key, it forwards the request to the one that does. Nodes share the partition map with each other by **gossip**. Used by Cassandra and Riak.
2. **② A routing tier.** Clients talk to a separate layer of routers that know the map and forward each request. Used by MongoDB (`mongos`) and Vitess (`VTGate`).
3. **③ A smart client.** The client library itself knows the map and connects directly to the right node, with no extra hop. Used by Kafka clients, Redis Cluster clients and Cassandra drivers.
4. Whoever does the routing needs an up-to-date map. It is usually stored in a coordination service such as **ZooKeeper** or **etcd** (or Kafka's KRaft). Routers and clients **watch** it, so they hear about every change immediately.

## In the interview

> [!IMPORTANT]
> **Interviewer asks:** "How would you shard this?"  
> → Name the **shard key** from the hottest query: "hash(user_id), because every hot query filters by user". Then name the cost: cross-user queries scatter.

> [!IMPORTANT]
> **Interviewer asks:** "What about the celebrity or hot hotel?"  
> → Key splitting with a suffix, write buffering in Redis or Kafka, and a cache in front for reads.

> [!IMPORTANT]
> **Interviewer asks:** "Adding shards later?"  
> → Pre-split into many logical partitions (e.g., 1024) mapped to few physical nodes, or consistent hashing. Never mod N.

> [!WARNING]
> **Sharding too early:** A single Postgres handles ~10–50k TPS and multiple TB. Shard only when the **calculation** says one primary can't take the write load.

---

← [Ch 5: Replication](05-replication.md) · [Ch 7: Transactions](07-transactions.md) →
