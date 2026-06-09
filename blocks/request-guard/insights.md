# request-guard — insights (FoT)

Distilled cross-project lessons. Merged, capped — not a log.

- **Shield before you count.** Reject oversized/malformed requests before they enter the rate
  counter, or an attacker spends your memory just being rejected.
- **A per-process limiter is a lie the moment you scale.** With N instances behind a balancer a
  caller gets N× the quota. That is the elementary->graduated gate; it is invisible until you add
  the second instance, so the gate has to call it.
- **Key on the caller, not the route.** Limiting per-path lets one caller exhaust everyone's
  budget on a hot route. Default the key to the client identity.

<!-- fot:federated:begin -->
## Federated lessons (auto-synced from the FoT store — do not edit by hand)

_None yet — lessons deposited via the federation store appear here._
<!-- fot:federated:end -->
