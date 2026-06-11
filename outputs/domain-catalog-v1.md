# Domain Catalog v1 — operation-grain (grain 2)

The second catalog. `port-catalog-v1` mapped INFRASTRUCTURE (the nouns: persistence, transport,
auth…). This maps the **domain layer** — the *verbs an app does with its data*, at OPERATION grain
(the 2026 "agent skill" unit), mined by READING real code across the user's GitHub corpus
(`gh-corpus-2026.tsv`, 165 repos), not keyword matching. ~60 operations from 14 repos, clustered
by cross-repo recurrence. Recurrence = the reuse proof: an op in ≥2 unrelated repos is a real block.

## The headline: one meta-spine, four hats

The user's commerce, privacy, attestation, AND agent-governance work all sit on ONE spine:
**commit-then-prove under a fresh nonce · verify fail-closed against a pinned root · replay-barrier
before any state change.** That's not four domains — it's a single core competency. It is also exactly
the class of "load-bearing guarantee that must not rot" the freedom principle was written about
(unlinkability at issuance, replay-safety at spend, no-address-leak in routing, fail-closed verify).

---

## Cluster 1 — VERIFIABLE / REPLAY-SAFE CLAIMS  ★ build first (recurs 13 repos, 4 themes)

| op | invariant (the gate) | repos |
|---|---|---|
| **verify-against-pinned-root** (fail-closed) | reconstruct a proof to a PINNED root or reject; unknown/expired/garbled → invalid, never assume-valid | attested-workload, runcards, cordon, tenet, sphinx-tahoe, substrate/attestation |
| **bind-claim-under-fresh-nonce** (commit-then-prove) | a fresh server-chosen nonce binds the claim; binding-before == binding-after; verify before any mutation | tenet, sphinx-tahoe, attested-workload, runcards, PCS |
| **spend-credential-once** (replay-barrier) | atomic one-time spend; nullifier under UNIQUE / monotonic nonce-watermark; fail-closed on replay | tenet, sphinx-tahoe, faest-pass, x402 |
| **issue-unlinkable-credential** (blind-sign + cap) | identity observed ONLY at issuance under a per-(id,epoch) cap; issued token unlinkable to issuance | sphinx-tahoe, tenet, faest-pass |
| **append+prove-membership** (tamper-evident log) | idempotent append; consistency proof reduces exactly to the pinned root; reorder/edit breaks the chain | cordon, runcards, vet |
| **aggregate-M-of-N-witness-quorum** | each witness sig verified against its PINNED key before counting; under-quorum → throw, never proceed | cordon, runcards |

Evidence anchors: `attested-workload:src/quote/verify.rs::verify_platform_quote`,
`tenet:tenet/honesty.py::AskerChallenge`, `sphinx-tahoe:tenet/rate_token.py::spend_token`,
`cordon:dotnet/src/Cordon.Log/Log.cs::Append`, `runcards:src/eat.rs::binding_bytes`.

## Cluster 2 — AGENT GOVERNANCE  (north star; recurs substrate, vet, cursor-anchor, runcards)

| op | invariant | repos |
|---|---|---|
| **gate-output-fail-closed + attribute** | a throwing gate is a block failure (never silent pass); failure labelled local/upstream/structural | substrate/agent-gates, vet, cursor-anchor |
| **score-outcome → re-weight** (spot-audit / drift / reputation) | bounded [0,1] rates; CUSUM for *sustained* drift; monotonic flag; high-deception bypasses to instant quarantine | tenet, cursor-anchor, vet, clipcity |
| **project+checkpoint-audited-memory** | checkpoint hash-addressed over body+range+model+policy; a blocking correction forces re-projection (fail-closed) | vet |
| **deny-tool-call-on-invalidated-fact** | a tool call whose input still carries an invalidated fact is denied at the decision boundary | vet |

## Cluster 3 — SELECTION / MATCHING

| op | invariant | repos |
|---|---|---|
| **rank-candidates-by-fit** (oblivious top-K) | access pattern independent of which entry matched; pad to constant K with cover decoys | tenet |
| **aggregate-weighted-consensus** (anti-gaming quorum) | zero-weight/flagged judge contributes nothing; all-excluded must raise, never silently pick | tenet |

## Cluster 4 — ANONYMOUS TRANSPORT  (domain ops above the network-privacy infra block)

| op | invariant | repos |
|---|---|---|
| **wrap/seal-anonymous-route** (onion + SURB) | each layer reveals only the next hop; length-preserving payload; dummy ≡ real bytes; SURB reply never reveals sender | sphinx-tahoe |
| **reject-replayed-or-expired-packet** (per-hop) | monotonic per-circuit nonce watermark; timestamp in [-skew, max_age]; RAM-only so restart fails closed | sphinx-tahoe |
| **seal-route-name-not-address** | control records NAME, never ADDRESS; any dialable string (scheme/ip/host:port) is a layer violation → reject | sphinx-tahoe |

## Cluster 5 — INGEST / MEASURE

| op | invariant | repos |
|---|---|---|
| **ingest-media/doc → structured-records** (schema-gated) | output is fixed-cardinality valid JSON within constraints; model failure degrades to a deterministic generator, never empty | clipcity |
| **fold-outcome-metrics-back-onto-record** (measure loop) | only completed artifacts synced; metrics monotonic + timestamped so the optimizer reads fresh attributable signal | clipcity, tenet |

## Cluster 6 — EDGE INFERENCE  (a separate, coherent on-device decode loop; recurs ds4, inherent, LiteRT-LM)

| op | invariant | repos |
|---|---|---|
| **convert/quantize-model-for-device + parity-guard** ★ | quantized output stays within tolerance of the fp baseline (export GATED on max/mean abs-diff) | ds4, inherent, LiteRT-LM |
| **manage + reuse KV-cache** | buffers stay shape-consistent with attention context; a reused prefix must be a true byte-prefix tagged with same model/quant | ds4, LiteRT-LM |
| **constrained / speculative decode** (mask-to-grammar · draft-verify · sample · stop-detect) | only grammar-valid tokens finite; accepted speculative tokens == greedy base; no KV drift | LiteRT-LM |

---

## Build priority

1. **Cluster 1 first** — highest recurrence (13 repos), it's the user's core competency, its invariants are
   crisp and executable (perfect for the gate machinery), and substrate already has the adjacent infra
   (attestation, agent-gates, network-privacy) so the domain ops compose cleanly on top. Proof of reuse:
   these 6 ops recompose tenet, runcards, faest-pass, sphinx-tahoe, and cordon.
2. Cluster 2 (governance) — the north star; partly exists as infra (agent-gates), needs the domain verbs
   (score→re-weight, audited-memory).
3. Cluster 6 (edge) — coherent and self-contained, but a different audience; build when edge work is active.
4. Clusters 3/4/5 — real but thinner recurrence; build on demand.

Same block discipline as infra: each domain op = a port (the operation contract) + executable invariant
gates (the load-bearing guarantee, fail-closed) + graded adapters + FoT. The invariant column above IS the
gate set — that's what makes these blocks and not snippets.
