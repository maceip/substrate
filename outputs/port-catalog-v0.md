# Port Catalog v0

Generated from real repository structure where available:

- `oss_stable_100`: the 100 rows from `trending_100.json` inside `files.zip`, using GitHub tree paths plus descriptions.
- `oss_today_100`: the 100 rows from `github_trending_today.json`, kept separate as a day-trending/debiasing slice.
- `local_recent`: local git repos under `/Users/mac` with last commit on or after 2025-10-09, filtered to active project checkouts.

The catalog is evidence-weighted, not final. Tree/path evidence is stronger than description hits; the JSON includes per-repo evidence.

## Source Counts

| Source | Repos mined |
| --- | ---: |
| `local_recent` | 41 |
| `oss_stable_100` | 100 |
| `oss_today_100` | 100 |

## Cross-Tab

| Port | Local recent | OSS stable 100 | OSS today 100 | Category | What it absorbs | Nursery -> Graduated |
| --- | ---: | ---: | ---: | --- | --- | --- |
| `release-ci-quality` | 37 | 96 | 90 | core: present in mine and stable OSS | build/test/release pipeline, quality gates, dependency update policy. | build + lint + unit test CI -> E2E, visual regression, release automation, synthetic monitoring |
| `env-config-secrets` | 39 | 82 | 67 | core: present in mine and stable OSS | environment naming, required secret validation, deploy-time config shape. | typed env validator that fails on missing required values -> secret manager, per-environment config, rotation checks |
| `async-jobs-workers` | 39 | 59 | 42 | core: present in mine and stable OSS | background execution, retries, job state, scheduling semantics. | local worker/cron adapter with explicit job status -> queue, retries/dead letters, workflow engine, distributed workers |
| `cache-ephemeral-state` | 31 | 64 | 38 | core: present in mine and stable OSS | cache backend and invalidation/TTL semantics. | in-memory TTL cache behind a get/set interface -> Redis/Memcached, distributed locks, stampede protection |
| `auth-identity-session` | 32 | 62 | 43 | core: present in mine and stable OSS | provider swap, session shape, current-user lookup, identity ownership fields. | single current-user/session adapter -> OAuth/OIDC, orgs, refresh tokens, account linking |
| `input-validation-boundary` | 27 | 59 | 39 | core: present in mine and stable OSS | untrusted input shape and parse/validation error behavior. | one schema parser at every API/CLI boundary -> shared client/server schemas, generated types, schema versioning |
| `structured-logging-observability` | 22 | 63 | 48 | core: present in mine and stable OSS | log event shape, tracing/metrics sink, error reporting vendor. | structured stdout logger -> OpenTelemetry, Sentry/Datadog/Better Stack, traces and metrics |
| `authorization-policy` | 39 | 45 | 25 | core: present in mine and stable OSS | role/permission model and route/resource gating rules. | role check helper with deny-by-default protected call -> RBAC/ABAC, org policies, admin scopes, auditability |
| `ai-model-provider` | 33 | 43 | 32 | core: present in mine and stable OSS | model/provider swap, prompt/input format, embeddings/vector contracts. | one provider adapter with explicit model config -> multi-provider routing, eval gates, embeddings/vector store, fallback policy |
| `persistence-store` | 24 | 50 | 40 | core: present in mine and stable OSS | database engine, connection lifecycle, query/client shape, durability boundary. | sqlite or local file-backed adapter behind a store interface -> postgres/mysql pool, replicas, managed database, backups |
| `transport-http-api` | 26 | 42 | 27 | core: present in mine and stable OSS | HTTP framework, routing, request/response shape, API handler lifecycle. | one framework adapter with route helpers and typed responses -> middleware pipeline, streaming, versioned API, generated clients |
| `attestation-crypto-boundary` | 30 | 36 | 21 | core: present in mine and stable OSS | key custody, proof/claim shape, enclave or cryptographic verification boundary. | local verifier/signer adapter with explicit claim type -> TEE/remote attestation, key rotation, proof aggregation, policy verification |
| `i18n-localization-routing` | 20 | 46 | 39 | core: present in mine and stable OSS | locale routing, translation file layout, language negotiation. | single-locale route wrapper and message file -> multi-locale routing, Crowdin/import pipeline, localized auth/UI |
| `files-artifacts-storage` | 36 | 29 | 23 | core: present in mine and stable OSS | file/blob storage location, object naming, upload/download path. | local filesystem/blob adapter -> S3/R2/GCS, signed URLs, lifecycle policies |
| `schema-migrations` | 30 | 30 | 19 | core: present in mine and stable OSS | data model shape, migration history, compatibility across versions. | baseline schema with id/created_at/updated_at and generated migrations -> multi-step migrations, backfills, compatibility gates, tenant migration plans |
| `network-privacy-transport` | 33 | 22 | 8 | core: present in mine and stable OSS | private routing/anonymity transport, peer discovery, address exposure boundary. | single private-transport adapter that hides peer addressing -> mixnet/onion routing, cover traffic, replay-safe discovery, adversarial tests |
| `request-guard-rate-limit` | 23 | 31 | 20 | core: present in mine and stable OSS | abuse protection, CORS/CSRF/rate-limit behavior, middleware blocking mode. | shield/CORS/rate-limit middleware in dry-run or conservative mode -> live WAF/bot detection, per-route quotas, threat intelligence |
| `payment-billing-rail` | 27 | 21 | 14 | core: present in mine and stable OSS | payment provider, ledger state, invoice/subscription lifecycle. | single provider checkout/payment adapter -> subscriptions, ledger reconciliation, webhooks, tax, multi-currency |
| `realtime-pubsub` | 20 | 25 | 20 | core: present in mine and stable OSS | live transport, event fanout, reconnection semantics. | single-node websocket/SSE adapter -> pub/sub broker, presence, replay, backpressure |

