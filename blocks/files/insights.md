# files — insights (FoT)

Distilled, cross-project lessons. **Merged, not appended. Capped.** Each entry is the
abstracted lesson only — not raw data, not code. A lesson here was learned in one project
and is meant to save the next one from relearning it. The test of FoT: a lesson crossed a
repo boundary without being hand-copied.

> Seeded from the substrate design work; entries below are starting hypotheses, replaced as
> real projects deposit real lessons.

- **Key naming is the schema of blob storage.** A database table can be migrated in one
  statement; renaming a million objects is a copy of every byte with no tooling. Design
  namespaced keys (`<entity>/<id>/<filename>`) at nursery, before the first real upload —
  the cheapest moment to choose them is the only cheap moment.
- **The download link is the seam, not the bytes.** The moment app code hands a client a
  disk path or a bucket hostname, the engine has leaked past the port and the move to
  S3/R2 becomes a hunt through templates and emails. Every link a client sees must come
  from `url()` — then file:// becomes a presigned URL by swapping one adapter file.
- **A torn upload is worse than a failed one.** A failed put retries; a half-written object
  behind a valid key serves corruption until someone notices. Atomic put (temp + rename)
  plus the sha256 etag turns "is the file ok?" from a guess into a check — and orphaned
  blobs (the row was deleted, the object wasn't) are why lifecycle sweeps exist.

<!-- fot:federated:begin -->
## Federated lessons (auto-synced from the FoT store — do not edit by hand)

- BlobStore stores and serves blobs but nothing walks a local directory tree or applies one back to disk — snapshot/restore of a workspace dir is app-side; only the blob layout belongs to the block. *(workdesk, 2026-06-10)*
<!-- fot:federated:end -->
