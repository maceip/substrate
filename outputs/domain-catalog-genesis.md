# Domain Catalog — GENESIS

The founding grain-2 (operation) catalog. The seed the domain-block library grows from; everything
after is accretion onto this. Two halves, deliberately:

- **Your repos** (14 read) — the eccentric spine: agentic commerce, privacy/mixnet, attestation,
  agent-governance, edge inference. Mined from `gh-corpus-2026.tsv` (165 repos touched since 2026).
- **OSS de-bias** (9 repos) — the mainstream business logic your repos miss: billing (Lago, Polar),
  ERP/CRM/sales/inventory/HR (ERPNext + Frappe HR), product analytics (PostHog), LLM-ops (Langfuse),
  scheduling (Cal.com), marketing automation (Mautic), e-commerce (Medusa). Chosen by the filter
  *product-domain-logic, not horizontal platform* (a Terraform lib is user-facing but its verbs are
  infra we already have → excluded).

~119 operations, read out of real code, not keyword-matched. But the operations are many; the
**invariant classes are few** — and they are the same across the eccentric and the mainstream halves.
That is the genesis finding.

---

## THE DEEP STRUCTURE — four invariant classes (this IS the gate library)

Every one of the ~119 operations is anchored by a load-bearing invariant, and they collapse into four
classes. These are not domain-specific. They recur across your crypto work AND billing AND ERP AND
analytics. Each class is one executable gate shape (MOSS: the check runs; AEvo: tighten-only).

### Class A — CONSERVATION UNDER ALLOCATION
*A finite quantity is consumed/allocated **exactly once**, never over-allocated, against a canonical
total. Gate: `consumed_once ∧ allocated ≤ available ∧ Σallocations = total`.*
- crypto: `spend-credential-once` (nullifier), `reject-replayed-packet` (nonce-watermark) — your repos
- billing: `meter-usage-event` (idempotent on txn id), `prorate-plan-change`, `top-up/consume-wallet`
- ERP: `reserve-stock-within-available`, `reconcile-payments-against-outstanding`, `post-balanced-journal-entry` (debit=credit), `allocate-payment-and-update-outstanding`
- commerce/ops: `reserve-inventory-without-over-allocating`, `enforce-campaign-budget`, `enroll-in-campaign-exactly-once`, `execute-step-without-re-executing`, `generate-slots-without-double-booking`
- **This is the single biggest class.** Your `spend-once` and a 20-year-old ERP's `reserved ≤ available` are the same gate.

### Class B — FAIL-CLOSED VERIFICATION AGAINST A PINNED AUTHORITY
*A guard conclusively passes or rejects; unknown/expired/garbled → reject, never assume-valid. Gate:
`verify_against_pinned(x) ∨ reject`.*
- crypto/attest: `verify-against-pinned-root` (quote/merkle), `bind-claim-under-fresh-nonce`, `walk-attestation-chain`, `aggregate-M-of-N-quorum`
- governance: `gate-output-fail-closed`, `deny-tool-call-on-invalidated-fact`
- ERP: `enforce-customer-credit-limit`, `apply-leave-against-balance`
- analytics/llmops: `validate-score-against-config`, `validate-eval-output-against-schema`
- billing: `calculate-tax` (uncomputable address must surface, not silently bill tax-free)

### Class C — EVENTS → REPRODUCIBLE VERDICT IN A BOUNDED WINDOW
*A membership/decision is a deterministic function of events in a window/eligibility — never a stored
flag, never a bare delta. Gate: `verdict = f(events ∩ window)`, reproducible.*
- analytics: `compute-funnel` (ordered, windowed), `compute-retention` (per-actor base), `build-behavioral-cohort`, `call-experiment-significance` (CI/exposure, never bare delta), `evaluate-feature-flag` (deterministic sticky hash)
- governance: `detect-drift-from-baseline` (CUSUM), `score-deception-rates`, `score-reputation-from-spot-audit`
- llmops: `score-output-with-llm-as-judge`, `aggregate-run-items-for-comparison`
- commerce/marketing: `rank-candidates-by-fit` (oblivious), `rebuild-segment-membership`

### Class D — DERIVED TOTAL FROM ONE CANONICAL FORMULA
*One reproducible formula the whole system trusts; the formula IS the contract (MOSS). Gate:
`total == formula(parts)`, recomputed, never drifts.*
- ERP: `net_pay = gross − Σdeductions`, `outstanding = total − Σallocated`, `projected_qty = …` (single canonical formula), `grand_total` via cumulative tax engine
- billing/commerce: `invoice_total = Σlines − coupons + tax`, `cart_total = subtotal − discount + tax` (BigNumber, no float drift, tax backed out for inclusive)
- analytics: retention normalized to cohort size at interval 0

