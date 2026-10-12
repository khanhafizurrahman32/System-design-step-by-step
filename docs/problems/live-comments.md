---
title: "Live comments (Facebook Live)"
description: "One popular stream can mean a million viewers each expecting new comments within a fraction of a second."
tags: [real-time-updates, medium]
---

# Live comments (Facebook Live)

<span class="lvl lvl-i">Intermediate</span>

**Difficulty:** Medium · **Patterns:** [Real-time updates](../patterns/real-time-updates.md) · **DDIA:** [Ch 11](../ddia/11-stream-processing.md) pub/sub · [Ch 6](../ddia/06-partitioning.md) partition by video

*One popular stream can mean a million viewers each expecting new comments within a fraction of a second.*

> [!TIP]
> **One-page sketchnote:** [LIVE COMMENTS (FACEBOOK LIVE) on a single page](../sketchnotes/problem-live-comments.svg), for revision or printing.

## TL;DR

- Polling at this scale is a self-inflicted denial of service; push with Server-Sent Events.
- Write each comment once and publish it once; pub/sub fans it out to every server holding viewers of that video.
- Route viewers of the same video to the same servers so each server subscribes to few channels.

## 1. Requirements

**Functional**

1. Post a comment on a live video
2. Viewers see new comments in near real time
3. Late joiners can scroll back through earlier comments

**Non-functional**

- Delivery p99 < 200ms
- Millions of concurrent viewers; mega-streams with 1M+ viewers
- Eventual consistency and ordering are acceptable

## 2. Back-of-envelope numbers

Hot stream: 1M viewers × 1k comments/s = **1B deliveries/s** for one video. Polling every 2s = 500k req/s from that one stream.

## 3. Core entities and API

```text
comments(video_id, comment_id, user_id, text, ts) partitioned by video_id, clustered by ts
```

```http
POST /videos/{id}/comments
GET /videos/{id}/comments?cursor (history)
GET /videos/{id}/comments/stream (SSE)
```

## 4. v1: the simplest design, and where it breaks

![Live comments (Facebook Live): v1 design](../diagrams/problem-live-comments-v1.svg)

Posting a comment inserts a row into the database. Each viewer's app **polls** every couple of seconds: "any comments on this video newer than the last one I have?"

**Where it breaks:**

- **Latency:** a comment appears only at the viewer's next poll, up to the full interval late. Shortening the interval makes the next problem worse.
- **Load:** one popular stream with **1 million viewers** polling every 2 seconds is **500k requests a second**, for a single video. Most return nothing new. It's a denial-of-service attack you're running on yourself.

## 5. Evolving to the final design

![Live comments (Facebook Live): final design](../diagrams/problem-live-comments-final.svg)

Each step fixes one specific problem with the step before it.

### Step 1: push comments with Server-Sent Events

**Why:** viewers need new comments within 200 ms, and asking repeatedly is both slow and wasteful.

**How:** each viewer opens one long-lived **SSE** connection (`GET /videos/{id}/comments/stream`), and the server writes each new comment to it the moment it arrives. No more empty polls: data flows only when there's a new comment. Posting a comment stays a normal `POST`. SSE is plain HTTP, works through proxies and reconnects automatically.

### Step 2: write once, publish once, fan out through pub/sub

**Why:** viewers of one video are spread across **many** realtime servers, maybe 1,000 of them. A comment arrives at one server, but must reach viewers connected to all the others.

**How:** when a comment is posted, it is **written once** to Cassandra (partitioned by `video_id`, sorted by time) and **published once** to a pub/sub channel for that video (Redis Pub/Sub, or Kafka). Every realtime server **subscribes** to the channels of the videos its connected viewers are watching. When the message arrives, each server pushes it down its own local SSE connections. The poster's server doesn't need to know where any viewer is.

### Step 3: group viewers of the same video on the same servers

**Why:** if viewers are spread randomly, every server ends up with a few viewers of almost every live video, so **every** server subscribes to **every** channel, and each comment is delivered to all servers.

**How:** the L7 load balancer routes connections by **`video_id`** (consistent hashing), so viewers of the same video land on the same few servers. Each server subscribes to only a handful of channels, and each comment goes only to the servers that actually have viewers for it. Huge streams are spread over a group of servers (see the mega-streams deep dive).

## 6. Deep dives

### SSE or WebSocket?

**Why it's a question:** both keep a connection open so the server can push.

**How to choose:** look at the direction of the traffic. Here it is overwhelmingly **server to client**: millions receive, and a few send. **SSE** fits exactly. It's one-way, plain HTTP, has automatic reconnection with "last event ID" resume, and works through corporate proxies. Sending a comment is a rare, ordinary `POST`. **WebSockets** are worth their extra complexity when both sides send frequently, as in chat or multiplayer games.

### How does one comment reach 1,000 servers?

