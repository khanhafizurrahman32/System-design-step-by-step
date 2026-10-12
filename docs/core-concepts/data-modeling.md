---
title: "Data modeling"
description: "Start from the queries the product runs, then choose keys and indexes that make each one cheap."
tags: [core-concept]
---

# Data modeling

<span class="lvl lvl-b">Beginner-friendly</span>

*Start from the queries the product runs, then choose keys and indexes that make each one cheap.*

## Start from the queries, not the nouns

The usual beginner approach is to list the nouns (User, Post, Comment), give each a table, and add columns. That produces a valid schema that may be **slow for exactly the things your product does most**. In system design, the data model exists to make the **hot queries** fast, so work backwards from them.

![Concept 3: Data modeling](../diagrams/concept-data-modeling.svg)

1. **List the queries the product actually runs**, and how often. For a social app: "show a user's posts, newest first" (constantly), "show one post by ID" (constantly), "create a post" (much less often).
2. **Design keys and indexes so each hot query is one index lookup or one range scan.** "Posts by author, newest first" becomes a `posts` table with an index on `(author_id, created_at DESC)`. The database jumps to that author's entries, already in order, and reads the first 20. "Post by ID" is the primary key. If a hot query needs several lookups or a large sort, the model isn't finished.
3. **Pick the database last.** Default to a relational database such as Postgres: it handles these patterns well, gives you transactions, and lets you run queries you didn't plan for. Move away from it only with a concrete reason:
   - very high write volume with simple key access: Cassandra;
   - flexible documents read by key: DynamoDB or MongoDB;
   - full-text search: Elasticsearch, as a second store fed from the main one.

> [!NOTE]
> **Normalize vs denormalize:** *normalizing* means storing each fact once (a user's name lives only in `users`, and posts reference `user_id`). One place to update, so no inconsistencies. That's the default. *Denormalizing* means deliberately copying data to make a hot read faster, for example storing the author's name and avatar on each post, so the feed doesn't need a join. When you do, **say how the copy stays in sync** (an async job, CDC), and accept that it can briefly be stale.

**What interviewers look for:** the core tables with their primary keys, the one or two indexes that make the hot queries fast, and a sentence on why this database. You don't need every column.

> [!TIP]
> **One-page sketchnote:** [DATA MODELING on a single page](../sketchnotes/concept-data-modeling.svg), for revision or printing.

## Checklist

1. List the two or three hottest queries first.
2. Make each one a key lookup or a single index range scan.
3. Default to Postgres; switch only with a reason you can state.
4. Normalize by default; denormalize deliberately for a hot read and say how the copy stays in sync.
5. Choose the partition key from the hottest query if you will shard.

## In the interview

> [!TIP]
> "The hot query is a user's posts, newest first, so the posts table gets an index on (author_id, created_at DESC)."

## Related

- Pattern: [Scaling reads](../patterns/scaling-reads.md)
