# input-validation — insights (FoT)

Distilled cross-project lessons. Merged, capped — not a log.

- **Validate at the boundary, once, and pass the typed value down.** If handlers re-check shapes
  they drift; if they don't, raw input leaks inward. The middleware is the single choke point.
- **Coercion is part of validation, not a separate step.** `"3"` from a query string is a number
  the moment it's validated, or every downstream consumer coerces it differently.
- **A boolean "valid?" is a nursery answer.** The moment input is public, the caller needs to know
  WHICH field and WHY — that is the nursery->elementary gate, and it's the difference between a
  usable 400 and a support ticket.

<!-- fot:federated:begin -->
## Federated lessons (auto-synced from the FoT store — do not edit by hand)

- validate() middleware originally discarded the coerced value, so handlers saw the raw body (dir: 42 stayed a number and isAbsolute threw). Fixed in substrate Jun 2026: on success the middleware writes the coerced value back onto req.body, regression-tested in block.test.ts. In projects stamped BEFORE the fix, call parse() directly and consume r.value. *(workdesk, 2026-06-10)*
<!-- fot:federated:end -->
