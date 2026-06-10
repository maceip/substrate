// demo.ts — a tiny schema lifecycle built ONLY against ./index.ts
//
// It never imports an adapter, a grade, or a gate directly. It registers three migrations,
// plans, applies, re-applies (idempotent), then proves the swap: the same lifecycle runs in
// two subprocesses under different MIGRATIONS_ADAPTER values and the fingerprints match —
// that is the port doing its job. Then it runs the gate evaluator across three project
// lifecycles to show requirements activating as thresholds are crossed.
//
//   node blocks/schema-migrations/demo.ts
//   MIGRATIONS_ADAPTER=memory node blocks/schema-migrations/demo.ts

import { open, checkGrade, currentGrade } from './index.ts'
import type { Migration } from './index.ts'

const MIGRATIONS: Migration[] = [
  {
    id: '001-notes-baseline',
    version: 1,
    up: (c) => c.exec('create notes (id, created_at, updated_at, version, title, body)'),
    down: (c) => c.exec('drop notes'),
  },
  {
    id: '002-notes-tags',
    version: 2,
    up: (c) => c.exec('add tags to notes'),
    down: (c) => c.exec('drop tags from notes'),
  },
  {
    id: '003-backfill-tags',
    version: 3,
    up: (c) => c.exec('backfill tags=[] on existing notes'), // a backfill task — the catalog's one-off job consumer
    down: (c) => c.exec('noop'),
  },
]

async function migrateApp() {
  const m = await open('demo_notes')
  for (const mig of MIGRATIONS) m.register(mig)
  await m.rollback(0) // idempotent across demo re-runs: start from a clean history
  const plan = await m.plan()
  const applied = await m.apply()
  const again = await m.apply() // second run: nothing to do
  const history = await m.applied()
  await m.close()
  return { plan, applied, again, history }
}

function fmt(label: string, e: Awaited<ReturnType<typeof checkGrade>>) {
  const verdict = e.ok ? 'OK' : e.underGraded ? `UNDER-GRADED (need ${e.requiredGrade})` : 'REQUIREMENTS UNMET'
  const lines = [`  ${label} -> required:${e.requiredGrade}  ${verdict}`]
  for (const u of e.unmet) lines.push(`      ✗ ${u.requirement}: ${u.describe}`)
  return lines.join('\n')
}

const grade = await currentGrade()
console.log(`\n=== schema-migrations block — adapter grade: ${grade} ===\n`)

const { plan, applied, again, history } = await migrateApp()
console.log('migration lifecycle (identical under any adapter):')
console.log(`  plan: ${plan.map((p) => `v${p.version}`).join(', ')}`)
for (const a of applied) console.log(`  applied ${a.id} v${a.version}: ${a.steps.join('; ')}`)
console.log(`  re-run applied ${again.length} (idempotent), history holds ${history.length}`)

// The swap, proven: the same lifecycle under two adapters yields the same fingerprint.
const { execFileSync } = await import('node:child_process')
const run = (adapter: string) =>
  execFileSync(process.execPath, [new URL('./_fingerprint.ts', import.meta.url).pathname], {
    env: { ...process.env, MIGRATIONS_ADAPTER: adapter },
    encoding: 'utf8',
  }).trim()
console.log(`\nswap proof: memory vs file fingerprints ${run('memory') === run('file') ? 'IDENTICAL' : 'DIVERGED'}`)

console.log('\ngate evaluation across the project lifecycle:')
console.log(fmt('day 1   (dev, 1 change)          ', await checkGrade({ prodData: false, schemaChanges: 1, instances: 1 }, { registered: MIGRATIONS })))
console.log(fmt('month 2 (prod, 3 changes)        ', await checkGrade({ prodData: true, schemaChanges: 3, instances: 1 }, { registered: MIGRATIONS })))
console.log(fmt('month 9 (4 instances, 14 changes)', await checkGrade({ prodData: true, schemaChanges: 14, instances: 4 }, { registered: MIGRATIONS })))
console.log('')
