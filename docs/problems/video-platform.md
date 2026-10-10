---
title: "Video platform (YouTube)"
description: "Two hard problems: getting gigabyte uploads in reliably, and streaming smoothly on any connection."
tags: [large-blobs, hard]
---

# Video platform (YouTube)

**Difficulty:** Hard · **Patterns:** [Handling large blobs](../patterns/large-blobs.md) · [Scaling reads](../patterns/scaling-reads.md) · **DDIA:** [Ch 10](../ddia/10-batch-processing.md) batch DAGs · [Ch 1](../ddia/01-reliability-scalability-maintainability.md) bandwidth math

*Two hard problems: getting gigabyte uploads in reliably, and streaming smoothly on any connection.*

## TL;DR

- Upload directly to object storage with presigned, multipart, resumable URLs; bytes never touch your servers.
- Split videos into segments and transcode them in parallel into several resolutions.
- Serve segments from a CDN and let the player switch quality per segment (adaptive bitrate).

## 1. Requirements

**Functional**

1. Upload videos (up to many GB)
2. Watch videos with smooth playback on any network

**Non-functional**

- Resumable uploads
- Fast start, adaptive quality
- ~1M uploads/day; billions of views
- Metadata availability over consistency

## 2. Back-of-envelope numbers

1M uploads/day × 1GB raw ≈ **1PB/day** raw, plus several renditions. Views are mostly served from the **CDN**, not origin.

## 3. Core entities and API

```text
videos(id, uploader, title, status UPLOADING|PROCESSING|READY, manifest_url)
S3 raw/ + processed/{rendition}/{segment}
```

```http
POST /videos → {video_id, presigned multipart URLs}
GET /videos/{id} → manifest URL
PUT parts directly to S3
```

## 4. v1: the simplest design, and where it breaks

![Video platform (YouTube): v1 design](../diagrams/problem-video-platform-v1.svg)

Naive: upload gigabytes through your API servers. Slow, fragile, and expensive.

## 5. Evolving to the final design

![Video platform (YouTube): final design](../diagrams/problem-video-platform-final.svg)

Each step fixes one specific problem with the step before it:

1. Naive: upload gigabytes through your API servers. Slow, fragile, and expensive.
2. The API returns **presigned multipart URLs**; the client uploads parts directly to S3 in parallel and resumes failed parts.
3. An S3 event starts a transcoding DAG: split into short segments, transcode each to several resolutions in parallel, write HLS/DASH manifests, and mark the video READY.
4. Viewers fetch the manifest and segments from the CDN; the player picks the quality per segment from measured bandwidth (adaptive bitrate).

## 6. Deep dives

### Why presigned URLs?

Bytes never touch your servers; S3 handles scale; multipart gives parallel, resumable parts.

### Fast transcoding?

Segment-level parallelism across many workers; the DAG orchestrator tracks completion.

### Adaptive bitrate?

The manifest lists renditions; the player switches per segment.

### Cost?

Transcode popular formats eagerly; long-tail renditions lazily.

## 7. Interview script (45 minutes)

| Time | What you do | Content |
|---|---|---|
| 0–5 | Functional requirements | Upload videos (up to many GB); Watch videos with smooth playback on any network |
| 5–8 | Non-functional requirements | Resumable uploads; Fast start, adaptive quality; ~1M uploads/day; billions of views; Metadata availability over consistency |
| 8–10 | Numbers that drive the design | 1M uploads/day × 1GB raw ≈ **1PB/day** raw, plus several renditions. Views are mostly served from the **CDN**, not origin. |
| 10–13 | Entities and API | Keep it short: the endpoints in §3, idempotency keys on writes. |
| 13–25 | v1, then evolve it | Draw v1 and show where it breaks. Then add, in order: S3 raw → Transcode DAG → S3 processed → CDN → Viewer. Justify each addition with a number. |
| 25–40 | Deep dives | Why presigned URLs? · Fast transcoding? · Adaptive bitrate? · Cost? |
| 40–45 | Wrap-up | Remaining bottlenecks, failure modes, what you would monitor. |

## 8. Common mistakes

- Serving or uploading whole files through app servers.
- Adding components before showing which number makes them necessary.
- Skipping failure handling: what happens on timeouts, retries and crashes.

## Related

- **Patterns:** [Handling large blobs](../patterns/large-blobs.md) · [Scaling reads](../patterns/scaling-reads.md)
- **DDIA:** [Ch 10](../ddia/10-batch-processing.md) batch DAGs · [Ch 1](../ddia/01-reliability-scalability-maintainability.md) bandwidth math
- **Similar problems:** [File storage and sync (Dropbox)](file-sync.md) · [Photo sharing (Instagram)](photo-sharing.md)
