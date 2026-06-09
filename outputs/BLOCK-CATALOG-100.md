# Block catalog — mined from the 100 trending repos (v2)

File-path-grounded extraction; every block backed by real paths in each repo tree.

> **This is a FLOOR, not an exhaustive list.** It is produced by a fixed set of ~38 path
> detectors, so it can only find blocks that (a) were given a detector and (b) leave a
> recognizable file-path signature. Blocks that live *inside* generically-named files, or
> that nobody wrote a detector for, are invisible to this method. See the 'Known gaps' section.


- Repos mined: 92. Excluded (content): 8. Detectors: ~38.


## Reuse surface — block frequency across 92 repos

| count | block | persona | precision |
|---:|---|---|---|
| 88 | CI pipeline | Cross-cutting | high |
| 88 | Test harness | Cross-cutting | high |
| 81 | Dependency mgmt | Cross-cutting | high |
| 80 | Lint/format config | Cross-cutting | high |
| 67 | Release/versioning | Cross-cutting | high |
| 52 | Containerization | Cross-cutting | high |
| 52 | Plugin / provider registry | Framework/library | medium |
| 50 | Cache / ephemeral state | App builder | medium |
| 47 | Crypto / signing / keys | App builder | medium |
| 44 | File / blob storage | App builder | medium |
| 43 | Network privacy / transport | Runtime/systems | medium |
| 43 | Async jobs / workers | App builder | medium |
| 40 | Observability | App builder | high |
| 39 | i18n / localization | App builder | high |
| 38 | Input validation (request) | App builder | medium |
| 36 | Rate limit / request guard | App builder | medium |
| 33 | Realtime / pubsub | App builder | medium |
| 31 | Authentication | App builder | high |
| 31 | Authorization / policy | App builder | medium |
| 29 | Logging | App builder | high |
| 27 | DB / ORM connection | App builder | high |
| 26 | Migrations | App builder | high |
| 25 | Persistence / storage engine | Runtime/systems | high |
| 25 | Code generation | Framework/library | high |
| 22 | Model runtime / scheduler | AI/agent | high |
| 22 | Public contracts / interfaces | Framework/library | high |
| 20 | Env/config validation | App builder | high |
| 20 | Routing / HTTP routes | App builder | high |
| 19 | Prompt templates | AI/agent | high |
| 16 | Model registry / pull | AI/agent | high |
| 15 | Payment / billing | App builder | medium |
| 15 | Pre-commit hooks | Cross-cutting | high |
| 15 | Shell completion | CLI | high |
| 15 | CLI option parsing | CLI | high |
| 14 | Replication / clustering | Runtime/systems | high |
| 12 | LLM/API-compat adapter | AI/agent | high |
| 4 | Config-file parser | Runtime/systems | high |
| 1 | Man pages | CLI | high |

## Known gaps — blocks this pass probably MISSED

Real, common blocks with no detector here (so absent from the table above regardless of how
often they actually occur). Non-exhaustive itself:

- Email / transactional mail
- Search / full-text indexing
- Feature flags
- Webhooks (in/outbound) + signature verify
- Scheduling / cron (distinct from job queue)
- Health checks / readiness probes
- Secrets management / vault
- Session store (distinct from auth)
- CORS / CSRF / security headers
- Pagination / filtering / query building
- Soft-delete / audit trail / timestamp convention
- Multitenancy / row-level scoping (the 'scope to current user' consumer block)
- Idempotency keys
- Retry / backoff / circuit breaker (resilience)
- Connection pooling
- HTTP/API client wrapper
- Metrics / Prometheus counters (distinct from tracing)
- Message broker (Kafka/RabbitMQ/NATS) integration
- Distributed locking
- Admin/CRUD scaffolding (e.g. filament)
- API versioning
- GraphQL / gRPC service layer
- State machines / workflow engine
- PDF / report / export generation
- Image/media processing
- Backup / restore

## Per-repo detail


### Python


**NousResearch/hermes-agent** — 4901 files
  - **Test harness** (1662) — `apps/desktop/electron/backend-probes.test.cjs`, `apps/desktop/electron/bootstrap-platform.test.cjs` +1660
  - **Plugin / provider registry** (243) — `plugins/__init__.py`, `plugins/browser/browser_use/__init__.py` +241
  - **i18n / localization** (49) — `apps/desktop/src/i18n/catalog.ts`, `apps/desktop/src/i18n/context.test.tsx` +47
  - **Model runtime / scheduler** (23) — `optional-skills/mlops/inference/outlines/SKILL.md`, `optional-skills/mlops/inference/outlines/references/backends.md` +21
  - **CI pipeline** (17) — `.github/workflows/build-windows-installer.yml`, `.github/workflows/contributor-check.yml` +15
  - **Network privacy / transport** (9) — `hermes_cli/proxy/__init__.py`, `hermes_cli/proxy/adapters/__init__.py` +7
  - **Lint/format config** (5) — `apps/desktop/.prettierrc`, `apps/desktop/eslint.config.mjs` +3
  - **Cache / ephemeral state** (5) — `apps/desktop/src/app/session/hooks/use-session-state-cache.ts`, `gateway/sticker_cache.py` +3
  - **Dependency mgmt** (4) — `.github/dependabot.yml`, `apps/bootstrap-installer/src-tauri/Cargo.toml` +2
  - **Authentication** (4) — `acp_adapter/auth.py`, `hermes_cli/auth.py` +2
  - **Routing / HTTP routes** (4) — `apps/bootstrap-installer/src/routes/failure.tsx`, `apps/bootstrap-installer/src/routes/progress.tsx` +2
  - **Containerization** (3) — `Dockerfile`, `docker-compose.yml` +1
  - **Migrations** (3) — `optional-skills/migration/DESCRIPTION.md`, `optional-skills/migration/openclaw-migration/SKILL.md` +1
  - **Env/config validation** (3) — `.env.example`, `ui-tui/packages/hermes-ink/src/utils/env.ts` +1
  - **Realtime / pubsub** (2) — `plugins/google_meet/realtime/__init__.py`, `plugins/google_meet/realtime/openai_client.py`
  - **Rate limit / request guard** (2) — `agent/rate_limit_tracker.py`, `gateway/platforms/signal_rate_limit.py`
  - **Payment / billing** (1) — `skills/creative/popular-web-designs/templates/stripe.md`
  - **Observability** (1) — `skills/creative/popular-web-designs/templates/sentry.md`
  - **LLM/API-compat adapter** (1) — `agent/transports/anthropic.py`
  - **Prompt templates** (1) — `optional-skills/creative/baoyu-article-illustrator/prompts/system.md`

**Significant-Gravitas/AutoGPT** — 4029 files
  - **Test harness** (602) — `autogpt_platform/autogpt_libs/autogpt_libs/auth/config_test.py`, `autogpt_platform/autogpt_libs/autogpt_libs/auth/dependencies_test.py` +600
  - **Migrations** (150) — `autogpt_platform/backend/migrations/20240722143307_migrations/migration.sql`, `autogpt_platform/backend/migrations/20240726131311_node_input_unique_constraint/migration.sql` +148
  - **Authentication** (44) — `autogpt_platform/autogpt_libs/autogpt_libs/auth/__init__.py`, `autogpt_platform/autogpt_libs/autogpt_libs/auth/config.py` +42
  - **CI pipeline** (30) — `.github/workflows/classic-autogpt-ci.yml`, `.github/workflows/classic-autogpt-docker-cache-clean.yml` +28
  - **DB / ORM connection** (24) — `autogpt_platform/db/docker/.gitignore`, `autogpt_platform/db/docker/README.md` +22
  - **Payment / billing** (24) — `autogpt_platform/frontend/src/app/(platform)/settings/billing/components/AutomationCreditsTab/AutoRefillCard/AutoRefillCard.tsx`, `autogpt_platform/frontend/src/app/(platform)/settings/billing/components/AutomationCreditsTab/AutoRefillCard/AutoRefillDialog.tsx` +22
  - **Model runtime / scheduler** (22) — `classic/forge/forge/llm/__init__.py`, `classic/forge/forge/llm/prompting/__init__.py` +20
  - **Plugin / provider registry** (18) — `autogpt_platform/frontend/src/providers/agent-credentials/credentials-provider.tsx`, `autogpt_platform/frontend/src/providers/agent-credentials/helper.ts` +16
  - **Rate limit / request guard** (13) — `autogpt_platform/backend/backend/api/features/admin/rate_limit_admin_routes.py`, `autogpt_platform/backend/backend/api/features/admin/rate_limit_admin_routes_test.py` +11
  - **Containerization** (8) — `autogpt_platform/backend/Dockerfile`, `autogpt_platform/db/docker/docker-compose.yml` +6
  - **File / blob storage** (8) — `autogpt_platform/backend/backend/util/gcs_utils.py`, `autogpt_platform/db/docker/docker-compose.s3.yml` +6
  - **Lint/format config** (6) — `autogpt_platform/frontend/.eslintrc.json`, `autogpt_platform/frontend/.prettierignore` +4
  - **Observability** (5) — `autogpt_platform/backend/backend/copilot/sdk/otel_setup_test.py`, `autogpt_platform/frontend/sentry.edge.config.ts` +3
  - **Dependency mgmt** (4) — `.github/dependabot.yml`, `autogpt_platform/autogpt_libs/pyproject.toml` +2
  - **Routing / HTTP routes** (4) — `autogpt_platform/backend/backend/api/features/library/routes/__init__.py`, `autogpt_platform/backend/backend/api/features/library/routes/agents.py` +2
  - **Crypto / signing / keys** (3) — `autogpt_platform/autogpt_libs/autogpt_libs/auth/jwt_utils.py`, `autogpt_platform/autogpt_libs/autogpt_libs/auth/jwt_utils_test.py` +1
  - **Model registry / pull** (3) — `autogpt_platform/frontend/src/components/renderers/InputRenderer/registry/Form.tsx`, `autogpt_platform/frontend/src/components/renderers/InputRenderer/registry/index.ts` +1
  - **Persistence / storage engine** (2) — `autogpt_platform/frontend/src/services/storage/local-storage.ts`, `autogpt_platform/frontend/src/services/storage/session-storage.ts`
  - **Replication / clustering** (2) — `autogpt_platform/backend/backend/executor/cluster_lock.py`, `autogpt_platform/backend/backend/executor/cluster_lock_test.py`
  - **Network privacy / transport** (2) — `autogpt_platform/frontend/src/app/api/proxy/[...path]/route.helpers.ts`, `autogpt_platform/frontend/src/app/api/proxy/[...path]/route.ts`
  - **LLM/API-compat adapter** (2) — `classic/forge/forge/llm/providers/anthropic.py`, `classic/forge/forge/llm/providers/openai.py`
  - **Pre-commit hooks** (1) — `.pre-commit-config.yaml`
  - **Cache / ephemeral state** (1) — `.github/workflows/scripts/docker-ci-fix-compose-build-cache.py`
  - **Env/config validation** (1) — `classic/forge/.env.example`
  - **Logging** (1) — `autogpt_platform/backend/backend/util/logging.py`

**huggingface/transformers** — 6063 files
  - **Test harness** (1583) — `tests/__init__.py`, `tests/alm_tester.py` +1581
  - **CI pipeline** (56) — `.github/workflows/add-model-like.yml`, `.github/workflows/anti-slop.yml` +54
  - **Dependency mgmt** (22) — `.github/dependabot.yml`, `benchmark/requirements.txt` +20
  - **Containerization** (19) — `docker/consistency.dockerfile`, `docker/custom-tokenizers.dockerfile` +17
  - **i18n / localization** (18) — `i18n/README_ar.md`, `i18n/README_bn.md` +16
  - **Code generation** (4) — `src/transformers/models/codegen/__init__.py`, `src/transformers/models/codegen/configuration_codegen.py` +2
  - **LLM/API-compat adapter** (3) — `src/transformers/models/openai/configuration_openai.py`, `src/transformers/models/openai/modeling_openai.py` +1
  - **Release/versioning** (1) — `.github/workflows/release-conda.yml`
  - **Logging** (1) — `src/transformers/utils/logging.py`

**langflow-ai/langflow** — 6272 files
  - **Test harness** (1395) — `.github/workflows/docker_test.yml`, `.github/workflows/docs_test.yml` +1393
  - **DB / ORM connection** (66) — `scripts/aws/lib/construct/db.ts`, `src/backend/base/langflow/services/database/__init__.py` +64
  - **CI pipeline** (42) — `.github/workflows/add-labels.yml`, `.github/workflows/auto-update.yml` +40
  - **Authentication** (29) — `src/backend/base/langflow/services/auth/__init__.py`, `src/backend/base/langflow/services/auth/base.py` +27
  - **Containerization** (18) — `.devcontainer/Dockerfile`, `deploy/docker-compose.yml` +16
  - **Async jobs / workers** (17) — `src/backend/base/langflow/core/celery_app.py`, `src/backend/base/langflow/core/celeryconfig.py` +15
  - **Cache / ephemeral state** (11) — `src/backend/base/langflow/custom/custom_component/component_with_cache.py`, `src/backend/base/langflow/services/cache/__init__.py` +9
  - **Observability** (10) — `src/backend/base/langflow/services/telemetry/__init__.py`, `src/backend/base/langflow/services/telemetry/factory.py` +8
  - **File / blob storage** (9) — `src/backend/base/langflow/services/storage/__init__.py`, `src/backend/base/langflow/services/storage/factory.py` +7
  - **Persistence / storage engine** (9) — `src/backend/base/langflow/services/storage/__init__.py`, `src/backend/base/langflow/services/storage/factory.py` +7
  - **Release/versioning** (8) — `.github/workflows/release-lfx.yml`, `.github/workflows/release_bundles.yml` +6
  - **i18n / localization** (7) — `src/frontend/src/locales/de.json`, `src/frontend/src/locales/en.json` +5
  - **Dependency mgmt** (6) — `.github/dependabot.yml`, `pyproject.toml` +4
  - **Authorization / policy** (6) — `src/lfx/src/lfx/components/models_and_agents/policies/__init__.py`, `src/lfx/src/lfx/components/models_and_agents/policies/guard_sync_utils.py` +4
  - **Input validation (request)** (5) — `src/lfx/src/lfx/cli/validation/__init__.py`, `src/lfx/src/lfx/cli/validation/_env_validation.py` +3
  - **Prompt templates** (5) — `src/backend/base/langflow/base/prompts/__init__.py`, `src/backend/base/langflow/base/prompts/api_utils.py` +3
  - **Env/config validation** (4) — `.env.example`, `deploy/.env.example` +2
  - **Lint/format config** (3) — `.eslintrc.json`, `src/frontend/.biomeignore` +1
  - **Logging** (3) — `src/backend/base/langflow/logging/logger.py`, `src/lfx/src/lfx/log/logger.py` +1
  - **LLM/API-compat adapter** (3) — `src/lfx/src/lfx/components/anthropic/anthropic.py`, `src/lfx/src/lfx/components/azure/azure_openai.py` +1
  - **Pre-commit hooks** (2) — `.pre-commit-config.yaml`, `src/frontend/.husky/pre-commit`
  - **Realtime / pubsub** (1) — `src/frontend/src/modals/IOModal/components/chatView/chatInput/components/voice-assistant/hooks/use-handle-websocket-message.ts`
  - **Crypto / signing / keys** (1) — `src/frontend/src/components/core/parameterRenderComponent/components/keypairListComponent/index.tsx`
  - **Model runtime / scheduler** (1) — `src/lfx/src/lfx/components/huggingface/huggingface_inference_api.py`

**anthropics/skills** — 397 files
  - **Input validation (request)** (15) — `skills/docx/scripts/office/validators/__init__.py`, `skills/docx/scripts/office/validators/base.py` +13
  - **Dependency mgmt** (2) — `skills/mcp-builder/scripts/requirements.txt`, `skills/slack-gif-creator/requirements.txt`
  - **Test harness** (1) — `spec/agent-skills-spec.md`

**langchain-ai/langchain** — 2898 files
  - **Test harness** (956) — `.github/workflows/_compile_integration_test.yml`, `.github/workflows/_test.yml` +954
  - **Prompt templates** (32) — `libs/core/langchain_core/prompts/__init__.py`, `libs/core/langchain_core/prompts/base.py` +30
  - **CI pipeline** (27) — `.github/workflows/_compile_integration_test.yml`, `.github/workflows/_lint.yml` +25
  - **Dependency mgmt** (22) — `.github/dependabot.yml`, `libs/core/pyproject.toml` +20
  - **LLM/API-compat adapter** (15) — `libs/core/langchain_core/messages/block_translators/anthropic.py`, `libs/core/langchain_core/messages/block_translators/openai.py` +13
  - **File / blob storage** (10) — `libs/langchain/langchain_classic/document_loaders/gcs_directory.py`, `libs/langchain/langchain_classic/document_loaders/gcs_file.py` +8
  - **Persistence / storage engine** (8) — `libs/langchain/langchain_classic/storage/__init__.py`, `libs/langchain/langchain_classic/storage/_lc_store.py` +6
  - **Input validation (request)** (6) — `.github/workflows/_test_pydantic.yml`, `libs/core/langchain_core/output_parsers/pydantic.py` +4
  - **Model runtime / scheduler** (3) — `libs/langchain/langchain_classic/embeddings/xinference.py`, `libs/langchain/langchain_classic/llms/huggingface_text_gen_inference.py` +1
  - **Containerization** (2) — `.devcontainer/docker-compose.yaml`, `libs/langchain/dev.Dockerfile`
  - **Lint/format config** (2) — `.editorconfig`, `libs/langchain/.flake8`
  - **Rate limit / request guard** (2) — `libs/core/langchain_core/rate_limiters.py`, `libs/langchain_v1/langchain/rate_limiters/__init__.py`
  - **Pre-commit hooks** (1) — `.pre-commit-config.yaml`
  - **Payment / billing** (1) — `libs/langchain/langchain_classic/document_loaders/stripe.py`
  - **Logging** (1) — `libs/langchain/langchain_classic/callbacks/tracers/logging.py`

**Comfy-Org/ComfyUI** — 909 files
  - **Test harness** (51) — `tests-unit/app_test/custom_node_manager_test.py`, `tests-unit/app_test/frontend_manager_test.py` +49
  - **CI pipeline** (25) — `.github/workflows/api-node-template.yml`, `.github/workflows/backport_release.yaml` +23
  - **Model runtime / scheduler** (10) — `models/configs/v1-inference.yaml`, `models/configs/v1-inference_clip_skip_2.yaml` +8
  - **DB / ORM connection** (8) — `app/assets/database/models.py`, `app/assets/database/queries/__init__.py` +6
  - **Input validation (request)** (5) — `comfy/ldm/genmo/joint_model/asymm_models_joint.py`, `comfy/ldm/genmo/joint_model/layers.py` +3
  - **Realtime / pubsub** (4) — `custom_nodes/websocket_image_save.py`, `script_examples/websockets_api_example.py` +2
  - **Routing / HTTP routes** (4) — `api_server/routes/__init__.py`, `api_server/routes/internal/README.md` +2
  - **LLM/API-compat adapter** (4) — `comfy_api_nodes/apis/anthropic.py`, `comfy_api_nodes/apis/openai.py` +2
  - **Dependency mgmt** (3) — `pyproject.toml`, `requirements.txt` +1
  - **Release/versioning** (2) — `.github/workflows/release-stable-all.yml`, `.github/workflows/release-webhook.yml`
  - **Async jobs / workers** (2) — `comfy/ldm/genmo/joint_model/temporal_rope.py`, `comfy/ldm/modules/temporal_ae.py`
  - **Logging** (1) — `app/logger.py`

**github/spec-kit** — 362 files
  - **Test harness** (94) — `extensions/bug/commands/speckit.bug.test.md`, `tests/__init__.py` +92
  - **CI pipeline** (10) — `.github/workflows/add-community-extension.lock.yml`, `.github/workflows/add-community-preset.lock.yml` +8
  - **Release/versioning** (4) — `.github/workflows/RELEASE-PROCESS.md`, `.github/workflows/release-trigger.yml` +2
  - **Dependency mgmt** (2) — `.github/dependabot.yml`, `pyproject.toml`
  - **Lint/format config** (1) — `.editorconfig`
  - **Authorization / policy** (1) — `src/specify_cli/workflows/steps/gate/__init__.py`
  - **Prompt templates** (1) — `src/specify_cli/workflows/steps/prompt/__init__.py`

### JavaScript


**facebook/react** — 6866 files
  - **Test harness** (4124) — `.claude/skills/test/SKILL.md`, `.github/workflows/runtime_build_and_test.yml` +4122
  - **Lint/format config** (125) — `.editorconfig`, `.eslintignore` +123
  - **Release/versioning** (41) — `CHANGELOG.md`, `compiler/CHANGELOG.md` +39
  - **CI pipeline** (21) — `.github/workflows/compiler_discord_notify.yml`, `.github/workflows/compiler_playground.yml` +19
  - **Input validation (request)** (18) — `compiler/packages/babel-plugin-react-compiler/src/Validation/ValidateContextVariableLValues.ts`, `compiler/packages/babel-plugin-react-compiler/src/Validation/ValidateExhaustiveDependencies.ts` +16
  - **Async jobs / workers** (12) — `scripts/tasks/danger.js`, `scripts/tasks/eslint.js` +10
  - **Plugin / provider registry** (12) — `packages/react-dom-bindings/src/events/plugins/BeforeInputEventPlugin.js`, `packages/react-dom-bindings/src/events/plugins/ChangeEventPlugin.js` +10
  - **Model runtime / scheduler** (12) — `compiler/packages/babel-plugin-react-compiler/src/Inference/AliasingEffects.ts`, `compiler/packages/babel-plugin-react-compiler/src/Inference/AnalyseFunctions.ts` +10
  - **Cache / ephemeral state** (2) — `packages/react-cache/src/LRU.js`, `packages/react/npm/unstable-cache.js`
  - **Dependency mgmt** (1) — `.github/dependabot.yml`
  - **Logging** (1) — `packages/react-devtools-shared/src/Logger.js`
  - **Network privacy / transport** (1) — `packages/react-devtools-extensions/src/contentScripts/proxy.js`

**affaan-m/ECC** — 3141 files
  - **Test harness** (169) — `integrations/aura/tests/__init__.py`, `integrations/aura/tests/fixtures.py` +167
  - **Prompt templates** (37) — `.github/prompts/build-fix.prompt.md`, `.github/prompts/code-review.prompt.md` +35
  - **Model runtime / scheduler** (19) — `src/llm/__init__.py`, `src/llm/__main__.py` +17
  - **Release/versioning** (17) — `CHANGELOG.md`, `docs/drafts/release-1.10.1-announcement.md` +15
  - **Plugin / provider registry** (12) — `.agents/plugins/marketplace.json`, `.opencode/plugins/ecc-hooks.ts` +10
  - **CI pipeline** (8) — `.github/workflows/ci.yml`, `.github/workflows/maintenance.yml` +6
  - **Dependency mgmt** (4) — `.github/dependabot.yml`, `ecc2/Cargo.toml` +2
  - **Lint/format config** (2) — `.prettierrc`, `eslint.config.js`
  - **Async jobs / workers** (1) — `skills/django-celery/SKILL.md`
  - **Env/config validation** (1) — `.env.example`
  - **Network privacy / transport** (1) — `skills/homelab-wireguard-vpn/SKILL.md`
  - **LLM/API-compat adapter** (1) — `src/llm/providers/openai.py`

**vercel/next.js** — 29225 files
  - **Test harness** (18991) — `.github/workflows/build_and_test.yml`, `.github/workflows/retry_deploy_test.yml` +18989
  - **Lint/format config** (181) — `.config/eslintignore.mjs`, `.prettierignore` +179
  - **Network privacy / transport** (86) — `errors/deleting-query-params-in-proxy.mdx`, `errors/middleware-to-proxy.mdx` +84
  - **Dependency mgmt** (70) — `Cargo.toml`, `crates/next-api/Cargo.toml` +68
  - **CI pipeline** (37) — `.github/workflows/build_and_deploy.yml`, `.github/workflows/build_and_test.yml` +35
  - **Observability** (27) — `crates/next-core/src/next_telemetry.rs`, `packages/next/src/cli/next-telemetry.ts` +25
  - **Env/config validation** (16) — `packages/create-next-app/templates/app-empty/js/.env.example`, `packages/create-next-app/templates/app-empty/ts/.env.example` +14
  - **Cache / ephemeral state** (15) — `packages/next/src/client/components/router-reducer/reducers/find-head-in-cache.ts`, `packages/next/src/client/components/segment-cache/lru.ts` +13
  - **Async jobs / workers** (13) — `packages/next/src/compiled/@babel/runtime/helpers/esm/temporalRef.js`, `packages/next/src/compiled/@babel/runtime/helpers/esm/temporalUndefined.js` +11
  - **Containerization** (12) — `.github/actions/next-stats-action/Dockerfile`, `.github/images/playwright-chromium/Dockerfile` +10
  - **Public contracts / interfaces** (11) — `turbopack/packages/devlow-bench/src/interfaces/compare.ts`, `turbopack/packages/devlow-bench/src/interfaces/compose.ts` +9
  - **Input validation (request)** (8) — `packages/next/src/compiled/zod-validation-error/LICENSE`, `packages/next/src/compiled/zod-validation-error/index.js` +6
  - **DB / ORM connection** (7) — `turbopack/crates/turbo-tasks-backend/src/database/db_invalidation.rs`, `turbopack/crates/turbo-tasks-backend/src/database/db_versioning.rs` +5
  - **Plugin / provider registry** (7) — `.claude-plugin/plugins/README.md`, `.claude-plugin/plugins/cache-components/.claude-plugin/plugin.json` +5
  - **Realtime / pubsub** (6) — `packages/next/src/client/dev/error-overlay/websocket.ts`, `packages/next/src/client/dev/hot-reloader/pages/websocket.ts` +4
  - **Release/versioning** (5) — `.github/workflows/release-next-rspack.yml`, `contributing/repository/release-channels-publishing.md` +3
  - **Routing / HTTP routes** (5) — `packages/next/src/export/routes/app-page.ts`, `packages/next/src/export/routes/app-route.ts` +3
  - **File / blob storage** (3) — `packages/next/src/compiled/@vercel/blob/LICENSE`, `packages/next/src/compiled/@vercel/blob/index.cjs` +1
  - **i18n / localization** (3) — `packages/next/src/shared/lib/i18n/detect-domain-locale.ts`, `packages/next/src/shared/lib/i18n/get-locale-redirect.ts` +1
  - **Model registry / pull** (2) — `turbopack/crates/turbo-tasks/src/registry/mod.rs`, `turbopack/crates/turbo-tasks/src/registry/registry_type.rs`
  - **Authentication** (1) — `evals/evals/agent-033-forbidden-auth/app/lib/auth.ts`
  - **Crypto / signing / keys** (1) — `errors/proxy-new-signature.mdx`
  - **Logging** (1) — `.github/actions/next-stats-action/src/util/logger.js`

