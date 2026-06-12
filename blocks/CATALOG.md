# Block Catalog — GENERATED from CATALOG.json (do not edit; run _kernel/render-catalog.ts)

**245 blocks: 19 built, 226 defined.**
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
| **payment** | payment rail behind a port — sound nursery; clean-catalog rank LOW for this user (the real local pattern is x402 micropayments, a different card) |
| **i18n** | locale routing/messages — sound nursery; clean-catalog rank LOW; keep, no further investment |
| **agent-gates** | executable contracts over agent output; fail-closed artifact gating |
| **remote-exec** | run-to-completion remote command + file sync behind a port |
| **edge-model** | on-device model runtime behind a port |

## Operations (226 — verb grain)

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

### account-org-invite (13)

| op | classes | port | summary |
|---|---|---|---|
| **provision-user-via-verified-email** | A,B | signup request + verification flow → user record | rejection | signup creates the user row only after OTP verification |
| **complete-account-and-bootstrap-org** | A,B | verified signup + invite context → account + optional tenant | first self-signup gets a tenant; invited users don't |
| **create-organization-with-founder-admin** | A | founder + org details → organization | org never exists without exactly one admin |
| **invite-member-to-organization** | A | org + email + role → invite token | single-use expiring invite token |
| **accept-invitation** | A,B | invite token + identity → membership | identity-bound acceptance yielding exactly one membership |
| **verify-email-token** | A,B | token + identity → verified | rejection | single-use, identity-bound email verification |
| **change-member-role-guarded** | B | membership + new role → updated membership | rejection | role changes with self-edit and last-admin guards |
| **offboard-member-guarded** | A,B | membership → offboarded | rejection | removal under last-admin + empty-tenant guards |
| **issue-machine-identity-token** | A,B | identity config + scope → machine token | scoped, bounded, revocable M2M credentials |
| **revoke-machine-token-config** | A | token config → revoked | config delete revokes its live tokens atomically |
| **provision-user-from-idp-directory** | A,B | IdP directory event → user + membership | SCIM just-in-time provisioning, domain-gated |
| **enroll-sso-and-jit-provision** | B | SSO assertion → session + membership | SAML/OIDC login provisioning with takeover guards |
| **enroll-and-verify-totp-mfa** | A,B | enrollment + code → verified method | rejection | one MFA method per user-workspace, verified by code |

### entitlement (12)

| op | classes | port | summary |
|---|---|---|---|
| **refuse-action-over-plan-limit** | A,B | action + plan limits + usage → allow | refusal | hard refusal before commit, not reconciled after |
| **gate-feature-by-tier** | C | plan + feature key → enabled | disabled | feature gate as a pure function of plan |
| **check-feature-entitled** | B | feature key + entitlement context → entitled | denied | layered entitlement check, deny unknown keys |
| **resolve-entitlement-context** | D | billing source records → normalized entitlements | one normalized entitlement shape regardless of source |
| **sync-entitlements-from-billing-idempotently** | A | billing events → reconciled entitlements | webhook replays and reorders cannot corrupt entitlements |
| **handle-subscription-webhook** | B | webhook payload + signature → reconciliation | rejection | verify signature, resolve org, reconcile |
| **change-plan-and-reconcile-provisioned-state** | B,C | plan change + provisioned state → reconciled state | downgrade tears down already-provisioned state |
| **map-subscription-status-to-limits** | D | subscription status + plan → limits | status-aware limit mapping |
| **track-usage-against-entitlement** | A | usage event + cycle anchor → updated counter | per-billing-cycle usage counter, tenant-scoped |
| **reset-usage-on-billing-cycle** | A,C | cycle boundary + counters → reset counters + alerts | cycle reset with overage grace and deduped alerts |
| **derive-usage-limit-from-key** | D | entitlement key → limit value | limits decoded in exactly one place |
| **scope-usage-to-tenant** | B | usage query + tenant → tenant-scoped usage | billing reads always rooted at the org boundary |

### transactional-email (11)

| op | classes | port | summary |
|---|---|---|---|
| **send-transactional-email-on-event** | A | event + recipients + template → queued messages | event triggers one rendered email per recipient |
| **deliver-queued-email-and-record-status** | A,B | queued message → delivery status | idempotent delivery that always records a terminal status |
| **render-templated-message-typed** | B | template + typed data → rendered message | rejection | typed template rendering, fail-closed |
| **track-event-and-trigger-workflows** | C | event + listeners → triggered workflows | system events fan out to listening message workflows |
| **handle-bounce-and-suppress** | B,C | bounce/complaint webhook → suppression record | bounces and complaints feed the suppression list |
| **throttle-and-prioritize-sends** | A,C | send queue + rate policy → ordered dispatches | rate-limited sending with priority lanes |
| **meter-email-usage-idempotently** | A | delivery events → metered usage | volume metering charged exactly once across retries |
| **enforce-monthly-send-limit-warn-once** | A,C | send request + monthly counter → allow | warn | block | block at 100%, warn at 80%, never double-notice |
| **send-email-for-document-lifecycle** | C | document event → queued email | document lifecycle events trigger the right email |
| **send-reminder-with-atomic-claim** | A | due reminders → claimed sends | concurrent sweeps cannot double-send a reminder |
| **send-completion-email-with-artifact** | C | completed artifact + recipients → sent email | completion email carries the finished artifact |

