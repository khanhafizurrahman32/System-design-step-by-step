---
title: "Long-running tasks"
description: "If work takes longer than a request should, accept it, queue it, and let the client check back."
tags: [pattern]
---

# Long-running tasks

<span class="lvl lvl-b">Beginner-friendly</span>

*If work takes longer than a request should, accept it, queue it, and let the client check back.*

> [!TIP]
> **One-page sketchnote:** [LONG-RUNNING TASKS on a single page](../sketchnotes/pattern-long-running-tasks.svg), for revision or printing.

## When to reach for it

- Work takes more than a second or two: transcoding, report generation, code execution, model inference.
- Work is bursty and expensive, so it needs backpressure.

## The problem

Some work takes far longer than a web request should: transcoding a video (minutes), generating a large report, running code submitted to an online judge, sending 100,000 emails. If you do it **inside** the HTTP request:

- **Timeouts:** load balancers and browsers give up after 30–60 seconds, so the user gets an error even if the work later succeeds.
- **Duplicates:** the client, seeing a timeout, retries, and now the work runs twice.
- **No control over load:** a burst of requests starts a burst of heavy jobs at once, all on your web servers, slowing every other request.
- **Lost work:** a deploy or crash mid-job loses it with no record.

The fix is to **separate accepting the work from doing the work**.

## The idea, step by step

![Pattern 7: Long-running Tasks](../diagrams/pattern-long-running-tasks.svg)

1. **Accept fast.** The API validates the request, writes a row in a jobs table (`status = QUEUED`), puts a message on a **queue**, and immediately returns `202 Accepted` with a `job_id`. This takes milliseconds.
2. **Do the work elsewhere.** A separate pool of **workers** takes jobs off the queue and does the heavy lifting. Because workers are separate from the web servers, each side scales on its own. Workers **autoscale on queue depth**: when 10,000 jobs are waiting, add workers; when the queue is empty, scale down. A burst just makes the queue longer for a while; nothing falls over.
3. **Report progress.** Workers update the job's status (`RUNNING`, then `DONE` with a link to the result, or `FAILED` with a reason). The client either **polls** `GET /jobs/{id}` every few seconds, or subscribes with SSE or a WebSocket for live progress. For very long jobs, send an email or push notification.
4. **Handle failure.** If a worker crashes mid-job, it never acknowledges the message, so after a **visibility timeout** the queue hands the job to another worker. Failed jobs are retried with **backoff**. A job that keeps failing (a **poison** job, for example a corrupt input file) goes to a **dead-letter queue** after a few attempts, so it doesn't block the others, and someone gets alerted.

Because a job may be retried, it might run **more than once**, so every job must be **idempotent**. Writing the result to a path named by `job_id` (so a rerun overwrites the same file), or checking "already done?" first, makes a second run harmless.

> [!NOTE]
> **Queue choice:** a simple task queue (SQS, RabbitMQ, or a Postgres table with `SELECT … FOR UPDATE SKIP LOCKED`) is enough for most job systems. Use Kafka when you also need ordering per key, replay, or several consumers of the same events (see [Message queue vs event stream](../101/queue-vs-stream.md)).

## Decision checklist

1. Return a job ID immediately (HTTP 202) and enqueue the work.
2. Workers scale on queue depth, independently of the API.
3. Store status (queued, running, done, failed); clients poll or subscribe.
4. Retry with backoff using a visibility timeout; send poison jobs to a dead-letter queue.
5. Make jobs idempotent: a retried job must not duplicate side effects.

## In the interview

> [!TIP]
> "Submission returns a job ID right away. The job goes on a queue; autoscaled workers run it and update its status, and the client polls every second."

## Common mistakes

- Doing heavy work inside the HTTP request.
- No dead-letter queue, so one bad job blocks or loops forever.
- Non-idempotent jobs combined with at-least-once delivery.

## Problems that use it

- [Distributed cache](../problems/distributed-cache.md): Design Redis itself: data structures inside one node, then distribution across many.
- [Online judge (LeetCode)](../problems/online-judge.md): You are running strangers' code on your servers, so isolation comes first.
- [Job scheduler](../problems/job-scheduler.md): Ten thousand jobs per second, each within two seconds of its scheduled time.

## The theory underneath

- [DDIA Ch 11: Stream processing](../ddia/11-stream-processing.md)
- [DDIA Ch 8: Trouble with distributed systems](../ddia/08-trouble-with-distributed-systems.md)
