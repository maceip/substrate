// _kernel/kernel.test.ts — invariants of the protocol organs themselves.
//   node blocks/_kernel/kernel.test.ts

import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

let failures = 0
async function check(name: string, fn: () => void | Promise<void>) {
  try {
    await fn()
    console.log(`  ✓ ${name}`)
  } catch (e) {
    failures++
    console.log(`  ✗ ${name}\n      ${(e as Error).message}`)
  }
}

console.log('\nkernel protocol-organ invariants:')

// ---- S6: evidence ----------------------------------------------------------------------
const tmp = mkdtempSync(join(tmpdir(), 'evidence-'))
process.env.EVIDENCE_STORE = join(tmp, 'evidence.json')
const { recordEvidence, sealedBatches, consumeBatch, SEAL_AT } = await import('./evidence.ts')

await check(`S6: ${SEAL_AT}th chunk seals a batch; the batch is the rewrite queue`, () => {
  for (let i = 0; i < SEAL_AT - 1; i++) assert.equal(recordEvidence('demo-block', 'test-red', `chunk ${i}`, 'kernel-test'), 'open')
  assert.equal(recordEvidence('demo-block', 'test-red', 'final chunk', 'kernel-test'), 'sealed')
  assert.equal(sealedBatches()['demo-block'].length, 1)
})

await check('S6: consuming a batch removes exactly that batch and preserves order', () => {
  const batch = consumeBatch('demo-block')
  assert.equal(batch?.length, SEAL_AT)
  assert.equal(batch?.[0].detail, 'chunk 0')
  assert.equal(consumeBatch('demo-block'), null)
})

// ---- S7: declarative contract + mechanical attribution ----------------------------------
const { checkContract, attribute } = await import('./contract.ts')
const { CONTRACT } = await import('../input-validation/contract.ts')

await check('S7: a valid Result passes the input-validation contract', () => {
  assert.equal(checkContract(CONTRACT, { ok: true, value: { a: 1 } }).ok, true)
  assert.equal(checkContract(CONTRACT, { ok: false, errors: [{ field: 'x', message: 'required' }] }).ok, true)
})

await check('S7: contract catches schema breaks, empty rejections, and smuggled values', () => {
  assert.equal(checkContract(CONTRACT, { ok: 'yes' }).ok, false)
  const empty = checkContract(CONTRACT, { ok: false, errors: [] })
  assert.ok(empty.violations.some((v) => v.id === 'rejection-names-fields'))
  const smuggled = checkContract(CONTRACT, { ok: false, errors: [{ field: 'x', message: 'bad' }], value: { x: 1 } })
  assert.ok(smuggled.violations.some((v) => v.id === 'no-value-on-failure'))
})

await check('S7: attribution is mechanical — upstream iff exactly one violated edge, structural iff several, local iff none', () => {
  const ok = { ok: true, violations: [] }
  const bad = { ok: false, violations: [{ kind: 'schema' as const, id: 'x', detail: 'bad' }] }
  assert.deepEqual(attribute([{ producer: 'a', verdict: ok }, { producer: 'b', verdict: ok }]), { level: 'local', culprit: null })
  assert.deepEqual(attribute([{ producer: 'a', verdict: bad }, { producer: 'b', verdict: ok }]), { level: 'upstream', culprit: 'a' })
  assert.deepEqual(attribute([{ producer: 'a', verdict: bad }, { producer: 'b', verdict: bad }]), { level: 'structural', culprit: null })
})

// ---- S5: accumulate-don't-truncate -------------------------------------------------------
process.env.FOT_STORE = join(tmp, 'fot.json')
const { deposit, recall, consolidationDue, SWEET_SPOT } = await import('./fot.ts')

await check('S5: deposits accumulate past the sweet spot (no truncation) and flag consolidation', () => {
  for (let i = 0; i < SWEET_SPOT + 3; i++) deposit('demo-block', `lesson number ${i}`, 'kernel-test')
  assert.equal(recall('demo-block').length, SWEET_SPOT + 3)
  const due = consolidationDue()
  assert.ok(due.some((d) => d.block === 'demo-block' && d.count === SWEET_SPOT + 3))
})

// ---- S5: consolidation (merge never destroys) --------------------------------------------
const { consolidateBlock, parseMerge, targetSize } = await import('./consolidate.ts')

await check('S5: log-cap target matches the paper formula', () => {
  assert.equal(targetSize(10), 11)
  assert.equal(targetSize(249), 25) // their DeepSeek run: 249 traces
})

await check('S5: consolidation merges via the model and preserves every input + provenance', async () => {
  const stub = async () => JSON.stringify([
    { text: 'merged: lessons about X', from: [0, 1] },
    { text: 'lesson number 2', from: [2] },
  ])
  deposit('merge-demo', 'lesson 0 about X', 'proj-a')
  deposit('merge-demo', 'lesson 1 about X', 'proj-b')
  deposit('merge-demo', 'lesson number 2', 'proj-a')
  const r = await consolidateBlock('merge-demo', stub)
  assert.equal(r.before, 3)
  assert.equal(r.after, 2)
  const merged = r.library.find((l) => l.text.startsWith('merged'))
  assert.ok(merged?.origin.includes('proj-a') && merged?.origin.includes('proj-b'), 'provenance must survive merging')
})

await check('S5: a merge that LOSES or DUPLICATES inputs is refused (fail closed)', () => {
  assert.throws(() => parseMerge(JSON.stringify([{ text: 'kept', from: [0] }]), 2), /lost inputs/)
  assert.throws(() => parseMerge(JSON.stringify([{ text: 'a', from: [0, 1] }, { text: 'b', from: [1] }]), 2), /covered twice/)
})

// ---- AEvo Φ: one action per boundary, correctly ranked -----------------------------------
const { observe } = await import('./phi.ts')

await check('Φ: rewrite queue outranks consolidation outranks repeats; exactly one action', () => {
  const base = { repeats: 0, prevRepeats: 0, orchestrationShare: 0.1, prevOrchestrationShare: 0.1, autoTightenings: 0, lastAction: null }
  const full = observe({ ...base, sealedUnits: [{ unit: 'u', batches: 1 }], consolidationDue: [{ block: 'b', count: 25 }] })
  assert.ok(full.action.includes('crispr.ts u'))
  const cons = observe({ ...base, sealedUnits: [], consolidationDue: [{ block: 'b', count: 25 }] })
  assert.ok(cons.action.includes('consolidate-cli.ts b'))
  const idle = observe({ ...base, sealedUnits: [], consolidationDue: [] })
  assert.ok(idle.action.includes('real project'))
})

await check('Φ: repeating last cycle\'s action is itself flagged (redundancy is a signal)', () => {
  const i = { sealedUnits: [{ unit: 'u', batches: 1 }], consolidationDue: [], repeats: 0, prevRepeats: 0, orchestrationShare: null, prevOrchestrationShare: null, autoTightenings: 1, lastAction: 'run a rewrite cycle: node tools/crispr.ts u' }
  assert.ok(observe(i).action.includes('REPEATED'))
})

rmSync(tmp, { recursive: true, force: true })

console.log('')
if (failures) {
  console.log(`${failures} failing\n`)
  process.exit(1)
}
console.log('all green\n')
