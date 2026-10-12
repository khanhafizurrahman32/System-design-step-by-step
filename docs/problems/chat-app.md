---
title: "Chat app (WhatsApp)"
description: "Chat looks like CRUD until you notice the two users are on different servers and one of them is offline."
tags: [real-time-updates, medium]
---

# Chat app (WhatsApp)

<span class="lvl lvl-i">Intermediate</span>

**Difficulty:** Medium · **Patterns:** [Real-time updates](../patterns/real-time-updates.md) · **DDIA:** [Ch 5](../ddia/05-replication.md) consistent prefix · [Ch 11](../ddia/11-stream-processing.md) at-least-once + idempotency

*Chat looks like CRUD until you notice the two users are on different servers and one of them is offline.*

> [!TIP]
> **One-page sketchnote:** [CHAT APP (WHATSAPP) on a single page](../sketchnotes/problem-chat-app.svg), for revision or printing.

## TL;DR

- Keep a persistent WebSocket per device; route messages between chat servers with a registry and per-user pub/sub.
- Persist each message and add it to the recipient's inbox before acknowledging the sender, so nothing is lost.
- Partition by conversation and number messages within it so every device shows the same order.

## 1. Requirements

**Functional**

1. 1:1 and group chats (up to ~100 members)
2. Send and receive messages in real time
3. Offline users get messages when they reconnect
4. Delivery and read receipts; media

**Non-functional**

- Delivery < 500ms when online
- Messages never lost
- Ordered within a chat
- 1B DAU

## 2. Back-of-envelope numbers

50B messages/day ≈ **~600k msgs/s**. Hundreds of millions of concurrent connections, at ~1M connections per tuned server → hundreds of chat servers.

## 3. Core entities and API

```text
messages(chat_id, seq, msg_id, sender, body, ts) partitioned by chat_id
inbox(device_id, msg_id) until acked
chat_members
```

```http
WS connect → send {chat_id, client_msg_id, body}; receive {msg, seq}; ack {msg_id}
POST /media → presigned upload URL
```

## 4. v1: the simplest design, and where it breaks

Each user's app keeps a **WebSocket** connection open to a chat server, so messages can flow both ways instantly without polling. Alice sends a message over her connection; the server looks up Bob's connection and writes it there.

**Where it breaks:**

- **Many servers:** with 1 billion daily users there are hundreds of millions of open connections, about 1M per well-tuned server, so **hundreds of chat servers**. Alice is almost always connected to a **different server** from Bob. The server receiving Alice's message doesn't hold Bob's connection.
- **Offline users and crashes:** if Bob's phone is off, or a server crashes after receiving the message but before delivering it, the message is lost. "Messages never lost" is the core requirement.
- **Ordering:** in a group, messages from different people pass through different servers and could appear in different orders on different phones.

## 5. Evolving to the final design

![Chat app (WhatsApp): final design](../diagrams/problem-chat-app-final.svg)

Each step fixes one specific problem with the step before it.

### Step 1: route messages between chat servers

**Why:** the sender's server and the recipient's server are usually different machines. We need a way to get a message from one to the other.

**How:** keep a **connection registry** (in Redis) of which server holds each user's device connections, and give every user a **pub/sub channel**. When Bob connects to server 2, server 2 subscribes to Bob's channel. When Alice sends a message, server 1 publishes it to Bob's channel, and server 2 receives it and delivers it down Bob's WebSocket. Server 1 doesn't need to know where Bob is.

### Step 2: persist before acknowledging, and deliver from an inbox

**Why:** a message must survive server crashes and the recipient being offline for days.

**How:** when a message arrives, **first** write it to the `messages` table (partitioned by `chat_id`) and add an entry to each recipient device's **inbox**. **Only then** acknowledge to Alice (one tick ✓). Delivery is attempted immediately. When Bob's device receives the message, it **acknowledges**, and the inbox entry is removed (two ticks ✓✓). If Bob is offline, the entry stays, a push notification is sent, and when his app reconnects it **syncs** everything waiting in its inbox.

### Step 3: order messages per chat

**Why:** everyone in a chat must see messages in the same order, and "the reply appears before the question" is confusing.

**How:** give each message a **sequence number within its chat**, assigned by a single writer for that chat (the owner of the `chat_id` partition). Clients display messages in sequence order and notice gaps (missing sequence 41 → ask to resync).

## 6. Deep dives

### Never lose a message?

**Why it's hard:** a message passes through several machines (sender's server, storage, recipient's server, recipient's device), and any of them can fail at any moment.

**How:** **persist before acknowledging**. The sender gets its tick only after the message is durably stored with an inbox entry for each recipient. Delivery from the inbox is **at-least-once**: it is retried until the device acknowledges, so a message might arrive twice after a reconnect. The client **deduplicates by `msg_id`**, which the sender's app generates once and reuses on retries, so duplicates never show.

