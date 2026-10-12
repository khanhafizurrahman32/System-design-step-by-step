---
title: "Local delivery (Gopuff)"
description: "It looks like an ordering system, but most of the load is people checking what is available near them."
tags: [scaling-reads, easy]
---

# Local delivery (Gopuff)

<span class="lvl lvl-b">Beginner-friendly</span>

**Difficulty:** Easy · **Patterns:** [Scaling reads](../patterns/scaling-reads.md) · **DDIA:** [Ch 7](../ddia/07-transactions.md) conditional updates · [Ch 5](../ddia/05-replication.md) replica lag

*It looks like an ordering system, but most of the load is people checking what is available near them.*

> [!TIP]
> **One-page sketchnote:** [LOCAL DELIVERY (GOPUFF) on a single page](../sketchnotes/problem-local-delivery.svg), for revision or printing.

## TL;DR

- Browsing availability is far more frequent than ordering, so cache it and serve it from replicas.
- Find nearby warehouses with an in-memory list and a cheap distance filter before calling any travel-time API.
- Prevent overselling with conditional stock decrements for every item in one transaction.

## 1. Requirements

**Functional**

1. Check availability of items deliverable to a location (DCs within 1 hour)
2. Order multiple items; never sell stock you don't have

**Non-functional**

- Availability p99 < 100ms
- Orders strongly consistent (no overselling)
- 10k distribution centres (DCs), ~100k SKUs
- Browse load ≫ order load

## 2. Back-of-envelope numbers

Browse ~10M × 10 / 86,400 ≈ **1.2k/s, ~10k/s peak**. Orders ~1M/day ≈ 12/s. The DC list (10k rows) fits in memory.

## 3. Core entities and API

```text
dcs(id, lat, lng, region)
inventory(dc_id, item_id, qty) PK(dc_id, item_id)
orders, order_items
```

```http
GET /availability?lat&lng&item_ids
POST /orders {items:[{id, qty}], lat, lng}
```

## 4. v1: the simplest design, and where it breaks

![Local delivery (Gopuff): v1 design](../diagrams/problem-local-delivery-v1.svg)

To show what a customer can order, find the distribution centres (DCs) that can deliver to them within an hour, then check those DCs' stock. The simplest version asks a travel-time API (like a maps service) for the drive time from **every** DC to the customer, keeps those under an hour, and queries inventory for them.

**Where it breaks:** there are **10,000 DCs**. That's 10,000 travel-time API calls per page view. Even in parallel it takes seconds, costs a fortune in API fees, and at ~10k availability checks a second at peak it means **100 million** external calls a second. The p99 target of 100 ms is impossible. Separately, ordering needs a guarantee that two customers can't buy the last unit of an item.

## 5. Evolving to the final design

![Local delivery (Gopuff): final design](../diagrams/problem-local-delivery-final.svg)

Each step fixes one specific problem with the step before it.

### Step 1: filter DCs cheaply before asking for travel times

**Why:** almost all of the 10,000 DCs are obviously too far away. You don't need a maps API to know that a DC 500 km away can't deliver in an hour.

**How:** the DC list is tiny, 10,000 rows with coordinates, so **keep it in memory** in every app server. For each request, compute the straight-line distance to every DC (microseconds) and keep only those within, say, 30 km. Then call the travel-time API for just those **few candidates**, and cache the results by area, because nearby customers get the same answer.

### Step 2: serve browsing from caches and replicas

**Why:** browsing happens far more often than ordering (about 10k a second at peak vs about 12 orders a second). Browsing can tolerate data a few seconds old; ordering cannot.

**How:** answer availability from a **short-TTL cache** (a few seconds) and **read replicas**. If the page says "in stock" and the item sold out a second ago, the order step catches it. This path is deliberately **AP**: fast and available, slightly stale.

### Step 3: make ordering exact

**Why:** if two customers order the last can of a drink at the same moment, only one may get it. "Read quantity, check it, write quantity − 1" lets both through (a race).

**How:** the order runs on the **primary** database, in **one transaction**, with a **conditional decrement** for each item:

```sql
UPDATE inventory SET qty = qty - :n
WHERE dc_id = :dc AND item_id = :item AND qty >= :n;
```

If any item's update affects **0 rows**, that item doesn't have enough stock, so **roll back** the whole order and tell the customer. This path is deliberately **CP**: correct first.

## 6. Deep dives

### How do you prevent overselling?

**Why it's hard:** checking stock and then decrementing it are two steps. Between them, another order can take the last unit. Both orders see "1 left", both succeed, and you've sold stock you don't have.

**How:** put the check **inside** the write, with the conditional `UPDATE … WHERE qty >= :n` above. The database locks the row while it applies the update, so concurrent orders for the same item are applied **one at a time**. The second one sees the reduced quantity and matches 0 rows. Doing all items in one transaction means a multi-item order is all-or-nothing: you never charge for half a basket.

