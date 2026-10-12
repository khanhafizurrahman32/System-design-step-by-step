---
title: "Stock trading (Robinhood)"
description: "Two separate problems: pushing live prices to millions, and never losing or duplicating an order."
tags: [real-time-updates, hard]
---

# Stock trading (Robinhood)

<span class="lvl lvl-a">Advanced</span>

**Difficulty:** Hard · **Patterns:** [Real-time updates](../patterns/real-time-updates.md) · **DDIA:** [Ch 8](../ddia/08-trouble-with-distributed-systems.md) unknown outcomes · [Ch 12](../ddia/12-future-of-data-systems.md) idempotency · [Ch 11](../ddia/11-stream-processing.md) pub/sub

*Two separate problems: pushing live prices to millions, and never losing or duplicating an order.*

> [!TIP]
> **One-page sketchnote:** [STOCK TRADING (ROBINHOOD) on a single page](../sketchnotes/problem-stock-trading.svg), for revision or printing.

## TL;DR

- Prices: one consumer of the exchange feed publishes per symbol; push servers subscribe and stream to clients.
- Orders: persist the order as pending with your own ID before sending it to the exchange.
- Treat exchange calls as having unknown outcomes; reconcile by your order ID instead of resubmitting.

## 1. Requirements

**Functional**

1. See live stock prices for watched symbols
2. Place market and limit orders; cancel orders
3. See order status and fills

**Non-functional**

- Price updates < 200ms
- Orders never lost or duplicated
- Strong consistency on order state
- 20M users; market-open spikes

## 2. Back-of-envelope numbers

Exchange feed ~ thousands of updates/s for ~10k symbols. 20M users polling = millions of req/s, so push instead. Orders ~ thousands/s at peak.

## 3. Core entities and API

```text
orders(id, user_id, symbol, status PENDING|SUBMITTED|FILLED|CANCELLED, exchange_order_id) partitioned by user
```

```http
GET /prices/stream?symbols (SSE)
POST /orders {symbol, side, qty, type, limit?} + Idempotency-Key
DELETE /orders/{id}
```

## 4. v1: the simplest design, and where it breaks

There are really **two separate problems** here, with opposite needs, so it helps to look at the naive version of each.

- **Prices:** the app polls `GET /prices?symbols=…` every second. With **20M users**, that's millions of requests a second, mostly returning prices that barely changed, and still up to a second late.
- **Orders:** the app calls our API, which forwards the order to the exchange and saves the result in our database **after** the exchange replies.

**Where it breaks:** polling can't meet the 200 ms price target at a sane cost. The order flow has a dangerous gap. If our server crashes, or the exchange call **times out**, **after** the order reached the exchange but **before** we saved anything, there is now a **live order at the exchange that we don't know about**. The user may retry and buy twice. For money, "orders never lost or duplicated" is the most important requirement.

## 5. Evolving to the final design

![Stock trading (Robinhood): final design](../diagrams/problem-stock-trading-final.svg)

Each step fixes one specific problem with the step before it.

### Step 1: push prices, fanned out per symbol

**Why:** prices change continuously, and millions of users watch overlapping sets of symbols. Pushing each change once per symbol is far cheaper than millions of polls.

**How:** **one** consumer reads the exchange's market data feed and **publishes each update to a channel per symbol** (pub/sub). Realtime servers hold users' **SSE** connections and subscribe to the symbols their connected users are watching, then forward updates. Humans can't read hundreds of updates a second, so **throttle** to about one update a second per symbol for the app. That cuts load hugely without users noticing.

### Step 2: record the order before sending it

**Why:** the exchange call can fail in the worst way: we don't know whether it went through. We need a record that exists **before** the order could exist at the exchange, so we can always find out what happened.

**How:** when the user submits, **first** insert the order into our database with status **PENDING** and **our own order ID**. Then send it to the exchange, passing our ID as the `clientOrderId`. If we crash or time out at any point, the PENDING row tells us there might be an order out there, and we can ask the exchange "what's the status of clientOrderId X?" to **reconcile** rather than guess.

### Step 3: update from exchange events, and reconcile daily

**Why:** orders don't complete in the request. They're acknowledged, partially filled, filled or cancelled over seconds to days.

**How:** the exchange sends **execution reports** asynchronously, and a consumer updates each order's status from them (SUBMITTED → PARTIALLY_FILLED → FILLED), applying each report idempotently. A daily **reconciliation job** compares our orders and positions with the exchange's official reports and flags any difference for investigation.

## 6. Deep dives

### Write DB before or after the exchange call?

**Why it matters:** this single choice decides whether a crash can leave an order we don't know about.

**How to think about it:** **after** fails dangerously. If we crash between sending and saving, a real order sits at the exchange with no record on our side: the user's money is committed and we can't show it, cancel it or reconcile it. A timeout is the same: the exchange may have accepted it (see [DDIA Ch 8](../ddia/08-trouble-with-distributed-systems.md)). **Before** fails safely. The worst case is a PENDING row for an order that never reached the exchange, which reconciliation finds and marks as failed. Always record intent first.

