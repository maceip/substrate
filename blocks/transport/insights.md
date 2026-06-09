# transport / http — insights (FoT)

Distilled cross-project lessons. Merged, capped — not a log.

- **Keep an in-process dispatch path, not just `listen`.** Being able to call `handle(method,
  path)` without binding a socket is what lets handlers be composed and tested cheaply, and lets
  one app embed another's routes. Sockets are an adapter detail.
- **A nursery server that silently ignores middleware is a trap the gate must cover.** The
  boundary pipeline (validate/guard) is the first thing a public endpoint needs; the
  public/prod gate exists precisely because forgetting it is invisible until you're attacked.
- **Parse the body once, at the edge.** Handlers should receive already-parsed `body`, never the
  raw stream — otherwise every handler reinvents it and they drift.

<!-- fot:federated:begin -->
## Federated lessons (auto-synced from the FoT store — do not edit by hand)

_None yet — lessons deposited via the federation store appear here._
<!-- fot:federated:end -->
