---
title: Glossary
description: Plain-language definitions of every term used in the handbook.
---

# Glossary

Plain-language definitions of the terms used across the handbook. On the website, hovering over most of these terms on any page shows the definition.

Jump to: [Numbers](#numbers) · [Requirements](#requirements) · [Networking](#networking) · [Correctness](#correctness) · [Databases](#databases) · [Distribution](#distribution) · [Caching](#caching) · [Messaging](#messaging) · [Storage](#storage)

## Numbers

| Term | Meaning |
|---|---|
| **Back-of-envelope estimate** | A quick, rounded calculation (QPS, storage, bandwidth) used to decide whether a component is needed. |
| **DAU** | Daily active users. Multiply by actions per user and divide by 86,400 to get average requests per second. |
| **Latency** | How long one request takes from start to finish. |
| **p50** | Median latency: half of requests are faster than this. |
| **p99** | 99th-percentile latency: 1 request in 100 is slower than this. Users feel the tail, so targets are set on p99. |
| **QPS** | Queries (requests) per second. The basic unit of load. |
| **Tail latency** | The slowest small share of requests (p99, p99.9). It grows when one request fans out to many services. |
| **Throughput** | How much work a system completes per second. |
| **TPS** | Transactions per second that a database commits. |

## Requirements

| Term | Meaning |
|---|---|
| **Availability** | The share of time the system answers correctly. Each extra "nine" costs much more. |
| **Durability** | Once data is acknowledged as saved, it is not lost, even after crashes. |
| **Error budget** | How much failure the SLO allows (100% minus the SLO). 99.9% per month is about 43 minutes. |
| **NFR** | Non-functional requirement: how well the system must work (latency, availability, consistency, scale), as opposed to what it does. |
| **SLA** | Service level agreement: an external promise with penalties if missed. |
| **SLI** | Service level indicator: the thing you measure, such as the share of requests faster than 300 ms. |
| **SLO** | Service level objective: your internal target for an SLI, such as 99.9% of requests under 300 ms. |

## Networking

| Term | Meaning |
|---|---|
| **CDN** | Content delivery network: servers near users that cache static files and shared responses so requests never reach your origin. |
| **DNS** | Domain Name System: turns a name like example.com into an IP address. |
| **gRPC** | A fast remote-call framework using HTTP/2 and Protobuf, common between internal services. |
| **L4 load balancer** | Spreads TCP connections across servers without reading their content. Very fast; good for long-lived connections. |
| **L7 load balancer** | Reads HTTP requests and routes by path, header or cookie; can terminate TLS and do sticky routing. |
| **Long polling** | The client asks for updates and the server holds the request open until something arrives. |
| **Presigned URL** | A temporary URL that lets a client upload or download one object directly to or from object storage. |
| **REST** | An API style built on HTTP resources and verbs (GET, POST…). The default for public APIs. |
| **RPC** | Remote procedure call: calling a function on another machine over the network. |
| **RTT** | Round-trip time: how long a message takes to go to another machine and back. |
| **SSE** | Server-Sent Events: one long-lived HTTP connection over which the server pushes updates to the client. |
| **Stateless service** | A server that keeps no user data between requests, so any instance can serve any request and you can add more freely. |
| **TLS** | The encryption behind HTTPS. |
| **WebSocket** | A long-lived two-way connection between client and server, for chat, games and collaboration. |

## Correctness

| Term | Meaning |
|---|---|
| **At-least-once** | Every message is delivered, but some may arrive twice. Pair it with idempotent processing. |
| **Check-then-act** | Reading a condition and then acting on it as two steps. Two requests can both pass the check; the classic race. |
| **Cursor pagination** | Paging with a pointer to the last item seen instead of an offset, so new items don't shift pages. |
| **Exactly-once** | In practice "effectively once": at-least-once delivery plus idempotent processing, so duplicates have no effect. |
| **Idempotency key** | A unique ID the client sends with a request so the server can recognise and ignore duplicates. |
| **Idempotent** | Doing it twice has the same effect as doing it once, so retries are safe. |
| **Race condition** | A bug where the result depends on the timing of concurrent operations. |

## Databases

| Term | Meaning |
|---|---|
| **ACID** | Atomicity, Consistency, Isolation, Durability: the guarantees of a database transaction. |
| **B-tree** | The default index structure: a shallow sorted tree of pages. Fast lookups and range scans. |
| **Column store** | A database that stores each column separately, so analytics read only the columns they need. |
| **Conditional update** | An UPDATE whose WHERE clause includes the condition (e.g. status = AVAILABLE), so the check and the write happen atomically. |
| **Denormalization** | Copying data into several places to make a hot read cheaper, at the cost of keeping copies in sync. |
| **fsync** | Forcing data from memory to disk so it survives a crash. Each commit waits for it, which limits single-row write rates. |
| **GSI** | Global secondary index (DynamoDB): an index partitioned separately from the table; updated asynchronously. |
| **Index** | A sorted lookup structure that lets the database find rows without scanning the whole table. |
| **Isolation level** | How much concurrent transactions are shielded from each other (Read Committed, Snapshot, Serializable). |
| **Lost update** | Two read-modify-write cycles overlap and one overwrites the other's change. |
| **LSM-tree** | Log-structured merge tree: writes go to memory and are flushed to sorted files that are merged later. Very fast writes; used by Cassandra and RocksDB. |
| **MVCC** | Multi-version concurrency control: rows keep several versions so readers see a consistent snapshot without blocking writers. |
| **Normalization** | Storing each fact once and referring to it by ID, so updates happen in one place. |
| **OLAP** | Online analytical processing: large scans and aggregations, as in dashboards and warehouses. |
| **OLTP** | Online transaction processing: many small reads and writes by key, as in an app database. |
| **Optimistic locking** | Allow concurrent work; at write time check a version number and retry if it changed. Good for low contention. |
| **Pessimistic locking** | Lock rows before changing them (SELECT … FOR UPDATE). Good for high contention on few rows. |
| **Transaction** | A group of reads and writes that succeed or fail together. |
| **WAL** | Write-ahead log: every change is appended to a log before it is applied, so a crash can be recovered by replaying the log. |
| **Write skew** | Two transactions each read the same condition, then write different rows; together they break a rule neither broke alone. The double-booking bug. |

## Distribution

| Term | Meaning |
|---|---|
| **2PC** | Two-phase commit: a coordinator asks all participants to prepare, then to commit. Blocks if the coordinator fails. |
| **CAP** | During a network partition, a system must choose between consistency (refuse) and availability (answer, possibly stale). |
| **Consensus** | Nodes agreeing on one value or order despite failures (Raft, Paxos, ZooKeeper). |
| **Consistent hashing** | Placing nodes and keys on a ring so adding or removing a node moves only a small share of keys. |
| **CRDT** | Conflict-free replicated data type: data that merges concurrent edits automatically. |
| **Eventual consistency** | Replicas may disagree briefly but converge if writes stop. |
| **Failover** | Promoting a replica to replace a failed leader. |
| **Fencing token** | An increasing number issued with each lock; storage rejects writes carrying an older number, so a stalled old lock-holder can't corrupt data. |
| **Hot key** | One key (a celebrity, a viral item) that gets so much traffic it overloads the single node holding it. |
| **Leader** | The one replica that accepts writes and orders them; followers copy from it. |
| **Lease** | A lock that expires automatically after a set time. |
| **Linearizability** | The system behaves as if there is one copy of the data: once anyone sees a new value, everyone does. |
| **LWW** | Last write wins: keep the value with the latest timestamp and silently drop the other. |
| **OT** | Operational transformation: a server orders concurrent edits and adjusts them so all copies converge (Google Docs). |
| **PACELC** | Extends CAP: even without partitions, stronger consistency costs latency. |
| **Quorum** | A majority (or w + r > n) of replicas that must agree, so reads overlap the latest writes. |
| **Replication** | Keeping copies of the same data on several machines. |
| **Replication lag** | How far a follower is behind the leader. Reads from a lagging follower can return old data. |
| **Saga** | A multi-step process across services where each step has a compensating action to undo it on failure. |
| **Shard key** | The field used to decide which shard a record lives on. |
| **Sharding** | Splitting data across machines so each holds and serves only part of it. Also called partitioning. |
| **Split brain** | Two nodes both believe they are the leader and accept writes. |

## Caching

| Term | Meaning |
|---|---|
| **Bloom filter** | A compact structure that answers "definitely not seen" or "probably seen", using about 10 bits per item. |
| **Cache hit ratio** | The share of reads answered by the cache. |
| **Cache stampede** | A hot key expires and many requests miss at once and overload the database. |
| **Cache-aside** | The app reads the cache; on a miss it reads the database and fills the cache. |
| **LRU** | Least recently used: evict the item that hasn't been used for the longest time. |
| **TTL** | Time to live: how long a cached item is kept before it expires. |

## Messaging

| Term | Meaning |
|---|---|
| **Backpressure** | Slowing or rejecting new work when a system is full, instead of falling over. |
| **Batch processing** | Processing a large, bounded dataset in one job, such as a nightly recount. |
| **CDC** | Change data capture: streaming every database change (from its log) to other systems. |
| **Consumer group** | Consumers that share a topic's partitions, each partition read by one of them. |
| **DLQ** | Dead-letter queue: where messages go after repeatedly failing, so they don't block others. |
| **Event sourcing** | Storing the sequence of events as the source of truth and deriving current state from it. |
| **Fan-out** | Sending one item to many recipients, such as a post to all followers. |
| **Fan-out on read** | Assemble each recipient's view when they read it, making writes cheap. |
| **Fan-out on write** | Precompute each recipient's copy when the item is created, making reads cheap. |
| **Kafka partition** | An ordered, append-only log that is one slice of a Kafka topic. Order is kept only within a partition. |
| **Message queue** | A buffer between producers and consumers so work can be done later, retried and spread over workers. |
| **Outbox pattern** | Write the business change and an event row in one transaction; a relay publishes the event, so the two can't disagree. |
| **Pub/sub** | Publish/subscribe: senders publish to a channel and every subscriber receives the message. |
| **Stream processing** | Processing events continuously as they arrive. |
| **Tumbling window** | Fixed, non-overlapping time buckets for stream aggregation, such as one per minute. |
| **Visibility timeout** | How long a taken message stays hidden; if the worker doesn't finish in time, it reappears for a retry. |
| **Watermark** | A stream processor's estimate that all events up to a time have arrived. |

## Storage

| Term | Meaning |
|---|---|
| **Adaptive bitrate** | Video split into short segments at several qualities; the player picks quality per segment from measured bandwidth. |
| **Geohash** | Encoding a location as a string whose shared prefix means nearby, so ordinary indexes can do proximity search. |
| **HLS** | HTTP Live Streaming: a format for adaptive-bitrate video delivered as small segments. |
| **Inverted index** | A map from each word to the documents containing it; the basis of full-text search. |
| **Multipart upload** | Uploading a large file as many parts in parallel, retrying only failed parts. |
| **Object storage** | Storage for whole files addressed by key (S3), cheap and very durable. |