## Consumer Block Map

### `async-jobs-workers`

- `long-running task`: domain action returns job id/status
- `retry/dead-letter handler`: failed work is represented explicitly

### `auth-identity-session`

- `protected route/group`: gate a route or command on current user
- `owner attribution`: stamp created records with current user
- `scoped query`: filter records by user/org/tenant

### `structured-logging-observability`

- `audit trail`: domain events flow to one log shape
- `error capture`: exception path emits structured failure context

### `ai-model-provider`

- `prompted operation`: domain code calls task-shaped model function
- `embedding index`: text/media records become searchable vectors

### `persistence-store`

- `repository/data access object`: hide query syntax and engine specifics
- `transaction boundary`: group writes behind one adapter

### `transport-http-api`

- `API route pattern`: validate input, authorize, call store, return typed output
- `client SDK/request helper`: call transport without naming framework

### `schema-migrations`

- `baseline domain table`: id/timestamps/version fields become default shape
- `backfill task`: migration produces a one-off job consumer

### `request-guard-rate-limit`

- `public endpoint shield`: untrusted ingress passes a guard before app code
- `quota policy`: caller/key/IP is counted consistently

## Example Repos By Port

### `release-ci-quality`

- `local_recent`: `/Users/mac/LiteRT-DPM`, `/Users/mac/LiteRT-LM`, `/Users/mac/attested-workload`, `/Users/mac/bountynet-genesis`, `/Users/mac/cordon`, `/Users/mac/cosmo-dev/WS4`, `/Users/mac/cosmo-dev/repo`, `/Users/mac/cosmo-dev/repo-ws2`
- `oss_stable_100`: `public-apis/public-apis`, `EbookFoundation/free-programming-books`, `NousResearch/hermes-agent`, `Significant-Gravitas/AutoGPT`, `huggingface/transformers`, `langflow-ai/langflow`, `langchain-ai/langchain`, `Comfy-Org/ComfyUI`
- `oss_today_100`: `mvanhorn/last30days-skill`, `RyanCodrai/turbovec`, `Panniantong/Agent-Reach`, `Andyyyy64/whichllm`, `MemPalace/mempalace`, `roboflow/supervision`, `luongnv89/claude-howto`, `magenta/magenta-realtime`

### `env-config-secrets`

- `local_recent`: `/Users/mac/LiteRT-DPM`, `/Users/mac/LiteRT-LM`, `/Users/mac/attested-workload`, `/Users/mac/blender-mcp`, `/Users/mac/bountynet-genesis`, `/Users/mac/clipcity`, `/Users/mac/cordon`, `/Users/mac/cosmo-dev/WS4`
- `oss_stable_100`: `NousResearch/hermes-agent`, `Significant-Gravitas/AutoGPT`, `huggingface/transformers`, `langflow-ai/langflow`, `langchain-ai/langchain`, `Comfy-Org/ComfyUI`, `github/spec-kit`, `facebook/react`
- `oss_today_100`: `mvanhorn/last30days-skill`, `RyanCodrai/turbovec`, `Panniantong/Agent-Reach`, `MemPalace/mempalace`, `roboflow/supervision`, `luongnv89/claude-howto`, `magenta/magenta-realtime`, `santifer/career-ops`

