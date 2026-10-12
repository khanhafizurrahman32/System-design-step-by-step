---
title: "Fitness tracking (Strava)"
description: "The key insight is where the work happens: on the phone, not the server."
tags: [scaling-writes, medium]
---

# Fitness tracking (Strava)

<span class="lvl lvl-i">Intermediate</span>

**Difficulty:** Medium · **Patterns:** [Scaling writes](../patterns/scaling-writes.md) · **DDIA:** [Ch 11](../ddia/11-stream-processing.md) event time · [Ch 12](../ddia/12-future-of-data-systems.md) idempotent upload

*The key insight is where the work happens: on the phone, not the server.*

> [!TIP]
> **One-page sketchnote:** [FITNESS TRACKING (STRAVA) on a single page](../sketchnotes/problem-fitness-tracking.svg), for revision or printing.

## TL;DR

- Record GPS on the device and upload the whole activity when it ends; no need to stream every point.
- Store the track in object storage and the metadata in a database, with an idempotent, resumable upload.
- Compute stats and leaderboards asynchronously from a queue; leaderboards are Redis sorted sets.

## 1. Requirements

**Functional**

1. Start/pause/stop recording an activity (GPS track)
2. View activity stats and maps
3. Share with friends; see friends' activities; leaderboards

**Non-functional**

- Works offline; never lose an activity
- 10M DAU
- Feed eventually consistent
- Uploads resumable

## 2. Back-of-envelope numbers

10M activities/day; 1hr at 1 point/5s = 720 points ≈ 15–100KB per track → **~1TB/day** of track blobs.

## 3. Core entities and API

```text
activities(id, user_id, type, start, distance, duration, track_s3_key)
follows
leaderboard:{segment} ZSET
```

```http
POST /activities (complete track, idempotency key)
GET /activities/{id}
GET /feed?cursor
```

## 4. v1: the simplest design, and where it breaks

![Fitness tracking (Strava): v1 design](../diagrams/problem-fitness-tracking-v1.svg)

While a user runs or rides, the app **streams every GPS point** to the server as it's recorded, and the server stores each point in a database. When the activity ends, the server computes distance, pace and the map from the stored points.

**Where it breaks:**

- **Load for nothing:** with many users recording at once, every point is a write. Millions of devices sending a point every few seconds is **hundreds of thousands to millions of writes a second**, yet nobody looks at the activity until it's finished.
- **Lost activities:** runners go through tunnels, hikers through valleys with no signal, and phones switch networks. Every gap in connectivity is a gap in the recorded route, and losing someone's marathon is the worst possible failure for this product.

## 5. Evolving to the final design

![Fitness tracking (Strava): final design](../diagrams/problem-fitness-tracking-final.svg)

Each step fixes one specific problem with the step before it.

### Step 1: record on the device, upload when finished

**Why:** the activity is only needed **after** it ends, and the phone is the one thing guaranteed to be there for the whole activity, with or without a signal.

**How:** the app records GPS points **locally**: they're written to the phone's storage, so even a crash or a dead battery keeps what was recorded. When the user taps "finish", the app uploads the **whole activity** in one go. If there's no signal, it waits and retries later. The upload uses a client-generated **activity ID** as an **idempotency key**, so a retry after a lost response never creates a duplicate. Large tracks upload in **resumable chunks**, so a dropped connection resumes rather than restarting.

### Step 2: store the track as a file, the summary in a database

**Why:** a track is a blob, around 15–100 KB of points, adding up to **about 1 TB a day**, and it's read whole, when someone opens the activity. The summary fields (distance, duration, type) are what feeds and searches use.

**How:** store the track file in **S3** (cheap, durable, served via CDN for map rendering), and a small row in **Postgres**: `activities(id, user_id, type, start, distance, duration, track_s3_key)`.

### Step 3: process asynchronously, build leaderboards in Redis

**Why:** after upload there's real work to do: compute statistics, match the route against popular **segments** (a famous climb, a park loop), update leaderboards and feeds. Doing it inside the upload request would make the user wait and could fail the upload.

**How:** the upload returns as soon as the data is safely stored, then puts a job on a **queue**. Workers compute stats and segment matches. Segment leaderboards are **Redis sorted sets**, one per segment, with the effort time as the score, so "top 10" or "my rank" are single fast commands. Feeds of friends' activities update asynchronously; eventual consistency is fine.

## 6. Deep dives

### Why device-first?

**Why not live streaming:** signal is unreliable exactly where people exercise, so a server-first design loses data whenever coverage drops. It also generates enormous write load for data nobody reads until later.

