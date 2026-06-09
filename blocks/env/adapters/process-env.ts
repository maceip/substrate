// adapters/process-env.ts — NURSERY grade.
// Raw process.env, nothing else. No manifest, no manager. Fine for the first hour.

import type { Source } from '../port.ts'

export const source: Source = {
  name: 'process-env',
  maxGrade: 'nursery',
  capabilities: [],
  raw: (key) => process.env[key],
}
