---
title: "Operating Systems for system design"
description: "The operating-system ideas behind real system behaviour: threads and context switches, scheduling, memory and GC pauses, concurrency, I/O models, fsync and durability, storage devices and containers."
---

# Operating Systems for system design

> Notes in our own words, following the three themes of *Operating Systems: Three Easy Pieces* (OSTEP) by Remzi and Andrea Arpaci-Dusseau: **virtualisation**, **concurrency** and **persistence**. The book is excellent and free to read at [ostep.org](https://pages.cs.wisc.edu/~remzi/OSTEP/).

This isn't a full operating systems course. It covers only the parts that keep showing up when you design, scale and debug real systems: why a service's latency explodes at 90% CPU, how one server holds a million WebSockets, why Postgres single-row commits are limited, why Kafka is fast on plain disks, why a Java process can wake up after a pause and corrupt data, and why containers get throttled or OOM-killed.

Each page explains **why** the problem exists and **how** the mechanism works, then shows how it appears in system design interviews, with self-check questions at the end.

| Page | Theme | What you'll learn | Where it shows up in system design |
|---|---|---|---|
| [1. Processes, threads and context switches](01-processes-and-threads.md) | Virtualisation | Isolation vs sharing, what a switch costs, thread pools | Connection pooling, thread-per-request limits, Redis's single thread |
| [2. CPU scheduling and utilisation](02-cpu-scheduling.md) | Virtualisation | Run queues, fairness, latency vs utilisation, noisy neighbours | Headroom targets, autoscaling, separating batch from interactive work |
| [3. Memory, the page cache and GC pauses](03-memory.md) | Virtualisation | Virtual memory, page faults, page cache, swapping, OOM, GC pauses | "No free memory" myths, Kafka's speed, fencing tokens, p99.9 spikes |
| [4. Concurrency: races, locks and deadlock](04-concurrency.md) | Concurrency | Races, locks, atomics and CAS, contention, deadlock | Lost updates, conditional writes, lock ordering, distributed locks |
| [5. I/O models: blocking, event loops and epoll](05-io-models.md) | Concurrency | Blocking vs non-blocking, epoll, async/await, a million connections | Chat, live comments, WebSocket servers, Node.js trade-offs |
| [6. Files and durability: the write path and fsync](06-files-and-durability.md) | Persistence | write vs fsync, journaling, write-ahead logs, group commit | Database write limits, batching, Kafka durability, safe file replacement |
| [7. Storage devices: HDDs, SSDs and access patterns](07-storage-devices.md) | Persistence | IOPS vs throughput, sequential vs random, SSD internals, cloud volumes | LSM-trees, append-only logs, choosing storage, diagnosing slow databases |
| [8. Containers: namespaces, cgroups and limits](08-containers.md) | Virtualisation | Containers vs VMs, CPU throttling, memory limits, OOM kills | Kubernetes sizing, latency spikes, sandboxing untrusted code |

## How to use these pages

- **Short on time?** Read 1, 5 and 6: threads vs event loops, and why fsync limits writes. They come up most often.
- **Debugging production?** Pages 2, 3 and 8 explain most "latency spikes but nothing looks wrong" mysteries.
- **Going deeper?** Pair page 6 and 7 with [DDIA Ch 3](../ddia/03-storage-and-retrieval.md), and page 3 with [DDIA Ch 8](../ddia/08-trouble-with-distributed-systems.md).

## Related

- [Computer Networking](../cn/index.md): the other half of what's underneath every system.
- [Numbers and estimation](../foundations/numbers-and-estimation.md): latency and throughput numbers for memory, disk and network.
- [Choosing technologies](../technologies.md): Redis, Postgres and Kafka, whose designs these pages explain.
