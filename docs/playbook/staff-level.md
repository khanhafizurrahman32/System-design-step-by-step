---
title: "Staff-level answers"
description: "What changes between a senior and a staff system design answer, with the staff lens applied to all 29 problems."
---

# Staff-level answers

<span class="lvl lvl-a">Advanced</span>

A senior answer produces a working design. A staff answer also says **which number decided it**, **what trade-off it accepts**, **what will break before anyone asks**, and **how it will be run and changed**. Interviewers for staff roles grade those four things more than the boxes on the whiteboard.

> [!TIP]
> **See all 29 at once:** the [interactive staff atlas](../slides/staff-atlas.html) has cards, a compact view and a full table, with filters. For printing, use the [staff cheat sheet](../sketchnotes/staff-cheat-sheet.svg) and the [29-problem staff table](../sketchnotes/staff-29-problems.svg).

## The staff lens

| Move | What it means | Sounds like |
|---|---|---|
| **Frame** | Name the one tension the problem is really about. | "This is really a fan-out problem: the cost moves between write time and read time." |
| **Quantify** | Find the number that forces the design and say it out loud. | "115k feed reads a second, so computing feeds on read is off the table." |
| **Decide** | Pick one option and state the trade-off you accept. | "Hybrid fan-out; I accept a merge step at read and feeds up to a minute stale." |
| **Anticipate** | Raise failure modes before the interviewer does. | "The risk is a celebrity post creating a fan-out backlog, so…" |
| **Operate** | SLOs, the metrics you would watch, how you would roll it out. | "I'd alert on fan-out lag and roll out the threshold change behind a flag." |
| **Evolve** | What changes at 10× and when you would make that change. | "At 10× I'd split ranking into its own service; not before." |

## Senior vs staff, in general

| Area | Senior answer | Staff answer |
|---|---|---|
| **Scope** | Designs what was asked. | Clarifies the business goal, cuts scope deliberately, says what is out and why. |
| **Numbers** | Estimates QPS and storage. | Uses one decisive number to rule options in or out. |
| **Trade-offs** | Lists pros and cons. | Chooses, states what is given up, and when the choice would change. |
| **Failure** | Handles failures when asked. | Raises failure modes, retries, idempotency and recovery unprompted. |
| **Consistency** | Picks a database. | Chooses consistency per feature (CP checkout, AP browse) and explains the cost. |
| **Operations** | Mentions monitoring. | Names SLOs, the metrics and alerts, rollout and rollback, on-call load. |
| **Cost** | Rarely mentioned. | Estimates the expensive part (GPUs, storage, egress) and designs around it. |
| **Evolution** | Designs for the stated scale. | Says what breaks at 10×, and keeps today's design simple on purpose. |
| **Conversation** | Follows the interviewer. | Drives the agenda, checks in, and lets the interviewer steer the deep dives. |

## All 29 problems at a glance

