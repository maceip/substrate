#!/usr/bin/env python3
"""Port catalog v1 — the de-contaminated miner.

v0's `local_recent` column was inflated three ways (see SESSION.md item 9). This rebuilds it
with the same catalog definitions and the same (clean) OSS machinery, fixing only the local
side plus the counting rule:

  (a) DEDUP repo families — clones/forks share a git root-commit and/or origin remote. coss
      appears 3x, nym 3x; each was counted 3x. We collapse a family to ONE logical repo and
      merge its evidence.
  (b) OWNERSHIP — a clone of cosscom/coss or nymtech/nym is NOT "your repo". We classify each
      repo by origin owner and report an `local_own` count (origin owner == you, or no remote)
      separately from the raw deduped local count. `local_own` is the honest answer to
      "how many of MY repos use this".
  (c) VENDORED-TREE EXCLUSION — v0 matched `.venv` exactly, so `.venv-litert-convert/.../httpx/
      _status_codes.py` (HTTP 402 "Payment Required") slipped through as a `payment` hit. We
      exclude by prefix/suffix: .venv*, site-packages, .build*, _next, .local-secrets, *.min.js.
  (d) QUALIFICATION — a port counts for a repo only with a PATH/tree hit OR >=2 text hits in
      actual CODE files. A single word in a README or a JSON fixture no longer qualifies.

Reuses outputs of v0 for OSS (cached trees) so this is a fast, filesystem-only re-mine.
Run: python3 tools/mine_port_catalog_v1.py
"""

from __future__ import annotations

import json
import re
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

# Reuse v0's catalog definitions and the clean OSS machinery verbatim.
import mine_port_catalog as v0

ROOT = v0.ROOT
OUTPUTS = v0.OUTPUTS
CUTOFF = v0.CUTOFF
PORTS = v0.PORTS
CONSUMERS = v0.CONSUMERS

# You. Origin owners that count as "your repo". A repo with no remote is local-only => yours.
OWN_OWNERS = {"maceip", "ryan-macarthur", "rmacarthur"}

# The nursery itself self-references every block we build here (blocks/payment, blocks/i18n, the
# OSS tree cache, ...), so as a demand signal it is pure circularity. Exclude it.
SELF_REPOS = {str(ROOT)}

# "ledger" is the single worst payment token — it matches execution/audit logs and blockchains
# far more than money. Drop it from payment's text matcher (the structural matcher already lost
# it). Mutating v0's dict is fine for this one-shot run.
PORTS["payment-billing-rail"]["text"] = [
    r"\bStripe\b",
    r"\bbilling\b",
    r"\binvoice\b",
    r"\bcheckout\b",
    r"\bsubscription",
    r"\bx402\b",
]

# --- fix (d): a few collision-prone tokens v0 over-trusted -----------------------------------
# "messages" matched network-protocol message dirs as i18n; "ledger" matched audit/exec logs and
# blockchains as payment. Drop them from the structural matchers; the real signal survives on the
# specific tokens (i18n/locale/next-intl/crowdin; stripe/checkout/invoice/x402).
TREE_PATTERNS = dict(v0.TREE_PATTERNS)
TREE_PATTERNS["i18n-localization-routing"] = [
    re.compile(r"(^|/)(i18n|locales?|next-intl|crowdin|translations?)([./_-]|/|$)"),
]
TREE_PATTERNS["payment-billing-rail"] = [
    re.compile(r"(^|/)(stripe|billing|payments?|checkout|invoice|subscriptions?|x402)([./_-]|/|$)"),
]

CODE_EXTS = {".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py", ".rs", ".go", ".java", ".kt", ".cs", ".php", ".rb", ".swift"}


def is_vendored_path(rel: str) -> bool:
    """fix (c): exclude dependency/build/secret trees v0's exact-match missed."""
    low = rel.lower()
    if low.endswith((".min.js", ".min.css", ".min.mjs")):
        return True
    if "/_next/" in low or low.startswith("_next/"):
        return True
    for part in low.split("/"):
        if part in v0.EXCLUDE_FILE_DIRS or part == ".cache":
            return True
        if part.startswith(".venv") or part.startswith("venv"):
            return True
        if part in {"site-packages", "vendor", "vendored", "third_party", "third-party", "bower_components"}:
            return True
        if part.startswith(".build") or part.startswith(".local-secrets") or part.startswith(".gradle"):
            return True
        if part in {"dist", "build", "out", ".next", "target", "deriveddata", "__pycache__"}:
            return True
    return False


def path_matches_port(path: str, port: str) -> list[str]:
    low = path.lower()
    return [f"path:{path}" for pattern in TREE_PATTERNS[port] if pattern.search(low)]


@dataclass
class LocalRepo:
    path: Path
    root_commit: str | None
    origin: str | None
    owner: str | None
    is_own: bool


