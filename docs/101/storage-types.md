---
title: "Block, file and object storage"
description: "Three ways to store bytes, and why images and videos almost always go to object storage."
---

# Block, file and object storage

<span class="lvl lvl-b">Beginner-friendly</span>

![Block, file and object storage](../diagrams/101-storage-types.svg)

**Block storage** is a raw disk, such as an AWS EBS volume or a local SSD, attached to one machine. The operating system formats it. It has the lowest latency, which is why databases and OS disks run on it. It can't easily be shared between machines.

**File storage** is a shared filesystem (NFS, AWS EFS) with folders, paths and file locks. Many servers can mount it at once. It is useful for older applications that expect files, but it is harder to scale and slower than it looks.

**Object storage** (S3, Google Cloud Storage, Azure Blob) stores whole objects by **key** in a bucket and is read and written over HTTP. You can't edit part of an object; you replace it. In return it is cheap, almost unlimited, extremely durable (S3 is designed for 11 nines) and works with CDNs. Clients can upload and download **directly** using **presigned URLs**, so large files never pass through your servers.

Keep the **metadata** (owner, size, key) in your database and the **bytes** in object storage.

## When to use it

- **Block**: databases and anything needing a fast local disk.
- **File**: shared files for software that expects a filesystem.
- **Object**: images, video, uploads, backups, logs, data lakes.

> [!TIP]
> **Say this in the interview:** "Uploads go straight from the client to S3 with a presigned URL; we store only the key and metadata in Postgres. Downloads are served through the CDN, so our servers never handle the bytes."

## Self-check

Try to answer before you open each one.

<details class="question" markdown>
<summary>Why do databases use block storage?</summary>

It is a low-latency raw disk attached to one machine, which suits random reads and writes.

</details>

<details class="question" markdown>
<summary>Why should uploads go directly to object storage with presigned URLs?</summary>

The large bytes skip your app servers entirely, so they don't tie up bandwidth and threads; the URL grants limited, expiring access.

</details>

<details class="question" markdown>
<summary>Where do you keep an image's owner and size?</summary>

In your database as metadata, with the object key pointing to the bytes in object storage.

</details>

## Related

- [Handling large blobs](../patterns/large-blobs.md)
- [File storage and sync](../problems/file-sync.md)
- [Video platform](../problems/video-platform.md)