### workspace-tenancy (9)

| op | classes | port | summary |
|---|---|---|---|
| **create-workspace-with-owner-and-plan** | A | owner + plan → workspace | workspace never created without exactly one admin |
| **scope-session-to-workspace** | C | session + workspace → scoped permissions | permissions recomputed from membership per fetch |
| **authorize-action-in-the-query** | B | action + membership → authorized query | role authorization re-asserted in the DB where-clause |
| **invite-member-clamped-to-seats** | A | invite + seat state → invite | rejection | invites cannot overshoot the seat cap |
| **gate-feature-at-write-time** | B | write + plan → clamped write | plan gates clamp on write, not just display |
| **compute-usage-against-quota-window** | C,D | usage events + window → usage vs quota | usage computed in the correct billing window |
| **quarantine-over-quota-workspace** | A,C | usage verdict → quarantine state | over-quota flag set by a job, enforced before sessions |
| **apply-subscription-change-idempotently** | A | subscription event → applied change | no-op | webhook redelivery is a no-op |
| **refuse-stranding-downgrade** | B | downgrade request + usage → allow | refusal | a downgrade that would strand unbillable usage is refused |

### chat (16)

| op | classes | port | summary |
|---|---|---|---|
| **post-message-idempotent-on-token** | A | message + client token → post | retries return the same post |
| **reply-in-thread-and-auto-follow** | A,C | reply + thread → post + follow | thread reply that subscribes the replier |
| **send-room-event-idempotently** | A | event + txn id → room event | dedup | txn-id dedup; identical state events collapse |
| **open-or-create-dm-channel** | A | two actors → DM channel | at most one DM channel per pair |
| **open-group-dm-bounded** | A | actor set → group channel | rejection | group DM with bounded membership |
| **add-user-to-channel-idempotently** | A | user + channel → membership | idempotent join plus system message |
| **change-membership-via-state-machine** | B | membership + transition → new state | rejection | join/leave/invite/kick/ban with legal-transition guards |
| **advance-read-marker-forward-only** | A,C | marker + position → advanced marker | no-op | read marker only moves forward |
| **record-read-receipt** | B,C | receipt + room state → recorded receipt | drop | stale receipts dropped; private receipts never federated |
| **mark-viewed-and-recompute-unread** | C | view event + history → unread counts | unread counts derive from view events |
| **mark-unread-from-post** | C | post + marker → rewound marker | the deliberate inverse of mark-viewed |
| **edit-message-preserving-identity** | B | post + new content → edited post | edits keep id/createAt; editAt only on real change |
| **delete-message-leaving-tombstone** | B | post → tombstoned post | soft delete; thread chains survive |
| **add-reaction-unique-capped** | A | post + user + emoji → reaction | no-op | reactions unique per (post, user, emoji), capped |
| **detect-and-link-mentions-strongest-wins** | C | text + members → linked mentions | mention type resolution that never downgrades |
| **set-typing-presence-ephemeral** | C | actor + channel → presence signal | membership-gated, auto-expiring typing indicator |

### audit-log (8)

| op | classes | port | summary |
|---|---|---|---|
| **record-audit-event** | B | actor + action + resource scope + metadata → audit entry | rejection | one normalized audit entry, tenant-required |
| **write-audit-entry-atomically-with-change** | A,B | mutation + audit entry → committed pair | rolled back pair | audit row persists in the same tx as the mutation |
| **enqueue-audit-event-at-most-once** | A | audit event → queued entry | dedup no-op | out-of-request-path audit queue, idempotent insert |
| **query-audit-log-tenant-scoped** | B | filters + tenant + permission → audit page | filtered audit pages, always tenant-rooted |
| **enforce-audit-retention** | C | retention policy + log → pruned rows | plan-derived expiry, bounded oldest-first pruning |
| **guarantee-append-only-audit-row** | B | audit schema → immutability guarantee | write-once audit rows; no mutation path exists |
| **diff-entity-into-change-entries** | D | old entity + new entity → typed change entries | typed {type, from, to} per changed field |
| **render-activity-timeline** | C | entity + log → timeline view | an entity's history read exclusively from the immutable log |