> The crypto spine you started from — *commit-then-prove under a fresh nonce, replay-barrier* — is just
> **A + B composed**. Your eccentric work isn't a different kind of thing; it's the most rigorous instance
> of the same four classes the whole software world runs on.

---

## OPERATION INVENTORY (by cluster — full evidence in the mining transcripts)

**Your repos (eccentric half) — ~60 ops:**
| cluster | representative ops | classes | repos |
|---|---|---|---|
| verifiable-claims | verify-against-pinned-root · bind-claim-under-nonce · spend-once · issue-unlinkable-credential · append+prove-membership · M-of-N-quorum | A,B | tenet, attested-workload, runcards, cordon, sphinx-tahoe |
| agent-governance | gate-output-fail-closed+attribute · score→re-weight · checkpoint-audited-memory · deny-on-invalidated-fact | B,C | substrate, vet, cursor-anchor, runcards |
| selection | rank-by-fit (oblivious) · weighted-consensus | C | tenet |
| anonymous-transport | wrap/seal-onion+SURB · reject-replay · name-not-address | A,B | sphinx-tahoe |
| ingest/measure | media→records (schema-gated) · fold-metrics-back | C,D | clipcity, tenet |
| edge-inference | quantize+parity-guard · KV-cache-reuse · constrained/speculative-decode | B,D | ds4, inherent, LiteRT-LM |

**OSS de-bias (mainstream half) — ~59 ops:**
| cluster | representative ops | classes | repos |
|---|---|---|---|
| billing/monetization | prorate-plan-change · meter-usage-once · aggregate-usage · invoice-total · tax-as-MoR · dunning · refund-with-tax · payout-net-of-fees | A,B,D | Lago, Polar |
| ERP: CRM/sales | lead→prospect · qualify-opportunity · declare-lost · submit-SO+reserve-stock · credit-limit | A,B | ERPNext |
| ERP: inventory | reserve-within-available · stock-ledger+valuation · projected-qty · reorder · landed-cost | A,D | ERPNext |
| ERP: accounting | reconcile-payments · allocate-payment · taxes-and-totals · balanced-journal-entry | A,D | ERPNext |
| ERP: HR | salary-slip-net-pay · run-payroll-for-period · apply-leave-against-balance | A,B,D | Frappe HR |
| analytics | funnel · funnel-correlation · retention · cohort · feature-flag · A/B-significance | C | PostHog |
| llm-ops | resolve-prompt-by-label · resolve-prompt-graph · llm-as-judge-eval · map-vars · validate-score · run-experiment-over-dataset · aggregate-runs | B,C | Langfuse |
| scheduling | bookable-ranges (DST/buffers/notice) · intersect-mutual-availability · slots-no-double-booking · frequency-limits · weighted-round-robin | A,C | Cal.com |
| marketing | lead-scoring (idempotent) · enroll-once · schedule-drip-step · execute-step-once · rebuild-segment | A,C | Mautic |
| e-commerce | line/cart-totals · apply-promotion-across-lines · campaign-budget-cap · reserve-inventory · split-fulfillment | A,D | Medusa |

---

## WHAT TO BUILD (the genesis tells you the order)

1. **The gate library first — the four invariant-class gates (A,B,C,D)** as a small reusable kernel.
   They are the highest-leverage code in the whole system: every domain block composes a port + one or
   more of these gates. This is the deepest reuse surface we have found, and it is what makes these
   blocks and not snippets. (`agent-gates` + `_kernel/grade.ts`'s assertNoLoosening are the seed.)
2. **Class-A domain blocks** (conservation under allocation) — the biggest class, spanning your work
   and all of billing/ERP/commerce. `spend-once`, `reserve-against-available`, `allocate-vs-outstanding`,
   `balanced-double-entry`. Build these as operation-grain blocks; they recompose tenet, Lago, ERPNext,
   Medusa, and Cal.com at once.
3. Then the per-domain operations that ride those gates, by recurrence.

The genesis claim: a new app — yours or a "real startup guy's" — is a composition of operation blocks,
and each operation block is a port + one of four invariant-class gates. The infra catalog gave the nouns;
this gives the verbs; the four classes give the *guarantees that make the verbs trustworthy*.