def normalize_origin(url: str) -> tuple[str, str | None]:
    """Return (normalized_url, owner). Handles https and git@ forms."""
    u = url.strip().lower()
    u = u[:-4] if u.endswith(".git") else u
    m = re.search(r"github\.com[/:]([^/]+)/([^/]+)", u)
    owner = m.group(1) if m else None
    return u, owner


def git(repo: Path, *args: str) -> str | None:
    try:
        return v0.run(["git", "-C", str(repo), *args]).strip()
    except Exception:
        return None


def candidate_local_repos() -> list[LocalRepo]:
    """v0's candidate set, annotated with dedup key + ownership."""
    raw = v0.candidate_local_repos()
    out: list[LocalRepo] = []
    for repo in raw:
        roots = git(repo, "rev-list", "--max-parents=0", "HEAD") or ""
        root_commit = roots.split("\n")[-1][:40] if roots else None
        origin_url = git(repo, "remote", "get-url", "origin")
        origin, owner = (None, None)
        if origin_url:
            origin, owner = normalize_origin(origin_url)
        is_own = (origin is None) or (owner in OWN_OWNERS)
        out.append(LocalRepo(repo, root_commit, origin, owner, is_own))
    return out


def dedup_families(repos: list[LocalRepo]) -> list[list[LocalRepo]]:
    """fix (a): group repos sharing an origin or a root commit into one family."""
    key_of: dict[Path, str] = {}
    union: dict[str, str] = {}

    def find(k: str) -> str:
        while union.get(k, k) != k:
            union[k] = union.get(union[k], union[k])
            k = union[k]
        return k

    def link(a: str, b: str) -> None:
        union.setdefault(a, a)
        union.setdefault(b, b)
        union[find(a)] = find(b)

    for r in repos:
        keys = []
        if r.origin:
            keys.append(f"origin:{r.origin}")
        if r.root_commit:
            keys.append(f"root:{r.root_commit}")
        if not keys:
            keys.append(f"path:{r.path}")
        primary = keys[0]
        for k in keys[1:]:
            link(primary, k)
        key_of[r.path] = primary

    groups: dict[str, list[LocalRepo]] = defaultdict(list)
    for r in repos:
        groups[find(key_of[r.path])].append(r)
    return list(groups.values())


def mine_local_family(family: list[LocalRepo]) -> v0.Evidence:
    """Merge evidence across a deduped family into one logical repo."""
    # Representative = the most recently committed checkout (shortest path as tiebreak).
    rep = sorted(family, key=lambda r: len(str(r.path)))[0]
    is_own = any(r.is_own for r in family) if all(r.origin for r in family) else any(r.is_own for r in family)
    label = rep.path.name
    if len(family) > 1:
        label += f" (+{len(family) - 1} clone{'s' if len(family) > 2 else ''})"
    ev = v0.Evidence(repo=label, source="local_recent")
    ev.language = rep.owner or "local"
    ev.note = json.dumps(
        {
            "members": [r.path.name for r in family],
            "origin": rep.origin,
            "owner": rep.owner,
            "is_own": is_own,
        }
    )
    for r in family:
        for path in v0.iter_local_files(r.path):
            rel = str(path.relative_to(r.path))
            if is_vendored_path(rel):
                continue
            for port in PORTS:
                ev.hits[port].extend(path_matches_port(rel, port))
            if v0.is_ci_path(rel):
                continue
            try:
                text = path.read_text(errors="ignore")
            except Exception:
                continue
            if len(text) > 80_000:
                text = text[:80_000]
            for port in PORTS:
                ev.hits[port].extend(v0.text_matches_port(text, port, rel))
    ev.hits = {k: sorted(set(v))[:14] for k, v in ev.hits.items() if v}
    return ev, is_own


def qualifies(hits: list[str]) -> bool:
    """fix (d): a path/tree hit, or >=2 text hits in distinct CODE files."""
    code_files = set()
    for h in hits:
        if h.startswith("path:"):
            return True
        if h.startswith("text:"):
            rel = h.split(":", 2)[1]
            if any(rel.lower().endswith(ext) for ext in CODE_EXTS):
                code_files.add(rel)
    return len(code_files) >= 2


