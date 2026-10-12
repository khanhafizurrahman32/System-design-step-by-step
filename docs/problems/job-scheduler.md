---
title: "Job scheduler"
description: "Ten thousand jobs per second, each within two seconds of its scheduled time."
tags: [multi-step-processes, hard]
---

# Job scheduler

<span class="lvl lvl-a">Advanced</span>

**Difficulty:** Hard · **Patterns:** [Multi-step processes](../patterns/multi-step-processes.md) · [Long-running tasks](../patterns/long-running-tasks.md) · **DDIA:** [Ch 9](../ddia/09-consistency-and-consensus.md) leader election · [Ch 8](../ddia/08-trouble-with-distributed-systems.md) leases / fencing · [Ch 6](../ddia/06-partitioning.md) time partitioning

*Ten thousand jobs per second, each within two seconds of its scheduled time.*

> [!TIP]
> **One-page sketchnote:** [JOB SCHEDULER on a single page](../sketchnotes/problem-job-scheduler.svg), for revision or printing.

## TL;DR

- Cron on one machine is a single point of failure that can't scale.
- Store executions partitioned by time; a poller moves soon-due jobs into a delay queue that releases each on time.
- Workers lease jobs with a visibility timeout, so crashed jobs are retried; jobs must be idempotent.

## 1. Requirements

**Functional**

1. Schedule jobs: one-off at time T, or cron
2. Execute jobs with a retry policy
3. View job status and history

**Non-functional**

- 10k job executions/s
- Start within 2s of scheduled time
- At-least-once; jobs idempotent
- Never lose a job; billions of jobs stored

## 2. Back-of-envelope numbers

10k executions/s = 864M/day. A DB poll every second for "due now" across billions of rows will not hold, so use a two-layer design.

## 3. Core entities and API

```text
jobs(id, user, schedule, payload)
executions(time_bucket, execution_id, job_id, scheduled_at, status, attempt) partitioned by time bucket
```

```http
POST /jobs {schedule (cron | at), payload, retry_policy}
GET /jobs/{id}/executions
```

## 4. v1: the simplest design, and where it breaks

![Job scheduler: v1 design](../diagrams/problem-job-scheduler-v1.svg)

Use **cron** on one server: each scheduled job is a line in the crontab, and the server runs it at the right time.

**Where it breaks:**

- **Single point of failure:** if that server is down at 9:00, every 9:00 job silently doesn't run. If it's down for an hour, an hour of jobs are lost.
- **Scale:** the requirement is **10k job executions a second** (864 million a day) from **billions** of stored jobs. One machine can't run that many, and a crontab can't hold billions of entries.
- **No retries or history:** if a job fails, nobody knows and nothing retries it, and users can't see what ran.

## 5. Evolving to the final design

![Job scheduler: final design](../diagrams/problem-job-scheduler-final.svg)

Each step fixes one specific problem with the step before it.

### Step 1: store executions in a database, partitioned by time

**Why:** jobs must survive any server failure, and we need to quickly find "what's due soon" among billions of rows.

**How:** store each job's definition in `jobs`, and each upcoming **run** as a row in `executions`, **partitioned by time bucket** (say, one partition per hour). For recurring jobs, after a run completes, the next one is inserted. A **poller** periodically reads the current and next buckets to find executions due in the next few minutes. Partitioning by time means it reads only a tiny, relevant slice instead of scanning billions of rows.

### Step 2: add a delay queue for second-level precision

**Why:** jobs must start within **2 seconds** of their scheduled time. Polling the database every second for exactly-due jobs at 10k a second would hammer it. Polling every few minutes is gentle, but far too coarse.

**How:** use **two layers**. The poller scans the database every few minutes for jobs due **soon**, and hands each to a **delay queue** that releases it at its exact time. Examples: a Redis sorted set scored by timestamp, polled every few hundred milliseconds with "give me everything with score ≤ now", or SQS with a per-message delay (up to 15 minutes). The database sees a gentle, batched read; the in-memory delay queue handles the precise timing.

### Step 3: run on workers with leases, and coordinate the pollers

**Why:** workers crash mid-job, and a crashed job must run again rather than vanish. And several pollers must not hand out the same execution twice.

**How:** workers take jobs from the queue with a **visibility timeout** (a **lease**). While a worker holds it, nobody else sees the job. If the worker dies, the lease expires and the job reappears for another worker. That makes execution **at-least-once**, so jobs must be **idempotent**. Pollers either each own separate time-bucket partitions, or one is **elected leader** through etcd or ZooKeeper, so each execution is enqueued by exactly one poller.

## 6. Deep dives

### How do you hit 2s precision?

**Why it's hard:** precision means checking often, and checking a huge database often is expensive. Those pull in opposite directions.

