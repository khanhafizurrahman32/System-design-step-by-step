---
title: "Dating app (Tinder)"
description: "Swipes are a firehose of writes, and two people swiping right at the same moment must never miss their match."
tags: [scaling-reads, medium]
---

# Dating app (Tinder)

<span class="lvl lvl-i">Intermediate</span>

**Difficulty:** Medium · **Patterns:** [Scaling reads](../patterns/scaling-reads.md) · **DDIA:** [Ch 7](../ddia/07-transactions.md) write skew · [Ch 3](../ddia/03-storage-and-retrieval.md) Bloom filters, LSM

*Swipes are a firehose of writes, and two people swiping right at the same moment must never miss their match.*

> [!TIP]
> **One-page sketchnote:** [DATING APP (TINDER) on a single page](../sketchnotes/problem-dating-app.svg), for revision or printing.

## TL;DR

- Precompute each user's stack of nearby candidates and hide already-swiped profiles with a Bloom filter.
- Swipes are write-heavy and append-only, a good fit for an LSM store like Cassandra.
- Detect matches atomically on one key per pair of users, so simultaneous swipes can't both miss each other.

## 1. Requirements

**Functional**

1. Profile with preferences (age, distance)
2. Get a stack of nearby candidates
3. Swipe left/right; get notified on a mutual match

**Non-functional**

- Stack load p99 < 300ms
- No missed matches (strong consistency on swipes)
- Don't re-show swiped profiles
- 20M DAU × 100 swipes

## 2. Back-of-envelope numbers

2B swipes/day ≈ **25k/s avg, ~100k/s peak**, which is write-heavy. Stacks precomputed: 20M × 200 IDs × 8B ≈ 32GB.

## 3. Core entities and API

```text
profiles
swipes(swiper_id, swipee_id, decision) partitioned by swiper
matches(a, b, ts)
```

```http
GET /feed?lat&lng → [profiles]
POST /swipes {target_id, decision}
push: match notification
```

## 4. v1: the simplest design, and where it breaks

Each time a user opens the app, query a search index such as Elasticsearch, which handles geo and filter queries well: "profiles within 30 km, aged 25–35, matching my preferences, that I haven't swiped on, sorted by some score". Swipes are inserted into a database, and after each right swipe the app checks whether the other person already swiped right on you.

**Where it breaks:**

- **Stack loads are slow and repetitive.** Each open runs a heavy geo plus filter query, and must exclude everyone you've already swiped. For an active user that's thousands of IDs, making the query slower over time. Hard to keep under 300 ms at scale.
- **Swipes are a firehose.** 20M users × 100 swipes is 2 billion a day: **25k a second on average, about 100k at peak**. That's far more writes than a typical relational database primary handles.
- **Matches can be missed.** Two people swiping right on each other at the same moment can both miss the match (see deep dive).

## 5. Evolving to the final design

![Dating app (Tinder): final design](../diagrams/problem-dating-app-final.svg)

Each step fixes one specific problem with the step before it.

### Step 1: precompute stacks, and hide swiped profiles with a Bloom filter

**Why:** the candidate list for a user changes slowly, and it only needs to change when they move or new people join nearby. Rebuilding it on every app open wastes work and makes users wait.

**How:** a background job computes each active user's **next ~200 candidates** and stores the IDs in Redis (20M users × 200 IDs × 8 bytes ≈ 32 GB). Opening the app reads that list instantly, and a refill job tops it up as the user swipes through it. To avoid showing someone again, keep a **Bloom filter** per user of everyone they've swiped. It's a compact structure that answers "definitely not swiped" or "probably swiped", and candidates the filter flags are skipped. (Why a Bloom filter is fine here: see the deep dive.)

### Step 2: store swipes in a write-optimized database

**Why:** ~100k swipes a second at peak, and swipes are **append-only**: they're written once and rarely changed.

**How:** an **LSM-tree** store such as **Cassandra**, partitioned by `swiper_id`. It turns writes into sequential appends and spreads them across many nodes, so 100k writes a second is routine. Reading "who did I swipe" for one user is a single-partition read.

### Step 3: detect matches atomically

**Why:** the naive check, "save my right swipe, then look up whether they swiped right on me", has a race when both people swipe at the same moment (see the deep dive).

**How:** store each **pair's** decisions under **one key**, built from the two IDs in a fixed order: `match:{min(a,b)}:{max(a,b)}`. A Redis Lua script **atomically** records my decision and reads theirs. Because both swipes touch the same key and Redis runs one script at a time, exactly one of them sees "both said yes", creates the match and sends both notifications.

## 6. Deep dives

### Both swipe at once: why can a match be missed?

