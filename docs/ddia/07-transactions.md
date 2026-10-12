---
title: "DDIA Ch 7: Transactions"
description: "What transactions really guarantee: ACID, isolation levels and the bugs each allows (dirty reads, read skew, lost updates, write skew), with the fixes."
tags: [ddia]
---

# DDIA Chapter 7: Transactions

<span class="lvl lvl-a">Advanced</span>

> These DDIA pages are study notes in our own words and diagrams, connecting the book to interview problems. They don't replace the book; *Designing Data-Intensive Applications* by Martin Kleppmann is worth reading in full.

> [!TIP]
> **One-page sketchnote:** [DDIA 7 · TRANSACTIONS on a single page](../sketchnotes/ddia-07.svg), for revision or printing.

## TL;DR

A transaction groups reads and writes into one unit: all of it happens or none of it does, and concurrent transactions don't see each other's half-finished work. Most interview "contention" questions, such as seat booking, inventory, payments, and auctions, come down to which **isolation anomaly** you are defending against.

**Key ideas:** ACID · dirty reads · read skew · MVCC · lost update · write skew · phantoms · 2PL · SSI

## What ACID really means

*ACID*

A **transaction** wraps several reads and writes into one unit: `BEGIN … COMMIT`. The point is to let you write code as if nothing else were happening, and as if nothing could fail halfway through. The database handles the messy cases. Databases describe this promise with the letters **ACID**, but each letter means something more specific (and sometimes weaker) than people assume:

| Letter | Common belief | What it actually guarantees |
|---|---|---|
| A · Atomicity | "Atomic like threads" | **Abortability**: on any error mid-transaction, all writes are rolled back. Safe to retry. |
| C · Consistency | "DB keeps data consistent" | Your **application's invariants** (debits = credits). This one is mostly the app's job, not the DB's. |
| I · Isolation | "Transactions are serial" | Concurrent transactions don't interfere. The strength depends on the **isolation level**, and most DBs default to weaker than serializable. |
| D · Durability | "Never lost" | Committed data survives crashes (WAL + fsync, or replication). Nothing is 100%. |

The letter that causes nearly all interview bugs is **I**. Perfect isolation would mean concurrent transactions behave as if they ran one after another. That is expensive, so databases offer weaker **isolation levels**, each allowing certain kinds of interference, called **anomalies**. The rest of this chapter goes through them from weakest to strongest, with the bug each one lets through.

> [!WARNING]
> **The default is not serializable:** Postgres defaults to **Read Committed**, and MySQL InnoDB to Repeatable Read. Neither prevents write skew, so booking code can double-book unless you add locks or constraints.

## Read committed: no dirty reads, no dirty writes

*Weakest useful level*

The most basic promise: you never see another transaction's **unfinished** work.

![Read committed: no dirty reads, no dirty writes](../diagrams/ddia-07-2.svg)

