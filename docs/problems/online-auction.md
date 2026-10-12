---
title: "Online auction"
description: "Many people bid on one row at the same time, and exactly one of them must win each race."
tags: [real-time-updates, medium]
---

# Online auction

<span class="lvl lvl-i">Intermediate</span>

**Difficulty:** Medium · **Patterns:** [Real-time updates](../patterns/real-time-updates.md) · [Dealing with contention](../patterns/contention.md) · **DDIA:** [Ch 7](../ddia/07-transactions.md) lost update · [Ch 11](../ddia/11-stream-processing.md) partitioned log · [Ch 8](../ddia/08-trouble-with-distributed-systems.md) clocks

*Many people bid on one row at the same time, and exactly one of them must win each race.*

> [!TIP]
> **One-page sketchnote:** [ONLINE AUCTION on a single page](../sketchnotes/problem-online-auction.svg), for revision or printing.

## TL;DR

- Comparing bids in application code loses updates under concurrency.
- Accept a bid with one conditional update: set the new maximum only if it beats the current one and the auction is open.
- Push accepted bids to watchers in real time; for very hot auctions, serialize bids through a partitioned log.

## 1. Requirements

**Functional**

1. Create an auction (item, starting price, end time)
2. Place bids that must beat the current highest
3. Watch the highest bid update live; winner decided at the end

**Non-functional**

- Bids strongly consistent (never accept a stale "highest")
- Live updates < 1s
- No lost bids
- Hot auctions spike in the final seconds

## 2. Back-of-envelope numbers

10M auctions, ~100 bids each over a week ≈ low average QPS, but a hot auction can see **~1k bids/s** on one row near the end.

## 3. Core entities and API

```text
auctions(id, max_bid, max_bidder, end_time, status)
bids(auction_id, bid_id, user_id, amount, ts) append-only
```

```http
POST /auctions
POST /auctions/{id}/bids {amount} + Idempotency-Key
GET /auctions/{id}/stream (SSE)
```

## 4. v1: the simplest design, and where it breaks

![Online auction: v1 design](../diagrams/problem-online-auction-v1.svg)

To place a bid, the server reads the auction's current highest bid, checks in application code that the new bid is higher, and if so writes the new maximum and inserts the bid.

**Where it breaks:** the highest bid is $100. Two bidders send $110 and $120 at the same moment. Both requests read $100, both pass the check, and both write. If the $110 write lands second, the auction now says **$110 is winning** and the $120 bid is silently lost. Or both bidders are told they're the highest bidder. This is a **lost update** ([DDIA Ch 7](../ddia/07-transactions.md)). It's rare on quiet auctions, but popular auctions get **~1k bids a second** in the final seconds, all on the same row, so it happens constantly exactly when it matters most.

## 5. Evolving to the final design

![Online auction: final design](../diagrams/problem-online-auction-final.svg)

Each step fixes one specific problem with the step before it.

### Step 1: make "is it higher?" and "save it" one atomic step

**Why:** the bug lives in the gap between reading the maximum and writing the new one. Close the gap and the race disappears.

**How:** let the database do the comparison inside the update:

```sql
UPDATE auctions SET max_bid = :amount, max_bidder = :user
WHERE id = :auction AND max_bid < :amount AND end_time > now();
```

The database applies updates to one row one at a time. **1 row updated** means your bid is now the highest. **0 rows** means someone outbid you first, or the auction has ended, so tell the bidder. Every bid is also appended to the `bids` table for history. The check includes `end_time > now()`, so late bids are rejected by the same rule.

### Step 2: push accepted bids to watchers

**Why:** watchers need to see the new highest bid within a second. Polling by thousands of watchers in the final seconds would add huge load at the worst moment.

**How:** after a bid is accepted, publish it to a **pub/sub channel per auction**. Realtime servers subscribed to that channel push it to every watcher over **SSE**.

### Step 3: serialize bids for very hot auctions, and close auctions on time

**Why:** at about 1k bids a second, every bid waits for the row lock held by the one before it. Latency climbs, connections pile up, and the database row becomes a bottleneck.

**How:** send bids for hot auctions through **Kafka, partitioned by `auction_id`**. All bids for one auction go to one partition, **in order**, and are durably stored as soon as Kafka acknowledges them. One consumer per partition applies them to the database one by one, with no lock contention, and returns the result to the bidder. A **delayed job** fires at each auction's end time to mark it closed and notify the winner.

## 6. Deep dives

### Two bids at the same instant?

**Why it's the core problem:** comparing in application code means each request decides based on a value that may already be stale by the time it writes. That's the classic lost update.

**How:** make the database the referee. Either use the **conditional update** above, where the comparison happens atomically on the row, or lock the row with `SELECT … FOR UPDATE` before comparing, so the second bid waits for the first to commit and then sees the new maximum. Both guarantee that exactly one bid at a time can raise the maximum.