**Why it happens:** Alice and Bob swipe right on each other within the same millisecond. Alice's request saves "Alice → Bob: yes", then checks "has Bob said yes to Alice?". At that moment, Bob's save hasn't landed yet, so the answer is no. Meanwhile Bob's request saves his swipe and checks for Alice's, which also hasn't landed yet from his point of view. Both checks say no, and **no match is created**, even though both said yes. Each request read before the other's write was visible. That's **write skew** ([DDIA Ch 7](../ddia/07-transactions.md)).

**How:** make "record my decision and read theirs" a **single atomic operation on a single key** for the pair. With a Lua script on `match:{min}:{max}` (or a conditional write in a database), the two operations are applied one after the other. The first sees only its own yes; the second sees **both**, and creates the match. Exactly one side wins, and no match is ever missed or created twice.

### Hide already-swiped profiles?

**Why it's tricky:** heavy users swipe on thousands of people. Storing and checking a full list on every candidate is memory- and time-hungry.

**How:** a **Bloom filter** per user: a fixed-size bit array where each swiped ID sets a few bits. Checking a candidate is a few bit lookups. It can give a **false positive** ("probably swiped" when they weren't), which means occasionally skipping a profile the user never saw. That's harmless. It **never** gives a false negative, so a swiped profile is never shown again. A few kilobytes per user cover thousands of swipes.

### Location changes?

**Why it matters:** the precomputed stack was built for where the user **was**. After a flight to another city, it's full of people hundreds of kilometres away.

**How:** when the app reports a location more than some distance (say 10–20 km) from where the stack was built, **invalidate** it and trigger a recompute. Serve a quick on-demand query for the first screen while the background job builds the new list.

## 7. Interview script (45 minutes)

| Time | What you do | Content |
|---|---|---|
| 0–5 | Functional requirements | Profile with preferences (age, distance); Get a stack of nearby candidates; Swipe left/right; get notified on a mutual match |
| 5–8 | Non-functional requirements | Stack load p99 < 300ms; No missed matches (strong consistency on swipes); Don't re-show swiped profiles; 20M DAU × 100 swipes |
| 8–10 | Numbers that drive the design | 2B swipes/day ≈ **25k/s avg, ~100k/s peak**, which is write-heavy. Stacks precomputed: 20M × 200 IDs × 8B ≈ 32GB. |
| 10–13 | Entities and API | Keep it short: the endpoints in §3, idempotency keys on writes. |
| 13–25 | v1, then evolve it | Draw v1 and show where it breaks. Then add, in order: Redis → Swipe service → Cassandra → Redis Lua → Push (APNs/FCM). Justify each addition with a number. |
| 25–40 | Deep dives | Both swipe at once: why can a match be missed? · Hide already-swiped profiles? · Location changes? |
| 40–45 | Wrap-up | Remaining bottlenecks, failure modes, what you would monitor. |


## Staff-level lens

| Question | Staff answer |
|---|---|
| **The real problem** | Write-heavy swipes, and a mutual match must never be missed. |
| **Deciding number** | ~100k swipes/s at peak; precomputed stacks ≈ 32 GB. |
| **Staff call and trade-off** | Precomputed stacks + Bloom filter of swiped profiles; one atomic operation per pair of users for matches. Accept rare skipped profiles from Bloom false positives. |
| **Raise before you're asked** | Two right-swipes at the same instant (write skew); stacks stale after the user moves; bots. |
| **Senior stops at** | Stores swipes. |
| **Staff goes on to** | Names the race precisely, uses a pair-keyed atomic op, sizes precomputation, weighs recommendation quality against cost. |
| **Run it** | Watch match detection latency, stack freshness, swipe write lag. |

All 29 problems through this lens: [Staff-level answers](../playbook/staff-level.md).

## 8. Common mistakes

- Separate "write swipe" and "check other swipe" calls without atomicity, so matches are lost.
- Adding components before showing which number makes them necessary.
- Skipping failure handling: what happens on timeouts, retries and crashes.

## Self-check

Try to answer before you open each one.

<details class="question" markdown>
<summary>How do you avoid showing profiles a user already swiped?</summary>

Keep a Bloom filter of swiped IDs per user: compact, fast, and a rare false positive only hides one extra profile.

</details>

<details class="question" markdown>
<summary>Why is Cassandra a good fit for swipes?</summary>

Swipes are write-heavy and append-only, which suits an LSM-tree store partitioned by user.

</details>

<details class="question" markdown>
<summary>How can two simultaneous right-swipes miss the match, and how do you fix it?</summary>

Each checks for the other's swipe before either is saved. Store both directions on one key per pair and check-and-write atomically.

</details>

## Related

- **Patterns:** [Scaling reads](../patterns/scaling-reads.md)
- **DDIA:** [Ch 7](../ddia/07-transactions.md) write skew · [Ch 3](../ddia/03-storage-and-retrieval.md) Bloom filters, LSM
- **Similar problems:** [URL shortener (Bitly)](url-shortener.md) · [Rate limiter](rate-limiter.md) · [Business discovery (Yelp)](business-discovery.md) · [News feed (Facebook)](news-feed.md)
