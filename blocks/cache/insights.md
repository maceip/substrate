# cache — insights (FoT)

Distilled, cross-project lessons. **Merged, not appended. Capped.** Each entry is the
abstracted lesson only — not raw data, not code. A lesson here was learned in one project
and is meant to save the next one from relearning it. The test of FoT: a lesson crossed a
repo boundary without being hand-copied.

> Seeded from the substrate design work; entries below are starting hypotheses, replaced as
> real projects deposit real lessons.

- **A hot miss without single-flight is a self-inflicted outage.** The cache is supposed to
  protect the source, but the moment a popular key expires, N concurrent readers all miss at
  once and N fills hit the source together — exactly when it is least able to take them. Put
  the coalescing in the port (`getOrFill`), not in app code, so no call site can forget it.
- **Stale-while-revalidate is a tradeoff you choose, not a default.** Serving the expired
  value while one flight refreshes hides fill latency, but it silently turns TTL from a
  guarantee into a hint. This block's port makes TTL a guarantee (expired is never served);
  if a project wants SWR it should widen the contract deliberately — and say so in port.ts,
  where the loosening is visible.
- **Invalidation on the write path beats clever TTLs.** Shrinking TTLs to chase freshness
  just buys more misses; the write that made the entry stale knows exactly which keys it
  touched. `del` there, keep TTLs as the backstop for the writes you didn't see.

<!-- fot:federated:begin -->
## Federated lessons (auto-synced from the FoT store — do not edit by hand)

_None yet — lessons deposited via the federation store appear here._
<!-- fot:federated:end -->
