// _kernel/check-ports.ts — the port-only rule as a PREDICATE, not advice.
//
//   node substrate/_kernel/check-ports.ts        (exit 1 on violation)
//
// AGENTS.md rule 1 ("import only each block's index.ts, never adapters/") is text, and the
// MOSS axiom is that text gets ignored — by agents with conflicting house rules, by context
// compression, by haste. This makes the one load-bearing rule executable: scan app/ for any
// import that reaches into a block's adapters/. Wired into every stamped project's test
// script, so an environment we cannot control still cannot ship a violation with green tests.

import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const kernel = dirname(fileURLToPath(import.meta.url))
const projectRoot = dirname(dirname(kernel)) // <root>/substrate/_kernel -> <root>
const appDir = join(projectRoot, 'app')

const violations: string[] = []
function scan(dir: string): void {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name !== 'node_modules' && !e.name.startsWith('.')) scan(p)
      continue
    }
    if (!/\.(ts|tsx|js|mjs)$/.test(e.name)) continue
    const lines = readFileSync(p, 'utf8').split('\n')
    lines.forEach((line, i) => {
      const m = line.match(/from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]/)
      const spec = m?.[1] ?? m?.[2]
      if (spec && spec.includes('/adapters/')) violations.push(`${relative(projectRoot, p)}:${i + 1}  ${spec}`)
    })
  }
}

try {
  scan(appDir)
} catch {
  console.log('check-ports: no app/ directory — nothing to check')
  process.exit(0)
}

if (violations.length) {
  try {
    const { recordEvidence } = await import('./evidence.ts')
    recordEvidence('port-rule', 'check-red', `app imports adapters: ${violations.slice(0, 3).join(' | ')}`)
  } catch {
    /* evidence is best-effort; the failure itself must still fail */
  }
  console.error('PORT RULE VIOLATION — app code imports an adapter directly (the seam is the contract):')
  for (const v of violations) console.error(`  ${v}`)
  console.error('Import the block’s index.ts instead; adapters swap by env var.')
  process.exit(1)
}
console.log(`check-ports: app/ imports ports only (${violations.length} violations)`)
