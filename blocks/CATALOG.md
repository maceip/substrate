# Block Catalog — GENERATED from CATALOG.json (do not edit; run _kernel/render-catalog.ts)

**137 blocks: 19 built, 118 defined.**
A block is one entry in CATALOG.json. Built blocks also have a folder (port.ts, adapters/, gates.ts,
insights.md, PROTECTED, tests). Links are three kinds: **buildsOn** (composition), **classes**
(invariant-class gate library), **evidence** (repos proving recurrence).

## The four invariant classes (the gate library)

| class | name | gate |
|---|---|---|
| A | conservation-under-allocation | `consumed_once AND allocated <= available AND sum(allocations) == total` |
| B | fail-closed-verification-against-pinned-authority | `verify_against_pinned(x) OR reject — unknown/expired/garbled is never assume-valid` |
| C | events-to-reproducible-verdict-in-bounded-window | `verdict == f(events within window), reproducible — never a stored flag, never a bare delta` |
| D | derived-total-from-one-canonical-formula | `total == formula(parts), recomputed — one formula the whole system trusts` |

## Infrastructure (19 — all built)

| block | summary |
|---|---|
| **persistence** | records in, records out; engine swaps behind the port |
| **env** | typed config; fails loud on missing secrets |
| **logging** | structured logger; sink swaps behind the port |
| **transport** | HTTP routing + middleware pipeline + in-process dispatch |
| **input-validation** | boundary validation; zod-backed default grade |
| **request-guard** | rate limiting / shielding middleware |
| **async-jobs** | background jobs behind a queue port |
| **cache** | keyed cache; store swaps behind the port |
| **schema-migrations** | versioned schema changes, registered and auto-run |
| **files** | blob storage behind a content-addressed port |
| **ai-model** | LLM calls behind a port; keyless/offline testable |
| **network-privacy** | peer addresses unrepresentable — opaque handles only (the mixnet wound, closed) |
| **attestation** | quotes/claims verified against pinned roots |
| **realtime** | pub/sub fanout behind a port |
| **payment** | payment rail behind a port (built on contaminated priority; sound nursery) |
| **i18n** | locale routing/messages (built on contaminated priority; sound nursery) |
| **agent-gates** | executable contracts over agent output; fail-closed artifact gating |
| **remote-exec** | run-to-completion remote command + file sync behind a port |
| **edge-model** | on-device model runtime behind a port |

## Operations (118 — verb grain)

### verifiable-claims (6)

| op | classes | port | summary |
|---|---|---|---|
| **verify-against-pinned-root** | B | claim + proof + pinned root → verified claim | rejection | reconstruct a proof to a pinned root or reject |
| **bind-claim-under-fresh-nonce** | A,B | claim + nonce source → bound claim | rejection | commit-then-prove: a fresh server-chosen nonce binds the claim |
| **spend-credential-once** | A | credential + spend context → spend receipt | rejection | atomic one-time spend with a replay barrier |
| **issue-unlinkable-credential** | A,B | identity + epoch + cap → unlinkable credential | blind-sign issuance under a per-identity epoch cap |
| **append-and-prove-membership** | B | entry + log handle → membership proof | tamper-evident log: idempotent append + consistency proof |
| **aggregate-m-of-n-witness-quorum** | B | witness signatures + pinned keys + threshold → quorum verdict | count witness signatures toward a quorum |

### agent-governance (5)

| op | classes | port | summary |
|---|---|---|---|
| **gate-output-fail-closed-and-attribute** | B | artifact + contract → pass | attributed failure | grade an artifact against a contract; label the failure level |
| **score-outcome-and-reweight** | C | outcome events + baseline → updated weights | quarantine signal | spot-audit / drift / reputation scoring that feeds back into weights |
| **checkpoint-audited-memory** | B,C | memory body + policy → checkpointed projection | project memory through hash-addressed checkpoints |
| **deny-tool-call-on-invalidated-fact** | B | tool call + fact ledger → allow | deny | block a tool call whose input carries an invalidated fact |
| **detect-drift-from-baseline** | C | event series + baseline → drift verdict | sustained-drift detection over event series |

### selection (2)

| op | classes | port | summary |
|---|---|---|---|
| **rank-candidates-by-fit** | C | candidates + criteria + K → ranked top-K | oblivious top-K ranking of candidates against criteria |
| **aggregate-weighted-consensus** | C | judgments + weights → consensus verdict | anti-gaming weighted quorum over judges |

### anonymous-transport (3)