**nodejs/node** — 48956 files
  - **Test harness** (25616) — `deps/crates/vendor/autocfg/tests/no_std.rs`, `deps/crates/vendor/autocfg/tests/rustflags.rs` +25614
  - **Crypto / signing / keys** (89) — `lib/internal/crypto/aes.js`, `lib/internal/crypto/argon2.js` +87
  - **Lint/format config** (88) — `.clang-format`, `.editorconfig` +86
  - **Release/versioning** (72) — `CHANGELOG.md`, `deps/acorn/acorn-walk/CHANGELOG.md` +70
  - **Dependency mgmt** (54) — `.github/dependabot.yml`, `deps/crates/Cargo.toml` +52
  - **CI pipeline** (36) — `.github/workflows/auto-start-ci.yml`, `.github/workflows/build-tarball.yml` +34
  - **Authorization / policy** (19) — `src/permission/addon_permission.cc`, `src/permission/addon_permission.h` +17
  - **Replication / clustering** (7) — `lib/cluster.js`, `lib/internal/cluster/child.js` +5
  - **Async jobs / workers** (5) — `lib/internal/worker/clone_dom_exception.js`, `lib/internal/worker/io.js` +3
  - **Containerization** (2) — `deps/ngtcp2/ngtcp2/third-party/urlparse/.clusterfuzzlite/Dockerfile`, `deps/openssl/config/Dockerfile`
  - **Cache / ephemeral state** (2) — `lib/internal/source_map/source_map_cache.js`, `src/lru_cache-inl.h`
  - **Plugin / provider registry** (2) — `lib/internal/vfs/providers/memory.js`, `lib/internal/vfs/providers/real.js`
  - **i18n / localization** (1) — `tools/msvs/msi/nodemsi/i18n/en-us.wxl`

**mrdoob/three.js** — 5970 files
  - **Test harness** (319) — `examples/materialx/color3_vec3_cm_test.mtlx`, `examples/materialx/combined_test.mtlx` +317
  - **Lint/format config** (6) — `.editorconfig`, `eslint.config.js` +4
  - **CI pipeline** (5) — `.github/workflows/ci.yml`, `.github/workflows/codeql-code-scanning.yml` +3
  - **Dependency mgmt** (1) — `.github/renovate.json`
  - **Input validation (request)** (1) — `src/nodes/utils/JoinNode.js`

**mui/material-ui** — 41110 files
  - **Test harness** (894) — `docs/src/modules/utils/extractTemplates.test.js`, `docs/src/modules/utils/replaceMarkdownLinks.test.js` +892
  - **i18n / localization** (67) — `packages-internal/core-docs/src/i18n/i18n.tsx`, `packages-internal/core-docs/src/i18n/index.ts` +65
  - **Input validation (request)** (60) — `packages/mui-icons-material/lib/JoinFull.js`, `packages/mui-icons-material/lib/JoinFull.mjs` +58
  - **CI pipeline** (16) — `.github/workflows/check-if-pr-has-label.yml`, `.github/workflows/ci-check.yml` +14
  - **Release/versioning** (6) — `CHANGELOG.md`, `CHANGELOG.old.md` +4
  - **File / blob storage** (5) — `packages-internal/core-docs/src/branding/BrandingCssVarsProvider.tsx`, `packages/mui-icons-material/lib/HomeMiniOutlined.js` +3
  - **Lint/format config** (4) — `.editorconfig`, `.prettierignore` +2
  - **Dependency mgmt** (2) — `.github/dependabot.yml`, `renovate.json`
  - **Authorization / policy** (1) — `packages/mui-icons-material/lib/Policy.js`
  - **Cache / ephemeral state** (1) — `packages/mui-codemod/src/v5.0.0/emotion-prepend-cache.js`

**louislam/uptime-kuma** — 740 files
  - **Plugin / provider registry** (118) — `server/monitor-types/dns.js`, `server/monitor-types/gamedig.js` +116
  - **DB / ORM connection** (111) — `db/knex_init_db.js`, `db/knex_migrations/2023-08-16-0000-create-uptime.js` +109
  - **i18n / localization** (78) — `src/lang/README.md`, `src/lang/ab.json` +76
  - **Test harness** (49) — `test/backend-test/README.md`, `test/backend-test/check-translations.test.js` +47
  - **CI pipeline** (20) — `.github/workflows/ai-slop.yml`, `.github/workflows/auto-test.yml` +18
  - **Realtime / pubsub** (16) — `db/knex_migrations/2023-10-08-0000-mqtt-query.js`, `db/knex_migrations/2025-07-17-0000-mqtt-websocket-path.js` +14
  - **Release/versioning** (9) — `.github/workflows/release-beta.yml`, `.github/workflows/release-final.yml` +7
  - **Containerization** (4) — `docker/builder-go.dockerfile`, `docker/debian-base.dockerfile` +2
  - **Lint/format config** (4) — `.editorconfig`, `.eslintrc.js` +2
  - **Network privacy / transport** (4) — `db/old_migrations/patch-proxy.sql`, `server/model/proxy.js` +2
  - **Async jobs / workers** (2) — `server/jobs/clear-old-data.js`, `server/jobs/incremental-vacuum.js`
  - **Dependency mgmt** (1) — `.github/dependabot.yml`
  - **Authentication** (1) — `server/auth.js`
  - **Cache / ephemeral state** (1) — `server/modules/apicache/memory-cache.js`
  - **Rate limit / request guard** (1) — `server/rate-limiter.js`

**sveltejs/svelte** — 8937 files
  - **Test harness** (8314) — `benchmarking/benchmarks/reactivity/tests/clean_effects.bench.js`, `benchmarking/benchmarks/reactivity/tests/kairo_avoidable.bench.js` +8312
  - **Lint/format config** (6) — `.editorconfig`, `.prettierignore` +4
  - **CI pipeline** (5) — `.github/workflows/autofix.yml`, `.github/workflows/ci.yml` +3
  - **Release/versioning** (2) — `packages/svelte/CHANGELOG-pre-5.md`, `packages/svelte/CHANGELOG.md`
  - **Network privacy / transport** (2) — `packages/svelte/src/internal/client/proxy.js`, `packages/svelte/src/internal/client/proxy.test.ts`
  - **Migrations** (1) — `packages/svelte/src/compiler/migrate/index.js`

**webpack/webpack** — 12106 files
  - **Test harness** (10506) — `test/AbstractMethodError.unittest.js`, `test/AppendOnlyStackedSet.unittest.js` +10504
  - **Plugin / provider registry** (142) — `declarations/plugins/BannerPlugin.d.ts`, `declarations/plugins/IgnorePlugin.d.ts` +140
  - **CI pipeline** (9) — `.github/workflows/benchmarks.yml`, `.github/workflows/dependabot.yml` +7
  - **Cache / ephemeral state** (9) — `lib/cache/AddBuildDependenciesPlugin.js`, `lib/cache/AddManagedPathsPlugin.js` +7
  - **Lint/format config** (4) — `.editorconfig`, `.prettierignore` +2
  - **Release/versioning** (2) — `.github/workflows/release-announcement.yml`, `CHANGELOG.md`
  - **Dependency mgmt** (2) — `.github/dependabot.yml`, `.github/workflows/dependabot.yml`
  - **Logging** (1) — `lib/logging/Logger.js`

### TypeScript


**freeCodeCamp/freeCodeCamp** — 19286 files
  - **Test harness** (327) — `api/src/daily-coding-challenge/routes/daily-coding-challenge.test.ts`, `api/src/db/extensions.test.ts` +325
  - **Plugin / provider registry** (86) — `api/src/plugins/__fixtures__/user.ts`, `api/src/plugins/auth-dev.test.ts` +84
  - **i18n / localization** (59) — `client/i18n/config-for-tests.ts`, `client/i18n/config.js` +57
  - **Routing / HTTP routes** (46) — `api/src/daily-coding-challenge/routes/daily-coding-challenge.test.ts`, `api/src/daily-coding-challenge/routes/daily-coding-challenge.ts` +44
  - **CI pipeline** (21) — `.github/workflows/crowdin-download.client-ui.yml`, `.github/workflows/crowdin-upload.client-ui.yml` +19
  - **Lint/format config** (20) — `.editorconfig`, `.prettierignore` +18
  - **Realtime / pubsub** (10) — `curriculum/challenges/english/blocks/lecture-understanding-websockets/6a1fefb066d06ad567fbeb43.md`, `curriculum/challenges/english/blocks/lecture-understanding-websockets/6a1ff130175dfa251ad1e1ca.md` +8
  - **Payment / billing** (10) — `api/src/schemas/donate/charge-stripe-card.ts`, `api/src/schemas/donate/charge-stripe.ts` +8
  - **DB / ORM connection** (5) — `api/prisma/exam-creator.prisma`, `api/prisma/exam-environment.prisma` +3
  - **Containerization** (4) — `.devcontainer/docker-compose.yml`, `docker/api/Dockerfile` +2
  - **Authentication** (2) — `api/src/plugins/auth.ts`, `api/src/routes/public/auth.ts`
  - **Observability** (2) — `api/src/routes/public/sentry.ts`, `api/src/schemas/sentry/event.ts`
  - **Dependency mgmt** (1) — `renovate.json`
  - **Env/config validation** (1) — `api/src/utils/env.ts`
  - **Logging** (1) — `api/src/utils/logger.ts`

**openclaw/openclaw** — 19870 files
  - **Test harness** (6767) — `apps/android/app/src/test/java/ai/openclaw/app/AssistantLaunchTest.kt`, `apps/android/app/src/test/java/ai/openclaw/app/CronJobStatusParsingTest.kt` +6765
  - **Plugin / provider registry** (968) — `apps/shared/OpenClawKit/Sources/OpenClawKit/Resources/CanvasA2UI/assets/providers/google.png`, `apps/shared/OpenClawKit/Sources/OpenClawKit/Resources/CanvasA2UI/assets/providers/x.png` +966
  - **Authorization / policy** (158) — `apps/ios/Sources/Permissions/PermissionRequestBridge.swift`, `extensions/amazon-bedrock/thinking-policy.ts` +156
  - **Public contracts / interfaces** (116) — `src/channels/plugins/contracts/channel-catalog.contract.test.ts`, `src/channels/plugins/contracts/channel-import-guardrails.test.ts` +114
  - **Network privacy / transport** (88) — `.github/codeql/openclaw-boundary/queries/managed-proxy-runtime-mutation.ql`, `apps/macos/Sources/OpenClaw/RemotePortTunnel.swift` +86
  - **i18n / localization** (86) — `src/i18n/registry.test.ts`, `src/wizard/i18n/index.test.ts` +84
  - **Model runtime / scheduler** (81) — `src/commands/onboard-non-interactive/local/auth-choice-inference.test.ts`, `src/commands/onboard-non-interactive/local/auth-choice-inference.ts` +79
  - **Async jobs / workers** (73) — `extensions/memory-core/src/memory/temporal-decay.test.ts`, `extensions/memory-core/src/memory/temporal-decay.ts` +71
  - **CI pipeline** (59) — `.github/workflows/auto-response.yml`, `.github/workflows/ci-build-artifacts-testbox.yml` +57
  - **Release/versioning** (52) — `.agents/skills/release-openclaw-announcement/SKILL.md`, `.agents/skills/release-openclaw-announcement/agents/openai.yaml` +50
  - **Cache / ephemeral state** (45) — `extensions/codex/src/app-server/app-inventory-cache.ts`, `extensions/codex/src/app-server/rate-limit-cache.ts` +43
  - **Routing / HTTP routes** (41) — `extensions/browser/src/browser/routes/agent.act.download.ts`, `extensions/browser/src/browser/routes/agent.act.errors.ts` +39
  - **Input validation (request)** (38) — `src/config/zod-schema.agent-defaults.test.ts`, `src/config/zod-schema.agent-defaults.ts` +36
  - **Migrations** (21) — `extensions/codex/src/migration/apply.ts`, `extensions/codex/src/migration/auth.ts` +19
  - **Rate limit / request guard** (21) — `apps/shared/OpenClawKit/Sources/OpenClawKit/CaptureRateLimits.swift`, `extensions/browser/src/browser/rate-limit-message.ts` +19
  - **Authentication** (12) — `extensions/browser/src/gateway/auth.ts`, `extensions/codex/src/migration/auth.ts` +10
  - **Containerization** (10) — `.github/images/live-media-runner/Dockerfile`, `Dockerfile` +8
  - **Realtime / pubsub** (10) — `extensions/codex/src/app-server/transport-websocket.test.ts`, `extensions/codex/src/app-server/transport-websocket.ts` +8
  - **Logging** (9) — `extensions/matrix/src/matrix/sdk/logger.ts`, `extensions/qqbot/src/bridge/logger.ts` +7
  - **Env/config validation** (7) — `.env.example`, `apps/ios/fastlane/.env.example` +5
  - **Crypto / signing / keys** (5) — `extensions/line/src/signature.test.ts`, `extensions/line/src/signature.ts` +3
  - **Observability** (4) — `extensions/copilot/src/telemetry-bridge.test.ts`, `extensions/copilot/src/telemetry-bridge.ts` +2
  - **Model registry / pull** (4) — `src/agents/model-registry-loader.ts`, `src/agents/sessions/model-registry.test.ts` +2
  - **LLM/API-compat adapter** (4) — `src/agents/embedded-agent-helpers/openai.ts`, `src/llm/providers/anthropic.ts` +2
  - **Prompt templates** (4) — `.github/codex/prompts/docs-agent.md`, `.github/codex/prompts/docs-mdx-repair.md` +2
  - **Dependency mgmt** (3) — `.github/dependabot.yml`, `scripts/docs-i18n/go.mod` +1
  - **Pre-commit hooks** (1) — `.pre-commit-config.yaml`
  - **Lint/format config** (1) — `apps/android/.editorconfig`

**n8n-io/n8n** — 19968 files
  - **Test harness** (5571) — `.github/actions/ci-filter/__tests__/ci-filter.test.ts`, `.github/scripts/attest-image-sbom.test.mjs` +5569
  - **DB / ORM connection** (485) — `packages/@n8n/backend-test-utils/src/db/projects.ts`, `packages/@n8n/backend-test-utils/src/db/workflows.ts` +483
  - **Migrations** (280) — `packages/@n8n/db/src/migrations/common/1620821879465-UniqueWorkflowNames.ts`, `packages/@n8n/db/src/migrations/common/1630330987096-UpdateWorkflowCredentials.ts` +278
  - **Lint/format config** (238) — `.editorconfig`, `.prettierignore` +236
  - **Plugin / provider registry** (213) — `.claude/plugins/n8n/.claude-plugin/marketplace.json`, `.claude/plugins/n8n/.claude-plugin/plugin.json` +211
  - **Input validation (request)** (119) — `packages/@n8n/agents/src/utils/zod.ts`, `packages/@n8n/ai-workflow-builder.ee/src/validation/auto-fix/auto-fix-connections.ts` +117
  - **File / blob storage** (117) — `packages/@n8n/agents/src/storage/base-memory.ts`, `packages/@n8n/agents/src/workspace/filesystem/base-filesystem.ts` +115
  - **Async jobs / workers** (93) — `packages/frontend/editor-ui/src/app/workers/coordinator/index.ts`, `packages/frontend/editor-ui/src/app/workers/coordinator/initialize.ts` +91
  - **Prompt templates** (93) — `packages/@n8n/ai-workflow-builder.ee/src/code-builder/prompts/index.test.ts`, `packages/@n8n/ai-workflow-builder.ee/src/code-builder/prompts/index.ts` +91
  - **CI pipeline** (87) — `.github/workflows/backport.yml`, `.github/workflows/build-base-image.yml` +85
  - **Observability** (83) — `.github/CI-TELEMETRY.md`, `packages/@n8n/agents/src/sdk/telemetry.ts` +81
  - **Authorization / policy** (67) — `.github/poutine-rules/unpinned_action.rego`, `packages/@n8n/instance-ai/src/runtime/liveness-policy.ts` +65
  - **Payment / billing** (61) — `packages/@n8n/instance-ai/evaluations/computer-use/data/4.2-stripe-dashboard.json`, `packages/nodes-base/nodes/Harvest/__schema__/v1.0.0/invoice/getAll.json` +59
  - **Code generation** (60) — `packages/@n8n/workflow-sdk/src/codegen/code-generator.test.ts`, `packages/@n8n/workflow-sdk/src/codegen/code-generator.ts` +58
  - **Authentication** (37) — `packages/@n8n/api-types/src/dto/auth/embed-login-body.dto.ts`, `packages/@n8n/api-types/src/dto/auth/embed-login-query.dto.ts` +35
  - **Persistence / storage engine** (37) — `packages/@n8n/agents/src/storage/base-memory.ts`, `packages/@n8n/instance-ai/src/storage/agent-tree-snapshot.ts` +35
  - **Network privacy / transport** (34) — `packages/@n8n/ai-utilities/src/utils/http-proxy-agent.ts`, `packages/@n8n/ai-workflow-builder.ee/src/utils/http-proxy-agent.ts` +32
  - **Shell completion** (34) — `packages/frontend/editor-ui/src/features/settings/environments.ee/completions/variables.completions.test.ts`, `packages/frontend/editor-ui/src/features/settings/environments.ee/completions/variables.completions.ts` +32
  - **Release/versioning** (22) — `.github/workflows/release-build-daytona-snapshot.yml`, `.github/workflows/release-create-experiment.yml` +20
  - **Realtime / pubsub** (22) — `packages/@n8n/crdt/src/transports/websocket.test.ts`, `packages/@n8n/crdt/src/transports/websocket.ts` +20
  - **Crypto / signing / keys** (21) — `.github/scripts/cla/check-signatures.mjs`, `packages/@n8n/utils/src/jwt.test.ts` +19
  - **i18n / localization** (21) — `packages/@n8n/mcp-apps/src/i18n/index.test.ts`, `packages/@n8n/mcp-apps/src/i18n/index.ts` +19
  - **Containerization** (13) — `.devcontainer/Dockerfile`, `.devcontainer/docker-compose.yml` +11
  - **Logging** (10) — `packages/@n8n/agents/src/runtime/logger.ts`, `packages/@n8n/agents/src/workspace/sandbox/logger.ts` +8
  - **Model registry / pull** (6) — `packages/cli/src/modules/mcp-registry/registry/mcp-registry-api.client.ts`, `packages/cli/src/modules/mcp-registry/registry/mcp-registry-server.entity.ts` +4
  - **Cache / ephemeral state** (5) — `packages/@n8n/expression-runtime/src/evaluator/lru-cache.ts`, `packages/cli/src/services/cache/cache.constants.ts` +3
  - **Public contracts / interfaces** (5) — `packages/nodes-base/nodes/TheHive/interfaces/AlertInterface.ts`, `packages/nodes-base/nodes/TheHive/interfaces/CaseInterface.ts` +3
  - **Rate limit / request guard** (4) — `packages/@n8n/decorators/src/controller/rate-limit.ts`, `packages/cli/src/services/rate-limit.service.ts` +2
  - **Model runtime / scheduler** (4) — `packages/@n8n/nodes-langchain/nodes/embeddings/EmbeddingsHuggingFaceInference/EmbeddingsHuggingFaceInference.node.ts`, `packages/@n8n/nodes-langchain/nodes/embeddings/EmbeddingsHuggingFaceInference/huggingface.svg` +2
  - **Dependency mgmt** (3) — `packages/@n8n/ai-workflow-builder.ee/evaluations/programmatic/python/pyproject.toml`, `packages/@n8n/task-runner-python/pyproject.toml` +1
  - **Env/config validation** (2) — `packages/@n8n/agents/.env.example`, `packages/frontend/editor-ui/src/features/shared/editors/plugins/codemirror/typescript/worker/env.ts`
  - **LLM/API-compat adapter** (2) — `packages/@n8n/ai-utilities/integration-tests/openai.ts`, `packages/@n8n/ai-utilities/src/types/openai.ts`
  - **Pre-commit hooks** (1) — `lefthook.yml`

**microsoft/vscode** — 15604 files
  - **Test harness** (4859) — `.eslint-plugin-local/tests/code-no-observable-get-in-reactive-context-test.ts`, `.eslint-plugin-local/tests/code-no-reader-after-await-test.ts` +4857
  - **Prompt templates** (310) — `.github/prompts/build-champ.prompt.md`, `.github/prompts/codenotify.prompt.md` +308
  - **Plugin / provider registry** (233) — `.vscode/extensions/vscode-extras/package-lock.json`, `.vscode/extensions/vscode-extras/package.json` +231
  - **Shell completion** (191) — `extensions/copilot/src/extension/completions/common/config.ts`, `extensions/copilot/src/extension/completions/common/copilotInlineCompletionItemProviderService.ts` +189
  - **Observability** (155) — `.eslint-plugin-local/code-no-telemetry-common-property.ts`, `.github/instructions/telemetry.instructions.md` +153
  - **Lint/format config** (111) — `.editorconfig`, `.eslint-ignore` +109
  - **Network privacy / transport** (79) — `cli/src/commands/tunnels.rs`, `cli/src/tunnels.rs` +77
  - **Async jobs / workers** (46) — `extensions/copilot/src/platform/tasks/common/tasksService.ts`, `extensions/copilot/src/platform/tasks/common/testTasksService.ts` +44
  - **CI pipeline** (18) — `.github/workflows/api-proposal-version-check.yml`, `.github/workflows/chat-lib-package.yml` +16
  - **File / blob storage** (14) — `extensions/copilot/src/platform/filesystem/common/fileSystemService.ts`, `extensions/copilot/src/platform/filesystem/common/fileTypes.ts` +12
  - **Authorization / policy** (10) — `src/vs/base/common/policy.ts`, `src/vs/platform/policy/common/filePolicyService.ts` +8
  - **Persistence / storage engine** (10) — `src/vs/base/parts/storage/common/storage.ts`, `src/vs/base/parts/storage/node/storage.ts` +8
  - **Dependency mgmt** (6) — `.github/dependabot.yml`, `build/win32/Cargo.toml` +4
  - **Authentication** (6) — `extensions/copilot/src/extension/completions-core/vscode-node/lib/src/auth/copilotTokenManager.ts`, `extensions/copilot/src/extension/completions-core/vscode-node/lib/src/auth/copilotTokenNotifier.ts` +4
  - **Logging** (6) — `extensions/copilot/src/extension/chatSessions/copilotcli/node/logger.ts`, `extensions/copilot/src/extension/completions-core/vscode-node/lib/src/logger.ts` +4
  - **Release/versioning** (4) — `extensions/copilot/CHANGELOG.md`, `extensions/copilot/test/simulation/fixtures/gen/CHANGELOG.md` +2
  - **Realtime / pubsub** (4) — `extensions/copilot/src/platform/networking/node/chatWebSocketManager.ts`, `extensions/copilot/src/platform/networking/node/chatWebSocketTelemetry.ts` +2
  - **Crypto / signing / keys** (4) — `extensions/php-language-features/src/features/signatureHelpProvider.ts`, `extensions/typescript-language-features/src/languageFeatures/signatureHelp.ts` +2
  - **Containerization** (3) — `.devcontainer/Dockerfile`, `extensions/copilot/docs/monitoring/docker-compose.yaml` +1
  - **Env/config validation** (3) — `extensions/github-authentication/src/common/env.ts`, `extensions/microsoft-authentication/src/common/env.ts` +1
  - **LLM/API-compat adapter** (3) — `extensions/copilot/src/extension/completions-core/vscode-node/lib/src/openai/openai.ts`, `extensions/copilot/src/platform/networking/common/anthropic.ts` +1
  - **Input validation (request)** (2) — `extensions/copilot/src/extension/inlineEdits/vscode-node/jointInlineCompletionProvider.ts`, `extensions/copilot/src/platform/inlineEdits/common/dataTypes/jointCompletionsProviderOptions.ts`
  - **Rate limit / request guard** (2) — `extensions/copilot/src/extension/typescriptContext/vscode-node/throttledDebounce.ts`, `src/vs/workbench/contrib/chat/browser/widget/chatContentParts/chatAnonymousRateLimitedPart.ts`
  - **Model registry / pull** (1) — `src/vs/platform/registry/common/platform.ts`

