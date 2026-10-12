---
title: "LLM chat (ChatGPT)"
description: "GPUs are the scarce resource, so every queueing decision is really a cost decision."
tags: [real-time-updates, hard]
---

# LLM chat (ChatGPT)

<span class="lvl lvl-a">Advanced</span>

**Difficulty:** Hard · **Patterns:** [Real-time updates](../patterns/real-time-updates.md) · **DDIA:** [Ch 11](../ddia/11-stream-processing.md) logs and streams · [Ch 1](../ddia/01-reliability-scalability-maintainability.md) tail latency

*GPUs are the scarce resource, so every queueing decision is really a cost decision.*

> [!TIP]
> **One-page sketchnote:** [LLM CHAT (CHATGPT) on a single page](../sketchnotes/problem-llm-chat.svg), for revision or printing.

## TL;DR

- Stream tokens to the client as they are generated so the first words appear in under a second.
- Put a queue with priorities in front of the GPU pool for backpressure, fairness and batching.
- Buffer tokens per message so a client that reconnects can resume where it left off.

## 1. Requirements

**Functional**

1. Send a message in a conversation
2. Stream the model's answer token by token
3. View conversation history

**Non-functional**

- Time to first token < 1s
- GPU capacity is the scarce resource
- Conversations durable
- 100M DAU; bursty

## 2. Back-of-envelope numbers

100M DAU × 10 msgs = 1B/day ≈ **12k/s** generations. Each holds a GPU for seconds, so GPUs are the bottleneck and every queueing decision is about them.

## 3. Core entities and API

```text
conversations(id, user_id)
messages(conversation_id, id, role, content, status)
```

```http
POST /conversations/{id}/messages → message_id
GET /messages/{id}/stream (SSE, Last-Event-ID resume)
GET /conversations/{id}
```

## 4. v1: the simplest design, and where it breaks

![LLM chat (ChatGPT): v1 design](../diagrams/problem-llm-chat-v1.svg)

The client sends a message, the API server calls a GPU model server, waits for the **complete** answer, and returns it in the HTTP response.

**Where it breaks:**

- **Waiting:** a long answer takes 20–30 seconds to generate. The user stares at a spinner, and the time-to-first-token target of under 1 second is impossible.
- **Timeouts:** load balancers and mobile networks often drop requests open that long. The answer is generated, but the user never sees it, so they retry, and the GPU does the work twice.
- **No backpressure:** about **12k generations a second** on average, bursting much higher, sent straight to GPUs. GPUs are the scarce, expensive resource. When they're full, requests pile up or fail randomly, with no way to prioritize.

## 5. Evolving to the final design

![LLM chat (ChatGPT): final design](../diagrams/problem-llm-chat-final.svg)

Each step fixes one specific problem with the step before it.

### Step 1: stream tokens as they're generated

**Why:** the model produces text one token at a time. Making the user wait for the last token before showing the first wastes 20+ seconds of perceived latency.

**How:** the client opens an **SSE** stream for the message, and each token is sent the moment it's generated. The first words appear in well under a second, and the rest flows in as the model writes. SSE fits because the data flows server to client, it works over plain HTTP, and it supports resuming with `Last-Event-ID`.

### Step 2: put a queue in front of the GPUs

**Why:** GPU capacity is fixed in the short term and very expensive. Demand is bursty. Without a buffer, bursts overload GPUs, and there's no way to say "paid users first" or to group requests efficiently.

**How:** `POST /messages` saves the user's message, puts a generation job on a **priority queue**, and returns a `message_id` immediately. GPU workers pull jobs when they have capacity. The queue gives:

- **backpressure:** jobs wait instead of overloading GPUs;
- **priority:** paid tiers first;
- **fairness:** limits per user;
- **batching:** a worker can run several requests together, which uses a GPU far more efficiently;
- **admission control:** when the queue is too long, new requests get a clear `429`.

### Step 3: buffer tokens per message so clients can resume

**Why:** phones switch networks and tabs get closed. If tokens go straight from the GPU to one connection, a dropped connection loses the rest of the answer, even though the GPU keeps generating it.

**How:** workers write each token to a **Redis Stream** keyed by `message_id`. SSE servers **read from that stream** and forward to the client. If the client reconnects (to any server) with `Last-Event-ID`, the SSE server continues from that position. When generation finishes, the full text is saved to the `messages` table, and the Redis stream expires.

## 6. Deep dives

### Why a queue before GPUs?

**Why it's needed:** a GPU can serve only a limited number of generations at once, and each one holds it for seconds. Unlike stateless web servers, you can't spin up thousands more in a minute.