### `async-jobs-workers`

- `local_recent`: `/Users/mac/LiteRT-DPM`, `/Users/mac/LiteRT-LM`, `/Users/mac/attested-workload`, `/Users/mac/blender-mcp`, `/Users/mac/bountynet-genesis`, `/Users/mac/cordon`, `/Users/mac/cosmo-dev/WS4`, `/Users/mac/cosmo-dev/repo`
- `oss_stable_100`: `NousResearch/hermes-agent`, `Significant-Gravitas/AutoGPT`, `langflow-ai/langflow`, `Comfy-Org/ComfyUI`, `vercel/next.js`, `nodejs/node`, `mui/material-ui`, `louislam/uptime-kuma`
- `oss_today_100`: `santifer/career-ops`, `openai/plugins`, `webpack/webpack`, `CopilotKit/CopilotKit`, `Makisuo/maple`, `danny-avila/LibreChat`, `Crosstalk-Solutions/project-nomad`, `vitejs/vite`

### `cache-ephemeral-state`

- `local_recent`: `/Users/mac/LiteRT-DPM`, `/Users/mac/LiteRT-LM`, `/Users/mac/attested-workload`, `/Users/mac/bountynet-genesis`, `/Users/mac/cordon`, `/Users/mac/cursor-anchor`, `/Users/mac/ds4`, `/Users/mac/faest-pass`
- `oss_stable_100`: `NousResearch/hermes-agent`, `Significant-Gravitas/AutoGPT`, `huggingface/transformers`, `langflow-ai/langflow`, `langchain-ai/langchain`, `Comfy-Org/ComfyUI`, `facebook/react`, `affaan-m/ECC`
- `oss_today_100`: `Andyyyy64/whichllm`, `openai/plugins`, `webpack/webpack`, `refactoringhq/tolaria`, `Makisuo/maple`, `danny-avila/LibreChat`, `opensearch-project/OpenSearch`, `elastic/elasticsearch`

### `auth-identity-session`

- `local_recent`: `/Users/mac/LiteRT-DPM`, `/Users/mac/LiteRT-LM`, `/Users/mac/attested-workload`, `/Users/mac/blender-mcp`, `/Users/mac/bountynet-genesis`, `/Users/mac/cordon`, `/Users/mac/cursor-anchor`, `/Users/mac/ds4`
- `oss_stable_100`: `NousResearch/hermes-agent`, `Significant-Gravitas/AutoGPT`, `langflow-ai/langflow`, `langchain-ai/langchain`, `github/spec-kit`, `affaan-m/ECC`, `vercel/next.js`, `nodejs/node`
- `oss_today_100`: `luongnv89/claude-howto`, `openai/plugins`, `y13sint/FreeQwenApi`, `CopilotKit/CopilotKit`, `lfnovo/open-notebook`, `Makisuo/maple`, `danny-avila/LibreChat`, `heygen-com/hyperframes`

### `input-validation-boundary`

- `local_recent`: `/Users/mac/LiteRT-DPM`, `/Users/mac/LiteRT-LM`, `/Users/mac/attested-workload`, `/Users/mac/bountynet-genesis`, `/Users/mac/cordon`, `/Users/mac/cursor-anchor`, `/Users/mac/ds4`, `/Users/mac/faest-pass`
- `oss_stable_100`: `NousResearch/hermes-agent`, `Significant-Gravitas/AutoGPT`, `langflow-ai/langflow`, `anthropics/skills`, `langchain-ai/langchain`, `Comfy-Org/ComfyUI`, `facebook/react`, `affaan-m/ECC`
- `oss_today_100`: `mvanhorn/last30days-skill`, `openai/plugins`, `coreyhaines31/marketingskills`, `fastify/fastify`, `webpack/webpack`, `danielmiessler/Personal_AI_Infrastructure`, `CopilotKit/CopilotKit`, `Makisuo/maple`

### `structured-logging-observability`