**How it works:** the device is the **source of truth during recording**, and the server becomes the source of truth after upload. Live tracking, letting a family member follow your run, is an **optional, best-effort** extra: the app sends a point every 30 seconds or so when it can, and gaps are fine. The final recorded track always comes from the device upload.

### Upload reliability?

**Why it's hard:** mobile uploads fail mid-way, and responses get lost. The app doesn't know whether the server received the activity, so it must retry without creating duplicates.

**How:** the app creates the **activity ID** when recording starts and sends it as the **idempotency key**. The server's insert uses that ID, so a repeated upload finds the existing activity and returns success instead of creating a second one. The track uploads in **chunks** that can resume. The app keeps the local copy and keeps retrying **until the server confirms**, and only then may it delete local data.

### Leaderboards?

**Why Redis:** a leaderboard needs "insert a time", "top N" and "my rank" to be fast, for millions of segments.

**How:** one Redis **sorted set** per segment: `ZADD segment:{id} <time_seconds> <user_id>` (keeping only each user's best time). `ZRANGE segment:{id} 0 9` gives the 10 fastest, and `ZRANK` gives a user's position, both in O(log n). Periodically **snapshot** the sets to the database, so they can be rebuilt if Redis is lost.

### Time correctness?

**Why it matters:** an activity recorded Saturday morning but uploaded Monday (no signal on the mountain) must show as Saturday's run, in the right order in feeds and weekly totals.

**How:** use the **device's timestamps** from recording (event time) for the activity's start and each point, not the server's upload time. Sanity-check them (the phone clock might be wrong; compare with GPS time if available), but never replace them with arrival time.

## 7. Interview script (45 minutes)

| Time | What you do | Content |
|---|---|---|
| 0–5 | Functional requirements | Start/pause/stop recording an activity (GPS track); View activity stats and maps; Share with friends; see friends' activities; leaderboards |
| 5–8 | Non-functional requirements | Works offline; never lose an activity; 10M DAU; Feed eventually consistent; Uploads resumable |
| 8–10 | Numbers that drive the design | 10M activities/day; 1hr at 1 point/5s = 720 points ≈ 15–100KB per track → **~1TB/day** of track blobs. |
| 10–13 | Entities and API | Keep it short: the endpoints in §3, idempotency keys on writes. |
| 13–25 | v1, then evolve it | Draw v1 and show where it breaks. Then add, in order: Postgres → S3 → Queue → Stats / segment workers → Redis. Justify each addition with a number. |
| 25–40 | Deep dives | Why device-first? · Upload reliability? · Leaderboards? · Time correctness? |
| 40–45 | Wrap-up | Remaining bottlenecks, failure modes, what you would monitor. |


## Staff-level lens

| Question | Staff answer |
|---|---|
| **The real problem** | Do the work on the phone; make uploads reliable. |
| **Deciding number** | 10M activities/day; ~1 TB/day of tracks. |
| **Staff call and trade-off** | Record on device; idempotent, resumable upload; process asynchronously. Accept no live server view by default. |
| **Raise before you're asked** | Duplicate uploads; device clock and timezone errors; leaking home locations (privacy zones). |
| **Senior stops at** | Upload then process. |
| **Staff goes on to** | Rejects streaming every GPS point with numbers, adds privacy zones, considers leaderboard cheating. |
| **Run it** | Watch upload success, processing lag, leaderboard freshness. |

All 29 problems through this lens: [Staff-level answers](../playbook/staff-level.md).

## 8. Common mistakes

- Server-side real-time ingestion of every GPS point.
- Adding components before showing which number makes them necessary.
- Skipping failure handling: what happens on timeouts, retries and crashes.

## Self-check

Try to answer before you open each one.

<details class="question" markdown>
<summary>Why record GPS on the device and upload at the end?</summary>

Streaming every point is costly and fragile on poor connections; one upload per activity is simpler and works offline.

</details>

<details class="question" markdown>
<summary>How do you make uploads reliable?</summary>

Idempotent, resumable uploads to object storage, keyed by an activity ID created on the device.

</details>

<details class="question" markdown>
<summary>How are leaderboards built?</summary>

Asynchronously from a queue after upload, stored in Redis sorted sets.

</details>

## Related

- **Patterns:** [Scaling writes](../patterns/scaling-writes.md)
- **DDIA:** [Ch 11](../ddia/11-stream-processing.md) event time · [Ch 12](../ddia/12-future-of-data-systems.md) idempotent upload
- **Similar problems:** [Top-K videos (YouTube)](top-k-videos.md) · [Ad click aggregator](ad-click-aggregator.md) · [Web crawler](web-crawler.md) · [Metrics monitoring (Datadog)](metrics-monitoring.md)
