#!/usr/bin/env python3
"""Mine candidate nursery ports from the ZIP corpora and local recent repos."""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import zipfile
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ZIP_PATH = ROOT / "files.zip"
CACHE_DIR = ROOT / ".cache" / "github-trees"
OUTPUTS = ROOT / "outputs"
CUTOFF = datetime(2025, 10, 9, tzinfo=timezone.utc)


PORTS: dict[str, dict[str, object]] = {
    "transport-http-api": {
        "absorbs": "HTTP framework, routing, request/response shape, API handler lifecycle.",
        "nursery": "one framework adapter with route helpers and typed responses",
        "graduated": "middleware pipeline, streaming, versioned API, generated clients",
        "tree": [
            "next.config",
            "app/api/",
            "pages/api/",
            "routes/",
            "controllers/",
            "fastapi",
            "express",
            "axum",
            "actix",
            "rocket",
            "gin",
            "grpc",
            "openapi",
        ],
        "text": [r"\bFastAPI\b", r"\bexpress\b", r"\brouter\b", r"\broute\(", r"\bOpenAPI\b", r"\bgrpc\b"],
    },
    "auth-identity-session": {
        "absorbs": "provider swap, session shape, current-user lookup, identity ownership fields.",
        "nursery": "single current-user/session adapter",
        "graduated": "OAuth/OIDC, orgs, refresh tokens, account linking",
        "tree": [
            "next-auth",
            "auth.js",
            "clerk",
            "supabase",
            "passport",
            "jwt",
            "session",
            "oauth",
            "oidc",
            "login",
            "signin",
            "sign-in",
        ],
        "text": [r"\bClerk\b", r"\bnext-auth\b", r"\bOAuth\b", r"\bOIDC\b", r"\bJWT\b", r"\bsession\b", r"\blogin\b"],
    },
    "authorization-policy": {
        "absorbs": "role/permission model and route/resource gating rules.",
        "nursery": "role check helper with deny-by-default protected call",
        "graduated": "RBAC/ABAC, org policies, admin scopes, auditability",
        "tree": ["rbac", "permission", "policy", "acl", "roles", "casbin", "opa", "cedar"],
        "text": [r"\bRBAC\b", r"\bpermission", r"\bpolicy\b", r"\brole[s]?\b", r"\bauthori[sz]ation\b"],
    },
    "persistence-store": {
        "absorbs": "database engine, connection lifecycle, query/client shape, durability boundary.",
        "nursery": "sqlite or local file-backed adapter behind a store interface",
        "graduated": "postgres/mysql pool, replicas, managed database, backups",
        "tree": [
            "prisma",
            "drizzle",
            "sqlalchemy",
            "diesel",
            "sqlx",
            "typeorm",
            "sequelize",
            "postgres",
            "sqlite",
            "mysql",
            "mongodb",
            "redis",
            "db.",
            "database",
        ],
        "text": [r"\bpostgres\b", r"\bsqlite\b", r"\bDrizzle\b", r"\bPrisma\b", r"\bSQLAlchemy\b", r"\bdatabase\b"],
    },
    "schema-migrations": {
        "absorbs": "data model shape, migration history, compatibility across versions.",
        "nursery": "baseline schema with id/created_at/updated_at and generated migrations",
        "graduated": "multi-step migrations, backfills, compatibility gates, tenant migration plans",
        "tree": ["migration", "migrations/", "schema.", "alembic", "prisma/migrations", "drizzle.config", "diesel.toml"],
        "text": [r"\bmigration", r"\bschema\b", r"\bbackfill\b", r"\bversioned\b"],
    },
    "env-config-secrets": {
        "absorbs": "environment naming, required secret validation, deploy-time config shape.",
        "nursery": "typed env validator that fails on missing required values",
        "graduated": "secret manager, per-environment config, rotation checks",
        "tree": [".env", "dotenv", "env.ts", "env.py", "config.", "settings.", "zod", "pydantic"],
        "text": [r"\benv var", r"\bdotenv\b", r"\bsecret", r"\bconfig\b", r"\bsettings\b"],
    },
    "structured-logging-observability": {
        "absorbs": "log event shape, tracing/metrics sink, error reporting vendor.",
        "nursery": "structured stdout logger",
        "graduated": "OpenTelemetry, Sentry/Datadog/Better Stack, traces and metrics",
        "tree": ["sentry", "opentelemetry", "otel", "tracing", "prometheus", "metrics", "logger", "logging", "logtape"],
        "text": [r"\bSentry\b", r"\bOpenTelemetry\b", r"\botel\b", r"\bmetrics\b", r"\blogger\b", r"\btracing\b"],
    },
    "request-guard-rate-limit": {
        "absorbs": "abuse protection, CORS/CSRF/rate-limit behavior, middleware blocking mode.",
        "nursery": "shield/CORS/rate-limit middleware in dry-run or conservative mode",
        "graduated": "live WAF/bot detection, per-route quotas, threat intelligence",
        "tree": ["middleware", "rate-limit", "ratelimit", "csrf", "cors", "arcjet", "helmet", "waf", "guard"],
        "text": [r"\brate.?limit", r"\bCSRF\b", r"\bCORS\b", r"\bmiddleware\b", r"\bguard\b", r"\bWAF\b"],
    },
    "input-validation-boundary": {
        "absorbs": "untrusted input shape and parse/validation error behavior.",
        "nursery": "one schema parser at every API/CLI boundary",
        "graduated": "shared client/server schemas, generated types, schema versioning",
        "tree": ["zod", "joi", "yup", "pydantic", "serde", "validator", "validation", "schemas"],
        "text": [r"\bZod\b", r"\bpydantic\b", r"\bserde\b", r"\bvalidation\b", r"\bschema parser\b"],
    },
    "async-jobs-workers": {
        "absorbs": "background execution, retries, job state, scheduling semantics.",
        "nursery": "local worker/cron adapter with explicit job status",
        "graduated": "queue, retries/dead letters, workflow engine, distributed workers",
        "tree": ["celery", "bullmq", "queue", "worker", "jobs", "cron", "temporal", "sidekiq", "resque"],
        "text": [r"\bqueue\b", r"\bworker\b", r"\bcron\b", r"\bretr(y|ies)\b", r"\bTemporal\b", r"\bjob[s]?\b"],
    },
    "cache-ephemeral-state": {
        "absorbs": "cache backend and invalidation/TTL semantics.",
        "nursery": "in-memory TTL cache behind a get/set interface",
        "graduated": "Redis/Memcached, distributed locks, stampede protection",
        "tree": ["redis", "memcached", "cache", "ttl", "lru"],
        "text": [r"\bRedis\b", r"\bcache\b", r"\bTTL\b", r"\bLRU\b"],
    },
    "files-artifacts-storage": {
        "absorbs": "file/blob storage location, object naming, upload/download path.",
        "nursery": "local filesystem/blob adapter",
        "graduated": "S3/R2/GCS, signed URLs, lifecycle policies",
        "tree": ["s3", "r2", "gcs", "blob", "storage", "uploads", "artifacts"],
        "text": [r"\bS3\b", r"\bR2\b", r"\bblob\b", r"\bupload", r"\bartifact"],
    },
    "realtime-pubsub": {
        "absorbs": "live transport, event fanout, reconnection semantics.",
        "nursery": "single-node websocket/SSE adapter",
        "graduated": "pub/sub broker, presence, replay, backpressure",
        "tree": ["websocket", "ws.", "socket.io", "sse", "pubsub", "nats", "kafka", "mqtt"],
        "text": [r"\bwebsocket", r"\bSSE\b", r"\bpubsub\b", r"\bKafka\b", r"\bMQTT\b", r"\brealtime\b"],
    },
    "ai-model-provider": {
        "absorbs": "model/provider swap, prompt/input format, embeddings/vector contracts.",
        "nursery": "one provider adapter with explicit model config",
        "graduated": "multi-provider routing, eval gates, embeddings/vector store, fallback policy",
        "tree": ["openai", "anthropic", "ollama", "llm", "model", "embedding", "vector", "qdrant", "chroma", "langchain"],
        "text": [r"\bOpenAI\b", r"\bAnthropic\b", r"\bLLM\b", r"\bembedding", r"\bvector\b", r"\bmodel provider\b"],
    },
    "payment-billing-rail": {
        "absorbs": "payment provider, ledger state, invoice/subscription lifecycle.",
        "nursery": "single provider checkout/payment adapter",
        "graduated": "subscriptions, ledger reconciliation, webhooks, tax, multi-currency",
        "tree": ["stripe", "billing", "payment", "checkout", "invoice", "ledger", "x402"],
        "text": [r"\bStripe\b", r"\bbilling\b", r"\bpayment", r"\binvoice\b", r"\bledger\b", r"\bx402\b"],
    },
    "release-ci-quality": {
        "absorbs": "build/test/release pipeline, quality gates, dependency update policy.",
        "nursery": "build + lint + unit test CI",
        "graduated": "E2E, visual regression, release automation, synthetic monitoring",
        "tree": [".github/workflows", "dependabot", "semantic-release", "codecov", "playwright", "storybook", "chromatic", "knip"],
        "text": [r"\bCI\b", r"\bworkflow\b", r"\bcoverage\b", r"\brelease\b", r"\be2e\b", r"\blint\b"],
    },
    "i18n-localization-routing": {
        "absorbs": "locale routing, translation file layout, language negotiation.",
        "nursery": "single-locale route wrapper and message file",
        "graduated": "multi-locale routing, Crowdin/import pipeline, localized auth/UI",
        "tree": ["i18n", "locale", "locales", "messages", "next-intl", "crowdin", "translations"],
        "text": [r"\bi18n\b", r"\blocale", r"\btranslation", r"\bCrowdin\b"],
    },
    "attestation-crypto-boundary": {
        "absorbs": "key custody, proof/claim shape, enclave or cryptographic verification boundary.",
        "nursery": "local verifier/signer adapter with explicit claim type",
        "graduated": "TEE/remote attestation, key rotation, proof aggregation, policy verification",
        "tree": ["attest", "tee", "enclave", "signature", "signer", "crypto", "zk", "proof", "tls", "cert"],
        "text": [r"\battest", r"\bTEE\b", r"\benclave\b", r"\bsignature\b", r"\bcrypto\b", r"\bproof\b"],
    },
    "network-privacy-transport": {
        "absorbs": "private routing/anonymity transport, peer discovery, address exposure boundary.",
        "nursery": "single private-transport adapter that hides peer addressing",
        "graduated": "mixnet/onion routing, cover traffic, replay-safe discovery, adversarial tests",
        "tree": ["mixnet", "nym", "onion", "privacy", "peer", "p2p", "relay", "tor", "sphinx"],
        "text": [r"\bmixnet\b", r"\bonion\b", r"\bprivacy\b", r"\bp2p\b", r"\brelay\b", r"\bpeer\b"],
    },
}