**anomalyco/opencode** — 5729 files
  - **Test harness** (678) — `packages/app/e2e/regression/prompt-thinking-level.spec.ts`, `packages/app/e2e/regression/session-list-path-loading.spec.ts` +676
  - **Migrations** (266) — `packages/console/core/migrations/20250902065410_fluffy_raza/migration.sql`, `packages/console/core/migrations/20250902065410_fluffy_raza/snapshot.json` +264
  - **Routing / HTTP routes** (224) — `packages/console/app/src/routes/[...404].css`, `packages/console/app/src/routes/[...404].tsx` +222
  - **i18n / localization** (92) — `packages/app/src/i18n/ar.ts`, `packages/app/src/i18n/br.ts` +90
  - **CLI option parsing** (75) — `packages/opencode/src/cli/cmd/account.ts`, `packages/opencode/src/cli/cmd/acp.ts` +73
  - **DB / ORM connection** (74) — `packages/console/core/drizzle.config.ts`, `packages/console/core/src/drizzle/index.ts` +72
  - **Model runtime / scheduler** (71) — `packages/llm/AGENTS.md`, `packages/llm/README.md` +69
  - **Prompt templates** (34) — `packages/opencode/src/agent/prompt/compaction.txt`, `packages/opencode/src/agent/prompt/explore.txt` +32
  - **CI pipeline** (26) — `.github/workflows/beta.yml`, `.github/workflows/close-issues.yml` +24
  - **Plugin / provider registry** (17) — `.opencode/plugins/smoke-theme.json`, `.opencode/plugins/tui-smoke.tsx` +15
  - **Payment / billing** (15) — `packages/console/app/src/routes/stripe/webhook.ts`, `packages/console/app/src/routes/workspace/[id]/billing/billing-section.module.css` +13
  - **Authentication** (14) — `packages/console/app/src/context/auth.ts`, `packages/console/app/src/routes/auth/[...callback].ts` +12
  - **Input validation (request)** (12) — `packages/ui/src/assets/audio/yup-01.aac`, `packages/ui/src/assets/audio/yup-01.mp3` +10
  - **Authorization / policy** (10) — `packages/app/src/components/directory-picker-policy.ts`, `packages/core/src/permission/saved.ts` +8
  - **File / blob storage** (9) — `packages/core/src/filesystem/fff.bun.ts`, `packages/core/src/filesystem/fff.node.ts` +7
  - **Containerization** (7) — `packages/containers/base/Dockerfile`, `packages/containers/bun-node/Dockerfile` +5
  - **Lint/format config** (7) — `.editorconfig`, `.prettierignore` +5
  - **Cache / ephemeral state** (7) — `packages/app/src/context/file/content-cache.ts`, `packages/app/src/context/file/view-cache.ts` +5
  - **LLM/API-compat adapter** (6) — `packages/console/app/src/routes/zen/util/provider/anthropic.ts`, `packages/console/app/src/routes/zen/util/provider/openai.ts` +4
  - **Realtime / pubsub** (5) — `packages/app/src/utils/terminal-websocket-url.test.ts`, `packages/app/src/utils/terminal-websocket-url.ts` +3
  - **Network privacy / transport** (4) — `packages/console/app/src/lib/stats-proxy.ts`, `packages/opencode/src/server/proxy-util.ts` +2
  - **Release/versioning** (3) — `.github/workflows/release-github-action.yml`, `packages/ui/src/assets/icons/file-types/semantic-release.svg` +1
  - **Crypto / signing / keys** (3) — `packages/console/app/src/routes/workspace/[id]/keys/index.tsx`, `packages/console/app/src/routes/workspace/[id]/keys/key-section.module.css` +1
  - **Rate limit / request guard** (2) — `packages/console/app/src/routes/zen/util/ipRateLimiter.ts`, `packages/console/app/src/routes/zen/util/keyRateLimiter.ts`
  - **Env/config validation** (2) — `packages/core/src/plugin/env.ts`, `packages/slack/.env.example`
  - **Persistence / storage engine** (2) — `packages/opencode/src/storage/schema.ts`, `packages/opencode/src/storage/storage.ts`
  - **Logging** (1) — `packages/console/app/src/routes/zen/util/logger.ts`
  - **Observability** (1) — `packages/ui/src/assets/icons/file-types/sentry.svg`

**langgenius/dify** — 12454 files
  - **Test harness** (4057) — `api/providers/trace/trace-aliyun/tests/unit_tests/aliyun_trace/data_exporter/test_traceclient.py`, `api/providers/trace/trace-aliyun/tests/unit_tests/aliyun_trace/entities/test_aliyun_trace_entity.py` +4055
  - **i18n / localization** (713) — `web/i18n/ar-TN/app-annotation.json`, `web/i18n/ar-TN/app-api.json` +711
  - **Plugin / provider registry** (586) — `api/core/tools/builtin_tool/providers/__init__.py`, `api/core/tools/builtin_tool/providers/_positions.py` +584
  - **Model runtime / scheduler** (228) — `api/core/app/llm/__init__.py`, `api/core/app/llm/model_access.py` +226
  - **Migrations** (185) — `api/migrations/README`, `api/migrations/alembic.ini` +183
  - **Payment / billing** (102) — `api/controllers/console/billing/__init__.py`, `api/controllers/console/billing/billing.py` +100
  - **Async jobs / workers** (68) — `api/celery_entrypoint.py`, `api/celery_healthcheck.py` +66
  - **Authentication** (62) — `api/controllers/console/auth/activate.py`, `api/controllers/console/auth/data_source_bearer_auth.py` +60
  - **Dependency mgmt** (42) — `.github/dependabot.yml`, `api/providers/trace/trace-aliyun/pyproject.toml` +40
  - **Observability** (38) — `api/configs/extra/sentry_config.py`, `api/configs/observability/otel/otel_config.py` +36
  - **File / blob storage** (33) — `api/configs/middleware/storage/aliyun_oss_storage_config.py`, `api/configs/middleware/storage/amazon_s3_storage_config.py` +31
  - **Persistence / storage engine** (33) — `api/configs/middleware/storage/aliyun_oss_storage_config.py`, `api/configs/middleware/storage/amazon_s3_storage_config.py` +31
  - **CI pipeline** (29) — `.github/workflows/api-tests.yml`, `.github/workflows/autofix.yml` +27
  - **Prompt templates** (23) — `api/core/agent/prompt/template.py`, `api/core/prompt/__init__.py` +21
  - **Network privacy / transport** (21) — `cli/src/http/proxy.test.ts`, `cli/src/http/proxy.ts` +19
  - **Lint/format config** (17) — `.editorconfig`, `api/.ruff.toml` +15
  - **Cache / ephemeral state** (10) — `api/configs/middleware/cache/__init__.py`, `api/configs/middleware/cache/redis_config.py` +8
  - **Containerization** (7) — `.devcontainer/Dockerfile`, `api/Dockerfile` +5
  - **DB / ORM connection** (6) — `api/core/db/__init__.py`, `api/core/db/session_factory.py` +4
  - **Shell completion** (6) — `api/core/app/apps/completion/__init__.py`, `api/core/app/apps/completion/app_config_manager.py` +4
  - **Release/versioning** (5) — `cli/scripts/release-build.sh`, `cli/scripts/release-naming.mjs` +3
  - **Input validation (request)** (5) — `dify-agent/src/agenton_collections/layers/pydantic_ai/__init__.py`, `dify-agent/src/agenton_collections/layers/pydantic_ai/bridge.py` +3
  - **Rate limit / request guard** (4) — `api/core/app/features/rate_limiting/__init__.py`, `api/core/app/features/rate_limiting/rate_limit.py` +2
  - **Env/config validation** (4) — `api/.env.example`, `docker/.env.example` +2
  - **Public contracts / interfaces** (4) — `packages/contracts/openapi-ts.api.config.ts`, `packages/contracts/openapi-ts.enterprise.config.ts` +2
  - **Realtime / pubsub** (3) — `api/configs/middleware/cache/redis_pubsub_config.py`, `web/app/components/workflow/collaboration/core/websocket-manager.ts` +1
  - **Routing / HTTP routes** (2) — `dify-agent/src/dify_agent/server/routes/runs.py`, `dify-agent/src/dify_agent/server/routes/workspace_files.py`
  - **Crypto / signing / keys** (1) — `api/core/tools/signature.py`

**firecrawl/firecrawl** — 1434 files
  - **Test harness** (244) — `apps/api/src/__tests__/deep-research/unit/deep-research-redis.test.ts`, `apps/api/src/__tests__/e2e_extract/index.test.ts` +242
  - **CI pipeline** (30) — `.github/workflows/deploy-go-service.yaml`, `.github/workflows/deploy-image-staging.yml` +28
  - **Dependency mgmt** (28) — `.github/dependabot.yml`, `.github/scripts/requirements.txt` +26
  - **Lint/format config** (9) — `apps/api/.prettierrc`, `apps/api/native/.editorconfig` +7
  - **Async jobs / workers** (8) — `apps/api/src/services/worker/crawl-logic.ts`, `apps/api/src/services/worker/nuq-prefetch-worker.ts` +6
  - **Plugin / provider registry** (8) — `apps/api/native/src/document/providers/doc.rs`, `apps/api/native/src/document/providers/docx.rs` +6
  - **Containerization** (7) — `apps/api/Dockerfile`, `apps/go-html-to-md-service/Dockerfile` +5
  - **Shell completion** (7) — `apps/api/src/lib/extract/completions/analyzeSchemaAndPrompt.ts`, `apps/api/src/lib/extract/completions/batchExtract.ts` +5
  - **DB / ORM connection** (6) — `apps/api/src/db/connection.ts`, `apps/api/src/db/rpc.ts` +4
  - **Rate limit / request guard** (5) — `apps/api/src/services/rate-limiter.test.ts`, `apps/api/src/services/rate-limiter.ts` +3
  - **Env/config validation** (5) — `apps/api/.env.example`, `apps/js-sdk/.env.example` +3
  - **Routing / HTTP routes** (5) — `apps/api/src/routes/admin.ts`, `apps/api/src/routes/shared.ts` +3
  - **Payment / billing** (4) — `apps/api/src/services/billing/batch_billing.ts`, `apps/api/src/services/billing/credit_billing.ts` +2
  - **File / blob storage** (3) — `apps/api/src/lib/gcs-jobs.ts`, `apps/api/src/lib/gcs-monitoring.ts` +1
  - **Observability** (3) — `apps/api/src/lib/otel-tracer.ts`, `apps/api/src/services/sentry.test.ts` +1
  - **Network privacy / transport** (3) — `apps/api/src/controllers/v2/research-proxy.ts`, `apps/api/src/controllers/v2/support-proxy.ts` +1
  - **Release/versioning** (2) — `apps/php-sdk/CHANGELOG.md`, `apps/rust-sdk/CHANGELOG.md`
  - **Model runtime / scheduler** (2) — `apps/api/src/lib/deterministicJson/llm/client.ts`, `apps/api/src/lib/deterministicJson/llm/prompts.ts`
  - **Pre-commit hooks** (1) — `apps/api/.husky/pre-commit`
  - **Authentication** (1) — `apps/api/src/controllers/auth.ts`
  - **Cache / ephemeral state** (1) — `apps/api/src/lib/gcs-pdf-cache.ts`
  - **Logging** (1) — `apps/api/src/lib/logger.ts`
  - **CLI option parsing** (1) — `apps/go-sdk/options.go`

**excalidraw/excalidraw** — 1226 files
  - **Test harness** (144) — `excalidraw-app/tests/LanguageList.test.tsx`, `excalidraw-app/tests/MobileMenu.test.tsx` +142
  - **i18n / localization** (59) — `packages/excalidraw/locales/README.md`, `packages/excalidraw/locales/ar-SA.json` +57
  - **CI pipeline** (11) — `.github/workflows/autorelease-excalidraw.yml`, `.github/workflows/build-docker.yml` +9
  - **Lint/format config** (7) — `.editorconfig`, `.eslintignore` +5
  - **Containerization** (4) — `.codesandbox/Dockerfile`, `Dockerfile` +2
  - **Observability** (3) — `.github/assets/sentry.svg`, `.github/workflows/sentry-production.yml` +1
  - **Release/versioning** (2) — `packages/excalidraw/CHANGELOG.md`, `packages/utils/CHANGELOG.md`
  - **Network privacy / transport** (1) — `packages/excalidraw/context/tunnels.ts`

**clash-verge-rev/clash-verge-rev** — 645 files
  - **i18n / localization** (156) — `crates/clash-verge-i18n/locales/ar.yml`, `crates/clash-verge-i18n/locales/de.yml` +154
  - **Network privacy / transport** (67) — `crates/clash-verge-draft/Cargo.toml`, `crates/clash-verge-draft/bench/benche_me.rs` +65
  - **CLI option parsing** (30) — `src-tauri/src/cmd/app.rs`, `src-tauri/src/cmd/backup.rs` +28
  - **CI pipeline** (15) — `.github/workflows/autobuild-check-test.yml`, `.github/workflows/autobuild.yml` +13
  - **Dependency mgmt** (9) — `Cargo.toml`, `crates/clash-verge-draft/Cargo.toml` +7
  - **Test harness** (8) — `crates/clash-verge-draft/tests/test_me.rs`, `src/assets/image/test/apple.svg` +6
  - **Plugin / provider registry** (7) — `src/providers/app-data-context.ts`, `src/providers/app-data-provider.tsx` +5
  - **Lint/format config** (5) — `.editorconfig`, `.github/workflows/rustfmt.yml` +3
  - **Release/versioning** (1) — `scripts/release-version.mjs`
  - **Cache / ephemeral state** (1) — `src/hooks/use-icon-cache.ts`

### Java


**elastic/elasticsearch** — 37275 files *(tree truncated)*
  - **Test harness** (12939) — `.buildkite/scripts/flakiness-detection/analyzer/analyze.test.ts`, `.buildkite/scripts/flakiness-detection/analyzer/render.test.ts` +12937
  - **Model runtime / scheduler** (1700) — `rest-api-spec/src/main/resources/rest-api-spec/api/inference.chat_completion_unified.json`, `rest-api-spec/src/main/resources/rest-api-spec/api/inference.completion.json` +1698
  - **Replication / clustering** (818) — `rest-api-spec/src/main/resources/rest-api-spec/api/cluster.allocation_explain.json`, `rest-api-spec/src/main/resources/rest-api-spec/api/cluster.delete_component_template.json` +816
  - **Plugin / provider registry** (425) — `distribution/tools/plugin-cli/bc/src/main/java/org/elasticsearch/plugins/cli/bc/PgpSignatureVerifier.java`, `distribution/tools/plugin-cli/src/main/java/org/elasticsearch/plugins/cli/InstallPluginAction.java` +423
  - **Async jobs / workers** (274) — `modules/lang-painless/src/main/resources/org/elasticsearch/painless/java.time.temporal.txt`, `qa/smoke-test-http/src/internalClusterTest/java/org/elasticsearch/action/support/tasks/RestListTasksCancellationIT.java` +272
  - **File / blob storage** (206) — `.buildkite/scripts/third-party-test-credentials.gcs.sh`, `modules/repository-gcs/build.gradle` +204
  - **Shell completion** (133) — `server/src/main/java/org/elasticsearch/inference/completion/Content.java`, `server/src/main/java/org/elasticsearch/inference/completion/ContentObject.java` +131
  - **Observability** (112) — `modules/apm/licenses/opentelemetry-LICENSE.txt`, `modules/apm/licenses/opentelemetry-NOTICE.txt` +110
  - **Authorization / policy** (107) — `libs/entitlement/src/main/java/org/elasticsearch/entitlement/runtime/policy/CaseInsensitiveComparison.java`, `libs/entitlement/src/main/java/org/elasticsearch/entitlement/runtime/policy/CaseSensitiveComparison.java` +105
  - **Release/versioning** (79) — `.buildkite/pipelines/pull-request/release-tests.yml`, `.buildkite/scripts/release-tests.sh` +77
  - **Input validation (request)** (70) — `modules/dot-prefix-validation/src/main/java/org/elasticsearch/validation/AutoCreateDotValidator.java`, `modules/dot-prefix-validation/src/main/java/org/elasticsearch/validation/CreateIndexDotValidator.java` +68
  - **Persistence / storage engine** (56) — `x-pack/plugin/autoscaling/src/internalClusterTest/java/org/elasticsearch/xpack/autoscaling/storage/AutoscalingStorageIntegTestCase.java`, `x-pack/plugin/autoscaling/src/internalClusterTest/java/org/elasticsearch/xpack/autoscaling/storage/FrozenStorageDeciderIT.java` +54
  - **Migrations** (55) — `x-pack/plugin/migrate/build.gradle`, `x-pack/plugin/migrate/src/internalClusterTest/java/org/elasticsearch/system_indices/action/AbstractFeatureMigrationIntegTest.java` +53
  - **Rate limit / request guard** (48) — `build-tools-internal/src/main/java/org/elasticsearch/gradle/internal/testfixtures/DockerComposeThrottle.java`, `build-tools/src/main/java/org/elasticsearch/gradle/testclusters/TestClustersThrottle.java` +46
  - **Cache / ephemeral state** (36) — `server/src/internalClusterTest/java/org/elasticsearch/action/admin/indices/cache/clear/ClearIndicesCacheBlocksIT.java`, `server/src/internalClusterTest/java/org/elasticsearch/action/admin/indices/cache/clear/ClearIndicesCacheParamsIT.java` +34
  - **Crypto / signing / keys** (16) — `build-tools-internal/src/main/resources/forbidden/es-all-signatures.txt`, `build-tools-internal/src/main/resources/forbidden/es-server-signatures.txt` +14
  - **Model registry / pull** (11) — `libs/entitlement/src/main/java/org/elasticsearch/entitlement/runtime/registry/InstrumentationInfo.java`, `libs/entitlement/src/main/java/org/elasticsearch/entitlement/runtime/registry/InstrumentationRegistryImpl.java` +9
  - **Containerization** (9) — `dev-tools/prometheus-local/docker-compose.yml`, `dev-tools/zstd.Dockerfile` +7
  - **CI pipeline** (6) — `.github/workflows/check-esql-generated-headers.yml`, `.github/workflows/docs-build.yml` +4
  - **Dependency mgmt** (3) — `libs/parquet-rs/native/Cargo.toml`, `renovate.json` +1
  - **Lint/format config** (2) — `.buildkite/.editorconfig`, `.editorconfig`
  - **i18n / localization** (2) — `x-pack/plugin/inference/src/main/java/org/elasticsearch/xpack/inference/services/amazonbedrock/translation/ChatCompletionRole.java`, `x-pack/plugin/inference/src/main/java/org/elasticsearch/xpack/inference/services/amazonbedrock/translation/Constants.java`

**NationalSecurityAgency/ghidra** — 20332 files
  - **Test harness** (1484) — `Ghidra/Debug/Debugger-agent-gdb/src/main/py/tests/EMPTY`, `Ghidra/Debug/Debugger-importers/src/test/java/ghidra/app/util/opinion/TenetLoaderPlusPlusTest.java` +1482
  - **DB / ORM connection** (810) — `Ghidra/Debug/AnnotationValidator/src/main/java/ghidra/util/database/annotproc/AbstractDBAnnotationValidator.java`, `Ghidra/Debug/AnnotationValidator/src/main/java/ghidra/util/database/annotproc/AccessSpec.java` +808
  - **Plugin / provider registry** (437) — `Ghidra/Extensions/BSimElasticPlugin/Module.manifest`, `Ghidra/Extensions/BSimElasticPlugin/README.md` +435
  - **CLI option parsing** (184) — `Ghidra/Features/Base/src/main/java/ghidra/app/cmd/analysis/SharedReturnAnalysisCmd.java`, `Ghidra/Features/Base/src/main/java/ghidra/app/cmd/comments/AppendCommentCmd.java` +182
  - **File / blob storage** (172) — `Ghidra/Features/Base/src/main/java/ghidra/app/util/bin/format/pe/cli/blobs/CliAbstractSig.java`, `Ghidra/Features/Base/src/main/java/ghidra/app/util/bin/format/pe/cli/blobs/CliBlob.java` +170
  - **Async jobs / workers** (134) — `Ghidra/Features/Base/src/main/java/ghidra/app/util/task/OpenProgramRequest.java`, `Ghidra/Features/Base/src/main/java/ghidra/app/util/task/OpenProgramTask.java` +132
  - **i18n / localization** (110) — `Ghidra/Framework/SoftwareModeling/src/main/java/ghidra/program/model/lang/AddressLabelInfo.java`, `Ghidra/Framework/SoftwareModeling/src/main/java/ghidra/program/model/lang/BasicCompilerSpec.java` +108
  - **Crypto / signing / keys** (94) — `Ghidra/Features/BSim/ghidra_scripts/CompareBSimSignaturesScript.java`, `Ghidra/Features/BSim/ghidra_scripts/CompareBSimSignaturesSpecifyWeightsScript.java` +92
  - **Input validation (request)** (62) — `Ghidra/Features/Base/src/main/java/ghidra/app/plugin/core/analysis/validator/OffcutReferencesValidator.java`, `Ghidra/Features/Base/src/main/java/ghidra/app/plugin/core/analysis/validator/PercentAnalyzedValidator.java` +60
  - **Cache / ephemeral state** (8) — `Ghidra/Framework/Generic/src/main/java/generic/cache/BasicFactory.java`, `Ghidra/Framework/Generic/src/main/java/generic/cache/CachingPool.java` +6
  - **Network privacy / transport** (8) — `Ghidra/Features/Base/src/main/java/ghidra/app/util/viewer/proxy/AddressProxy.java`, `Ghidra/Features/Base/src/main/java/ghidra/app/util/viewer/proxy/ClosedVariableProxy.java` +6
  - **Dependency mgmt** (7) — `Ghidra/Debug/Debugger-agent-dbgeng/src/main/py/pyproject.toml`, `Ghidra/Debug/Debugger-agent-drgn/src/main/py/pyproject.toml` +5
  - **CI pipeline** (2) — `.github/workflows/build-ghidra.yml`, `.github/workflows/dependency-submission.yml`
  - **Code generation** (2) — `Ghidra/Debug/Debugger-isf/src/main/proto/isf.proto`, `Ghidra/Debug/Debugger-rmi-trace/src/main/proto/trace-rmi.proto`
  - **Containerization** (1) — `docker/Dockerfile`
  - **Authentication** (1) — `Ghidra/Framework/Generic/src/main/java/ghidra/framework/generic/auth/Password.java`
  - **Observability** (1) — `Ghidra/Features/Base/src/main/java/ghidra/app/util/bin/format/macho/dyld/DyldCacheLocalSymbolsEntry.java`

**spring-projects/spring-framework** — 11382 files
  - **Test harness** (5056) — `buildSrc/src/test/java/org/springframework/build/multirelease/MultiReleaseJarPluginTests.java`, `integration-tests/src/test/java/org/springframework/aop/config/AopNamespaceHandlerAdviceOrderIntegrationTests.java` +5054
  - **Realtime / pubsub** (229) — `framework-docs/modules/ROOT/pages/web/webflux-websocket.adoc`, `framework-docs/modules/ROOT/pages/web/websocket.adoc` +227
  - **Cache / ephemeral state** (144) — `framework-docs/modules/ROOT/pages/integration/cache/annotations.adoc`, `framework-docs/modules/ROOT/pages/integration/cache/declarative-xml.adoc` +142
  - **Input validation (request)** (69) — `framework-docs/modules/ROOT/pages/core/validation/beanvalidation.adoc`, `framework-docs/modules/ROOT/pages/core/validation/convert.adoc` +67
  - **File / blob storage** (58) — `framework-docs/modules/ROOT/pages/web/webflux/controller/ann-methods/multipart-forms.adoc`, `framework-docs/modules/ROOT/pages/web/webmvc/mvc-controller/ann-methods/multipart-forms.adoc` +56
  - **Network privacy / transport** (34) — `framework-docs/modules/ROOT/assets/images/aop-proxy-call.png`, `framework-docs/modules/ROOT/assets/images/aop-proxy-plain-pojo-call.png` +32
  - **i18n / localization** (26) — `spring-context/src/main/java/org/springframework/context/i18n/LocaleContext.java`, `spring-context/src/main/java/org/springframework/context/i18n/LocaleContextHolder.java` +24
  - **Async jobs / workers** (19) — `spring-context/src/main/java/org/springframework/format/datetime/standard/TemporalAccessorParser.java`, `spring-context/src/main/java/org/springframework/format/datetime/standard/TemporalAccessorPrinter.java` +17
  - **Model registry / pull** (12) — `spring-web/src/main/java/org/springframework/web/service/registry/AbstractHttpServiceRegistrar.java`, `spring-web/src/main/java/org/springframework/web/service/registry/GroupsMetadata.java` +10
  - **CI pipeline** (9) — `.github/workflows/backport-bot.yml`, `.github/workflows/build-and-deploy-snapshot.yml` +7
  - **Rate limit / request guard** (2) — `spring-aop/src/main/java/org/springframework/aop/interceptor/ConcurrencyThrottleInterceptor.java`, `spring-core/src/main/java/org/springframework/util/ConcurrencyThrottleSupport.java`
  - **Observability** (2) — `spring-web/src/main/java/org/springframework/http/server/observation/OpenTelemetryServerHttpObservationDocumentation.java`, `spring-web/src/main/java/org/springframework/http/server/observation/OpenTelemetryServerRequestObservationConvention.java`
  - **Release/versioning** (1) — `.github/workflows/release-milestone.yml`
  - **Lint/format config** (1) — `.editorconfig`
  - **Crypto / signing / keys** (1) — `spring-core/src/main/java/org/springframework/cglib/core/Signature.java`

