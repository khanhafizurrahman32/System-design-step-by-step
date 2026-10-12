---
title: "News aggregator (Google News)"
description: "A feed problem where the feed is the same for everyone in a region, which changes everything."
tags: [scaling-reads, easy]
---

# News aggregator (Google News)

<span class="lvl lvl-b">Beginner-friendly</span>

**Difficulty:** Easy · **Patterns:** [Scaling reads](../patterns/scaling-reads.md) · **DDIA:** [Ch 1](../ddia/01-reliability-scalability-maintainability.md) load parameters · [Ch 10](../ddia/10-batch-processing.md) ingest pipelines

*A feed problem where the feed is the same for everyone in a region, which changes everything.*

> [!TIP]
> **One-page sketchnote:** [NEWS AGGREGATOR (GOOGLE NEWS) on a single page](../sketchnotes/problem-news-aggregator.svg), for revision or printing.

## TL;DR

- Writes are tiny (new articles); reads spike hard when big news breaks.
- Precompute one list per region and category at ingest time instead of querying on every request.
- Because the feed is not per-user, a CDN can cache it for a minute and absorb almost all traffic.

## 1. Requirements

**Functional**

1. Feed of recent articles from thousands of publishers, by region and category
2. Click through to the publisher; infinite scroll

**Non-functional**

- Feed p99 < 200ms
- 100M DAU with breaking-news spikes
- New articles visible within ~30 min
- Availability over consistency

## 2. Back-of-envelope numbers

100M × 10 = 1B feed reads/day ≈ **12k/s, 50k+/s spikes**. Writes: ~100k articles/day ≈ 1/s.

## 3. Core entities and API

```text
articles(id, canonical_url UNIQUE, title, summary, thumbnail_url, publisher_id, region, category, published_at)
```

```http
GET /feed?region&category&cursor → [{title, summary, thumbnail, url, publisher}]
```

## 4. v1: the simplest design, and where it breaks

![News aggregator (Google News): v1 design](../diagrams/problem-news-aggregator-v1.svg)

A scheduler fetches each publisher's RSS feed or sitemap every few minutes and inserts new articles into Postgres. When a user opens the app, the API runs a query such as `WHERE region = ? AND category = ? ORDER BY published_at DESC LIMIT 20`.

**Where it breaks:** writes are tiny, about 100k articles a day, roughly **1 a second**. Reads are not. There are about **12k feed requests a second normally, and 50k+ when big news breaks**, exactly when everyone opens the app at once. Each request runs the same query against the database, recomputing the same answer thousands of times a second. The database becomes the bottleneck during the very spikes that matter most.

## 5. Evolving to the final design

![News aggregator (Google News): final design](../diagrams/problem-news-aggregator-final.svg)

Each step fixes one specific problem with the step before it.

### Step 1: precompute each feed at ingest time

**Why:** there are only a limited number of distinct feeds, one per (region, category) pair, and they change only when an article arrives, about once a second. Recomputing them on each of 12k+ requests a second wastes almost all that work.

**How:** when a new article is ingested, insert its ID into a Redis sorted set for each feed it belongs to (`feed:US:tech`), ordered by publish time and capped at a few thousand entries. Serving a feed becomes **one list read**, with no query planning, sorting or joins.

### Step 2: let a CDN absorb the spikes

**Why:** even a cheap Redis read is 50k requests a second during breaking news. But here's the key observation: **everyone in the same region and category gets exactly the same response.** The feed isn't personalized.

**How:** set cache headers so a **CDN** caches each feed response for about **60 seconds** per region and category. In each 60-second window, each CDN location asks your servers once and serves everyone else from its cache. A 50k/s spike becomes a **handful of requests a second** at your origin. News that is up to a minute old meets the "visible within 30 minutes" requirement easily.

### Step 3: serve images from your own CDN, and get pushes instead of polling

**Why:** thumbnails hotlinked from publishers' sites are slow, unreliable, and can break. And polling thousands of publishers every few minutes is wasteful when most have nothing new.

**How:** at ingest, copy each thumbnail to **S3** and serve it through the CDN. For publishers that support push (WebSub, webhooks), let them notify you of new articles instead of being polled.

## 6. Deep dives

### Why can a CDN cache the feed?

**Why this matters:** CDNs normally can't cache API responses, because each user gets different data (their own feed, their account).

**How it works here:** this feed is the same for everyone with the same region and category, so the URL (`/feed?region=US&category=tech`) fully determines the response. The CDN can safely give one cached copy to millions of users. The trade-off is up to 60 seconds of staleness. For news that's acceptable: availability and speed matter more than showing an article in the very same second (an **AP** choice). If a major story must appear instantly, **purge** that feed's cache entry.

