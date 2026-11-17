---
title: Glossary
description: Plain-language definitions of every term used in the handbook.
---

# Glossary

Plain-language definitions of the terms used across the handbook. On the website, hovering over most of these terms on any page shows the definition.

Jump to: [Numbers](#numbers) · [Requirements](#requirements) · [Networking](#networking) · [Correctness](#correctness) · [Databases](#databases) · [Distribution](#distribution) · [Caching](#caching) · [Messaging](#messaging) · [Storage](#storage) · [Reliability](#reliability) · [Security](#security) · [Operating systems](#operating-systems)

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
| **Anycast** | Announcing the same IP prefix from many locations so routing delivers each user to a nearby one. Used by DNS resolvers and CDNs. |
| **API gateway** | The single entry point in front of your services that handles TLS, authentication, rate limiting and routing. |
| **ARP** | Address Resolution Protocol: finds the MAC address for an IP address on the local network by broadcasting a question. |
| **Autonomous system** | A network run by one organisation (an ISP, a cloud) with its own routing policy and AS number; the Internet is tens of thousands of them. |
| **BGP** | Border Gateway Protocol: how autonomous systems tell each other which address blocks they can reach, and choose routes by policy. |
| **CDN** | Content delivery network: servers near users that cache static files and shared responses so requests never reach your origin. |
| **CIDR** | Classless Inter-Domain Routing: writing address blocks as prefix/length (10.0.0.0/16) so routes can cover blocks of any size. |
| **Congestion control** | How TCP slows down when the network is overloaded: it shrinks its sending window on loss and grows it slowly otherwise. |
| **CRC** | Cyclic redundancy check: an error-detecting code added to every Ethernet and Wi-Fi frame. |
| **DHCP** | Dynamic Host Configuration Protocol: gives a device joining a network its IP address, gateway and DNS server. |
| **DNS** | Domain Name System: turns a name like example.com into an IP address. |
| **ECMP** | Equal-cost multi-path: spreading flows across several equally good paths by hashing their addresses and ports. |
| **GraphQL** | An API style with one endpoint where the client sends a query naming exactly the fields it wants. |
| **gRPC** | A fast remote-call framework using HTTP/2 and Protobuf, common between internal services. |
| **HTTP/2** | Binary HTTP that multiplexes many requests as streams over one TCP connection, with header compression. |
| **HTTP/3** | HTTP over QUIC instead of TCP, so a lost packet only delays its own stream and connections survive network changes. |
| **ICMP** | Internet Control Message Protocol: carries network errors and diagnostics; ping and traceroute use it. |
| **ISP** | Internet service provider: a company that connects homes, businesses or other networks to the Internet. |
| **IXP** | Internet exchange point: a facility where many networks connect directly to exchange traffic. |
| **L4 load balancer** | Spreads TCP connections across servers without reading their content. Very fast; good for long-lived connections. |
| **L7 load balancer** | Reads HTTP requests and routes by path, header or cookie; can terminate TLS and do sticky routing. |
| **Long polling** | The client sends a request that the server holds open until it has news (or a timeout), then the client asks again. |
| **Long polling** | The client asks for updates and the server holds the request open until something arrives. |
| **MAC address** | A 48-bit hardware address that identifies a network card on the local link; frames are delivered by it. |
| **NAT** | Network address translation: a router rewrites private addresses and ports to its public address, so many devices share one IP. |
| **OSPF** | Open Shortest Path First: a link-state routing protocol used inside one network; every router learns the map and runs Dijkstra. |
| **Presigned URL** | A temporary URL that lets a client upload or download one object directly to or from object storage. |
| **QUIC** | A transport protocol on top of UDP with TLS built in, faster connection setup and independent streams. HTTP/3 runs on it. |
| **REST** | An API style built on HTTP resources and verbs (GET, POST…). The default for public APIs. |
| **RPC** | Remote procedure call: calling a function on another machine over the network. |
| **RTT** | Round-trip time: how long a message takes to go to another machine and back. |
| **SDN** | Software-defined networking: a central controller computes forwarding rules and installs them on simple switches. |
| **Service mesh** | A sidecar proxy beside every service instance that handles discovery, load balancing, retries, mTLS and metrics. |
| **Slow start** | TCP's start-up phase: the sending window doubles every round trip until loss or a threshold. |
| **SSE** | Server-Sent Events: one long-lived HTTP connection over which the server pushes updates to the client. |
| **Stateless service** | A server that keeps no user data between requests, so any instance can serve any request and you can add more freely. |
| **TCP** | Transmission Control Protocol: a reliable, ordered byte stream between two machines, with a handshake to open it. Used by HTTP/1.1, HTTP/2 and most databases. |
| **TLS** | The encryption behind HTTPS. |
| **UDP** | User Datagram Protocol: sends independent packets with no handshake, ordering or retransmission. Used for DNS, video calls, games and QUIC. |
| **VLAN** | Virtual LAN: tags frames so one physical switch acts as several separate local networks. |
| **Webhook** | An HTTP callback: when an event happens, the provider POSTs it to a URL you registered, instead of you polling. |
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
| **B+ tree** | The B-tree variant databases actually use: internal pages hold only keys, all values sit in leaves linked in order, which makes range scans cheap. |
| **B-tree** | The default index structure: a shallow sorted tree of pages. Fast lookups and range scans. |
| **Column store** | A database that stores each column separately, so analytics read only the columns they need. |
| **Conditional update** | An UPDATE whose WHERE clause includes the condition (e.g. status = AVAILABLE), so the check and the write happen atomically. |
| **Count-min sketch** | A small grid of counters that estimates how often items appear; never undercounts. |
| **CQRS** | Command query responsibility segregation: writes go to one model (often an event log), reads come from separate views built from it. |
| **Data lake** | A store of raw data files (usually on object storage) in whatever format they arrived, kept for analytics and ML. |
| **Data warehouse** | A separate database built for analytical queries over data copied from operational systems. |
| **Denormalization** | Copying data into several places to make a hot read cheaper, at the cost of keeping copies in sync. |
| **ETL** | Extract, transform, load: copy data out of operational systems, reshape it, and load it into a warehouse. ELT loads first and transforms inside the warehouse. |
| **Event sourcing** | Storing every change as an immutable event and deriving current state (and other views) by replaying the events. |
| **fsync** | Forcing data from memory to disk so it survives a crash. Each commit waits for it, which limits single-row write rates. |
| **GSI** | Global secondary index (DynamoDB): an index partitioned separately from the table; updated asynchronously. |
| **HNSW** | Hierarchical navigable small world: a layered graph index for fast approximate nearest-neighbour vector search. |
| **HyperLogLog** | Estimates the number of distinct items in about 12 KB with ~1% error; sketches can be merged. |
| **Index** | A sorted lookup structure that lets the database find rows without scanning the whole table. |
| **Isolation level** | How much concurrent transactions are shielded from each other (Read Committed, Snapshot, Serializable). |
| **Lakehouse** | Warehouse-style tables (Iceberg, Delta Lake) over open file formats on object storage, readable by many query engines. |
| **Lost update** | Two read-modify-write cycles overlap and one overwrites the other's change. |
| **LSM-tree** | Log-structured merge tree: writes go to memory and are flushed to sorted files that are merged later. Very fast writes; used by Cassandra and RocksDB. |
| **Materialized view** | A stored query result kept up to date as the underlying data changes. |
| **MVCC** | Multi-version concurrency control: rows keep several versions so readers see a consistent snapshot without blocking writers. |
| **Normalization** | Storing each fact once and referring to it by ID, so updates happen in one place. |
| **OLAP** | Online analytical processing: large scans and aggregations, as in dashboards and warehouses. |
| **OLTP** | Online transaction processing: many small reads and writes by key, as in an app database. |
| **Optimistic locking** | Allow concurrent work; at write time check a version number and retry if it changed. Good for low contention. |
| **Page split** | When an insert finds a B-tree page full: the page is split into two half-full pages and a new boundary key is added to the parent. |
| **Pessimistic locking** | Lock rows before changing them (SELECT … FOR UPDATE). Good for high contention on few rows. |
| **Skip list** | Layered linked lists with express lanes giving O(log n) search; Redis sorted sets use one to compute ranks. |
| **Tombstone** | A marker recording that a key was deleted, replicated like a write so stale replicas cannot resurrect the value. |
| **Transaction** | A group of reads and writes that succeed or fail together. |
| **Trie** | A prefix tree: each node is a prefix; used for autocomplete, often storing top completions at each node. |
| **Vector embedding** | A list of numbers produced by a model so that items with similar meaning end up close together; used for semantic search. |
| **WAL** | Write-ahead log: every change is appended to a log before it is applied, so a crash can be recovered by replaying the log. |
| **Write skew** | Two transactions each read the same condition, then write different rows; together they break a rule neither broke alone. The double-booking bug. |

## Distribution

| Term | Meaning |
|---|---|
| **2PC** | Two-phase commit: a coordinator asks all participants to prepare, then to commit. Blocks if the coordinator fails. |
| **Anti-entropy** | A background process that compares replicas (often with Merkle trees) and repairs data that drifted apart. |
| **CAP** | During a network partition, a system must choose between consistency (refuse) and availability (answer, possibly stale). |
| **Cell-based architecture** | Running many independent copies (cells) of the whole stack, each serving a subset of tenants, to limit the blast radius of failures. |
| **Consensus** | Nodes agreeing on one value or order despite failures (Raft, Paxos, ZooKeeper). |
| **Consistent hashing** | Placing nodes and keys on a ring so adding or removing a node moves only a small share of keys. |
| **CRDT** | Conflict-free replicated data type: data that merges concurrent edits automatically. |
| **Eventual consistency** | Replicas may disagree briefly but converge if writes stop. |
| **Failover** | Promoting a replica to replace a failed leader. |
| **Fencing token** | An increasing number issued with each lock; storage rejects writes carrying an older number, so a stalled old lock-holder can't corrupt data. |
| **Gossip protocol** | Nodes periodically exchange state with random peers, so information reaches all N nodes in about log N rounds. |
| **Hinted handoff** | A neighbour accepts writes for an unreachable replica and hands them over when it returns. |
| **Hot key** | One key (a celebrity, a viral item) that gets so much traffic it overloads the single node holding it. |
| **Hybrid logical clock** | A timestamp combining wall-clock time with a counter: close to real time, never goes backwards, respects causality. |
| **Lamport timestamp** | A (counter, node ID) pair that orders events consistently with cause and effect, without physical clocks. |
| **Leader** | The one replica that accepts writes and orders them; followers copy from it. |
| **Lease** | A lock that expires automatically after a set time. |
| **Linearizability** | The system behaves as if there is one copy of the data: once anyone sees a new value, everyone does. |
| **Local-first** | Software where the copy of data on the user's device is primary and works offline, syncing with others when possible. |
| **LWW** | Last write wins: keep the value with the latest timestamp and silently drop the other. |
| **Merkle tree** | A tree of hashes: each parent hashes its children, so comparing roots and descending only into differing branches finds changed data, and a few sibling hashes prove a record belongs. |
| **Multitenancy** | One system serving many customers (tenants) on shared infrastructure, with their data kept apart. |
| **Operational transformation** | A way to merge concurrent text edits by adjusting each edit's position for edits that happened at the same time (Google Docs). |
| **OT** | Operational transformation: a server orders concurrent edits and adjusts them so all copies converge (Google Docs). |
| **PACELC** | Extends CAP: even without partitions, stronger consistency costs latency. |
| **Phi accrual detector** | A failure detector that outputs a suspicion level based on the history of heartbeat timings instead of a fixed timeout. |
| **Quorum** | A majority (or w + r > n) of replicas that must agree, so reads overlap the latest writes. |
| **Replication** | Keeping copies of the same data on several machines. |
| **Replication lag** | How far a follower is behind the leader. Reads from a lagging follower can return old data. |
| **Saga** | A multi-step process across services where each step has a compensating action to undo it on failure. |
| **Shard key** | The field used to decide which shard a record lives on. |
| **Sharding** | Splitting data across machines so each holds and serves only part of it. Also called partitioning. |
| **Shared-nothing** | An architecture where each node has its own CPU, memory and disk and nodes coordinate only over the network. |
| **Sloppy quorum** | Counting writes to stand-in nodes towards the quorum when the key's own replicas are down. |
| **Snowflake ID** | A 64-bit unique ID made of a timestamp, a machine ID and a sequence number, so IDs sort roughly by creation time. |
| **Split brain** | Two nodes both believe they are the leader and accept writes. |
| **SWIM** | A membership protocol: probe one random node per interval, use indirect probes before suspecting it, and spread news by gossip. |
| **Sync engine** | A library or service that keeps a local copy of data on each device and syncs changes in the background. |
| **Two-phase commit** | A protocol where a coordinator asks all participants to prepare, then tells them all to commit or abort, so a transaction is atomic across nodes. |
| **Vector clock** | One counter per node, attached to each version; comparing two vectors shows whether one happened before the other or they were concurrent. |
| **Zombie** | A node that still acts on authority it has lost (a lease or leadership), for example after a long pause. |

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
| **Durable execution** | Running a multi-step workflow so each step's result is logged; after a crash the workflow replays and resumes without repeating finished steps. |
| **Event sourcing** | Storing the sequence of events as the source of truth and deriving current state from it. |
| **Fan-out** | Sending one item to many recipients, such as a post to all followers. |
| **Fan-out on read** | Assemble each recipient's view when they read it, making writes cheap. |
| **Fan-out on write** | Precompute each recipient's copy when the item is created, making reads cheap. |
| **Incremental view maintenance** | Keeping a query result up to date by applying only each change to it, instead of re-running the query. |
| **ISR** | In-sync replicas: the followers of a Kafka partition that are caught up with the leader. |
| **Kafka partition** | An ordered, append-only log that is one slice of a Kafka topic. Order is kept only within a partition. |
| **Log compaction** | Keeping only the latest message per key in a log, so a topic can hold current state. |
| **Message queue** | A buffer between producers and consumers so work can be done later, retried and spread over workers. |
| **Offset** | A consumer's position in a log such as a Kafka partition; each consumer group tracks its own. |
| **Outbox pattern** | Write the business change and an event row in one transaction; a relay publishes the event, so the two can't disagree. |
| **Partition key** | The field used to choose a partition (for example user ID); order is guaranteed only within one partition. |
| **Poison message** | A message that fails every time it is processed; it should be moved to a dead-letter queue. |
| **Pub/sub** | Publish/subscribe: senders publish to a channel and every subscriber receives the message. |
| **Schema registry** | A service that stores message schemas and rejects incompatible changes, so producers and consumers can evolve independently. |
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

## Reliability

| Term | Meaning |
|---|---|
| **Active-active** | Several regions serving traffic at once, so losing one costs seconds; writes need a conflict strategy. |
| **Blue-green deploy** | Running two full environments and switching all traffic from the old (blue) to the new (green); switching back is the rollback. |
| **Bulkhead** | Separate pools of threads or connections per dependency, so one slow dependency can't exhaust everything. |
| **Canary deploy** | Releasing a new version to a small share of traffic first and comparing its errors and latency before rolling it out further. |
| **Circuit breaker** | Stops calling a failing dependency for a while and fails fast instead, then lets a few trial calls through to test recovery. |
| **Deterministic simulation testing** | Running a whole distributed system in a seeded simulator so any failure can be replayed exactly from its seed. |
| **Expand and contract** | Changing a schema in backward-compatible steps: add the new thing, migrate, switch over, then remove the old thing. |
| **Exponential backoff** | Waiting longer after each failed attempt (100 ms, 200, 400…) so a struggling service can recover. |
| **Feature flag** | A runtime switch that turns a feature on or off for some users without redeploying. |
| **Gray failure** | A component that is slow or partly broken rather than clearly dead, so failure detection doesn't trigger. |
| **Hedged request** | Sending a duplicate request to another replica if the first is slow, and using whichever answers first. |
| **Jitter** | Randomness added to retry delays so many clients don't retry at the same instant. |
| **Load shedding** | Rejecting some requests early (usually the least important) when a service is overloaded, so the rest stay fast. |
| **Metastable failure** | An overload that sustains itself, typically through retries, even after the original trigger is gone. |
| **Pilot light** | A DR setup with data replicated to a second region but servers off until needed. |
| **RED method** | Monitor every service by request Rate, Errors and Duration. |
| **Retry budget** | A cap on how much extra load retries may add (for example 10%), so retries can't multiply an outage. |
| **RPO** | Recovery point objective: how much data (time of writes) you can afford to lose in a disaster. |
| **RTO** | Recovery time objective: how long you can afford to be down after a disaster. |
| **SPOF** | Single point of failure: a component whose failure takes down the whole system. |
| **System of record** | The authoritative source of a piece of data; other copies are derived from it. |
| **Thundering herd** | Many clients hitting a service at the same moment, for example all retrying together or all missing an expired cache key. |
| **Token bucket** | A rate-limiting algorithm: tokens refill at a steady rate, each request spends one, and bursts up to the bucket size are allowed. |
| **Trace** | The record of one request as it passes through several services, with the time spent in each. |

## Security

| Term | Meaning |
|---|---|
| **ABAC** | Attribute-based access control: a policy decides using attributes of the user, resource and context. |
| **Access token** | A short-lived credential an app sends with each API call (usually as a Bearer header) to prove it may act. |
| **Argon2id** | The recommended slow, memory-hard password hashing function. bcrypt and scrypt are acceptable alternatives. |
| **Authentication** | Proving who you are (password, passkey, SSO). Often shortened to authn. |
| **Authorization** | Deciding what an authenticated caller is allowed to do. Often shortened to authz. |
| **bcrypt** | A long-established slow password hashing function with a tunable cost factor. |
| **CA** | Certificate authority: an organisation browsers trust to sign certificates that bind a domain name to a public key. |
| **Crypto-shredding** | Encrypting each person's data with their own key and deleting the key to make the data unreadable everywhere, even in immutable logs and backups. |
| **CSRF** | Cross-site request forgery: another site makes the user's browser send a request with their cookies. Stopped with SameSite cookies or tokens. |
| **Data minimisation** | Collecting and keeping only the personal data needed for a stated purpose, for no longer than necessary. |
| **Envelope encryption** | Encrypting data with a data key and storing that key encrypted under a KMS master key. |
| **HMAC** | A signature made from a message and a shared secret key; used to prove a webhook or request really came from the sender. |
| **IdP** | Identity provider: the service that logs users in and vouches for them to other apps (Okta, Entra ID, Google). |
| **JWT** | JSON Web Token: a signed, base64url-encoded set of claims (who, expiry, audience) that a server can verify without a database lookup. Readable by anyone, so it holds no secrets. |
| **KMS** | Key management service: holds master keys in hardware and performs encryption operations with access control and audit. |
| **MFA** | Multi-factor authentication: something you know plus something you have (an app code, a passkey) or are. |
| **mTLS** | Mutual TLS: both sides present certificates, so services authenticate each other, not just the server. |
| **OAuth** | OAuth 2.0: a standard for letting an app act on a user's behalf at another service, via access tokens, without ever seeing the user's password. |
| **OIDC** | OpenID Connect: a login layer on top of OAuth 2.0 that adds an ID token (a JWT) saying who the user is. |
| **PKCE** | Proof Key for Code Exchange: the app sends a hash of a random secret at the start of the OAuth flow and the secret itself when exchanging the code, so a stolen code is useless. |
| **RBAC** | Role-based access control: permissions are grouped into roles assigned to users. |
| **ReBAC** | Relationship-based access control: permissions follow a graph of relationships (Google Zanzibar). |
| **Refresh token** | A long-lived credential used only to get new access tokens; stored carefully and revocable. |
| **Salt** | A random value stored with each password hash so identical passwords hash differently and precomputed tables are useless. |
| **SAML** | An older XML-based single sign-on standard, still common in enterprises. |
| **SSO** | Single sign-on: one login at an identity provider gives access to many apps. |
| **Tokenization** | Replacing a sensitive value (a card number) with a random token, keeping the real value in a separate vault. |

## Operating systems

| Term | Meaning |
|---|---|
| **cgroups** | Linux control groups: limit and account a group of processes' CPU, memory and I/O; the resource half of containers. |
| **Compare-and-swap** | An atomic operation that sets a value only if it still equals the expected old value; the basis of lock-free code and optimistic concurrency. |
| **Context switch** | The OS saving one thread's state and resuming another on a CPU core; costs microseconds plus cold caches. |
| **CPU throttling** | A container being paused for the rest of a scheduling period after using up its CPU quota, causing latency spikes. |
| **Deadlock** | Two or more threads each holding a lock the other needs, so none can continue; prevented by acquiring locks in a fixed order. |
| **epoll** | The Linux interface that tells a program which of its many sockets are ready, at a cost proportional to active ones. kqueue is the BSD/macOS equivalent. |
| **Event loop** | One thread that waits for any of many sockets to become ready and handles each briefly, never blocking. |
| **fsync** | The system call that forces a file's written data from RAM to stable storage; until it returns, a crash can lose the data. |
| **Group commit** | Making many transactions durable with one fsync of the log, multiplying commit throughput. |
| **IOPS** | Input/output operations per second: how many separate reads or writes a storage device can do. |
| **Journaling** | Writing an intended change to a log before applying it, so a crash can be repaired by replaying the log. |
| **Namespaces** | Linux features that give a process its own view of PIDs, network, file system and hostname; the isolation half of containers. |
| **OOM killer** | The Linux mechanism that kills a process when memory (or a container's memory limit) is exhausted. |
| **Page cache** | File data the OS keeps in otherwise unused RAM, so repeated reads skip the disk and writes can be flushed later. |
| **Page fault** | An access to a virtual memory page not currently in RAM; the kernel must load it, roughly 1,000× slower than a normal access. |
| **Thread pool** | A fixed set of worker threads taking tasks from a queue, so concurrency and memory stay bounded. |
| **TLB** | Translation lookaside buffer: a CPU cache of recent virtual-to-physical address translations. |
| **Write amplification** | Storage writing more data internally than the application asked for, as SSDs and LSM-trees do when rewriting data. |

