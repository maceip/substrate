# Domain Catalog — audit-log + moderation (the two remaining thin gaps)

Grounded operation-grain ops filling the last two gaps from the full-surface review, so they at
least EXIST as real blocks rather than a "we should have this" note.

## Audit log / activity history  (Infisical + Documenso)
- **record-an-audit-event** — one normalized entry: actor + action/event-type + resource scope + timestamp + metadata; entry must belong to a tenant (rejected if neither projectId nor orgId); actor captured at write time, never derived later. `infisical:backend/src/ee/services/audit-log/audit-log-service.ts:createAuditLog`; `documenso:packages/lib/utils/document-audit-logs.ts`
- **write-an-audit-entry-atomically-with-the-state-change** — audit row persists in the SAME tx as the mutation it describes; if the change rolls back so does its audit entry (no orphan "X happened" for an X that didn't). `documenso:packages/lib/server-only/document/viewed-document.ts` (`$transaction` → update + audit.create)
- **enqueue-an-audit-event-out-of-the-request-path (at-most-once)** — push to a Redis stream, swallow failures so auditing never fails the user request; consumer batch-inserts `ON CONFLICT (id) DO NOTHING` (id/createdAt pinned at push → retries re-insert byte-identical, idempotent). `infisical:.../audit-log-queue.ts:pushToLog/drainAuditLogStream`
- **query/filter-an-audit-log (tenant-scoped)** — page of entries narrowed by actor/event/time/path; query ALWAYS scoped to caller's tenant (`where orgId`/ownership) behind a permission gate, ordered newest-first, mandatory time-window + statement timeout. `infisical:.../audit-log-dal.ts:find`; `documenso:.../find-document-audit-logs.ts`
- **enforce-retention** — stamp `expiresAt` from the tenant's plan at write time; daily job batch-deletes only rows past the window, oldest-first, bounded batches — never touches an in-window entry. `infisical:.../audit-log-queue.ts:buildStreamEntry`, `.../audit-log-dal.ts:pruneAuditLog`
- **guarantee-append-only / immutable-audit-row** — write-once: schema marks key columns immutable, no update/delete path exists except retention prune (verified: zero `auditLog.update|delete` calls). `infisical:backend/src/db/schemas/audit-logs.ts` (TImmutableDBKeys); `documenso` grep → no mutations
- **diff-an-entity-into-audit-change-entries (from/to)** — compare old vs new, emit typed `{type, from, to}` per changed field (deep-equality gate); captures *what* changed, not just *that* it changed. `documenso:packages/lib/utils/document-audit-logs.ts:diffRecipientChanges/diffFieldChanges`
- **render-an-entity's-activity-timeline** — read entries (grouped for a certificate, or formatted "who did what", or recent-activity subset); reads from the immutable log only (never re-derives from current state), each row re-validated (Zod) before display, actor-relative ("You" vs named). `documenso:.../get-document-certificate-audit-logs.ts`, `.../document-audit-logs.ts:formatDocumentAuditLogAction`

Spine: one immutable `{id, actor, action, resource-scope(tenant/entity), timestamp, metadata(ip/ua/diff)}` row — written once (append-only; deleted only by retention past expiresAt, oldest-first), always tenant-scoped, read back exclusively from the log itself.

## Moderation / report / review-queue  (Discourse + Mastodon)
_Two independent miners cross-validated these line-for-line — same ops, invariants, evidence._
- **flag/report-content** — a user reports a post/account; the same user can't flag the same item twice (partial UNIQUE index), and the report carries a category + optional comment. `discourse:app/models/post_action.rb` / `post_action_creator.rb`; `mastodon:app/models/report.rb`
- **enqueue-into-a-review-queue** — a flag/queued-post materializes exactly one reviewable per target (atomic UPSERT), so concurrent flags converge on one queue item rather than duplicating. `discourse:app/models/reviewable.rb` (`needs_review!` / find-or-create)
- **auto-hide-content-past-a-flag-threshold** — once flags cross a configured score/threshold the content is hidden automatically (before any human acts), reversible on approve. `discourse:app/services/post_action_creator.rb#auto_hide_if_needed`
- **claim-a-review-item** — a reviewable is claimed by at most one moderator at a time (UNIQUE on target), so two mods can't work the same item. `discourse:app/models/reviewable_claimed_topic.rb`
- **act-on-a-review-item (approve/reject/perform)** — performing a transition is optimistic-lock-guarded (`increment_version!`) and transactional; a second perform on an already-resolved item is a no-op. `discourse:app/models/reviewable.rb#perform` / `transition_to`
- **resolve-a-report** — close a report, but only fully resolve when no unresolved sibling reports remain against the target; resolution is recorded with the acting moderator. `mastodon:app/models/report.rb#resolve!` / `unresolved_siblings?`
- **apply-an-account-action (suspend/silence/disable)** — commit the sanction + a strike + the mod-log entry + report-resolution in ONE transaction; idempotent (staff exempt / already-silenced returns early). `mastodon:app/models/admin/account_action.rb#process_action!`; `discourse:app/services/user_silencer.rb`; `mastodon:app/services/suspend_account_service.rb`
- **record-a-moderator-action-to-an-append-only-mod-log** — every moderator action writes a create-only audit entry (who, what, target); never updated/deleted. `mastodon:app/models/concerns/accountable_concern.rb#log_action`; `discourse` UserHistory
- **handle-an-appeal** — a sanctioned user appeals a strike; at most one appeal per strike; approving reverses the linked sanction. `mastodon:app/services/approve_appeal_service.rb`

Spine: report (can't-double-flag) → one reviewable per target → optional auto-hide at threshold → single-mod claim → optimistic-locked perform → account-action commits sanction+strike+modlog+resolution atomically (idempotent) → append-only mod-log; appeals reverse, one per strike.
