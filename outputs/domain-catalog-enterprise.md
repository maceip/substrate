# Domain Catalog — enterprise/chat fill (gaps #1, #3, #5 + transactional notifications)

Operation-grain ops mined (read-only, real code) from 9 verified source-available/OSS products,
to fill the gaps called out in the full-surface review: account/org/invite lifecycle, entitlement/
quota gating, chat/conversations, and the transactional-email side of notifications.
Source repos: Infisical, twentyhq/twenty, dubinc/dub, formbricks, useplunk/plunk, documenso,
baptisteArno/typebot.io, mattermost, element-hq/synapse. (~61 ops.)

## Account / org / invite lifecycle  (Infisical + Twenty) — gap #1
- **provision-a-user-via-verified-email-signup** — user row created only after OTP; no enumeration oracle. `infisical:backend/src/services/auth/auth-signup-service.ts`
- **complete-account-and-bootstrap-org** — constant-time (no timing oracle); first self-signup gets a tenant, invited users don't. `infisical:.../auth-signup-service.ts:completeAccount`
- **create-an-organization** — founder seated as sole Admin atomically; org never exists without one. `infisical:backend/src/services/org/org-service.ts`; `twenty:.../auth/services/sign-in-up.service.ts`
- **invite-a-member-to-an-organization** — one outstanding invite per (org,email); single-use expiring token; ≥1 permanent role. `twenty:.../workspace-invitation/services/workspace-invitation.service.ts`
- **accept-an-invitation** — identity-bound; token hard-deleted on accept; exactly one membership at invited role. `infisical:org-service.ts:verifyUserToOrg`; `twenty:invalidateWorkspaceInvitation`
- **verify-email** — single-use, sha256-at-rest, identity-bound; re-verify rejected. `twenty:.../auth/token/services/email-verification-token.service.ts`
- **assign/change-a-member-role** — can't edit own; **last-admin guard** (`CANNOT_UNASSIGN_LAST_ADMIN`). `twenty:.../user-role/user-role.service.ts`
- **remove/offboard-a-member** — last-admin + empty-tenant guards under `pg_advisory_xact_lock`; cascade soft-delete. `infisical:.../membership-user/membership-user-fns.ts:assertWillRetainAdmin`
- **issue-a-machine-identity-access-token** — scoped to identity's org; TTL/maxTTL/use-count bounded; revocable. `infisical:.../identity-access-token/identity-access-token-service.ts`
- **revoke-a-machine-token-auth-config** — delete config + revoke its tokens in one tx (no orphaned live token). `infisical:.../identity-token-auth/identity-token-auth-service.ts`
- **provision-a-user-from-the-IdP-directory (SCIM JIT)** — domain-ownership-gated; idempotent on (externalId, orgId). `infisical:backend/src/ee/services/scim/scim-service.ts`
- **enroll-SSO + JIT-provision-on-login (SAML/OIDC)** — IdP secrets KMS-encrypted; stale-alias guard prevents account takeover. `infisical:.../saml-config/saml-config-service.ts`
- **enroll/verify-TOTP-MFA** — one method per user-workspace; secret encrypted; flips VERIFIED only on valid code. `twenty:.../two-factor-authentication/two-factor-authentication.service.ts`

Spine: provision(email-verified) → create-org(founder=Admin) → invite/accept(single-use token→one membership) → role-change(last-admin guarded) → offboard(last-admin+empty-tenant guarded); M2M tokens + SSO/SCIM feed the SAME membership table.

