---
title: "Networking essentials"
description: "How a request travels from a user to your service, and which protocol to pick for which job."
tags: [core-concept]
---

# Networking essentials

<span class="lvl lvl-b">Beginner-friendly</span>

*How a request travels from a user to your service, and which protocol to pick for which job.*

## What you need to know

You don't need to be a network engineer for system design interviews. You need to know the path a request takes, what a load balancer does at each "layer", and which protocol to pick for which kind of communication. (For the full step-by-step of a page load, see [What happens when you type a URL](../101/type-a-url.md).)

## The request path, and two kinds of load balancer

![Concept 1: Networking essentials](../diagrams/concept-networking.svg)

1. The client looks up your domain name in **DNS** and gets back the IP address of your **load balancer**, not of an individual server. The load balancer spreads requests across many servers, and lets you add, remove or replace servers without clients noticing.
2. An **L4 load balancer** works at the transport layer (TCP/UDP). It sees IP addresses and ports, but not the content of the request. It just forwards each **connection** to a server. That makes it very fast and cheap, and good for long-lived connections such as WebSockets, or for non-HTTP protocols.
3. An **L7 load balancer** works at the application layer (HTTP). It reads each **request**, so it can route by path (`/api/*` to service A, `/ws/*` to service B), by header or by cookie. It can also decrypt HTTPS (**TLS termination**), add headers, retry failed requests, and keep a user on the same server (**sticky sessions**). It's more flexible, but does more work per request.

Most systems use both: an L4 balancer at the very edge for raw throughput, and L7 (often an API gateway) in front of the services.

## Which protocol for what

The key question is **who needs to send data to whom, and how often**:

| Protocol | Use |
|---|---|
| REST over HTTP | Default public API |
| gRPC (HTTP/2 + Protobuf) | Internal service-to-service, high QPS |
| SSE | Server→client stream (feeds, tokens, comments) |
| WebSocket | Bidirectional real-time (chat, docs, games) |
| Long polling | Fallback push when nothing else works |

- **The client asks, the server answers** (most APIs): plain HTTP with **REST**, or **gRPC** between internal services.
- **The server needs to push updates to the client** (live comments, a stock ticker, an AI reply streaming in word by word): **Server-Sent Events (SSE)**. It's one long HTTP response that the server keeps writing to. It's simple, works through proxies, and reconnects automatically.
- **Both sides send often** (chat, collaborative editing, multiplayer games): **WebSockets**, a persistent two-way connection. These connections are long-lived and stateful, so you need to track which server holds which user's connection.
- **Long polling** (the client asks, and the server holds the request open until there is news) is a fallback for environments where neither of the above works.

See [REST vs GraphQL vs gRPC](../101/rest-graphql-grpc.md) and [HTTP versions](../101/http-versions.md) for more detail.

> [!TIP]
> **One-page sketchnote:** [NETWORKING ESSENTIALS on a single page](../sketchnotes/concept-networking.svg), for revision or printing.

## Checklist

1. Public API used by browsers and partners: REST over HTTPS.
2. High-volume calls between internal services: gRPC.
3. Server pushes a stream to the client: SSE.
4. Two-way, low-latency messages: WebSocket.
5. Routing by URL path, header or cookie: L7 load balancer. Raw TCP or very high throughput: L4.

## In the interview

> [!TIP]
> "Clients talk REST through an L7 load balancer; internal services use gRPC. Live updates go over SSE, which reconnects automatically."

## Related

- Pattern: [Real-time updates](../patterns/real-time-updates.md)