| op | classes | port | summary |
|---|---|---|---|
| **wrap-seal-anonymous-route** | A,B | payload + route → sealed packet + reply block | onion-wrap a payload with SURB reply capability |
| **reject-replayed-or-expired-packet** | A | packet + circuit state → accept | reject | per-hop replay/expiry barrier |
| **seal-route-by-name-not-address** | B | route record → validated record | rejection | routing records carry names, never dialable addresses |

### ingest-measure (2)

| op | classes | port | summary |
|---|---|---|---|
| **ingest-document-to-structured-records** | B,C | blob + target schema → typed records | media/doc in, schema-valid records out |
| **fold-outcome-metrics-back-onto-record** | C,D | outcome events + record handle → updated record | measured outcomes attach back to the originating record |

### edge-inference (3)

| op | classes | port | summary |
|---|---|---|---|
| **quantize-model-with-parity-guard** | B,D | model + tolerance → device model | rejection | convert/quantize a model for device, gated on parity |
| **manage-and-reuse-kv-cache** | B | context + cache → cache handle | KV-cache lifecycle with safe prefix reuse |
| **constrained-speculative-decode** | B | prompt + grammar/draft → tokens | grammar-masked and/or draft-verified decoding |

### billing (8)

| op | classes | port | summary |
|---|---|---|---|
| **prorate-plan-change** | A,D | subscription + change + period → proration lines | mid-period plan change billed exactly once, proportionally |
| **meter-usage-event-once** | A | usage event → metered record | dedup no-op | usage events meter exactly once |
| **aggregate-usage-for-period** | C,D | events + window + aggregation → usage totals | windowed usage aggregation for invoicing |
| **compute-invoice-total** | D | lines + coupons + tax rules → totals | invoice total from one canonical formula |
| **calculate-tax** | B,D | lines + address + rules → tax amounts | uncomputable | tax computation that refuses to silently bill tax-free |
| **run-dunning-sequence** | A,C | failed payment + policy → next action | failed-payment retry/notice sequence, each step exactly once |
| **refund-with-tax** | A,D | charge + refund request → refund lines | refund that conserves against the original charge incl. tax |
| **payout-net-of-fees** | A,D | captured transactions + fee schedule → payout amount | payouts derive from one canonical net formula |

### crm-sales (5)

| op | classes | port | summary |
|---|---|---|---|
| **advance-lead-to-prospect** | B | record + stage rules → advanced record | rejection | stage transition with eligibility checks |
| **qualify-opportunity** | B,C | opportunity + criteria → qualified | not | opportunity qualification as a reproducible verdict |
| **declare-opportunity-lost** | B | opportunity + reason → closed record | terminal stage transition with reason capture |
| **submit-order-and-reserve-stock** | A | order + stock ledger → submitted order + reservation | order submission reserves inventory atomically |
| **enforce-customer-credit-limit** | A,B | customer + order + outstanding → allow | reject | block orders that exceed outstanding credit |

### inventory (5)

| op | classes | port | summary |
|---|---|---|---|
| **reserve-stock-within-available** | A | request + ledger → reservation | rejection | reservation never exceeds available |
| **post-stock-ledger-with-valuation** | A,D | movement + valuation method → ledger entry | stock movements post to a ledger with canonical valuation |
| **compute-projected-quantity** | D | ledger snapshot → projected quantity | projected stock from one canonical formula |
| **trigger-reorder-at-threshold** | C | projection + policy → reorder decision | reorder verdict reproducible from ledger + policy |
| **apportion-landed-cost** | A,D | costs + receipt lines → apportioned lines | distribute landed costs across receipt lines |

### accounting (4)

| op | classes | port | summary |
|---|---|---|---|
| **reconcile-payments-against-outstanding** | A | payments + open invoices → allocations | match payments to invoices without over-allocation |
| **allocate-payment-and-update-outstanding** | A,D | allocation + invoice → updated outstanding | allocation updates outstanding via the canonical formula |
| **compute-taxes-and-totals** | D | lines + tax template → totals | document totals via a cumulative tax engine |
| **post-balanced-journal-entry** | A,D | entry lines → posted entry | rejection | double-entry posting that must balance |

### hr (3)

| op | classes | port | summary |
|---|---|---|---|
| **compute-salary-slip-net-pay** | D | earnings + deductions → net pay | net pay from one canonical formula |
| **run-payroll-for-period** | A,D | employees + period → payroll run | period payroll where each employee is paid exactly once |
| **apply-leave-against-balance** | A,B | request + balance → approved leave | rejection | leave consumes a finite balance, fail-closed |

### analytics (6)