CONSUMERS: dict[str, list[tuple[str, str]]] = {
    "auth-identity-session": [
        ("protected route/group", "gate a route or command on current user"),
        ("owner attribution", "stamp created records with current user"),
        ("scoped query", "filter records by user/org/tenant"),
    ],
    "persistence-store": [
        ("repository/data access object", "hide query syntax and engine specifics"),
        ("transaction boundary", "group writes behind one adapter"),
    ],
    "schema-migrations": [
        ("baseline domain table", "id/timestamps/version fields become default shape"),
        ("backfill task", "migration produces a one-off job consumer"),
    ],
    "transport-http-api": [
        ("API route pattern", "validate input, authorize, call store, return typed output"),
        ("client SDK/request helper", "call transport without naming framework"),
    ],
    "structured-logging-observability": [
        ("audit trail", "domain events flow to one log shape"),
        ("error capture", "exception path emits structured failure context"),
    ],
    "async-jobs-workers": [
        ("long-running task", "domain action returns job id/status"),
        ("retry/dead-letter handler", "failed work is represented explicitly"),
    ],
    "ai-model-provider": [
        ("prompted operation", "domain code calls task-shaped model function"),
        ("embedding index", "text/media records become searchable vectors"),
    ],
    "request-guard-rate-limit": [
        ("public endpoint shield", "untrusted ingress passes a guard before app code"),
        ("quota policy", "caller/key/IP is counted consistently"),
    ],
}