**How:** split them. **Coarse, cheap** database scans every few minutes find jobs due in the next window (for example the next 5 minutes) and load them into a **precise, in-memory** delay structure. A Redis sorted set keyed by run time is polled every ~100–500 ms for due items, which are pushed to the work queue. Timing precision comes from the in-memory layer; durability comes from the database. If the delay layer is lost, the next database scan reloads anything not yet run.

### Worker dies mid-job?

**Why it matters:** jobs run for seconds to hours, and workers will crash, be redeployed or lose network during them.

**How:** the **lease** (visibility timeout) expires and the job becomes available again, then is retried by another worker. For long jobs, the worker sends **heartbeats** that extend its lease, so healthy long jobs aren't stolen. Danger: a worker that was paused, not dead, might wake up and finish after another worker has taken over. So completion writes carry a **fencing token**, the lease's attempt number, and the database rejects a stale one (see [fencing tokens](../ddia/08-trouble-with-distributed-systems.md)).

### Duplicate enqueues?

**Why they happen:** a poller crashes after enqueuing but before marking the execution as enqueued, and the next scan enqueues it again. Or two pollers overlap during a failover.

**How:** give every execution a unique `execution_id` and **deduplicate on it**: the queue can drop repeats (SQS FIFO deduplication), or the worker checks "already started or done?" with a conditional update on the execution's status before running. Combined with idempotent jobs, an occasional duplicate is harmless.

### User history queries?

**Why it's tricky:** executions are partitioned by **time** for the scheduler's benefit, but users ask "show **my** job runs", across all time buckets.

**How:** add a **secondary index** on `(user_id, scheduled_at)`, or keep a separate history table partitioned by `user_id` that each finished execution is written to. That way, "my last 50 runs" is a single-partition read instead of a scan across every time bucket.

## 7. Interview script (45 minutes)

| Time | What you do | Content |
|---|---|---|
| 0–5 | Functional requirements | Schedule jobs: one-off at time T, or cron; Execute jobs with a retry policy; View job status and history |
| 5–8 | Non-functional requirements | 10k job executions/s; Start within 2s of scheduled time; At-least-once; jobs idempotent; Never lose a job; billions of jobs stored |
| 8–10 | Numbers that drive the design | 10k executions/s = 864M/day. A DB poll every second for "due now" across billions of rows will not hold, so use a two-layer design. |
| 10–13 | Entities and API | Keep it short: the endpoints in §3, idempotency keys on writes. |
| 13–25 | v1, then evolve it | Draw v1 and show where it breaks. Then add, in order: Poller → Delay queue → Workers → etcd / ZK. Justify each addition with a number. |
| 25–40 | Deep dives | How do you hit 2s precision? · Worker dies mid-job? · Duplicate enqueues? · User history queries? |
| 40–45 | Wrap-up | Remaining bottlenecks, failure modes, what you would monitor. |


## Staff-level lens

| Question | Staff answer |
|---|---|
| **The real problem** | 10k jobs/s, each within 2 s of its time, never lost. |
| **Deciding number** | 864M executions/day. |
| **Staff call and trade-off** | Time-bucketed store + poller + delay queue + leases. Accept at-least-once execution, so jobs must be idempotent. |
| **Raise before you're asked** | Poller leader failing; clock drift; duplicate execution; every cron job firing at :00. |
| **Senior stops at** | A jobs table and a queue. |
| **Staff goes on to** | Reasons through the two-tier design, leader election with fencing, isolation between tenants. |
| **Run it** | Watch schedule-to-start lag p99, missed jobs, retries. |

All 29 problems through this lens: [Staff-level answers](../playbook/staff-level.md).

## 8. Common mistakes

- Polling the entire jobs table every second.
- Adding components before showing which number makes them necessary.
- Skipping failure handling: what happens on timeouts, retries and crashes.

## Self-check

Try to answer before you open each one.

<details class="question" markdown>
<summary>Why not cron on one machine?</summary>

It is a single point of failure and can't scale to many jobs.

</details>

<details class="question" markdown>
<summary>How do jobs run within about two seconds of their time?</summary>

Executions are stored partitioned by time; a poller moves soon-due jobs into a delay queue that releases each on time.

</details>

<details class="question" markdown>
<summary>A worker dies mid-job. What happens?</summary>

Its lease (visibility timeout) expires and the job is retried by another worker, so jobs must be idempotent.

</details>

## Related

- **Patterns:** [Multi-step processes](../patterns/multi-step-processes.md) · [Long-running tasks](../patterns/long-running-tasks.md)
- **DDIA:** [Ch 9](../ddia/09-consistency-and-consensus.md) leader election · [Ch 8](../ddia/08-trouble-with-distributed-systems.md) leases / fencing · [Ch 6](../ddia/06-partitioning.md) time partitioning
- **Similar problems:** [Payment system (Stripe)](payment-system.md) · [Online judge (LeetCode)](online-judge.md)