### Ordering?

**Why it's tricky:** two group members send messages at nearly the same time through different servers. Without a single authority, each phone might order them differently. Timestamps from different machines can't be trusted to agree ([DDIA Ch 8](../ddia/08-trouble-with-distributed-systems.md)).

**How:** all messages for one chat go to the **same partition** (`chat_id` is the partition key), where **one writer** assigns increasing **sequence numbers**. That gives one agreed order per chat, which is all users need. There is no global order across chats, and none is needed. This is the "consistent prefix" guarantee from [DDIA Ch 5](../ddia/05-replication.md).

### Groups?

**Why they're different:** one message must reach up to ~100 members, each possibly on several devices and different servers.

**How:** **fan out at send time**. Store the message once, then add an inbox entry for each member's devices and publish to each member's channel. With groups capped around 100 members, that's at most a few hundred small writes per message, which is cheap. For much larger "channels" (thousands of members), switch to fan-out on read: members fetch from the channel's message log instead of getting an inbox entry each.

### Media?

**Why not send it through the chat servers:** photos and videos are megabytes. Pushing them through WebSocket servers built for tiny text messages would tie up their bandwidth and memory.

**How:** the sender's app asks for a **presigned URL** and uploads the file **directly to object storage** (S3). The chat message then carries only the **object key** (plus a small thumbnail). Recipients download the file directly, ideally through a CDN, when they open it. For end-to-end encrypted chat, the file is encrypted on the device before upload, and the key travels inside the encrypted message.

## 7. Interview script (45 minutes)

| Time | What you do | Content |
|---|---|---|
| 0–5 | Functional requirements | 1:1 and group chats (up to ~100 members); Send and receive messages in real time; Offline users get messages when they reconnect; Delivery and read receipts; media |
| 5–8 | Non-functional requirements | Delivery < 500ms when online; Messages never lost; Ordered within a chat; 1B DAU |
| 8–10 | Numbers that drive the design | 50B messages/day ≈ **~600k msgs/s**. Hundreds of millions of concurrent connections, at ~1M connections per tuned server → hundreds of chat servers. |
| 10–13 | Entities and API | Keep it short: the endpoints in §3, idempotency keys on writes. |
| 13–25 | v1, then evolve it | Draw v1 and show where it breaks. Then add, in order: Chat server 2 → Redis → Pub/sub → Cassandra → Inbox → APNs / FCM. Justify each addition with a number. |
| 25–40 | Deep dives | Never lose a message? · Ordering? · Groups? · Media? |
| 40–45 | Wrap-up | Remaining bottlenecks, failure modes, what you would monitor. |


## Staff-level lens

| Question | Staff answer |
|---|---|
| **The real problem** | Route between servers, deliver to offline devices, keep order. |
| **Deciding number** | ~600k messages/s; hundreds of millions of open connections. |
| **Staff call and trade-off** | WebSockets + user→server registry + per-user pub/sub; persist before ack; an inbox per device. Accept at-least-once delivery with client dedupe. |
| **Raise before you're asked** | Server crash holding connections; order within a chat; multi-device sync; what end-to-end encryption rules out. |
| **Senior stops at** | WebSockets + a database. |
| **Staff goes on to** | Delivery semantics, draining connections during deploys, the limits end-to-end encryption puts on server features. |
| **Run it** | Watch delivery latency, undelivered inbox size, reconnect rate. |

All 29 problems through this lens: [Staff-level answers](../playbook/staff-level.md).

## 8. Common mistakes

- Assuming both users share a server or are always online.
- Adding components before showing which number makes them necessary.
- Skipping failure handling: what happens on timeouts, retries and crashes.

## Self-check

Try to answer before you open each one.

<details class="question" markdown>
<summary>When do you acknowledge a message to the sender?</summary>

Only after it is persisted and added to the recipient's inbox, so nothing is lost if a server crashes.

</details>

<details class="question" markdown>
<summary>How do chat servers route a message to the recipient's connection?</summary>

A registry of which server holds each user's connection, plus per-user pub/sub between chat servers.

</details>

<details class="question" markdown>
<summary>How do all devices show the same message order?</summary>

Partition by conversation and number messages sequentially within each conversation.

</details>

## Related

- **Operating systems:** [OS 5: I/O models](../os/05-io-models.md) (holding millions of WebSockets)
- **Patterns:** [Real-time updates](../patterns/real-time-updates.md)
- **DDIA:** [Ch 5](../ddia/05-replication.md) consistent prefix · [Ch 11](../ddia/11-stream-processing.md) at-least-once + idempotency
- **Similar problems:** [Ride sharing (Uber)](ride-sharing.md) · [Live comments (Facebook Live)](live-comments.md) · [Collaborative editor (Google Docs)](collaborative-editor.md) · [Stock trading (Robinhood)](stock-trading.md)
