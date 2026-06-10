# Shell Signal — behavioral evidence (the third source)

Mined from 1067 shell-history lines. This is what the user RUNS, the strongest
signal of which capabilities matter. Secret-safe: only command tokens are counted; no
argument values or raw lines are stored. Pairs with `port-catalog-v1` (repo content).

## Capabilities by invocation count

| Capability | Invocations | Top commands | Block status |
| --- | ---: | --- | --- |
| `agent-orchestration` | 195 | `agent`×68, `codex`×65, `claude`×56, `agy`×6 | building (wave 5) |
| `remote-exec-filesync` | 131 | `ssh`×68, `scp`×63 | building (wave 5) |
| `python-runtime` | 41 | `uv`×19, `python`×17, `python3`×4, `pip`×1 | — |
| `edge-model-runtime` | 40 | `omlx`×13, `yt-dlp_macos`×11, `hf`×8, `download_model.sh`×6 | building (wave 5) |
| `release-ci-quality` | 36 | `git`×24, `gh`×12 | — |
| `build-package` | 4 | `brew`×4 | — |
| `attestation-crypto-boundary` | 2 | `ssh-keygen`×2 | built |

## The headline

- **Agent-orchestration and remote-exec dominate** — driving agents and operating remote
  hosts are the top behaviors, and neither was a port in the original catalog. Wave 5
  builds both (plus edge-model-runtime).
- **Zero `stripe`, zero `psql`/`redis-cli`/`docker`/`wrangler`.** The behavioral signal
  contradicts the file-content ranking that put payment/i18n high. They are built but
  carry no behavioral evidence here.
- **The north star:** agent-orchestration is the #1 activity. If the nursery + agent-gates
  succeed, this number should FALL over time — the measure of success is less manual
  agent-driving, not more.
