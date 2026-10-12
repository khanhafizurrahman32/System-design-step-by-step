---
title: "API design"
description: "Spend five minutes, get the important details right, and move on to the design."
tags: [core-concept]
---

# API design

<span class="lvl lvl-b">Beginner-friendly</span>

*Spend five minutes, get the important details right, and move on to the design.*

## Why it matters, and why to keep it short

In an interview, the API is where you show that your design actually meets the requirements: each functional requirement becomes one or two endpoints. Interviewers don't need every field. They're checking for a handful of details that separate careful engineers from the rest. Get those right in about five minutes, then move on to the architecture.

## The six details that matter

| Rule | Example |
|---|---|
| Resources = core entities | GET /events/{id}, POST /bookings |
| Cursor pagination, not offset | GET /feed?cursor=(ts,id)&limit=20: stable when new items arrive |
| Idempotency on mutations | Idempotency-Key header + unique index → retries are safe |
| Auth from token, not body | user_id comes from the JWT; never trust {user_id} in the request |
| Async for long work | POST returns 202 + job_id; GET /jobs/{id} |
| Version | /v1/… or header; add optional fields only |

Why each one matters:

1. **Resources named after your entities.** If your core entities are Event, Booking and User, your API is `GET /events/{id}`, `POST /bookings`, `GET /users/{id}/bookings`. It shows the API follows from the data model.
2. **Cursor pagination, not offsets.** With `?page=3&size=20` (offset 40), if new items arrive while the user scrolls, everything shifts down and they see duplicates or miss items. And `OFFSET 100000` makes the database read and throw away 100,000 rows. A **cursor** says "give me the 20 items after this one", for example after `(timestamp, id)` of the last item seen. That is stable and uses an index directly.
3. **Idempotency on anything that changes data.** Networks lose responses, and clients retry. Without protection, a retried `POST /payments` charges twice. The client sends an `Idempotency-Key` (a unique ID per operation), and the server stores it with a unique constraint and returns the original result for repeats.
4. **Identity from the token, never the request body.** If the API accepts `{"user_id": 42, …}` in the body, anyone can act as user 42. The server gets the user from the verified auth token (session or JWT).
5. **Long work is asynchronous.** Encoding a video or generating a report can take minutes, far longer than an HTTP request should stay open. Return `202 Accepted` with a `job_id` straight away. The client polls `GET /jobs/{id}` or gets notified when it finishes.
6. **Versioning.** Clients (especially mobile apps) can't all update at once. Only **add** optional fields to existing versions; put breaking changes under `/v2/`.

> [!TIP]
> **Say this in the interview:** "REST with resources from our entities: POST /bookings with an idempotency key, cursor-paginated GET /bookings. User identity comes from the auth token."

> [!WARNING]
> **Don't over-invest:** spending 15 minutes on endpoint shapes is a classic way to run out of time for the deep dives, which is where senior candidates stand out.

> [!TIP]
> **One-page sketchnote:** [API DESIGN on a single page](../sketchnotes/concept-api-design.svg), for revision or printing.

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
