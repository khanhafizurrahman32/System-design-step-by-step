---
title: "Ride sharing (Uber)"
description: "Four problems in one: a flood of location updates, matching, locking drivers, and a multi-step trip lifecycle."
tags: [real-time-updates, hard]
---

# Ride sharing (Uber)

<span class="lvl lvl-a">Advanced</span>

**Difficulty:** Hard · **Patterns:** [Real-time updates](../patterns/real-time-updates.md) · **DDIA:** [Ch 8](../ddia/08-trouble-with-distributed-systems.md) leases · [Ch 3](../ddia/03-storage-and-retrieval.md) geo index · [Ch 6](../ddia/06-partitioning.md) partition by region

*Four problems in one: a flood of location updates, matching, locking drivers, and a multi-step trip lifecycle.*

> [!TIP]
> **One-page sketchnote:** [RIDE SHARING (UBER) on a single page](../sketchnotes/problem-ride-sharing.svg), for revision or printing.

## TL;DR

- Driver locations are ephemeral and frequent, so keep them in Redis's geospatial index, not a database.
- Offer a ride to one driver at a time and lock that driver with a short TTL so they can't get two offers.
- Run ride requests through a durable, per-region queue so a crashed matcher loses nothing.

## 1. Requirements

**Functional**

1. Rider requests a ride (pickup, destination) and sees a fare estimate
2. Match to a nearby available driver; driver accepts or declines
3. Live location of driver during the trip

**Non-functional**

- Match within ~1 minute
- A driver is never assigned two rides (consistency)
- High availability for location updates
- Handle surge peaks per city

## 2. Back-of-envelope numbers

1M active drivers × 1 update/4s = **250k location writes/s**, ephemeral (only the latest matters). Ride requests ~100/s avg.

## 3. Core entities and API

```text
rides(id, rider, driver, status, pickup, dest, fare)
driver_location in Redis GEO (TTL)
```

```http
POST /rides/estimate
POST /rides {estimate_id}
POST /drivers/location {lat, lng}
PATCH /rides/{id} {accept|decline}
```

## 4. v1: the simplest design, and where it breaks

![Ride sharing (Uber): v1 design](../diagrams/problem-ride-sharing-v1.svg)

Every driver's app sends its GPS position every few seconds, and the server updates a `driver_locations` row in Postgres. When a rider requests a ride, the matcher queries the nearest available drivers and assigns the closest one.

**Where it breaks:**

- **Location writes:** 1M active drivers, each updating every 4 seconds, is **250k writes a second**, each one an update that creates a new row version and touches indexes. That's far beyond one Postgres primary. And all that data is **throwaway**: only each driver's latest position matters, and it's stale within seconds.
- **Double assignment:** two riders requesting at the same moment can both be matched with the same nearby driver.
- **Lost requests:** if the matcher process crashes mid-match, the rider's request may simply vanish.

## 5. Evolving to the final design

![Ride sharing (Uber): final design](../diagrams/problem-ride-sharing-final.svg)

Each step fixes one specific problem with the step before it.

### Step 1: keep driver locations in memory, in Redis GEO

**Why:** location data is high-volume, short-lived and only the latest value matters. That's the opposite of what a durable, transactional database is built for.

**How:** store locations in **Redis's geospatial index**. `GEOADD drivers <lng> <lat> <driver_id>` overwrites the driver's position in memory in microseconds, and `GEOSEARCH` finds drivers within a radius of a pickup point. Give each driver a **TTL key** refreshed on every update, so drivers whose app goes silent drop out of matching automatically. At 250k updates a second, shard by city or region across Redis nodes.

### Step 2: offer to one driver at a time, and lock them while you wait

**Why:** a driver must never get two rides. Without coordination, two matchers can pick the same closest driver for two different riders.

**How:** the matcher picks the best candidate and takes a **lock on that driver** before offering: `SET driver_lock:{id} {ride_id} NX PX 10000`. `NX` means only one matcher can set it; the 10-second expiry matches the accept window. Then it sends the offer. If the driver declines or doesn't answer in 10 seconds, the lock expires and the matcher tries the next driver. When the driver accepts, the ride is assigned in Postgres with a **conditional update** (`UPDATE rides SET driver_id = :d WHERE id = :r AND driver_id IS NULL`), so even a stray duplicate can't assign twice.

### Step 3: run requests through a durable, regional queue

**Why:** matching can take a minute (several offers and declines). If the matcher crashes in the middle, the request must not be lost. And demand spikes city by city (concert ends, rain starts).

**How:** ride requests go onto a **durable queue partitioned by region**. Matchers for each region consume their partition, so a surge in one city is handled by scaling that city's matchers. A request is acknowledged only once the ride is assigned or cancelled. If a matcher dies, the request is redelivered to another, which carries on safely because each step is keyed by `ride_id`.

## 6. Deep dives

### Driver double-assigned?

**Why it happens:** matching is "find nearest free driver, then assign". Two matchers handling two riders near each other both find the same driver free and both assign them, a check-then-act race.

