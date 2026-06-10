// _fingerprint.ts — test helper. Runs a fixed migration lifecycle against whatever adapter
// MIGRATIONS_ADAPTER selects and prints a stable fingerprint of the observable result.
// Used by block.test.ts to assert port invariance across adapters.

import { open } from './index.ts'
import type { Migration } from './index.ts'

const MIGRATIONS: Migration[] = [
  { id: '001-baseline', version: 1, up: (c) => c.exec('create items (id, created_at, updated_at, version)'), down: (c) => c.exec('drop items') },
  { id: '002-add-flag', version: 2, up: (c) => c.exec('add flag to items'), down: (c) => c.exec('drop flag from items') },
  { id: '003-backfill-flag', version: 3, up: (c) => c.exec('backfill flag=false on existing items'), down: (c) => c.exec('noop') },
]

const m = await open('test_migrations')
for (const mig of MIGRATIONS) m.register(mig)
await m.rollback(0) // clean slate so re-runs are deterministic
const plan = await m.plan()
const first = await m.apply()
const second = await m.apply() // idempotent: nothing new
const history = await m.applied()
const planFromV1 = await m.plan(1) // a hypothetical database sitting at version 1
const undone = await m.rollback(1)
const reapplied = await m.apply(2) // apply up to a target only
await m.rollback(0) // leave clean
await m.close()

process.stdout.write(
  JSON.stringify({
    plan: plan.map((p) => `${p.version}:${p.hasDown}`),
    first: first.map((a) => `${a.id}@${a.version}:${a.steps.join('|')}`),
    second: second.length,
    history: history.map((h) => h.version),
    planFromV1: planFromV1.map((p) => p.version),
    undone: undone.map((u) => u.id),
    reapplied: reapplied.map((a) => a.version),
  }),
)
