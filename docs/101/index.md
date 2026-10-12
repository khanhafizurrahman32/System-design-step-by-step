---
title: System Design 101
description: "25 one-screen explainers of the building blocks: protocols, APIs, security, reliability, databases and messaging."
---

# System Design 101

<span class="lvl lvl-b">Beginner-friendly</span>

Short explainers of the building blocks that every design takes for granted. Each one fits on a screen: **one diagram, a few paragraphs, when to use it, one line you can say in an interview, and three self-check questions.**

Read them before [Core concepts](../core-concepts/index.md), or dip in whenever a problem page mentions something you can't explain in two sentences.

## APIs & protocols

| Topic | In one line |
|---|---|
| [What happens when you type a URL](type-a-url.md) | DNS, TCP, TLS, HTTP and rendering: the journey of one page load, one step at a time. |
| [TCP vs UDP](tcp-vs-udp.md) | Reliable and ordered, or fast and fire-and-forget: the two transport protocols under almost everything. |
| [HTTP/1.1 vs HTTP/2 vs HTTP/3](http-versions.md) | How each HTTP version fixes the waiting problem of the one before it. |
| [REST vs GraphQL vs gRPC](rest-graphql-grpc.md) | Three API styles, what each is good at, and how to pick one in an interview. |
| [Webhooks vs polling](webhooks-vs-polling.md) | Asking again and again versus being called when something happens, and how to receive webhooks safely. |
| [API gateway](api-gateway.md) | One front door for your services: what belongs in it and what doesn't. |

## Security & auth

| Topic | In one line |
|---|---|
| [How HTTPS works](https-tls.md) | The TLS handshake: how a browser and server agree on secret keys over a public network. |
| [Storing passwords](storing-passwords.md) | Salt plus a slow hash: why plain hashes are not enough, and how login checks work. |
| [Sessions vs tokens](sessions-vs-tokens.md) | Server-side sessions or self-contained tokens: where the login state lives, and what that costs. |
| [JWT](jwt.md) | What is inside a JSON Web Token, what it proves, and the mistakes to avoid. |
| [OAuth 2.0](oauth.md) | How an app gets permission to act for a user at another service, without seeing their password. |
| [Single sign-on (SSO)](sso.md) | Log in once at an identity provider and get into every app that trusts it. |

## Reliability

| Topic | In one line |
|---|---|
| [Timeouts, retries and backoff](timeouts-and-retries.md) | How to call something that might be slow or down without making things worse. |
| [Circuit breaker](circuit-breaker.md) | Stop calling a dependency that is failing, fail fast, and test carefully before trusting it again. |
| [Rate limiting and load shedding](load-shedding.md) | Two ways to stay up under too much traffic: limit each caller, and drop the least important work first. |
| [Metrics, logs and traces](observability.md) | The three signals that tell you something is wrong, where, and why, and how to alert on them. |
| [Deploying safely](safe-deploys.md) | Canary, blue-green and feature flags: how to ship often without breaking production. |

## Databases & storage

| Topic | In one line |
|---|---|
| [SQL vs NoSQL](sql-vs-nosql.md) | Relational versus key-value, document, wide-column and graph databases, and how to choose. |
| [ACID and isolation levels](acid-and-isolation.md) | What a transaction promises, and which concurrency bugs each isolation level still allows. |
| [Database replication](replication.md) | Leaders, followers and replication lag: how copies of data give you read scale and failover. |
| [Block, file and object storage](storage-types.md) | Three ways to store bytes, and why images and videos almost always go to object storage. |

## Messaging

| Topic | In one line |
|---|---|
| [Message queue vs event stream](queue-vs-stream.md) | SQS and RabbitMQ versus Kafka: work distribution versus a replayable log many consumers share. |
| [Delivery guarantees](delivery-guarantees.md) | At-most-once, at-least-once and "exactly-once", and why idempotent consumers are the real answer. |
| [Transactional outbox](outbox.md) | How to save data and publish an event without ever doing only one of the two. |
| [Dead-letter queues](dead-letter-queues.md) | What to do with a message that fails every time, so it doesn't block or crash everything behind it. |

