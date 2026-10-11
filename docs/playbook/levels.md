---
title: What's expected at each level
description: How system design interviews differ for mid-level, senior, staff and principal engineers, with the same problem answered at each level.
---

# What's expected at each level

<span class="lvl lvl-b">Beginner-friendly</span>

The same question, "design a URL shortener", is asked at every level. What changes is how much of the answer you're expected to drive, and how deep you go without being asked. Knowing your target level tells you where to stop and where to keep going.

## At a glance

| | Mid-level | Senior | Staff | Principal |
|---|---|---|---|---|
| **Who drives** | The interviewer guides; you follow hints well | You drive; the interviewer steers deep dives | You drive and set the agenda; you check in | You reframe the problem; it becomes a discussion between peers |
| **Requirements** | Lists the main features | Adds NFRs with numbers | Picks the 2–3 NFRs that actually decide the design | Questions the requirements against the business goal |
| **Design** | A working design with sensible parts | A design that meets the NFRs, with justified choices | The simplest design that meets them, and why nothing more | Designs across team and system boundaries |
| **Trade-offs** | Knows pros and cons when asked | Chooses and explains why | States what is given up and when the choice would change | Weighs organisational and long-term costs too |
| **Failure** | Handles failures when asked | Covers the main failures | Raises failure modes before being asked | Plans for failure across systems and teams |
| **Operations** | Rarely discussed | Mentions monitoring | SLOs, alerts, rollout and rollback | Cost, ownership, on-call load, migrations |
| **Depth** | One or two areas, with help | Two or three deep dives | Deep dives chosen by risk | Depth where it changes the decision |

## Mid-level

**The bar:** a correct, working design for a well-scoped problem, built with reasonable components, with some guidance.

- Clarify the main features; don't get lost in edge cases.
- Draw a clear design: client, API, service, database, and probably a cache.
- Design sensible tables and APIs.
- Know the common building blocks (cache, queue, load balancer, replicas) and roughly when each helps.
- Respond well to hints. If the interviewer asks "what if this table gets huge?", work it through.

**Common reasons for a no:** a design that doesn't work end to end; vague components with no reason ("we'll add Kafka"); getting stuck without asking questions.

**Focus on:** [The basics](../foundations/basics.md), the [core concepts](../core-concepts/index.md), and the easy and medium [problems](../problems/index.md).

## Senior

**The bar:** you lead the interview, the design meets clear non-functional requirements, and you can go deep where the interviewer pushes.

- Set NFRs with numbers and use estimates to justify choices.
- Explain trade-offs between real options (SQL vs NoSQL, push vs pull, sync vs async).
- Handle concurrency and consistency correctly (double booking, lost updates, replication lag).
- Cover the main failure cases: retries, timeouts, idempotency.
- Manage your time so you reach the deep dives.

**Common reasons for a no:** needing to be led; trade-offs listed but no decision made; missing a race condition or data-loss scenario.

**Focus on:** all [7 patterns](../patterns/index.md), [Numbers and estimation](../foundations/numbers-and-estimation.md), medium and hard problems, and [DDIA Ch 5–7](../ddia/index.md).

## Staff

**The bar:** a design that is simple on purpose, where every choice is tied to a number, failures are raised before anyone asks, and you show how it would be run and changed. See [Staff-level answers](staff-level.md).

- Frame the core tension in one sentence.
- Use one decisive number to rule options in or out.
- Decide, and say what you accept in exchange.
- Raise failure modes unprompted, with how you'd detect and recover from them.
- Talk about SLOs, metrics, rollout, cost, and what changes at 10× scale.

**Common reasons for a no:** a correct senior answer with no sense of operations or cost; over-engineering; trade-offs never tied to the business.

## Principal

**The bar:** everything at staff, plus judgement at the level of the organisation. Principal interviews are often less about one system and more about how you'd shape many.

- Challenge the problem itself: should this be built, bought, or not done at all?
- Think across systems: shared platforms, data ownership, migration paths from the current system.
- Weigh team structure, ownership and on-call load as design inputs.
- Plan multi-year evolution, including how to migrate safely without downtime.

## The same problem at each level: URL shortener

| Level | What a strong answer sounds like |
|---|---|
| **Mid-level** | "An API stores short code → long URL in Postgres and redirects. Codes are random strings with a uniqueness check. I'd add a cache because reads are frequent." |
| **Senior** | "Redirects are about 100 times more common than writes, about 100k/s at peak, so a Redis cache takes most reads and replicas take the rest. Codes come from a counter in base62, so there are no collisions to check. 302 rather than 301, so every click is counted." |
| **Staff** | Everything senior said, plus: "500 GB fits one primary, so no sharding. The risk is a viral link expiring from cache all at once, so I'd use single-flight rebuilds. SLO is p99 redirect under 100 ms; I'd watch hit ratio and database miss rate. Phishing links need scanning. At 10×, redirects move to the CDN edge." |
| **Principal** | Everything staff said, plus: "Is this a product or internal infrastructure? If several teams need short links, it should be a shared platform with per-team quotas and abuse handling owned in one place. Migrating existing links means dual-writing during the switch-over, and links must never break." |

## Related

- [Start here](../start-here.md): a learning path for each level.
- [Phrases, signals and traps](phrases-and-traps.md)
- [Staff-level answers](staff-level.md)
