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

_None yet — lessons deposited via the federation store appear here._
<!-- fot:federated:end -->