**How it helps:** the queue turns overload into **waiting** instead of **failure**, and gives you control over who waits: paid before free, short before long, a fair share per user. Workers can pull several jobs at once and **batch** them on the GPU. Generating for 8 users together costs much less than 8 separate runs. When the wait gets too long, return `429` with a retry hint rather than letting requests time out.

### Client disconnects?

**Why it matters:** generation is expensive. Throwing away a half-finished answer because the user's Wi-Fi blinked wastes GPU time and frustrates the user.

**How:** **decouple generation from the connection**. The worker keeps generating and appending tokens to the message's Redis Stream whether or not anyone is connected. The client reconnects with `Last-Event-ID` (the last token it received) and receives everything after it. If the user really leaves and nobody reads the stream for a while, the job can be cancelled to save GPU time.

### Long context?

**Why it's a problem:** the model can read only a limited amount of text (its **context window**), and the cost grows with the length of input. A conversation with hundreds of messages may not fit, and resending all of it on every turn is expensive.

**How:** load the **most recent** messages that fit, and replace older parts with a **summary** that is generated once and stored with the conversation. Keep hot conversations' recent messages **cached** so each turn doesn't hit the database. Some model servers can also cache the processed prefix of a conversation (KV or prompt caching), making repeat turns cheaper.

### Cost control?

**Why it's needed:** every generated token costs GPU time. One user or script sending thousands of long requests could consume a large share of capacity.

**How:** enforce **per-user rate limits** (requests per minute) and **token quotas** (tokens per day, by plan) at the API gateway, before anything reaches the queue. Cap the maximum output length per request. Track usage per user for billing and abuse detection.

## 7. Interview script (45 minutes)

| Time | What you do | Content |
|---|---|---|
| 0–5 | Functional requirements | Send a message in a conversation; Stream the model's answer token by token; View conversation history |
| 5–8 | Non-functional requirements | Time to first token < 1s; GPU capacity is the scarce resource; Conversations durable; 100M DAU; bursty |
| 8–10 | Numbers that drive the design | 100M DAU × 10 msgs = 1B/day ≈ **12k/s** generations. Each holds a GPU for seconds, so GPUs are the bottleneck and every queueing decision is about them. |
| 10–13 | Entities and API | Keep it short: the endpoints in §3, idempotency keys on writes. |
| 13–25 | v1, then evolve it | Draw v1 and show where it breaks. Then add, in order: SSE servers → Request queue → Inference workers → Redis Streams. Justify each addition with a number. |
| 25–40 | Deep dives | Why a queue before GPUs? · Client disconnects? · Long context? · Cost control? |
| 40–45 | Wrap-up | Remaining bottlenecks, failure modes, what you would monitor. |


## Staff-level lens

| Question | Staff answer |
|---|---|
| **The real problem** | GPUs are scarce; every queueing choice is a cost choice. |
| **Deciding number** | ~12k generations/s, each holding a GPU for seconds. |
| **Staff call and trade-off** | Priority queue with admission control in front of the GPU pool, streamed tokens. Accept 429s or waiting for the free tier. |
| **Raise before you're asked** | Client disconnecting mid-stream; GPU pool failures; runaway cost. |
| **Senior stops at** | Streaming. |
| **Staff goes on to** | Capacity planned in GPU-seconds, fairness and priority policy, batching for throughput, cost per request. |
| **Run it** | Watch time-to-first-token, queue wait, GPU utilisation, cost per 1k tokens. |

All 29 problems through this lens: [Staff-level answers](../playbook/staff-level.md).

## 8. Common mistakes

- Holding a synchronous connection through the load balancer straight to a GPU.
- Adding components before showing which number makes them necessary.
- Skipping failure handling: what happens on timeouts, retries and crashes.

## Self-check

Try to answer before you open each one.

<details class="question" markdown>
<summary>Why stream tokens rather than wait for the full answer?</summary>

The first words appear in under a second, which matters more to users than total time.

</details>

<details class="question" markdown>
<summary>Why put a queue in front of the GPUs?</summary>

Backpressure, fairness across users with priorities, and batching requests for GPU efficiency.

</details>

<details class="question" markdown>
<summary>A client disconnects mid-answer. What happens?</summary>

Tokens are buffered per message, so the reconnecting client resumes from where it left off.

</details>

## Related

- **Patterns:** [Real-time updates](../patterns/real-time-updates.md)
- **DDIA:** [Ch 11](../ddia/11-stream-processing.md) logs and streams · [Ch 1](../ddia/01-reliability-scalability-maintainability.md) tail latency
- **Similar problems:** [Ride sharing (Uber)](ride-sharing.md) · [Live comments (Facebook Live)](live-comments.md) · [Collaborative editor (Google Docs)](collaborative-editor.md) · [Stock trading (Robinhood)](stock-trading.md)