- `local_recent`: `/Users/mac/blender-mcp`, `/Users/mac/cordon`, `/Users/mac/cosmo-dev/repo`, `/Users/mac/cursor-anchor`, `/Users/mac/ds4`, `/Users/mac/faest-pass`, `/Users/mac/fasterfox/nym-claude`, `/Users/mac/fasterfox/nym-codex`
- `oss_stable_100`: `NousResearch/hermes-agent`, `Significant-Gravitas/AutoGPT`, `huggingface/transformers`, `langflow-ai/langflow`, `langchain-ai/langchain`, `Comfy-Org/ComfyUI`, `facebook/react`, `vercel/next.js`
- `oss_today_100`: `google/skills`, `roboflow/supervision`, `openai/plugins`, `sveltejs/svelte`, `fastify/fastify`, `webpack/webpack`, `y13sint/FreeQwenApi`, `danielmiessler/Personal_AI_Infrastructure`

### `authorization-policy`

- `local_recent`: `/Users/mac/LiteRT-DPM`, `/Users/mac/LiteRT-LM`, `/Users/mac/attested-workload`, `/Users/mac/blender-mcp`, `/Users/mac/bountynet-genesis`, `/Users/mac/clipcity`, `/Users/mac/cordon`, `/Users/mac/cosmo-dev/WS4`
- `oss_stable_100`: `NousResearch/hermes-agent`, `Significant-Gravitas/AutoGPT`, `nodejs/node`, `mui/material-ui`, `openclaw/openclaw`, `n8n-io/n8n`, `microsoft/vscode`, `anomalyco/opencode`
- `oss_today_100`: `CopilotKit/CopilotKit`, `Makisuo/maple`, `danny-avila/LibreChat`, `heygen-com/hyperframes`, `opensearch-project/OpenSearch`, `elastic/elasticsearch`, `SeleniumHQ/selenium`, `SerenityOS/serenity`

### `ai-model-provider`

- `local_recent`: `/Users/mac/LiteRT-DPM`, `/Users/mac/LiteRT-LM`, `/Users/mac/attested-workload`, `/Users/mac/blender-mcp`, `/Users/mac/bountynet-genesis`, `/Users/mac/cordon`, `/Users/mac/cosmo-dev/WS4`, `/Users/mac/cosmo-dev/repo`
- `oss_stable_100`: `NousResearch/hermes-agent`, `Significant-Gravitas/AutoGPT`, `huggingface/transformers`, `langflow-ai/langflow`, `anthropics/skills`, `langchain-ai/langchain`, `Comfy-Org/ComfyUI`, `affaan-m/ECC`
- `oss_today_100`: `mvanhorn/last30days-skill`, `RyanCodrai/turbovec`, `google/skills`, `Andyyyy64/whichllm`, `MemPalace/mempalace`, `alistaitsacle/free-llm-api-keys`, `openai/plugins`, `danielmiessler/Personal_AI_Infrastructure`

### `persistence-store`

- `local_recent`: `/Users/mac/LiteRT-DPM`, `/Users/mac/bountynet-genesis`, `/Users/mac/cosmo-dev/repo-ws2`, `/Users/mac/ds4`, `/Users/mac/faest-pass`, `/Users/mac/fasterfox/nym-claude`, `/Users/mac/fasterfox/nym-codex`, `/Users/mac/fasterfox/nym-ds4`
- `oss_stable_100`: `NousResearch/hermes-agent`, `Significant-Gravitas/AutoGPT`, `langflow-ai/langflow`, `langchain-ai/langchain`, `Comfy-Org/ComfyUI`, `affaan-m/ECC`, `vercel/next.js`, `nodejs/node`
- `oss_today_100`: `MemPalace/mempalace`, `luongnv89/claude-howto`, `openai/plugins`, `chinese-poetry/chinese-poetry`, `danielmiessler/Personal_AI_Infrastructure`, `CopilotKit/CopilotKit`, `lfnovo/open-notebook`, `Makisuo/maple`

### `transport-http-api`

- `local_recent`: `/Users/mac/LiteRT-DPM`, `/Users/mac/LiteRT-LM`, `/Users/mac/bountynet-genesis`, `/Users/mac/cursor-anchor`, `/Users/mac/ds4`, `/Users/mac/fasterfox/nym-claude`, `/Users/mac/fasterfox/nym-codex`, `/Users/mac/fasterfox/nym-ds4`
- `oss_stable_100`: `NousResearch/hermes-agent`, `Significant-Gravitas/AutoGPT`, `langflow-ai/langflow`, `langchain-ai/langchain`, `Comfy-Org/ComfyUI`, `affaan-m/ECC`, `vercel/next.js`, `mui/material-ui`
- `oss_today_100`: `openai/plugins`, `CopilotKit/CopilotKit`, `Makisuo/maple`, `danny-avila/LibreChat`, `heygen-com/hyperframes`, `Crosstalk-Solutions/project-nomad`, `opensearch-project/OpenSearch`, `elastic/elasticsearch`

