# Port Catalog v1 (de-contaminated)

Supersedes v0. Same catalog definitions and OSS machinery; the `local_recent` column is
rebuilt to fix the contamination logged in SESSION.md item 9:

- **Deduped**: clone/fork families (shared git root-commit or origin) collapse to one repo.
- **Ownership**: `local_own` counts only repos whose origin owner is you (or have no remote).
  A clone of someone else's repo is not your code. Use `local_own` for prioritization.
- **Vendored trees excluded**: .venv*/site-packages/.build/_next/.min.js no longer match.
- **Qualified**: a port counts only with a path/tree hit or >=2 hits in real code files.

## Source Counts

| Source | Count |
| --- | ---: |
| `oss_stable_100` | 100 |
| `oss_today_100` | 100 |
| `local_recent_checkouts` | 41 |
| `local_recent_families` | 29 |
| `local_own_families` | 20 |

## Cross-Tab (ranked by YOUR repos)

| Port | Your repos | Local (deduped) | OSS stable | OSS today | Category |
| --- | ---: | ---: | ---: | ---: | --- |
| `release-ci-quality` | 17 | 22 | 96 | 89 | core: present in your repos and stable OSS |
| `env-config-secrets` | 16 | 22 | 82 | 66 | core: present in your repos and stable OSS |
| `cache-ephemeral-state` | 12 | 17 | 64 | 38 | core: present in your repos and stable OSS |
| `auth-identity-session` | 12 | 17 | 62 | 43 | core: present in your repos and stable OSS |
| `async-jobs-workers` | 13 | 19 | 59 | 41 | core: present in your repos and stable OSS |
| `input-validation-boundary` | 10 | 14 | 59 | 39 | core: present in your repos and stable OSS |
| `structured-logging-observability` | 8 | 12 | 63 | 48 | core: present in your repos and stable OSS |
| `authorization-policy` | 13 | 21 | 45 | 25 | core: present in your repos and stable OSS |
| `ai-model-provider` | 11 | 16 | 43 | 30 | core: present in your repos and stable OSS |
| `attestation-crypto-boundary` | 14 | 19 | 36 | 21 | core: present in your repos and stable OSS |
| `persistence-store` | 7 | 11 | 50 | 38 | core: present in your repos and stable OSS |
| `i18n-localization-routing` | 6 | 9 | 46 | 39 | core: present in your repos and stable OSS |
| `transport-http-api` | 7 | 13 | 42 | 27 | core: present in your repos and stable OSS |
| `schema-migrations` | 12 | 16 | 30 | 19 | core: present in your repos and stable OSS |
| `files-artifacts-storage` | 10 | 14 | 29 | 23 | core: present in your repos and stable OSS |
| `request-guard-rate-limit` | 7 | 9 | 31 | 20 | core: present in your repos and stable OSS |
| `network-privacy-transport` | 10 | 13 | 22 | 7 | core: present in your repos and stable OSS |
| `payment-billing-rail` | 7 | 12 | 21 | 14 | core: present in your repos and stable OSS |
| `realtime-pubsub` | 4 | 6 | 25 | 19 | core: present in your repos and stable OSS |

## Example Repos By Port (your repos only)

### `release-ci-quality` (17)

- `vet (+1 clone)`, `attested-workload`, `runcards (+1 clone)`, `cordon`, `cosmo-ws3 (+4 clones)`, `cursor-anchor`, `faest-pass`, `heart-transplant`

### `env-config-secrets` (16)

- `vet (+1 clone)`, `attested-workload`, `runcards (+1 clone)`, `cordon`, `cosmo-ws3 (+4 clones)`, `cursor-anchor`, `heart-transplant`, `inherent`

### `cache-ephemeral-state` (12)

- `vet (+1 clone)`, `runcards (+1 clone)`, `cordon`, `cursor-anchor`, `heart-transplant`, `local-sphinx (+2 clones)`, `pinback`, `private-compute-services`

### `auth-identity-session` (12)

- `vet (+1 clone)`, `attested-workload`, `runcards (+1 clone)`, `cursor-anchor`, `heart-transplant`, `local-sphinx (+2 clones)`, `pinback`, `private-compute-services`

### `async-jobs-workers` (13)

- `vet (+1 clone)`, `attested-workload`, `runcards (+1 clone)`, `cordon`, `cursor-anchor`, `heart-transplant`, `inherent`, `local-sphinx (+2 clones)`

### `input-validation-boundary` (10)

- `vet (+1 clone)`, `attested-workload`, `runcards (+1 clone)`, `cordon`, `heart-transplant`, `local-sphinx (+2 clones)`, `private-compute-services`, `tenet`

### `structured-logging-observability` (8)

- `runcards (+1 clone)`, `cordon`, `cursor-anchor`, `heart-transplant`, `neural`, `pinback`, `private-compute-services`, `weaver`

### `authorization-policy` (13)

- `vet (+1 clone)`, `attested-workload`, `runcards (+1 clone)`, `cordon`, `cosmo-ws3 (+4 clones)`, `cursor-anchor`, `heart-transplant`, `local-sphinx (+2 clones)`

### `ai-model-provider` (11)

- `vet (+1 clone)`, `runcards (+1 clone)`, `cordon`, `cosmo-ws3 (+4 clones)`, `cursor-anchor`, `heart-transplant`, `local-sphinx (+2 clones)`, `private-compute-services`

### `attestation-crypto-boundary` (14)

- `vet (+1 clone)`, `attested-workload`, `runcards (+1 clone)`, `cordon`, `cursor-anchor`, `faest-pass`, `heart-transplant`, `local-sphinx (+2 clones)`

### `persistence-store` (7)

- `cosmo-ws3 (+4 clones)`, `heart-transplant`, `local-sphinx (+2 clones)`, `private-compute-services`, `tenet`, `weaver`, `webkitium`

### `i18n-localization-routing` (6)

- `cursor-anchor`, `pinback`, `private-compute-services`, `tenet-www`, `weaver`, `webkitium`

### `transport-http-api` (7)

- `vet (+1 clone)`, `heart-transplant`, `local-sphinx (+2 clones)`, `private-compute-services`, `tenet`, `weaver`, `webkitium`

### `schema-migrations` (12)

- `vet (+1 clone)`, `attested-workload`, `runcards (+1 clone)`, `cosmo-ws3 (+4 clones)`, `heart-transplant`, `inherent`, `local-sphinx (+2 clones)`, `neural`

### `files-artifacts-storage` (10)

- `vet (+1 clone)`, `attested-workload`, `cordon`, `cosmo-ws3 (+4 clones)`, `heart-transplant`, `inherent`, `local-sphinx (+2 clones)`, `private-compute-services`

### `request-guard-rate-limit` (7)

- `attested-workload`, `runcards (+1 clone)`, `heart-transplant`, `local-sphinx (+2 clones)`, `tenet`, `weaver`, `webkitium`

### `network-privacy-transport` (10)

- `attested-workload`, `runcards (+1 clone)`, `heart-transplant`, `inherent`, `local-sphinx (+2 clones)`, `private-compute-services`, `tenet`, `tenet-www`

### `payment-billing-rail` (7)

- `cursor-anchor`, `local-sphinx (+2 clones)`, `pinback`, `tenet`, `tenet-www`, `weaver`, `webkitium`

### `realtime-pubsub` (4)

- `heart-transplant`, `local-sphinx (+2 clones)`, `tenet`, `weaver`