**google/guava** — 3315 files
  - **Test harness** (1248) — `android/guava-testlib/test/com/google/common/collect/testing/AndroidIncompatible.java`, `android/guava-testlib/test/com/google/common/collect/testing/FeatureSpecificTestSuiteBuilderTest.java` +1246
  - **Cache / ephemeral state** (50) — `android/guava/src/com/google/common/cache/AbstractCache.java`, `android/guava/src/com/google/common/cache/AbstractLoadingCache.java` +48
  - **Rate limit / request guard** (4) — `android/guava/src/com/google/common/util/concurrent/RateLimiter.java`, `android/guava/src/com/google/common/util/concurrent/SmoothRateLimiter.java` +2
  - **CI pipeline** (2) — `.github/workflows/ci.yml`, `.github/workflows/scorecard.yml`
  - **Input validation (request)** (2) — `android/guava/src/com/google/common/base/Joiner.java`, `guava/src/com/google/common/base/Joiner.java`
  - **Observability** (2) — `android/guava-testlib/src/com/google/common/collect/testing/google/MultimapContainsEntryTester.java`, `guava-testlib/src/com/google/common/collect/testing/google/MultimapContainsEntryTester.java`
  - **Dependency mgmt** (1) — `.github/dependabot.yml`

**dbeaver/dbeaver** — 9565 files
  - **Plugin / provider registry** (9248) — `plugins/org.jkiss.dbeaver.cmp.simple.ui/META-INF/MANIFEST.MF`, `plugins/org.jkiss.dbeaver.cmp.simple.ui/OSGI-INF/l10n/bundle.properties` +9246
  - **Async jobs / workers** (276) — `plugins/org.jkiss.dbeaver.data.transfer.ui/src/org/jkiss/dbeaver/tasks/ui/sql/script/SQLScriptTaskConfigurationWizard.java`, `plugins/org.jkiss.dbeaver.data.transfer.ui/src/org/jkiss/dbeaver/tasks/ui/sql/script/SQLScriptTaskConfigurator.java` +274
  - **Model registry / pull** (257) — `plugins/org.jkiss.dbeaver.core/src/org/jkiss/dbeaver/registry/DataSourceDescriptorManager.java`, `plugins/org.jkiss.dbeaver.core/src/org/jkiss/dbeaver/registry/EclipsePluginApplicationImpl.java` +255
  - **Test harness** (152) — `plugins/org.jkiss.dbeaver.ext.wmi/src/org/jkiss/wmi/test/TestService.java`, `test/org.jkiss.dbeaver.data.transfer.test/META-INF/MANIFEST.MF` +150
  - **Realtime / pubsub** (54) — `plugins/org.jkiss.dbeaver.model.event/src/org/jkiss/dbeaver/model/websocket/WSConstants.java`, `plugins/org.jkiss.dbeaver.model.event/src/org/jkiss/dbeaver/model/websocket/WSEventHandler.java` +52
  - **DB / ORM connection** (49) — `plugins/org.jkiss.dbeaver.data.transfer.ui/src/org/jkiss/dbeaver/tools/transfer/ui/pages/database/AttributeTransformerSettingsDialog.java`, `plugins/org.jkiss.dbeaver.data.transfer.ui/src/org/jkiss/dbeaver/tools/transfer/ui/pages/database/ColumnsMappingDialog.java` +47
  - **Authentication** (48) — `plugins/org.jkiss.dbeaver.ext.bigquery/src/org/jkiss/dbeaver/ext/bigquery/auth/BQAuthModel.java`, `plugins/org.jkiss.dbeaver.ext.mssql/src/org/jkiss/dbeaver/ext/mssql/auth/SQLServerAuthModelADIntegrated.java` +46
  - **Migrations** (46) — `plugins/org.jkiss.dbeaver.ui.config.migration/src/org/jkiss/dbeaver/ui/config/migration/ImportConfigImages.java`, `plugins/org.jkiss.dbeaver.ui.config.migration/src/org/jkiss/dbeaver/ui/config/migration/ImportConfigMessages.java` +44
  - **Cache / ephemeral state** (43) — `plugins/org.jkiss.dbeaver.ext.db2/src/org/jkiss/dbeaver/ext/db2/model/cache/DB2AliasCache.java`, `plugins/org.jkiss.dbeaver.ext.db2/src/org/jkiss/dbeaver/ext/db2/model/cache/DB2IndexCache.java` +41
  - **Shell completion** (22) — `plugins/org.jkiss.dbeaver.model.sql/src/org/jkiss/dbeaver/model/sql/completion/CompletionProposalBase.java`, `plugins/org.jkiss.dbeaver.model.sql/src/org/jkiss/dbeaver/model/sql/completion/SQLCompletionActivityTracker.java` +20
  - **Network privacy / transport** (15) — `plugins/org.jkiss.dbeaver.model/src/org/jkiss/dbeaver/model/impl/net/HTTPTunnelImpl.java`, `plugins/org.jkiss.dbeaver.model/src/org/jkiss/dbeaver/model/impl/net/SocksConstants.java` +13
  - **Authorization / policy** (14) — `plugins/org.jkiss.dbeaver.model.event/src/org/jkiss/dbeaver/model/websocket/event/permissions/WSObjectPermissionEvent.java`, `plugins/org.jkiss.dbeaver.model.event/src/org/jkiss/dbeaver/model/websocket/event/permissions/WSSubjectPermissionEvent.java` +12
  - **File / blob storage** (6) — `plugins/org.jkiss.dbeaver.model/src/org/jkiss/dbeaver/model/data/storage/BytesContentStorage.java`, `plugins/org.jkiss.dbeaver.model/src/org/jkiss/dbeaver/model/data/storage/ExternalContentStorage.java` +4
  - **Persistence / storage engine** (6) — `plugins/org.jkiss.dbeaver.model/src/org/jkiss/dbeaver/model/data/storage/BytesContentStorage.java`, `plugins/org.jkiss.dbeaver.model/src/org/jkiss/dbeaver/model/data/storage/ExternalContentStorage.java` +4
  - **Input validation (request)** (3) — `plugins/org.jkiss.dbeaver.data.gis/src/org/jkiss/dbeaver/model/gis/GisTransformRequest.java`, `plugins/org.jkiss.dbeaver.ui/src/org/jkiss/dbeaver/ui/validator/DoubleValidator.java` +1
  - **CI pipeline** (2) — `.github/workflows/codeql.yml`, `.github/workflows/push-pr-devel.yml`
  - **Prompt templates** (2) — `plugins/org.jkiss.dbeaver.model.ai/src/org/jkiss/dbeaver/model/ai/prompt/AIPromptAbstract.java`, `plugins/org.jkiss.dbeaver.model.ai/src/org/jkiss/dbeaver/model/ai/prompt/AIPromptGenerateSql.java`
  - **Observability** (1) — `plugins/org.jkiss.dbeaver.model.sql/src/org/jkiss/dbeaver/model/sql/semantics/model/SQLQueryMemberAccessEntry.java`

**ReactiveX/RxJava** — 2005 files
  - **Test harness** (989) — `src/test/java/io/reactivex/rxjava4/completable/CapturingUncaughtExceptionHandler.java`, `src/test/java/io/reactivex/rxjava4/completable/CompletableIsolatedTest.java` +987
  - **CI pipeline** (10) — `.github/workflows/discord-release-announce.yml`, `.github/workflows/entropy-beauty-scan.yml` +8
  - **Payment / billing** (10) — `src/main/java/io/reactivex/rxjava4/internal/subscriptions/ArrayCompositeSubscription.java`, `src/main/java/io/reactivex/rxjava4/internal/subscriptions/AsyncSubscription.java` +8
  - **Rate limit / request guard** (4) — `src/main/java/io/reactivex/rxjava4/internal/operators/flowable/FlowableThrottleFirstTimed.java`, `src/main/java/io/reactivex/rxjava4/internal/operators/flowable/FlowableThrottleLatest.java` +2
  - **Plugin / provider registry** (2) — `src/main/java/io/reactivex/rxjava4/plugins/RxJavaPlugins.java`, `src/main/java/io/reactivex/rxjava4/plugins/package-info.java`
  - **Release/versioning** (1) — `.github/workflows/release-notify-x.yml`
  - **Dependency mgmt** (1) — `.github/dependabot.yml`
  - **Async jobs / workers** (1) — `src/main/java/io/reactivex/rxjava4/internal/queue/MpscLinkedQueue.java`

**apache/dubbo** — 4840 files
  - **Test harness** (1973) — `dubbo-cluster/src/test/java/org/apache/dubbo/rpc/cluster/ConfiguratorTest.java`, `dubbo-cluster/src/test/java/org/apache/dubbo/rpc/cluster/StickyTest.java` +1971
  - **Replication / clustering** (206) — `dubbo-cluster/src/main/java/org/apache/dubbo/rpc/cluster/CacheableRouterFactory.java`, `dubbo-cluster/src/main/java/org/apache/dubbo/rpc/cluster/Cluster.java` +204
  - **Model registry / pull** (131) — `dubbo-cluster/src/main/java/org/apache/dubbo/registry/AddressListener.java`, `dubbo-cluster/src/main/java/org/apache/dubbo/rpc/cluster/support/registry/ZoneAwareCluster.java` +129
  - **Realtime / pubsub** (24) — `dubbo-common/src/main/java/org/apache/dubbo/config/nested/WebSocketConfig.java`, `dubbo-plugin/dubbo-triple-websocket/pom.xml` +22
  - **Cache / ephemeral state** (22) — `dubbo-common/src/main/java/org/apache/dubbo/common/cache/FileCacheStore.java`, `dubbo-common/src/main/java/org/apache/dubbo/common/cache/FileCacheStoreFactory.java` +20
  - **Code generation** (20) — `dubbo-demo/dubbo-demo-spring-boot-idl/dubbo-demo-spring-boot-idl-consumer/src/main/proto/helloworld.proto`, `dubbo-demo/dubbo-demo-spring-boot-idl/dubbo-demo-spring-boot-idl-provider/src/main/proto/helloworld.proto` +18
  - **Authentication** (13) — `dubbo-plugin/dubbo-auth/src/main/java/org/apache/dubbo/auth/AccessKeyAuthenticator.java`, `dubbo-plugin/dubbo-auth/src/main/java/org/apache/dubbo/auth/BasicAuthenticator.java` +11
  - **Routing / HTTP routes** (13) — `dubbo-cluster/src/main/java/org/apache/dubbo/rpc/cluster/router/mesh/route/MeshAppRuleListener.java`, `dubbo-cluster/src/main/java/org/apache/dubbo/rpc/cluster/router/mesh/route/MeshEnvListener.java` +11
  - **Migrations** (12) — `dubbo-registry/dubbo-registry-api/src/main/java/org/apache/dubbo/registry/client/migration/DefaultMigrationAddressComparator.java`, `dubbo-registry/dubbo-registry-api/src/main/java/org/apache/dubbo/registry/client/migration/InvokersChangedListener.java` +10
  - **Input validation (request)** (12) — `dubbo-compatible/src/main/java/com/alibaba/dubbo/validation/Validation.java`, `dubbo-compatible/src/main/java/com/alibaba/dubbo/validation/Validator.java` +10
  - **Network privacy / transport** (10) — `dubbo-common/src/main/java/org/apache/dubbo/common/bytecode/Proxy.java`, `dubbo-rpc/dubbo-rpc-api/src/main/java/org/apache/dubbo/rpc/proxy/AbstractFallbackJdkProxyFactory.java` +8
  - **Crypto / signing / keys** (9) — `dubbo-metrics/dubbo-metrics-api/src/main/java/org/apache/dubbo/metrics/model/key/CategoryOverall.java`, `dubbo-metrics/dubbo-metrics-api/src/main/java/org/apache/dubbo/metrics/model/key/MetricsCat.java` +7
  - **CI pipeline** (5) — `.github/workflows/build-and-test-pr.yml`, `.github/workflows/build-and-test-scheduled-3.1.yml` +3
  - **i18n / localization** (4) — `dubbo-common/src/main/java/org/apache/dubbo/common/lang/Nullable.java`, `dubbo-common/src/main/java/org/apache/dubbo/common/lang/Prioritized.java` +2
  - **Observability** (3) — `dubbo-metrics/dubbo-tracing/src/main/java/org/apache/dubbo/tracing/tracer/otel/OTelPropagatorProvider.java`, `dubbo-metrics/dubbo-tracing/src/main/java/org/apache/dubbo/tracing/tracer/otel/OpenTelemetryProvider.java` +1
  - **Authorization / policy** (2) — `dubbo-plugin/dubbo-qos/src/main/java/org/apache/dubbo/qos/permission/DefaultAnonymousAccessPermissionChecker.java`, `dubbo-plugin/dubbo-qos/src/main/java/org/apache/dubbo/qos/permission/PermissionChecker.java`
  - **Containerization** (1) — `dubbo-plugin/dubbo-native/src/main/resources/Dockerfile`
  - **Release/versioning** (1) — `.github/workflows/release-test.yml`
  - **Lint/format config** (1) — `.editorconfig`
  - **Plugin / provider registry** (1) — `dubbo-common/src/main/resources/META-INF/org/apache/logging/log4j/core/config/plugins/Log4j2Plugins.dat`

**halo-dev/halo** — 2857 files
  - **Test harness** (402) — `api/src/test/java/run/halo/app/core/extension/ThemeTest.java`, `api/src/test/java/run/halo/app/core/extension/content/PostTest.java` +400
  - **Plugin / provider registry** (166) — `application/src/main/resources/extensions/attachment-local-policy.yaml`, `application/src/main/resources/extensions/authproviders.yaml` +164
  - **i18n / localization** (12) — `application/src/main/resources/config/i18n/messages.properties`, `application/src/main/resources/config/i18n/messages_es.properties` +10
  - **Migrations** (11) — `api/src/main/java/run/halo/app/migration/Backup.java`, `api/src/main/java/run/halo/app/migration/Constant.java` +9
  - **File / blob storage** (6) — `application/src/main/java/run/halo/app/extension/gc/GcSynchronizer.java`, `ui/packages/editor/src/components/upload/EditorLinkObtain.vue` +4
  - **Realtime / pubsub** (6) — `api/src/main/java/run/halo/app/core/endpoint/WebSocketEndpoint.java`, `application/src/main/java/run/halo/app/core/endpoint/WebSocketEndpointManager.java` +4
  - **CI pipeline** (5) — `.github/workflows/halo.yaml`, `.github/workflows/openapi-check.yaml` +3
  - **Network privacy / transport** (5) — `ui/packages/api-client/src/api/reverse-proxy-v1alpha1-api.ts`, `ui/packages/api-client/src/models/file-reverse-proxy-provider.ts` +3
  - **DB / ORM connection** (4) — `application/src/main/resources/db/migration/h2/.gitkeep`, `application/src/main/resources/db/migration/mariadb/.gitkeep` +2
  - **Prompt templates** (4) — `.github/prompts/opsx-apply.prompt.md`, `.github/prompts/opsx-archive.prompt.md` +2
  - **Lint/format config** (3) — `.editorconfig`, `ui/.editorconfig` +1
  - **Authorization / policy** (3) — `ui/console-src/modules/contents/attachments/composables/use-attachment-policy.ts`, `ui/packages/api-client/src/models/policy.ts` +1
  - **Crypto / signing / keys** (3) — `application/src/main/java/run/halo/app/infra/properties/JwtProperties.java`, `application/src/main/java/run/halo/app/security/authentication/rememberme/CookieSignatureKeyResolver.java` +1
  - **Code generation** (3) — `ui/packages/api-client/src/.openapi-generator-ignore`, `ui/packages/api-client/src/.openapi-generator/FILES` +1
  - **Containerization** (2) — `Dockerfile`, `e2e/Dockerfile`
  - **Release/versioning** (1) — `.github/workflows/release-ui-packages.yaml`
  - **Pre-commit hooks** (1) — `ui/.husky/pre-commit`
  - **Cache / ephemeral state** (1) — `ui/src/composables/use-content-cache.ts`
  - **Rate limit / request guard** (1) — `application/src/main/java/run/halo/app/infra/exception/RateLimitExceededException.java`

### C++


**tensorflow/tensorflow** — 36418 files
  - **Test harness** (7522) — `tensorflow/c/c_api_experimental_test.cc`, `tensorflow/c/c_api_function_test.cc` +7520
  - **Async jobs / workers** (380) — `tensorflow/lite/delegates/gpu/common/task/arguments.cc`, `tensorflow/lite/delegates/gpu/common/task/arguments.h` +378
  - **Code generation** (200) — `tensorflow/compiler/jit/tf_graph_to_hlo_compiler.proto`, `tensorflow/compiler/jit/xla_activity.proto` +198
  - **Model runtime / scheduler** (97) — `tensorflow/compiler/jit/shape_inference.cc`, `tensorflow/compiler/jit/shape_inference.h` +95
  - **Crypto / signing / keys** (79) — `tensorflow/c/experimental/saved_model/core/revived_types/tf_signature_def_function.cc`, `tensorflow/c/experimental/saved_model/core/revived_types/tf_signature_def_function.h` +77
  - **Replication / clustering** (55) — `tensorflow/compiler/jit/cluster_scoping_pass.cc`, `tensorflow/compiler/jit/cluster_scoping_pass.h` +53
  - **CI pipeline** (42) — `.github/workflows/arm-cd.yml`, `.github/workflows/arm-ci-extended-cpp.yml` +40
  - **File / blob storage** (35) — `tensorflow/c/experimental/filesystem/filesystem_interface.h`, `tensorflow/c/experimental/filesystem/modular_filesystem.cc` +33
  - **Release/versioning** (21) — `.github/workflows/release-branch-cherrypick.yml`, `RELEASE.md` +19
  - **Plugin / provider registry** (20) — `tensorflow/c/experimental/filesystem/plugins/gcs/cleanup.h`, `tensorflow/c/experimental/filesystem/plugins/gcs/expiring_lru_cache.h` +18
  - **Observability** (14) — `tensorflow/lite/delegates/telemetry.cc`, `tensorflow/lite/delegates/telemetry.h` +12
  - **Containerization** (6) — `ci/devinfra/docker/windows/Dockerfile`, `ci/devinfra/docker/windows2022/Dockerfile` +4
  - **Dependency mgmt** (5) — `.github/dependabot.yml`, `third_party/xla/.github/dependabot.yml` +3
  - **Lint/format config** (5) — `.clang-format`, `tensorflow/.clang-format` +3
  - **DB / ORM connection** (4) — `tensorflow/core/lib/db/snapfn.cc`, `tensorflow/core/lib/db/sqlite.cc` +2
  - **Input validation (request)** (3) — `tensorflow/lite/testing/join.h`, `tensorflow/lite/testing/join_test.cc` +1
  - **i18n / localization** (3) — `tensorflow/python/autograph/lang/directives.py`, `tensorflow/python/autograph/lang/special_functions.py` +1
  - **Cache / ephemeral state** (2) — `tensorflow/core/function/polymorphism/function_cache.py`, `tensorflow/python/summary/writer/writer_cache.py`
  - **Rate limit / request guard** (1) — `tensorflow/core/platform/cloud/gcs_throttle.h`

**facebook/react-native** — 7790 files
  - **Test harness** (1185) — `.github/workflow-scripts/__tests__/createDraftRelease-test.js`, `.github/workflow-scripts/__tests__/extractIssueOncalls-test.js` +1183
  - **i18n / localization** (77) — `packages/react-native/React/I18n/.clang-format-ignore`, `packages/react-native/React/I18n/FBXXHashUtils.h` +75
  - **Lint/format config** (60) — `.clang-format`, `.editorconfig` +58
  - **Code generation** (35) — `packages/react-native/scripts/codegen/__fixtures__/fixtures.js`, `packages/react-native/scripts/codegen/__fixtures__/test-app-legacy/package.json` +33
  - **File / blob storage** (31) — `packages/react-native/Libraries/Blob/Blob.js`, `packages/react-native/Libraries/Blob/BlobManager.js` +29
  - **Realtime / pubsub** (31) — `packages/react-native/Libraries/WebSocket/NativeWebSocketModule.js`, `packages/react-native/Libraries/WebSocket/RCTReconnectingWebSocket.h` +29
  - **CI pipeline** (28) — `.github/workflows/analyze-pr.yml`, `.github/workflows/api-changes.yml` +26
  - **Public contracts / interfaces** (23) — `packages/react-native/ReactAndroid/src/main/java/com/facebook/react/devsupport/interfaces/BundleLoadCallback.kt`, `packages/react-native/ReactAndroid/src/main/java/com/facebook/react/devsupport/interfaces/DebuggerFrontendPanelName.kt` +21
  - **Async jobs / workers** (22) — `packages/gradle-plugin/react-native-gradle-plugin/src/main/kotlin/com/facebook/react/tasks/BundleHermesCTask.kt`, `packages/gradle-plugin/react-native-gradle-plugin/src/main/kotlin/com/facebook/react/tasks/GenerateAutolinkingNewArchitecturesFileTask.kt` +20
  - **Release/versioning** (12) — `.github/RELEASE_TEMPLATE.md`, `CHANGELOG-0.5x.md` +10
  - **Network privacy / transport** (11) — `packages/dev-middleware/src/inspector-proxy/CdpDebugLogging.js`, `packages/dev-middleware/src/inspector-proxy/CustomMessageHandler.js` +9
  - **Observability** (10) — `packages/react-native/ReactCommon/react/renderer/imagemanager/ImageTelemetry.cpp`, `packages/react-native/ReactCommon/react/renderer/imagemanager/ImageTelemetry.h` +8
  - **Dependency mgmt** (3) — `Gemfile`, `packages/rn-tester/Gemfile` +1
  - **Cache / ephemeral state** (2) — `packages/eslint-plugin-specs/with-babel-register/disk-cache.js`, `scripts/clean-gha-cache.js`
  - **Authorization / policy** (1) — `packages/react-native/ReactAndroid/src/main/java/com/facebook/react/modules/permissions/PermissionsModule.kt`
  - **Crypto / signing / keys** (1) — `private/eslint-plugin-monorepo/rules/valid-flow-typed-signature.js`
  - **Logging** (1) — `packages/dev-middleware/src/types/Logger.js`

**electron/electron** — 3004 files
  - **Test harness** (855) — `spec/.gitignore`, `spec/ambient.d.ts` +853
  - **Release/versioning** (71) — `script/release/bin/README.md`, `script/release/bin/cleanup-release.ts` +69
  - **Plugin / provider registry** (63) — `shell/browser/extensions/api/BUILD.gn`, `shell/browser/extensions/api/extension_action/extension_action_api.cc` +61
  - **CI pipeline** (44) — `.github/workflows/apply-patches.yml`, `.github/workflows/archaeologist-dig.yml` +42
  - **Crypto / signing / keys** (5) — `patches/node/build_change_crdtp_protocoltypetraits_signatures_to_avoid_conflict.patch`, `shell/browser/webauthn/electron_authenticator_request_client_delegate.cc` +3
  - **Realtime / pubsub** (4) — `lib/browser/api/net-websocket.ts`, `patches/chromium/revert_remove_the_allowaggressivethrottlingwithwebsocket_feature.patch` +2
  - **Lint/format config** (2) — `.clang-format`, `docs/fiddles/.eslintrc.json`
  - **Async jobs / workers** (2) — `lib/worker/init.ts`, `patches/node/reland_temporal_unflag_temporal.patch`
  - **Rate limit / request guard** (2) — `shell/browser/electron_navigation_throttle.cc`, `shell/browser/electron_navigation_throttle.h`
  - **Containerization** (1) — `.devcontainer/docker-compose.yml`
  - **Dependency mgmt** (1) — `.github/dependabot.yml`
  - **Cache / ephemeral state** (1) — `script/patches-mtime-cache.py`
  - **Payment / billing** (1) — `.github/actions/checkout/action.yml`
  - **Env/config validation** (1) — `.env.example`

**ggml-org/llama.cpp** — 2951 files
  - **Test harness** (158) — `examples/llama.android/lib/src/test/java/android/llama/cpp/ExampleUnitTest.kt`, `gguf-py/tests/__init__.py` +156
  - **CI pipeline** (48) — `.github/workflows/ai-issues.yml`, `.github/workflows/build-3rd-party.yml` +46
  - **Containerization** (11) — `.devops/cann.Dockerfile`, `.devops/cpu.Dockerfile` +9
  - **Dependency mgmt** (10) — `examples/model-conversion/requirements.txt`, `gguf-py/pyproject.toml` +8
  - **Routing / HTTP routes** (10) — `tools/ui/src/routes/(chat)/+layout.svelte`, `tools/ui/src/routes/(chat)/+page.svelte` +8
  - **Plugin / provider registry** (9) — `tools/ui/src/lib/components/app/content/MarkdownContent/plugins/rehype/code-block-utils.ts`, `tools/ui/src/lib/components/app/content/MarkdownContent/plugins/rehype/enhance-code-blocks.ts` +7
  - **Lint/format config** (8) — `.clang-format`, `.editorconfig` +6
  - **Shell completion** (4) — `tools/completion/CMakeLists.txt`, `tools/completion/README.md` +2
  - **Network privacy / transport** (2) — `tools/server/server-cors-proxy.h`, `tools/ui/src/lib/utils/cors-proxy.ts`
  - **Pre-commit hooks** (1) — `.pre-commit-config.yaml`
  - **Input validation (request)** (1) — `requirements/requirements-pydantic.txt`
  - **Rate limit / request guard** (1) — `tools/ui/src/lib/hooks/use-throttle.svelte.ts`
  - **Env/config validation** (1) — `tools/ui/.env.example`

