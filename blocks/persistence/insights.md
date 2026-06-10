# persistence — insights (FoT)

Distilled, cross-project lessons. **Merged, not appended. Capped.** Each entry is the
abstracted lesson only — not raw data, not code. A lesson here was learned in one project
and is meant to save the next one from relearning it. The test of FoT: a lesson crossed a
repo boundary without being hand-copied.

> Seeded from the substrate design work; entries below are starting hypotheses, replaced as
> real projects deposit real lessons.

- **The port survives the engine; the schema is where the ripple lives.** Swapping memory→file→
  postgres never touched app code in this block. What *did* ripple was the data shape — the
  `version` field had to exist before it was needed. Install baseline fields at nursery so a
  later gate cannot force a retrofit.
- **A lossy default is a trap, not a nursery.** An in-memory store reads as "working" right up
  until a restart in production loses data nobody flagged. The nursery DEFAULT for real work is
  `file` (durable), not `memory`. Reserve `memory` for tests.
- **Graduation is a signal, not a calendar.** The move to postgres is driven by `instances>1` or
  real row counts, observed from infra — not by someone deciding it's time. Wire the gate, let it
  fire.

<!-- fot:federated:begin -->
## Federated lessons (auto-synced from the FoT store — do not edit by hand)

- Swapping memory->file->postgres never touches app code; what ripples is the data shape. Install id/created_at/updated_at/version at nursery so a later gate cannot force a retrofit. *(substrate-nursery, 2026-06-10)*
<!-- fot:federated:end -->