| Problem | Deciding number | Staff call and trade-off |
|---|---|---|
| [URL shortener (Bitly)](../problems/url-shortener.md) | ~100k redirects/s peak vs ~12 writes/s; 1B links × 500 B ≈ 500 GB, one Postgres. | Cache-aside Redis plus replicas; counter + base62 with servers leasing ID ranges. Accept guessable codes, or add a reversible shuffle. |
| [Rate limiter](../problems/rate-limiter.md) | 1M checks/s ≈ 10–20 Redis shards; ~1 GB of bucket state. | Token bucket in a Redis Lua script. Accept approximate limits for very hot tenants (local allowances synced periodically). |
| [Business discovery (Yelp)](../problems/business-discovery.md) | 10M businesses × 1 KB ≈ 10 GB; ~20k searches/s at peak. | One Postgres + PostGIS + replicas + page cache. Accept simpler ranking for far less to operate; add Elasticsearch only when relevance needs it. |
| [News feed (Facebook)](../problems/news-feed.md) | 115k feed reads/s; ~1.2M feed inserts/s with fan-out on write; celebrities with 100M followers. | Hybrid: push to followers below a threshold (~100k), pull celebrity posts at read. Accept a merge step at read and feeds up to a minute stale. |
| [News aggregator (Google News)](../problems/news-aggregator.md) | ~12k reads/s, 50k+/s on breaking news; ~1 new article/s. | Precompute per region and category, cache at the CDN for ~60 s. Accept a minute of staleness. |
| [Local delivery (Gopuff)](../problems/local-delivery.md) | ~10k browse/s at peak vs ~12 orders/s; the 10k-row warehouse list fits in memory. | Browse is AP (cache + replicas); checkout is CP (conditional decrements in one transaction). Accept occasional "sold out at checkout". |
| [Dating app (Tinder)](../problems/dating-app.md) | ~100k swipes/s at peak; precomputed stacks ≈ 32 GB. | Precomputed stacks + Bloom filter of swiped profiles; one atomic operation per pair of users for matches. Accept rare skipped profiles from Bloom false positives. |
| [Distributed cache](../problems/distributed-cache.md) | 1 TB ÷ ~32 GB per node ≈ 32+ nodes; each node ≫ 100k ops/s, so memory sets the count. | Consistent hashing with virtual nodes, async replica per primary. Accept losing a few writes on failover. |
| [Top-K videos (YouTube)](../problems/top-k-videos.md) | 70B views/day ≈ 800k/s; 4B videos × 8 B ≈ 32 GB of counters. | Kafka partitioned by video; in-memory counts and local heaps; merge. Accept ~1 min freshness, with a batch recount for exact totals. |
| [Ad click aggregator](../problems/ad-click-aggregator.md) | 10k clicks/s at peak, 100M/day, ~10 GB/day raw. | Kafka → Flink (dedupe by signed impression ID) → OLAP store, plus a nightly batch recount. Accept running two paths to get money right. |
| [Web crawler](../problems/web-crawler.md) | ~23k pages/s; ~46 GB/s of bandwidth; ~20 PB raw. | Separate fetch and parse stages with queues and raw pages in S3. Accept storage cost to make each stage independently retryable. |
| [Metrics monitoring (Datadog)](../problems/metrics-monitoring.md) | 5M points/s; ~600 GB/day compressed. | Kafka → time-series DB with compression and downsampling; alerts evaluated on the stream. Accept lower resolution for old data. |
| [Fitness tracking (Strava)](../problems/fitness-tracking.md) | 10M activities/day; ~1 TB/day of tracks. | Record on device; idempotent, resumable upload; process asynchronously. Accept no live server view by default. |
| [Post search (Facebook)](../problems/post-search.md) | ~12k posts/s and ~10× that in likes. | Inverted index built from the stream, sharded by term; like-based ranking updated in batches or at thresholds. Accept slightly stale like ranking. |
| [Price tracker (CamelCamelCamel)](../problems/price-tracker.md) | 500M products; ~6k pages/s to crawl each one daily. | Crawl by priority (trackers, volatility) + validated crowd-sourced prices + event-driven alerts. Accept staler prices on the long tail. |
| [Ride sharing (Uber)](../problems/ride-sharing.md) | 250k location writes/s; ~100 ride requests/s on average. | Redis GEO for locations; offer to one driver at a time with a driver lock and conditional assignment; durable per-region queue. Accept slightly slower matching. |
| [Live comments (Facebook Live)](../problems/live-comments.md) | 1M viewers × 1k comments/s ≈ 1B deliveries/s for one stream. | SSE + pub/sub per video, viewers of a video routed to the same servers; sample comments on mega-streams. Accept that not every viewer sees every comment. |
| [Collaborative editor (Google Docs)](../problems/collaborative-editor.md) | ~500 ops/s on a hot document; correctness, not scale. | One owner server per document running OT, with an op log and snapshots. Accept a short pause when the owner fails over. |
| [Stock trading (Robinhood)](../problems/stock-trading.md) | Thousands of updates/s across ~10k symbols; 20M users, so push not poll. | Persist the order as pending before calling the exchange, reconcile on timeout; throttle prices per symbol. Accept coarser price updates in the app. |
| [Online auction](../problems/online-auction.md) | ~1k bids/s on one auction in its final seconds. | Conditional update on the auction row; a Kafka partition per auction for the hottest ones. Accept serialized throughput per auction. |
| [LLM chat (ChatGPT)](../problems/llm-chat.md) | ~12k generations/s, each holding a GPU for seconds. | Priority queue with admission control in front of the GPU pool, streamed tokens. Accept 429s or waiting for the free tier. |
| [Chat app (WhatsApp)](../problems/chat-app.md) | ~600k messages/s; hundreds of millions of open connections. | WebSockets + user→server registry + per-user pub/sub; persist before ack; an inbox per device. Accept at-least-once delivery with client dedupe. |
| [Ticketmaster](../problems/ticketmaster.md) | ~100k seats vs 10M users: bookings are capped, reads are not. | Conditional-update holds; virtual waiting room; browse is AP, booking is CP. Accept fans waiting in a queue. |
| [Payment system (Stripe)](../problems/payment-system.md) | ~10k TPS: moderate. Correctness is the problem. | Pending record first, idempotency keys, outbox, double-entry ledger, daily reconciliation. Accept extra writes for auditability. |
| [Online judge (LeetCode)](../problems/online-judge.md) | ~100 submissions/s at peak; ~500 sandboxes running at once. | Queue + microVM sandboxes + autoscaling workers. Accept a few seconds of latency. |
| [Job scheduler](../problems/job-scheduler.md) | 864M executions/day. | Time-bucketed store + poller + delay queue + leases. Accept at-least-once execution, so jobs must be idempotent. |
| [Video platform (YouTube)](../problems/video-platform.md) | ~1 PB/day raw uploads. | Presigned multipart uploads, a segment-parallel transcoding DAG, CDN delivery. Accept encoding long-tail formats lazily. |
| [File storage and sync (Dropbox)](../problems/file-sync.md) | A 50 GB file is ~10k chunks; a 1-byte edit changes one chunk. | Content-defined chunking with dedupe, a change log with cursors. Accept "conflicted copy" files for offline edits. |
| [Photo sharing (Instagram)](../problems/photo-sharing.md) | ~115k feed reads/s; ~200 TB/day of media. | Presigned uploads, async processing, CDN; hybrid fan-out. Accept a post appearing only after processing. |

