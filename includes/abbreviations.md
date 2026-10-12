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
*[TCP]: Transmission Control Protocol: a reliable, ordered byte stream between two machines, with a handshake to open it. Used by HTTP/1.1, HTTP/2 and most databases.
*[UDP]: User Datagram Protocol: sends independent packets with no handshake, ordering or retransmission. Used for DNS, video calls, games and QUIC.
*[HTTP/2]: Binary HTTP that multiplexes many requests as streams over one TCP connection, with header compression.
*[HTTP/3]: HTTP over QUIC instead of TCP, so a lost packet only delays its own stream and connections survive network changes.
*[QUIC]: A transport protocol on top of UDP with TLS built in, faster connection setup and independent streams. HTTP/3 runs on it.
*[GraphQL]: An API style with one endpoint where the client sends a query naming exactly the fields it wants.
*[Webhook]: An HTTP callback: when an event happens, the provider POSTs it to a URL you registered, instead of you polling.
*[ISP]: Internet service provider: a company that connects homes, businesses or other networks to the Internet.
*[IXP]: Internet exchange point: a facility where many networks connect directly to exchange traffic.
*[BGP]: Border Gateway Protocol: how autonomous systems tell each other which address blocks they can reach, and choose routes by policy.
*[OSPF]: Open Shortest Path First: a link-state routing protocol used inside one network; every router learns the map and runs Dijkstra.
*[Anycast]: Announcing the same IP prefix from many locations so routing delivers each user to a nearby one. Used by DNS resolvers and CDNs.
*[ECMP]: Equal-cost multi-path: spreading flows across several equally good paths by hashing their addresses and ports.
*[NAT]: Network address translation: a router rewrites private addresses and ports to its public address, so many devices share one IP.
*[DHCP]: Dynamic Host Configuration Protocol: gives a device joining a network its IP address, gateway and DNS server.
*[CIDR]: Classless Inter-Domain Routing: writing address blocks as prefix/length (10.0.0.0/16) so routes can cover blocks of any size.
*[ICMP]: Internet Control Message Protocol: carries network errors and diagnostics; ping and traceroute use it.
*[ARP]: Address Resolution Protocol: finds the MAC address for an IP address on the local network by broadcasting a question.
*[VLAN]: Virtual LAN: tags frames so one physical switch acts as several separate local networks.
*[SDN]: Software-defined networking: a central controller computes forwarding rules and installs them on simple switches.
*[CRC]: Cyclic redundancy check: an error-detecting code added to every Ethernet and Wi-Fi frame.
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
*[JWT]: JSON Web Token: a signed, base64url-encoded set of claims (who, expiry, audience) that a server can verify without a database lookup. Readable by anyone, so it holds no secrets.
*[OAuth]: OAuth 2.0: a standard for letting an app act on a user's behalf at another service, via access tokens, without ever seeing the user's password.
*[OIDC]: OpenID Connect: a login layer on top of OAuth 2.0 that adds an ID token (a JWT) saying who the user is.
*[PKCE]: Proof Key for Code Exchange: the app sends a hash of a random secret at the start of the OAuth flow and the secret itself when exchanging the code, so a stolen code is useless.
*[SSO]: Single sign-on: one login at an identity provider gives access to many apps.
*[SAML]: An older XML-based single sign-on standard, still common in enterprises.
*[IdP]: Identity provider: the service that logs users in and vouches for them to other apps (Okta, Entra ID, Google).
*[Argon2id]: The recommended slow, memory-hard password hashing function. bcrypt and scrypt are acceptable alternatives.
*[bcrypt]: A long-established slow password hashing function with a tunable cost factor.
*[HMAC]: A signature made from a message and a shared secret key; used to prove a webhook or request really came from the sender.
*[MFA]: Multi-factor authentication: something you know plus something you have (an app code, a passkey) or are.
*[mTLS]: Mutual TLS: both sides present certificates, so services authenticate each other, not just the server.
*[CSRF]: Cross-site request forgery: another site makes the user's browser send a request with their cookies. Stopped with SameSite cookies or tokens.
*[epoll]: The Linux interface that tells a program which of its many sockets are ready, at a cost proportional to active ones. kqueue is the BSD/macOS equivalent.
*[TLB]: Translation lookaside buffer: a CPU cache of recent virtual-to-physical address translations.
*[fsync]: The system call that forces a file's written data from RAM to stable storage; until it returns, a crash can lose the data.
*[IOPS]: Input/output operations per second: how many separate reads or writes a storage device can do.
*[cgroups]: Linux control groups: limit and account a group of processes' CPU, memory and I/O; the resource half of containers.
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
*[circuit breaker]: Stops calling a failing dependency for a while and fails fast instead, then lets a few trial calls through to test recovery.
*[exponential backoff]: Waiting longer after each failed attempt (100 ms, 200, 400…) so a struggling service can recover.
*[jitter]: Randomness added to retry delays so many clients don't retry at the same instant.
*[load shedding]: Rejecting some requests early (usually the least important) when a service is overloaded, so the rest stay fast.
*[token bucket]: A rate-limiting algorithm: tokens refill at a steady rate, each request spends one, and bursts up to the bucket size are allowed.
*[feature flag]: A runtime switch that turns a feature on or off for some users without redeploying.
*[thundering herd]: Many clients hitting a service at the same moment, for example all retrying together or all missing an expired cache key.
*[poison message]: A message that fails every time it is processed; it should be moved to a dead-letter queue.
*[partition key]: The field used to choose a partition (for example user ID); order is guaranteed only within one partition.
*[retry budget]: A cap on how much extra load retries may add (for example 10%), so retries can't multiply an outage.
*[bulkhead]: Separate pools of threads or connections per dependency, so one slow dependency can't exhaust everything.
*[congestion control]: How TCP slows down when the network is overloaded: it shrinks its sending window on loss and grows it slowly otherwise.
*[slow start]: TCP's start-up phase: the sending window doubles every round trip until loss or a threshold.
*[autonomous system]: A network run by one organisation (an ISP, a cloud) with its own routing policy and AS number; the Internet is tens of thousands of them.
*[MAC address]: A 48-bit hardware address that identifies a network card on the local link; frames are delivered by it.
*[context switch]: The OS saving one thread's state and resuming another on a CPU core; costs microseconds plus cold caches.
*[page cache]: File data the OS keeps in otherwise unused RAM, so repeated reads skip the disk and writes can be flushed later.
*[page fault]: An access to a virtual memory page not currently in RAM; the kernel must load it, roughly 1,000× slower than a normal access.
*[event loop]: One thread that waits for any of many sockets to become ready and handles each briefly, never blocking.
*[thread pool]: A fixed set of worker threads taking tasks from a queue, so concurrency and memory stay bounded.
*[group commit]: Making many transactions durable with one fsync of the log, multiplying commit throughput.
*[write amplification]: Storage writing more data internally than the application asked for, as SSDs and LSM-trees do when rewriting data.
*[compare-and-swap]: An atomic operation that sets a value only if it still equals the expected old value; the basis of lock-free code and optimistic concurrency.
*[OOM killer]: The Linux mechanism that kills a process when memory (or a container's memory limit) is exhausted.
*[CPU throttling]: A container being paused for the rest of a scheduling period after using up its CPU quota, causing latency spikes.
