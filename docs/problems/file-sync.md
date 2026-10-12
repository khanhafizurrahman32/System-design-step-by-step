---
title: "File storage and sync (Dropbox)"
description: "Syncing a 50 GB file after a one-byte edit should not mean uploading 50 GB again."
tags: [large-blobs, easy]
---

# File storage and sync (Dropbox)

<span class="lvl lvl-b">Beginner-friendly</span>

**Difficulty:** Easy · **Patterns:** [Handling large blobs](../patterns/large-blobs.md) · **DDIA:** [Ch 5](../ddia/05-replication.md) conflicts · [Ch 11](../ddia/11-stream-processing.md) change log / cursor

*Syncing a 50 GB file after a one-byte edit should not mean uploading 50 GB again.*

> [!TIP]
> **One-page sketchnote:** [FILE STORAGE AND SYNC (DROPBOX) on a single page](../sketchnotes/problem-file-sync.svg), for revision or printing.

## TL;DR

- Split files into chunks fingerprinted by hash, and upload only the chunks the server doesn't already have.
- Upload and download directly to object storage with presigned URLs.
- Other devices follow a per-user change log with a cursor and fetch only what changed.

## 1. Requirements

**Functional**

1. Upload and download files (up to 50GB)
2. Automatic sync across a user's devices
3. Share files and folders

**Non-functional**

- Resumable uploads
- Changes visible on other devices within seconds
- Durable (S3 11 nines)
- Bandwidth-efficient sync

## 2. Back-of-envelope numbers

Large files chunked at ~5MB: a 50GB file = 10k chunks. Only changed chunks are re-uploaded, so a 1-byte edit sends 5MB, not 50GB.

## 3. Core entities and API

```text
files(id, owner, path, version)
file_chunks(file_id, idx, sha256)
chunks(sha256, s3_key)
shares(file_id, user, perm)
```

```http
POST /files {name, size, chunk_hashes[]} → missing chunks + presigned URLs
GET /changes?cursor → file metadata diffs
GET /files/{id} → chunk list + presigned download URLs
```

## 4. v1: the simplest design, and where it breaks

The client uploads each changed file **whole** through the API, which stores it. Other devices periodically ask "what changed?" and download changed files whole.

**Where it breaks:**

- **Large files:** a 50 GB file uploading through your API takes hours. If the connection drops at 99%, it **starts over**.
- **Small edits:** change one byte in a 50 GB file and the whole 50 GB is uploaded again, then downloaded again by every other device. Wasteful for users with limited bandwidth.
- **Slow sync:** devices find out about changes only at their next check, not "within seconds".

## 5. Evolving to the final design

![File storage and sync (Dropbox): final design](../diagrams/problem-file-sync-final.svg)

Each step fixes one specific problem with the step before it.

### Step 1: split files into chunks, upload them directly to S3

**Why:** large uploads must be resumable and must not pass through the API servers.

**How:** the client splits each file into **chunks** of about 5 MB, so a 50 GB file is about 10,000 chunks. The API returns **presigned URLs**, and the client uploads chunks **directly to S3**, several in parallel. If the connection drops, only the unfinished chunks are retried. Metadata (file, version, list of chunks) lives in the database.

### Step 2: fingerprint chunks, and upload only what's missing

**Why:** after a small edit, most of the file is unchanged. Re-sending it wastes bandwidth. And many users store identical files.

**How:** the client computes a **hash** (SHA-256) of each chunk and sends the **list of hashes** first. The server replies with the hashes it **doesn't already have**, and only those chunks are uploaded. A small edit uploads just the one or two changed chunks. Identical chunks across files and users are stored **once** (deduplication).

One subtlety: with fixed 5 MB boundaries, inserting one byte near the start shifts **every** boundary after it, so every chunk looks new. **Content-defined chunking** places boundaries where the data matches a pattern (using a rolling hash), so an insert changes only the chunk around it and boundaries further on stay put.

### Step 3: sync other devices from a change log

**Why:** other devices must learn about changes within seconds, and download only what changed.

**How:** every change to a user's files appends an entry to a **per-user change log**. Each device keeps a **cursor**, its position in that log. A device holds a long-poll or WebSocket connection open so it's **notified** as soon as something new arrives, then calls `GET /changes?cursor=…` to get the metadata changes since its cursor. For each changed file, it compares chunk hashes with what it already has and downloads only the **new chunks**.

## 6. Deep dives

### Resume after failure?

**Why it matters:** uploads of big files over home or mobile connections fail regularly. Restarting from zero makes large files nearly impossible to sync.