### Polling cost vs freshness?

**Why it's a trade-off:** polling every publisher every minute is fresh but wasteful (most have nothing new) and can get you rate-limited. Polling hourly misses breaking news.

**How:** use **adaptive polling**. Track how often each publisher actually posts. Busy outlets get polled every few minutes; quiet blogs hourly or daily. Speed up when a publisher is active and back off when it isn't. Use conditional requests (`If-Modified-Since`, ETags) so an unchanged feed costs almost nothing, and use **webhooks or WebSub** where the publisher offers them.

### Duplicate stories?

**Why it happens:** the same article shows up through several feeds or URLs (tracking parameters, mobile versions), and many outlets publish near-identical wire stories.

**How:** first, normalize each URL (strip tracking parameters, follow the canonical link tag) and put a **unique constraint on `canonical_url`**, so exact duplicates are rejected at insert. For near-duplicates, compute a similarity fingerprint (**SimHash** or **MinHash**) of the title and text, and **cluster** articles with close fingerprints into one story with several sources, the way news aggregators show "and 12 more sources".

### Pagination?

**Why offsets break:** new articles constantly arrive at the top. With page numbers, a user scrolling to page 2 sees items they already saw on page 1.

**How:** a **cursor**: return items older than the `(published_at, id)` of the last item the user saw. The `id` breaks ties between articles published in the same second. New arrivals don't shift what comes next.

## 7. Interview script (45 minutes)

| Time | What you do | Content |
|---|---|---|
| 0–5 | Functional requirements | Feed of recent articles from thousands of publishers, by region and category; Click through to the publisher; infinite scroll |
| 5–8 | Non-functional requirements | Feed p99 < 200ms; 100M DAU with breaking-news spikes; New articles visible within ~30 min; Availability over consistency |
| 8–10 | Numbers that drive the design | 100M × 10 = 1B feed reads/day ≈ **12k/s, 50k+/s spikes**. Writes: ~100k articles/day ≈ 1/s. |
| 10–13 | Entities and API | Keep it short: the endpoints in §3, idempotency keys on writes. |
| 13–25 | v1, then evolve it | Draw v1 and show where it breaks. Then add, in order: Redis → CDN → S3 + CDN. Justify each addition with a number. |
| 25–40 | Deep dives | Why can a CDN cache the feed? · Polling cost vs freshness? · Duplicate stories? · Pagination? |
| 40–45 | Wrap-up | Remaining bottlenecks, failure modes, what you would monitor. |


## Staff-level lens

| Question | Staff answer |
|---|---|
| **The real problem** | The feed is the same for everyone in a region, so the edge can serve it. |
| **Deciding number** | ~12k reads/s, 50k+/s on breaking news; ~1 new article/s. |
| **Staff call and trade-off** | Precompute per region and category, cache at the CDN for ~60 s. Accept a minute of staleness. |
| **Raise before you're asked** | Many CDN entries expiring at once (serve stale, stagger TTLs); publisher outages; duplicate stories. |
| **Senior stops at** | Adds a cache. |
| **Staff goes on to** | Spots that the response is not personalised, calculates origin load after the CDN, sets an adaptive crawl budget. |
| **Run it** | Watch CDN hit ratio, origin QPS, ingest-to-visible lag. |

All 29 problems through this lens: [Staff-level answers](../playbook/staff-level.md).

## 8. Common mistakes

- Per-user fan-out like a social feed when the feed is per region and category: build it once per region and let the CDN cache it.
- Adding components before showing which number makes them necessary.
- Skipping failure handling: what happens on timeouts, retries and crashes.

## Self-check

Try to answer before you open each one.

<details class="question" markdown>
<summary>Why can a CDN cache the feed here but not in a social network?</summary>

The feed is the same for everyone in a region and category, not personalised, so one cached copy serves millions of readers.

</details>

<details class="question" markdown>
<summary>Why precompute lists at ingest time?</summary>

Writes (new articles) are rare and reads are huge and spiky, so doing the work once per article is far cheaper than once per request.

</details>

<details class="question" markdown>
<summary>How fresh can the feed be with CDN caching?</summary>

About as fresh as the cache TTL, for example a minute, which is usually acceptable for news; breaking stories can purge the cache.

</details>

## Related

- **Patterns:** [Scaling reads](../patterns/scaling-reads.md)
- **DDIA:** [Ch 1](../ddia/01-reliability-scalability-maintainability.md) load parameters · [Ch 10](../ddia/10-batch-processing.md) ingest pipelines
- **Similar problems:** [URL shortener (Bitly)](url-shortener.md) · [Rate limiter](rate-limiter.md) · [Business discovery (Yelp)](business-discovery.md) · [News feed (Facebook)](news-feed.md)