## Entitlement / quota gating  (dub + Formbricks) — gap #3
- **refuse-an-action-when-over-plan-limit** — hard refusal *before* commit, not reconciled after. `dub:apps/web/lib/api/links/usage-checks.ts`
- **gate-a-feature-by-tier** — pure function of plan; one capability matrix so gates can't drift. `dub:apps/web/lib/plan-capabilities.ts`
- **check-if-a-feature-is-entitled** — entitled AND license-active AND not trial-restricted; unknown key denied. `formbricks:apps/web/modules/entitlements/lib/checks.ts`
- **resolve-entitlement-context** — one normalized shape whether source is Stripe or a license; missing billing → documented defaults, never "unlimited". `formbricks:.../entitlements/lib/provider.ts`
- **sync-entitlements-from-stripe-idempotently** — event-id + created-date ordering guard; missing entitlement preserves prior limit. `formbricks:.../ee/billing/lib/organization-billing.ts`
- **handle-a-stripe-subscription-webhook** — verify sig, resolve org, reconcile. `formbricks:.../ee/billing/api/lib/stripe-webhook.ts`; `dub:apps/web/(ee)/api/stripe/webhook`
- **change-plan-and-reconcile-entitlements** — downgrade **tears down already-provisioned state** (disable webhooks, delete folders), not just flip a flag. `dub:.../stripe/webhook/utils/update-workspace-plan.ts`
- **map-subscription-status-to-limits** — trialing gets trial caps even on a paid plan. `dub:packages/utils/src/constants/pricing/trial-limits.ts`
- **track-usage-against-an-entitlement** — per-billing-cycle counter, tenant-scoped, never spans cycles. `formbricks:.../responses/lib/organization.ts`; `dub:.../upstash/redis-streams/workspace-links-usage.ts`
- **reset-usage-on-billing-cycle** — overage grace + dedup'd alert emails (no cron spam). `dub:apps/web/(ee)/api/cron/usage/utils.ts`
- **derive-a-usage-limit-from-an-entitlement-key** — `unlimited`→null, absent→preserve, decoded in one place. `formbricks:.../organization-billing.ts:parseEntitlementLimit`
- **scope-usage-to-the-tenant-org** — billing reads always rooted at the org boundary. `formbricks:.../responses/lib/organization.ts`

Spine: Stripe event → idempotent reconcile → normalized entitlement (features + limits + cycle anchor) → two modes: pure feature-gate + per-cycle usage-counter. Keeper: webhook *reconciles provisioned state*.

## Multi-tenant workspace  (Typebot) — gaps #1 + #3
- **create-a-workspace-with-its-owner-and-default-plan** — never created without one ADMIN; free-tier capped + 24h cooldown. `apps/builder/src/features/workspace/api/handleCreateWorkspace.ts`
- **scope-the-session-to-a-workspace-and-resolve-mode** — permissions recomputed from membership in the *scoped* workspace each fetch. `apps/builder/.../handleGetWorkspace.ts`
- **authorize-a-workspace-action-by-membership-role** — re-asserted in the DB `where` clause, not just app code. `packages/workspaces/src/application/WorkspaceAccessPolicies.ts`
- **invite-a-member-clamped-to-the-seat-limit** — members + pending invites summed so invite can't overshoot cap. `apps/builder/.../handleCreateWorkspaceInvitation.ts`
- **gate-a-feature-by-plan-tier** — clamped at write time; forged payload can't keep a perk. `apps/builder/src/features/typebot/helpers/sanitizers.ts`
- **compute-a-workspace's-usage-against-its-monthly-quota** — correct window (Stripe period vs calendar). `packages/billing/src/api/handleGetUsage.ts`
- **clamp-an-over-quota-workspace-by-quarantining-it** — flag set by job, *enforced before a session starts*, idempotent. `packages/scripts/.../checkAndReportLastHourResults.ts`; enforce `packages/bot-engine/src/startSession.ts`
- **apply-a-stripe-subscription-change-idempotently** — guarded by previous attributes; redelivery is a no-op. `packages/billing/src/api/handleStripeWebhook.ts`
- **change-a-subscription-with-a-downgrade-safety-check** — refuses a downgrade that strands unbillable usage. `packages/billing/src/api/handleUpdateSubscription.ts`