**How:** chunking makes progress **durable**: every uploaded chunk is stored in S3 under its hash. When the client reconnects, it sends the file's chunk-hash list again. The server says which hashes it already has, and the client sends **only the missing ones**. A 50 GB upload interrupted at 99% resumes by sending the last 1%.

### How do devices learn about changes?

**Why polling isn't great:** frequent polling from millions of devices is wasteful; infrequent polling makes sync slow.

**How:** a **change log with a cursor per device**, plus a **notification** channel. The device keeps a long-poll request or WebSocket open to a notification service. When the user's log gets a new entry, the service wakes the device, which then fetches the changes since its cursor and advances it. If the device was offline for a week, it simply reads everything since its cursor when it returns, so nothing is missed.

### Edits on two offline devices?

**Why it's hard:** you edit `report.docx` on your laptop on a plane, and a colleague edits it on their computer. Both later sync, and both changes are based on the same old version. Neither can simply win without destroying the other's work. This is the multi-leader conflict from [DDIA Ch 5](../ddia/05-replication.md).

**How:** each upload states the **base version** it was edited from. If the server's current version is newer than that base, there's a conflict. Instead of overwriting, save the second upload as a separate **"conflicted copy"** (`report (Asha's conflicted copy).docx`) and let the people involved merge them. It's simple, nothing is lost, and the user decides.

### Trust the client said "done"?

**Why not:** the client could crash after saying "upload complete", or be buggy, or be malicious, claiming chunks it never uploaded. Marking the file as committed would point other devices at data that doesn't exist.

**How:** **verify** with storage before committing the new version. Either react to **S3 event notifications** for each chunk, or check that every listed chunk exists and its **ETag**/checksum matches the expected hash. Only then mark the file version as committed and add it to the change log for other devices.

## 7. Interview script (45 minutes)

| Time | What you do | Content |
|---|---|---|
| 0–5 | Functional requirements | Upload and download files (up to 50GB); Automatic sync across a user's devices; Share files and folders |
| 5–8 | Non-functional requirements | Resumable uploads; Changes visible on other devices within seconds; Durable (S3 11 nines); Bandwidth-efficient sync |
| 8–10 | Numbers that drive the design | Large files chunked at ~5MB: a 50GB file = 10k chunks. Only changed chunks are re-uploaded, so a 1-byte edit sends 5MB, not 50GB. |
| 10–13 | Entities and API | Keep it short: the endpoints in §3, idempotency keys on writes. |
| 13–25 | v1, then evolve it | Draw v1 and show where it breaks. Then add, in order: S3 → Change log → CDN / presigned. Justify each addition with a number. |
| 25–40 | Deep dives | Resume after failure? · How do devices learn about changes? · Edits on two offline devices? · Trust the client said "done"? |
| 40–45 | Wrap-up | Remaining bottlenecks, failure modes, what you would monitor. |


## Staff-level lens

| Question | Staff answer |
|---|---|
| **The real problem** | Sync efficiently and handle conflicting edits. |
| **Deciding number** | A 50 GB file is ~10k chunks; a 1-byte edit changes one chunk. |
| **Staff call and trade-off** | Content-defined chunking with dedupe, a change log with cursors. Accept "conflicted copy" files for offline edits. |
| **Raise before you're asked** | Conflicts; partial uploads; cross-user dedupe leaking whether a file exists. |
| **Senior stops at** | Chunking. |
| **Staff goes on to** | Conflict UX, the privacy risk of cross-user dedupe, change-log retention. |
| **Run it** | Watch sync latency, bytes uploaded per change, conflict rate. |

All 29 problems through this lens: [Staff-level answers](../playbook/staff-level.md).

## 8. Common mistakes

- Proxying file bytes through API servers, and re-uploading whole files on small edits.
- Adding components before showing which number makes them necessary.
- Skipping failure handling: what happens on timeouts, retries and crashes.

## Self-check

Try to answer before you open each one.

<details class="question" markdown>
<summary>Why split files into hashed chunks?</summary>

Only changed chunks are uploaded, and chunks the server already has (same hash) are skipped.

</details>

<details class="question" markdown>
<summary>How does another device learn about changes?</summary>

It follows a per-user change log with a cursor and fetches only what changed since.

</details>

<details class="question" markdown>
<summary>Why not trust the client saying an upload is done?</summary>

Verify with object storage that the chunks exist (and match their hashes) before marking the file complete.

</details>

## Related

- **Patterns:** [Handling large blobs](../patterns/large-blobs.md)
- **DDIA:** [Ch 5](../ddia/05-replication.md) conflicts · [Ch 11](../ddia/11-stream-processing.md) change log / cursor
- **Similar problems:** [Video platform (YouTube)](video-platform.md) · [Photo sharing (Instagram)](photo-sharing.md)