**godotengine/godot** — 13978 files
  - **Test harness** (1586) — `modules/csg/tests/test_csg.h`, `modules/dds/tests/test_dds.h` +1584
  - **Plugin / provider registry** (121) — `editor/plugins/SCsub`, `editor/plugins/editor_plugin.compat.inc` +119
  - **i18n / localization** (114) — `editor/translations/SCsub`, `editor/translations/editor/ar.po` +112
  - **File / blob storage** (56) — `drivers/gles3/storage/SCsub`, `drivers/gles3/storage/config.cpp` +54
  - **Persistence / storage engine** (55) — `drivers/gles3/storage/SCsub`, `drivers/gles3/storage/config.cpp` +53
  - **Input validation (request)** (52) — `editor/scene/3d/gizmos/physics/joint_3d_gizmo_plugin.cpp`, `editor/scene/3d/gizmos/physics/joint_3d_gizmo_plugin.h` +50
  - **Crypto / signing / keys** (32) — `core/crypto/SCsub`, `core/crypto/aes_context.cpp` +30
  - **Realtime / pubsub** (20) — `modules/websocket/SCsub`, `modules/websocket/config.py` +18
  - **CI pipeline** (8) — `.github/workflows/android_builds.yml`, `.github/workflows/ios_builds.yml` +6
  - **Lint/format config** (8) — `.clang-format`, `.editorconfig` +6
  - **Replication / clustering** (6) — `servers/rendering/renderer_rd/cluster_builder_rd.cpp`, `servers/rendering/renderer_rd/cluster_builder_rd.h` +4
  - **Public contracts / interfaces** (3) — `modules/mono/glue/GodotSharp/GodotSharp/Core/Interfaces/IAwaitable.cs`, `modules/mono/glue/GodotSharp/GodotSharp/Core/Interfaces/IAwaiter.cs` +1
  - **Cache / ephemeral state** (2) — `core/templates/lru.h`, `misc/scripts/purge_cache.py`
  - **Release/versioning** (1) — `CHANGELOG.md`
  - **Dependency mgmt** (1) — `pyproject.toml`
  - **Pre-commit hooks** (1) — `.pre-commit-config.yaml`
  - **Network privacy / transport** (1) — `editor/icons/Onion.svg`

**bitcoin/bitcoin** — 2968 files
  - **Test harness** (940) — `ci/test/00_setup_env.sh`, `ci/test/00_setup_env_arm.sh` +938
  - **Crypto / signing / keys** (210) — `cmake/secp256k1.cmake`, `src/crypto/CMakeLists.txt` +208
  - **Release/versioning** (141) — `doc/release-notes-21283.md`, `doc/release-notes-26201.md` +139
  - **i18n / localization** (103) — `src/qt/locale/CMakeLists.txt`, `src/qt/locale/bitcoin_am.ts` +101
  - **DB / ORM connection** (44) — `src/leveldb/db/autocompact_test.cc`, `src/leveldb/db/builder.cc` +42
  - **Authorization / policy** (18) — `src/policy/ephemeral_policy.cpp`, `src/policy/ephemeral_policy.h` +16
  - **Public contracts / interfaces** (11) — `src/interfaces/README.md`, `src/interfaces/chain.h` +9
  - **Shell completion** (10) — `contrib/completions/bash/bitcoin-cli.bash`, `contrib/completions/bash/bitcoin-tx.bash` +8
  - **Network privacy / transport** (7) — `src/ipc/libmultiprocess/include/mp/proxy-io.h`, `src/ipc/libmultiprocess/include/mp/proxy-types.h` +5
  - **CI pipeline** (6) — `.github/workflows/ci.yml`, `src/crc32c/.github/workflows/build.yml` +4
  - **Lint/format config** (5) — `.editorconfig`, `ruff.toml` +3
  - **Dependency mgmt** (4) — `ci/lint/requirements.txt`, `contrib/devtools/deterministic-fuzz-coverage/Cargo.toml` +2
  - **Cache / ephemeral state** (4) — `.github/actions/cache/restore/action.yml`, `.github/actions/cache/restore/internal/action.yml` +2
  - **Observability** (3) — `src/qt/forms/sendcoinsentry.ui`, `src/qt/sendcoinsentry.cpp` +1
  - **Containerization** (2) — `src/minisketch/ci/linux-debian.Dockerfile`, `src/secp256k1/ci/linux-debian.Dockerfile`
  - **Replication / clustering** (2) — `src/bench/cluster_linearize.cpp`, `src/cluster_linearize.h`
  - **File / blob storage** (1) — `src/bench/gcs_filter.cpp`

**opencv/opencv** — 7738 files
  - **Test harness** (646) — `apps/python_app_test.py`, `cmake/checks/ffmpeg_test.cpp` +644
  - **Code generation** (10) — `modules/dnn/src/caffe/opencv-caffe.proto`, `modules/dnn/src/onnx/opencv-onnx.proto` +8
  - **Plugin / provider registry** (7) — `modules/core/misc/plugins/parallel_openmp/CMakeLists.txt`, `modules/core/misc/plugins/parallel_tbb/CMakeLists.txt` +5
  - **Lint/format config** (4) — `.editorconfig`, `doc/js_tutorials/js_assets/.eslintrc.json` +2
  - **File / blob storage** (4) — `3rdparty/openexr/IlmImf/ImfMultiPartInputFile.cpp`, `3rdparty/openexr/IlmImf/ImfMultiPartInputFile.h` +2
  - **Model runtime / scheduler** (4) — `cmake/OpenCVDetectInferenceEngine.cmake`, `modules/dnn/include/opencv2/dnn/utils/inference_engine.hpp` +2
  - **CI pipeline** (2) — `.github/workflows/4.x.yml`, `.github/workflows/PR-4.x.yaml`
  - **Containerization** (2) — `3rdparty/zlib-ng/arch/s390/self-hosted-builder/actions-runner.Dockerfile`, `modules/videoio/misc/plugin_gstreamer/Dockerfile`
  - **Release/versioning** (2) — `3rdparty/libtiff/RELEASE-DATE`, `3rdparty/openjpeg/CHANGELOG.md`
  - **Dependency mgmt** (1) — `samples/dnn/dnn_model_runner/dnn_conversion/requirements.txt`

**ocornut/imgui** — 269 files
  - **CI pipeline** (4) — `.github/workflows/build.yml`, `.github/workflows/manual.yml` +2
  - **Release/versioning** (1) — `docs/CHANGELOG.txt`
  - **Lint/format config** (1) — `.editorconfig`

**protocolbuffers/protobuf** — 3499 files
  - **Test harness** (726) — `.github/scripts/validate_yaml_test.sh`, `bazel/tests/BUILD` +724
  - **Code generation** (261) — `cmake/protoc.cmake`, `compatibility/buf.yaml` +259
  - **Release/versioning** (34) — `.github/workflows/release_bazel_module.yaml`, `.github/workflows/release_prep.sh` +32
  - **CI pipeline** (24) — `.github/workflows/clear_caches.yml`, `.github/workflows/forked_pr_workflow_check.yml` +22
  - **Dependency mgmt** (7) — `.github/dependabot.yml`, `examples/go/go.mod` +5
  - **Lint/format config** (3) — `.clang-format`, `csharp/.editorconfig` +1
  - **Crypto / signing / keys** (3) — `csharp/keys/Google.Protobuf.public.snk`, `csharp/keys/Google.Protobuf.snk` +1
  - **Cache / ephemeral state** (2) — `ruby/lib/google/protobuf/ffi/object_cache.rb`, `ruby/lib/google/protobuf/internal/object_cache.rb`
  - **Async jobs / workers** (1) — `ruby/lib/google/tasks/ffi.rake`

**LadybirdBrowser/ladybird** — 23734 files
  - **Test harness** (17989) — `Libraries/LibWasm/Tests/CI/ci-sanity-check.c`, `Libraries/LibWasm/Tests/CI/ci-sanity-check.wasm` +17987
  - **Async jobs / workers** (65) — `Libraries/LibJS/Runtime/Temporal/AbstractOperations.cpp`, `Libraries/LibJS/Runtime/Temporal/AbstractOperations.h` +63
  - **Plugin / provider registry** (44) — `Libraries/LibWeb/WebGL/Extensions/ANGLEInstancedArrays.cpp`, `Libraries/LibWeb/WebGL/Extensions/ANGLEInstancedArrays.h` +42
  - **Realtime / pubsub** (20) — `Libraries/LibRequests/WebSocket.cpp`, `Libraries/LibRequests/WebSocket.h` +18
  - **CI pipeline** (16) — `.github/workflows/ci-image.yml`, `.github/workflows/ci.yml` +14
  - **Dependency mgmt** (15) — `.github/dependabot.yml`, `Cargo.toml` +13
  - **Cache / ephemeral state** (15) — `Libraries/LibHTTP/Cache/CacheEntry.cpp`, `Libraries/LibHTTP/Cache/CacheEntry.h` +13
  - **Crypto / signing / keys** (15) — `Libraries/LibWeb/Crypto/Crypto.cpp`, `Libraries/LibWeb/Crypto/Crypto.h` +13
  - **Release/versioning** (8) — `Meta/CMake/vcpkg/release-triplets/arm64-linux-dynamic.cmake`, `Meta/CMake/vcpkg/release-triplets/arm64-osx-dynamic.cmake` +6
  - **Lint/format config** (6) — `.clang-format`, `.editorconfig` +4
  - **Containerization** (3) — `.devcontainer/fedora-ci/Dockerfile`, `Meta/Docker/ci/Dockerfile` +1
  - **File / blob storage** (3) — `Libraries/LibFileSystem/CMakeLists.txt`, `Libraries/LibFileSystem/FileSystem.cpp` +1
  - **Network privacy / transport** (3) — `Libraries/LibCore/Proxy.h`, `Libraries/LibWeb/WebDriver/Proxy.cpp` +1
  - **Pre-commit hooks** (1) — `.pre-commit-config.yaml`

### C#


**microsoft/PowerToys** — 8054 files
  - **Plugin / provider registry** (459) — `src/modules/cmdpal/ext/Microsoft.CmdPal.Ext.WebSearch/Helpers/Browser/Providers/AssociatedApp.cs`, `src/modules/cmdpal/ext/Microsoft.CmdPal.Ext.WebSearch/Helpers/Browser/Providers/AssociationProviderBase.cs` +457
  - **Test harness** (210) — `src/modules/FileLocksmith/FileLocksmithCLI/tests/FileLocksmithCLITests.cpp`, `src/modules/FileLocksmith/FileLocksmithCLI/tests/FileLocksmithCLIUnitTests.vcxproj` +208
  - **Observability** (132) — `.github/scripts/telemetry-pr-check.js`, `.github/workflows/telemetry-pr-check.yml` +130
  - **Release/versioning** (72) — `.github/skills/release-note-generation/LICENSE.txt`, `.github/skills/release-note-generation/SKILL.md` +70
  - **Persistence / storage engine** (36) — `src/modules/cmdpal/ext/Microsoft.CmdPal.Ext.Apps/Storage/EventHandler.cs`, `src/modules/cmdpal/ext/Microsoft.CmdPal.Ext.Apps/Storage/FileSystemWatcherWrapper.cs` +34
  - **File / blob storage** (30) — `src/modules/cmdpal/ext/Microsoft.CmdPal.Ext.Apps/Storage/EventHandler.cs`, `src/modules/cmdpal/ext/Microsoft.CmdPal.Ext.Apps/Storage/FileSystemWatcherWrapper.cs` +28
  - **Public contracts / interfaces** (24) — `src/modules/launcher/Plugins/Microsoft.Plugin.Uri/Interfaces/IUriParser.cs`, `src/modules/launcher/Plugins/Microsoft.Plugin.Uri/Interfaces/IUrlResolver.cs` +22
  - **Async jobs / workers** (11) — `src/Monaco/monacoSRC/min/vs/base/common/worker/simpleWorker.nls.de.js`, `src/Monaco/monacoSRC/min/vs/base/common/worker/simpleWorker.nls.es.js` +9
  - **CI pipeline** (8) — `.github/workflows/auto-label-issues.yml`, `.github/workflows/automatic-issue-deduplication.yml` +6
  - **Prompt templates** (7) — `.github/prompts/create-commit-title.prompt.md`, `.github/prompts/create-pr-summary.prompt.md` +5
  - **Rate limit / request guard** (6) — `src/modules/MouseUtils/MouseJumpUI/Helpers/ThrottledActionInvoker.cs`, `src/modules/PowerOCR/PowerOCR/Helpers/IThrottledActionInvoker.cs` +4
  - **Lint/format config** (3) — `src/.clang-format`, `src/.editorconfig` +1
  - **Dependency mgmt** (1) — `.github/dependabot.yml`
  - **Authorization / policy** (1) — `.github/policies/resourceManagement.yml`

**2dust/v2rayN** — 405 files
  - **Network privacy / transport** (15) — `v2rayN/ServiceLib.Tests/CoreConfig/V2ray/CoreConfigV2rayServiceTests.cs`, `v2rayN/ServiceLib.Tests/Fmt/WireguardFmtTests.cs` +13
  - **CI pipeline** (9) — `.github/workflows/build-all.yml`, `.github/workflows/build-linux.yml` +7
  - **Dependency mgmt** (1) — `.github/dependabot.yml`
  - **Lint/format config** (1) — `.editorconfig`

**jellyfin/jellyfin** — 2469 files
  - **Test harness** (331) — `tests/Directory.Build.props`, `tests/Jellyfin.Api.Tests/Auth/CustomAuthenticationHandlerTests.cs` +329
  - **Plugin / provider registry** (194) — `Emby.Server.Implementations/Plugins/PluginLoadContext.cs`, `Emby.Server.Implementations/Plugins/PluginManager.cs` +192
  - **Migrations** (151) — `Jellyfin.Server/Migrations/IAsyncMigrationRoutine.cs`, `Jellyfin.Server/Migrations/IDatabaseMigrationRoutine.cs` +149
  - **Realtime / pubsub** (56) — `Emby.Server.Implementations/HttpServer/WebSocketConnection.cs`, `Emby.Server.Implementations/HttpServer/WebSocketManager.cs` +54
  - **Async jobs / workers** (27) — `Emby.Server.Implementations/ScheduledTasks/Tasks/AudioNormalizationTask.cs`, `Emby.Server.Implementations/ScheduledTasks/Tasks/ChapterImagesTask.cs` +25
  - **CI pipeline** (15) — `.github/workflows/ci-codeql-analysis.yml`, `.github/workflows/ci-compat.yml` +13
  - **Persistence / storage engine** (15) — `MediaBrowser.Controller/Persistence/IChapterRepository.cs`, `MediaBrowser.Controller/Persistence/IItemCountService.cs` +13
  - **Input validation (request)** (12) — `Emby.Server.Implementations/Library/Validators/ArtistsPostScanTask.cs`, `Emby.Server.Implementations/Library/Validators/ArtistsValidator.cs` +10
  - **Public contracts / interfaces** (5) — `src/Jellyfin.Database/Jellyfin.Database.Implementations/Interfaces/IHasArtwork.cs`, `src/Jellyfin.Database/Jellyfin.Database.Implementations/Interfaces/IHasCompanies.cs` +3
  - **Rate limit / request guard** (2) — `MediaBrowser.Common/Extensions/RateLimitExceededException.cs`, `MediaBrowser.Controller/MediaEncoding/TranscodingThrottler.cs`
  - **Release/versioning** (1) — `.github/workflows/release-bump-version.yaml`
  - **Dependency mgmt** (1) — `.github/renovate.json`
  - **Lint/format config** (1) — `.editorconfig`
  - **Cache / ephemeral state** (1) — `src/Jellyfin.MediaEncoding.Hls/Cache/CacheDecorator.cs`
  - **File / blob storage** (1) — `src/Jellyfin.LiveTv/Listings/SchedulesDirectDtos/MultipartDto.cs`

**files-community/Files** — 2230 files
  - **Release/versioning** (247) — `src/Files.App/Assets/AppTiles/Release/BadgeLogo.scale-100.png`, `src/Files.App/Assets/AppTiles/Release/BadgeLogo.scale-125.png` +245
  - **File / blob storage** (118) — `src/Files.App.Controls/Storage/Data/BarShapes.cs`, `src/Files.App.Controls/Storage/Data/ThicknessCheck.cs` +116
  - **Persistence / storage engine** (87) — `src/Files.App.Controls/Storage/Data/BarShapes.cs`, `src/Files.App.Controls/Storage/Data/ThicknessCheck.cs` +85
  - **Public contracts / interfaces** (52) — `src/Files.App/Data/Contracts/IActionsSettingsService.cs`, `src/Files.App/Data/Contracts/IAddItemService.cs` +50
  - **Test harness** (45) — `tests/Files.App.UITests/App.xaml`, `tests/Files.App.UITests/App.xaml.cs` +43
  - **Plugin / provider registry** (29) — `src/Files.App/Extensions/DispatcherQueueExtensions.cs`, `src/Files.App/Extensions/Fractions.cs` +27
  - **CI pipeline** (6) — `.github/workflows/cd-sideload-preview.yml`, `.github/workflows/cd-sideload-stable.yml` +4
  - **Crypto / signing / keys** (5) — `src/Files.App/Data/Models/SignatureInfoItem.cs`, `src/Files.App/Utils/Signatures/DigitalSignaturesUtil.cs` +3
  - **Observability** (3) — `src/Files.App/Data/Items/ToolbarItemSettingsEntry.cs`, `src/Files.App/Utils/Logger/SentryLogger.cs` +1
  - **Dependency mgmt** (1) — `.github/dependabot.yml`
  - **Lint/format config** (1) — `.editorconfig`

**dotnet/aspnetcore** — 16917 files
  - **Test harness** (5818) — `src/Analyzers/Analyzers/test/CompilationFeatureDetectorTest.cs`, `src/Analyzers/Analyzers/test/ConfigureMethodVisitorTest.cs` +5816
  - **Input validation (request)** (103) — `src/Components/Web.JS/src/Validation/CoreValidators.ts`, `src/Components/Web.JS/src/Validation/DomScanner.ts` +101
  - **Realtime / pubsub** (57) — `src/Hosting/Hosting/src/Internal/HostingEventSource.cs`, `src/Hosting/TestHost/src/TestWebSocket.cs` +55
  - **Plugin / provider registry** (55) — `src/Analyzers/Analyzers/src/BuildServiceProviderAnalyzer.cs`, `src/DataProtection/DataProtection/src/KeyManagement/KeyEscrowServiceProviderExtensions.cs` +53
  - **Authorization / policy** (38) — `.github/policies/resourceManagement.yml`, `src/Middleware/OutputCaching/src/Policies/CompositePolicy.cs` +36
  - **Crypto / signing / keys** (34) — `src/Grpc/JsonTranscoding/src/Shared/X509CertificateHelpers.cs`, `src/Identity/Core/src/PasskeyAttestationContext.cs` +32
  - **Async jobs / workers** (29) — `.azure/pipelines/jobs/codesign-xplat.yml`, `.azure/pipelines/jobs/components-e2e-test-job.yml` +27
  - **Rate limit / request guard** (22) — `src/Middleware/RateLimiting/src/DefaultCombinedLease.cs`, `src/Middleware/RateLimiting/src/DefaultKeyType.cs` +20
  - **CI pipeline** (21) — `.github/workflows/backport.yml`, `.github/workflows/browsertesting-deps-update.lock.yml` +19
  - **Lint/format config** (16) — `.editorconfig`, `src/Components/Server/src/BlazorPack/.editorconfig` +14
  - **Migrations** (13) — `src/Identity/testassets/Identity.DefaultUI.WebSite/Data/Migrations/00000000000000_CreateIdentitySchema.Designer.cs`, `src/Identity/testassets/Identity.DefaultUI.WebSite/Data/Migrations/00000000000000_CreateIdentitySchema.cs` +11
  - **File / blob storage** (10) — `src/Http/Http.Extensions/src/HttpRequestMultipartExtensions.cs`, `src/Http/WebUtilities/perf/Microbenchmarks/MultipartReaderBenchmark.cs` +8
  - **Cache / ephemeral state** (8) — `src/Mvc/Mvc.TagHelpers/src/Cache/CacheTagKey.cs`, `src/Mvc/Mvc.TagHelpers/src/Cache/DistributedCacheTagHelperFormatter.cs` +6
  - **Code generation** (7) — `src/Grpc/JsonTranscoding/perf/Microsoft.AspNetCore.Grpc.Microbenchmarks/Proto/chat.proto`, `src/Grpc/JsonTranscoding/perf/Microsoft.AspNetCore.Grpc.Microbenchmarks/Proto/greet.proto` +5
  - **Public contracts / interfaces** (4) — `src/Middleware/ResponseCaching/src/Interfaces/IResponseCache.cs`, `src/Middleware/ResponseCaching/src/Interfaces/IResponseCacheEntry.cs` +2
  - **Dependency mgmt** (2) — `.azuredevops/dependabot.yml`, `.github/dependabot.yml`
  - **Observability** (2) — `src/Hosting/Hosting/src/Internal/HostingTelemetryHelpers.cs`, `src/Middleware/Diagnostics/src/DiagnosticsTelemetry.cs`
  - **Containerization** (1) — `.devcontainer/Dockerfile`
  - **Release/versioning** (1) — `src/SignalR/clients/ts/CHANGELOG.md`
  - **Logging** (1) — `src/Components/Web.JS/src/Platform/Logging/Logger.ts`
  - **Prompt templates** (1) — `.github/prompts/ApiReview.prompt.md`

**AvaloniaUI/Avalonia** — 5362 files
  - **Test harness** (1221) — `tests/Avalonia.Base.UnitTests/Animation/AnimatableTests.cs`, `tests/Avalonia.Base.UnitTests/Animation/AnimationIterationTests.cs` +1219
  - **File / blob storage** (37) — `src/Android/Avalonia.Android/Platform/Storage/AndroidStorageItem.cs`, `src/Android/Avalonia.Android/Platform/Storage/AndroidStorageProvider.cs` +35
  - **Persistence / storage engine** (37) — `src/Android/Avalonia.Android/Platform/Storage/AndroidStorageItem.cs`, `src/Android/Avalonia.Android/Platform/Storage/AndroidStorageProvider.cs` +35
  - **Plugin / provider registry** (21) — `src/Avalonia.Base/Data/Core/Plugins/AvaloniaPropertyAccessorPlugin.cs`, `src/Avalonia.Base/Data/Core/Plugins/BindingPlugins.cs` +19
  - **CI pipeline** (3) — `.github/workflows/CLA.yml`, `.github/workflows/api-diff.yml` +1
  - **Lint/format config** (3) — `.editorconfig`, `nukebuild/.editorconfig` +1
  - **Dependency mgmt** (1) — `.github/dependabot.yml`
  - **Input validation (request)** (1) — `src/Avalonia.Controls/Platform/PlatformRequestedDrawnDecoration.cs`
  - **Realtime / pubsub** (1) — `src/Avalonia.DesignerSupport/Remote/HtmlTransport/SimpleWebSocketHttpServer.cs`

**microsoft/semantic-kernel** — 5489 files
  - **Test harness** (751) — `dotnet/src/Agents/UnitTests/Test/AssertCollection.cs`, `dotnet/src/Agents/UnitTests/Test/FakeTokenCredential.cs` +749
  - **Plugin / provider registry** (335) — `dotnet/src/Agents/A2A/Extensions/AuthorRoleExtensions.cs`, `dotnet/src/Agents/Abstractions/Extensions/AgentDefinitionExtensions.cs` +333
  - **Model runtime / scheduler** (33) — `dotnet/src/Connectors/Connectors.AzureAIInference.UnitTests/Connectors.AzureAIInference.UnitTests.csproj`, `dotnet/src/Connectors/Connectors.AzureAIInference.UnitTests/Core/ChatClientCoreTests.cs` +31
  - **Lint/format config** (29) — `.editorconfig`, `dotnet/samples/.editorconfig` +27
  - **Shell completion** (29) — `dotnet/src/IntegrationTests/Connectors/HuggingFace/ChatCompletion/HuggingFaceChatCompletionTests.cs`, `dotnet/src/IntegrationTests/Connectors/MistralAI/ChatCompletion/MistralAIChatCompletionTests.cs` +27
  - **CI pipeline** (21) — `.github/workflows/close-inactive-issues.yml`, `.github/workflows/codeql-analysis.yml` +19
  - **Observability** (16) — `dotnet/src/Connectors/Connectors.AzureAIInference.UnitTests/Services/AzureAIInferenceChatCompletionServiceOpenTelemetryTests.cs`, `python/semantic_kernel/agents/runtime/core/telemetry/__init__.py` +14
  - **Public contracts / interfaces** (15) — `dotnet/src/Experimental/Process.IntegrationTestHost.Dapr/Contracts/ProcessStartRequest.cs`, `dotnet/src/Experimental/Process.Runtime.Dapr/Interfaces/IEventBuffer.cs` +13
  - **Prompt templates** (11) — `.github/upgrades/prompts/SemanticKernelToAgentFramework.md`, `dotnet/src/IntegrationTests/prompts/GenerateStory.yaml` +9
  - **Dependency mgmt** (8) — `.github/dependabot.yml`, `dotnet/samples/Demos/QualityCheck/python-server/requirements.txt` +6
  - **File / blob storage** (3) — `dotnet/src/Functions/Functions.UnitTests/OpenApi/TestPlugins/multipart-form-data.json`, `dotnet/src/Plugins/Plugins.Document/FileSystem/IFileSystemConnector.cs` +1
  - **Authorization / policy** (2) — `dotnet/src/InternalUtilities/azure/Policies/GeneratedActionPipelinePolicy.cs`, `dotnet/src/InternalUtilities/openai/Policies/GeneratedActionPipelinePolicy.cs`
  - **Crypto / signing / keys** (2) — `dotnet/src/Connectors/Connectors.Google.UnitTests/TestData/chat_function_with_thought_signature_response.json`, `dotnet/src/Connectors/Connectors.Google.UnitTests/TestData/chat_text_with_thought_signature_response.json`
  - **Logging** (2) — `python/semantic_kernel/agents/runtime/core/logging.py`, `python/semantic_kernel/utils/logging.py`
  - **Containerization** (1) — `dotnet/samples/Demos/QualityCheck/python-server/docker-compose.yml`
  - **Pre-commit hooks** (1) — `python/.pre-commit-config.yaml`
  - **Input validation (request)** (1) — `python/semantic_kernel/kernel_pydantic.py`
  - **Env/config validation** (1) — `python/.env.example`
  - **Code generation** (1) — `dotnet/src/Functions/Functions.UnitTests/Grpc/Protobuf/TestPlugins/protoV3.proto`

