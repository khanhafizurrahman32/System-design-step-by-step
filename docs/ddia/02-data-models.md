---
title: "DDIA Ch 2: Data Models & Query Languages"
description: "The shape of your data decides which database fits."
tags: [ddia]
---

# DDIA Chapter 2: Data Models & Query Languages

<span class="lvl lvl-i">Intermediate</span>

> These DDIA pages are study notes in our own words and diagrams, connecting the book to interview problems. They don't replace the book; *Designing Data-Intensive Applications* by Martin Kleppmann is worth reading in full.

> [!TIP]
> **One-page sketchnote:** [DDIA 2 · DATA MODELS & QUERY LANGUAGES on a single page](../sketchnotes/ddia-02.svg), for revision or printing.

## TL;DR

The shape of your data decides which database fits. Trees of data that are read together (one-to-many) suit documents. Data full of references (many-to-many) suits relational. Data where relationships are the point suits graphs.

**Key ideas:** relational · document · graph · normalization · schema-on-read · locality

## One LinkedIn profile, two models

*Relational vs document*

![One LinkedIn profile, two models](../diagrams/ddia-02-1.svg)

1. Relational: a profile is split across tables and reassembled with joins. Mapping objects to tables like this is called **impedance mismatch**.
2. Document: a profile is a self-contained tree. One read fetches it all because the data has **locality**. This works when the data is one-to-many and read as a whole.

> [!NOTE]
> **When document wins:** Data forms a tree, you always load the whole tree, and there are few cross-references. Examples: a resume, a product page, an order with its line items.

## Where documents break: many-to-one and many-to-many

*Normalization*

![Where documents break: many-to-one and many-to-many](../diagrams/ddia-02-2.svg)

1. Storing the org name as text in every profile duplicates it.
2. Duplicates drift: a typo, a rename, or a logo change means updating thousands of documents.
3. Normalize: store an **ID** and keep the org in one place. That is a many-to-one relationship.
4. Document databases have weak join support, so the join moves into application code. As data gains references, the relational model wins again.

> [!TIP]
> **Say this in the interview:** "Bookings reference hotels, users, and rooms, which is many-to-many, so I'll use Postgres. Each hotel's static content is one tree read as a whole, so it can live in a document store or as cached JSON."

## Schema-on-write vs schema-on-read

*Schema flexibility*

|  | Schema-on-write (relational) | Schema-on-read (document) |
|---|---|---|
| Analogy | Static typing: checked at compile time | Dynamic typing: checked at run time |
| Change a field | ALTER TABLE + migration (fast in Postgres; MySQL used to copy the whole table) | Just write new docs; code handles both old and new shapes |
| Good for | Uniform records with stable structure | Heterogeneous items: different shapes per type, or external data you don't control |
| Locality | Rows are spread across tables (but see Postgres JSONB, Spanner interleaving) | Whole doc stored together; rewrites the whole doc on update, so keep docs small |
| Joins | Native, optimized by query planner | Weak or none; done in application |

> [!WARNING]
> **"NoSQL is schemaless":** There is always a schema, it's just **implicit** in the reading code. You still pay for migrations, just later and in more places.

## Graph model: when relationships are the data

*Property graphs*

![Graph model: when relationships are the data](../diagrams/ddia-02-4.svg)

1. Vertices (people, places) and edges (relationships), each with properties.
2. Edges chain at different depths: Idaho is in the USA, but a city might be in a county, in a state, in a country.
3. Anything can connect to anything. Adding a new kind of relationship needs no schema change.
4. A recursive query ("WITHIN, any number of hops") is one line in Cypher and painful in SQL (recursive CTE).

> [!NOTE]
> **In interviews:** Fraud rings, "people you may know", knowledge graphs. Most interview problems don't need a graph DB; adjacency lists in Postgres or Redis are usually enough.

## In the interview

| Data shape | Pick | Interview example |
|---|---|---|
| Lots of cross-references, need transactions | Relational (Postgres) | Bookings, payments, inventory, users |
| Self-contained tree, read whole | Document (Mongo, DynamoDB item, JSONB) | Hotel content, product catalog page, chat message |
| Relationships are the query | Graph (Neo4j) or adjacency list | Social graph, recommendations, fraud |
| Huge write volume, simple key access | Wide-column (Cassandra) | Chat history, metrics, activity logs |

> [!TIP]
> **Say this in the interview:** "I start from access patterns. The two hot queries are X and Y, and both are key lookups with one join, so Postgres with the right indexes covers it. I'd only move to Cassandra if write volume passes about 50k/sec."

---

← [Ch 1: Reliable, scalable, maintainable](01-reliability-scalability-maintainability.md) · [Ch 3: Storage and retrieval](03-storage-and-retrieval.md) →