### Duplicate submits?

**Why it happens:** a user double-taps "Buy", or the app retries after a timeout, and without protection that's two orders.

**How:** the app generates an **Idempotency-Key** per order attempt, and our orders table has a **unique index** on it, so a duplicate request returns the existing order instead of creating a new one. And because we pass our order ID as `clientOrderId`, the **exchange also rejects** a duplicate with the same ID. That's two independent layers.

### Cancel races with a fill?

**Why it's tricky:** the user taps "Cancel" just as the order executes at the exchange. Which wins?

**How:** treat cancel as a **request**, not a state change. Mark the order "cancel requested", send the cancel to the exchange, and update the status **only from the exchange's reply**: "cancelled", or "too late, filled". If it was **partially** filled, the filled part stands and only the rest is cancelled. The UI must show exactly what the exchange confirms.

### Market-open spike?

**Why it happens:** at 9:30 a.m., millions of users open the app at once, and order volume jumps many times over.

**How:** **autoscale** the realtime (SSE) servers ahead of the known daily spike, since it's predictable. Put **per-user rate limits** on order placement, queue order submissions so the exchange gateway isn't overwhelmed, and keep the price fan-out throttled. Prices can lag slightly under load, but orders must stay correct.

## 7. Interview script (45 minutes)

| Time | What you do | Content |
|---|---|---|
| 0–5 | Functional requirements | See live stock prices for watched symbols; Place market and limit orders; cancel orders; See order status and fills |
| 5–8 | Non-functional requirements | Price updates < 200ms; Orders never lost or duplicated; Strong consistency on order state; 20M users; market-open spikes |
| 8–10 | Numbers that drive the design | Exchange feed ~ thousands of updates/s for ~10k symbols. 20M users polling = millions of req/s, so push instead. Orders ~ thousands/s at peak. |
| 10–13 | Entities and API | Keep it short: the endpoints in §3, idempotency keys on writes. |
| 13–25 | v1, then evolve it | Draw v1 and show where it breaks. Then add, in order: Price processor → Pub/sub → SSE servers → Order service → Postgres → Exchange gateway → Fill processor. Justify each addition with a number. |
| 25–40 | Deep dives | Write DB before or after the exchange call? · Duplicate submits? · Cancel races with a fill? · Market-open spike? |
| 40–45 | Wrap-up | Remaining bottlenecks, failure modes, what you would monitor. |


## Staff-level lens

| Question | Staff answer |
|---|---|
| **The real problem** | Push prices to millions, and never lose or duplicate an order. |
| **Deciding number** | Thousands of updates/s across ~10k symbols; 20M users, so push not poll. |
| **Staff call and trade-off** | Persist the order as pending before calling the exchange, reconcile on timeout; throttle prices per symbol. Accept coarser price updates in the app. |
| **Raise before you're asked** | Unknown outcome on exchange timeout; duplicate orders; market-open spike. |
| **Senior stops at** | Separate price and order paths. |
| **Staff goes on to** | An order state machine, reconciliation against exchange reports, audit requirements, graceful degradation at open. |
| **Run it** | Watch order ack latency, reconciliation breaks, price fan-out lag. |

All 29 problems through this lens: [Staff-level answers](../playbook/staff-level.md).

## 8. Common mistakes

- Treating the exchange call as a local function call, so timeouts create ghost or duplicate orders.
- Adding components before showing which number makes them necessary.
- Skipping failure handling: what happens on timeouts, retries and crashes.

## Self-check

Try to answer before you open each one.

<details class="question" markdown>
<summary>Why persist the order before sending it to the exchange?</summary>

If you crash after sending, you still have a record with your own ID to reconcile against; otherwise the order could exist only at the exchange.

</details>

<details class="question" markdown>
<summary>The exchange call times out. Do you resubmit?</summary>

No. The outcome is unknown; query or reconcile by your order ID instead of resubmitting, which could double-trade.

</details>

<details class="question" markdown>
<summary>How are live prices fanned out?</summary>

One consumer of the exchange feed publishes per symbol; push servers subscribe and stream to clients.

</details>

## Related

- **Patterns:** [Real-time updates](../patterns/real-time-updates.md)
- **DDIA:** [Ch 8](../ddia/08-trouble-with-distributed-systems.md) unknown outcomes · [Ch 12](../ddia/12-future-of-data-systems.md) idempotency · [Ch 11](../ddia/11-stream-processing.md) pub/sub
- **Similar problems:** [Ride sharing (Uber)](ride-sharing.md) · [Live comments (Facebook Live)](live-comments.md) · [Collaborative editor (Google Docs)](collaborative-editor.md) · [Online auction](online-auction.md)
