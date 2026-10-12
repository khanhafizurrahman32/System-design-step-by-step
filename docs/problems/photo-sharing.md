---
title: "Photo sharing (Instagram)"
description: "A news feed plus a media pipeline: two well-known problems combined."
tags: [large-blobs, medium]
---

# Photo sharing (Instagram)

<span class="lvl lvl-i">Intermediate</span>

**Difficulty:** Medium · **Patterns:** [Handling large blobs](../patterns/large-blobs.md) · [Scaling reads](../patterns/scaling-reads.md) · **DDIA:** [Ch 1](../ddia/01-reliability-scalability-maintainability.md) fan-out · [Ch 11](../ddia/11-stream-processing.md) async pipelines

*A news feed plus a media pipeline: two well-known problems combined.*

> [!TIP]
> **One-page sketchnote:** [PHOTO SHARING (INSTAGRAM) on a single page](../sketchnotes/problem-photo-sharing.svg), for revision or printing.

## TL;DR

- Upload media straight to object storage; process thumbnails and sizes asynchronously; serve them from a CDN.
- Build feeds with fan-out on write into Redis, and pull celebrity posts at read time.
- Show a post only once its media has finished processing.

## 1. Requirements

**Functional**

1. Post photos and videos with captions
2. Follow users
3. View a feed of followed users' posts

**Non-functional**

- Feed p99 < 500ms
- Media upload and delivery fast globally
- 500M DAU
- Eventual consistency for the feed

## 2. Back-of-envelope numbers

500M DAU × 20 feed loads ≈ **~115k feed reads/s**. 100M posts/day; media ~2MB avg → 200TB/day to S3, served by CDN.

## 3. Core entities and API

```text
posts(id, author, caption, media_keys, status)
follows
feed:{user} ZSET
```

```http
POST /posts {caption} → {post_id, presigned upload URL}
GET /feed?cursor
POST /users/{id}/follow
```

## 4. v1: the simplest design, and where it breaks

Users upload photos and videos through the API, which stores them and creates a post. The feed is built when a user opens it: find who they follow, fetch those users' recent posts, merge by time.

**Where it breaks:** both halves fail at this scale.

- **Media:** 100M posts a day at ~2 MB average is about **200 TB a day** passing through the API servers, plus all the downloads. The servers become expensive bandwidth pipes, and uploads on mobile connections fail and restart.
- **Feed:** about **115k feed loads a second**, each needing lookups across hundreds of followed accounts, means millions of queries a second. The 500 ms p99 isn't achievable (the same problem as [News feed](news-feed.md)).

## 5. Evolving to the final design

![Photo sharing (Instagram): final design](../diagrams/problem-photo-sharing-final.svg)

Each step fixes one specific problem with the step before it.

### Step 1: media goes straight to object storage, is processed asynchronously, and is served by a CDN

**Why:** media bytes are large and must be fast to upload and view anywhere in the world. App servers should handle only small requests.

**How:**

- `POST /posts` creates the post with status **PROCESSING** and returns a **presigned upload URL**.
- The app uploads the photo or video **directly to S3**.
- An **S3 event** triggers workers that create thumbnails and several sizes (and video renditions). When they finish, the post's status becomes **READY**.
- All media is served through a **CDN**, so viewers download from a nearby edge server, and your servers never touch the bytes.

### Step 2: precompute feeds, with a hybrid for celebrities

**Why:** feeds are read far more often than posts are created, so computing them on each read wastes work, exactly as in the news feed problem.

**How:** when a post becomes READY, put a "new post" event on **Kafka**. Fan-out workers push the post ID into each follower's **feed list in Redis** (a sorted set by time). Reading a feed is then one Redis read, plus a batch fetch of post details. Accounts with millions of followers are **not** fanned out; their posts are **pulled at read time** and merged in (the hybrid approach).

## 6. Deep dives

### Post visible before media is processed?

**Why it's a problem:** if a post appears in followers' feeds as soon as it's created, they may see a broken image or a video that won't play, because thumbnails and renditions aren't ready yet.

**How:** keep the post in **PROCESSING** status and only fan it out to followers when processing marks it **READY**. Meanwhile, the **author** can see it in their own profile with a "processing" indicator, using the original upload or a local copy on their phone.

