// block.test.ts — invariants of the schema-migrations block. Dependency-free; run with node.
//   node schema-migrations/block.test.ts
//
// Proves the claims the block exists to make:
//   1. The port holds: the same migration lifecycle yields the same result under every adapter.
//   2. Applying is idempotent: twice = once.
//   3. The protected evaluator refuses loosening.

import assert from 'node:assert/strict'
import { GATES, assertNoLoosening, evaluate } from './gates.ts'

let failures = 0
function check(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve()
    .then(fn)
    .then(() => console.log(`  ✓ ${name}`))
    .catch((e) => {
      failures++
      console.log(`  ✗ ${name}\n      ${e.message}`)
    })
}

console.log('\nschema-migrations block invariants:')

// 1. Port invariance: the same migration lifecycle yields the same result under every adapter.
//    index.ts caches its adapter per process, so we fingerprint each adapter in a subprocess.
await check('port invariance: memory and file agree on migration behavior', async () => {
  const { execFileSync } = await import('node:child_process')
  const run = (adapter: string) =>
    execFileSync(process.execPath, [new URL('./_fingerprint.ts', import.meta.url).pathname], {
      env: { ...process.env, MIGRATIONS_ADAPTER: adapter },
      encoding: 'utf8',
    }).trim()
  assert.equal(run('memory'), run('file'), 'memory and file diverged')
})

// 2. Idempotency: applying twice = once. The applied set, not hope, is what prevents re-runs.
await check('idempotency: a second apply runs nothing and the history holds', async () => {
  const { adapter } = await import('./adapters/memory.ts')
  const m = await adapter.open('test_idem')
  m.register({ id: '001-a', version: 1, up: (c) => c.exec('step a') })
  m.register({ id: '002-b', version: 2, up: (c) => c.exec('step b') })
  assert.equal((await m.apply()).length, 2)
  assert.equal((await m.apply()).length, 0)
  assert.equal((await m.applied()).length, 2)
})

// 3. The evaluator escalates required grade as signals cross thresholds.
await check('gate escalation: nursery -> elementary -> graduated', () => {
  const base = { capabilities: new Set<string>(), adapterGrade: 'nursery' as const, migrationsRegistered: 0, migrationsWithDown: 0, versionsMonotonic: true }
  assert.equal(evaluate({ ...base, signals: { prodData: false, schemaChanges: 1, instances: 1 } }).requiredGrade, 'nursery')
  assert.equal(evaluate({ ...base, signals: { prodData: true, schemaChanges: 1, instances: 1 } }).requiredGrade, 'elementary')
  assert.equal(evaluate({ ...base, signals: { prodData: true, schemaChanges: 14, instances: 4 } }).requiredGrade, 'graduated')
})

// 4. AEvo: loosening is rejected; tightening is allowed.
await check('assertNoLoosening: removing a gate is a violation', () => {
  const loosened = GATES.slice(0, 1) // dropped the graduated gate
  assert.ok(assertNoLoosening(GATES, loosened).length > 0)
})
await check('assertNoLoosening: adding a gate is allowed (tightening)', () => {
  const tightened = [...GATES, { ...GATES[0], id: 'gate:extra' }]
  assert.equal(assertNoLoosening(GATES, tightened).length, 0)
})

// AEvo armed: the live gates may not loosen the baseline committed at git HEAD
// (block.json). Tightening passes; loosening fails until a human commits it.
await check('PROTECTED: live gates do not loosen the committed baseline', async () => {
  const { checkProtection } = await import('../_kernel/protect.ts')
  const res = checkProtection(new URL('.', import.meta.url).pathname, GATES)
  if (res.baseline === 'none') return console.log('      (no committed baseline yet — protection arms on first commit)')
  assert.deepEqual(res.violations, [])
})

console.log('')
if (failures > 0) {
  console.log(`${failures} failing\n`)
  process.exit(1)
}
console.log('all green\n')
