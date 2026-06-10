# schema-migrations — insights (FoT)

Distilled, cross-project lessons. **Merged, not appended. Capped.** Each entry is the
abstracted lesson only — not raw data, not code. A lesson here was learned in one project
and is meant to save the next one from relearning it. The test of FoT: a lesson crossed a
repo boundary without being hand-copied.

> Seeded from the substrate design work; entries below are starting hypotheses, replaced as
> real projects deposit real lessons.

- **The journal is the schema's memory; without it every deploy re-decides history.** An
  in-memory applied set reads as "working" right up until a second process applies everything
  again on real data. The moment data matters, the applied set must outlive the process — that
  is the nursery->elementary gate, and it is why the default adapter is `file`, not `memory`.
- **An edited migration is a new migration.** Once a migration has run anywhere, its source is
  history, not code. Checksum it at apply time and refuse drift — fixing v7 in place "because
  it never shipped" is exactly how two databases at version 7 stop being the same schema.
- **Write down() while up() is still fresh.** A rollback authored during the incident is written
  by the person with the least context at the worst moment. The `down-defined` requirement fires
  at multi-instance scale precisely because that is when a bad deploy must be reversible.

<!-- fot:federated:begin -->
## Federated lessons (auto-synced from the FoT store — do not edit by hand)

_None yet — lessons deposited via the federation store appear here._
<!-- fot:federated:end -->