## Scaling reads

### [URL shortener (Bitly)](../problems/url-shortener.md)

*Serve redirects fast at 100:1 read-heavy, and make codes unique without coordination.*

- **Deciding number:** ~100k redirects/s peak vs ~12 writes/s; 1B links × 500 B ≈ 500 GB, one Postgres.
- **Staff call:** Cache-aside Redis plus replicas; counter + base62 with servers leasing ID ranges. Accept guessable codes, or add a reversible shuffle.
- **Raise before you're asked:** A viral link expiring from cache (stampede); losing the counter node (leased ranges make gaps harmless); phishing links.
- **Senior stops at:** Cache in front of the DB. **Staff goes on to:** Treats 301 vs 302 as a product decision (analytics vs load), adds abuse scanning, serves redirects from the edge for global latency.
- **Run it:** SLO: p99 redirect < 100 ms. Watch hit ratio and DB miss QPS. Next step at 10×: edge key-value store at the CDN.

### [Rate limiter](../problems/rate-limiter.md)

*Count requests atomically across many gateways while adding under 10 ms.*

- **Deciding number:** 1M checks/s ≈ 10–20 Redis shards; ~1 GB of bucket state.
- **Staff call:** Token bucket in a Redis Lua script. Accept approximate limits for very hot tenants (local allowances synced periodically).
- **Raise before you're asked:** Redis outage: fail-open or fail-closed, decided per endpoint; clock skew in refill (use Redis time); one tenant overloading a shard.
- **Senior stops at:** Algorithm + Redis. **Staff goes on to:** Plan tiers, global vs regional limits, rules as versioned config with shadow mode, and protecting the limiter itself.
- **Run it:** Watch rejection rate per rule, limiter p99, Redis CPU. Roll out new rules in shadow (log-only) first.

