# Domain Catalog — enterprise/chat wave (rescued from the mining session transcript, Jun 12 2026)

The fourth and FINAL grain-2 mining pass ("corpus closed", session 2f3c1234, Jun 11 08:07-08:42).
~61 ops from 9 enterprise/chat repos: Infisical, Twenty (account/org/invite, 13) · dub, Formbricks
(entitlement/quota, 12) · Plunk, Documenso (transactional email, 11) · Typebot (multi-tenant
workspace, 9) · Mattermost, Synapse (chat, 16). Like the hole-fill wave, this content existed ONLY
in the transcript; rescued verbatim below and merged into blocks/CATALOG.json (registry of record).

Miner's honest residual gaps, preserved: audit/activity-history and moderation/review-queue were
NOT mined (no dedicated source). Two candidate repos were dropped as fabricated/closed (Loops,
Mintlify); Obsidian skipped (closed-source); Langfuse already mined.

---
==== 2026-06-11T08:10:06.763Z
Checked both — two catches:

**Obsidian: not open.** Its core is proprietary/closed-source — only the plugin API and community plugins are open. So there's no "big fat thing" to mine. If you want notes/PKM domain logic, the genuinely-open ones are **Logseq, Joplin, AppFlowy/Affine** — but heads-up, that's docs/collab/sharing, which we already pulled from Outline, so it'd mostly *overlap* rather than fill a gap. I'd skip it unless you specifically want the local-first/graph-backlink angle.

**Matrix: yes, open** — Synapse (homeserver, Python, AGPL) + Element (client), plus the newer ESS Community FOSS server. So it's mineable. **But** for the *chat* gap specifically, Synapse is heavy on federation/protocol plumbing (state resolution, sync) — more infra than conversation-product logic. For clean chat domain verbs, **Mattermost** (Go, MIT, Slack-like, batteries-included) or **Rocket.Chat** (most features) mine better: channels, DMs, threads, mentions, read-receipts, presence, reactions.