EXCLUDE_PARTS = {
    ".codex",
    ".cursor",
    ".local",
    ".nvm",
    "Library",
    "Downloads",
    "node_modules",
    ".cache",
    ".cargo",
    ".gradle",
    ".m2",
    ".npm",
    "actions-runner-macos-work-2",
    "W",
    "fry",
    "code",
    "webkit-src",
}

EXCLUDE_LOCAL_REPO_NAMES = {
    "LiteRT-DPM-main",
    "LiteRT-DPM-phase3-sentinel",
    "LiteRT-DPM-vet-assets",
    "webkit-src",
}

TREE_PATTERNS: dict[str, list[re.Pattern[str]]] = {
    "transport-http-api": [
        re.compile(r"(^|/)(app|pages)/api/"),
        re.compile(r"(^|/)(routes|controllers)(/|$)"),
        re.compile(r"(^|/)(openapi|swagger|grpc)([./_-]|$)"),
        re.compile(r"(^|/)(fastapi|express|axum|actix|rocket|gin)([./_-]|$)"),
    ],
    "auth-identity-session": [
        re.compile(r"(^|/)(auth|authentication|oauth|oidc|jwt|sessions?|login|signin|sign-in)([./_-]|/|$)"),
        re.compile(r"(^|/)(next-auth|clerk|passport|supabase)([./_-]|/|$)"),
    ],
    "authorization-policy": [
        re.compile(r"(^|/)(rbac|permissions?|polic(y|ies)|acl|roles?|casbin|opa|cedar)([./_-]|/|$)"),
    ],
    "persistence-store": [
        re.compile(r"(^|/)(prisma|database|db|sqlite|postgres|mysql|mongodb|redis)([./_-]|/|$)"),
        re.compile(r"(^|/)(drizzle|sqlalchemy|diesel|sqlx|typeorm|sequelize)([./_-]|/|$)"),
        re.compile(r"(^|/)(schema\.sql|.*\.sqlite|.*\.db)$"),
    ],
    "schema-migrations": [
        re.compile(r"(^|/)migrations?/"),
        re.compile(r"(^|/)prisma/migrations/"),
        re.compile(r"(^|/)(schema\.(ts|py|rs|sql)|alembic|drizzle\.config|diesel\.toml)(/|$)"),
    ],
    "env-config-secrets": [
        re.compile(r"(^|/)\.env($|[._-])"),
        re.compile(r"(^|/)(env|settings|config)\.(ts|tsx|js|py|toml|ya?ml)$"),
        re.compile(r"(^|/)(dotenv|pydantic)([./_-]|/|$)"),
    ],
    "structured-logging-observability": [
        re.compile(r"(^|/)(sentry|opentelemetry|otel|prometheus|metrics|logger|logging|tracing|logtape)([./_-]|/|$)"),
    ],
    "request-guard-rate-limit": [
        re.compile(r"(^|/)(middleware|rate-?limit|ratelimit|csrf|cors|arcjet|helmet|waf)([./_-]|/|$)"),
    ],
    "input-validation-boundary": [
        re.compile(r"(^|/)(zod|joi|yup|pydantic|serde|validator|validation|schemas?)([./_-]|/|$)"),
    ],
    "async-jobs-workers": [
        re.compile(r"(^|/)(celery|bullmq|queues?|workers?|jobs?|cron|temporal|sidekiq|resque)([./_-]|/|$)"),
    ],
    "cache-ephemeral-state": [
        re.compile(r"(^|/)(redis|memcached|cache|ttl|lru)([./_-]|/|$)"),
    ],
    "files-artifacts-storage": [
        re.compile(r"(^|/)(uploads?|artifacts?|storage|blobs?)(/|$)"),
        re.compile(r"(^|/)(s3|gcs|r2)([./_-]|/|$)"),
    ],
    "realtime-pubsub": [
        re.compile(r"(^|/)(websocket|socket\.io|sse|pubsub|nats|kafka|mqtt)([./_-]|/|$)"),
    ],
    "ai-model-provider": [
        re.compile(r"(^|/)(openai|anthropic|ollama|llm|embeddings?|vectors?|qdrant|chroma|langchain)([./_-]|/|$)"),
    ],
    "payment-billing-rail": [
        re.compile(r"(^|/)(stripe|billing|payments?|checkout|invoice|ledger|x402)([./_-]|/|$)"),
    ],
    "release-ci-quality": [
        re.compile(r"(^|/)\.github/workflows/"),
        re.compile(r"(^|/)(dependabot|semantic-release|codecov|playwright|storybook|chromatic|knip)([./_-]|/|$)"),
    ],
    "i18n-localization-routing": [
        re.compile(r"(^|/)(i18n|locales?|messages|next-intl|crowdin|translations?)([./_-]|/|$)"),
    ],
    "attestation-crypto-boundary": [
        re.compile(r"(^|/)(attest|attestation|tee|enclave|signatures?|signer|crypto|zk|proof|certs?)([./_-]|/|$)"),
    ],
    "network-privacy-transport": [
        re.compile(r"(^|/)(mixnet|nym|onion|privacy|p2p|relay|tor|sphinx)([./_-]|/|$)"),
    ],
}

