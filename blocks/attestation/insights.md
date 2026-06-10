# attestation — insights (FoT)

Distilled, cross-project lessons. **Merged, not appended. Capped.** Each entry is the
abstracted lesson only — not raw data, not code. A lesson here was learned in one project
and is meant to save the next one from relearning it. The test of FoT: a lesson crossed a
repo boundary without being hand-copied.

> Seeded from the substrate design work; entries below are starting hypotheses, replaced as
> real projects deposit real lessons.

- **A verifier that throws is a verifier that can be bypassed.** Somewhere upstream an
  exception path becomes a catch-and-continue, and "the check crashed" quietly reads as
  "the check passed". Every failure mode — unknown algorithm, unknown key, garbled proof,
  expired claim — must map to `{valid:false, reason}`. Fail-closed is a return type, not
  a code-review comment.
- **Never let "no expiry" mean "valid forever".** Claims outlive the context that made them
  true: the build is superseded, the workload re-imaged, the employee gone. An absent
  `expiresAt` is an unmade decision — enforce expiry at verify time at every grade, and the
  moment proofs matter in prod, make a policy (`requireExpiry`, max claim age) refuse the
  unmade decision outright.
- **Symmetric signing is fine until the first external verifier — then it is a key leak by
  design.** To check an HMAC the verifier needs the secret, and a verifier holding the
  secret IS a signer. The nursery->elementary jump is asymmetric keys: hand out the public
  half, keep the private half where it was generated. Do it the moment a proof crosses the
  process boundary, not after.

<!-- fot:federated:begin -->
## Federated lessons (auto-synced from the FoT store — do not edit by hand)

_None yet — lessons deposited via the federation store appear here._
<!-- fot:federated:end -->
