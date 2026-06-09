# env / config — insights (FoT)

Distilled cross-project lessons. Merged, capped — not a log.

- **A missing secret must stop the process, not warn.** The whole value of this block is the
  loud failure at startup. Any adapter that returns `undefined` for a required secret and lets
  the app boot has defeated the point.
- **The .env.example manifest is the cheapest graduation.** The moment a project has one secret,
  the next dev cloning it needs to know it exists. That is the nursery->elementary gate, and it
  costs one file.
- **Re-read secrets on access, don't cache at boot.** Rotation-without-redeploy (the graduated
  capability) only works if the manager is consulted live. Caching the value at startup quietly
  removes the rotation guarantee.

<!-- fot:federated:begin -->
## Federated lessons (auto-synced from the FoT store — do not edit by hand)

_None yet — lessons deposited via the federation store appear here._
<!-- fot:federated:end -->
