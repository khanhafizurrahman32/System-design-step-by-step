---
title: "Patterns"
description: "Seven recurring patterns that cover almost every system design problem."
---

# The 7 patterns

Almost every system design problem combines two or three of these. Learn each as a picture: what breaks, and what fixes it.

| Pattern | In one line | Problems |
|---|---|---|
| [Scaling reads](scaling-reads.md) | Most systems read far more than they write. Make the common read cheap, and the database only sees what the cache can't answer. | 13 |
| [Scaling writes](scaling-writes.md) | When writes outgrow one machine, absorb the spikes, write in batches, split the data, and write less. | 7 |
| [Real-time updates](real-time-updates.md) | Push changes to clients the moment they happen, even when the sender and receiver are connected to different servers. | 7 |
| [Dealing with contention](contention.md) | Many users want the same thing at the same moment. Exactly one should win, every time. | 3 |
| [Multi-step processes](multi-step-processes.md) | A business action spans several services and any step can fail halfway. Make progress durable and failures reversible. | 3 |
| [Handling large blobs](large-blobs.md) | Files, photos and videos belong in object storage, and their bytes should never pass through your application servers. | 3 |
| [Long-running tasks](long-running-tasks.md) | If work takes longer than a request should, accept it, queue it, and let the client check back. | 3 |