**Why it's hard:** the server that receives a comment holds only a tiny share of the viewers. It can't push to connections on other machines directly, and calling 1,000 servers one by one is slow and fragile.

**How:** **pub/sub fan-out**. The comment is published **once** to the video's channel. The pub/sub system delivers one copy to each **subscribed server**, perhaps 1,000 deliveries, and each server then fans it out locally to its thousands of viewers over their SSE connections. Two levels of fan-out turn one write into millions of deliveries, without any server needing to know where viewers are.

### Mega-streams?

**Why it's hard:** a stream with 1M viewers and **1,000 comments a second** means 1 billion deliveries a second. And no human can read 1,000 comments a second anyway.

**How:** don't deliver everything to everyone. **Sample** the stream per viewer (show, say, 10–20 comments a second, chosen fairly), and **prioritize** comments that matter to that viewer: from friends, from the streamer, or highly reacted. That cuts delivery volume by 50–100× and makes the experience **better**, not worse. The viewers of a mega-stream are spread over a dedicated pool of servers, all subscribed to the same channel.

### Late join?

**Why it matters:** someone joining 20 minutes into a stream should see recent conversation, not an empty box.

**How:** on join, first fetch the **last N comments** from Cassandra with a cursor query, partitioned by `video_id` and sorted by time, so it's a fast single-partition read. **Then** attach to the live SSE stream. To avoid a gap or duplicates between the two, the client passes the ID of the newest comment it loaded, and the stream starts after it.

## 7. Interview script (45 minutes)

| Time | What you do | Content |
|---|---|---|
| 0–5 | Functional requirements | Post a comment on a live video; Viewers see new comments in near real time; Late joiners can scroll back through earlier comments |
| 5–8 | Non-functional requirements | Delivery p99 < 200ms; Millions of concurrent viewers; mega-streams with 1M+ viewers; Eventual consistency and ordering are acceptable |
| 8–10 | Numbers that drive the design | Hot stream: 1M viewers × 1k comments/s = **1B deliveries/s** for one video. Polling every 2s = 500k req/s from that one stream. |
| 10–13 | Entities and API | Keep it short: the endpoints in §3, idempotency keys on writes. |
| 13–25 | v1, then evolve it | Draw v1 and show where it breaks. Then add, in order: Realtime servers → Pub/sub → L7 LB. Justify each addition with a number. |
| 25–40 | Deep dives | SSE or WebSocket? · How does one comment reach 1,000 servers? · Mega-streams? · Late join? |
| 40–45 | Wrap-up | Remaining bottlenecks, failure modes, what you would monitor. |


## Staff-level lens

| Question | Staff answer |
|---|---|
| **The real problem** | Fan-out to a million viewers in under 200 ms. |
| **Deciding number** | 1M viewers × 1k comments/s ≈ 1B deliveries/s for one stream. |
| **Staff call and trade-off** | SSE + pub/sub per video, viewers of a video routed to the same servers; sample comments on mega-streams. Accept that not every viewer sees every comment. |
| **Raise before you're asked** | Reconnection storms after a deploy; slow consumers; moderation. |
| **Senior stops at** | WebSocket + pub/sub. |
| **Staff goes on to** | Points out nobody can read 1k comments/s and samples, plans for reconnect storms, sizes connections per server. |
| **Run it** | Watch delivery p99, connections per server, dropped messages. |

All 29 problems through this lens: [Staff-level answers](../playbook/staff-level.md).

## 8. Common mistakes

- Polling, which gives high latency and huge wasted load.
- Adding components before showing which number makes them necessary.
- Skipping failure handling: what happens on timeouts, retries and crashes.

## Self-check

Try to answer before you open each one.

<details class="question" markdown>
<summary>Why SSE instead of polling?</summary>

Millions of viewers polling every few seconds is a self-inflicted denial of service; one open push connection per viewer is far cheaper.

</details>

<details class="question" markdown>
<summary>How does one comment reach viewers on 1,000 servers?</summary>

It is published once to a pub/sub channel for that video; every server with viewers of that video subscribes and forwards it.

</details>

<details class="question" markdown>
<summary>Why route viewers of the same video to the same servers?</summary>

Each server then subscribes to few channels, cutting pub/sub fan-out.

</details>

## Related

- **Operating systems:** [OS 5: I/O models](../os/05-io-models.md) (event loops and connection limits)
- **Patterns:** [Real-time updates](../patterns/real-time-updates.md)
- **DDIA:** [Ch 11](../ddia/11-stream-processing.md) pub/sub · [Ch 6](../ddia/06-partitioning.md) partition by video
- **Similar problems:** [Ride sharing (Uber)](ride-sharing.md) · [Collaborative editor (Google Docs)](collaborative-editor.md) · [Stock trading (Robinhood)](stock-trading.md) · [Online auction](online-auction.md)