## Transactional email / event-driven messaging  (Plunk + Documenso) — notifications fill
- **send-a-transactional-email-on-an-event** — upsert recipient, render, queue one per recipient. `plunk:apps/api/src/controllers/Actions.ts`
- **route-and-deliver-a-queued-email-and-record-status** — idempotent on emailId; re-checks suppression at send; always records terminal status. `plunk:apps/api/src/jobs/email-processor.ts`
- **render-a-templated-message-with-typed-data** — fails closed on missing vars (never ships raw `{{...}}`). `plunk:packages/shared/src/template.ts`
- **track-a-system-event-and-trigger-listening-workflows** — reserved namespaces can't be tracked via public API; publish-then-fan-out. `plunk:apps/api/src/services/EventService.ts`
- **handle-bounce/complaint-and-suppress-the-address** — sig-verified webhook; permanent bounce always suppresses, never sent again. `plunk:apps/api/src/controllers/Webhooks.ts`
- **throttle/prioritize-sends-against-a-rate-limit** — transactional jumps ahead of campaign bursts. `plunk:apps/api/src/services/QueueService.ts`
- **meter-email-usage-by-volume-idempotently** — charged exactly once across retries (idempotency key = email id). `plunk:apps/api/src/services/MeterService.ts`
- **enforce-a-monthly-send-limit-with-warn-once** — block 100%, warn 80%, SET-NX so no double-notice; fails open on internal error. `plunk:apps/api/src/services/BillingLimitService.ts`
- **send-an-email-for-a-document-lifecycle-event** — "you have a document waiting to sign"; CC/disabled skipped; rate-limited job not retried. `documenso:packages/lib/jobs/definitions/emails/send-signing-email.handler.ts`
- **send-a-reminder-with-atomic-claim** — conditional updateMany so concurrent sweeps can't double-send. `documenso:.../internal/process-signing-reminder.handler.ts`
- **send-a-completion-email-with-the-artifact-attached** — terminal event → notify all parties + attach signed PDF. `documenso:.../emails/send-document-completed-emails.handler.ts`

Spine: event → durable message row → render(fail-closed) → suppression+limit gate → priority queue(idempotent id) → deliver → record status; bounce webhooks feed suppression back.

## Chat / conversations  (Mattermost + Synapse) — gap #5
- **post-a-message-to-a-channel** — idempotent on a client token (retries return same post); thread-root validated. `mattermost:server/channels/app/post.go:CreatePost`
- **reply-in-a-thread-and-auto-follow** — posting a reply subscribes the author to the root thread. `mattermost:post.go:MaintainMembership`
- **send-a-room-event-idempotently** — txn-id dedup; identical state events collapse. `synapse:synapse/handlers/message.py`
- **open-or-create-a-direct-message-channel** — at most one DM per pair; concurrent creates collide on same row. `mattermost:channel.go:GetOrCreateDirectChannel`
- **open-a-group-DM** — bounded membership (min/max). `mattermost:channel.go:CreateGroupChannel`
- **add-a-user-to-a-channel** — idempotent join + join/add system message; deactivated user rejected. `mattermost:channel.go:AddChannelMember`
- **change-room-membership-via-a-state-machine** — join/leave/invite/kick/ban/unban with legal-transition guards. `synapse:synapse/handlers/room_member.py:update_membership`
- **advance-a-read-marker** — only moves forward; linearized per (room,user). `synapse:synapse/handlers/read_marker.py`
- **record-a-read-receipt** — stale receipts dropped; private never federated. `synapse:synapse/handlers/receipts.py`
- **mark-as-viewed-and-recompute-unread** — only channels with unreads updated; clears push. `mattermost:channel.go:MarkChannelsAsViewed`
- **mark-as-unread-from-a-post** — deliberate inverse; recomputes mention counts below. `mattermost:channel.go:MarkChannelAsUnreadFromPost`
- **edit-a-message-preserving-identity** — same id/createAt; editAt only when content changed; deleted/system can't edit. `mattermost:post.go:UpdatePost`
- **delete-a-message-leaving-a-tombstone** — soft delete; thread chains survive (Synapse: redaction). `mattermost:post.go:DeletePost`
- **add-a-reaction** — emoji validated; (post,user,emoji) unique; capped per post. `mattermost:reaction.go:SaveReactionForPost`
- **detect-and-link-@mentions** — strongest mention type wins, never downgrades; emoji skipped. `mattermost:mention_parser_standard.go`
- **set-typing-presence** — ephemeral, auto-expires via wheel-timer, membership-gated. `synapse:synapse/handlers/typing.py`

Spine: idempotent send keyed by a client token + monotone forward read-marker; membership is a guarded idempotent (often state-machine) transition.

---
NOTE: these ~61 ops are mined-and-saved here but NOT yet ingested into `blocks/CATALOG.json` (the
schema registry the catalog-keeper owns). They're persisted in this file so nothing is lost; the
catalog renderer can fold them in. audit-log + moderation/review-queue are mined separately
(`domain-catalog-audit-moderation.md`).
