---
title: "API design"
description: "Spend five minutes, get the important details right, and move on to the design."
tags: [core-concept]
---

# API design

*Spend five minutes, get the important details right, and move on to the design.*

| Rule | Example |
|---|---|
| Resources = core entities | GET /events/{id}, POST /bookings |
| Cursor pagination, not offset | GET /feed?cursor=(ts,id)&limit=20: stable when new items arrive |
| Idempotency on mutations | Idempotency-Key header + unique index → retries are safe |
| Auth from token, not body | user_id comes from the JWT; never trust {user_id} in the request |
| Async for long work | POST returns 202 + job_id; GET /jobs/{id} |
| Version | /v1/… or header; add optional fields only |

> [!TIP]
> **Say this in the interview:** "REST with resources from our entities: POST /bookings with an idempotency key, cursor-paginated GET /bookings. User identity comes from the auth token."

> [!WARNING]
> **Don't over-invest:** Spending 15 minutes on endpoint shapes is a classic way to run out of time for the deep dives.

## Checklist

1. Name resources after your core entities.
2. Use cursor pagination, not offsets.
3. Accept an Idempotency-Key on every mutating call.
4. Take the user's identity from the auth token, never from the body.
5. Return 202 and a job ID for long work.

## In the interview

> [!TIP]
> "Three endpoints cover the requirements; writes take an idempotency key, lists use cursor pagination, and identity comes from the token."

## Related

- Pattern: [Long-running tasks](../patterns/long-running-tasks.md)