### Celebrities?

**Why they're a problem:** pushing one post into 100M followers' feeds means 100M writes, delaying it by minutes and backing up everyone else's posts.

**How:** the same **hybrid** as [News feed](news-feed.md): skip fan-out for accounts above a follower threshold. When a user opens their feed, merge their precomputed list with the recent posts of the celebrities they follow, which are heavily cached because many users fetch the same ones.

### Like counts?

**Why it's hard:** a popular post can get thousands of likes a second. Running `UPDATE posts SET likes = likes + 1` for each one makes every like wait on the same row's lock.

**How:** count likes in **Redis** with atomic `INCR` (thousands a second per key is fine), or spread one post's count over several **sharded counters** (`likes:post7:0` … `:9`) added up on read. **Flush** totals to the database periodically for durability. The displayed count can lag a little, and nobody minds. Who liked what is recorded separately (one row per like), so a user can't like twice.

### Global latency?

**Why it matters:** users are everywhere, and round trips to one data centre add hundreds of milliseconds for distant users.

**How:** **media** is served by the CDN from edge locations near users, which is the bulk of the bytes. For **feeds and metadata**, run read replicas or caches in several regions, so feed reads are served locally. Writes go to the home region, and a few seconds of replication lag is fine for a feed.

## 7. Interview script (45 minutes)

| Time | What you do | Content |
|---|---|---|
| 0–5 | Functional requirements | Post photos and videos with captions; Follow users; View a feed of followed users' posts |
| 5–8 | Non-functional requirements | Feed p99 < 500ms; Media upload and delivery fast globally; 500M DAU; Eventual consistency for the feed |
| 8–10 | Numbers that drive the design | 500M DAU × 20 feed loads ≈ **~115k feed reads/s**. 100M posts/day; media ~2MB avg → 200TB/day to S3, served by CDN. |
| 10–13 | Entities and API | Keep it short: the endpoints in §3, idempotency keys on writes. |
| 13–25 | v1, then evolve it | Draw v1 and show where it breaks. Then add, in order: S3 media → Media processing → CDN → Kafka → Fan-out workers → Redis feeds. Justify each addition with a number. |
| 25–40 | Deep dives | Post visible before media is processed? · Celebrities? · Like counts? · Global latency? |
| 40–45 | Wrap-up | Remaining bottlenecks, failure modes, what you would monitor. |


## Staff-level lens

| Question | Staff answer |
|---|---|
| **The real problem** | A feed plus a media pipeline. |
| **Deciding number** | ~115k feed reads/s; ~200 TB/day of media. |
| **Staff call and trade-off** | Presigned uploads, async processing, CDN; hybrid fan-out. Accept a post appearing only after processing. |
| **Raise before you're asked** | Processing backlog; celebrity fan-out; storage cost. |
| **Senior stops at** | Feed + S3. |
| **Staff goes on to** | Storage tiering and cost, processing SLOs, regional reads. |
| **Run it** | Watch time to visible, feed p99, CDN hit ratio. |

All 29 problems through this lens: [Staff-level answers](../playbook/staff-level.md).

## 8. Common mistakes

- Serving images from app servers or storing blobs in the database.
- Adding components before showing which number makes them necessary.
- Skipping failure handling: what happens on timeouts, retries and crashes.

## Self-check

Try to answer before you open each one.

<details class="question" markdown>
<summary>Why process thumbnails asynchronously?</summary>

Upload returns fast; resizing happens in workers from a queue, and the post is shown only once its media is ready.

</details>

<details class="question" markdown>
<summary>How are feeds built for most users vs celebrities?</summary>

Fan-out on write into Redis for most; celebrity posts are pulled at read time.

</details>

<details class="question" markdown>
<summary>How is media served globally with low latency?</summary>

From a CDN in front of object storage.

</details>

## Related

- **Patterns:** [Handling large blobs](../patterns/large-blobs.md) · [Scaling reads](../patterns/scaling-reads.md)
- **DDIA:** [Ch 1](../ddia/01-reliability-scalability-maintainability.md) fan-out · [Ch 11](../ddia/11-stream-processing.md) async pipelines
- **Similar problems:** [Video platform (YouTube)](video-platform.md) · [File storage and sync (Dropbox)](file-sync.md)