**How:** two layers. A **per-driver lock with a TTL** (Redis `SET NX PX`) means only one offer at a time per driver; the TTL equals the accept window, so an ignored offer **automatically** becomes a decline. Then the **durable assignment** in Postgres is a conditional update that only succeeds if the ride, and the driver's current status, are still unassigned. The lock prevents wasted offers; the database guarantees correctness.

### Reduce location load?

**Why it matters:** 250k updates a second costs bandwidth, battery and server capacity, and much of it is redundant.

**How:** make updates **adaptive**. A driver who is parked or waiting at a light sends updates less often (every 15–30 seconds); a moving driver on a trip sends more. The app can also **batch** a few points per request. Only send when the position has changed meaningfully, say 20+ metres.

### Why not query Postgres + PostGIS?

**Why it's tempting:** PostGIS answers "drivers within 2 km" perfectly well, and keeping everything in one database is simpler.

**Why not here:** the problem isn't the **query**, it's the **writes**. 250k updates a second of data that is obsolete within seconds would swamp a disk-based, transactional database: each update writes a new row version, a WAL record and index changes, for data you never need to keep. It belongs **in memory**. Postgres keeps what must be durable: rides, payments, ratings.

### Matcher crash mid-match?

**Why it's a risk:** a matcher might have locked a driver and sent an offer when it crashes. Without care, the rider waits forever, or a retry offers the same ride twice.

**How:** the request stays on the **durable queue** until matching completes, so a crash means redelivery to another matcher. Every step is **idempotent, keyed by `ride_id`**. The lock value is the ride ID, so a retry recognises its own lock, and the final assignment is conditional. A workflow engine (Temporal, Step Functions) can also track each ride's progress explicitly.

## 7. Interview script (45 minutes)

| Time | What you do | Content |
|---|---|---|
| 0–5 | Functional requirements | Rider requests a ride (pickup, destination) and sees a fare estimate; Match to a nearby available driver; driver accepts or declines; Live location of driver during the trip |
| 5–8 | Non-functional requirements | Match within ~1 minute; A driver is never assigned two rides (consistency); High availability for location updates; Handle surge peaks per city |
| 8–10 | Numbers that drive the design | 1M active drivers × 1 update/4s = **250k location writes/s**, ephemeral (only the latest matters). Ride requests ~100/s avg. |
| 10–13 | Entities and API | Keep it short: the endpoints in §3, idempotency keys on writes. |
| 13–25 | v1, then evolve it | Draw v1 and show where it breaks. Then add, in order: Redis GEO → Matching service → Redis lock → Request queue. Justify each addition with a number. |
| 25–40 | Deep dives | Driver double-assigned? · Reduce location load? · Why not query Postgres + PostGIS? · Matcher crash mid-match? |
| 40–45 | Wrap-up | Remaining bottlenecks, failure modes, what you would monitor. |


## Staff-level lens

| Question | Staff answer |
|---|---|
| **The real problem** | A flood of location updates and exclusive driver assignment. |
| **Deciding number** | 250k location writes/s; ~100 ride requests/s on average. |
| **Staff call and trade-off** | Redis GEO for locations; offer to one driver at a time with a driver lock and conditional assignment; durable per-region queue. Accept slightly slower matching. |
| **Raise before you're asked** | A driver assigned twice; matcher crashing mid-match; city hot spots and surge. |
| **Senior stops at** | Geo index + matching. |
| **Staff goes on to** | Cells per city to isolate failures, surge as a feedback loop, regional failover. |
| **Run it** | Watch time-to-match p95, offer acceptance, location update lag. |

All 29 problems through this lens: [Staff-level answers](../playbook/staff-level.md).

## 8. Common mistakes

- Offering a ride to many drivers at once without locks, so two drivers accept the same ride.
- Adding components before showing which number makes them necessary.
- Skipping failure handling: what happens on timeouts, retries and crashes.

## Self-check

Try to answer before you open each one.

<details class="question" markdown>
<summary>Why keep driver locations in Redis rather than a database?</summary>

Locations are ephemeral and updated every few seconds by every driver; an in-memory geospatial index handles the write rate and nearby queries.

</details>

<details class="question" markdown>
<summary>How do you stop a driver getting two ride offers at once?</summary>

Offer to one driver at a time and lock that driver with a short-TTL key while the offer is pending.

</details>

<details class="question" markdown>
<summary>What if the matcher crashes mid-match?</summary>

Ride requests sit in a durable per-region queue, so another matcher picks the request up again.

</details>

## Related

- **Patterns:** [Real-time updates](../patterns/real-time-updates.md)
- **DDIA:** [Ch 8](../ddia/08-trouble-with-distributed-systems.md) leases · [Ch 3](../ddia/03-storage-and-retrieval.md) geo index · [Ch 6](../ddia/06-partitioning.md) partition by region
- **Similar problems:** [Live comments (Facebook Live)](live-comments.md) · [Collaborative editor (Google Docs)](collaborative-editor.md) · [Stock trading (Robinhood)](stock-trading.md) · [Online auction](online-auction.md)
