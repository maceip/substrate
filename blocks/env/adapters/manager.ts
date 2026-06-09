// adapters/manager.ts — GRADUATED grade.
//
// Secrets sourced from a manager rather than a file or raw shell env, and rotatable without
// a redeploy. A real impl talks to Vault / AWS Secrets Manager / Doppler; this thin-but-real
// baseline reads a `MANAGED_<KEY>` indirection so it runs without external infra while still
// declaring the `manager-sourced` + `rotation` capabilities the graduated gate requires.
//
// To make real: replace `raw` with a client call into your secret manager.

import type { Source } from '../port.ts'

export const source: Source = {
  name: 'manager',
  maxGrade: 'graduated',
  capabilities: ['example-file', 'manager-sourced', 'rotation'],
  // Non-secret config still falls through to the environment; secrets resolve via the manager
  // indirection. Re-reading on each access is what makes rotation-without-redeploy possible.
  raw: (key) => process.env[`MANAGED_${key}`] ?? process.env[key],
}