| op | classes | port | summary |
|---|---|---|---|
| **compute-funnel** | C | events + step definitions + window → funnel counts | ordered, windowed funnel over events |
| **correlate-funnel-outcomes** | C | funnel result + properties → ranked correlates | which factors correlate with conversion |
| **compute-retention** | C,D | events + cohort + intervals → retention matrix | per-actor retention against a cohort base |
| **build-behavioral-cohort** | C | events + behavior predicate → cohort membership | cohort membership as a function of behavior |
| **evaluate-feature-flag** | C | actor + flag config → variant | deterministic sticky flag evaluation |
| **call-experiment-significance** | C | exposures + outcomes → significance verdict | A/B verdicts with confidence, never bare deltas |

### llm-ops (6)

| op | classes | port | summary |
|---|---|---|---|
| **resolve-prompt-by-label** | B | name + label → prompt version | prompt version resolution by label, fail-closed |
| **resolve-prompt-dependency-graph** | B | root prompt + registry → resolved prompt | composed prompts resolve their dependency graph |
| **score-output-with-llm-judge** | B,C | output + rubric → validated score | LLM-as-judge evaluation with schema-valid scores |
| **map-variables-into-template** | B | template + bindings → rendered prompt | rejection | variable substitution that fails on missing/extra vars |
| **run-experiment-over-dataset** | A,C | dataset + evaluator → run results | each dataset item evaluated exactly once per run |
| **aggregate-runs-for-comparison** | C,D | run results → comparison table | cross-run aggregation by one formula |

### scheduling (5)

| op | classes | port | summary |
|---|---|---|---|
| **compute-bookable-ranges** | C | calendar + policy + window → bookable ranges | availability windows honoring DST, buffers, notice |
| **intersect-mutual-availability** | C | ranges per party → mutual ranges | common free time across parties |
| **generate-slots-without-double-booking** | A | ranges + duration + existing bookings → slots | slot allocation that never double-books |
| **enforce-booking-frequency-limits** | A,C | booking request + history + policy → allow | reject | per-window booking caps |
| **assign-weighted-round-robin** | A,C | candidates + weights + history → assignee | fair assignment by weights over a window |

### marketing (5)

| op | classes | port | summary |
|---|---|---|---|
| **score-lead-idempotently** | A,C | trigger event + scoring rules → score delta | no-op | lead score adjustments apply exactly once per trigger |
| **enroll-in-campaign-exactly-once** | A | actor + campaign → enrollment | no-op | campaign membership is consumed once |
| **schedule-drip-step** | A,C | enrollment state + policy → scheduled step | next campaign step scheduled from event state |
| **execute-step-without-reexecuting** | A | scheduled step → execution record | no-op | campaign step execution is idempotent |
| **rebuild-segment-membership** | C | actors + segment filters → membership set | segment membership recomputed from filters, never hand-set |

### e-commerce (4)

| op | classes | port | summary |
|---|---|---|---|
| **compute-cart-totals** | D | lines + adjustments + tax → totals | line/cart totals from one canonical formula |
| **apply-promotion-across-lines** | A,D | cart + promotion → adjusted lines | a promotion distributes across lines without over-discounting |
| **enforce-campaign-budget-cap** | A | redemption + budget state → allow | reject | promotion spend conserves against a finite budget |
| **split-fulfillment-across-locations** | A | order + location stock → fulfillment plan | fulfillment quantities conserve against the order |

### ownership-sharing (12)

| op | classes | port | summary |
|---|---|---|---|
| **resolve-effective-permission** | B,C | actor + resource + grants → effective permission | effective permission from owner/membership/group/link precedence |
| **resolve-layered-asset-access** | B,C | actor + asset + layers → visible | not | layered visibility (owner/album/partner/link) with subtraction cascade |
| **require-full-access-or-reject** | B | actor + resource set → all | rejection | all-or-nothing batch access gate |
| **scope-list-to-visible** | C | actor + query → scoped query | the shared-with-me query filter |
| **share-resource-at-permission** | A | resource + grantee + level → grant record | add a collaborator as a first-class revocable grant record |
| **resolve-permission-via-group** | C | actor + groups + grants → effective permission | group grant is a live grant for every member |
| **create-scoped-expiring-share-link** | B | resource + scope + expiry → share link | share link bounded by scope and expiry |
| **validate-share-link-on-access** | B | link + request → scoped access | rejection | expiry + scope enforced at every access |
| **revoke-grant** | C | grant record → revoked | revocation instantly narrows every dependent query |
| **keep-tenants-isolated** | B | actor + tenant + query → tenant-scoped query | hard tenant/owner gate before any other logic |
| **transfer-or-protect-ownership** | B | resource + ownership change → new owner | rejection | never orphan a resource |
| **enumerate-effective-policy** | B,C | actor + resource → capability flags | per-object capability flags for the UI, fail-closed |