### [Business discovery (Yelp)](../problems/business-discovery.md)

*2-D "near me" search and correct ratings, without over-engineering.*

- **Deciding number:** 10M businesses × 1 KB ≈ 10 GB; ~20k searches/s at peak.
- **Staff call:** One Postgres + PostGIS + replicas + page cache. Accept simpler ranking for far less to operate; add Elasticsearch only when relevance needs it.
- **Raise before you're asked:** Replica lag hiding a new review; hot cities skewing load; review spam.
- **Senior stops at:** Adds a geo index. **Staff goes on to:** Uses the 10 GB number to argue against a search cluster, and defines the trigger and CDC migration path for adding one later.
- **Run it:** Watch search p99, replica lag, cache hit. Trigger for Elasticsearch: fuzzy relevance or QPS beyond replicas.

### [News feed (Facebook)](../problems/news-feed.md)

*Fan-out cost at write time vs latency at read time.*

- **Deciding number:** 115k feed reads/s; ~1.2M feed inserts/s with fan-out on write; celebrities with 100M followers.
- **Staff call:** Hybrid: push to followers below a threshold (~100k), pull celebrity posts at read. Accept a merge step at read and feeds up to a minute stale.
- **Raise before you're asked:** Fan-out backlog after a celebrity post; Redis memory (only active users, capped lists); deletes and unfollows propagating.
- **Senior stops at:** Fan-out on write. **Staff goes on to:** Picks the threshold from numbers, rebuilds feeds for inactive users on demand, separates ranking into its own service, counts memory cost.
- **Run it:** Watch feed p99, fan-out lag, worker queue depth, Redis memory. Next: candidate generation + ranking model.

### [News aggregator (Google News)](../problems/news-aggregator.md)

*The feed is the same for everyone in a region, so the edge can serve it.*

- **Deciding number:** ~12k reads/s, 50k+/s on breaking news; ~1 new article/s.
- **Staff call:** Precompute per region and category, cache at the CDN for ~60 s. Accept a minute of staleness.
- **Raise before you're asked:** Many CDN entries expiring at once (serve stale, stagger TTLs); publisher outages; duplicate stories.
- **Senior stops at:** Adds a cache. **Staff goes on to:** Spots that the response is not personalised, calculates origin load after the CDN, sets an adaptive crawl budget.
- **Run it:** Watch CDN hit ratio, origin QPS, ingest-to-visible lag.

### [Local delivery (Gopuff)](../problems/local-delivery.md)

*Huge browse traffic on availability; strict stock at checkout.*

- **Deciding number:** ~10k browse/s at peak vs ~12 orders/s; the 10k-row warehouse list fits in memory.
- **Staff call:** Browse is AP (cache + replicas); checkout is CP (conditional decrements in one transaction). Accept occasional "sold out at checkout".
- **Raise before you're asked:** Flash-sale hot rows; cache showing stock that is gone; travel-time API outage (fall back to distance).
- **Senior stops at:** A transaction on order. **Staff goes on to:** States consistency per path, partitions stock by region so no transaction crosses shards, plans for the third-party API failing.
- **Run it:** Watch checkout failures due to stock, availability p99, external API spend.

### [Dating app (Tinder)](../problems/dating-app.md)

*Write-heavy swipes, and a mutual match must never be missed.*

