---
title: "Problems"
description: "Twenty-nine system design problems, each built from a simple first version to a final design with an interview script."
---

# 29 problems

Every page follows the same template: requirements, numbers, a **v1** design and where it breaks, the final design and why each part exists, deep dives, a minute-by-minute interview script, and common mistakes.

New to this? Start with [URL shortener](url-shortener.md), [Rate limiter](rate-limiter.md) and [Ticketmaster](ticketmaster.md).

## Scaling reads

*Pattern: [Scaling reads](../patterns/scaling-reads.md)*

| Problem | Difficulty | What makes it interesting |
|---|---|---|
| [URL shortener (Bitly)](url-shortener.md) | Easy | It sounds like a toy, but it is the cleanest example of a read-heavy system: almost every request is a redirect. |
| [Rate limiter](rate-limiter.md) | Medium | Every public API needs one, and the obvious implementation has a race condition. |
| [Business discovery (Yelp)](business-discovery.md) | Medium | The trap is over-engineering: the whole dataset fits on one database server. |
| [News feed (Facebook)](news-feed.md) | Medium | The canonical fan-out problem: build a personalised feed for billions of users in a few hundred milliseconds. |
| [News aggregator (Google News)](news-aggregator.md) | Easy | A feed problem where the feed is the same for everyone in a region, which changes everything. |
| [Local delivery (Gopuff)](local-delivery.md) | Easy | It looks like an ordering system, but most of the load is people checking what is available near them. |
| [Dating app (Tinder)](dating-app.md) | Medium | Swipes are a firehose of writes, and two people swiping right at the same moment must never miss their match. |
| [Distributed cache](distributed-cache.md) | Medium | Design Redis itself: data structures inside one node, then distribution across many. |

## Scaling writes

*Pattern: [Scaling writes](../patterns/scaling-writes.md)*

| Problem | Difficulty | What makes it interesting |
|---|---|---|
| [Top-K videos (YouTube)](top-k-videos.md) | Hard | The design falls straight out of one number: hundreds of thousands of views per second. |
| [Ad click aggregator](ad-click-aggregator.md) | Hard | Clicks are money, so the numbers must be fast for dashboards and exact for billing. |
| [Web crawler](web-crawler.md) | Hard | Ten billion pages in five days is a pipeline problem, constrained by politeness and network bandwidth. |
| [Metrics monitoring (Datadog)](metrics-monitoring.md) | Hard | Millions of data points per second arrive, and alerts must fire within a minute. |
| [Fitness tracking (Strava)](fitness-tracking.md) | Medium | The key insight is where the work happens: on the phone, not the server. |
| [Post search (Facebook)](post-search.md) | Medium | Search over billions of posts, where like counts change constantly. |
| [Price tracker (CamelCamelCamel)](price-tracker.md) | Medium | Five hundred million products can't all be crawled often, so decide what is worth checking. |

## Real-time updates

*Pattern: [Real-time updates](../patterns/real-time-updates.md)*

| Problem | Difficulty | What makes it interesting |
|---|---|---|
| [Ride sharing (Uber)](ride-sharing.md) | Hard | Four problems in one: a flood of location updates, matching, locking drivers, and a multi-step trip lifecycle. |
| [Live comments (Facebook Live)](live-comments.md) | Medium | One popular stream can mean a million viewers each expecting new comments within a fraction of a second. |
| [Collaborative editor (Google Docs)](collaborative-editor.md) | Hard | The challenge is correctness, not scale: everyone must end up with the same document. |
| [Stock trading (Robinhood)](stock-trading.md) | Hard | Two separate problems: pushing live prices to millions, and never losing or duplicating an order. |
| [Online auction](online-auction.md) | Medium | Many people bid on one row at the same time, and exactly one of them must win each race. |
| [LLM chat (ChatGPT)](llm-chat.md) | Hard | GPUs are the scarce resource, so every queueing decision is really a cost decision. |
| [Chat app (WhatsApp)](chat-app.md) | Medium | Chat looks like CRUD until you notice the two users are on different servers and one of them is offline. |

## Dealing with contention

*Pattern: [Dealing with contention](../patterns/contention.md)*

| Problem | Difficulty | What makes it interesting |
|---|---|---|
| [Ticketmaster](ticketmaster.md) | Hard | Millions of people arrive for one on-sale, and no seat may ever be sold twice. |

## Multi-step processes

*Pattern: [Multi-step processes](../patterns/multi-step-processes.md)*

| Problem | Difficulty | What makes it interesting |
|---|---|---|
| [Payment system (Stripe)](payment-system.md) | Hard | Throughput is moderate. The hard part is staying correct when a call to the bank has an unknown outcome. |
| [Online judge (LeetCode)](online-judge.md) | Medium | You are running strangers' code on your servers, so isolation comes first. |
| [Job scheduler](job-scheduler.md) | Hard | Ten thousand jobs per second, each within two seconds of its scheduled time. |

## Handling large blobs

*Pattern: [Handling large blobs](../patterns/large-blobs.md)*

| Problem | Difficulty | What makes it interesting |
|---|---|---|
| [Video platform (YouTube)](video-platform.md) | Hard | Two hard problems: getting gigabyte uploads in reliably, and streaming smoothly on any connection. |
| [File storage and sync (Dropbox)](file-sync.md) | Easy | Syncing a 50 GB file after a one-byte edit should not mean uploading 50 GB again. |
| [Photo sharing (Instagram)](photo-sharing.md) | Medium | A news feed plus a media pipeline: two well-known problems combined. |

## Long-running tasks

*Pattern: [Long-running tasks](../patterns/long-running-tasks.md)*

| Problem | Difficulty | What makes it interesting |
|---|---|---|