**Devolutions/UniGetUI** — 1117 files
  - **i18n / localization** (18) — `scripts/translation/Export-TranslationBoundaryAlignment.ps1`, `scripts/translation/Export-TranslationKeyDiff.ps1` +16
  - **Observability** (11) — `src/UniGetUI.Avalonia/Views/DialogPages/TelemetryDialog.axaml`, `src/UniGetUI.Avalonia/Views/DialogPages/TelemetryDialog.axaml.cs` +9
  - **Public contracts / interfaces** (9) — `src/ExternalLibraries.FilePickers/Interfaces/FileOpenDialog.cs`, `src/ExternalLibraries.FilePickers/Interfaces/FileSaveDialog.cs` +7
  - **CI pipeline** (5) — `.github/workflows/build-release.yml`, `.github/workflows/cli-headless-e2e.yml` +3
  - **Dependency mgmt** (2) — `.github/dependabot.yml`, `.github/renovate.json`
  - **Lint/format config** (1) — `src/.editorconfig`
  - **Test harness** (1) — `testing/productinfo.unigetui.test.json`

**QL-Win/QuickLook** — 982 files
  - **Plugin / provider registry** (13) — `QuickLook.Plugin/QuickLook.Plugin.ImageViewer/AnimatedImage/Providers/APngProvider.cs`, `QuickLook.Plugin/QuickLook.Plugin.ImageViewer/AnimatedImage/Providers/ClipProvider.cs` +11
  - **CI pipeline** (1) — `.github/workflows/msbuild.yml`
  - **Release/versioning** (1) — `CHANGELOG.md`
  - **Code generation** (1) — `QuickLook.Plugin/QuickLook.Plugin.ImageViewer/Webview/Svga/svga.proto`

**dotnet/maui** — 25253 files
  - **Test harness** (16816) — `.github/scripts/tests/Test-EstablishBrokenBaseline.ps1`, `.github/scripts/tests/Test-FindRegressionRisks.ps1` +16814
  - **Plugin / provider registry** (156) — `src/BlazorWebView/src/Maui/Extensions/UriExtensions.cs`, `src/Compatibility/Core/src/Android/Extensions/AccessibilityExtensions.cs` +154
  - **CI pipeline** (29) — `.github/workflows/agentic-labeler.lock.yml`, `.github/workflows/agentics-maintenance.yml` +27
  - **Async jobs / workers** (24) — `eng/common/core-templates/job/job.yml`, `eng/common/core-templates/job/onelocbuild.yml` +22
  - **Authorization / policy** (13) — `.azuredevops/policies/branchClassification.yml`, `.github/policies/resourceManagement.yml` +11
  - **File / blob storage** (10) — `src/Essentials/src/FileSystem/FileSystem.android.cs`, `src/Essentials/src/FileSystem/FileSystem.ios.cs` +8
  - **Lint/format config** (4) — `.editorconfig`, `src/AI/src/AppleNative/EssentialsAI/.editorconfig` +2
  - **Dependency mgmt** (2) — `.azuredevops/dependabot.yml`, `.github/dependabot.yml`
  - **Public contracts / interfaces** (2) — `src/Compatibility/Core/src/WPF/Interfaces/IContentLoader.cs`, `src/Compatibility/Core/src/WPF/Interfaces/IFormsNavigation.cs`
  - **Prompt templates** (2) — `.github/prompts/contributors.json`, `.github/prompts/maui-release-notes.prompt.md`

### Go


**ollama/ollama** — 1229 files
  - **Test harness** (282) — `anthropic/anthropic_test.go`, `api/client_test.go` +280
  - **CLI option parsing** (96) — `app/cmd/app/AppDelegate.h`, `app/cmd/app/app.go` +94
  - **Model runtime / scheduler** (23) — `llm/exit_status.go`, `llm/exit_status_other.go` +21
  - **Cache / ephemeral state** (17) — `server/internal/cache/blob/cache.go`, `server/internal/cache/blob/cache_test.go` +15
  - **Model registry / pull** (9) — `cmd/launch/registry.go`, `server/internal/client/ollama/registry.go` +7
  - **File / blob storage** (8) — `server/internal/cache/blob/cache.go`, `server/internal/cache/blob/cache_test.go` +6
  - **CI pipeline** (5) — `.github/workflows/latest.yaml`, `.github/workflows/release.yaml` +3
  - **Routing / HTTP routes** (5) — `app/ui/app/src/routes/__root.tsx`, `app/ui/app/src/routes/c.$chatId.tsx` +3
  - **Lint/format config** (4) — `.golangci.yaml`, `app/ui/app/.prettierignore` +2
  - **LLM/API-compat adapter** (4) — `anthropic/anthropic.go`, `middleware/anthropic.go` +2
  - **Authentication** (3) — `app/auth/connect.go`, `auth/auth.go` +1
  - **Authorization / policy** (3) — `app/tools/cloud_policy.go`, `app/tools/url_policy.go` +1
  - **Code generation** (2) — `app/ui/app/codegen/gotypes.gen.ts`, `convert/sentencepiece_model.proto`
  - **Containerization** (1) — `Dockerfile`
  - **Dependency mgmt** (1) — `go.mod`

**golang/go** — 15563 files
  - **Test harness** (5586) — `misc/go_android_exec/exitcode_test.go`, `src/archive/tar/example_test.go` +5584
  - **CLI option parsing** (3334) — `src/cmd/README.vendor`, `src/cmd/addr2line/addr2line_test.go` +3332
  - **Crypto / signing / keys** (1220) — `src/cmd/compile/internal/types2/signature.go`, `src/crypto/aes/aes.go` +1218
  - **Dependency mgmt** (23) — `misc/go.mod`, `src/cmd/compile/internal/ssa/_gen/go.mod` +21
  - **Authentication** (16) — `src/cmd/go/internal/auth/auth.go`, `src/cmd/go/internal/auth/auth_test.go` +14
  - **DB / ORM connection** (16) — `src/database/sql/closemu.go`, `src/database/sql/closemu_test.go` +14
  - **File / blob storage** (15) — `src/cmd/compile/internal/types2/gcsizes.go`, `src/go/types/gcsizes.go` +13
  - **Observability** (12) — `.github/ISSUE_TEMPLATE/12-telemetry.yml`, `src/cmd/go/internal/telemetrycmd/telemetry.go` +10
  - **Model registry / pull** (7) — `src/internal/syscall/windows/registry/export_test.go`, `src/internal/syscall/windows/registry/key.go` +5
  - **Cache / ephemeral state** (6) — `src/cmd/go/internal/cache/cache.go`, `src/cmd/go/internal/cache/cache_test.go` +4
  - **Logging** (6) — `src/internal/testlog/log.go`, `src/log/log.go` +4
  - **Model runtime / scheduler** (4) — `src/cmd/compile/internal/staticinit/sched.go`, `src/cmd/link/testdata/linkname/sched.go` +2
  - **Containerization** (2) — `src/crypto/internal/boring/Dockerfile`, `src/crypto/internal/fips140/nistec/fiat/Dockerfile`
  - **Lint/format config** (2) — `src/cmd/vendor/golang.org/x/telemetry/.eslintrc.json`, `src/cmd/vendor/golang.org/x/telemetry/.prettierrc.json`
  - **Authorization / policy** (2) — `src/internal/gate/gate.go`, `src/internal/gate/gate_test.go`
  - **Input validation (request)** (2) — `src/errors/join.go`, `src/errors/join_test.go`
  - **Network privacy / transport** (2) — `src/cmd/go/internal/modfetch/proxy.go`, `src/net/http/socks_bundle.go`

**kubernetes/kubernetes** — 30448 files
  - **Test harness** (10944) — `LICENSES/vendor/github.com/container-storage-interface/spec/LICENSE`, `cluster/gce/gci/apiserver_etcd_test.go` +10942
  - **CLI option parsing** (1801) — `cmd/OWNERS`, `cmd/clicheck/OWNERS` +1799
  - **Authorization / policy** (724) — `cluster/addons/fluentd-gcp/scaler-rbac.yaml`, `cluster/addons/kube-network-policies/kube-network-policies-rbac.yaml` +722
  - **Model registry / pull** (528) — `pkg/quota/v1/evaluator/core/registry.go`, `pkg/quota/v1/install/registry.go` +526
  - **File / blob storage** (500) — `pkg/api/storage/util.go`, `pkg/api/storage/util_test.go` +498
  - **Persistence / storage engine** (490) — `pkg/api/storage/util.go`, `pkg/api/storage/util_test.go` +488
  - **Plugin / provider registry** (372) — `cluster/addons/OWNERS`, `cluster/addons/README.md` +370
  - **Replication / clustering** (255) — `cluster/OWNERS`, `cluster/README.md` +253
  - **Input validation (request)** (228) — `cmd/kubeadm/app/apis/kubeadm/validation/util_unix.go`, `cmd/kubeadm/app/apis/kubeadm/validation/util_windows.go` +226
  - **Network privacy / transport** (205) — `cluster/addons/metadata-proxy/OWNERS`, `cluster/addons/metadata-proxy/README.md` +203
  - **Cache / ephemeral state** (121) — `pkg/controller/devicetainteviction/uid_cache.go`, `pkg/controller/garbagecollector/uid_cache.go` +119
  - **Code generation** (98) — `hack/install-protoc.sh`, `hack/lib/protoc.sh` +96
  - **Authentication** (82) — `cmd/kubelet/app/auth.go`, `hack/testdata/auth/testuser.csr` +80
  - **Release/versioning** (62) — `CHANGELOG.md`, `CHANGELOG/CHANGELOG-1.10.md` +60
  - **Async jobs / workers** (51) — `pkg/api/job/warnings.go`, `pkg/api/job/warnings_test.go` +49
  - **Containerization** (43) — `build/pause/Dockerfile`, `build/server-image/Dockerfile` +41
  - **Dependency mgmt** (41) — `go.mod`, `hack/tools/go.mod` +39
  - **Lint/format config** (35) — `hack/tools/golangci-lint/sorted/example.golangci.yml`, `vendor/cyphar.com/go-pathrs/.golangci.yml` +33
  - **Rate limit / request guard** (35) — `pkg/controller/nodelifecycle/scheduler/rate_limited_queue.go`, `pkg/controller/nodelifecycle/scheduler/rate_limited_queue_test.go` +33
  - **i18n / localization** (27) — `staging/src/k8s.io/kubectl/pkg/util/i18n/i18n.go`, `staging/src/k8s.io/kubectl/pkg/util/i18n/i18n_test.go` +25
  - **Crypto / signing / keys** (26) — `cmd/kubeadm/app/util/crypto/crypto.go`, `cmd/kubeadm/app/util/crypto/crypto_test.go` +24
  - **Routing / HTTP routes** (23) — `pkg/routes/OWNERS`, `pkg/routes/const_other.go` +21
  - **Realtime / pubsub** (13) — `pkg/kubelet/server/server_websocket_test.go`, `staging/src/k8s.io/apiserver/pkg/authentication/request/websocket/protocol.go` +11
  - **Shell completion** (4) — `staging/src/k8s.io/kubectl/pkg/cmd/completion/completion.go`, `staging/src/k8s.io/kubectl/pkg/cmd/completion/completion_test.go` +2
  - **Logging** (2) — `pkg/registry/core/pod/rest/log.go`, `staging/src/k8s.io/apiserver/pkg/storage/etcd3/logger.go`
  - **Public contracts / interfaces** (2) — `staging/src/k8s.io/code-generator/cmd/deepcopy-gen/output_tests/interfaces/doc.go`, `staging/src/k8s.io/code-generator/cmd/deepcopy-gen/output_tests/interfaces/zz_generated.deepcopy.go`
  - **Model runtime / scheduler** (2) — `cmd/kube-scheduler/scheduler.go`, `pkg/scheduler/scheduler.go`
  - **Observability** (1) — `staging/src/k8s.io/client-go/applyconfigurations/meta/v1/managedfieldsentry.go`

**gohugoio/hugo** — 2582 files
  - **Test harness** (381) — `bufferpool/bufpool_test.go`, `cache/dynacache/dynacache_test.go` +379
  - **Cache / ephemeral state** (17) — `cache/docs.go`, `cache/dynacache/dynacache.go` +15
  - **i18n / localization** (9) — `create/skeletons/project/i18n/.gitkeep`, `create/skeletons/theme/i18n/.gitkeep` +7
  - **CI pipeline** (6) — `.github/workflows/image.yml`, `.github/workflows/stale.yml` +4
  - **Dependency mgmt** (5) — `.github/dependabot.yml`, `docs/go.mod` +3
  - **Lint/format config** (4) — `.prettierignore`, `docs/.editorconfig` +2
  - **Crypto / signing / keys** (3) — `tpl/crypto/crypto.go`, `tpl/crypto/crypto_test.go` +1
  - **Code generation** (3) — `codegen/methods.go`, `codegen/methods2_test.go` +1
  - **Plugin / provider registry** (2) — `markup/goldmark/internal/extensions/attributes/attributes.go`, `markup/goldmark/internal/extensions/attributes/attributes_integration_test.go`
  - **Containerization** (1) — `Dockerfile`
  - **Async jobs / workers** (1) — `common/tasks/tasks.go`
  - **Logging** (1) — `common/loggers/logger.go`
  - **CLI option parsing** (1) — `internal/js/esbuild/options.go`
  - **Model registry / pull** (1) — `tpl/internal/templatefuncsRegistry.go`

**syncthing/syncthing** — 942 files
  - **Test harness** (167) — `cmd/infra/stcrashreceiver/sentry_test.go`, `cmd/infra/strelaypoolsrv/main_test.go` +165
  - **CLI option parsing** (91) — `cmd/.gitignore`, `cmd/dev/stcompdirs/main.go` +89
  - **i18n / localization** (60) — `gui/default/assets/lang/README.txt`, `gui/default/assets/lang/lang-ar.json` +58
  - **DB / ORM connection** (55) — `internal/db/counts.go`, `internal/db/interface.go` +53
  - **CI pipeline** (8) — `.github/workflows/build-infra-dockers.yaml`, `.github/workflows/build-syncthing.yaml` +6
  - **Code generation** (7) — `buf.gen.yaml`, `buf.yaml` +5
  - **Migrations** (4) — `internal/db/sqlite/sql/migrations/folder/02-remove-invalid.sql`, `internal/db/sqlite/sql/migrations/folder/03-drop-bad-invalid.sql` +2
  - **Model registry / pull** (3) — `lib/connections/registry/registry.go`, `lib/connections/registry/registry_test.go` +1
  - **Dependency mgmt** (2) — `.github/dependabot.yml`, `go.mod`
  - **File / blob storage** (2) — `internal/blob/interface.go`, `internal/blob/s3/s3.go`
  - **Rate limit / request guard** (2) — `lib/connections/limiter.go`, `lib/connections/limiter_test.go`
  - **Crypto / signing / keys** (2) — `lib/signature/signature.go`, `lib/signature/signature_test.go`
  - **Observability** (2) — `cmd/infra/stcrashreceiver/sentry.go`, `cmd/infra/stcrashreceiver/sentry_test.go`
  - **Containerization** (1) — `Dockerfile`
  - **Release/versioning** (1) — `.github/workflows/release-syncthing.yaml`
  - **Lint/format config** (1) — `.golangci.yml`

**junegunn/fzf** — 151 files
  - **Test harness** (36) — `src/algo/algo_test.go`, `src/algo/indexbyte2_test.go` +34
  - **CI pipeline** (8) — `.github/workflows/codeql-analysis.yml`, `.github/workflows/depsreview.yaml` +6
  - **Shell completion** (4) — `shell/completion.bash`, `shell/completion.fish` +2
  - **Release/versioning** (3) — `.goreleaser.yml`, `CHANGELOG.md` +1
  - **Dependency mgmt** (3) — `.github/dependabot.yml`, `Gemfile` +1
  - **Man pages** (2) — `man/man1/fzf-tmux.1`, `man/man1/fzf.1`
  - **Containerization** (1) — `Dockerfile`
  - **Lint/format config** (1) — `.editorconfig`
  - **Network privacy / transport** (1) — `src/proxy.go`
  - **CLI option parsing** (1) — `src/options.go`

**jesseduffield/lazygit** — 2187 files
  - **Test harness** (583) — `pkg/cheatsheet/generate_test.go`, `pkg/commands/direnv/direnv_test.go` +581
  - **i18n / localization** (13) — `cmd/i18n/main.go`, `pkg/i18n/english.go` +11
  - **Lint/format config** (11) — `.editorconfig`, `.golangci.yml` +9
  - **Release/versioning** (7) — `.goreleaser.yml`, `vendor/github.com/clipperhouse/displaywidth/CHANGELOG.md` +5
  - **CI pipeline** (6) — `.github/workflows/check-required-label.yml`, `.github/workflows/ci.yml` +4
  - **Containerization** (4) — `.devcontainer/Dockerfile`, `Dockerfile` +2
  - **Async jobs / workers** (4) — `pkg/tasks/async_handler.go`, `pkg/tasks/async_handler_test.go` +2
  - **CLI option parsing** (3) — `cmd/i18n/main.go`, `cmd/integration_test/main.go` +1
  - **Dependency mgmt** (2) — `.github/dependabot.yml`, `go.mod`
  - **Logging** (1) — `pkg/fakes/log.go`

**caddyserver/caddy** — 615 files
  - **Test harness** (98) — `admin_test.go`, `caddy_test.go` +96
  - **CLI option parsing** (15) — `caddyconfig/httpcaddyfile/options.go`, `cmd/caddy/main.go` +13
  - **CI pipeline** (9) — `.github/workflows/ai.yml`, `.github/workflows/auto-release-pr.yml` +7
  - **Release/versioning** (3) — `.github/workflows/release-proposal.yml`, `.github/workflows/release_published.yml` +1
  - **Authorization / policy** (3) — `modules/caddyhttp/proxyprotocol/policy.go`, `modules/caddypki/acmeserver/policy.go` +1
  - **Dependency mgmt** (2) — `.github/dependabot.yml`, `go.mod`
  - **Lint/format config** (2) — `.editorconfig`, `.golangci.yml`
  - **Pre-commit hooks** (1) — `.pre-commit-config.yaml`
  - **Crypto / signing / keys** (1) — `cmd/x509rootsfallback.go`
  - **Routing / HTTP routes** (1) — `modules/caddyhttp/routes.go`

**moby/moby** — 12558 files
  - **Test harness** (826) — `.github/workflows/.test.yml`, `api/pkg/authconfig/authconfig_test.go` +824
  - **Replication / clustering** (65) — `api/types/volume/cluster_volume.go`, `daemon/cluster.go` +63
  - **Lint/format config** (58) — `.golangci.yml`, `man/vendor/github.com/cpuguy83/go-md2man/v2/.golangci.yml` +56
  - **Release/versioning** (50) — `api/docs/CHANGELOG.md`, `project/RELEASE-PROCESS.md` +48
  - **CLI option parsing** (39) — `cmd/docker-proxy/main_linux.go`, `cmd/docker-proxy/network_proxy_linux_test.go` +37
  - **Model registry / pull** (26) — `api/types/registry/auth_response.go`, `api/types/registry/authconfig.go` +24
  - **Containerization** (22) — `Dockerfile`, `api/Dockerfile` +20
  - **Plugin / provider registry** (19) — `pkg/plugins/client.go`, `pkg/plugins/client_test.go` +17
  - **CI pipeline** (17) — `.github/workflows/.dco.yml`, `.github/workflows/.test-unit.yml` +15
  - **Network privacy / transport** (12) — `cmd/docker-proxy/main_linux.go`, `cmd/docker-proxy/network_proxy_linux_test.go` +10
  - **Observability** (8) — `contrib/otel/README.md`, `contrib/otel/compose.yaml` +6
  - **Async jobs / workers** (7) — `daemon/internal/builder-next/worker/containerdworker.go`, `daemon/internal/builder-next/worker/gc.go` +5
  - **Dependency mgmt** (6) — `api/go.mod`, `client/go.mod` +4
  - **Cache / ephemeral state** (6) — `daemon/internal/image/cache/cache.go`, `daemon/internal/image/cache/compare.go` +4
  - **Code generation** (6) — `daemon/cluster/convert/netextra/extra.proto`, `daemon/cluster/internal/runtime/plugin.proto` +4
  - **Input validation (request)** (5) — `daemon/libnetwork/drivers/overlay/joinleave.go`, `daemon/libnetwork/drivers/windows/overlay/joinleave_windows.go` +3
  - **Authorization / policy** (4) — `integration/plugin/authz/authz_plugin_test.go`, `integration/plugin/authz/authz_plugin_v2_test.go` +2
  - **File / blob storage** (4) — `api/types/storage/driver_data.go`, `api/types/storage/root_f_s_storage.go` +2
  - **Persistence / storage engine** (4) — `api/types/storage/driver_data.go`, `api/types/storage/root_f_s_storage.go` +2
  - **Authentication** (3) — `client/auth.go`, `daemon/auth.go` +1
  - **Crypto / signing / keys** (2) — `api/types/image/signature_identity.go`, `api/types/image/signature_timestamp.go`
  - **Logging** (2) — `daemon/logger/logger.go`, `internal/testutil/logger.go`
  - **Migrations** (1) — `daemon/containerd/migration/migration.go`
  - **Routing / HTTP routes** (1) — `daemon/server/router/router.go`

### C


**torvalds/linux** — 67872 files *(tree truncated)*
  - **Crypto / signing / keys** (1081) — `Documentation/crypto/api-aead.rst`, `Documentation/crypto/api-akcipher.rst` +1079
  - **i18n / localization** (559) — `Documentation/translations/index.rst`, `Documentation/translations/it_IT/RCU/index.rst` +557
  - **Test harness** (239) — `Documentation/admin-guide/cgroup-v1/memcg_test.rst`, `arch/mips/kernel/spinlock_test.c` +237
  - **File / blob storage** (59) — `Documentation/arch/arm64/gcs.rst`, `arch/arm/boot/dts/allwinner/sun8i-s3-elimo-impetus.dtsi` +57
  - **Persistence / storage engine** (49) — `drivers/usb/storage/Kconfig`, `drivers/usb/storage/Makefile` +47
  - **Network privacy / transport** (44) — `Documentation/devicetree/bindings/i2c/google,cros-ec-i2c-tunnel.yaml`, `Documentation/devicetree/bindings/mailbox/ti,secure-proxy.yaml` +42
  - **Cache / ephemeral state** (20) — `Documentation/admin-guide/mm/damon/lru_sort.rst`, `Documentation/devicetree/bindings/cache/andestech,ax45mp-cache.yaml` +18
  - **Config-file parser** (19) — `arch/arm64/kvm/config.c`, `arch/m68k/amiga/config.c` +17
  - **Observability** (15) — `Documentation/ABI/testing/debugfs-driver-qat_telemetry`, `arch/x86/include/asm/intel_telemetry.h` +13
  - **Rate limit / request guard** (9) — `Documentation/admin-guide/thermal/intel_thermal_throttle.rst`, `block/blk-throttle.c` +7
  - **Async jobs / workers** (6) — `Documentation/trace/rv/linear_temporal_logic.rst`, `drivers/staging/media/atomisp/pci/runtime/queue/interface/ia_css_queue.h` +4
  - **Lint/format config** (4) — `.clang-format`, `.editorconfig` +2
  - **Payment / billing** (3) — `drivers/md/dm-stripe.c`, `fs/btrfs/raid-stripe-tree.c` +1
  - **Release/versioning** (1) — `Documentation/arch/arm/vfp/release-notes.rst`
  - **Dependency mgmt** (1) — `Documentation/sphinx/requirements.txt`
  - **Input validation (request)** (1) — `drivers/net/wireless/marvell/mwifiex/join.c`
  - **Code generation** (1) — `Documentation/devicetree/bindings/regulator/st,stm32-vrefbuf.yaml`

