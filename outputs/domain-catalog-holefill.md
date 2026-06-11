# Domain Catalog — hole-fill wave (rescued from the mining session transcript, Jun 11 2026)

The third grain-2 mining pass. Four coverage holes in genesis (ownership/sharing, notifications,
feed-ranking + social-graph, social-scheduling) were filled by reading 7 OSS product repos:
Outline, Immich, Discourse, Zulip, Lemmy, Mastodon, Postiz. ~46 named ops (+3 Discourse ranking
ops folded into feed-ranking). NOTE: this content was produced by the mining session and existed
only in its transcript; rescued verbatim here so it cannot be lost. All ops are merged into
blocks/CATALOG.json (the registry of record).

## Ownership / sharing / access (Outline + Immich) — 12 ops

- `resolve-effective-permission-on-a-resource` — owner → membership → group → link, deny-by-default
- `resolve-asset-access-across-owner/album/partner/link` — layered visibility, subtraction cascade
- `require-full-access-or-reject` — all-or-nothing batch gate, leaks nothing
- `scope-a-list-to-what-the-user-can-see` — the "shared with me" query filter
- `share-a-resource-with-a-user-at-a-permission` — the core "add collaborator"
- `resolve-permission-via-group-membership` — group grant = live grant for every member
- `create-a-share-link-with-scoped-permission-and-expiry`
- `validate-and-resolve-a-share-link-on-access` — expiry + scope enforced
- `revoke-a-share / remove-a-grant` — instantly narrows every dependent query
- `keep-tenants-isolated` — hard tenant/owner gate before any other logic
- `transfer-or-protect-ownership` — never orphan a resource (last-owner guard)
- `enumerate-effective-policy-for-a-resource` — per-object flags to the UI, fail-closed

Spine: every grant is a first-class revocable record; access is recomputed live (never cached);
links are scope+expiry-bounded — revoke/expire/leave-group provably narrows access everywhere.

## Notifications / messaging (Discourse + Zulip) — 12 ops

- `route-an-event-to-channels-by-salience` — fixed precedence (DM > mention > stream…)
- `compute-effective-notification-permission-for-a-scope` — mute is absolute, specific beats global
- `notify-a-user-respecting-mute-and-dedup` — central chokepoint; never two of the same (event,scope,type)
- `fan-out-a-post-to-all-its-watchers` — recipient set computed once, deduped across reasons
- `decide-whether-to-push-now-or-defer` — presence-aware (seen recently → delay)
- `suppress-during-do-not-disturb`
- `gate-an-email-by-preference-and-read-state` — don't email what they already read
- `batch-missed-messages-into-per-conversation-emails` — debounce → bucket → dedup
- `consolidate-N-notifications-into-one-over-threshold` — "N people liked" stays one row
- `auto-raise-notification-level-from-engagement` — never override a manual setting
- `select-conversations-for-a-digest` — since-last-seen, each item at most once
- `remove-a-mobile-push-when-read` — notifications self-retract across devices

## Feed-ranking + social-graph (Lemmy + Mastodon + Discourse) — 13 ops (+3 folded)

- `compute-a-time-decayed-hot-rank` — pure function of (score, age); can't post-date-game it
- `scale-a-hot-rank-by-community-activity` — normalize small vs large communities
- `compute-a-controversy-rank` — surface contested (up≈down), not popular
- `recompute-stale-ranks-in-batches-on-schedule` — decay actually moves items down
- `cast-a-vote-and-upsert-idempotently` — one vote per (user,item), exact delta
- `build-a-threaded-comment-tree-by-materialized-path` — subtree in one query, depth-capped
- `subscribe-to-a-community-and-maintain-count` — count never includes unapproved
- `fan-out-a-post-to-follower-timelines` — write-time, exactly the eligible audience
- `filter-a-status-out-of-a-timeline-by-block/mute/reply` — pure per-viewer suppression
- `follow-an-account-routing-direct-vs-request` — + backfill new followee into feed
- `favourite-idempotently-and-rescore-trends` — repeat = no-op, one trend signal
- `reblog-once-and-redistribute` — collapse nested, dedupe against original
- `detect-resolve-and-link-mentions-dropping-blocked` — never notify someone you blocked
- (folded into the above: Discourse period-top-score, time-decayed-hot-score, suggested-topics)

Spine: every interaction is one idempotent (actor,target) row; the feed is a reproducible
function of those rows + time — the consume-once shape again.

## Social-scheduling (Postiz) — 9 ops

- `schedule-a-post-into-a-queue` — one live workflow per post; re-schedule terminates the prior
- `dispatch-due-scheduled-posts` — publishes exactly once at/after time, survives restart
- `recover-missed-due-posts` — hourly idempotent sweep
- `validate-a-post-against-platform-rules` — reject before publish
- `format-a-post-per-platform` — one canonical post → each platform's exact API shape
- `retry-publish-with-token-refresh-and-backoff` — classify, refresh, back off, give up cleanly
- `log-and-surface-a-failed-publish` — durable error + notify, never silently lost
- `expand-a-post-to-multiple-channels` — one action → N isolated per-channel posts
- `slot-a-post-into-next-free-calendar-time` — collision-free, future-only

Miner's own flag, preserved: ~4 of the scheduling verbs are generic scheduler/outbox shapes that
overlap the existing `async-jobs` infrastructure block; the truly post-specific ones are
validate/format/expand/slot. Recorded, not acted on.