1. Transaction 1 sets an account balance to 0 but hasn't committed yet. It might still roll back.
2. Without isolation, Transaction 2 reads the balance and sees **0**. That is a **dirty read**: reading data that isn't committed.
3. Transaction 1 hits an error and **rolls back**. The balance was never really 0, but Transaction 2 has already acted on it, perhaps declining a payment or sending a "you're overdrawn" email.
4. **Read committed** prevents this. Readers always see the **last committed** value; Transaction 2 sees the old balance until Transaction 1 commits. It also prevents **dirty writes** (overwriting someone else's uncommitted change) by locking a row from the moment it is written until commit. This is Postgres's default level.

## Read skew → snapshot isolation (MVCC)

*Repeatable read*

Read committed still has a gap: if your transaction reads several things, **other transactions can commit in between your reads**, and you see a mix of before and after.

![Read skew → snapshot isolation (MVCC)](../diagrams/ddia-07-3.svg)

1. Alice has $500 in each of two accounts, $1,000 in total. She opens her banking app, which reads account 1: **$500**.
2. At that moment, a transfer of $100 from account 2 to account 1 runs and commits.
3. The app then reads account 2: **$400**, the value after the transfer. Alice sees a total of $900, and $100 seems to have vanished. This is **read skew**: each read was of committed data, but they came from different moments. For Alice a refresh fixes it, but for a backup, an analytics query or an integrity check ("do all balances add up?"), it produces wrong results.
4. **Snapshot isolation** fixes it: each transaction reads from a **consistent snapshot** of the database as it was when the transaction started. Changes committed later are invisible to it, so Alice sees $500 + $500.

How can the database show each transaction a different point in time? With **MVCC** (multi-version concurrency control). It keeps **several versions** of each row, each tagged with the ID of the transaction that created it, and of the one that deleted it, if any. A transaction simply ignores versions created after it started. A nice consequence: **readers never block writers, and writers never block readers.**

> [!NOTE]
> **MVCC in one line:** an UPDATE doesn't overwrite. It marks the old version "deleted by transaction 13" and inserts a new version "created by transaction 13". Your snapshot ignores versions from transactions that started after you. Old versions are cleaned up later (Postgres calls this VACUUM).

## Lost update: read-modify-write races

*Concurrent writes*

A very common pattern in application code: **read** a value, **change** it in code, **write** it back. Run it twice at the same time and one change disappears.

![Lost update: read-modify-write races](../diagrams/ddia-07-4.svg)

1. A post has 42 likes. Users A and B both click "like" at the same moment, and both requests read `likes = 42`.
2. Both compute 42 + 1 and write **43**. The second write overwrites the first. There should be 44 likes, and one is **lost**. No error was raised.

Three ways to fix it, from simplest to most general:

3. **Atomic operation:** let the database do the read and write as one step: `UPDATE posts SET likes = likes + 1 WHERE id = ?`. There's no gap to race in. Redis `INCR` works the same way. Use this whenever the change can be expressed this way.
4. **Pessimistic lock:** `SELECT … FOR UPDATE` locks the row when you read it, so the second request **waits** until the first commits, then reads 43. Good when many requests fight over the same rows.
5. **Optimistic check (compare-and-set):** keep a `version` column. Write with `UPDATE … SET likes = 43, version = 8 WHERE id = ? AND version = 7`. If another write got there first, the version is no longer 7, **zero rows** are updated, and you re-read and retry. Good when conflicts are rare. (Postgres at Repeatable Read also detects lost updates itself and aborts one of the transactions.)

> [!TIP]
> **Say this in the interview:** "For the auction, bids use a conditional write, UPDATE … SET max_bid=? WHERE max_bid < ?, so concurrent bids can't overwrite each other."

## Write skew: the double-booking bug

*The anomaly that bites interviews*

This is the hardest anomaly to spot, because the two transactions **don't write the same row**, so nothing looks like a conflict.

![Write skew: the double-booking bug](../diagrams/ddia-07-5.svg)

1. A hospital rule: **at least one doctor must be on call**. Alice and Bob are both on call, and both feel unwell. At the same moment, each asks the app to go off call. Each transaction checks: "how many doctors are on call?" Both see **2**, so it's safe for one to leave.
2. Alice's transaction sets **Alice** off call. Bob's sets **Bob** off call. They update **different rows**, so there's no write conflict, and even snapshot isolation lets both commit. Now **zero** doctors are on call. Each decision was correct on its own snapshot; together they broke the rule. This is **write skew**.
3. It's the shape of nearly every booking bug: "check that the room is free (no booking row exists), then insert a booking". Two requests both see no booking and both insert one. Here there isn't even an existing row to lock, because the conflict is about a row that **doesn't exist yet**, a **phantom**.
4. The fixes:
   - **Lock the rows you checked** with `SELECT … FOR UPDATE`, so the second transaction waits and then sees the first one's change.
   - Use the **SERIALIZABLE** isolation level and retry on abort.
   - Add a **unique constraint** such as `UNIQUE (room_id, date)`, so the database rejects the second booking.
   - **Materialize the conflict**: create a row in advance for every seat, or every room-night, so there's always a real row to lock or conditionally update.

> [!TIP]
> **Say this in the interview:** "Each seat is a row with status AVAILABLE/HELD/SOLD. A hold is UPDATE seats SET status=HELD WHERE id=? AND status=AVAILABLE. If one row was updated I won it, if zero someone else did. No write skew possible."

## Isolation levels: what each prevents

*Cheat sheet*

Putting it together: each level closes more gaps and costs more. Know your database's **default**, and know which anomaly your feature is exposed to.

| Anomaly | Read Committed | Snapshot / Repeatable Read | Serializable |
|---|---|---|---|
| Dirty read / write | ✓ prevented | ✓ | ✓ |
| Read skew (non-repeatable read) | ✗ | ✓ prevented | ✓ |
| Lost update | ✗ (use atomic op / lock) | ✓ Postgres detects; MySQL ✗ | ✓ |
| Write skew | ✗ | ✗ | ✓ prevented |
| Phantoms | ✗ | ✗ (mostly) | ✓ prevented |
| Default in | Postgres, Oracle, SQL Server | MySQL InnoDB | CockroachDB, FoundationDB |

> [!NOTE]
> **Serializable, three ways:** **actual serial execution** runs transactions one at a time on a single thread, which is fast if each is tiny (VoltDB, Redis Lua scripts). **Two-phase locking (2PL)** makes readers and writers block each other. **Serializable snapshot isolation (SSI)** lets everyone run, then aborts transactions whose reads went stale. The last two are compared next.

## Two-phase locking vs serializable snapshot isolation

*Serializability*

There are two main ways a database provides full serializability while running transactions in parallel: wait when there might be a conflict (**pessimistic**), or carry on and check at the end (**optimistic**).

![Two-phase locking vs serializable snapshot isolation](../diagrams/ddia-07-7.svg)

1. **Two-phase locking (2PL), pessimistic:** reading a row takes a shared lock, and writing needs an exclusive lock. Locks are held until the transaction ends. If Transaction 1 has read a row, Transaction 2 must **wait** to write it. It is correct, but under contention transactions queue behind each other, throughput drops, latency becomes unpredictable, and **deadlocks** happen (the database kills one transaction to break them).
2. **Serializable snapshot isolation (SSI), optimistic:** everyone runs on their own snapshot with no blocking. At commit, the database checks: "has anything this transaction **read** been changed by a transaction that committed since?" If so, the decision might have been based on stale data, so this transaction is **aborted** and the application retries it. This is fast when conflicts are rare. When many transactions fight over the same rows, it causes lots of aborts and retries. Postgres's SERIALIZABLE level uses SSI.

## In the interview

> [!IMPORTANT]
> **Interviewer asks:** "Two users book the last room at the same time."  
> → Write skew. Use a row per room-night + **conditional UPDATE**, or SELECT FOR UPDATE, or a unique constraint on (room, date).

> [!IMPORTANT]
> **Interviewer asks:** "Like counter at 50k/sec?"  
> → Not row locks. Use atomic INCR in Redis, sharded counters, or batch into the DB asynchronously. The lost update is avoided because the increment is atomic.

> [!IMPORTANT]
> **Interviewer asks:** "Optimistic or pessimistic?"  
> → Low contention: optimistic version check. High contention on few rows (hot seat map): pessimistic lock or a queue to serialize.

> [!IMPORTANT]
> **Interviewer asks:** "Transaction across 2 services?"  
> → No distributed ACID. Use a **saga** with compensations plus the outbox pattern (Ch 9 and 12).

---

← [Ch 6: Partitioning](06-partitioning.md) · [Ch 8: Trouble with distributed systems](08-trouble-with-distributed-systems.md) →
