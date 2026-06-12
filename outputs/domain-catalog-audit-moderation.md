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
_pending — miner running._