EXCLUDE_FILE_DIRS = {
    ".git",
    "node_modules",
    "dist",
    "build",
    ".next",
    "target",
    ".venv",
    "venv",
    "__pycache__",
    ".pytest_cache",
    "DerivedData",
}

IGNORED_SIGNAL_PARTS = {
    "docs",
    "doc",
    "examples",
    "example",
    "samples",
    "sample",
    "tests",
    "test",
    "fixtures",
    "fixture",
    "bench",
    "benchmark",
    "benchmarks",
    "vendor",
    "third_party",
    "third-party",
    "compiled",
    "data",
    "corpus",
    "outputs",
    "archive",
    "archives",
    "evals",
    "__tests__",
    ".claude-plugin",
    "notes",
}

TEXT_EXTS = {
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".mjs",
    ".cjs",
    ".py",
    ".rs",
    ".go",
    ".java",
    ".kt",
    ".cs",
    ".php",
    ".rb",
    ".swift",
    ".md",
    ".json",
    ".toml",
    ".yaml",
    ".yml",
    ".env",
}


@dataclass
class Evidence:
    repo: str
    source: str
    language: str | None = None
    hits: dict[str, list[str]] = field(default_factory=lambda: defaultdict(list))
    tree_truncated: bool = False
    note: str | None = None