### moderation (9)

| op | classes | port | summary |
|---|---|---|---|
| **flag-report-content** | A | actor + target + category → report | dedup no-op | user reports with no double-flagging |
| **enqueue-into-review-queue** | A | flagged target → reviewable item | exactly one reviewable per target |
| **auto-hide-past-flag-threshold** | C | flag events + threshold → hidden | visible | threshold-crossing hides content before a human acts |
| **claim-review-item** | A | moderator + reviewable → claim | rejection | at most one moderator works an item |
| **act-on-review-item** | A,B | reviewable + action → transition | no-op | optimistic-locked, transactional review transitions |
| **resolve-report-with-siblings** | C | report + sibling state → resolved | partially resolved | full resolution only when no unresolved sibling reports remain |
| **apply-account-action** | A | account + sanction + report → applied action | no-op | sanction + strike + mod-log + resolution in one transaction |
| **record-moderator-action-modlog** | B | moderator action → mod-log entry | append-only moderator action log |
| **handle-appeal** | A | strike + appeal → appeal outcome | one appeal per strike; approval reverses the sanction |

### transcript-persistence (3)

| op | classes | port | summary |
|---|---|---|---|
| **append-event-write-through** | A | kind + opaque payload → sequenced, timestamped, generation-tagged event record (durable + streamed) | Append one event under a single write lock to an in-memory ring AND an append-only disk file in the same critical section, then broadcast to live subscribers without holding the lock. |
| **resume-stream-from-cursor** | A,C | client cursor (generation, last seq) → gapless event replay, or snapshot, or explicit reset signal | Re-attach a subscriber at (generation, after_seq) and deliver exactly the missed events, falling back to snapshot or in-band cursor_reset when the cursor cannot be honored. |
| **rebuild-live-window-from-log-tail** | C | append-only event file → restored ring window + (newest_seq, generation) for the new run | On open, replay the tail of the append-only file to restore the in-memory window and continue numbering where the previous process stopped. |

### workspace-turn-diffs (2)

| op | classes | port | summary |
|---|---|---|---|
| **diff-turn-against-start-snapshot** | C,D | workspace directory + turn boundary signals → per-turn reversible patch event with file count | Before each turn, commit a baseline into a private shadow VCS; at turn end, emit the workspace delta as one canonical patch event. |
| **revert-turn-by-reverse-patch** | A | previously emitted patch → restored workspace + audit event, or explicit refusal | Undo a turn by reverse-applying the exact patch the turn_diff event recorded. |

### process-supervision (4)

| op | classes | port | summary |
|---|---|---|---|
| **serialize-agent-lifecycle-single-flight** | A | concurrent lifecycle requests → serialized state transitions over exactly one child process | One mutex serializes activate/submit/reset/abort; abort signals the child's process group without killing it. |
| **save-kill-respawn-on-switch** | A,B | target workspace id → fresh child bound to new workspace, prior session durably resumable | Switching workspaces runs save -> graceful-kill -> drain readers -> spawn fresh -> restore. |
| **attribute-emit-to-pinned-binding** | B | child output + binding snapshot → correctly attributed event, or silent drop | Reader threads snapshot (workspace_id, bind_generation) before emitting; the append is dropped if the binding changed in between. |
| **detect-turn-end-from-sideband-marker** | C | sideband idle markers from a supervised process → exactly-once turn-end event + state transition | Turn completion is detected only from an out-of-band channel, never inferred from content. |

### resume-handoff (2)

| op | classes | port | summary |
|---|---|---|---|
| **re-prefill-transcript-on-resume** | B | workspace with prior history → agent with prior context; unmodified user-visible transcript | On workspace re-entry, restore context exactly via saved session if the restore ack arrives; otherwise fall back to silently prepending the rendered transcript to the next prompt. |
| **verify-handoff-bundle-against-live-log** | B,C | handoff bundle + session root → verified/failed report with per-check pass/fail details | A session handoff bundle embeds digests as proofs; verification recomputes both from the live session files and fails on any mismatch. |

### audited-memory (6)