**My recommendation for the chat hole:**
- **Mattermost** (`mattermost/mattermost`) — cleanest conversation-product domain logic
- **+ Matrix/Synapse** (`element-hq/synapse`) *only if* you also want the federated / E2E / read-receipt protocol angle (it's distinct, just heavier)

So: pull **Mattermost** (definitely) and **Matrix/Synapse** (optional, for the federation angle), **skip Obsidian**. Want me to mine those two now — same read-only grain-2 extraction — or just Mattermost?

Sources: [Obsidian is proprietary (Wikipedia)](https://en.wikipedia.org/wiki/Obsidian_(software)) · [Matrix/Element/Mattermost/Rocket.Chat are open (selfhosting.sh)](https://selfhosting.sh/best/communication/)

==== 2026-06-11T08:12:59.769Z
Reality check done — and it's a good thing you asked, because **2 of the 10 don't exist** and two had wrong names:

| repo | real? | ⭐ | notes |
|---|---|---|---|
| Infisical/infisical | ✅ | 27.3k | source-available, active |
| **dubinc/dub** | ✅ | 23.7k | (you wrote `dubco/dub` — that's 404; it's `dubinc/dub`) |
| twentyhq/twenty | ✅ | 49.7k | active |
| **useplunk/plunk** | ✅ | 5.2k | AGPL (you wrote `plunk/plunk` — 404; it's `useplunk/plunk`) |
| baptisteArno/typebot.io | ✅ | 10k | active |
| documenso/documenso | ✅ | 13.3k | AGPL, active |
| formbricks/formbricks | ✅ | 12.4k | active |
| langfuse/langfuse | ✅ | 28.9k | **already mined** (we have its 7 ops) |
| **loops-so/loops** | ❌ | — | 404 — Loops.so isn't open; description was fabricated |
| **mintlify/mintlify** | ❌ | — | 404 — no public monorepo; description fabricated |

So: **7 real to mine** (Infisical, dub, Twenty, Plunk, Typebot, Documenso, Formbricks); Langfuse already done; Loops + Mintlify dropped. The "NOASSERTION" licenses are source-available enterprise (custom commercial licenses) — readable for mining, and exactly the "real operational stack open for audit" you wanted.

One sharpening: these are 7 *different* products (secrets/CRM/e-sign/surveys/etc.) but you flagged the **same three slices in every one — auth/account/org-invite, billing/entitlement, transactional-email**. That's precisely gaps #1 and #3 plus notifications. So I'm pointing the miners at *those cross-cutting slices*, not each product's vertical (we already have CRM, etc.). Launching 4 now:

==== 2026-06-11T08:14:40.420Z
Four miners running over the **7 verified repos**, pointed at the cross-cutting slices that fill your gaps (not the products' verticals):

- **Account / org / invite lifecycle** ← Infisical + Twenty
- **Entitlement / quota gating** ← dub + Formbricks
- **Transactional email / invites** ← Plunk + Documenso
- **Multi-tenant workspace + entitlement** ← Typebot

These hit gap #1 (account/org/invite) and gap #3 (entitlement) dead-on, plus the transactional-email side of notifications. I'll print each batch as it lands. (Two still-open threads from before, parked: the **chat** mine — Mattermost/Matrix — you never confirmed, and **Obsidian** is out as closed-source.)

==== 2026-06-11T08:20:31.871Z
Chat miner running — that's the last source, so the corpus is now **closed**.

While that and 3 others run, the **transactional-email/invite miner (Plunk + Documenso)** just landed — **11 ops**:
- `send-a-transactional-email-on-an-event` — upsert recipient, render, queue one per recipient
- `route-and-deliver-a-queued-email-and-record-status` — idempotent, re-checks suppression at send, always records terminal status
- `render-a-templated-message-with-typed-data` — fails closed on missing vars (never ships raw `{{...}}`)
- `track-a-system-event-and-trigger-listening-workflows` — the event→message fan-out
- `handle-bounce/complaint-and-suppress-the-address` — permanent bounce always suppresses, never sent again
- `throttle/prioritize-sends-against-a-rate-limit` — transactional jumps ahead of campaign bursts
- `meter-email-usage-by-volume-idempotently` — charged exactly once across retries
- `enforce-a-monthly-send-limit-with-warn-once` — block at 100%, warn at 80%, SET-NX so no double-notice
- `send-an-email-for-a-document-lifecycle-event` — "you have a document waiting to sign"
- `send-a-reminder-with-atomic-claim` — conditional update so concurrent sweeps can't double-send
- `send-a-completion-email-with-the-artifact-attached`

Spine: **event → durable message row → render (fail-closed) → suppression+limit gate → priority queue (idempotent id) → deliver → record status**, with bounce webhooks feeding suppression back. Strong fill for the transactional side of notifications + invites.

Still running: account/org-invite (Infisical+Twenty), entitlement (dub+Formbricks), workspace (Typebot), and chat (Mattermost+Synapse). I'll print each as it lands, then we're closed.

==== 2026-06-11T08:20:55.487Z
**Entitlement / quota gating (dub + Formbricks)** — 12 ops, gap #3 filled:
- `refuse-an-action-when-over-plan-limit` — hard refusal *before* commit, not reconciled after
- `gate-a-feature-by-tier` — pure function of plan, one capability matrix so gates can't drift
- `check-if-a-feature-is-entitled` — layered: entitled AND license-active AND not trial-restricted, unknown key denied
- `resolve-entitlement-context` — one normalized shape whether source is Stripe or a license
- `sync-entitlements-from-stripe-idempotently` — event-id + created-date ordering guard (replays/reorders can't corrupt)
- `handle-a-stripe-subscription-webhook` — verify sig, resolve org, reconcile
- `change-plan-and-reconcile-entitlements` — **downgrade tears down already-provisioned state** (disable webhooks, delete folders), not just "set plan"
- `map-subscription-status-to-limits` — trialing gets trial caps even on a paid plan
- `track-usage-against-an-entitlement` — per-billing-cycle counter, tenant-scoped, never spans cycles
- `reset-usage-on-billing-cycle` — overage grace + dedup'd alert emails (no cron spam)
- `derive-a-usage-limit-from-an-entitlement-key` — `unlimited`→null, absent→preserve, decoded in one place
- `scope-usage-to-the-tenant-org` — billing reads always rooted at the org boundary

Spine: **Stripe event → idempotent reconcile → normalized entitlement record (features + limits + cycle anchor) → two enforcement modes: pure feature-gate and per-cycle usage-counter.** The non-obvious keeper: the webhook *reconciles provisioned state*, not just flips a plan flag.

Still running: account/org-invite (Infisical+Twenty), workspace (Typebot), chat (Mattermost+Synapse). 2 of 5 in.

==== 2026-06-11T08:23:17.514Z
**Multi-tenant workspace (Typebot)** — 9 ops, reinforcing gaps #1 + #3:
- `create-a-workspace-with-its-owner-and-default-plan` — never created without exactly one ADMIN, free-tier capped + cooldown
- `scope-the-session-to-a-workspace-and-resolve-mode` — permissions recomputed from membership in the *scoped* workspace each fetch, never carried over
- `authorize-a-workspace-action-by-membership-role` — re-asserted in the DB `where` clause, not just app code (the everywhere-verb)
- `invite-a-member-clamped-to-the-seat-limit` — members + pending invites summed so an invite can't overshoot the cap
- `gate-a-feature-by-plan-tier` — clamped at **write time** (forged payload can't keep a perk)
- `compute-workspace-usage-against-monthly-quota` — correct window (Stripe period vs calendar)
- `clamp-an-over-quota-workspace-by-quarantining-it` — flag set by job, *enforced before a session starts*, idempotent
- `apply-a-stripe-subscription-change-idempotently` — guarded by previous attributes, redelivery is a no-op
- `change-a-subscription-with-a-downgrade-safety-check` — refuses a downgrade that would strand unbillable usage

Overlaps with the dub/Formbricks entitlement ops (webhook, downgrade, quota) — that's the recurrence *confirming* the pattern, not waste. The new-here verbs: create-workspace-with-owner, scope-session, role-gate-in-the-query, seat-clamped-invite, quarantine.

3 of 5 in. Still running: **account/org-invite** (Infisical+Twenty) and **chat** (Mattermost+Synapse) — then closed.

==== 2026-06-11T08:27:15.042Z
**Chat / conversations (Mattermost + Synapse)** — 16 ops, the chat gap filled:
- `post-a-message-to-a-channel` — idempotent on a client token (retries return the same post), thread-root validated
- `reply-in-a-thread-and-auto-follow`
- `send-a-room-event-idempotently` — txn-id dedup, identical state events collapse
- `open-or-create-a-direct-message-channel` — at most one DM per pair, canonicalized so concurrent creates collide
- `open-a-group-DM` — bounded membership
- `add-a-user-to-a-channel` — idempotent join + system message
- `change-room-membership-via-a-state-machine` — join/leave/invite/kick/ban/unban with legal-transition guards
- `advance-a-read-marker` — **only moves forward**, linearized per (room,user)
- `record-a-read-receipt` — stale receipts dropped, private never federated
- `mark-as-viewed-and-recompute-unread`
- `mark-as-unread-from-a-post` — the deliberate inverse
- `edit-a-message-preserving-identity` — same id/createAt, editAt only when content changed
- `delete-a-message-leaving-a-tombstone` — soft, thread chains survive
- `add-a-reaction` — validated, (post,user,emoji) unique, capped
- `detect-and-link-@mentions` — strongest type wins, never downgrades
- `set-typing-presence` — ephemeral, auto-expires, membership-gated

Recurring spine: **idempotent send keyed by a client token** + **monotone forward read-marker** — and there's that "exactly-once / can't-go-backward" shape again, same as conservation/consume-once everywhere else.

4 of 5 in. Just **account/org-invite** (Infisical + Twenty) left — then the corpus is closed.

==== 2026-06-11T08:38:55.459Z
**Account / org / invite lifecycle (Infisical + Twenty)** — 13 ops, the biggest gap (#1) filled:
- `provision-a-user-via-verified-email-signup` — user row only created after OTP; no enumeration oracle
- `complete-account-and-bootstrap-org` — constant-time (no timing oracle); first self-signup gets a tenant, invited users don't
- `create-an-organization` — founder seated as the sole Admin atomically; org never exists without one
- `invite-a-member-to-an-organization` — one outstanding invite per (org,email), single-use expiring token
- `accept-an-invitation` — identity-bound, token hard-deleted on accept, exactly one membership at the invited role
- `verify-email` — single-use, hash-at-rest, identity-bound
- `assign/change-a-member-role` — can't edit your own; **last-admin guard**
- `remove/offboard-a-member` — last-admin + empty-tenant guards under an advisory lock; cascade soft-delete
- `issue-a-machine-identity-token` — scoped, TTL/use-count-bounded, revocable (M2M/API keys)
- `revoke-a-machine-token-config` — delete config + revoke its tokens in one tx (no orphaned live token)
- `provision-a-user-from-the-IdP-directory` — SCIM JIT, domain-ownership-gated, alias-idempotent
- `enroll-SSO + JIT-provision-on-login` — SAML/OIDC, guards against alias-collision account takeover
- `enroll/verify-TOTP-MFA` — one method per user-workspace, secret encrypted, flips VERIFIED only on valid code

Spine: **provision (email-verified) → create-org (founder=Admin) → invite/accept (single-use token → one membership) → role-change (last-admin guarded) → offboard (last-admin + empty-tenant guarded)**, with M2M tokens and SSO/SCIM feeding the *same* membership table.

---

## Corpus closed. ✅

**This wave (9 enterprise/chat repos): ~61 ops** — account/org-invite 13, entitlement 12, transactional-email 11, workspace 9, chat 16.

**Grand total now: ~19 built + ~225 mapped operations** across your repos, mainstream OSS, the four-hole fill, and this enterprise/chat fill.

Of the gaps I flagged earlier: **account/org-invite ✓, entitlement ✓, chat ✓, notifications ✓** — all now filled. Still honestly thin (not mined, just so you know): **audit/activity-history** (showed up incidentally in Documenso/Mattermost but no dedicated source) and **moderation/review-queue**. Everything else is covered. That's the corpus — done.

