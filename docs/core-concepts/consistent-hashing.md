---
title: "Consistent hashing"
description: "Add or remove a node and move only a small share of the keys."
tags: [core-concept]
---

# Consistent hashing

<span class="lvl lvl-i">Intermediate</span>

*Add or remove a node and move only a small share of the keys.*

## The problem it solves

You have a cache spread over 4 servers. To decide which server holds a key, the obvious rule is `server = hash(key) % 4`. It works, until you add a fifth server. Now the rule is `hash(key) % 5`, and for about **80% of keys** the answer changes. Those keys are looked up on the wrong server, every lookup misses, and all that traffic falls through to the database at once. Adding capacity has just caused an outage.

**Consistent hashing** is a placement rule where adding or removing a server moves only a **small share** of the keys, about 1/N of them.

## How it works

![Concept 7: Consistent hashing](../diagrams/concept-consistent-hashing.svg)

1. **Make a ring.** Imagine the full range of hash values bent into a circle, so the largest value wraps round to 0.
2. **Place the servers.** Hash each server's name, and put the server at that point on the ring (nodes A, B, C, D).
3. **Place the keys.** Hash each key to a point on the same ring. A key belongs to the **first server you meet going clockwise** from it.
4. **Add a server.** New node E lands somewhere on the ring, between B and C, say. It takes over only the keys between B and itself, keys that used to belong to C. Every other key stays exactly where it was. With N servers, about **1/N** of the keys move. Removing a server works the same way in reverse: only its keys move, to the next server clockwise.

**Virtual nodes.** With only a few servers, their random positions can leave one server with a huge arc (lots of keys) and another with a tiny one. The fix is to place each server at **many** points, say 100 or 200, by hashing `A#1`, `A#2` and so on. The arcs then average out, so load is even. A more powerful server can be given more virtual nodes so it takes a bigger share.

> [!NOTE]
> **Used by:** distributed caches (Memcached clients, Redis client-side sharding), Cassandra and DynamoDB for placing data, and load balancers that send the same video or document ID to the same server so its cache stays warm.

**What it doesn't fix:** a single **hot key** still lives on one server, however you place keys. That needs replication or key splitting (see [Sharding](sharding.md)).

> [!TIP]
> **One-page sketchnote:** [CONSISTENT HASHING on a single page](../sketchnotes/concept-consistent-hashing.svg), for revision or printing.

## Checklist

1. Place nodes and keys on the same hash ring.
2. A key belongs to the first node clockwise from it.
3. Use virtual nodes (many points per server) to even out load.
4. Adding a node moves roughly 1/N of keys; hash % N moves almost all of them.

## In the interview

> [!TIP]
> "Cache nodes sit on a consistent-hash ring with virtual nodes, so adding a node remaps about 1/N of keys instead of emptying the whole cache."

## Related

- Pattern: [Scaling reads](../patterns/scaling-reads.md)