**netdata/netdata** — 6458 files
  - **Test harness** (362) — `netdata.spec.in`, `packaging/build_package_install_test.sh` +360
  - **DB / ORM connection** (135) — `src/database/CONFIGURATION.md`, `src/database/README.md` +133
  - **Realtime / pubsub** (64) — `src/aclk/mqtt_websockets/README.md`, `src/aclk/mqtt_websockets/aclk_mqtt_workers.h` +62
  - **Observability** (51) — `packaging/cmake/Modules/NetdataSentry.cmake`, `src/crates/netdata-otel/otel-plugin/Cargo.toml` +49
  - **Dependency mgmt** (27) — `.github/dependabot.yml`, `.github/scripts/modules/requirements.txt` +25
  - **Network privacy / transport** (27) — `src/collectors/python.d.plugin/python_modules/urllib3/contrib/socks.py`, `src/go/plugin/go.d/collector/prometheus/integrations/clash.md` +25
  - **CI pipeline** (22) — `.github/workflows/add-to-project.yml`, `.github/workflows/build.yml` +20
  - **Cache / ephemeral state** (20) — `src/go/plugin/go.d/collector/memcached/README.md`, `src/go/plugin/go.d/collector/memcached/charts.go` +18
  - **Async jobs / workers** (20) — `packaging/makeself/jobs/00-prepare-destination.install.sh`, `packaging/makeself/jobs/10-libucontext.install.sh` +18
  - **Model registry / pull** (18) — `src/crates/journal-registry/src/registry/error.rs`, `src/crates/journal-registry/src/registry/mod.rs` +16
  - **Crypto / signing / keys** (16) — `src/go/plugin/go.d/collector/x509check/README.md`, `src/go/plugin/go.d/collector/x509check/charts.go` +14
  - **Replication / clustering** (15) — `src/go/plugin/go.d/collector/elasticsearch/testdata/v8.4.2/cluster_health.json`, `src/go/plugin/go.d/collector/elasticsearch/testdata/v8.4.2/cluster_stats.json` +13
  - **Rate limit / request guard** (4) — `src/go/plugin/go.d/collector/prometheus/integrations/github_api_rate_limit.md`, `src/go/plugin/go.d/collector/vsphere/scrape/throttled_caller.go` +2
  - **CLI option parsing** (4) — `src/go/cmd/godplugin/main.go`, `src/go/cmd/ibmdplugin/main.go` +2
  - **Containerization** (3) — `Dockerfile`, `packaging/docker/Dockerfile` +1
  - **Lint/format config** (3) — `.clang-format`, `.flake8` +1
  - **Release/versioning** (2) — `CHANGELOG.md`, `src/go/otel-collector/release-config.yaml.in`
  - **Authentication** (2) — `src/go/plugin/go.d/collector/ceph/auth.go`, `src/go/plugin/go.d/collector/pihole/auth.go`
  - **Code generation** (2) — `packaging/windows/protoc.bat`, `src/exporting/prometheus/remote_write/remote_write.proto`
  - **Config-file parser** (2) — `src/go/plugin/go.d/config/go.d.conf`, `src/go/plugin/ibm.d/config/ibm.d.conf`
  - **Shell completion** (2) — `src/libnetdata/completion/completion.c`, `src/libnetdata/completion/completion.h`
  - **File / blob storage** (1) — `src/go/plugin/go.d/config/go.d/snmp.profiles/default/raritan-dominion.yaml`
  - **Logging** (1) — `src/go/logger/logger.go`

**redis/redis** — 1813 files
  - **Test harness** (557) — `deps/jemalloc/test/analyze/prof_bias.c`, `deps/jemalloc/test/analyze/rand.c` +555
  - **CI pipeline** (12) — `.github/workflows/ci.yml`, `.github/workflows/codecov.yml` +10
  - **Replication / clustering** (11) — `src/cluster.c`, `src/cluster.h` +9
  - **Realtime / pubsub** (8) — `src/commands/pubsub-channels.json`, `src/commands/pubsub-help.json` +6
  - **Release/versioning** (4) — `00-RELEASENOTES`, `deps/hiredis/.github/release-drafter-config.yml` +2
  - **Dependency mgmt** (3) — `.codespell/requirements.txt`, `.github/dependabot.yml` +1
  - **Cache / ephemeral state** (3) — `utils/lru/README`, `utils/lru/lfu-simulation.c` +1
  - **Persistence / storage engine** (2) — `src/aof.c`, `src/rdb.c`
  - **Lint/format config** (1) — `deps/jemalloc/.clang-format`
  - **Config-file parser** (1) — `src/config.c`

**obsproject/obs-studio** — 5171 files
  - **Plugin / provider registry** (3131) — `plugins/CMakeLists.txt`, `plugins/aja-output-ui/AJAOutputUI.cpp` +3129
  - **i18n / localization** (2415) — `frontend/data/locale/af-ZA.ini`, `frontend/data/locale/an-ES.ini` +2413
  - **Test harness** (182) — `deps/w32-pthreads/tests/Bmakefile`, `deps/w32-pthreads/tests/ChangeLog` +180
  - **Lint/format config** (15) — `.clang-format`, `.editorconfig` +13
  - **CI pipeline** (9) — `.github/workflows/analyze-project.yaml`, `.github/workflows/build-project.yaml` +7
  - **Dependency mgmt** (1) — `docs/sphinx/requirements.txt`
  - **Realtime / pubsub** (1) — `cmake/finders/FindWebsocketpp.cmake`
  - **Rate limit / request guard** (1) — `plugins/obs-filters/limiter-filter.c`

**FFmpeg/FFmpeg** — 10430 files
  - **Test harness** (5311) — `libavcodec/tests/.gitignore`, `libavcodec/tests/aarch64/dct.c` +5309
  - **Crypto / signing / keys** (3) — `libavfilter/signature.h`, `libavfilter/signature_lookup.c` +1
  - **CI pipeline** (1) — `tests/checkasm/ext/.github/workflows/build.yml`
  - **Lint/format config** (1) — `tests/checkasm/ext/.clang-format`
  - **Rate limit / request guard** (1) — `libavfilter/limiter.h`

**tmux/tmux** — 326 files
  - **Config-file parser** (21) — `regress/conf/01840240e807e837dbf76d85b4b938de.conf`, `regress/conf/21867280ff7e99631046f9cc669b80d2.conf` +19
  - **CI pipeline** (1) — `.github/workflows/lock.yml`

**curl/curl** — 4344 files
  - **Test harness** (2547) — `docs/tests/CI.md`, `docs/tests/FILEFORMAT.md` +2545
  - **CI pipeline** (16) — `.github/workflows/appveyor-status.yml`, `.github/workflows/checkdocs.yml` +14
  - **Network privacy / transport** (10) — `lib/cf-h1-proxy.c`, `lib/cf-h1-proxy.h` +8
  - **Dependency mgmt** (5) — `.github/dependabot.yml`, `.github/scripts/requirements.txt` +3
  - **Release/versioning** (3) — `docs/RELEASE-PROCEDURE.md`, `scripts/release-notes.pl` +1
  - **Realtime / pubsub** (3) — `include/curl/websockets.h`, `lib/mqtt.c` +1
  - **Rate limit / request guard** (2) — `lib/ratelimit.c`, `lib/ratelimit.h`
  - **Crypto / signing / keys** (2) — `lib/vtls/x509asn1.c`, `lib/vtls/x509asn1.h`
  - **Containerization** (1) — `Dockerfile`
  - **Lint/format config** (1) — `.editorconfig`

**php/php-src** — 26602 files
  - **Test harness** (23468) — `Zend/tests/67468.phpt`, `Zend/tests/ArrayAccess/ArrayAccess_indirect_append.phpt` +23466
  - **Public contracts / interfaces** (178) — `ext/lexbor/lexbor/dom/interfaces/attr.c`, `ext/lexbor/lexbor/dom/interfaces/attr.h` +176
  - **CI pipeline** (13) — `.github/workflows/close-needs-feedback.yml`, `.github/workflows/close-stale-feature-requests.yml` +11
  - **i18n / localization** (7) — `ext/intl/locale/locale.cpp`, `ext/intl/locale/locale.h` +5
  - **Crypto / signing / keys** (4) — `ext/sodium/libsodium.c`, `ext/sodium/libsodium.stub.php` +2
  - **Model runtime / scheduler** (3) — `Zend/Optimizer/zend_inference.c`, `Zend/Optimizer/zend_inference.h` +1
  - **Containerization** (1) — `benchmark/docker-compose.yml`
  - **Release/versioning** (1) — `docs/release-process.md`
  - **Dependency mgmt** (1) — `docs/requirements.txt`
  - **Lint/format config** (1) — `.editorconfig`

**mpv-player/mpv** — 923 files
  - **Test harness** (50) — `test/chmap.c`, `test/codepoint_width.c` +48
  - **CI pipeline** (6) — `.github/workflows/build.yml`, `.github/workflows/cleanup_caches.yml` +4
  - **Dependency mgmt** (2) — `.github/dependabot.yml`, `pyproject.toml`
  - **Lint/format config** (2) — `.editorconfig`, `.editorconfig-checker.json`
  - **Release/versioning** (1) — `DOCS/release-policy.md`
  - **Pre-commit hooks** (1) — `.pre-commit-config.yaml`

**jqlang/jq** — 399 files
  - **Test harness** (50) — `src/jq_test.c`, `tests/base64.test` +48
  - **CI pipeline** (7) — `.github/workflows/ci.yml`, `.github/workflows/decnum.yml` +5
  - **Dependency mgmt** (2) — `.github/dependabot.yml`, `docs/Pipfile`
  - **Containerization** (1) — `Dockerfile`

### Rust


**ultraworkers/claw-code** — 386 files
  - **Test harness** (20) — `rust/crates/api/tests/client_integration.rs`, `rust/crates/api/tests/openai_compat_integration.rs` +18
  - **Plugin / provider registry** (14) — `rust/crates/api/src/providers/anthropic.rs`, `rust/crates/api/src/providers/mod.rs` +12
  - **Dependency mgmt** (12) — `rust/Cargo.toml`, `rust/crates/api/Cargo.toml` +10
  - **CI pipeline** (3) — `.github/workflows/release.yml`, `.github/workflows/rust-ci.yml` +1
  - **Containerization** (2) — `docker-compose.yml`, `rust/crates/claw-rag-service/Dockerfile`
  - **Observability** (2) — `rust/crates/telemetry/Cargo.toml`, `rust/crates/telemetry/src/lib.rs`
  - **Migrations** (1) — `src/migrations/__init__.py`

**rust-lang/rust** — 60025 files
  - **Test harness** (50479) — `compiler/rustc_codegen_gcc/build_system/src/abi_test.rs`, `compiler/rustc_codegen_gcc/tests/compile/asm_nul_byte.rs` +50477
  - **Lint/format config** (1985) — `.clang-format`, `.editorconfig` +1983
  - **Dependency mgmt** (370) — `Cargo.toml`, `compiler/rustc/Cargo.toml` +368
  - **Containerization** (114) — `library/compiler-builtins/ci/docker/aarch64-unknown-linux-gnu/Dockerfile`, `library/compiler-builtins/ci/docker/arm-unknown-linux-gnueabi/Dockerfile` +112
  - **Shell completion** (59) — `src/etc/completions/x.fish`, `src/etc/completions/x.ps1` +57
  - **CI pipeline** (52) — `.github/workflows/ci.yml`, `.github/workflows/dependencies.yml` +50
  - **Input validation (request)** (34) — `compiler/rustc_thread_pool/src/join/mod.rs`, `compiler/rustc_thread_pool/src/join/tests.rs` +32
  - **Release/versioning** (13) — `library/compiler-builtins/compiler-builtins/CHANGELOG.md`, `library/compiler-builtins/libm/CHANGELOG.md` +11
  - **Async jobs / workers** (8) — `library/core/src/task/mod.rs`, `library/core/src/task/poll.rs` +6
  - **Crypto / signing / keys** (8) — `library/std/src/sys/thread_local/key/racy.rs`, `library/std/src/sys/thread_local/key/sgx.rs` +6
  - **Code generation** (7) — `src/tools/rust-analyzer/xtask/src/codegen/assists_doc_tests.rs`, `src/tools/rust-analyzer/xtask/src/codegen/diagnostics_docs.rs` +5
  - **Cache / ephemeral state** (1) — `src/bootstrap/src/utils/cache/tests.rs`

**tauri-apps/tauri** — 1069 files
  - **Test harness** (120) — `bench/tests/cpu_intensive/public/index.css`, `bench/tests/cpu_intensive/public/index.html` +118
  - **Dependency mgmt** (28) — `Cargo.toml`, `bench/Cargo.toml` +26
  - **CI pipeline** (24) — `.github/workflows/audit.yml`, `.github/workflows/bench.yml` +22
  - **Release/versioning** (15) — `.github/RELEASING.md`, `crates/tauri-build/CHANGELOG.md` +13
  - **Authorization / policy** (14) — `crates/tauri-cli/src/acl/permission/add.rs`, `crates/tauri-cli/src/acl/permission/ls.rs` +12
  - **Migrations** (10) — `crates/tauri-cli/src/migrate/migrations/mod.rs`, `crates/tauri-cli/src/migrate/migrations/v1/config.rs` +8
  - **Lint/format config** (7) — `.editorconfig`, `.prettierignore` +5
  - **Containerization** (2) — `.devcontainer/Dockerfile`, `.docker/cross/aarch64.Dockerfile`
  - **Code generation** (2) — `crates/tauri-build/src/codegen/context.rs`, `crates/tauri-build/src/codegen/mod.rs`
  - **Crypto / signing / keys** (1) — `crates/tauri-cli/src/helpers/updater_signature.rs`

**denoland/deno** — 13375 files
  - **Test harness** (11289) — `.github/workflows/ecosystem_compat_test.ts`, `.github/workflows/node_compat_test.ts` +11287
  - **Dependency mgmt** (83) — `Cargo.toml`, `cli/Cargo.toml` +81
  - **Crypto / signing / keys** (46) — `ext/crypto/00_crypto.js`, `ext/crypto/Cargo.toml` +44
  - **Cache / ephemeral state** (23) — `cli/cache/cache_db.rs`, `cli/cache/caches.rs` +21
  - **Release/versioning** (20) — `tools/release/00_start_release.ts`, `tools/release/01_bump_crate_versions.ts` +18
  - **Realtime / pubsub** (15) — `cli/tsc/dts/lib.deno_websocket.d.ts`, `cli/tsc/dts/node/undici/eventsource.d.ts` +13
  - **CI pipeline** (11) — `.github/workflows/cargo_publish.generated.yml`, `.github/workflows/ci.generated.yml` +9
  - **Replication / clustering** (10) — `cli/tsc/dts/node/cluster.d.cts`, `ext/node/polyfills/cluster.ts` +8
  - **Authorization / policy** (9) — `runtime/permissions/Cargo.toml`, `runtime/permissions/README.md` +7
  - **Observability** (8) — `ext/telemetry/Cargo.toml`, `ext/telemetry/README.md` +6
  - **Network privacy / transport** (5) — `cli/tsc/dts/lib.es2015.proxy.d.ts`, `cli/tsc/dts/node/undici/env-http-proxy-agent.d.ts` +3
  - **Lint/format config** (2) — `.editorconfig`, `.rustfmt.toml`
  - **Async jobs / workers** (2) — `cli/tsc/dts/lib.esnext.temporal.d.ts`, `ext/node/polyfills/internal/worker/js_transferable.js`
  - **Containerization** (1) — `.devcontainer/Dockerfile`

**farion1231/cc-switch** — 1006 files
  - **Plugin / provider registry** (93) — `src-tauri/src/proxy/providers/adapter.rs`, `src-tauri/src/proxy/providers/auth.rs` +91
  - **Network privacy / transport** (73) — `src-tauri/src/commands/proxy.rs`, `src-tauri/src/database/dao/proxy.rs` +71
  - **Test harness** (71) — `src-tauri/tests/app_config_load.rs`, `src-tauri/tests/app_type_parse.rs` +69
  - **Release/versioning** (57) — `CHANGELOG.md`, `docs/release-notes/v3.10.0-en.md` +55
  - **DB / ORM connection** (17) — `src-tauri/src/database/backup.rs`, `src-tauri/src/database/dao/failover.rs` +15
  - **i18n / localization** (5) — `src/i18n/index.ts`, `src/i18n/locales/en.json` +3
  - **Prompt templates** (5) — `src/components/prompts/PromptFormModal.tsx`, `src/components/prompts/PromptFormPanel.tsx` +3
  - **CI pipeline** (4) — `.github/workflows/ci.yml`, `.github/workflows/claude.yml` +2
  - **Dependency mgmt** (2) — `.github/dependabot.yml`, `src-tauri/Cargo.toml`
  - **Env/config validation** (2) — `src/lib/api/env.ts`, `src/types/env.ts`
  - **Authentication** (1) — `src/lib/api/auth.ts`
  - **File / blob storage** (1) — `src-tauri/src/services/s3.rs`
  - **Model runtime / scheduler** (1) — `src/config/iconInference.ts`

**oven-sh/bun** — 14691 files
  - **Test harness** (8812) — `bench/expect-to-equal/expect-to-equal.test.js`, `bench/expect-to-equal/expect-to-equal.vitest.test.js` +8810
  - **Crypto / signing / keys** (142) — `bench/crypto/aes-gcm-throughput.mjs`, `bench/crypto/asymmetricCipher.js` +140
  - **Dependency mgmt** (108) — `Cargo.toml`, `bench/ffi/src/Cargo.toml` +106
  - **Realtime / pubsub** (49) — `bench/websocket-server/.gitignore`, `bench/websocket-server/README.md` +47
  - **Lint/format config** (41) — `.editorconfig`, `.prettierignore` +39
  - **Code generation** (40) — `bench/grpc-server/benchmark.proto`, `src/codegen/bake-codegen.ts` +38
  - **CI pipeline** (30) — `.github/workflows/auto-assign-types.yml`, `.github/workflows/auto-close-duplicates.yml` +28
  - **File / blob storage** (27) — `packages/bun-release/scripts/upload-s3.ts`, `packages/bun-types/s3.d.ts` +25
  - **Containerization** (11) — `.buildkite/Dockerfile`, `dockerhub/alpine/Dockerfile` +9
  - **Replication / clustering** (6) — `src/js/internal/cluster/RoundRobinHandle.ts`, `src/js/internal/cluster/Worker.ts` +4
  - **Shell completion** (5) — `completions/bun-cli.json`, `completions/bun.bash` +3
  - **Network privacy / transport** (4) — `src/http/ProxyTunnel.rs`, `src/http/ProxyTunnel.zig` +2
  - **Async jobs / workers** (2) — `packages/bun-vscode/src/features/tasks/package.json.ts`, `packages/bun-vscode/src/features/tasks/tasks.ts`
  - **Observability** (1) — `scripts/associate-issue-with-sentry.ts`

**openai/codex** — 4851 files
  - **Test harness** (519) — `codex-rs/app-server-protocol/tests/schema_fixtures.rs`, `codex-rs/app-server-transport/src/transport/remote_control/tests/clients_tests.rs` +517
  - **Dependency mgmt** (127) — `codex-rs/Cargo.toml`, `codex-rs/agent-graph-store/Cargo.toml` +125
  - **Prompt templates** (37) — `codex-rs/prompts/BUILD.bazel`, `codex-rs/prompts/Cargo.toml` +35
  - **Migrations** (35) — `codex-rs/state/migrations/0001_threads.sql`, `codex-rs/state/migrations/0002_logs.sql` +33
  - **Network privacy / transport** (30) — `codex-rs/network-proxy/BUILD.bazel`, `codex-rs/network-proxy/Cargo.toml` +28
  - **Observability** (28) — `codex-rs/codex-api/src/telemetry.rs`, `codex-rs/codex-client/src/telemetry.rs` +26
  - **CI pipeline** (25) — `.github/workflows/bazel.yml`, `.github/workflows/blob-size-policy.yml` +23
  - **Plugin / provider registry** (21) — `codex-rs/core/src/plugins/discoverable.rs`, `codex-rs/core/src/plugins/discoverable_tests.rs` +19
  - **Rate limit / request guard** (19) — `codex-rs/app-server-protocol/schema/json/v2/AccountRateLimitsUpdatedNotification.json`, `codex-rs/app-server-protocol/schema/json/v2/GetAccountRateLimitsResponse.json` +17
  - **Realtime / pubsub** (18) — `codex-rs/app-server-transport/src/transport/remote_control/websocket.rs`, `codex-rs/app-server-transport/src/transport/websocket.rs` +16
  - **Authentication** (17) — `codex-rs/login/src/auth/access_token.rs`, `codex-rs/login/src/auth/access_token_tests.rs` +15
  - **Authorization / policy** (11) — `codex-rs/app-server-protocol/schema/typescript/v2/PluginAuthPolicy.ts`, `codex-rs/app-server-protocol/schema/typescript/v2/PluginInstallPolicy.ts` +9
  - **Async jobs / workers** (8) — `codex-rs/core/src/tasks/compact.rs`, `codex-rs/core/src/tasks/lifecycle.rs` +6
  - **Lint/format config** (7) — `.prettierignore`, `.prettierrc.toml` +5
  - **Crypto / signing / keys** (7) — `codex-rs/app-server-protocol/schema/json/AttestationGenerateParams.json`, `codex-rs/app-server-protocol/schema/json/AttestationGenerateResponse.json` +5
  - **Cache / ephemeral state** (3) — `codex-rs/utils/cache/BUILD.bazel`, `codex-rs/utils/cache/Cargo.toml` +1
  - **Model runtime / scheduler** (3) — `codex-rs/rollout-trace/src/inference.rs`, `codex-rs/rollout-trace/src/reducer/inference.rs` +1
  - **Release/versioning** (2) — `CHANGELOG.md`, `codex-rs/vendor/bubblewrap/release-checklist.md`
  - **Code generation** (2) — `codex-rs/config/src/thread_config/proto/codex.thread_config.v1.proto`, `codex-rs/exec-server/src/proto/codex.exec_server.relay.v1.proto`
  - **Containerization** (1) — `.devcontainer/Dockerfile`

**astral-sh/uv** — 1467 files
  - **Test harness** (444) — `crates/uv-client/tests/it/http_util.rs`, `crates/uv-client/tests/it/main.rs` +442
  - **Dependency mgmt** (116) — `Cargo.toml`, `crates/uv-audit/Cargo.toml` +114
  - **CI pipeline** (27) — `.github/workflows/bench.yml`, `.github/workflows/build-dev-binaries.yml` +25
  - **Lint/format config** (8) — `.editorconfig`, `.prettierignore` +6
  - **Authentication** (6) — `crates/uv/src/commands/auth/dir.rs`, `crates/uv/src/commands/auth/helper.rs` +4
  - **Containerization** (3) — `Dockerfile`, `crates/uv-dev/builder.dockerfile` +1
  - **Release/versioning** (3) — `.github/workflows/release-prepare.yml`, `CHANGELOG.md` +1
  - **Pre-commit hooks** (1) — `.pre-commit-config.yaml`
  - **Rate limit / request guard** (1) — `crates/uv-git/src/rate_limit.rs`

**zed-industries/zed** — 4060 files
  - **Dependency mgmt** (246) — `Cargo.toml`, `crates/acp_thread/Cargo.toml` +244
  - **Test harness** (83) — `crates/agent/src/tests/mod.rs`, `crates/agent/src/tests/test_tools.rs` +81
  - **DB / ORM connection** (50) — `crates/collab/src/db/ids.rs`, `crates/collab/src/db/queries.rs` +48
  - **Async jobs / workers** (50) — `crates/task/Cargo.toml`, `crates/task/LICENSE-GPL` +48
  - **CI pipeline** (47) — `.github/workflows/add_commented_closed_issue_to_project.yml`, `.github/workflows/after_release.yml` +45
  - **Migrations** (43) — `crates/collab/migrations/20251208000000_test_schema.sql`, `crates/migrator/src/migrations/m_2025_01_02/settings.rs` +41
  - **Code generation** (17) — `crates/proto/proto/ai.proto`, `crates/proto/proto/app.proto` +15
  - **Lint/format config** (14) — `.prettierrc`, `assets/icons/file_icons/eslint.svg` +12
  - **Observability** (14) — `crates/client/src/telemetry.rs`, `crates/client/src/telemetry/event_coalescer.rs` +12
  - **Prompt templates** (13) — `.factory/prompts/crash/fix.md`, `.factory/prompts/crash/investigate.md` +11
  - **Release/versioning** (11) — `.github/workflows/release_nightly.yml`, `crates/release_channel/Cargo.toml` +9
  - **Plugin / provider registry** (11) — `crates/git_hosting_providers/src/providers/azure.rs`, `crates/git_hosting_providers/src/providers/bitbucket.rs` +9
  - **Network privacy / transport** (7) — `.cloudflare/docs-proxy/src/worker.js`, `.cloudflare/docs-proxy/wrangler.toml` +5
  - **Realtime / pubsub** (2) — `crates/cloud_api_client/src/websocket.rs`, `crates/cloud_api_types/src/websocket_protocol.rs`
  - **Crypto / signing / keys** (2) — `crates/editor/src/signature_help.rs`, `crates/project/src/lsp_command/signature_help.rs`
  - **Containerization** (1) — `crates/eval_cli/Dockerfile`
  - **Input validation (request)** (1) — `assets/sounds/joined_call.wav`
  - **File / blob storage** (1) — `script/run-local-minio`
  - **Rate limit / request guard** (1) — `crates/language_model_core/src/rate_limiter.rs`
  - **Persistence / storage engine** (1) — `crates/workspace/src/persistence/model.rs`