### Stale availability vs orders?

**Why it matters:** the browse page might say an item is available when it has just sold out. Is that a bug?

**How to think about it:** use **different consistency for different paths**. Browsing is cached and eventually consistent, because a few seconds of staleness costs little and keeps the page fast. Checkout reads and writes the **primary** and is strictly correct. The rare case where browse said "available" but checkout fails is handled with a clear message ("sorry, just sold out") and maybe a substitute suggestion.

### Scale orders?

**Why it might be needed:** if order volume grows far beyond today's ~12 a second, one primary's write capacity could become a limit.

**How:** **partition inventory by region**. An order is only ever fulfilled from DCs near the customer, so all its rows live on the same shard, and you never need a transaction across shards. Each region's database handles only its own orders.

### Hot item (flash sale)?

**Why it's hard:** during a flash sale, thousands of orders a second all try to decrement the **same inventory row**. Each update must wait for the row lock held by the one before it, so they queue up, latency soars and requests time out.

**How:** two options.

- **Queue orders per item:** put orders for the hot item into a queue and process them one by one in a single worker. There's no lock contention, and the queue absorbs the burst.
- **Split the stock into buckets:** spread the 1,000 units across 10 rows of 100. Each order picks a bucket at random and moves on to another if it's empty. That's 10× less contention per row, at the cost of slightly more complex "is it sold out?" logic.

## 7. Interview script (45 minutes)

| Time | What you do | Content |
|---|---|---|
| 0–5 | Functional requirements | Check availability of items deliverable to a location (DCs within 1 hour); Order multiple items; never sell stock you don't have |
| 5–8 | Non-functional requirements | Availability p99 < 100ms; Orders strongly consistent (no overselling); 10k distribution centres (DCs), ~100k SKUs; Browse load ≫ order load |
| 8–10 | Numbers that drive the design | Browse ~10M × 10 / 86,400 ≈ **1.2k/s, ~10k/s peak**. Orders ~1M/day ≈ 12/s. The DC list (10k rows) fits in memory. |
| 10–13 | Entities and API | Keep it short: the endpoints in §3, idempotency keys on writes. |
| 13–25 | v1, then evolve it | Draw v1 and show where it breaks. Then add, in order: Nearby-DC service → Travel-time API → Redis → Read replicas → Order service → Postgres primary. Justify each addition with a number. |
| 25–40 | Deep dives | How do you prevent overselling? · Stale availability vs orders? · Scale orders? · Hot item (flash sale)? |
| 40–45 | Wrap-up | Remaining bottlenecks, failure modes, what you would monitor. |


## Staff-level lens

| Question | Staff answer |
|---|---|
| **The real problem** | Huge browse traffic on availability; strict stock at checkout. |
| **Deciding number** | ~10k browse/s at peak vs ~12 orders/s; the 10k-row warehouse list fits in memory. |
| **Staff call and trade-off** | Browse is AP (cache + replicas); checkout is CP (conditional decrements in one transaction). Accept occasional "sold out at checkout". |
| **Raise before you're asked** | Flash-sale hot rows; cache showing stock that is gone; travel-time API outage (fall back to distance). |
| **Senior stops at** | A transaction on order. |
| **Staff goes on to** | States consistency per path, partitions stock by region so no transaction crosses shards, plans for the third-party API failing. |
| **Run it** | Watch checkout failures due to stock, availability p99, external API spend. |

All 29 problems through this lens: [Staff-level answers](../playbook/staff-level.md).

## 8. Common mistakes

- Redis as the inventory source of truth, with no multi-item transaction or durability.
- Adding components before showing which number makes them necessary.
- Skipping failure handling: what happens on timeouts, retries and crashes.

## Self-check

Try to answer before you open each one.

<details class="question" markdown>
<summary>Why serve availability from caches and replicas?</summary>

Browsing is far more frequent than ordering, and availability can be a little stale; the order path checks the real stock.

</details>

<details class="question" markdown>
<summary>How do you prevent overselling?</summary>

Conditional stock decrements (WHERE stock >= qty) for every item in one transaction; if any fails, the whole order fails.

</details>

<details class="question" markdown>
<summary>Why filter warehouses by straight-line distance before calling a travel-time API?</summary>

The API is slow and costly; a cheap distance filter on an in-memory list removes most candidates first.

</details>

## Related

- **Patterns:** [Scaling reads](../patterns/scaling-reads.md)
- **DDIA:** [Ch 7](../ddia/07-transactions.md) conditional updates · [Ch 5](../ddia/05-replication.md) replica lag
- **Similar problems:** [URL shortener (Bitly)](url-shortener.md) · [Rate limiter](rate-limiter.md) · [Business discovery (Yelp)](business-discovery.md) · [News feed (Facebook)](news-feed.md)
