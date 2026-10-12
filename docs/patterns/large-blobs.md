---
title: "Handling large blobs"
description: "Files, photos and videos belong in object storage, and their bytes should never pass through your application servers."
tags: [pattern]
---

# Handling large blobs

<span class="lvl lvl-b">Beginner-friendly</span>

*Files, photos and videos belong in object storage, and their bytes should never pass through your application servers.*

> [!TIP]
> **One-page sketchnote:** [HANDLING LARGE BLOBS on a single page](../sketchnotes/pattern-large-blobs.svg), for revision or printing.

## When to reach for it

- Users upload or download files larger than a few megabytes.
- Media needs processing after upload (thumbnails, transcoding).

## The problem

Some data is **big**: videos, photos, PDFs, backups, from megabytes to many gigabytes per file. Your app servers are built for small, quick requests. If a 2 GB upload flows through them:

- it ties up a server's connection, memory and bandwidth for minutes;
- a dropped connection at 95% means starting again from zero;
- a few hundred simultaneous uploads can starve every other request.

Databases are the wrong place for the bytes too: big rows bloat backups and replication.

The idea is that the bytes and the **information about** the bytes take **different paths**. The bytes go straight between the client and **object storage** (S3, Google Cloud Storage), which is built for exactly this. Your servers only handle the small metadata.

## The idea, step by step

![Pattern 6: Handling Large Blobs](../diagrams/pattern-large-blobs.svg)

1. **The client asks your API for permission to upload** ("I want to upload `video.mp4`, 2 GB"). The API checks the user is allowed, creates a metadata row in the database (owner, size, `status = PENDING`, the storage key), and…
2. **…returns a presigned URL.** This is a URL to the storage bucket with a **signature** built in, granting permission to upload **that one object**, for a short time (say 15 minutes), without giving the client any storage credentials.
3. **The client uploads directly to object storage** using that URL. For big files it uses **multipart upload**: the file is split into parts (say 10 MB each) that upload in parallel, and if one fails, only that part is retried. If the connection drops, the upload **resumes** where it left off. Your servers handle none of these bytes.
4. **Object storage tells you when it's done.** When the upload completes, the storage service emits an **event notification**, which triggers your processing: thumbnails, virus scanning, video transcoding. When processing finishes, the metadata row is set to `READY`. Don't rely on the client saying "I'm done", because clients crash or lie. Trust the storage event, or check the object exists.
5. **Downloads come from a CDN** in front of the storage (or via presigned download URLs for private files). Users get the bytes from a server near them, and again your app servers never touch them.

**What to mention:** set an expiry on unfinished multipart uploads so abandoned parts don't cost money forever, store a checksum to detect corruption, and keep the bucket private, with access only through presigned URLs or the CDN.

## Decision checklist

1. Upload with presigned URLs directly to object storage.
2. Use multipart upload for anything big: parallel, resumable chunks.
3. Store metadata (owner, status, size, checksum) in a database, separate from the bytes.
4. React to storage events to start processing; mark the item ready only when done.
5. Serve downloads through a CDN or presigned GET URLs.

## In the interview

> [!TIP]
> "The API only hands out a presigned multipart URL; the client uploads straight to S3. An S3 event triggers processing, and the file shows as ready when processing finishes."

## Common mistakes

- Streaming file bytes through API servers.
- Storing blobs in the database.
- Trusting the client to report that an upload completed.

## Problems that use it

- [Video platform (YouTube)](../problems/video-platform.md): Two hard problems: getting gigabyte uploads in reliably, and streaming smoothly on any connection.
- [File storage and sync (Dropbox)](../problems/file-sync.md): Syncing a 50 GB file after a one-byte edit should not mean uploading 50 GB again.
- [Photo sharing (Instagram)](../problems/photo-sharing.md): A news feed plus a media pipeline: two well-known problems combined.

## The theory underneath

- [DDIA Ch 10: Batch processing](../ddia/10-batch-processing.md)
