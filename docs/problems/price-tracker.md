---
title: "Price tracker (CamelCamelCamel)"
description: "Five hundred million products can't all be crawled often, so decide what is worth checking."
tags: [scaling-writes, medium]
---

# Price tracker (CamelCamelCamel)

**Difficulty:** Medium · **Patterns:** [Scaling writes](../patterns/scaling-writes.md) · [Scaling reads](../patterns/scaling-reads.md) · **DDIA:** [Ch 11](../ddia/11-stream-processing.md) event-driven · [Ch 3](../ddia/03-storage-and-retrieval.md) time-series storage

*Five hundred million products can't all be crawled often, so decide what is worth checking.*

## TL;DR

- Prioritise crawling by how many people track a product and how often its price changes.
- Add crowd-sourced prices from a browser extension, validated before they trigger alerts.
- Make alerts event-driven: when a price drops, look up subscriptions for that product only.

## 1. Requirements

**Functional**

1. Track price history for products
2. Users subscribe to alerts at a target price
3. View price charts

**Non-functional**

- 500M products
- Alert within ~1 hour of a drop
- Respect site rate limits (crawl budget)
- Charts load fast

## 2. Back-of-envelope numbers

500M products crawled daily = **~6k pages/s**, which runs into rate limits. Subscriptions are concentrated on a small fraction of products, so prioritize those.

## 3. Core entities and API

```text
price_history(product_id, ts, price) time-series
subscriptions(product_id, user_id, target_price) indexed (product_id, target_price)
```

```http
POST /subscriptions {product_id, target_price}
GET /products/{id}/history?range
```

## 4. v1: the simplest design, and where it breaks

A scheduler decides what to crawl: products with many subscribers or volatile prices are checked more often; the long tail rarely.

## 5. Evolving to the final design

![Price tracker (CamelCamelCamel): final design](../diagrams/problem-price-tracker-final.svg)

Each step fixes one specific problem with the step before it:

1. A scheduler decides what to crawl: products with many subscribers or volatile prices are checked more often; the long tail rarely.
2. A browser extension reports prices users actually see, which adds coverage for free. Validate it (N agreeing reports or a crawler re-check) before trusting it.
3. Every price change becomes an event; history goes to a time-series table (downsampled for charts).
4. Alerts are **event-driven**: on a drop, query subscriptions WHERE product_id=? AND target_price ≥ new_price and notify, deduped per user and product.

## 6. Deep dives

### Crawl budget?

Prioritize by subscribers and volatility; adaptive frequency; respect robots and rate limits.

### Bad extension data?

Require agreement or confirm with a crawl before alerting.

### Matching efficiently?

Index on (product_id, target_price); react to events, never scan all subscriptions.

### Charts?

Daily aggregates, cached.

## 7. Interview script (45 minutes)

| Time | What you do | Content |
|---|---|---|
| 0–5 | Functional requirements | Track price history for products; Users subscribe to alerts at a target price; View price charts |
| 5–8 | Non-functional requirements | 500M products; Alert within ~1 hour of a drop; Respect site rate limits (crawl budget); Charts load fast |
| 8–10 | Numbers that drive the design | 500M products crawled daily = **~6k pages/s**, which runs into rate limits. Subscriptions are concentrated on a small fraction of products, so prioritize those. |
| 10–13 | Entities and API | Keep it short: the endpoints in §3, idempotency keys on writes. |
| 13–25 | v1, then evolve it | Draw v1 and show where it breaks. Then add, in order: Browser extension → Kafka → Time-series DB → Alert matcher → Subscriptions DB → Email / push. Justify each addition with a number. |
| 25–40 | Deep dives | Crawl budget? · Bad extension data? · Matching efficiently? · Charts? |
| 40–45 | Wrap-up | Remaining bottlenecks, failure modes, what you would monitor. |

## 8. Common mistakes

- Re-scanning all subscriptions on a schedule instead of reacting to price changes.
- Adding components before showing which number makes them necessary.
- Skipping failure handling: what happens on timeouts, retries and crashes.

## Related

- **Patterns:** [Scaling writes](../patterns/scaling-writes.md) · [Scaling reads](../patterns/scaling-reads.md)
- **DDIA:** [Ch 11](../ddia/11-stream-processing.md) event-driven · [Ch 3](../ddia/03-storage-and-retrieval.md) time-series storage
- **Similar problems:** [Top-K videos (YouTube)](top-k-videos.md) · [Ad click aggregator](ad-click-aggregator.md) · [Web crawler](web-crawler.md) · [Metrics monitoring (Datadog)](metrics-monitoring.md)
