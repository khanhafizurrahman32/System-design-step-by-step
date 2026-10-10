---
title: "Multi-step processes"
description: "A business action spans several services and any step can fail halfway. Make progress durable and failures reversible."
tags: [pattern]
---

# Multi-step processes

*A business action spans several services and any step can fail halfway. Make progress durable and failures reversible.*

## When to reach for it

- One user action touches several services or external APIs: booking + payment + confirmation, ride lifecycle, order fulfilment.
- Steps can take seconds to days, or depend on outside callbacks.

## The idea in one diagram

![Pattern 5: Multi-step Processes](../diagrams/pattern-multi-step-processes.svg)

1. A business action spans several services, and no distributed ACID transaction is available.
2. Any step can fail after earlier steps succeeded.
3. A **saga** runs a **compensating action** for each completed step (refund, release, cancel), in reverse order.
4. A durable orchestrator records progress after each step, so a crash resumes where it stopped instead of starting over or forgetting.

> [!NOTE]
> **Building blocks:** Outbox pattern for reliable events · idempotent steps (retries are safe) · timeouts with unknown-outcome handling.

## Decision checklist

1. Is there a cross-service transaction? Replace it with a saga: a compensating action for each step.
2. Who drives the steps? An orchestrator (Temporal, Step Functions) is easier to reason about than event choreography for complex flows.
3. Are all steps idempotent so retries are safe?
4. Do events leave the database reliably? Use the outbox pattern.
5. What happens on timeouts with unknown outcomes? Query status; don't blindly retry side effects.

## In the interview

> [!TIP]
> "There is no distributed transaction across booking and payment, so I'll run a saga: hold the room, charge, confirm, and if the charge fails, release the hold. A workflow engine persists progress so a crash resumes instead of restarting."

## Common mistakes

- Proposing two-phase commit across microservices.
- Non-idempotent steps that double-charge on retry.
- Dual writes to a database and a queue without an outbox.

## Problems that use it

- [Payment system (Stripe)](../problems/payment-system.md): Throughput is moderate. The hard part is staying correct when a call to the bank has an unknown outcome.
- [Online judge (LeetCode)](../problems/online-judge.md): You are running strangers' code on your servers, so isolation comes first.
- [Job scheduler](../problems/job-scheduler.md): Ten thousand jobs per second, each within two seconds of its scheduled time.

## The theory underneath

- [DDIA Ch 9: Consistency and consensus](../ddia/09-consistency-and-consensus.md)
- [DDIA Ch 11: Stream processing](../ddia/11-stream-processing.md)
- [DDIA Ch 12: The future of data systems](../ddia/12-future-of-data-systems.md)
