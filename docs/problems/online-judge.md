---
title: "Online judge (LeetCode)"
description: "You are running strangers' code on your servers, so isolation comes first."
tags: [multi-step-processes, medium]
---

# Online judge (LeetCode)

<span class="lvl lvl-i">Intermediate</span>

**Difficulty:** Medium · **Patterns:** [Multi-step processes](../patterns/multi-step-processes.md) · [Long-running tasks](../patterns/long-running-tasks.md) · **DDIA:** [Ch 11](../ddia/11-stream-processing.md) queues · [Ch 1](../ddia/01-reliability-scalability-maintainability.md) bursty load

*You are running strangers' code on your servers, so isolation comes first.*

> [!TIP]
> **One-page sketchnote:** [ONLINE JUDGE (LEETCODE) on a single page](../sketchnotes/problem-online-judge.svg), for revision or printing.

## TL;DR

- Run every submission in a locked-down sandbox: no network, read-only filesystem, strict CPU, memory and time limits.
- Queue submissions and return immediately; workers autoscale on queue depth and the client polls for results.
- Keep contest leaderboards in a Redis sorted set.

## 1. Requirements

**Functional**

1. Browse problems
2. Submit code in several languages; get pass/fail per test
3. Contest leaderboard

**Non-functional**

- Untrusted code fully isolated
- Result within ~5s
- Contest spikes (100k users submitting)
- Scalable

## 2. Back-of-envelope numbers

Contest: 100k users × ~5 submissions in 90 min ≈ **~100 submissions/s** peak; each run takes 1–5s of sandbox CPU, so ~500 concurrent sandboxes.

## 3. Core entities and API

```text
problems
test_cases (S3)
submissions(id, user, problem, status, results)
leaderboard:{contest} ZSET
```

```http
POST /problems/{id}/submissions {lang, code} → submission_id
GET /submissions/{id} (poll status)
GET /contests/{id}/leaderboard
```

## 4. v1: the simplest design, and where it breaks

![Online judge (LeetCode): v1 design](../diagrams/problem-online-judge-v1.svg)

When a user submits code, the API server writes it to a file, compiles and runs it against the test cases, and returns the results in the HTTP response.

**Where it breaks:**

- **Security:** you are running **code written by strangers** on your own servers. It can read your files and secrets, call your internal network, delete things, or mine cryptocurrency. This is the biggest problem.
- **Resource hogging:** one infinite loop or memory bomb ties up the API server, slowing or crashing everyone else's requests.
- **Spikes:** in a contest, 100k users submit around the same time, about **100 submissions a second**, each needing 1–5 seconds of CPU. The API servers can't run ~500 programs at once and keep serving pages.

## 5. Evolving to the final design

![Online judge (LeetCode): final design](../diagrams/problem-online-judge-final.svg)

Each step fixes one specific problem with the step before it.

### Step 1: run every submission in a locked-down sandbox

**Why:** untrusted code must not be able to affect anything outside its own run: not the host, not other submissions, not the network.

**How:** run each submission in a fresh, isolated **sandbox**: a lightweight virtual machine (Firecracker microVM) or a strongly isolated container runtime (gVisor). Inside it there's no network, a read-only filesystem except a small scratch directory, a **seccomp** filter allowing only the system calls a normal program needs, and strict **CPU, memory and time limits**. When the time limit is hit, the sandbox is killed. Each run starts clean and is thrown away afterwards.

### Step 2: queue submissions and run them on separate workers

**Why:** running code takes seconds and must not block the API. Contests create bursts far above normal load.

**How:** `POST /submissions` stores the submission as **QUEUED**, puts a job on a **queue**, and returns a `submission_id` immediately. A separate fleet of **judge workers**, autoscaled on queue depth, take jobs, run the sandbox against the test cases (stored in S3) and write results. The client **polls** `GET /submissions/{id}` about once a second until the status is final. This is the [long-running tasks](../patterns/long-running-tasks.md) pattern.

### Step 3: keep the contest leaderboard in Redis

**Why:** during a contest, thousands of users refresh the leaderboard constantly, and it changes with every accepted submission. Computing it with a database query each time would be heavy.

**How:** one Redis **sorted set** per contest, `leaderboard:{contest}`, with each user's score. Updating a score and fetching the top 50 or a user's rank are single, fast commands. The score encodes both points and penalty time, so ties are broken correctly (see deep dive).

## 6. Deep dives

### Security layers?

**Why one layer isn't enough:** sandboxes have had escape bugs. If a single mechanism fails, the attacker is on your infrastructure.

**How:** **defence in depth**, several independent layers:

- **Isolation:** a microVM (own kernel) or gVisor (a user-space kernel), stronger than a plain container.
- **No network** at all inside the sandbox.
- **Read-only filesystem**, with only a small temporary directory writable.
- **seccomp** system-call filtering and dropped Linux capabilities.
- **Resource limits** on CPU time, memory, process count and output size, with a hard **kill on timeout**.
- Workers run on separate machines in a separate network, with no access to secrets or production databases.

An attacker would have to break several layers at once.

### Contest spike?

**Why it's hard:** when a contest starts, demand jumps from a trickle to ~100 submissions a second within minutes, and slow results make contestants furious.

**How:** the **queue absorbs** the burst, so nothing is dropped, and results just take a little longer. **Autoscale workers on queue depth**, and since contests are scheduled, **pre-scale** before the start. **Pre-warm** sandboxes for each language, because starting a JVM or compiler environment from scratch is slow. Optionally, give contest submissions their own higher-priority queue.

### Polling vs push?

**Why it's a choice:** the client needs to know when results are ready. Push (SSE or WebSocket) is faster; polling is simpler.

**How to decide:** results take a few seconds, and polling once a second at ~100 submissions a second means only a few hundred cheap status reads a second, which is trivial. Polling is perfectly fine here and avoids managing long-lived connections. Add SSE later if you want live per-test progress.

### Leaderboard ties?

**Why it matters:** contests rank first by **points**, then by **time penalty** (less is better). A sorted set sorts by one number only.

**How:** combine both into a single score: `score = points × 1,000,000 − penalty_seconds`. More points always wins, because one point is worth more than any possible penalty; among equal points, lower penalty gives a higher score. Sort descending, and `ZREVRANGE` gives the correct ranking.

## 7. Interview script (45 minutes)

| Time | What you do | Content |
|---|---|---|
| 0–5 | Functional requirements | Browse problems; Submit code in several languages; get pass/fail per test; Contest leaderboard |
| 5–8 | Non-functional requirements | Untrusted code fully isolated; Result within ~5s; Contest spikes (100k users submitting); Scalable |
| 8–10 | Numbers that drive the design | Contest: 100k users × ~5 submissions in 90 min ≈ **~100 submissions/s** peak; each run takes 1–5s of sandbox CPU, so ~500 concurrent sandboxes. |
| 10–13 | Entities and API | Keep it short: the endpoints in §3, idempotency keys on writes. |
| 13–25 | v1, then evolve it | Draw v1 and show where it breaks. Then add, in order: Sandbox → Postgres → Queue (SQS) → Workers → Redis ZSET. Justify each addition with a number. |
| 25–40 | Deep dives | Security layers? · Contest spike? · Polling vs push? · Leaderboard ties? |
| 40–45 | Wrap-up | Remaining bottlenecks, failure modes, what you would monitor. |


## Staff-level lens

| Question | Staff answer |
|---|---|
| **The real problem** | Run untrusted code safely, through contest spikes. |
| **Deciding number** | ~100 submissions/s at peak; ~500 sandboxes running at once. |
| **Staff call and trade-off** | Queue + microVM sandboxes + autoscaling workers. Accept a few seconds of latency. |
| **Raise before you're asked** | Sandbox escape; noisy neighbours; contest start spike (pre-warm capacity). |
| **Senior stops at** | Queue + containers. |
| **Staff goes on to** | Defence in depth for isolation, pre-warming before contests, fairness between users. |
| **Run it** | Watch queue wait, sandbox start time, verdict latency. |

All 29 problems through this lens: [Staff-level answers](../playbook/staff-level.md).

## 8. Common mistakes

- Executing user code with network access or on shared API hosts.
- Adding components before showing which number makes them necessary.
- Skipping failure handling: what happens on timeouts, retries and crashes.

## Self-check

Try to answer before you open each one.

<details class="question" markdown>
<summary>What sandbox limits does a submission run under?</summary>

No network, read-only filesystem, and strict CPU, memory and time limits, in an isolated container or VM.

</details>

<details class="question" markdown>
<summary>Why queue submissions instead of running them in the request?</summary>

Runs are slow and spiky (contests); a queue lets workers autoscale on depth while the client polls for the result.

</details>

<details class="question" markdown>
<summary>Where do contest leaderboards live?</summary>

In a Redis sorted set keyed by contest, with score and tie-break encoded.

</details>

## Related

- **Operating systems:** [OS 8: Containers](../os/08-containers.md) (namespaces, cgroups and sandboxes)
- **Patterns:** [Multi-step processes](../patterns/multi-step-processes.md) · [Long-running tasks](../patterns/long-running-tasks.md)
- **DDIA:** [Ch 11](../ddia/11-stream-processing.md) queues · [Ch 1](../ddia/01-reliability-scalability-maintainability.md) bursty load
- **Similar problems:** [Payment system (Stripe)](payment-system.md) · [Job scheduler](job-scheduler.md)