- **Deciding number:** ~100k swipes/s at peak; precomputed stacks ≈ 32 GB.
- **Staff call:** Precomputed stacks + Bloom filter of swiped profiles; one atomic operation per pair of users for matches. Accept rare skipped profiles from Bloom false positives.
- **Raise before you're asked:** Two right-swipes at the same instant (write skew); stacks stale after the user moves; bots.
- **Senior stops at:** Stores swipes. **Staff goes on to:** Names the race precisely, uses a pair-keyed atomic op, sizes precomputation, weighs recommendation quality against cost.
- **Run it:** Watch match detection latency, stack freshness, swipe write lag.

### [Distributed cache](../problems/distributed-cache.md)

*Build the cache itself: eviction, distribution, failover.*

- **Deciding number:** 1 TB ÷ ~32 GB per node ≈ 32+ nodes; each node ≫ 100k ops/s, so memory sets the count.
- **Staff call:** Consistent hashing with virtual nodes, async replica per primary. Accept losing a few writes on failover.
- **Raise before you're asked:** Hot key overloading one node; scale-out causing cold misses and a DB stampede; split brain on promotion.
- **Senior stops at:** LRU + consistent hashing. **Staff goes on to:** Membership via a config service, gradual warm-up on scale-out, client routing vs proxy trade-off.
- **Run it:** Watch hit ratio, evictions, per-node p99 and memory, rebalance traffic.

## Scaling writes

### [Top-K videos (YouTube)](../problems/top-k-videos.md)

*Count ~800k events/s and rank across hour, day, month and all time.*

- **Deciding number:** 70B views/day ≈ 800k/s; 4B videos × 8 B ≈ 32 GB of counters.
- **Staff call:** Kafka partitioned by video; in-memory counts and local heaps; merge. Accept ~1 min freshness, with a batch recount for exact totals.
- **Raise before you're asked:** One viral video skewing a partition (pre-aggregate at producers); counts lost on restart (checkpoint); late events.
- **Senior stops at:** Streaming counts. **Staff goes on to:** Proves the merge is exact, chooses exact vs Count-Min per window, adds a reconciliation path.
- **Run it:** Watch consumer lag, window freshness, stream vs batch difference.

### [Ad click aggregator](../problems/ad-click-aggregator.md)

*Counts that are fast for dashboards and exact for billing.*

- **Deciding number:** 10k clicks/s at peak, 100M/day, ~10 GB/day raw.
- **Staff call:** Kafka → Flink (dedupe by signed impression ID) → OLAP store, plus a nightly batch recount. Accept running two paths to get money right.
- **Raise before you're asked:** Click fraud; double counting on replay (idempotent upserts); events arriving after the window closed.
- **Senior stops at:** Stream aggregation. **Staff goes on to:** Adds batch reconciliation because it is money, signed impression IDs, and an audit trail for advertiser disputes.
- **Run it:** Watch stream vs batch difference, consumer lag, dedupe rate.

### [Web crawler](../problems/web-crawler.md)

*A politeness-limited pipeline that must finish 10B pages in 5 days.*

- **Deciding number:** ~23k pages/s; ~46 GB/s of bandwidth; ~20 PB raw.
- **Staff call:** Separate fetch and parse stages with queues and raw pages in S3. Accept storage cost to make each stage independently retryable.
- **Raise before you're asked:** Crawler traps; breaking per-domain rate limits; DNS as a bottleneck; duplicate content.
- **Senior stops at:** Queue + workers. **Staff goes on to:** Sizes the fleet by bandwidth not CPU, prices the storage, prioritises the frontier, treats robots.txt as a hard rule.
- **Run it:** Watch pages/s, per-domain errors, frontier size, dedupe ratio.

### [Metrics monitoring (Datadog)](../problems/metrics-monitoring.md)

*A write firehose plus alerts within a minute.*

