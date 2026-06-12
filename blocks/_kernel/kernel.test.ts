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

rmSync(tmp, { recursive: true, force: true })

console.log('')
if (failures) {
  console.log(`${failures} failing\n`)
  process.exit(1)
}
console.log('all green\n')