def run(cmd: list[str], cwd: Path | None = None, timeout: int = 60) -> str:
    return subprocess.check_output(cmd, cwd=str(cwd) if cwd else None, text=True, stderr=subprocess.DEVNULL, timeout=timeout)


def load_zip_repo_rows(name: str) -> list[dict[str, object]]:
    with zipfile.ZipFile(ZIP_PATH) as z:
        rows = json.loads(z.read(name))
    return rows


def normalize_lang(lang: str | None) -> str | None:
    return {"Javascript": "JavaScript", "Typescript": "TypeScript", "Php": "PHP"}.get(lang, lang)


def path_matches_port(path: str, port: str) -> list[str]:
    low = path.lower()
    return [f"path:{path}" for pattern in TREE_PATTERNS[port] if pattern.search(low)]


def text_matches_port(text: str, port: str, label: str) -> list[str]:
    hits = []
    for pattern in PORTS[port]["text"]:  # type: ignore[index]
        if re.search(pattern, text, re.IGNORECASE):
            hits.append(f"text:{label}:{pattern}")
    return hits


def is_ignored_signal_path(path: str) -> bool:
    for part in path.split("/"):
        low = part.lower()
        canonical = low.strip("._-")
        if low in IGNORED_SIGNAL_PARTS or canonical in IGNORED_SIGNAL_PARTS:
            return True
        if canonical in {"test", "tests"} or canonical.startswith("test_") or canonical.endswith("_test"):
            return True
        if low.endswith(".test.ts") or low.endswith(".test.tsx") or low.endswith(".test.js") or low.endswith(".spec.ts"):
            return True
    return False