- **Deciding number:** 5M points/s; ~600 GB/day compressed.
- **Staff call:** Kafka → time-series DB with compression and downsampling; alerts evaluated on the stream. Accept lower resolution for old data.
- **Raise before you're asked:** Cardinality explosion from user-ID tags; who monitors the monitoring; alert storms.
- **Senior stops at:** A TSDB. **Staff goes on to:** Cardinality limits as policy, alert path separate from query path, retention tiers priced out.
- **Run it:** Watch ingest lag, dropped points, alert evaluation latency, active series count.

### [Fitness tracking (Strava)](../problems/fitness-tracking.md)

*Do the work on the phone; make uploads reliable.*

- **Deciding number:** 10M activities/day; ~1 TB/day of tracks.
- **Staff call:** Record on device; idempotent, resumable upload; process asynchronously. Accept no live server view by default.
- **Raise before you're asked:** Duplicate uploads; device clock and timezone errors; leaking home locations (privacy zones).
- **Senior stops at:** Upload then process. **Staff goes on to:** Rejects streaming every GPS point with numbers, adds privacy zones, considers leaderboard cheating.
- **Run it:** Watch upload success, processing lag, leaderboard freshness.

### [Post search (Facebook)](../problems/post-search.md)

*Index a firehose whose ranking signals change constantly.*

- **Deciding number:** ~12k posts/s and ~10× that in likes.
- **Staff call:** Inverted index built from the stream, sharded by term; like-based ranking updated in batches or at thresholds. Accept slightly stale like ranking.
- **Raise before you're asked:** Hot terms overloading one shard; privacy (who may see a post) enforced at query time; reindexing.
- **Senior stops at:** "use Elasticsearch". **Staff goes on to:** Explains the inverted index, term vs document partitioning, and privacy-aware retrieval.
- **Run it:** Watch index lag, query p99, shard skew.

### [Price tracker (CamelCamelCamel)](../problems/price-tracker.md)

*Too many products to crawl often, so spend the crawl budget where it matters.*

- **Deciding number:** 500M products; ~6k pages/s to crawl each one daily.
- **Staff call:** Crawl by priority (trackers, volatility) + validated crowd-sourced prices + event-driven alerts. Accept staler prices on the long tail.
- **Raise before you're asked:** Being blocked by the site; poisoned extension data; alert spam.
- **Senior stops at:** A cron crawl and a scan of subscriptions. **Staff goes on to:** Prioritises by value, validates crowd data, reacts to price events instead of scanning.
- **Run it:** Watch freshness of tracked products, alert latency, crawl budget used.

## Real-time updates

### [Ride sharing (Uber)](../problems/ride-sharing.md)

*A flood of location updates and exclusive driver assignment.*

- **Deciding number:** 250k location writes/s; ~100 ride requests/s on average.
- **Staff call:** Redis GEO for locations; offer to one driver at a time with a driver lock and conditional assignment; durable per-region queue. Accept slightly slower matching.
- **Raise before you're asked:** A driver assigned twice; matcher crashing mid-match; city hot spots and surge.
- **Senior stops at:** Geo index + matching. **Staff goes on to:** Cells per city to isolate failures, surge as a feedback loop, regional failover.
- **Run it:** Watch time-to-match p95, offer acceptance, location update lag.

### [Live comments (Facebook Live)](../problems/live-comments.md)

*Fan-out to a million viewers in under 200 ms.*

- **Deciding number:** 1M viewers × 1k comments/s ≈ 1B deliveries/s for one stream.
- **Staff call:** SSE + pub/sub per video, viewers of a video routed to the same servers; sample comments on mega-streams. Accept that not every viewer sees every comment.
- **Raise before you're asked:** Reconnection storms after a deploy; slow consumers; moderation.
- **Senior stops at:** WebSocket + pub/sub. **Staff goes on to:** Points out nobody can read 1k comments/s and samples, plans for reconnect storms, sizes connections per server.
- **Run it:** Watch delivery p99, connections per server, dropped messages.

### [Collaborative editor (Google Docs)](../problems/collaborative-editor.md)

*Every client must converge to the same document.*

