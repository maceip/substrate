# Cross-check: ground-truth block extraction for 6 sample repos

Purpose: an independent, code-grounded extraction for a sample spanning the category
spread in the 100, so codex's full-100 output can be checked against it. Every block
below is divined from files that actually exist in the repo tree (paths cited), not
guessed from the description. Source: `.cache/github-trees/*.json` (recursive trees).

Sample chosen to stress the taxonomy, one per category:
- **uptime-kuma** — self-hosted app that composes infra (the Next.js-boilerplate case)
- **firefly-iii** — PHP/Laravel app (different stack, same "app" category)
- **redis** — C datastore / runtime
- **fzf** — Go CLI
- **ollama** — Go model/agent runtime
- **laravel/framework** — a framework (block *source*, not block *consumer*)
- **public-apis** — content/list repo (the honest-zero case)

---

## The headline finding (holistic)

The `NURSERY-BLOCKS-nextjs.md` vocabulary (Protected Route, DB Adapter, Env Validation,
i18n Routing…) cleanly fits only the **app** category — roughly uptime-kuma and firefly-iii
here, ~10-15 repos across the full 100. Applied to the other categories it either invents
blocks that aren't there or misses the blocks that are. An accurate + holistic pass needs
**category-specific block sets**, plus a **cross-cutting set** that recurs everywhere.

Four rules fall out of the sample:

1. **Content/list repos yield ~zero infra blocks.** public-apis has no auth/db/config/release
   at all — only CI that validates the *data* (`validate/links.py`, `validate/format.py`).
   The pass must be allowed to return zero (or one "data-validation-in-CI" block) and must
   not hallucinate an "auth block" into a README list.

2. **Frameworks are block *sources*, not block *consumers*.** laravel/framework IS where the
   Auth / DB / Logging / Queue blocks come from (`config/auth.php`, `config/database.php`,
   `config/logging.php`, `AuthServiceProvider.php`). Reading it should extract the *canonical
   interface* of a block, not treat it as an app that "uses auth."

3. **A new top-tier block the Next.js 25 under-weights: the pluggable provider registry.**
   It shows up in nearly every non-trivial repo as the main extension seam:
   uptime-kuma `server/notification-providers/*` (100+) and `server/monitor-types/*`,
   ollama `server/internal/registry/`, laravel service providers, redis modules. This is
   arguably the single most reused structural block across the 100 and deserves first-class
   status.

4. **Cross-cutting blocks recur across *every* category** and are the highest-value dedup
   targets: CI pipeline (7/7, even public-apis), release/versioning (6/7), config (5/7),
   test harness (all code repos). These should be extracted once as shared blocks, then
   referenced — not re-described per repo.

---

## Per-repo ground truth

### uptime-kuma (app) — fits the web-infra vocabulary
- **Pluggable notification providers** — `server/notification-providers/*.js` (100+ files, one per channel) behind a common interface. The dominant extension seam.
- **Pluggable monitor types** — `server/monitor-types/{dns,grpc,gamedig,group,...}.js`. Same registry pattern, second axis.
- **DB + migrations (schema baseline)** — `db/knex_init_db.js` + `db/knex_migrations/*` (126 timestamped migrations). Knex is the swap point.
- **Socket-handler boundary** — `server/socket-handlers/*` is the API surface (websocket RPC), the equivalent of the route layer.
- **Auth** — `server/auth.js` (+ OAuth/bearer migrations).
- **i18n** — `src/i18n.js` + `src/lang/*.json` (80 files).
- **Multi-stage container build** — `docker/*.dockerfile`.
- **Release channels** — `release-{beta,final,nightly}.yml` (a real "multi-channel release" block).

### firefly-iii (app, PHP) — same category, confirms the blocks travel across stack
- **Auth / OAuth (Passport)** — `app/Console/Commands/System/CallsLaravelPassportKeys.php`, `CreatesAccessTokens.php`.
- **Env validation / config** — `.env.example`, `.env.testing`, `.ci/.env.ci` + `config/*`.
- **DB + migrations** — large `database/`/migration surface (351 model/migration files).
- **i18n** — `config/translations.php` + `public/v2/i18n/`.
- **Release-notes block** — `.github/release-notes/{alpha,beta,branch}.md`.
- Note: **no container block** (no Dockerfile in-repo) — honest absence, don't invent one.

