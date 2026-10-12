---
title: "Scaling reads"
description: "Most systems read far more than they write. Make the common read cheap, and the database only sees what the cache can't answer."
tags: [pattern]
---

# Scaling reads

<span class="lvl lvl-b">Beginner-friendly</span>

*Most systems read far more than they write. Make the common read cheap, and the database only sees what the cache can't answer.*

> [!TIP]
> **One-page sketchnote:** [SCALING READS on a single page](../sketchnotes/pattern-scaling-reads.svg), for revision or printing.

## When to reach for it

- Read:write ratio is 10:1 or higher.
- The same items are read over and over (popularity is skewed).
- A read path misses its latency target, or the calculated read QPS exceeds what one database serves (~10–50k/s).

## The problem

Most products are **read-heavy**. People view a post far more often than anyone writes one, and a typical ratio is 10 to 100 reads per write. Early on, one database answers everything. As traffic grows, that database spends all its time answering the same popular questions again and again, until it hits its limit (roughly 10k+ reads a second for typical queries). Then latency climbs for everyone, writes included, because they share the same machine.

The fix comes in layers, cheapest first. Each layer stops a share of reads from ever reaching the database.

## The idea, step by step

![Pattern 1: Scaling Reads](../diagrams/pattern-scaling-reads.svg)

1. **Start: one database serves every read.** This is fine until the numbers say otherwise. Calculate peak reads per second before adding anything.
2. **Add a cache (cache-aside).** Put Redis or Memcached in front of the database. On each read, the app **checks the cache first**. On a **hit**, it returns the value in under a millisecond, and the database isn't touched. On a **miss**, it reads the database (5–50 ms), stores the result in the cache with an expiry time (**TTL**), and returns it. Popular data is requested most, so it is usually in the cache: hit rates of 80–99% are common, which cuts database reads by 5 to 100 times.
3. **Add read replicas** for the reads that still miss. Replicas are copies of the database that receive every write from the primary and serve reads. Three replicas roughly triple read capacity. The catch is **replication lag**: a replica can be a little behind, so a user who just changed something might not see it yet. Send those reads to the primary (see [DDIA Ch 5](../ddia/05-replication.md)).
4. **Add a CDN** for content that's the same for many users: images, scripts, and even API responses like "today's top stories". CDN servers near the user answer directly, so those requests never reach your servers at all.

> [!WARNING]
> **Three cache problems to name in an interview:**
>
> - **Stampede:** a very popular key expires, and in that instant 10,000 requests all miss and hit the database together. Fixes: let only one request reload the key while the others wait (*single-flight*, or a short lock), and add random jitter to TTLs so keys don't all expire at once.
> - **Invalidation:** when data changes, the cached copy is wrong. Delete the cache key on every write, and keep a TTL as a safety net.
> - **Hot key:** one key gets so much traffic that the single cache server holding it is overwhelmed. Fixes: keep copies of it on several cache servers, or cache it in each app server's memory for a second or two.

More detail on caching strategies in [Caching](../core-concepts/caching.md).

## Decision checklist

1. Is the response the same for many users? Put a CDN in front.
2. Is it per-user but read often? Cache-aside in Redis with a TTL.
3. Still too much load on the primary? Add read replicas and accept replication lag.
4. Is one key extremely hot? Replicate the key or add a short-lived local cache.
5. Which reads must never be stale? Send those to the primary.

## In the interview

> [!TIP]
> "Reads outnumber writes about 100 to 1 and popularity is skewed, so a cache-aside Redis layer should absorb most reads. The rest go to replicas; only checkout reads the primary."

## Common mistakes

- Sharding the database before trying a cache and replicas.
- Caching data that must be exact (stock at checkout, balances).
- Forgetting cache stampedes on hot keys.

## Problems that use it

- [URL shortener (Bitly)](../problems/url-shortener.md): It sounds like a toy, but it is the cleanest example of a read-heavy system: almost every request is a redirect.
- [Rate limiter](../problems/rate-limiter.md): Every public API needs one, and the obvious implementation has a race condition.
- [Business discovery (Yelp)](../problems/business-discovery.md): The trap is over-engineering: the whole dataset fits on one database server.
- [News feed (Facebook)](../problems/news-feed.md): The canonical fan-out problem: build a personalised feed for billions of users in a few hundred milliseconds.
- [News aggregator (Google News)](../problems/news-aggregator.md): A feed problem where the feed is the same for everyone in a region, which changes everything.
- [Local delivery (Gopuff)](../problems/local-delivery.md): It looks like an ordering system, but most of the load is people checking what is available near them.
- [Dating app (Tinder)](../problems/dating-app.md): Swipes are a firehose of writes, and two people swiping right at the same moment must never miss their match.
- [Distributed cache](../problems/distributed-cache.md): Design Redis itself: data structures inside one node, then distribution across many.
- [Post search (Facebook)](../problems/post-search.md): Search over billions of posts, where like counts change constantly.
- [Price tracker (CamelCamelCamel)](../problems/price-tracker.md): Five hundred million products can't all be crawled often, so decide what is worth checking.
- [Ticketmaster](../problems/ticketmaster.md): Millions of people arrive for one on-sale, and no seat may ever be sold twice.
- [Video platform (YouTube)](../problems/video-platform.md): Two hard problems: getting gigabyte uploads in reliably, and streaming smoothly on any connection.
- [Photo sharing (Instagram)](../problems/photo-sharing.md): A news feed plus a media pipeline: two well-known problems combined.

## The theory underneath

- [DDIA Ch 5: Replication](../ddia/05-replication.md)
- [DDIA Ch 6: Partitioning](../ddia/06-partitioning.md)