def is_ci_path(path: str) -> bool:
    return path.startswith(".github/workflows/") or "/.github/workflows/" in path


def fetch_github_tree(full_name: str) -> tuple[list[str], bool, str | None]:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache = CACHE_DIR / (full_name.replace("/", "__") + ".json")
    if cache.exists():
        data = json.loads(cache.read_text())
    else:
        try:
            raw = run(["gh", "api", f"repos/{full_name}/git/trees/HEAD?recursive=1"], timeout=90)
            data = json.loads(raw)
            cache.write_text(json.dumps(data), encoding="utf-8")
        except Exception as exc:
            return [], False, str(exc)
    return [item["path"] for item in data.get("tree", []) if item.get("type") == "blob"], bool(data.get("truncated")), None


def mine_oss(rows: list[dict[str, object]], source_name: str) -> list[Evidence]:
    results = []
    for idx, row in enumerate(rows, start=1):
        full_name = str(row["full_name"])
        language = normalize_lang(row.get("lang"))  # type: ignore[arg-type]
        ev = Evidence(repo=full_name, source=source_name, language=language)
        paths, truncated, error = fetch_github_tree(full_name)
        ev.tree_truncated = truncated
        if error:
            ev.note = error
            desc = str(row.get("desc") or "")
            for port in PORTS:
                ev.hits[port].extend(text_matches_port(desc, port, "description"))
        else:
            for path in paths:
                if is_ignored_signal_path(path) and not is_ci_path(path):
                    continue
                depth = path.count("/")
                # Keep the signal structural; deep source paths are useful only for named dirs.
                if depth > 5 and not any(s in path.lower() for s in ("migration", "schema", "auth", "worker", "queue", "middleware")):
                    continue
                for port in PORTS:
                    ev.hits[port].extend(path_matches_port(path, port))
            desc = str(row.get("desc") or "")
            for port in PORTS:
                desc_hits = text_matches_port(desc, port, "description")
                if desc_hits:
                    ev.hits[port].extend(desc_hits)
        ev.hits = {k: sorted(set(v))[:12] for k, v in ev.hits.items() if v}
        results.append(ev)
        print(f"OSS {idx:03d}/{len(rows)} {full_name} ports={len(ev.hits)}", file=sys.stderr)
    return results


def candidate_local_repos() -> list[Path]:
    repos: list[tuple[Path, datetime]] = []
    for gitdir in Path("/Users/mac").glob("**/.git"):
        if any(part in EXCLUDE_PARTS for part in gitdir.parts):
            continue
        repo = gitdir.parent
        try:
            top = Path(run(["git", "-C", str(repo), "rev-parse", "--show-toplevel"]).strip())
            if top != repo:
                continue
            ts = run(["git", "-C", str(repo), "log", "-1", "--format=%cI"]).strip()
            dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        except Exception:
            continue
        if dt >= CUTOFF:
            repos.append((repo, dt))
    # Keep active top-level project checkouts; avoid parent root and generated nested repos.
    filtered = []
    for repo, dt in sorted(repos, key=lambda item: str(item[0])):
        rel = repo.relative_to("/Users/mac")
        if str(repo) == "/Users/mac":
            continue
        if repo.name in EXCLUDE_LOCAL_REPO_NAMES:
            continue
        if len(rel.parts) > 2:
            continue
        if rel.parts and rel.parts[0] in {"Downloads", "W", "actions-runner-macos-work-2", "code"}:
            continue
        filtered.append((repo, dt))
    return [repo for repo, _ in filtered]


