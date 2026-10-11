---
title: Start here
description: Pick a learning path for your level, with checkpoints so you know when you're ready to move on.
---

# Start here

This handbook covers everything from the basics to staff-level interviews. You don't need all of it. Pick the path that matches where you are.

Every page shows its level at the top:

- <span class="lvl lvl-b">Beginner-friendly</span> assumes only that you've built a web app.
- <span class="lvl lvl-i">Intermediate</span> assumes you know the basics and want to design systems that scale.
- <span class="lvl lvl-a">Advanced</span> assumes the intermediate material and goes into distributed systems theory and staff-level trade-offs.

Stuck on a term? Hover over it on any page, or look it up in the [glossary](glossary.md).

## Path 1: Intermediate engineer (about 2–3 weeks, 1 hour a day)

You've built applications, but you haven't designed large systems or done many system design interviews.

### Stage 1: The foundations (3–4 days)

1. [The basics](foundations/basics.md): how a request travels through DNS, CDN, load balancer, app servers, cache, database and queue.
2. [How to approach any design](foundations/how-to-approach-a-design.md): the loop used on every page.
3. [Non-functional requirements](foundations/nfrs.md): just the first two sections for now.
4. [Numbers and estimation](foundations/numbers-and-estimation.md): read the conversions and the method; skim the big table.

> [!NOTE]
> **Checkpoint:** you can explain why app servers should be stateless, what a cache saves you, and turn "10 million users, 5 actions a day" into requests per second.

### Stage 2: Core concepts (4–5 days)

1. [API design](core-concepts/api-design.md)
2. [Data modeling](core-concepts/data-modeling.md)
3. [Database indexing](core-concepts/indexing.md)
4. [Caching](core-concepts/caching.md)
5. [Networking essentials](core-concepts/networking.md)

> [!NOTE]
> **Checkpoint:** you can design the tables and indexes for a simple app, explain cache-aside and what a stampede is, and say when you'd use SSE vs WebSockets.

### Stage 3: Your first patterns (3 days)

1. [Scaling reads](patterns/scaling-reads.md)
2. [Long-running tasks](patterns/long-running-tasks.md)
3. [Handling large blobs](patterns/large-blobs.md)

> [!NOTE]
> **Checkpoint:** for a read-heavy app you can say what to add first, second and third, and why uploads should never pass through your app servers.

### Stage 4: Your first problems (about a week)

Do these in order. For each one, **cover the page and try the design yourself first**, then read the v1 → final walkthrough.

1. [URL shortener](problems/url-shortener.md)
2. [News aggregator](problems/news-aggregator.md)
3. [File storage and sync](problems/file-sync.md)
4. [Local delivery](problems/local-delivery.md)
5. [Rate limiter](problems/rate-limiter.md)
6. [Ticketmaster](problems/ticketmaster.md)
7. [News feed](problems/news-feed.md)
8. [Online judge](problems/online-judge.md)

> [!NOTE]
> **Checkpoint:** you can draw a working design for an unseen easy problem in 30 minutes, explain where the simple version breaks with a number, and fix it.

### Stage 5: Rounding out

- The remaining patterns: [Scaling writes](patterns/scaling-writes.md), [Real-time updates](patterns/real-time-updates.md), [Dealing with contention](patterns/contention.md).
- The remaining concepts: [Sharding](core-concepts/sharding.md), [Consistent hashing](core-concepts/consistent-hashing.md), [CAP theorem](core-concepts/cap-theorem.md).
- [What's expected at each level](playbook/levels.md), so you know how deep a mid-level interview goes.
- [The 45-minute delivery framework](playbook/delivery-framework.md), then practise out loud with the [interview deck](slides/interview.html).

You can skip the DDIA pages and the staff-level material for now. Come back to them later.

## Path 2: Senior engineer preparing for interviews (about 2 weeks)

1. Skim [Foundations](foundations/index.md) and read [Numbers and estimation](foundations/numbers-and-estimation.md) carefully.
2. Read all [7 patterns](patterns/index.md) and [Choosing technologies](technologies.md).
3. Do two [problems](problems/index.md) a day, medium and hard. Try each yourself first.
4. Read the DDIA pages behind your weakest patterns, especially [Ch 5](ddia/05-replication.md), [Ch 7](ddia/07-transactions.md) and [Ch 11](ddia/11-stream-processing.md).
5. Rehearse with the [interview deck](slides/interview.html) and the [quick-fire questions](playbook/quick-fire.md).

## Path 3: Staff and above

1. [What's expected at each level](playbook/levels.md) and [Staff-level answers](playbook/staff-level.md).
2. All 12 [DDIA chapters](ddia/index.md).
3. Every problem's **Staff-level lens** section, or all 29 at once in the [staff atlas](slides/staff-atlas.html).
4. The night before: the [staff cheat sheet](sketchnotes/staff-cheat-sheet.svg) and the [interview cheat sheet](sketchnotes/interview-cheat-sheet.svg).

## How to study any page

- **Predict before you read.** Cover the final design and sketch your own first. The gap is what you learn.
- **Say it out loud.** Interviews test explaining, not recognising.
- **Do the numbers yourself.** Redo each page's estimate without looking.
- **Revisit with sketchnotes.** After a page, its one-page [sketchnote](sketchnotes/index.md) is a quick way to review a few days later.
