// block.test.ts — env block invariants.  node blocks/env/block.test.ts

import assert from 'node:assert/strict'
import { validate, countSecrets } from './port.ts'
import type { Source } from './port.ts'
import { GATES, assertNoLoosening, evaluate } from './gates.ts'

let failures = 0
function check(name: string, fn: () => void) {
  try {
    fn()
    console.log(`  ✓ ${name}`)
  } catch (e) {
    failures++
    console.log(`  ✗ ${name}\n      ${(e as Error).message}`)
  }
}

const src = (raw: Record<string, string>): Source => ({ name: 't', maxGrade: 'nursery', capabilities: [], raw: (k) => raw[k] })

console.log('\nenv block invariants:')

check('validate: missing required is reported, not thrown here', () => {
  const { missing } = validate({ A: { required: true } }, src({}))
  assert.deepEqual(missing, ['A'])
})
check('validate: default + parse applied', () => {
  const { values } = validate({ PORT: { default: '3000', parse: (s) => Number(s) } }, src({}))
  assert.equal(values.PORT, 3000)
})
check('countSecrets counts secret-flagged vars', () => {
  assert.equal(countSecrets({ A: { secret: true }, B: {}, C: { secret: true } }), 2)
})
check('gate escalation: secrets -> elementary; prod secrets -> graduated', () => {
  const base = { capabilities: new Set<string>(), adapterGrade: 'graduated' as const }
  assert.equal(evaluate({ ...base, signals: { secrets: 0, prod: true, instances: 9 } }).requiredGrade, 'nursery')
  assert.equal(evaluate({ ...base, signals: { secrets: 1, prod: false, instances: 1 } }).requiredGrade, 'elementary')
  assert.equal(evaluate({ ...base, signals: { secrets: 1, prod: true, instances: 1 } }).requiredGrade, 'graduated')
})
check('under-grade caught: process-env source cannot satisfy example-file', () => {
  const e = evaluate({ signals: { secrets: 1, prod: false, instances: 1 }, capabilities: new Set(), adapterGrade: 'nursery' })
  assert.ok(e.unmet.some((u) => u.requirement === 'example-file'))
})
check('assertNoLoosening rejects gate removal', () => {
  assert.ok(assertNoLoosening(GATES, GATES.slice(0, 1)).length > 0)
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
if (failures) {
  console.log(`${failures} failing\n`)
  process.exit(1)
}
console.log('all green\n')
