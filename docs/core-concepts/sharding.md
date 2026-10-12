---
title: "Sharding"
description: "Split data across machines when one can't hold it or keep up with the writes, but only then."
tags: [core-concept]
---

# Sharding

<span class="lvl lvl-i">Intermediate</span>

*Split data across machines when one can't hold it or keep up with the writes, but only then.*

## What it is, and when you need it

**Sharding** (also called partitioning) splits one big dataset across several database servers, so each **shard** holds part of the data. Shard 1 has some users, shard 2 others, and so on. It is different from replication, where every server holds a **copy** of all the data.

You need it when **one primary database can't keep up**: the data is too big for one machine, or there are more writes than one machine can handle. Read load alone is usually solved more cheaply with caches and read replicas. Sharding comes after those, because it makes everything else harder: queries across shards, transactions across shards, schema changes, and rebalancing.

## How it works

![Concept 6: Sharding](../diagrams/concept-sharding.svg)

1. **Choose a shard key.** This is the field that decides which shard a row lives on, for example `user_id`. Pick it from your **hottest queries**: if nearly every request is "do something for this user", sharding by user means each request touches exactly **one** shard.
2. **Choose how to map keys to shards.**
   - **Hash** the key (`hash(user_id)`): spreads data evenly and avoids hot spots, but neighbouring keys end up on different shards.
   - **Ranges** (users 0–1M on shard A, 1M–2M on shard B): keeps neighbouring keys together for range scans, but sequential keys such as timestamps all land on the newest shard.
3. A **router** (in the application, a proxy, or the database driver) computes the shard for each request and sends it there.
4. **The cost:** a query that doesn't include the shard key, such as "all orders over $1,000 across all users", has to ask **every** shard and merge the answers (*scatter-gather*). That's slow, and it gets slower as you add shards. Accept it for rare queries, or answer them from a separate store such as a data warehouse or search index.

> [!WARNING]
> **The biggest mistake is sharding too early.** One Postgres server handles roughly 10–50k transactions a second and several TB of data. Shard only when your numbers show one primary can't take the **write** load, even after caching and read replicas.

> [!NOTE]
> **Hot spots:** even with hashing, one very popular key (a celebrity, a flash-sale item) puts all its load on one shard. Fixes: split the key across several shards, cache it, or buffer its writes and apply them in batches.

**Plan for growth:** don't map keys with `hash % number_of_shards`, because adding a shard then moves almost every row. Create many **logical** partitions up front (say 1,024) and assign several to each physical server, or use [consistent hashing](consistent-hashing.md). Then adding a server means moving a few whole partitions.

> [!TIP]
> **One-page sketchnote:** [SHARDING on a single page](../sketchnotes/concept-sharding.svg), for revision or printing.

## Checklist

1. Has the calculation shown one primary isn't enough after caching and replicas?
2. Pick the shard key from the hottest query, so most requests hit one shard.
3. Hash for even spread; ranges only if you need range scans on the key.
4. Plan for hot keys and for rebalancing (many logical partitions, or consistent hashing).
5. Accept that queries without the shard key fan out to every shard.

## In the interview

> [!TIP]
> "Writes outgrow one primary, so I'll shard by hash of user_id: every hot query includes it. Cross-user analytics can scatter-gather or run on a warehouse."

## Related

- Pattern: [Scaling writes](../patterns/scaling-writes.md)
