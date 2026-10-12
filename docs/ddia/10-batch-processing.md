---
title: "DDIA Ch 10: Batch Processing"
description: "Batch processing from Unix pipes to MapReduce and Spark: map, shuffle, reduce, batch joins, skew, and why immutable inputs make jobs safe to re-run."
tags: [ddia]
---

# DDIA Chapter 10: Batch Processing

<span class="lvl lvl-a">Advanced</span>

> These DDIA pages are study notes in our own words and diagrams, connecting the book to interview problems. They don't replace the book; *Designing Data-Intensive Applications* by Martin Kleppmann is worth reading in full.

> [!TIP]
> **One-page sketchnote:** [DDIA 10 · BATCH PROCESSING on a single page](../sketchnotes/ddia-10.svg), for revision or printing.

## TL;DR

Take a big, bounded, **immutable** input, run a pure function over it, and produce a derived output. Because inputs are never modified, a buggy job is fixed by re-running it. That property, being able to recompute from source, runs through all of Part III.

**Key ideas:** Unix philosophy · MapReduce · HDFS · shuffle · sort-merge join · broadcast join · Spark DAG

## The Unix philosophy: small tools, one interface

*Where batch comes from*

Part III of the book is about **derived data**: indexes, caches, reports and recommendations computed from a source of truth. The simplest way to compute derived data is a **batch job**. Take a large, fixed input (yesterday's logs, say), run it through a program, and write a new output. The ideas behind modern batch systems were already in Unix decades ago.

Say you want the five most-visited pages from a web server log. In a Unix shell, this is one line:

```bash
cat access.log | awk '{print $7}' | sort | uniq -c | sort -rn | head -5
```

![The Unix philosophy: small tools, one interface](../diagrams/ddia-10-1.svg)

1. `awk` reads each line of the log and prints only the 7th field, the URL.
2. `sort` puts identical URLs next to each other, and `uniq -c` collapses each run into a count. If the log is bigger than memory, `sort` spills to disk and merges, so this works on files far larger than RAM.
3. `sort -rn` orders by count, highest first, and `head -5` keeps the top five. That's six tiny programs, none of which knows about the others, combined into a useful analysis.

Why does this work so well? Three properties, which carry straight over to big-data systems:

- **The input is never modified.** You can run the command a hundred times while experimenting, and the log is untouched. A mistake costs nothing.
- **One uniform interface:** every tool reads lines of text and writes lines of text, so any tool can feed any other.
- **Logic is separate from wiring:** `sort` doesn't know or care where its input comes from or where its output goes.

**MapReduce** is this same idea spread over thousands of machines, with a distributed filesystem (HDFS) playing the role of the file.

## MapReduce: map, shuffle, reduce

*Distributed batch*

Now the log is 10 TB, spread over hundreds of machines. MapReduce runs the same "extract, group, count" logic in parallel:

![MapReduce: map, shuffle, reduce](../diagrams/ddia-10-2.svg)

1. The input is stored in **HDFS**, split into blocks of about 128 MB, with each block copied to three machines.
2. The scheduler starts a **mapper** on a machine that already holds each block. Moving the code to the data is far cheaper than moving terabytes over the network. Each mapper reads its records and emits **key-value pairs**, for example `(url, 1)` for every log line. This is the `awk` step.
3. The **shuffle** then routes every pair to a **reducer** chosen by hashing its key, so all pairs for the same URL end up at the same reducer, sorted by key. This is the `sort` step. It is the expensive part, because most of the data crosses the network here.
4. Each **reducer** receives, for each key, all its values together (`url → 1, 1, 1, …`), combines them (adds them up), and writes its output files back to HDFS. This is the `uniq -c` step.

Fault tolerance comes almost for free. Because inputs are immutable and tasks have no side effects, if a machine dies mid-task the scheduler simply **re-runs that one task** somewhere else.

> [!NOTE]
> **Scale:** mapper output is written to local disk, and reducers pull it over the network. Google and Yahoo ran MapReduce over petabytes a day, and the same map-shuffle-reduce shape still runs inside Spark, BigQuery and Snowflake today.

## Joins in batch: bring related records together

*Sort-merge · broadcast · partitioned*

Batch jobs often need to **combine** two datasets. Question: "which URLs are popular with which age group?" Clicks come from the event log (`user_id, url`). Ages come from the user database (`user_id, birth_year`).

![Joins in batch: bring related records together](../diagrams/ddia-10-3.svg)

1. The naive way is to look up each user in the live database for each click. With billions of clicks, that's billions of random network requests: far too slow, and it would hammer the production database. Instead, take a **snapshot** (a dump) of the user table into HDFS, so both datasets are plain files.
2. **Sort-merge join:** one mapper reads clicks and another reads users, and **both emit `user_id` as the key**. The shuffle delivers everything for user 104, the profile and all of their clicks, to the **same reducer**, next to each other, with the profile first. The reducer reads the birth year, then streams through the clicks emitting `(url, age)` pairs. It is one linear pass, with no random lookups.
3. **Broadcast hash join:** if one side is **small**, such as a table of 5,000 hotels, skip the shuffle entirely. Load the small table into memory in **every** mapper, and each mapper joins its share of the big dataset by looking up the in-memory table. **Partitioned hash join:** if both datasets are already partitioned the same way (by the same key, into the same number of parts), each partition of one can be joined with the matching partition of the other independently.

> [!WARNING]
> **Skew:** if one key is extremely common, such as a celebrity with millions of clicks, all of its records go to **one** reducer, and the whole job waits for it. The fix is the same as hot keys in Chapter 6: detect the hot keys (for example by sampling) and spread their records across several reducers.

## Beyond MapReduce: dataflow engines and batch outputs

*Spark · Flink · outputs*

Real pipelines aren't one MapReduce job; they're chains of ten or twenty. MapReduce handles chains badly:

![Beyond MapReduce: dataflow engines and batch outputs](../diagrams/ddia-10-4.svg)

1. In MapReduce, every job writes its full output to HDFS, **replicated three times**, before the next job can start reading it. Most of those intermediate files are thrown away straight after. Each job also waits for the **entire** previous job to finish, even if the first results were ready long before.
2. **Dataflow engines** like Spark and Flink treat the whole pipeline as one graph of operators (a **DAG**). Data streams from one stage to the next in memory or on local disk, without the replicated writes. If a machine fails, lost pieces are **recomputed** from the steps that produced them (the **lineage**) instead of being stored three times just in case. The result is often 10–100× faster.

> [!NOTE]
> **What batch jobs produce:** search indexes (built offline, then swapped in atomically), precomputed recommendations, machine-learning features, and read-only key-value stores bulk-loaded into serving systems. Because outputs are new files rather than in-place changes, **rolling back a bad run** just means pointing back at yesterday's output.

## In the interview

> [!IMPORTANT]
> **Interviewer asks:** "Web crawler for 10B pages?"  
> → The frontier queue feeds fetchers. Text extraction and dedup run as batch (Spark) over S3. Re-runnable because raw pages are stored immutably.

> [!IMPORTANT]
> **Interviewer asks:** "Daily top-K or reconciliation reports?"  
> → Nightly batch over the event log in S3 or the warehouse. The streaming path gives fast approximate results and batch gives exact ones (Ch 12, Lambda).

> [!IMPORTANT]
> **Interviewer asks:** "How do you rebuild the search index?"  
> → Batch-build a new index from the source of truth, then atomically switch the alias. Old index kept for rollback.

> [!TIP]
> **Say this in the interview:** "Raw events land immutably in S3, partitioned by date. Any derived table can be recomputed from them, which is our safety net for bugs."

---

← [Ch 9: Consistency and consensus](09-consistency-and-consensus.md) · [Ch 11: Stream processing](11-stream-processing.md) →