def main() -> None:
    # OSS evidence: reuse v0's raw hits (cached trees), re-qualified under the new rule.
    v0json = json.loads((OUTPUTS / "port-catalog-v0.json").read_text())
    oss_evidence = [r for r in v0json["repo_evidence"] if r["source"] != "local_recent"]

    repos = [r for r in candidate_local_repos() if str(r.path) not in SELF_REPOS]
    families = dedup_families(repos)
    print(f"local: {len(repos)} checkouts -> {len(families)} deduped families", file=sys.stderr)

    local_records = []
    for i, fam in enumerate(families, 1):
        ev, is_own = mine_local_family(fam)
        local_records.append((ev, is_own))
        print(f"LOCAL {i:02d}/{len(families)} {ev.repo} own={is_own} ports={len(ev.hits)}", file=sys.stderr)

    # Counts. OSS uses qualified raw hits; local uses qualified, deduped, with an own-only column.
    counts: dict[str, Counter] = {s: Counter() for s in ("oss_stable_100", "oss_today_100", "local_recent", "local_own")}
    per_port_repos: dict[str, dict[str, list[str]]] = {p: defaultdict(list) for p in PORTS}

    for r in oss_evidence:
        for port, hits in r["ports"].items():
            if qualifies(hits):
                counts[r["source"]][port] += 1
                per_port_repos[port][r["source"]].append(r["repo"])

    for ev, is_own in local_records:
        for port, hits in ev.hits.items():
            if qualifies(hits):
                counts["local_recent"][port] += 1
                per_port_repos[port]["local_recent"].append(ev.repo)
                if is_own:
                    counts["local_own"][port] += 1
                    per_port_repos[port]["local_own"].append(ev.repo)

    rows = []
    for port, meta in PORTS.items():
        own = counts["local_own"][port]
        mine = counts["local_recent"][port]
        stable = counts["oss_stable_100"][port]
        today = counts["oss_today_100"][port]
        if own and stable:
            category = "core: present in your repos and stable OSS"
        elif stable and not mine:
            category = "OSS surface, absent locally"
        elif own and not stable:
            category = "your specialty"
        elif mine and not own:
            category = "third-party clones only (not your code)"
        else:
            category = "low evidence"
        rows.append(
            {
                "port": port,
                "absorbs": meta["absorbs"],
                "local_own_repos": own,
                "local_recent_repos": mine,
                "oss_stable_100_repos": stable,
                "oss_today_100_repos": today,
                "category": category,
                "nursery": meta["nursery"],
                "graduated": meta["graduated"],
                "consumers": CONSUMERS.get(port, []),
                "example_repos": {s: rp[:8] for s, rp in per_port_repos[port].items()},
            }
        )
    # Rank by YOUR repos first, then stable OSS as the guardrail tiebreak.
    rows.sort(key=lambda r: (-(r["local_own_repos"] * 2 + r["oss_stable_100_repos"]), r["port"]))

    own_families = sum(1 for _, own in local_records if own)
    data = {
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "cutoff_for_local_recent": CUTOFF.isoformat(),
        "source_repo_counts": {
            "oss_stable_100": 100,
            "oss_today_100": 100,
            "local_recent_checkouts": len(repos),
            "local_recent_families": len(families),
            "local_own_families": own_families,
        },
        "ports": rows,
        "repo_evidence": [
            {"repo": ev.repo, "source": "local_recent", "is_own": own, "note": ev.note, "ports": ev.hits}
            for ev, own in local_records
        ],
    }
    (OUTPUTS / "port-catalog-v1.json").write_text(json.dumps(data, indent=2, sort_keys=True), encoding="utf-8")
    write_markdown(data)
    print(json.dumps(data["source_repo_counts"], indent=2))


def write_markdown(data: dict) -> None:
    L = [
        "# Port Catalog v1 (de-contaminated)",
        "",
        "Supersedes v0. Same catalog definitions and OSS machinery; the `local_recent` column is",
        "rebuilt to fix the contamination logged in SESSION.md item 9:",
        "",
        "- **Deduped**: clone/fork families (shared git root-commit or origin) collapse to one repo.",
        "- **Ownership**: `local_own` counts only repos whose origin owner is you (or have no remote).",
        "  A clone of someone else's repo is not your code. Use `local_own` for prioritization.",
        "- **Vendored trees excluded**: .venv*/site-packages/.build/_next/.min.js no longer match.",
        "- **Qualified**: a port counts only with a path/tree hit or >=2 hits in real code files.",
        "",
        "## Source Counts",
        "",
        "| Source | Count |",
        "| --- | ---: |",
    ]
    for k, v in data["source_repo_counts"].items():
        L.append(f"| `{k}` | {v} |")
    L += [
        "",
        "## Cross-Tab (ranked by YOUR repos)",
        "",
        "| Port | Your repos | Local (deduped) | OSS stable | OSS today | Category |",
        "| --- | ---: | ---: | ---: | ---: | --- |",
    ]
    for r in data["ports"]:
        L.append(
            "| `{port}` | {local_own_repos} | {local_recent_repos} | {oss_stable_100_repos} | {oss_today_100_repos} | {category} |".format(**r)
        )
    L += ["", "## Example Repos By Port (your repos only)", ""]
    for r in data["ports"]:
        own = r["example_repos"].get("local_own")
        if not own:
            continue
        L.append(f"### `{r['port']}` ({r['local_own_repos']})")
        L.append("")
        L.append("- " + ", ".join(f"`{x}`" for x in own))
        L.append("")
    (OUTPUTS / "port-catalog-v1.md").write_text("\n".join(L), encoding="utf-8")


if __name__ == "__main__":
    main()