def iter_local_files(repo: Path) -> list[Path]:
    files: list[Path] = []
    for path in repo.rglob("*"):
        if len(files) >= 900:
            break
        if not path.is_file():
            continue
        if any(part in EXCLUDE_FILE_DIRS for part in path.parts):
            continue
        rel_parts = path.relative_to(repo).parts
        if any(part.lower() in IGNORED_SIGNAL_PARTS for part in rel_parts) and not is_ci_path(str(path.relative_to(repo))):
            continue
        if path.stat().st_size > 250_000:
            continue
        if path.suffix.lower() in TEXT_EXTS or path.name in {
            "Dockerfile",
            "Makefile",
            "package.json",
            "Cargo.toml",
            "pyproject.toml",
            "go.mod",
            "composer.json",
            "pom.xml",
        }:
            files.append(path)
    return files


def mine_local(repos: list[Path]) -> list[Evidence]:
    results = []
    for idx, repo in enumerate(repos, start=1):
        ev = Evidence(repo=str(repo), source="local_recent")
        files = iter_local_files(repo)
        for path in files:
            rel = str(path.relative_to(repo))
            for port in PORTS:
                ev.hits[port].extend(path_matches_port(rel, port))
            try:
                text = path.read_text(errors="ignore")
            except Exception:
                continue
            rel = str(path.relative_to(repo))
            if is_ci_path(rel):
                continue
            if len(text) > 80_000:
                text = text[:80_000]
            for port in PORTS:
                ev.hits[port].extend(text_matches_port(text, port, rel))
        ev.hits = {k: sorted(set(v))[:12] for k, v in ev.hits.items() if v}
        results.append(ev)
        print(f"LOCAL {idx:03d}/{len(repos)} {repo} ports={len(ev.hits)}", file=sys.stderr)
    return results


def summarize(evidence: list[Evidence]) -> dict[str, object]:
    source_counts: dict[str, Counter[str]] = defaultdict(Counter)
    source_repo_counts = Counter(ev.source for ev in evidence)
    per_port_repos: dict[str, dict[str, list[str]]] = {port: defaultdict(list) for port in PORTS}  # type: ignore[assignment]
    for ev in evidence:
        for port in ev.hits:
            source_counts[ev.source][port] += 1
            per_port_repos[port][ev.source].append(ev.repo)
    rows = []
    for port, meta in PORTS.items():
        mine = source_counts["local_recent"][port]
        stable = source_counts["oss_stable_100"][port]
        today = source_counts["oss_today_100"][port]
        if mine and stable:
            category = "core: present in mine and stable OSS"
        elif stable and not mine:
            category = "OSS blind spot or nonlocal product surface"
        elif mine and not stable:
            category = "local specialty or idiosyncrasy"
        else:
            category = "low evidence"
        rows.append(
            {
                "port": port,
                "absorbs": meta["absorbs"],
                "local_recent_repos": mine,
                "oss_stable_100_repos": stable,
                "oss_today_100_repos": today,
                "category": category,
                "nursery": meta["nursery"],
                "graduated": meta["graduated"],
                "consumers": CONSUMERS.get(port, []),
                "example_repos": {
                    source: repos[:8]
                    for source, repos in per_port_repos[port].items()
                },
            }
        )
    rows.sort(key=lambda row: (-(row["local_recent_repos"] + row["oss_stable_100_repos"]), row["port"]))  # type: ignore[operator]
    return {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "cutoff_for_local_recent": CUTOFF.isoformat(),
        "source_repo_counts": dict(source_repo_counts),
        "ports": rows,
        "repo_evidence": [
            {
                "repo": ev.repo,
                "source": ev.source,
                "language": ev.language,
                "tree_truncated": ev.tree_truncated,
                "note": ev.note,
                "ports": ev.hits,
            }
            for ev in evidence
        ],
    }


