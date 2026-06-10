// block.test.ts — invariants of the agent-gates block. Dependency-free; run with node.
//   node agent-gates/block.test.ts
//
// Proves the claims the block exists to make:
//   1. The port holds: the same app sequence yields the same result under every adapter.
//   2. The runner is FAIL-CLOSED: a gate that throws makes the report fail, never silently pass.
//   3. Severity is honored: a 'block' failure fails the report, a 'warn' does not.
//   4. The protected baseline (elementary+) refuses removing/downgrading a committed gate id.
//   5. The GRADE evaluator escalates required grade as signals cross thresholds.
//   6. AEvo: assertNoLoosening rejects loosening, allows tightening.
//   7. The protected baseline (block.json @ git HEAD) is not loosened by the live gates.

import assert from 'node:assert/strict'
import { GATES, assertNoLoosening, evaluate } from './gates.ts'
import { adapter as nursery } from './adapters/nursery.ts'
import { adapter as elementary } from './adapters/elementary.ts'
import { adapter as graduated } from './adapters/graduated.ts'
import type { Artifact, Gate } from './port.ts'

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

const blockGate: Gate = { id: 'g-block', severity: 'block', describe: 'block gate', check: () => ({ pass: false, detail: 'nope' }) }
const warnGate: Gate = { id: 'g-warn', severity: 'warn', describe: 'warn gate', check: () => ({ pass: false, detail: 'meh' }) }
const passGate: Gate = { id: 'g-pass', severity: 'block', describe: 'pass gate', check: () => ({ pass: true }) }
const throwGate: Gate = { id: 'g-throw', severity: 'block', describe: 'throwing gate', check: () => { throw new Error('boom') } }
const artifact: Artifact = { output: 'x' }

console.log('\nagent-gates block invariants:')

// 1. Port invariance: the same app sequence yields the same result under every adapter.
//    index.ts caches its adapter per process, so we fingerprint each adapter in a subprocess.
await check('port invariance: nursery and graduated agree on app behavior', async () => {
  const { execFileSync } = await import('node:child_process')
  const run = (adapter: string) =>
    execFileSync(process.execPath, [new URL('./_fingerprint.ts', import.meta.url).pathname], {
      env: { ...process.env, GATES_ADAPTER: adapter },
      encoding: 'utf8',
    }).trim()
  assert.equal(run('nursery'), run('graduated'), 'nursery and graduated diverged')
})

// 2. FAIL-CLOSED: a gate that throws makes report.pass=false (never a silent pass), at every grade.
await check('fail-closed: a throwing gate forces report.pass=false', () => {
  for (const a of [nursery, elementary, graduated]) {
    const gs = a.open()
    gs.register(throwGate)
    const r = gs.evaluate(artifact)
    gs.close()
    assert.equal(r.pass, false, `${a.name}: throwing gate did not fail the report`)
    assert.ok(r.failures.some((f) => f.id === 'g-throw' && /threw/.test(f.detail)), `${a.name}: thrown reason not recorded`)
  }
})

// 3. Severity: a 'block' failure forces pass=false; a 'warn' failure does not.
await check("severity: 'block' fails the report, 'warn' does not", () => {
  const gs1 = nursery.open()
  gs1.register(blockGate)
  assert.equal(gs1.evaluate(artifact).pass, false, 'a block failure should fail the report')
  gs1.close()

  const gs2 = nursery.open()
  gs2.register(warnGate)
  gs2.register(passGate)
  const r = gs2.evaluate(artifact)
  gs2.close()
  assert.equal(r.pass, true, 'a warn failure alone should not fail the report')
  assert.ok(r.failures.some((f) => f.id === 'g-warn'), 'the warn should still be surfaced')
})

// 4. Protected baseline (elementary+): removing or downgrading a committed gate id is rejected.
await check('protected-baseline: committed gate cannot be removed or downgraded', () => {
  for (const a of [elementary, graduated]) {
    // committed says g-block must exist at 'block' severity.
    // Downgrade: registering it as 'warn' is a loosening — refused (loud throw).
    const gs1 = a.open({ committedGateIds: [{ id: 'g-block', severity: 'block' }] })
    assert.throws(() => gs1.register({ ...blockGate, severity: 'warn' }), /protected-baseline/, `${a.name}: downgrade not refused`)
    gs1.close()
    // Removal: a live set that omits a committed gate is a loosening — refused the moment any gate is
    // registered while g-block remains absent from the proposed live set.
    const gs2 = a.open({ committedGateIds: [{ id: 'g-block', severity: 'block' }] })
    assert.throws(() => gs2.register(passGate), /protected-baseline/, `${a.name}: removal not refused`)
    gs2.close()
    // Tightening still passes: registering the committed gate at its committed severity is fine.
    const gs3 = a.open({ committedGateIds: [{ id: 'g-block', severity: 'block' }] })
    assert.doesNotThrow(() => gs3.register(blockGate), `${a.name}: legitimate registration refused`)
    gs3.close()
  }
})

// 4b. graduated adds ATTRIBUTION: a thrown gate is 'structural'; a claim/evidence failure 'upstream'.
await check('attribution (graduated): structural for throws, upstream for missing-evidence, local otherwise', () => {
  const gs = graduated.open()
  gs.register(throwGate) // throws -> structural
  gs.register({ id: 'g-claim', severity: 'block', describe: 'claim', check: () => ({ pass: false, detail: 'claim without evidence: x' }) })
  gs.register({ id: 'g-local', severity: 'block', describe: 'local', check: () => ({ pass: false, detail: 'TODO in file' }) })
  const r = gs.evaluate(artifact)
  gs.close()
  assert.equal(r.attribution, true, 'graduated report should carry attribution=true')
  const by = (id: string) => r.failures.find((f) => f.id === id)?.attribution
  assert.equal(by('g-throw'), 'structural')
  assert.equal(by('g-claim'), 'upstream')
  assert.equal(by('g-local'), 'local')
  // nursery never attributes — absence means "not attributed", not "no failures".
  const ns = nursery.open()
  ns.register(throwGate)
  const nr = ns.evaluate(artifact)
  ns.close()
  assert.equal(nr.attribution, undefined, 'nursery should not attribute')
})

// 5. The GRADE evaluator escalates required grade as signals cross thresholds.
await check('gate escalation: nursery -> elementary -> graduated', () => {
  const base = { capabilities: new Set<string>(), adapterGrade: 'nursery' as const }
  assert.equal(evaluate({ ...base, signals: { agentEdits: false, prod: false, gateCount: 1 } }).requiredGrade, 'nursery')
  assert.equal(evaluate({ ...base, signals: { agentEdits: true, prod: false, gateCount: 1 } }).requiredGrade, 'elementary')
  assert.equal(evaluate({ ...base, signals: { agentEdits: true, prod: true, gateCount: 9 } }).requiredGrade, 'graduated')
})

// 6. AEvo: loosening is rejected; tightening is allowed.
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