- **Deciding number:** ~500 ops/s on a hot document; correctness, not scale.
- **Staff call:** One owner server per document running OT, with an op log and snapshots. Accept a short pause when the owner fails over.
- **Raise before you're asked:** Owner failover; merging offline edits; very large documents.
- **Senior stops at:** Names OT or CRDT. **Staff goes on to:** Chooses between them from requirements (offline, server cost), assigns ownership via a coordination service, plans version history.
- **Run it:** Watch op latency, convergence errors, snapshot size.

### [Stock trading (Robinhood)](../problems/stock-trading.md)

*Push prices to millions, and never lose or duplicate an order.*

- **Deciding number:** Thousands of updates/s across ~10k symbols; 20M users, so push not poll.
- **Staff call:** Persist the order as pending before calling the exchange, reconcile on timeout; throttle prices per symbol. Accept coarser price updates in the app.
- **Raise before you're asked:** Unknown outcome on exchange timeout; duplicate orders; market-open spike.
- **Senior stops at:** Separate price and order paths. **Staff goes on to:** An order state machine, reconciliation against exchange reports, audit requirements, graceful degradation at open.
- **Run it:** Watch order ack latency, reconciliation breaks, price fan-out lag.

### [Online auction](../problems/online-auction.md)

*One hot row, and bids must be strictly ordered.*

- **Deciding number:** ~1k bids/s on one auction in its final seconds.
- **Staff call:** Conditional update on the auction row; a Kafka partition per auction for the hottest ones. Accept serialized throughput per auction.
- **Raise before you're asked:** Deadline fairness (use server time); sniping; durability of an accepted bid.
- **Senior stops at:** A lock. **Staff goes on to:** Anti-sniping as a product decision, serializing through a log for extreme auctions, an audit trail.
- **Run it:** Watch bid acceptance latency, rejected-bid rate, partition lag.

### [LLM chat (ChatGPT)](../problems/llm-chat.md)

*GPUs are scarce; every queueing choice is a cost choice.*

- **Deciding number:** ~12k generations/s, each holding a GPU for seconds.
- **Staff call:** Priority queue with admission control in front of the GPU pool, streamed tokens. Accept 429s or waiting for the free tier.
- **Raise before you're asked:** Client disconnecting mid-stream; GPU pool failures; runaway cost.
- **Senior stops at:** Streaming. **Staff goes on to:** Capacity planned in GPU-seconds, fairness and priority policy, batching for throughput, cost per request.
- **Run it:** Watch time-to-first-token, queue wait, GPU utilisation, cost per 1k tokens.

### [Chat app (WhatsApp)](../problems/chat-app.md)

*Route between servers, deliver to offline devices, keep order.*

- **Deciding number:** ~600k messages/s; hundreds of millions of open connections.
- **Staff call:** WebSockets + user→server registry + per-user pub/sub; persist before ack; an inbox per device. Accept at-least-once delivery with client dedupe.
- **Raise before you're asked:** Server crash holding connections; order within a chat; multi-device sync; what end-to-end encryption rules out.
- **Senior stops at:** WebSockets + a database. **Staff goes on to:** Delivery semantics, draining connections during deploys, the limits end-to-end encryption puts on server features.
- **Run it:** Watch delivery latency, undelivered inbox size, reconnect rate.

## Contention

### [Ticketmaster](../problems/ticketmaster.md)

*No seat sold twice while 10M people arrive at once.*

- **Deciding number:** ~100k seats vs 10M users: bookings are capped, reads are not.
- **Staff call:** Conditional-update holds; virtual waiting room; browse is AP, booking is CP. Accept fans waiting in a queue.
- **Raise before you're asked:** Payment timing out while the hold expires; bots; the read storm hitting the booking database.
- **Senior stops at:** Row locking. **Staff goes on to:** The waiting room as load control, bot mitigation and fairness, shielding the booking path.
- **Run it:** Watch hold success rate, queue length, admit rate, booking p99.

