#!/usr/bin/env python3
"""Behavioral signal — the third evidence source, mined from shell history.

Repo-content mining asks "what words appear in the files"; this asks "what does the user
actually RUN". It is the strongest signal of which capabilities matter, because it is behavior,
not text. v0/v1 (file content) ranked payment/i18n highly; the history shows ZERO invocations of
either — and surfaces capabilities the file mines missed entirely (remote-exec, agent-orchestration).

Secret-safe: only command + subcommand TOKENS are read and counted. Argument values, env-var
assignments, URLs, and anything that could carry a token are stripped before counting and never
emitted. Output is aggregate frequency only; no raw history line is written anywhere.

Run: python3 tools/mine_shell_history.py
"""

from __future__ import annotations

import json
import os
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUTS = ROOT / "outputs"
HISTORY = Path(os.path.expanduser("~/.zsh_history"))

# A capability is named the way the port catalog names ports, so the two signals line up. Each
# maps to the base commands (or command families) that evidence it. The first match wins, so more
# specific capabilities are listed before generic runtimes.
CAPABILITY_COMMANDS: dict[str, set[str]] = {
    "agent-orchestration": {"agent", "codex", "claude", "agy", "cursor", "aider", "opencode"},
    "edge-model-runtime": {"omlx", "hf", "huggingface-cli", "ollama", "llama", "llama-cli", "llama-server", "mlx", "yt-dlp", "yt-dlp_macos", "download_model.sh"},
    "remote-exec-filesync": {"ssh", "scp", "sftp", "rsync", "mosh"},
    "release-ci-quality": {"git", "gh", "act", "semantic-release"},
    "python-runtime": {"uv", "python", "python3", "pip", "pip3", "poetry", "conda", "pytest"},
    "build-package": {"cargo", "npm", "pnpm", "yarn", "bun", "go", "make", "brew", "tsc", "node"},
    "containers-deploy": {"docker", "podman", "kubectl", "wrangler", "vercel", "fly", "flyctl", "terraform", "nixos-rebuild"},
    "persistence-store": {"psql", "sqlite3", "mysql", "mongosh"},
    "cache-ephemeral-state": {"redis-cli"},
    "attestation-crypto-boundary": {"gpg", "openssl", "age", "ssh-keygen", "cosign", "step"},
    "payment-billing-rail": {"stripe"},
    "ai-model-provider": {"openai", "anthropic"},
}
CMD_TO_CAP = {cmd: cap for cap, cmds in CAPABILITY_COMMANDS.items() for cmd in cmds}

# Capabilities that now have a runnable block (so the report can show coverage vs. behavior).
BUILT = {
    "persistence-store", "env-config-secrets", "structured-logging-observability",
    "transport-http-api", "input-validation-boundary", "request-guard-rate-limit",
    "async-jobs-workers", "cache-ephemeral-state", "schema-migrations",
    "files-artifacts-storage", "ai-model-provider", "network-privacy-transport",
    "attestation-crypto-boundary", "realtime-pubsub", "payment-billing-rail",
    "i18n-localization-routing",
}
BUILDING = {"agent-orchestration", "remote-exec-filesync", "edge-model-runtime"}  # wave 5, in flight

NOISE = {"cd", "ls", "clear", "exit", "cat", "tail", "head", "echo", "printf", "pwd", "which",
         "open", "mkdir", "rm", "mv", "cp", "nano", "vim", "vi", "source", "export", "sleep",
         "while", "do", "done", "for", "if", "then", "fi", "set", "unset", "type", "man"}

SEP = re.compile(r"\|\||&&|[|;]")
ASSIGN = re.compile(r"^\w+=")


def base_commands(line: str) -> list[str]:
    out = []
    for seg in SEP.split(line):
        toks = seg.strip().split()
        i = 0
        while i < len(toks) and (ASSIGN.match(toks[i]) or toks[i] in {"sudo", "time", "nohup", "exec", "command", "env"}):
            i += 1
        if i < len(toks):
            cmd = os.path.basename(toks[i])
            if re.match(r"^[A-Za-z0-9._-]+$", cmd):
                out.append(cmd)
    return out


def main() -> None:
    if not HISTORY.exists():
        raise SystemExit(f"no history at {HISTORY}")
    lines = []
    for ln in HISTORY.read_text(encoding="utf-8", errors="ignore").splitlines():
        ln = re.sub(r"^:\s*\d+:\d+;", "", ln).strip()
        if ln:
            lines.append(ln)

    cmd_freq: Counter[str] = Counter()
    cap_freq: Counter[str] = Counter()
    cap_cmds: dict[str, Counter[str]] = {c: Counter() for c in CAPABILITY_COMMANDS}
    for ln in lines:
        for cmd in base_commands(ln):
            cmd_freq[cmd] += 1
            cap = CMD_TO_CAP.get(cmd)
            if cap:
                cap_freq[cap] += 1
                cap_cmds[cap][cmd] += 1

    ranked = cap_freq.most_common()
    data = {
        "history_lines": len(lines),
        "capability_invocations": dict(ranked),
        "capability_commands": {c: dict(cap_cmds[c]) for c, _ in ranked},
    }
    (OUTPUTS / "shell-signal.json").write_text(json.dumps(data, indent=2), encoding="utf-8")

    def status(cap: str) -> str:
        if cap in BUILDING:
            return "building (wave 5)"
        if cap in BUILT:
            return "built"
        return "—"

    L = [
        "# Shell Signal — behavioral evidence (the third source)",
        "",
        f"Mined from {len(lines)} shell-history lines. This is what the user RUNS, the strongest",
        "signal of which capabilities matter. Secret-safe: only command tokens are counted; no",
        "argument values or raw lines are stored. Pairs with `port-catalog-v1` (repo content).",
        "",
        "## Capabilities by invocation count",
        "",
        "| Capability | Invocations | Top commands | Block status |",
        "| --- | ---: | --- | --- |",
    ]
    for cap, n in ranked:
        tops = ", ".join(f"`{c}`×{k}" for c, k in cap_cmds[cap].most_common(4))
        L.append(f"| `{cap}` | {n} | {tops} | {status(cap)} |")
    L += [
        "",
        "## The headline",
        "",
        "- **Agent-orchestration and remote-exec dominate** — driving agents and operating remote",
        "  hosts are the top behaviors, and neither was a port in the original catalog. Wave 5",
        "  builds both (plus edge-model-runtime).",
        "- **Zero `stripe`, zero `psql`/`redis-cli`/`docker`/`wrangler`.** The behavioral signal",
        "  contradicts the file-content ranking that put payment/i18n high. They are built but",
        "  carry no behavioral evidence here.",
        "- **The north star:** agent-orchestration is the #1 activity. If the nursery + agent-gates",
        "  succeed, this number should FALL over time — the measure of success is less manual",
        "  agent-driving, not more.",
        "",
    ]
    (OUTPUTS / "shell-signal.md").write_text("\n".join(L), encoding="utf-8")
    print(f"{len(lines)} lines -> {len(ranked)} capabilities")
    for cap, n in ranked:
        print(f"  {n:4}  {cap:32} {status(cap)}")


if __name__ == "__main__":
    main()