### Clock fairness at the deadline?

**Why it matters:** if the server checking the end time uses its own clock, or worse, trusts the time the client sends, then two servers with slightly different clocks can disagree about whether a bid at 11:59:59.900 was on time. Clients can lie about their time.

**How:** use **one clock**: the database server's `now()`, evaluated **inside** the same conditional update that accepts the bid. Every bid is judged against the same clock at the moment it's applied. With the Kafka path, the single consumer per auction applies the same rule in order.

### Durability?

**Why it matters:** telling a bidder "you're winning" and then losing that bid after a crash is unacceptable, and could be a legal problem.

**How:** **acknowledge only after the bid is durably stored**: after the database transaction commits, or, on the Kafka path, after Kafka confirms the write to all in-sync replicas (`acks=all`). A crash before that means the bidder gets an error and can retry (with an idempotency key, so the retry isn't counted twice).

### Anti-sniping?

**Why it's a problem:** "snipers" bid in the final second so others have no time to respond. Many auction sites consider that unfair.

**How:** **extend the end time** when a bid arrives near the end: if a bid lands in the last 30 seconds, push `end_time` out by another 30 seconds. Do it **inside the same conditional update** that accepts the bid (`SET end_time = GREATEST(end_time, now() + interval '30 seconds')`), so the extension and the bid are atomic, and the close job checks the current end time before closing.

## 7. Interview script (45 minutes)

| Time | What you do | Content |
|---|---|---|
| 0–5 | Functional requirements | Create an auction (item, starting price, end time); Place bids that must beat the current highest; Watch the highest bid update live; winner decided at the end |
| 5–8 | Non-functional requirements | Bids strongly consistent (never accept a stale "highest"); Live updates < 1s; No lost bids; Hot auctions spike in the final seconds |
| 8–10 | Numbers that drive the design | 10M auctions, ~100 bids each over a week ≈ low average QPS, but a hot auction can see **~1k bids/s** on one row near the end. |
| 10–13 | Entities and API | Keep it short: the endpoints in §3, idempotency keys on writes. |
| 13–25 | v1, then evolve it | Draw v1 and show where it breaks. Then add, in order: Pub/sub → SSE → Watchers → Kafka → Delayed job. Justify each addition with a number. |
| 25–40 | Deep dives | Two bids at the same instant? · Clock fairness at the deadline? · Durability? · Anti-sniping? |
| 40–45 | Wrap-up | Remaining bottlenecks, failure modes, what you would monitor. |


## Staff-level lens

| Question | Staff answer |
|---|---|
| **The real problem** | One hot row, and bids must be strictly ordered. |
| **Deciding number** | ~1k bids/s on one auction in its final seconds. |
| **Staff call and trade-off** | Conditional update on the auction row; a Kafka partition per auction for the hottest ones. Accept serialized throughput per auction. |
| **Raise before you're asked** | Deadline fairness (use server time); sniping; durability of an accepted bid. |
| **Senior stops at** | A lock. |
| **Staff goes on to** | Anti-sniping as a product decision, serializing through a log for extreme auctions, an audit trail. |
| **Run it** | Watch bid acceptance latency, rejected-bid rate, partition lag. |

All 29 problems through this lens: [Staff-level answers](../playbook/staff-level.md).

## 8. Common mistakes

- Comparing bids in a Redis cache without atomicity.
- Adding components before showing which number makes them necessary.
- Skipping failure handling: what happens on timeouts, retries and crashes.

## Self-check

Try to answer before you open each one.

<details class="question" markdown>
<summary>Why can't you compare bids in application code?</summary>

Two concurrent bids both read the old maximum and both "win" (lost update).

</details>

<details class="question" markdown>
<summary>How is a bid accepted safely?</summary>

One conditional update: set the new maximum only if the bid beats the current one and the auction is still open.

</details>

<details class="question" markdown>
<summary>How do you handle very hot auctions?</summary>

Serialize bids for that auction through a partitioned log, so one consumer processes them in order.

</details>

## Related

- **Patterns:** [Real-time updates](../patterns/real-time-updates.md) · [Dealing with contention](../patterns/contention.md)
- **DDIA:** [Ch 7](../ddia/07-transactions.md) lost update · [Ch 11](../ddia/11-stream-processing.md) partitioned log · [Ch 8](../ddia/08-trouble-with-distributed-systems.md) clocks
- **Similar problems:** [Ride sharing (Uber)](ride-sharing.md) · [Live comments (Facebook Live)](live-comments.md) · [Collaborative editor (Google Docs)](collaborative-editor.md) · [Stock trading (Robinhood)](stock-trading.md)