## Multi-step / long tasks

### [Payment system (Stripe)](../problems/payment-system.md)

*Stay correct when a call to the bank has an unknown outcome.*

- **Deciding number:** ~10k TPS: moderate. Correctness is the problem.
- **Staff call:** Pending record first, idempotency keys, outbox, double-entry ledger, daily reconciliation. Accept extra writes for auditability.
- **Raise before you're asked:** Processor timeouts; duplicate webhooks; partial refunds; PCI scope creep.
- **Senior stops at:** Idempotency keys. **Staff goes on to:** Ledger design, reconciliation, isolating card data to shrink compliance scope.
- **Run it:** Watch reconciliation breaks, age of pending payments, webhook delivery success.

### [Online judge (LeetCode)](../problems/online-judge.md)

*Run untrusted code safely, through contest spikes.*

- **Deciding number:** ~100 submissions/s at peak; ~500 sandboxes running at once.
- **Staff call:** Queue + microVM sandboxes + autoscaling workers. Accept a few seconds of latency.
- **Raise before you're asked:** Sandbox escape; noisy neighbours; contest start spike (pre-warm capacity).
- **Senior stops at:** Queue + containers. **Staff goes on to:** Defence in depth for isolation, pre-warming before contests, fairness between users.
- **Run it:** Watch queue wait, sandbox start time, verdict latency.

### [Job scheduler](../problems/job-scheduler.md)

*10k jobs/s, each within 2 s of its time, never lost.*

- **Deciding number:** 864M executions/day.
- **Staff call:** Time-bucketed store + poller + delay queue + leases. Accept at-least-once execution, so jobs must be idempotent.
- **Raise before you're asked:** Poller leader failing; clock drift; duplicate execution; every cron job firing at :00.
- **Senior stops at:** A jobs table and a queue. **Staff goes on to:** Reasons through the two-tier design, leader election with fencing, isolation between tenants.
- **Run it:** Watch schedule-to-start lag p99, missed jobs, retries.

## Large blobs

### [Video platform (YouTube)](../problems/video-platform.md)

*Reliable huge uploads and smooth playback anywhere.*

- **Deciding number:** ~1 PB/day raw uploads.
- **Staff call:** Presigned multipart uploads, a segment-parallel transcoding DAG, CDN delivery. Accept encoding long-tail formats lazily.
- **Raise before you're asked:** Transcode failures and retries; storage cost; popularity spikes.
- **Senior stops at:** S3 + CDN. **Staff goes on to:** A cost model (storage tiers, lazy encoding), DAG retries, CDN strategy.
- **Run it:** Watch upload success, time to playable, CDN hit ratio, rebuffer rate.

### [File storage and sync (Dropbox)](../problems/file-sync.md)

*Sync efficiently and handle conflicting edits.*

- **Deciding number:** A 50 GB file is ~10k chunks; a 1-byte edit changes one chunk.
- **Staff call:** Content-defined chunking with dedupe, a change log with cursors. Accept "conflicted copy" files for offline edits.
- **Raise before you're asked:** Conflicts; partial uploads; cross-user dedupe leaking whether a file exists.
- **Senior stops at:** Chunking. **Staff goes on to:** Conflict UX, the privacy risk of cross-user dedupe, change-log retention.
- **Run it:** Watch sync latency, bytes uploaded per change, conflict rate.

### [Photo sharing (Instagram)](../problems/photo-sharing.md)

*A feed plus a media pipeline.*

- **Deciding number:** ~115k feed reads/s; ~200 TB/day of media.
- **Staff call:** Presigned uploads, async processing, CDN; hybrid fan-out. Accept a post appearing only after processing.
- **Raise before you're asked:** Processing backlog; celebrity fan-out; storage cost.
- **Senior stops at:** Feed + S3. **Staff goes on to:** Storage tiering and cost, processing SLOs, regional reads.
- **Run it:** Watch time to visible, feed p99, CDN hit ratio.

