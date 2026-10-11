*[QPS]: Queries (requests) per second. The basic unit of load.
*[TPS]: Transactions per second that a database commits.
*[DAU]: Daily active users. Multiply by actions per user and divide by 86,400 to get average requests per second.
*[p50]: Median latency: half of requests are faster than this.
*[p99]: 99th-percentile latency: 1 request in 100 is slower than this. Users feel the tail, so targets are set on p99.
*[NFR]: Non-functional requirement: how well the system must work (latency, availability, consistency, scale), as opposed to what it does.
*[SLI]: Service level indicator: the thing you measure, such as the share of requests faster than 300 ms.
*[SLO]: Service level objective: your internal target for an SLI, such as 99.9% of requests under 300 ms.
*[SLA]: Service level agreement: an external promise with penalties if missed.
*[DNS]: Domain Name System: turns a name like example.com into an IP address.
*[CDN]: Content delivery network: servers near users that cache static files and shared responses so requests never reach your origin.
*[TLS]: The encryption behind HTTPS.
*[REST]: An API style built on HTTP resources and verbs (GET, POST…). The default for public APIs.
*[gRPC]: A fast remote-call framework using HTTP/2 and Protobuf, common between internal services.
*[RPC]: Remote procedure call: calling a function on another machine over the network.
*[SSE]: Server-Sent Events: one long-lived HTTP connection over which the server pushes updates to the client.
*[WebSocket]: A long-lived two-way connection between client and server, for chat, games and collaboration.
*[RTT]: Round-trip time: how long a message takes to go to another machine and back.
*[ACID]: Atomicity, Consistency, Isolation, Durability: the guarantees of a database transaction.
*[B-tree]: The default index structure: a shallow sorted tree of pages. Fast lookups and range scans.
*[LSM-tree]: Log-structured merge tree: writes go to memory and are flushed to sorted files that are merged later. Very fast writes; used by Cassandra and RocksDB.
*[WAL]: Write-ahead log: every change is appended to a log before it is applied, so a crash can be recovered by replaying the log.
*[fsync]: Forcing data from memory to disk so it survives a crash. Each commit waits for it, which limits single-row write rates.
*[MVCC]: Multi-version concurrency control: rows keep several versions so readers see a consistent snapshot without blocking writers.
*[OLTP]: Online transaction processing: many small reads and writes by key, as in an app database.
*[OLAP]: Online analytical processing: large scans and aggregations, as in dashboards and warehouses.
*[GSI]: Global secondary index (DynamoDB): an index partitioned separately from the table; updated asynchronously.
*[CAP]: During a network partition, a system must choose between consistency (refuse) and availability (answer, possibly stale).
*[PACELC]: Extends CAP: even without partitions, stronger consistency costs latency.
*[LWW]: Last write wins: keep the value with the latest timestamp and silently drop the other.
*[CRDT]: Conflict-free replicated data type: data that merges concurrent edits automatically.
*[OT]: Operational transformation: a server orders concurrent edits and adjusts them so all copies converge (Google Docs).
*[2PC]: Two-phase commit: a coordinator asks all participants to prepare, then to commit. Blocks if the coordinator fails.
*[TTL]: Time to live: how long a cached item is kept before it expires.
*[LRU]: Least recently used: evict the item that hasn't been used for the longest time.
*[DLQ]: Dead-letter queue: where messages go after repeatedly failing, so they don't block others.
*[CDC]: Change data capture: streaming every database change (from its log) to other systems.
*[HLS]: HTTP Live Streaming: a format for adaptive-bitrate video delivered as small segments.
*[write skew]: Two transactions each read the same condition, then write different rows; together they break a rule neither broke alone. The double-booking bug.
*[lost update]: Two read-modify-write cycles overlap and one overwrites the other's change.
*[replication lag]: How far a follower is behind the leader. Reads from a lagging follower can return old data.
*[idempotency key]: A unique ID the client sends with a request so the server can recognise and ignore duplicates.
*[fencing token]: An increasing number issued with each lock; storage rejects writes carrying an older number, so a stalled old lock-holder can't corrupt data.
*[cache-aside]: The app reads the cache; on a miss it reads the database and fills the cache.
*[hot key]: One key (a celebrity, a viral item) that gets so much traffic it overloads the single node holding it.
*[consistent hashing]: Placing nodes and keys on a ring so adding or removing a node moves only a small share of keys.
*[fan-out on write]: Precompute each recipient's copy when the item is created, making reads cheap.
*[fan-out on read]: Assemble each recipient's view when they read it, making writes cheap.
*[outbox]: Write the business change and an event row in one transaction; a relay publishes the event, so the two can't disagree.
*[saga]: A multi-step process across services where each step has a compensating action to undo it on failure.
*[quorum]: A majority (or w + r > n) of replicas that must agree, so reads overlap the latest writes.
*[split brain]: Two nodes both believe they are the leader and accept writes.
*[backpressure]: Slowing or rejecting new work when a system is full, instead of falling over.
*[presigned URL]: A temporary URL that lets a client upload or download one object directly to or from object storage.
*[conditional update]: An UPDATE whose WHERE clause includes the condition (e.g. status = AVAILABLE), so the check and the write happen atomically.
*[at-least-once]: Every message is delivered, but some may arrive twice. Pair it with idempotent processing.
*[cursor pagination]: Paging with a pointer to the last item seen instead of an offset, so new items don't shift pages.
*[cache stampede]: A hot key expires and many requests miss at once and overload the database.
*[Bloom filter]: A compact structure that answers "definitely not seen" or "probably seen", using about 10 bits per item.
*[inverted index]: A map from each word to the documents containing it; the basis of full-text search.
*[geohash]: Encoding a location as a string whose shared prefix means nearby, so ordinary indexes can do proximity search.
*[visibility timeout]: How long a taken message stays hidden; if the worker doesn't finish in time, it reappears for a retry.
*[dead-letter queue]: Dead-letter queue: where messages go after repeatedly failing, so they don't block others.
*[consumer group]: Consumers that share a topic's partitions, each partition read by one of them.
*[linearizable]: The system behaves as if there is one copy of the data: once anyone sees a new value, everyone does.
*[eventual consistency]: Replicas may disagree briefly but converge if writes stop.
*[multipart]: Uploading a large file as many parts in parallel, retrying only failed parts.
*[adaptive bitrate]: Video split into short segments at several qualities; the player picks quality per segment from measured bandwidth.
*[tumbling window]: Fixed, non-overlapping time buckets for stream aggregation, such as one per minute.
*[watermark]: A stream processor's estimate that all events up to a time have arrived.
*[error budget]: How much failure the SLO allows (100% minus the SLO). 99.9% per month is about 43 minutes.
*[check-then-act]: Reading a condition and then acting on it as two steps. Two requests can both pass the check; the classic race.
*[tail latency]: The slowest small share of requests (p99, p99.9). It grows when one request fans out to many services.
*[snapshot isolation]: Multi-version concurrency control: rows keep several versions so readers see a consistent snapshot without blocking writers.
*[read replicas]: Keeping copies of the same data on several machines.
*[shard key]: The field used to decide which shard a record lives on.
*[event sourcing]: Storing the sequence of events as the source of truth and deriving current state from it.
