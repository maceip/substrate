# ai-model — insights (FoT)

Distilled, cross-project lessons. **Merged, not appended. Capped.** Each entry is the
abstracted lesson only — not raw data, not code. A lesson here was learned in one project
and is meant to save the next one from relearning it. The test of FoT: a lesson crossed a
repo boundary without being hand-copied.

> Seeded from the substrate design work; entries below are starting hypotheses, replaced as
> real projects deposit real lessons.

- **Pin the model id; never ship a floating alias.** A "latest" alias silently changes
  capability, price, and request surface under you (parameters that worked yesterday 400
  today). The pinned id lives in ONE place behind the port, so a deliberate model bump is a
  one-line diff — not an archaeology dig through app code.
- **Retry overloaded and invalid-request differently.** 429/529/5xx are weather — backoff
  and retry, then fall over to the next provider. A 400 invalid_request is the caller's bug:
  retrying burns quota reproducing the same failure, and falling back just collects the same
  rejection with a second bill. The error TYPE, not the failure itself, picks the policy.
- **Count usage at the port, not in the app.** Every provider reports tokens in a different
  envelope; the moment counting lives in app code it fragments per call site and dies on the
  first provider swap. One per-process ledger behind the port means spend is observable
  before the invoice — and attributable per provider once routing splits.

<!-- fot:federated:begin -->
## Federated lessons (auto-synced from the FoT store — do not edit by hand)

_None yet — lessons deposited via the federation store appear here._
<!-- fot:federated:end -->
