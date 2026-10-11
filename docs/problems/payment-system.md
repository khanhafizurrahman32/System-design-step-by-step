---
title: "Payment system (Stripe)"
description: "Throughput is moderate. The hard part is staying correct when a call to the bank has an unknown outcome."
tags: [multi-step-processes, hard]
---

# Payment system (Stripe)

<span class="lvl lvl-a">Advanced</span>

**Difficulty:** Hard · **Patterns:** [Multi-step processes](../patterns/multi-step-processes.md) · **DDIA:** [Ch 8](../ddia/08-trouble-with-distributed-systems.md) unknown outcomes · [Ch 12](../ddia/12-future-of-data-systems.md) end-to-end idempotency, integrity · [Ch 11](../ddia/11-stream-processing.md) outbox

*Throughput is moderate. The hard part is staying correct when a call to the bank has an unknown outcome.*

> [!TIP]
> **One-page sketchnote:** [PAYMENT SYSTEM (STRIPE) on a single page](../sketchnotes/problem-payment-system.svg), for revision or printing.

## TL;DR

- Record the payment as pending before calling the processor, and pass your ID as the idempotency key.
- On a timeout, query by that key or retry it; never create a second charge.
- Publish status changes through an outbox, keep an append-only double-entry ledger, and reconcile daily.

## 1. Requirements

**Functional**

1. Merchants create payment intents; customers pay by card
2. Merchants receive status via webhooks
3. Refunds

**Non-functional**

- Never double-charge (exactly-once effect)
- Durable and auditable; strongly consistent ledger
- ~10k TPS
- PCI: raw card data isolated

## 2. Back-of-envelope numbers

10k TPS is moderate for a well-indexed Postgres cluster. The hard part is **correctness under unknown outcomes**, not throughput.

## 3. Core entities and API

```text
payment_intents(id, merchant, amount, status state machine)
ledger_entries(id, txn_id, account, debit, credit) append-only
outbox
```

```http
POST /payment_intents {amount, currency} + Idempotency-Key
POST /payment_intents/{id}/confirm {payment_method_token}
webhook → merchant: payment.succeeded / failed
```

## 4. v1: the simplest design, and where it breaks

![Payment system (Stripe): v1 design](../diagrams/problem-payment-system-v1.svg)

Naive: call the processor, then write the DB. A crash in between charges the card with no record of it.

## 5. Evolving to the final design

![Payment system (Stripe): final design](../diagrams/problem-payment-system-final.svg)

Each step fixes one specific problem with the step before it:

1. Naive: call the processor, then write the DB. A crash in between charges the card with no record of it.
2. Write the intent as **PENDING** first, call the processor with our intent ID as the idempotency key, then record the result. On timeout, query by our ID; never create a new charge.
3. Merchants send an Idempotency-Key on every mutating call (stored with a unique index). Card numbers are tokenized into an isolated vault; the rest of the system sees tokens.
4. Status changes write an **outbox** row in the same transaction; a relay publishes and webhooks are delivered with retries and signatures. Money moves as append-only double-entry ledger rows, reconciled daily against processor settlement files.

## 6. Deep dives

### Processor times out?

Unknown outcome (DDIA Ch 8): keep PENDING, retry with the same idempotency key or query status by reference.

### Webhook delivery?

Outbox in the same transaction; exponential backoff; merchants dedupe by event_id.

### Why double-entry?

Every movement is a debit + credit summing to zero, so balances are derivable and auditable; never UPDATE amounts.

### Distributed transaction with the bank?

Impossible. Design a state machine with compensation (refund) and reconciliation.

## 7. Interview script (45 minutes)

| Time | What you do | Content |
|---|---|---|
| 0–5 | Functional requirements | Merchants create payment intents; customers pay by card; Merchants receive status via webhooks; Refunds |
| 5–8 | Non-functional requirements | Never double-charge (exactly-once effect); Durable and auditable; strongly consistent ledger; ~10k TPS; PCI: raw card data isolated |
| 8–10 | Numbers that drive the design | 10k TPS is moderate for a well-indexed Postgres cluster. The hard part is **correctness under unknown outcomes**, not throughput. |
| 10–13 | Entities and API | Keep it short: the endpoints in §3, idempotency keys on writes. |
| 13–25 | v1, then evolve it | Draw v1 and show where it breaks. Then add, in order: Postgres → Card vault → Kafka (outbox relay) → Webhook service → Daily reconcile. Justify each addition with a number. |
| 25–40 | Deep dives | Processor times out? · Webhook delivery? · Why double-entry? · Distributed transaction with the bank? |
| 40–45 | Wrap-up | Remaining bottlenecks, failure modes, what you would monitor. |


## Staff-level lens

| Question | Staff answer |
|---|---|
| **The real problem** | Stay correct when a call to the bank has an unknown outcome. |
| **Deciding number** | ~10k TPS: moderate. Correctness is the problem. |
| **Staff call and trade-off** | Pending record first, idempotency keys, outbox, double-entry ledger, daily reconciliation. Accept extra writes for auditability. |
| **Raise before you're asked** | Processor timeouts; duplicate webhooks; partial refunds; PCI scope creep. |
| **Senior stops at** | Idempotency keys. |
| **Staff goes on to** | Ledger design, reconciliation, isolating card data to shrink compliance scope. |
| **Run it** | Watch reconciliation breaks, age of pending payments, webhook delivery success. |

All 29 problems through this lens: [Staff-level answers](../playbook/staff-level.md).

## 8. Common mistakes

- Using 2PC or assuming the processor call succeeds or fails cleanly.
- Adding components before showing which number makes them necessary.
- Skipping failure handling: what happens on timeouts, retries and crashes.

## Related

- **Patterns:** [Multi-step processes](../patterns/multi-step-processes.md)
- **DDIA:** [Ch 8](../ddia/08-trouble-with-distributed-systems.md) unknown outcomes · [Ch 12](../ddia/12-future-of-data-systems.md) end-to-end idempotency, integrity · [Ch 11](../ddia/11-stream-processing.md) outbox
- **Similar problems:** [Online judge (LeetCode)](online-judge.md) · [Job scheduler](job-scheduler.md)