### `attestation-crypto-boundary`

- `local_recent`: `/Users/mac/LiteRT-DPM`, `/Users/mac/LiteRT-LM`, `/Users/mac/attested-workload`, `/Users/mac/bountynet-genesis`, `/Users/mac/cordon`, `/Users/mac/cursor-anchor`, `/Users/mac/faest-pass`, `/Users/mac/fasterfox/nym-claude`
- `oss_stable_100`: `NousResearch/hermes-agent`, `vercel/next.js`, `nodejs/node`, `sveltejs/svelte`, `freeCodeCamp/freeCodeCamp`, `openclaw/openclaw`, `n8n-io/n8n`, `microsoft/vscode`
- `oss_today_100`: `openai/plugins`, `sveltejs/svelte`, `CopilotKit/CopilotKit`, `Makisuo/maple`, `danny-avila/LibreChat`, `opensearch-project/OpenSearch`, `SerenityOS/serenity`, `Fincept-Corporation/FinceptTerminal`

### `i18n-localization-routing`

- `local_recent`: `/Users/mac/cosmo-dev/ws1-app-shell`, `/Users/mac/cursor-anchor`, `/Users/mac/ds4`, `/Users/mac/faest-pass`, `/Users/mac/fasterfox/nym-claude`, `/Users/mac/fasterfox/nym-codex`, `/Users/mac/fasterfox/nym-ds4`, `/Users/mac/heart-transplant`
- `oss_stable_100`: `NousResearch/hermes-agent`, `Significant-Gravitas/AutoGPT`, `huggingface/transformers`, `langflow-ai/langflow`, `langchain-ai/langchain`, `facebook/react`, `affaan-m/ECC`, `vercel/next.js`
- `oss_today_100`: `MemPalace/mempalace`, `luongnv89/claude-howto`, `openai/plugins`, `sveltejs/svelte`, `refactoringhq/tolaria`, `CopilotKit/CopilotKit`, `lfnovo/open-notebook`, `Makisuo/maple`

### `files-artifacts-storage`

- `local_recent`: `/Users/mac/LiteRT-DPM`, `/Users/mac/LiteRT-LM`, `/Users/mac/attested-workload`, `/Users/mac/bountynet-genesis`, `/Users/mac/cordon`, `/Users/mac/cosmo-dev/WS4`, `/Users/mac/cosmo-dev/repo`, `/Users/mac/cosmo-dev/repo-ws2`
- `oss_stable_100`: `NousResearch/hermes-agent`, `Significant-Gravitas/AutoGPT`, `langchain-ai/langchain`, `nodejs/node`, `n8n-io/n8n`, `microsoft/vscode`, `anomalyco/opencode`, `langgenius/dify`
- `oss_today_100`: `CopilotKit/CopilotKit`, `Makisuo/maple`, `danny-avila/LibreChat`, `opensearch-project/OpenSearch`, `Anuken/Mindustry`, `SeleniumHQ/selenium`, `SerenityOS/serenity`, `Fincept-Corporation/FinceptTerminal`

### `schema-migrations`

- `local_recent`: `/Users/mac/LiteRT-DPM`, `/Users/mac/LiteRT-LM`, `/Users/mac/attested-workload`, `/Users/mac/bountynet-genesis`, `/Users/mac/cosmo-dev/WS4`, `/Users/mac/cosmo-dev/repo-ws2`, `/Users/mac/cursor-anchor`, `/Users/mac/ds4`
- `oss_stable_100`: `NousResearch/hermes-agent`, `Significant-Gravitas/AutoGPT`, `langflow-ai/langflow`, `langchain-ai/langchain`, `openclaw/openclaw`, `n8n-io/n8n`, `anomalyco/opencode`, `langgenius/dify`
- `oss_today_100`: `mvanhorn/last30days-skill`, `danielmiessler/Personal_AI_Infrastructure`, `CopilotKit/CopilotKit`, `lfnovo/open-notebook`, `Makisuo/maple`, `danny-avila/LibreChat`, `Crosstalk-Solutions/project-nomad`, `opensearch-project/OpenSearch`

### `network-privacy-transport`

