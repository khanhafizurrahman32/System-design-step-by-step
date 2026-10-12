---
title: "DDIA Ch 4: Encoding & Evolution"
description: "Why old and new code must read each other's data during deploys, how Protobuf and Avro make that safe, and the three ways data flows between services."
tags: [ddia]
---

# DDIA Chapter 4: Encoding & Evolution

<span class="lvl lvl-i">Intermediate</span>

> These DDIA pages are study notes in our own words and diagrams, connecting the book to interview problems. They don't replace the book; *Designing Data-Intensive Applications* by Martin Kleppmann is worth reading in full.

> [!TIP]
> **One-page sketchnote:** [DDIA 4 · ENCODING & EVOLUTION on a single page](../sketchnotes/ddia-04.svg), for revision or printing.

## TL;DR

Data outlives code. During a rolling deploy, old and new versions of your service run at the same time, reading each other's data. Encoding formats such as Protobuf, Avro, and JSON decide whether that works or silently corrupts data.

**Key ideas:** backward compat · forward compat · Protobuf field tags · Avro schemas · schema registry · REST / RPC / messages

## Rolling upgrade: old and new code at the same time

*Why compatibility matters*

You almost never upgrade every server at the same instant. A **rolling deploy** replaces servers a few at a time, and mobile apps stay on old versions for months. So at any moment, **old code and new code are running side by side**, reading and writing the same database and the same messages. Each version must cope with data written by the other.

There are two directions to think about:

- **Backward compatibility:** new code can read data written by old code. This is usually easy: you know the old format, so you handle it.
- **Forward compatibility:** old code can read data written by new code. This is harder, because the old code was written before the new format existed.

Here is the classic way forward compatibility goes wrong:

![Rolling upgrade: old and new code at the same time](../diagrams/ddia-04-1.svg)

1. You deploy v2 of the user service, which adds a new field, `phone`. A user updates their profile through a v2 server, and the record now includes a phone number.
2. The same user, a minute later, hits a server still running v1. It reads the record.
3. v1 decodes the record into its `User` class, which has no `phone` field, so the phone number is silently dropped in memory.
4. The user changes their name. v1 writes the **whole object** back, without `phone`. The phone number is now deleted from the database, and no error was raised anywhere.

The rule that prevents this: **old code must keep fields it doesn't understand** and write them back unchanged. Good encoding libraries (Protobuf, Avro) do this for you. Hand-written mapping code often doesn't.

> [!NOTE]
> **Summary of the two directions:** **backward compatible** means new code reads old data (easy). **Forward compatible** means old code reads new data (hard, and the example above).

## Protobuf / Thrift: field tags make evolution safe

*Binary encoding*

When data leaves a process, to disk or across the network, it must be turned into bytes (**encoding** or serialization). The format you choose decides how big the data is, how fast it is to process, and above all how safely it can **evolve**.

![Protobuf / Thrift: field tags make evolution safe](../diagrams/ddia-04-2.svg)

1. **JSON** is readable and everywhere, but it repeats every field name in every record, has no schema to check against, and is vague about numbers. JavaScript, for example, loses precision on integers above 2⁵³, which breaks large IDs.
2. **Protocol Buffers** (and Thrift) use a schema file in which every field gets a **tag number**: `string name = 1; string phone = 2;`. The encoded bytes contain only the tag numbers and values, not the names, so records are typically 2–3× smaller than JSON and faster to parse. Code for reading and writing is generated from the schema.
3. Tags are what make evolution safe. A reader that meets a tag it doesn't know just **skips it** (or keeps it, to write back). So the rules are: **add new fields with new tag numbers**, make them optional, and **never reuse** a tag number that was once used for something else.
4. Breaking changes are anything that makes old and new code read the same bytes differently: making a field required, changing a field's tag number, or changing its type to something incompatible (such as a string to a number).

> [!NOTE]
> **Avro does it differently:** Avro has no tag numbers. The reader is given **two schemas**, the one the data was written with (writer's schema) and the one it expects (reader's schema), and matches fields **by name**. That means every schema version must be stored somewhere, usually a **schema registry**, with each message carrying a schema ID. This setup is very common with Kafka.

## Three ways data flows between processes

*Modes of dataflow*

Encoded data travels in three main ways. Each has its own compatibility concerns.

![Three ways data flows between processes](../diagrams/ddia-04-3.svg)

1. **Through a database.** Writing to a database is like sending a message to your future self, or to a newer version of your code. A row written five years ago must still be readable today. Data outlives code, so you can't just rename a column and forget the old rows.
2. **Through service calls** (REST, gRPC). This looks like calling a function, but it isn't one. The call can time out, the network can lose the reply, and a retry can run it twice (see Chapter 8). And because client and server deploy separately, the API must stay compatible: add optional fields, never change the meaning of existing ones, and use a new version (`/v2/`) for breaking changes.
3. **Through messages** (Kafka, RabbitMQ). The sender doesn't wait for the receiver. A broker in between stores the message, retries delivery and can deliver to several consumers. Producers and consumers are deployed by different teams at different times, so a schema registry that **rejects incompatible schema changes** keeps them from breaking each other.

> [!WARNING]
> **The RPC illusion:** frameworks that make a remote call look exactly like a local function call hide the important parts: timeouts, retries and partial failure. Design every remote call with a timeout, and make it **idempotent** so a retry is harmless.

## In the interview

> [!IMPORTANT]
> **Interviewer asks:** "How do you deploy schema changes with zero downtime?"  
> → **Expand → migrate → contract**: add the nullable column, deploy code that writes both, backfill, switch reads, and only then drop the old column.

> [!IMPORTANT]
> **Interviewer asks:** "How do Kafka producers and consumers evolve?"  
> → Avro or Protobuf with a **schema registry** enforcing backward-compatible changes. Consumers upgrade on their own schedule.

> [!IMPORTANT]
> **Interviewer asks:** "REST or gRPC between services?"  
> → gRPC (Protobuf, HTTP/2) for internal high-QPS calls; REST/JSON for public APIs and browsers.

> [!TIP]
> **Say this in the interview:** "Every message carries a schema version, and we only add optional fields. That lets the booking service deploy without coordinating with its consumers."

---

← [Ch 3: Storage and retrieval](03-storage-and-retrieval.md) · [Ch 5: Replication](05-replication.md) →