def write_markdown(data: dict[str, object]) -> None:
    lines = [
        "# Port Catalog v0",
        "",
        "Generated from real repository structure where available:",
        "",
        "- `oss_stable_100`: the 100 rows from `trending_100.json` inside `files.zip`, using GitHub tree paths plus descriptions.",
        "- `oss_today_100`: the 100 rows from `github_trending_today.json`, kept separate as a day-trending/debiasing slice.",
        "- `local_recent`: local git repos under `/Users/mac` with last commit on or after 2025-10-09, filtered to active project checkouts.",
        "",
        "The catalog is evidence-weighted, not final. Tree/path evidence is stronger than description hits; the JSON includes per-repo evidence.",
        "",
        "## Source Counts",
        "",
        "| Source | Repos mined |",
        "| --- | ---: |",
    ]
    for source, count in sorted(data["source_repo_counts"].items()):  # type: ignore[index,union-attr]
        lines.append(f"| `{source}` | {count} |")
    lines.extend(
        [
            "",
            "## Cross-Tab",
            "",
            "| Port | Local recent | OSS stable 100 | OSS today 100 | Category | What it absorbs | Nursery -> Graduated |",
            "| --- | ---: | ---: | ---: | --- | --- | --- |",
        ]
    )
    for row in data["ports"]:  # type: ignore[index]
        lines.append(
            "| `{port}` | {local_recent_repos} | {oss_stable_100_repos} | {oss_today_100_repos} | {category} | {absorbs} | {nursery} -> {graduated} |".format(
                **row
            )
        )
    lines.extend(["", "## Consumer Block Map", ""])
    for row in data["ports"]:  # type: ignore[index]
        consumers = row["consumers"]
        if not consumers:
            continue
        lines.append(f"### `{row['port']}`")
        lines.append("")
        for name, purpose in consumers:
            lines.append(f"- `{name}`: {purpose}")
        lines.append("")
    lines.extend(["## Example Repos By Port", ""])
    for row in data["ports"]:  # type: ignore[index]
        examples = row["example_repos"]
        if not examples:
            continue
        lines.append(f"### `{row['port']}`")
        lines.append("")
        for source, repos in sorted(examples.items()):
            lines.append(f"- `{source}`: " + ", ".join(f"`{repo}`" for repo in repos))
        lines.append("")
    lines.extend(
        [
            "## Initial Read",
            "",
            "- Core first ports are the ones high in both local and stable OSS: start with transport, persistence, env/config, logging/observability, CI/release, input validation, schema/migrations, async jobs, and request guard.",
            "- Local specialty ports are real but should not dominate the nursery core: attestation/crypto, network privacy transport, AI provider/model, and payment rails show up strongly in this workspace and should be second-layer/domain packs unless stable OSS also pulls them upward.",
            "- Graduation-only candidates are not a separate final set yet. The earliest signal is ports that appear in mature infrastructure repos through richer tree evidence: CI/release, observability, schema/migration, async jobs, cache, and authz/policy.",
            "",
        ]
    )
    (OUTPUTS / "port-catalog-v0.md").write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    OUTPUTS.mkdir(exist_ok=True)
    stable_rows = load_zip_repo_rows("trending_100.json")
    today_rows = load_zip_repo_rows("github_trending_today.json")
    local_repos = candidate_local_repos()
    evidence: list[Evidence] = []
    evidence.extend(mine_oss(stable_rows, "oss_stable_100"))
    evidence.extend(mine_oss(today_rows, "oss_today_100"))
    evidence.extend(mine_local(local_repos))
    data = summarize(evidence)
    (OUTPUTS / "port-catalog-v0.json").write_text(json.dumps(data, indent=2, sort_keys=True), encoding="utf-8")
    write_markdown(data)
    print(json.dumps(data["source_repo_counts"], indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