### notifications (12)

| op | classes | port | summary |
|---|---|---|---|
| **route-event-to-channels-by-salience** | C | event + precedence rules → channel routing | classify an event by its most salient reason, fixed precedence |
| **compute-effective-notification-permission** | C | actor + scope + settings → effective preference | scope-resolved notification preference |
| **notify-respecting-mute-and-dedup** | A,C | event + recipient + history → notification | no-op | the central notification chokepoint |
| **fan-out-to-watchers** | A,C | event + watch records → recipient set | recipient set computed once, deduped across reasons |
| **decide-push-now-or-defer** | C | notification + presence → push now | defer | presence-aware push timing |
| **suppress-during-do-not-disturb** | C | notification + DND schedule → deliver | suppress | DND window suppression |
| **gate-email-by-preference-and-read-state** | C | pending email + read state + prefs → send | drop | don't email what they already read |
| **batch-missed-messages-into-emails** | A,C | missed messages + debounce policy → batched emails | debounce, bucket per conversation, dedup |
| **consolidate-notifications-over-threshold** | A,C | similar notifications + threshold → consolidated notification | N-similar notifications collapse to one row |
| **auto-raise-notification-level-from-engagement** | C | engagement events + current level → new level | no-op | engagement auto-tracks a scope |
| **select-conversations-for-digest** | A,C | activity + last-seen + policy → digest selection | digest content since last seen |
| **remove-mobile-push-when-read** | C | read event + delivered pushes → retractions | notifications self-retract across devices |

### feed-ranking (13)

| op | classes | port | summary |
|---|---|---|---|
| **compute-time-decayed-hot-rank** | D | score + timestamps → rank | hot rank as a pure function of score and age |
| **scale-rank-by-community-activity** | D | rank + community stats → scaled rank | normalize small vs large communities in a global feed |
| **compute-controversy-rank** | D | vote tallies → controversy rank | surface contested items (up ~ down), not popular ones |
| **recompute-stale-ranks-on-schedule** | C | stale set + formula → updated ranks | batched recompute so decay actually moves items |
| **cast-vote-idempotent-upsert** | A,D | actor + item + vote → updated tally | one vote per (user, item); score moves by exact delta |
| **build-threaded-tree-by-materialized-path** | D | path-keyed rows + root → thread tree | subtree in one query, depth-capped |
| **subscribe-and-maintain-count** | A,C | actor + community → membership + count | membership with pending/accepted states and honest counts |
| **fan-out-post-to-follower-timelines** | A,C | post + graph + visibility → timeline writes | write-time fanout to exactly the eligible audience |
| **filter-timeline-by-block-mute-reply** | C | timeline + viewer relationships → filtered timeline | pure per-viewer suppression, no N+1 |
| **follow-account-direct-or-request** | A,B | actor + target + account policy → relationship | pending request | follow routes to direct or approval-gated, then backfills |
| **favourite-idempotently-and-rescore** | A | actor + item → favourite | no-op | repeat favourite is a no-op; one trend signal |
| **reblog-once-and-redistribute** | A | actor + item → reblog + redistribution | boost once, collapse nesting, dedupe against original |
| **resolve-mentions-dropping-blocked** | B | text + relationships → linked mentions | detect, resolve, and link mentions — never notifying blocked parties |

### social-scheduling (9)

| op | classes | port | summary |
|---|---|---|---|
| **schedule-post-into-queue** | A | post + time → scheduled workflow | one live workflow per post |
| **dispatch-due-scheduled-posts** | A | due queue → publish actions | publish exactly once at/after the scheduled time |
| **recover-missed-due-posts** | A,C | queue state + window → recovered dispatches | idempotent sweep for posts the worker missed |
| **validate-post-against-platform-rules** | B | post + platform rules → valid | rejection | reject before publish (char limits, media rules) |
| **format-post-per-platform** | D | canonical post + platform → platform payload | one canonical post renders to each platform's exact shape |
| **retry-publish-with-token-refresh** | B,C | failed publish + credentials → retry | terminal failure | classify the error, refresh, back off, give up cleanly |
| **surface-failed-publish** | B | terminal failure → durable record + notification | durable error + user notification |
| **expand-post-to-multiple-channels** | A | post + channels → per-channel posts | one action fans out to N isolated per-channel posts |
| **slot-post-into-next-free-time** | A | calendar + post → assigned slot | collision-free, future-only calendar slotting |