- `local_recent`: `/Users/mac/attested-workload`, `/Users/mac/blender-mcp`, `/Users/mac/bountynet-genesis`, `/Users/mac/cordon`, `/Users/mac/cosmo-dev/WS4`, `/Users/mac/cosmo-dev/repo`, `/Users/mac/cosmo-dev/repo-ws2`, `/Users/mac/cosmo-dev/ws1-app-shell`
- `oss_stable_100`: `vercel/next.js`, `mui/material-ui`, `freeCodeCamp/freeCodeCamp`, `openclaw/openclaw`, `nilbuild/developer-roadmap`, `n8n-io/n8n`, `facebook/react-native`, `godotengine/godot`
- `oss_today_100`: `Makisuo/maple`, `SeleniumHQ/selenium`, `xbmc/xbmc`, `hellzerg/optimizer`, `Wei-Shaw/sub2api`, `ethereum/go-ethereum`, `Automattic/jetpack`, `joomla/joomla-cms`

### `request-guard-rate-limit`

- `local_recent`: `/Users/mac/attested-workload`, `/Users/mac/blender-mcp`, `/Users/mac/bountynet-genesis`, `/Users/mac/cordon`, `/Users/mac/ds4`, `/Users/mac/faest-pass`, `/Users/mac/fasterfox/nym-claude`, `/Users/mac/fasterfox/nym-codex`
- `oss_stable_100`: `NousResearch/hermes-agent`, `Significant-Gravitas/AutoGPT`, `langflow-ai/langflow`, `langchain-ai/langchain`, `Comfy-Org/ComfyUI`, `vercel/next.js`, `freeCodeCamp/freeCodeCamp`, `openclaw/openclaw`
- `oss_today_100`: `openai/plugins`, `CopilotKit/CopilotKit`, `danny-avila/LibreChat`, `Crosstalk-Solutions/project-nomad`, `OpenAPITools/openapi-generator`, `ggml-org/llama.cpp`, `jellyfin/jellyfin`, `Radarr/Radarr`

### `payment-billing-rail`

- `local_recent`: `/Users/mac/LiteRT-DPM`, `/Users/mac/bountynet-genesis`, `/Users/mac/cursor-anchor`, `/Users/mac/ds4`, `/Users/mac/faest-pass`, `/Users/mac/fasterfox/nym-claude`, `/Users/mac/fasterfox/nym-codex`, `/Users/mac/fasterfox/nym-ds4`
- `oss_stable_100`: `NousResearch/hermes-agent`, `Significant-Gravitas/AutoGPT`, `langchain-ai/langchain`, `mui/material-ui`, `louislam/uptime-kuma`, `freeCodeCamp/freeCodeCamp`, `nilbuild/developer-roadmap`, `n8n-io/n8n`
- `oss_today_100`: `openai/plugins`, `coreyhaines31/marketingskills`, `Makisuo/maple`, `Fincept-Corporation/FinceptTerminal`, `mvanhorn/cli-printing-press`, `Wei-Shaw/sub2api`, `mvanhorn/printing-press-library`, `ethereum/go-ethereum`

### `realtime-pubsub`

- `local_recent`: `/Users/mac/cordon`, `/Users/mac/cosmo-ws3`, `/Users/mac/ds4`, `/Users/mac/faest-pass`, `/Users/mac/fasterfox/nym-claude`, `/Users/mac/fasterfox/nym-codex`, `/Users/mac/fasterfox/nym-ds4`, `/Users/mac/heart-transplant`
- `oss_stable_100`: `Comfy-Org/ComfyUI`, `nodejs/node`, `louislam/uptime-kuma`, `openclaw/openclaw`, `n8n-io/n8n`, `anomalyco/opencode`, `langgenius/dify`, `spring-projects/spring-framework`
- `oss_today_100`: `magenta/magenta-realtime`, `CopilotKit/CopilotKit`, `Makisuo/maple`, `danny-avila/LibreChat`, `jenkinsci/jenkins`, `opensearch-project/OpenSearch`, `SeleniumHQ/selenium`, `SerenityOS/serenity`

## Initial Read

- Core first ports are the ones high in both local and stable OSS: start with transport, persistence, env/config, logging/observability, CI/release, input validation, schema/migrations, async jobs, and request guard.
- Local specialty ports are real but should not dominate the nursery core: attestation/crypto, network privacy transport, AI provider/model, and payment rails show up strongly in this workspace and should be second-layer/domain packs unless stable OSS also pulls them upward.
- Graduation-only candidates are not a separate final set yet. The earliest signal is ports that appear in mature infrastructure repos through richer tree evidence: CI/release, observability, schema/migration, async jobs, cache, and authz/policy.
