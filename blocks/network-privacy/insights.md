# network-privacy — insights (FoT)

Distilled, cross-project lessons. **Merged, not appended. Capped.** Each entry is the
abstracted lesson only — not raw data, not code. A lesson here was learned in one project
and is meant to save the next one from relearning it. The test of FoT: a lesson crossed a
repo boundary without being hand-copied.

> Seeded from the substrate design work; entries below are starting hypotheses, replaced as
> real projects deposit real lessons.

- **Storing a peer-linkable address anywhere in app-visible data destroys the anonymity
  guarantee.** A real project died this way: "users can't dial each other directly" lived only
  in prose, an agent stored a peer address to route around a problem, and the property silently
  rotted — nobody caught it for days. The port exists so that guarantee is executable: app code
  never receives an address, so it cannot store one, and the adversarial test proves it every run.
- **Opaque means minted, not masked.** A handle that ENCODES an address (hex, base64, a
  truncated hash) is an address with extra steps — one curious log line from de-anonymization.
  Mint handles from a CSPRNG with zero input from the address and non-reversibility is free,
  by construction rather than by audit.
- **One relay hides the endpoints from each other, not from the relay.** The elementary hop is
  enough while the threat model is the peers themselves; on a hostile network the relay IS the
  observer — that is the gate that forces multi-hop, sealed envelopes, and cover-traffic
  readiness, driven by observed signals, not by a vibe about being "more secure".

<!-- fot:federated:begin -->
## Federated lessons (auto-synced from the FoT store — do not edit by hand)

_None yet — lessons deposited via the federation store appear here._
<!-- fot:federated:end -->