### redis (C datastore) — web-infra vocabulary mostly does NOT apply
- **Config-file parser** — `src/config.c` + `redis.conf` (the canonical "typed config from a file" block).
- **Persistence: snapshot + append-log** — `src/rdb.c`, `src/aof.c` (RDB + AOF). A real block: "durable persistence with two strategies behind one switch."
- **Replication** — `src/replication.c`.
- **Cluster / sharding** — `src/cluster*.c`.
- **ACL / auth** — `src/acl.c`, `src/commands/auth.json`.
- **Cross-cutting:** CI (`.github/workflows/ci.yml`, codecov, codeql), release notes (`00-RELEASENOTES`), test harness (`tests/` 320 files, TCL).
- There is **no** route/i18n/ORM block here. Forcing them would be a fabrication.

### fzf (Go CLI) — a distinct CLI block set
- **Arg/option parsing** — `src/options.go` (+ pprof variants). The CLI's "config" block.
- **History persistence** — `src/history.go` (durable user state in a flat file).
- **Shell-completion generation** — `shell/completion.{bash,zsh,fish,nu}` + `shell/common.sh`.
- **Man-page / docs** — `man/man1/fzf.1`.
- **Cross-platform release** — `.goreleaser.yml` + `release.yml` (the canonical "build matrix → signed binaries" block).
- **CI** + **test harness** (`src/**/*_test.go`).
- No auth/db/i18n/route. (The regex "auth" hit `tokenizer.go` — a false positive; flag this class of false-match for the full run.)

### ollama (Go model/agent runtime) — agent-category blocks
- **Model registry / pull (OCI-style)** — `server/internal/registry/server.go`, `server/internal/client/ollama/registry.go`.
- **Inference scheduler** — `server/sched.go` (GPU/model load scheduling).
- **Subprocess model-server management** — `llm/llama_server.go`, `llm/llama_binary.go`.
- **OpenAI-compatible API shim** — `middleware/openai.go`, `openai/openai.go` (an "API-compat adapter" block).
- **Client auth via keypair** — `auth/auth.go`, `app/auth/connect.go`.
- **REST route layer** — `server/routes.go`.
- **Local store + migrations** — `app/store/database.go`, `migration_test.go`.
- Cross-cutting: CI, `release.yaml`, Dockerfile, version-pin files (`LLAMA_CPP_VERSION`).

### laravel/framework (framework = block SOURCE) — read for canonical interfaces
This is not an app; it is the origin of many blocks. Extract the *contract*, not a composition:
- **Auth** — `config/auth.php`, `src/Illuminate/Auth/*` (guards/providers = the swap seam itself).
- **DB / ORM / migrations** — `config/database.php`, Illuminate/Database (724 files).
- **Logging** — `config/logging.php` (channel/sink abstraction = the logger port).
- **Service-provider plugin system** — `*ServiceProvider.php`, `CreatesUserProviders.php` (the registry pattern, canonical form).
- **Config + env** — `config/*.php`, `config-stubs/`.
- **i18n** — `Illuminate/Contracts/Translation/*`.

### public-apis (content list) — the honest zero
- **No infra blocks.** Only a **data-validation-in-CI** block: `scripts/validate/links.py`,
  `scripts/validate/format.py` run by `.github/workflows/validate_links.yml`. Everything
  else is README content. Expected output for this repo: zero or one block.

---

## What to check codex's full-100 output against

- Does it return **zero** for content/list repos (public-apis, free-programming-books,
  developer-roadmap, awesome-go, SecLists, TheAlgorithms, JavaGuide), or did it hallucinate
  infra blocks into them?
- Does it treat frameworks (react, svelte, spring, laravel, symfony, guava) as block
  **sources** (extract the canonical interface) rather than apps?
- Does it surface **pluggable provider/registry** as a first-class recurring block?
- Are runtime/CLI block sets (config-file parser, persistence, replication, option parsing,
  completion generation, cross-platform release) present, or did it stop at web-infra?
- Are cross-cutting blocks (CI, release, config, test) **deduped** into shared blocks rather
  than re-described 100 times?
- Spot-check accuracy: is each block backed by a real file path in that repo? (The "auth"→
  `tokenizer.go` style false positive is the main risk from path-regex extraction.)