**unionlabs/union** — 4003 files
  - **Dependency mgmt** (272) — `11-cometbls/go.mod`, `Cargo.toml` +270
  - **Test harness** (214) — `11-cometbls/zk_verifier_test.go`, `app2/src/demo.spec.ts` +212
  - **Plugin / provider registry** (144) — `voyager/plugins/attestor/evm/Cargo.toml`, `voyager/plugins/attestor/evm/README.md` +142
  - **Routing / HTTP routes** (101) — `app2/src/routes/+layout.svelte`, `app2/src/routes/+layout.ts` +99
  - **Public contracts / interfaces** (54) — `evm/contracts/CrosschainEscrowVault.sol`, `evm/contracts/CrosschainVault.sol` +52
  - **CLI option parsing** (24) — `galoisd/cmd/galoisd/cmd/client.go`, `galoisd/cmd/galoisd/cmd/example_prove.go` +22
  - **Crypto / signing / keys** (18) — `lib/aptos-types/src/signature.rs`, `lib/beacon-api-types/src/electra/attestation.rs` +16
  - **CI pipeline** (12) — `.github/workflows/check.yml`, `.github/workflows/deploy-app2.yml` +10
  - **Network privacy / transport** (12) — `cosmwasm/on-zkgm-call-proxy/Cargo.toml`, `cosmwasm/on-zkgm-call-proxy/src/lib.rs` +10
  - **Code generation** (10) — `galoisd/proto/api/v3/galois.proto`, `uniond/proto/buf.gen.gogo.yaml` +8
  - **Lint/format config** (5) — `app2/eslint.config.js`, `biome.json` +3
  - **Authentication** (4) — `app2/src/routes/auth/+page.svelte`, `app2/src/routes/auth/sign-in/+page.svelte` +2
  - **Migrations** (4) — `11-cometbls/migrations/expected_keepers.go`, `11-cometbls/migrations/migrations.go` +2
  - **Env/config validation** (4) — `ceremony/.env.example`, `site/.env.example` +2
  - **Input validation (request)** (2) — `ceremony/src/lib/components/Terminal/Join.svelte`, `lib/cometbft-rpc/testdata/validators/bartio-6760022.json`
  - **Rate limit / request guard** (2) — `cosmwasm/app/ucs03-zkgm/src/token_bucket.rs`, `evm/contracts/apps/ucs/03-zkgm/TokenBucket.sol`
  - **Release/versioning** (1) — `.github/workflows/release-component.yml`
  - **DB / ORM connection** (1) — `app2/src/lib/database/create-allocation-tables.sql`
  - **Logging** (1) — `typescript-sdk/scripts/logger.ts`

### PHP


**nextcloud/server** — 12383 files
  - **Test harness** (1512) — `apps/admin_audit/tests/Listener/SecurityEventListenerTest.php`, `apps/admin_audit/tests/Listener/UserManagementEventListenerTest.php` +1510
  - **Migrations** (254) — `apps/cloud_federation_api/lib/Migration/Version1016Date202502262004.php`, `apps/contactsinteraction/lib/Migration/FixVcardCategory.php` +252
  - **DB / ORM connection** (159) — `apps/cloud_federation_api/lib/Db/FederatedInvite.php`, `apps/cloud_federation_api/lib/Db/FederatedInviteMapper.php` +157
  - **Cache / ephemeral state** (82) — `.github/workflows/phpunit-memcached.yml`, `apps/dav/lib/CardDAV/PhotoCache.php` +80
  - **Crypto / signing / keys** (76) — `apps/encryption/lib/Crypto/Crypt.php`, `apps/encryption/lib/Crypto/DecryptAll.php` +74
  - **File / blob storage** (71) — `.github/workflows/files-external-s3.yml`, `.github/workflows/integration-s3-primary.yml` +69
  - **CI pipeline** (56) — `.github/workflows/ai-policy.yml`, `.github/workflows/autocheckers.yml` +54
  - **Persistence / storage engine** (50) — `apps/dav/lib/Storage/PublicOwnerWrapper.php`, `apps/dav/lib/Storage/PublicShareWrapper.php` +48
  - **Dependency mgmt** (40) — `.github/dependabot.yml`, `apps/admin_audit/composer/composer.json` +38
  - **Logging** (25) — `apps/appstore/src/utils/logger.ts`, `apps/comments/src/logger.ts` +23
  - **Routing / HTTP routes** (23) — `apps/cloud_federation_api/appinfo/routes.php`, `apps/comments/appinfo/routes.php` +21
  - **Rate limit / request guard** (18) — `apps/dav/lib/CalDAV/Security/RateLimitingPlugin.php`, `apps/dav/lib/CardDAV/Security/CardDavRateLimitingPlugin.php` +16
  - **Plugin / provider registry** (10) — `apps/files/src/plugins/search/folderSearch.ts`, `apps/files_sharing/lib/Activity/Providers/Base.php` +8
  - **Lint/format config** (8) — `.editorconfig`, `.github/workflows/lint-eslint.yml` +6
  - **i18n / localization** (8) — `lib/private/Translation/TranslationManager.php`, `lib/public/Translation/CouldNotTranslateException.php` +6
  - **Payment / billing** (7) — `lib/private/Support/Subscription/Assertion.php`, `lib/private/Support/Subscription/Registry.php` +5
  - **Authorization / policy** (6) — `lib/private/Security/CSP/ContentSecurityPolicy.php`, `lib/private/Security/FeaturePolicy/FeaturePolicy.php` +4
  - **Async jobs / workers** (6) — `apps/theming/lib/Jobs/MigrateBackgroundImages.php`, `apps/theming/lib/Jobs/RestoreBackgroundImageColor.php` +4
  - **Realtime / pubsub** (5) — `core/src/OC/eventsource.js`, `lib/private/EventSource.php` +3
  - **Input validation (request)** (3) — `apps/dav/lib/CalDAV/Validation/CalDavValidatePlugin.php`, `apps/dav/lib/CardDAV/Validation/CardDavValidatePlugin.php` +1
  - **Network privacy / transport** (3) — `apps/dav/lib/CalDAV/Proxy/Proxy.php`, `apps/dav/lib/CalDAV/Proxy/ProxyMapper.php` +1
  - **Containerization** (2) — `.devcontainer/Dockerfile`, `.devcontainer/docker-compose.yml`
  - **Authentication** (2) — `apps/dav/lib/Connector/Sabre/Auth.php`, `core/src/mixins/auth.js`
  - **Release/versioning** (1) — `CHANGELOG.md`
  - **Pre-commit hooks** (1) — `.pre-commit-config.yaml`

**laravel/framework** — 3234 files
  - **Test harness** (1263) — `src/Illuminate/Foundation/Console/stubs/view.test.stub`, `tests/AfterEachTestExtension.php` +1261
  - **DB / ORM connection** (291) — `config/database.php`, `src/Illuminate/Container/Attributes/Database.php` +289
  - **Public contracts / interfaces** (164) — `src/Illuminate/Console/Contracts/NewLineAware.php`, `src/Illuminate/Contracts/.gitattributes` +162
  - **Async jobs / workers** (149) — `src/Illuminate/Contracts/Queue/ClearableQueue.php`, `src/Illuminate/Contracts/Queue/EntityNotFoundException.php` +147
  - **Cache / ephemeral state** (83) — `config/cache.php`, `src/Illuminate/Cache/.gitattributes` +81
  - **Input validation (request)** (67) — `src/Illuminate/Contracts/Validation/CompilableRules.php`, `src/Illuminate/Contracts/Validation/DataAwareRule.php` +65
  - **CI pipeline** (47) — `.github/workflows/databases-nightly.yml`, `.github/workflows/databases.yml` +45
  - **Dependency mgmt** (40) — `.github/dependabot.yml`, `composer.json` +38
  - **Plugin / provider registry** (37) — `src/Illuminate/Auth/AuthServiceProvider.php`, `src/Illuminate/Auth/Passwords/PasswordResetServiceProvider.php` +35
  - **Rate limit / request guard** (21) — `src/Illuminate/Cache/Limiters/ConcurrencyLimiter.php`, `src/Illuminate/Cache/Limiters/ConcurrencyLimiterBuilder.php` +19
  - **Migrations** (19) — `src/Illuminate/Database/Console/Migrations/BaseCommand.php`, `src/Illuminate/Database/Console/Migrations/FreshCommand.php` +17
  - **File / blob storage** (19) — `src/Illuminate/Contracts/Filesystem/Cloud.php`, `src/Illuminate/Contracts/Filesystem/Factory.php` +17
  - **i18n / localization** (18) — `src/Illuminate/Contracts/Translation/HasLocalePreference.php`, `src/Illuminate/Contracts/Translation/Loader.php` +16
  - **Authentication** (4) — `config/auth.php`, `src/Illuminate/Container/Attributes/Auth.php` +2
  - **Crypto / signing / keys** (4) — `src/Illuminate/Console/Attributes/Signature.php`, `src/Illuminate/Routing/Exceptions/InvalidSignatureException.php` +2
  - **Lint/format config** (3) — `.editorconfig`, `phpstan.src.neon.dist` +1
  - **Release/versioning** (2) — `CHANGELOG.md`, `RELEASE.md`
  - **Containerization** (1) — `docker-compose.yml`
  - **Authorization / policy** (1) — `src/Illuminate/Database/Eloquent/Attributes/UsePolicy.php`
  - **Logging** (1) — `config/logging.php`

**symfony/symfony** — 13979 files
  - **Test harness** (6488) — `src/Symfony/Bridge/Doctrine/Tests/ArgumentResolver/EntityValueResolverTest.php`, `src/Symfony/Bridge/Doctrine/Tests/Console/ArgumentResolver/EntityValueResolverTest.php` +6486
  - **i18n / localization** (531) — `src/Symfony/Bridge/Twig/Translation/TwigExtractor.php`, `src/Symfony/Bundle/FrameworkBundle/Translation/Translator.php` +529
  - **Input validation (request)** (463) — `src/Symfony/Bridge/Doctrine/Validator/Constraints/UniqueEntity.php`, `src/Symfony/Bridge/Doctrine/Validator/Constraints/UniqueEntityValidator.php` +461
  - **Dependency mgmt** (193) — `.github/composer-lowest/composer.json`, `.github/dependabot.yml` +191
  - **Release/versioning** (192) — `CHANGELOG-8.0.md`, `CHANGELOG-8.1.md` +190
  - **Cache / ephemeral state** (108) — `src/Symfony/Bundle/FrameworkBundle/HttpCache/HttpCache.php`, `src/Symfony/Bundle/FrameworkBundle/Resources/config/cache.php` +106
  - **Public contracts / interfaces** (79) — `src/Symfony/Contracts/.gitattributes`, `src/Symfony/Contracts/.gitignore` +77
  - **File / blob storage** (51) — `src/Symfony/Component/Filesystem/.gitattributes`, `src/Symfony/Component/Filesystem/.gitignore` +49
  - **Rate limit / request guard** (41) — `src/Symfony/Bundle/FrameworkBundle/Resources/config/rate_limiter.php`, `src/Symfony/Component/HttpFoundation/RateLimiter/AbstractRequestRateLimiter.php` +39
  - **Persistence / storage engine** (30) — `src/Symfony/Component/HttpFoundation/Session/Storage/Handler/AbstractSessionHandler.php`, `src/Symfony/Component/HttpFoundation/Session/Storage/Handler/IdentityMarshaller.php` +28
  - **Crypto / signing / keys** (17) — `src/Symfony/Bundle/SecurityBundle/DependencyInjection/Security/Factory/X509Factory.php`, `src/Symfony/Component/HttpKernel/Attribute/IsSignatureValid.php` +15
  - **Authentication** (12) — `src/Symfony/Component/Security/Http/Authenticator/Passport/Badge/BadgeInterface.php`, `src/Symfony/Component/Security/Http/Authenticator/Passport/Badge/CsrfTokenBadge.php` +10
  - **Authorization / policy** (11) — `src/Symfony/Component/Notifier/Channel/ChannelPolicy.php`, `src/Symfony/Component/RateLimiter/Policy/CalendarAlignedWindow.php` +9
  - **CI pipeline** (10) — `.github/workflows/fabbot.yml`, `.github/workflows/integration-tests.yml` +8
  - **Shell completion** (10) — `src/Symfony/Component/Console/Completion/CompletionInput.php`, `src/Symfony/Component/Console/Completion/CompletionSuggestions.php` +8
  - **Lint/format config** (8) — `.editorconfig`, `.github/sa-tools/phpstan.baseline.neon` +6
  - **Network privacy / transport** (4) — `src/Symfony/Component/Form/Extension/DataCollector/Proxy/ResolvedTypeDataCollectorProxy.php`, `src/Symfony/Component/Form/Extension/DataCollector/Proxy/ResolvedTypeFactoryDataCollectorProxy.php` +2
  - **Realtime / pubsub** (2) — `src/Symfony/Component/HttpClient/EventSourceHttpClient.php`, `src/Symfony/Component/HttpClient/Exception/EventSourceException.php`
  - **Plugin / provider registry** (1) — `src/Symfony/Contracts/Service/ServiceProviderInterface.php`

**filamentphp/filament** — 7882 files
  - **i18n / localization** (3330) — `packages/actions/resources/lang/am/associate.php`, `packages/actions/resources/lang/am/attach.php` +3328
  - **Test harness** (1022) — `docs-assets/app/tests/CreatesApplication.php`, `docs-assets/app/tests/Feature/ExampleTest.php` +1020
  - **Authentication** (894) — `docs-assets/app/config/auth.php`, `packages/actions/resources/lang/ne/pages/auth/edit-profile.php` +892
  - **DB / ORM connection** (86) — `docs-assets/app/config/database.php`, `docs-assets/app/database/.gitignore` +84
  - **Public contracts / interfaces** (61) — `packages/actions/src/Contracts/HasActions.php`, `packages/actions/src/Exports/Downloaders/Contracts/Downloader.php` +59
  - **Plugin / provider registry** (27) — `docs-assets/app/app/Providers/AppServiceProvider.php`, `docs-assets/app/app/Providers/AuthServiceProvider.php` +25
  - **Migrations** (20) — `docs-assets/app/database/migrations/2014_10_12_000000_create_users_table.php`, `docs-assets/app/database/migrations/2014_10_12_100000_create_password_reset_tokens_table.php` +18
  - **Dependency mgmt** (19) — `.github/dependabot.yml`, `composer.json` +17
  - **CI pipeline** (10) — `.github/workflows/check-pr-maintainer-access.yml`, `.github/workflows/format-and-build.yml` +8
  - **File / blob storage** (9) — `docs-assets/app/storage/app/.gitignore`, `docs-assets/app/storage/app/public/.gitignore` +7
  - **Persistence / storage engine** (9) — `docs-assets/app/storage/app/.gitignore`, `docs-assets/app/storage/app/public/.gitignore` +7
  - **Lint/format config** (6) — `.editorconfig`, `.github/workflows/phpstan.yml` +4
  - **Routing / HTTP routes** (6) — `docs-assets/app/routes/api.php`, `docs-assets/app/routes/channels.php` +4
  - **Async jobs / workers** (5) — `packages/actions/src/Exports/Jobs/CreateXlsxFile.php`, `packages/actions/src/Exports/Jobs/ExportCompletion.php` +3
  - **Cache / ephemeral state** (4) — `docs-assets/app/bootstrap/cache/.gitignore`, `docs-assets/app/config/cache.php` +2
  - **Observability** (3) — `packages/schemas/src/Components/Concerns/HasEntryWrapper.php`, `packages/schemas/src/Concerns/HasEntryWrapper.php` +1
  - **Replication / clustering** (3) — `docs-assets/screenshots/images/dark/panels/cluster.jpg`, `docs-assets/screenshots/images/light/panels/cluster.jpg` +1
  - **Rate limit / request guard** (1) — `packages/actions/src/Concerns/CanBeRateLimited.php`
  - **Payment / billing** (1) — `packages/panels/src/Billing/Providers/Contracts/BillingProvider.php`
  - **Crypto / signing / keys** (1) — `docs-assets/app/app/Http/Middleware/ValidateSignature.php`
  - **Env/config validation** (1) — `docs-assets/app/.env.example`
  - **Logging** (1) — `docs-assets/app/config/logging.php`

**composer/composer** — 1091 files
  - **Test harness** (703) — `tests/Composer/Test/Advisory/AuditorTest.php`, `tests/Composer/Test/AllFunctionalTest.php` +701
  - **Dependency mgmt** (41) — `.github/dependabot.yml`, `composer.json` +39
  - **CI pipeline** (11) — `.github/workflows/api-surface-comment.yml`, `.github/workflows/api-surface.yml` +9
  - **Authorization / policy** (11) — `src/Composer/DependencyResolver/DefaultPolicy.php`, `src/Composer/Policy/AbandonedPolicyConfig.php` +9
  - **Lint/format config** (9) — `.editorconfig`, `.github/workflows/phpstan.yml` +7
  - **Release/versioning** (2) — `CHANGELOG.md`, `tests/Composer/Test/Fixtures/functional/installed-versions2/vendor/symfony/filesystem/CHANGELOG.md`
  - **Cache / ephemeral state** (1) — `src/Composer/Cache.php`

**bagisto/bagisto** — 3611 files
  - **i18n / localization** (417) — `lang/ar/auth.php`, `lang/ar/pagination.php` +415
  - **Test harness** (370) — `packages/Webkul/Admin/tests/AdminTestCase.php`, `packages/Webkul/Admin/tests/Concerns/AdminTestBench.php` +368
  - **DB / ORM connection** (282) — `config/database.php`, `database/.gitignore` +280
  - **Migrations** (182) — `database/migrations/2014_10_12_000000_create_users_table.php`, `database/migrations/2014_10_12_100000_create_password_resets_table.php` +180
  - **Payment / billing** (156) — `packages/Webkul/Admin/src/Resources/views/sales/invoices/create.blade.php`, `packages/Webkul/Admin/src/Resources/views/sales/invoices/index.blade.php` +154
  - **Public contracts / interfaces** (122) — `packages/Webkul/Attribute/src/Contracts/Attribute.php`, `packages/Webkul/Attribute/src/Contracts/AttributeFamily.php` +120
  - **Plugin / provider registry** (107) — `app/Providers/AppServiceProvider.php`, `packages/Webkul/Admin/src/Providers/.gitkeep` +105
  - **Dependency mgmt** (30) — `composer.json`, `packages/Webkul/Admin/composer.json` +28
  - **Authentication** (23) — `config/auth.php`, `lang/ar/auth.php` +21
  - **Async jobs / workers** (15) — `packages/Webkul/CatalogRule/src/Jobs/DeleteCatalogRuleIndex.php`, `packages/Webkul/CatalogRule/src/Jobs/UpdateCreateCatalogRuleIndex.php` +13
  - **Persistence / storage engine** (14) — `storage/.gitignore`, `storage/app/.gitignore` +12
  - **Cache / ephemeral state** (10) — `bootstrap/cache/.gitignore`, `config/cache.php` +8
  - **CI pipeline** (6) — `.github/workflows/admin_playwright_tests.yml`, `.github/workflows/docker_publish.yml` +4
  - **Routing / HTTP routes** (5) — `packages/Webkul/Paypal/src/Http/routes.php`, `packages/Webkul/SocialLogin/src/Http/routes.php` +3
  - **Containerization** (2) — `docker-compose.yml`, `docker/production/Dockerfile`
  - **Release/versioning** (1) — `CHANGELOG.md`
  - **Lint/format config** (1) — `.editorconfig`
  - **Env/config validation** (1) — `.env.example`
  - **Logging** (1) — `config/logging.php`

**firefly-iii/firefly-iii** — 2449 files
  - **i18n / localization** (91) — `public/v2/i18n/.gitignore`, `resources/assets/v1/src/locales/.json` +89
  - **DB / ORM connection** (79) — `app/Console/Commands/Correction/CorrectsDatabase.php`, `app/Console/Commands/System/CreatesDatabase.php` +77
  - **Migrations** (61) — `database/migrations/.gitkeep`, `database/migrations/2016_06_16_000000_create_support_tables.php` +59
  - **Test harness** (60) — `app/Events/Test/OwnerTestsNotificationChannel.php`, `app/Events/Test/UserTestsNotificationChannel.php` +58
  - **Input validation (request)** (36) — `app/Api/V1/Requests/AggregateFormRequest.php`, `app/Http/Requests/AccountFormRequest.php` +34
  - **Plugin / provider registry** (28) — `app/Helpers/Collector/Extensions/AccountCollection.php`, `app/Helpers/Collector/Extensions/AmountCollection.php` +26
  - **Authentication** (16) — `app/Console/Commands/System/CallsLaravelPassportKeys.php`, `config/auth.php` +14
  - **Persistence / storage engine** (14) — `storage/.htaccess`, `storage/app/.gitignore` +12
  - **CI pipeline** (10) — `.github/workflows/cleanup.yml`, `.github/workflows/close-duplicates.yml` +8
  - **Async jobs / workers** (7) — `app/Jobs/CreateAutoBudgetLimits.php`, `app/Jobs/CreateRecurringTransactions.php` +5
  - **Payment / billing** (6) — `app/Events/Model/Subscription/SubscriptionNeedsExtensionOrRenewal.php`, `app/Events/Model/Subscription/SubscriptionsAreOverdueForPayment.php` +4
  - **Release/versioning** (5) — `.github/release-notes/alpha.md`, `.github/release-notes/beta.md` +3
  - **Cache / ephemeral state** (5) — `bootstrap/cache/.gitignore`, `config/cache.php` +3
  - **Routing / HTTP routes** (5) — `routes/api.php`, `routes/breadcrumbs.php` +3
  - **Dependency mgmt** (4) — `.ci/php-cs-fixer/composer.json`, `.ci/phpmd/composer.json` +2
  - **Lint/format config** (4) — `.ci/phpcs.sh`, `.ci/phpstan.neon` +2
  - **Crypto / signing / keys** (2) — `app/Helpers/Webhook/Sha3SignatureGenerator.php`, `app/Helpers/Webhook/SignatureGeneratorInterface.php`
  - **File / blob storage** (1) — `storage/upload/.gitignore`
  - **Env/config validation** (1) — `.env.example`
  - **Logging** (1) — `config/logging.php`
  - **Observability** (1) — `config/sentry.php`

**guzzle/guzzle** — 112 files
  - **Test harness** (37) — `tests/ClientTest.php`, `tests/Cookie/CookieJarTest.php` +35
  - **Lint/format config** (6) — `.editorconfig`, `.github/.editorconfig` +4
  - **Dependency mgmt** (4) — `composer.json`, `vendor-bin/composer-normalize/composer.json` +2
  - **CI pipeline** (2) — `.github/workflows/ci.yml`, `.github/workflows/static.yml`
  - **Containerization** (1) — `Dockerfile`
  - **Release/versioning** (1) — `CHANGELOG.md`
  - **Network privacy / transport** (1) — `src/Handler/Proxy.php`

**matomo-org/matomo** — 13386 files
  - **Plugin / provider registry** (7166) — `libs/jqplot/plugins/jqplot.barRenderer.js`, `libs/jqplot/plugins/jqplot.canvasAxisTickRenderer.js` +7164
  - **Test harness** (4721) — `node_modules/chroma-js/test/analyze-test.coffee`, `node_modules/chroma-js/test/apha-test.coffee` +4719
  - **i18n / localization** (4099) — `core/Translation/Loader/DevelopmentLoader.php`, `core/Translation/Loader/JsonFileLoader.php` +4097
  - **DB / ORM connection** (69) — `core/Db/Adapter.php`, `core/Db/Adapter/Mysqli.php` +67
  - **Migrations** (28) — `core/Updater/Migration/Config/Factory.php`, `core/Updater/Migration/Config/Set.php` +26
  - **Input validation (request)** (25) — `core/Columns/Join.php`, `core/Columns/Join/ActionNameJoin.php` +23
  - **CI pipeline** (19) — `.github/workflows/buildtrackerjs.yml`, `.github/workflows/buildvue.yml` +17
  - **Public contracts / interfaces** (15) — `core/Settings/Interfaces/ConfigSettingInterface.php`, `core/Settings/Interfaces/CustomSettingInterface.php` +13
  - **File / blob storage** (13) — `core/Settings/Storage/Backend/BackendInterface.php`, `core/Settings/Storage/Backend/BaseSettingsTable.php` +11
  - **Persistence / storage engine** (13) — `core/Settings/Storage/Backend/BackendInterface.php`, `core/Settings/Storage/Backend/BaseSettingsTable.php` +11
  - **Lint/format config** (9) — `.editorconfig`, `.eslintignore` +7
  - **Network privacy / transport** (9) — `core/API/Proxy.php`, `libs/HTML/QuickForm2/Renderer/Proxy.php` +7
  - **Cache / ephemeral state** (7) — `core/Cache.php`, `core/Config/Cache.php` +5
  - **Release/versioning** (6) — `.github/workflows/release-preview.yml`, `CHANGELOG.md` +4
  - **Authorization / policy** (5) — `core/Policy/CnilPolicy.php`, `core/Policy/CompliancePolicy.php` +3
  - **Dependency mgmt** (3) — `.github/dependabot.yml`, `composer.json` +1
  - **Authentication** (2) — `core/Auth.php`, `plugins/Login/Auth.php`
  - **Observability** (2) — `plugins/Goals/Columns/Metrics/GoalSpecific/ConversionsEntry.php`, `plugins/SitesManager/SiteContentDetection/Sentry.php`
  - **Async jobs / workers** (1) — `plugins/CoreAdminHome/Tasks/ArchivesToPurgeDistributedList.php`

## Excluded (content) repos

- public-apis/public-apis
- EbookFoundation/free-programming-books
- Snailclimb/JavaGuide
- nilbuild/developer-roadmap
- avelino/awesome-go
- danielmiessler/SecLists
- TheAlgorithms/Java
- iluwatar/java-design-patterns