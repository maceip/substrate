# payment — insights (FoT)

Distilled, cross-project lessons. **Merged, not appended. Capped.** Each entry is the
abstracted lesson only — not raw data, not code. A lesson here was learned in one project
and is meant to save the next one from relearning it. The test of FoT: a lesson crossed a
repo boundary without being hand-copied.

> Seeded from the substrate design work; entries below are starting hypotheses, replaced as
> real projects deposit real lessons.

- **The idempotency key is the double-charge cure — make it a port guarantee, not a habit.**
  A retried request, a double-clicked button, a webhook redelivery: every one of them issues
  the "same" charge twice, and without a de-dup index keyed on a caller-supplied token, the
  customer is billed twice and you are issuing refunds and apologies. Bind charge() to an
  idempotencyKey at the seam so the same key REPLAYS the first settlement and can never create
  a second one — at every grade, in the in-house ledger and behind the provider both.
- **Money is integer minor units (cents). A float is a bug waiting for a refund.** `0.1 + 0.2`
  is not `0.3`, and the cent that drifts is real money you cannot account for. Carry amounts as
  integers throughout — request, charge, ledger, refund, balance — and reject a fractional
  amount at the port before any adapter sees it. Balance is the SUM of integer ledger entries,
  never a separately mutated total that can fall out of sync with the entries it claims to hold.
- **Verify webhooks fail-closed: a bad or absent signature is rejected, never processed.** An
  inbound "charge.settled" you did not verify is an attacker telling you to ship the goods. At
  the grades where a real provider is in the loop, check the HMAC over the raw body in
  constant time and THROW on mismatch — so an unverified event has no path to being acted on. A
  verified WebhookEvent should be the ONLY thing that exists; "we assumed it was real" is how
  free orders happen.

<!-- fot:federated:begin -->
## Federated lessons (auto-synced from the FoT store — do not edit by hand)

_None yet — lessons deposited via the federation store appear here._
<!-- fot:federated:end -->
