// block.test.ts — invariants of the async-jobs block. Dependency-free; run with node.
//   node async-jobs/block.test.ts
//
// Proves the two claims the block exists to make:
//   1. The port holds: the same job sequence yields the same terminal outcome under every adapter.
//   2. The protected evaluator refuses loosening.

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

console.log('\nasync-jobs block invariants:')

// 1. Port invariance: the same job sequence yields the same terminal outcome under every
//    adapter. index.ts caches its adapter per process, so we fingerprint each in a subprocess.
await check('port invariance: inline, retry, and durable agree on app behavior', async () => {
  const { execFileSync } = await import('node:child_process')
  const run = (adapter: string) =>
    execFileSync(process.execPath, [new URL('./_fingerprint.ts', import.meta.url).pathname], {
      env: { ...process.env, JOBS_ADAPTER: adapter },
      encoding: 'utf8',
    }).trim()
  const inline = run('inline')
  assert.equal(inline, run('retry'), 'inline and retry diverged')
  assert.equal(inline, run('durable'), 'inline and durable diverged')
})

// 2. The evaluator escalates required grade as signals cross thresholds.
await check('gate escalation: nursery -> elementary -> graduated', () => {
  const base = { capabilities: new Set<string>(), adapterGrade: 'nursery' as const }
  assert.equal(evaluate({ ...base, signals: { external: false, prodJobs: false, instances: 1, jobsPerDay: 20 } }).requiredGrade, 'nursery')
  assert.equal(evaluate({ ...base, signals: { external: true, prodJobs: false, instances: 1, jobsPerDay: 20 } }).requiredGrade, 'elementary')
  assert.equal(evaluate({ ...base, signals: { external: true, prodJobs: true, instances: 4, jobsPerDay: 40_000 } }).requiredGrade, 'graduated')
})

// 3. AEvo: loosening is rejected; tightening is allowed.
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
