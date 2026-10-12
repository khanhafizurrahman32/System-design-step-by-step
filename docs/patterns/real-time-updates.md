---
title: "Real-time updates"
description: "Push changes to clients the moment they happen, even when the sender and receiver are connected to different servers."
tags: [pattern]
---

# Real-time updates

<span class="lvl lvl-i">Intermediate</span>

*Push changes to clients the moment they happen, even when the sender and receiver are connected to different servers.*

> [!TIP]
> **One-page sketchnote:** [REAL-TIME UPDATES on a single page](../sketchnotes/pattern-real-time-updates.svg), for revision or printing.

## When to reach for it

- Users expect to see changes within about a second: chat, live comments, prices, collaboration, ride tracking.
- Polling would be mostly empty responses or far too frequent.

## The problem

The web was built for the client to **ask** and the server to **answer**. But many features need the server to **tell** the client something the moment it happens: a new chat message, a comment on a live stream, a driver's position, a price change. The server can't start a conversation with a browser on its own. So you need a way to **push** updates, and once you have many servers, a way to get each update to the **right** server.

## The idea, step by step

![Pattern 3: Real-time Updates](../diagrams/pattern-real-time-updates.svg)

1. **Polling.** The client asks "anything new?" every few seconds. It's simple and works everywhere. But updates arrive up to one interval late, and most requests return nothing. A million viewers polling every 2 seconds is 500,000 mostly-empty requests a second. Polling is fine when updates are slow and few people are watching, such as a dashboard refreshed every 30 seconds.
2. **Push over a held-open connection.** The client opens a connection and **keeps it open**, and the server writes to it whenever something happens:
   - **Server-Sent Events (SSE):** one-way, server to client, over ordinary HTTP. It's simple, goes through proxies, and the browser reconnects automatically. Ideal for feeds, live comments, notifications and streaming AI responses.
   - **WebSocket:** two-way. Both sides can send at any time. Needed for chat, multiplayer games and collaborative editing.
   - **Long polling:** the client asks, and the server holds the request until there's news, then the client immediately asks again. It's a fallback when the others are blocked.
3. **The multi-server problem.** You have many servers, each holding thousands of open connections. Client A is connected to Server 1. Client B, watching the same live stream, is connected to Server 2. A new comment arrives at Server 1. How does it reach Client B, whose connection lives on a **different** server?
4. **Pub/sub between servers.** Add a publish/subscribe layer such as Redis Pub/Sub or Kafka. Each server **subscribes** to the channels its connected clients care about: "video 123", "user 42", "symbol AAPL". When an event happens, it is **published once** to its channel, and every server subscribed to that channel receives it and forwards it to its own connected clients. The event source doesn't need to know where anyone is connected.

> [!NOTE]
> **Choosing:** updates rare, or a few seconds' delay is fine → **poll**. Server-to-client stream → **SSE**. Both directions, high frequency (chat, games, collaboration) → **WebSocket**. Getting events between your servers → **pub/sub**.

**Things to mention:** held-open connections are **stateful**, so a deploy or crash drops them, and clients must reconnect and catch up (send "last event ID seen"). And routing viewers of the same stream to the same few servers reduces how many channels each server must subscribe to.

## Decision checklist

1. How fresh must it be? Every 30 s or slower: just poll.
2. Server-to-client only? Use Server-Sent Events (plain HTTP, auto-reconnect).
3. Both directions, low latency? Use WebSockets.
4. Many servers? Route events with pub/sub (Redis, Kafka) to whichever server holds the connection.
5. Can events be lost? If not, persist first and let clients resume from an offset after reconnecting.

## In the interview

> [!TIP]
> "Viewers only receive, so SSE is enough. Each comment is published once to a channel per video; every server holding viewers of that video is subscribed and pushes it to them."

## Common mistakes

- Polling at large scale.
- Assuming sender and receiver share a server.
- No plan for reconnects and missed messages.

## Problems that use it

- [Ride sharing (Uber)](../problems/ride-sharing.md): Four problems in one: a flood of location updates, matching, locking drivers, and a multi-step trip lifecycle.
- [Live comments (Facebook Live)](../problems/live-comments.md): One popular stream can mean a million viewers each expecting new comments within a fraction of a second.
- [Collaborative editor (Google Docs)](../problems/collaborative-editor.md): The challenge is correctness, not scale: everyone must end up with the same document.
- [Stock trading (Robinhood)](../problems/stock-trading.md): Two separate problems: pushing live prices to millions, and never losing or duplicating an order.
- [Online auction](../problems/online-auction.md): Many people bid on one row at the same time, and exactly one of them must win each race.
- [LLM chat (ChatGPT)](../problems/llm-chat.md): GPUs are the scarce resource, so every queueing decision is really a cost decision.
- [Chat app (WhatsApp)](../problems/chat-app.md): Chat looks like CRUD until you notice the two users are on different servers and one of them is offline.

## The theory underneath

- [DDIA Ch 11: Stream processing](../ddia/11-stream-processing.md)