| op | classes | port | summary |
|---|---|---|---|
| **verify-memory-checkpoint-by-exact-replay** | C,B | append-only event log + checkpoint manifest hash → audit certificate (binary drift verdict) + optional auto-correction | Replay the raw event log through the projector and compare the replayed projection's content hash to the checkpoint manifest's body hash; record the verdict as a certificate. |
| **gate-checkpoint-use-fail-closed** | B | checkpoint identity + audit ledger + correction index → may_use verdict with reason | A checkpoint may be used as decision memory only after passing the audit/correction gate; every refusal mode forces re-projection from the raw log. |
| **replay-raw-with-correction-directives** | B,C | event log + correction payloads + projector → corrected projected memory, or refusal | When a blocking correction invalidates the active checkpoint, recover by replaying raw events through the projector with compiled, typed correction directives. |
| **build-revoked-evidence-view** | A,B | immutable event range + correction directives → active evidence log + revoked-evidence log with original bytes | Render a correction-applied view over the immutable log: events carrying invalidated facts are replaced with revocation markers before the decision layer sees them. |
| **interrupt-before-next-predict-on-correction** | B | active checkpoint hash + correction index → barrier decision (interrupt / reproject / proceed) with blocking corrections | A barrier between corrections and the next model call: a blocking correction against the active checkpoint must interrupt before the next prediction. |
| **record-correction-as-append-only-event** | C | validated correction payload → appended event; reproducible per-checkpoint blocking index | Corrections are themselves events appended to the same log, targeting a checkpoint by manifest hash and event range; the blocking set is rebuilt by folding the log. |

### context-cache (1)

| op | classes | port | summary |
|---|---|---|---|
| **reuse-kv-prefix-on-exact-byte-match** | B,D | full prompt + identity + schema → longest exact-prefix hit with suffix, or NotFound | Reuse a cached KV checkpoint only when its recorded prompt prefix is a byte-identical prefix of the current prompt under the full identity tuple. |

### run-attestation (4)

| op | classes | port | summary |
|---|---|---|---|
| **hash-chain-and-sign-run-events** | A,B | run measurement (metrics, hashes, evidence) → signed, chained, content-addressed event record | Every captured run event carries event_index and previous_event_hash, and is signed over its canonical encoding with the signature field cleared. |
| **verify-attestation-chain-against-pinned-roots-deep** | B | attestation token + accepted-platform policy → verified (platform, measurement, binding, depth) or typed refusal | Verify a recursive attestation token chain: each stage's hardware quote checked against pinned vendor roots and its report_data binding, with chain depth bounded. |
| **bind-run-events-to-attested-capture-claim** | B | manifest + verified attestation receipt + event → capture claim; per-event attested/not-attested verdict | Build an attested-capture claim only for allowlisted capture paths advertised by the manifest, then accept an event as attested only if its fields equal the claim. |
| **derive-score-from-signed-events** | D | verified signed events (+ optional budget) → ranked score reports with eligibility status | Rankings and eligibility are derived totals over the signed event set, computed by one canonical formula with deterministic tie-breaking. |

### tamper-evident-log (3)

| op | classes | port | summary |
|---|---|---|---|
| **mirror-log-and-halt-on-inconsistency** | B,A | upstream checkpoint + data tiles + pinned cosigner key → verified local replica, or persisted halt | Follow an upstream transparency log: verify the cosignature on each checkpoint, refetch new entries, recompute the Merkle root locally, and commit durably before advancing in-memory state. |
| **verify-consistency-between-checkpoints** | B | (subtree range, subtree hash, tree size, root, proof hashes) → accept, or thrown consistency exception | Verify a Merkle consistency proof that a subtree is contained in a larger tree with the given root. |
| **publish-entry-under-quorum-cosigned-checkpoint** | A,B | log entry; mirror endpoints + quorum → index immediately; inclusion proof + quorum cosignatures on completion | Append assigns an index immediately; a separate wait blocks until the entry is inside a published signed checkpoint whose covering subtree has collected at least a quorum of independently verified cosignatures. |

### trajectory-drift (5)

| op | classes | port | summary |
|---|---|---|---|
| **self-heal-append-only-trajectory** | A | typed event (ts, type, data) → durable append-only trajectory; clean tail reads | Record activity as JSONL appends; before any read, detect a trailing partial line (crash mid-write) by parse failure and truncate back to the last complete record. |
| **import-events-by-watermark** | A | external append-only history + stored watermark → one trajectory event per new item; advanced watermark | Sync external history into the trajectory using a persisted high-water mark so each source item becomes exactly one trajectory event. |
| **graduate-baseline-from-nursery-window** | C,D | stream of per-commit metric vectors → phase transitions + frozen baselines | Accumulate the first N samples per metric in a nursery phase, compute baselines once at graduation, and return to nursery (full reset) after a long stability streak. |
| **detect-sustained-drift-with-cusum** | C | metric value + baseline + prior snapshot → alarm/no-alarm + new snapshot | Per-metric CUSUM trackers turn a stream of z-scores against frozen baselines into a sustained-drift alarm; all tracker state round-trips through an explicit snapshot. |
| **quarantine-lock-until-remediation** | B | per-commit telemetry (deception counters, CI status) → quarantine decisions with named alarms | Deception-class signals past thresholds trigger quarantine; while quarantined, every subsequent commit is rejected. |
