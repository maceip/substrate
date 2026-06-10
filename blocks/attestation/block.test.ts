// block.test.ts — invariants of the attestation block. Dependency-free; run with node.
//   node attestation/block.test.ts
//
// Proves the claims the block exists to make:
//   1. The port holds: the same app sequence yields the same result under every adapter.
//   2. Verification is fail-closed: a tampered proof verifies false, never throws.
//   3. Private key material never crosses the port.
//   4. The protected evaluator refuses loosening.

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

console.log('\nattestation block invariants:')

// 1. Port invariance: the same app sequence yields the same result under every adapter.
//    index.ts caches its adapter per process, so we fingerprint each adapter in a subprocess.
//    The fingerprint records observable BEHAVIOR (valid roundtrip, tampered claim rejected,
//    expired claim rejected) — not raw proof bytes, which differ by algorithm by design.
await check('port invariance: hmac, ed25519 and graduated agree on app behavior', async () => {
  const { execFileSync } = await import('node:child_process')
  const run = (adapter: string) =>
    execFileSync(process.execPath, [new URL('./_fingerprint.ts', import.meta.url).pathname], {
      env: { ...process.env, ATTEST_ADAPTER: adapter },
      encoding: 'utf8',
    }).trim()
  const hmac = run('hmac')
  assert.equal(hmac, run('ed25519'), 'hmac and ed25519 diverged')
  assert.equal(hmac, run('graduated'), 'hmac and graduated diverged')
})

// 2. Tamper detection is fail-closed: flip a byte in the proof or the claim -> valid:false
//    with a reason, never a throw.
await check('tamper: a flipped signature byte or an edited claim verifies false', async () => {
  const { adapter } = await import('./adapters/ed25519.ts')
  const att = await adapter.open('test_tamper')
  const claim = { subject: 'artifact:t', statement: 'tests green', issuedAt: new Date().toISOString() }
  const proof = await att.sign(claim)
  assert.equal((await att.verify(proof)).valid, true)
  const flipped = await att.verify({ ...proof, signature: (proof.signature[0] === '0' ? '1' : '0') + proof.signature.slice(1) })
  assert.deepEqual({ valid: flipped.valid, hasReason: typeof flipped.reason === 'string' }, { valid: false, hasReason: true })
  const edited = await att.verify({ ...proof, claim: { ...claim, statement: 'tests red' } })
  assert.deepEqual({ valid: edited.valid, hasReason: typeof edited.reason === 'string' }, { valid: false, hasReason: true })
  await att.close()
})

// 3. Guarantee 1, scanned: every value the port returns is deep-walked, and no private key
//    material appears — not the PKCS8 PEM persisted on disk, not a 'PRIVATE KEY' marker,
//    and no field beyond the port's declared shapes where a secret could ride along.
await check('private material never crosses the port (all adapters)', async () => {
  const { readFile, readdir } = await import('node:fs/promises')
  const pemBody = (pem: string) => pem.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '')

  for (const name of ['hmac', 'ed25519', 'graduated'] as const) {
    const { adapter } = await import(`./adapters/${name}.ts`)
    const att = await adapter.open('test_scan')
    const claim = { subject: 'artifact:s', statement: 'scan me', issuedAt: new Date().toISOString() }
    const proof = await att.sign(claim)
    const outputs: unknown[] = [await att.keyInfo(), proof, await att.verify(proof)]
    if (att.rotate) outputs.push(await att.rotate(), await att.sign(claim))
    if (att.verifyBatch) outputs.push(await att.verifyBatch([proof]))
    await att.close()

    // no extra fields where a secret could ride along
    for (const p of outputs.filter((o): o is typeof proof => typeof (o as { signature?: unknown }).signature === 'string'))
      assert.deepEqual(Object.keys(p).sort(), ['algorithm', 'claim', 'keyId', 'signature'], `${name}: proof carries extra fields`)
    assert.deepEqual(Object.keys(outputs[0] as object).sort(), ['algorithm', 'createdAt', 'keyId'], `${name}: keyInfo carries extra fields`)

    const flat = JSON.stringify(outputs)
    assert.ok(!flat.includes('PRIVATE'), `${name}: a PEM marker crossed the port`)

    // for the disk-backed adapters, read the actual persisted private PEMs and assert
    // neither the PEM nor its base64 body appears in anything the port returned
    const dirs = { hmac: null, ed25519: 'ed25519', graduated: 'graduated' } as const
    if (dirs[name]) {
      const keyDir = new URL(`./.data/${dirs[name]}/test_scan/`, import.meta.url).pathname
      const pems = (await readdir(keyDir)).filter((f) => f.endsWith('.pem'))
      assert.ok(pems.length >= 1, `${name}: expected a persisted private key under .data`)
      for (const f of pems) {
        const body = pemBody(await readFile(`${keyDir}${f}`, 'utf8'))
        assert.ok(!flat.replace(/\s+/g, '').includes(body), `${name}: private key body from ${f} crossed the port`)
      }
    }
  }
})

// 4. Graduated: rotation has overlapping validity — proofs signed before rotate() still
//    verify after it, under a new active key.
await check('rotation: pre-rotation proofs still verify; new proofs use the new key', async () => {
  const { adapter } = await import('./adapters/graduated.ts')
  const att = await adapter.open('test_rotate')
  const claim = { subject: 'artifact:r', statement: 'pre-rotation', issuedAt: new Date().toISOString() }
  const before = await att.sign(claim)
  const oldKey = (await att.keyInfo()).keyId
  const newKey = (await att.rotate!()).keyId
  assert.notEqual(oldKey, newKey, 'rotate did not change the active key')
  assert.equal((await att.verify(before)).valid, true, 'old proof orphaned by rotation')
  const after = await att.sign(claim)
  assert.equal(after.keyId, newKey)
  assert.equal((await att.verify(after)).valid, true)
  await att.close()
})

// 5. Graduated: the policy hook refuses genuine-but-unacceptable claims, and a batch
//    verifies with one verdict.
await check('policy + aggregation: requireExpiry rejects, verifyBatch gives one verdict', async () => {
  const { adapter } = await import('./adapters/graduated.ts')
  const att = await adapter.open('test_policy', { requireExpiry: true })
  const expiring = { subject: 'artifact:p', statement: 'has expiry', issuedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 60_000).toISOString() }
  const open = await att.sign({ subject: 'artifact:p', statement: 'no expiry', issuedAt: new Date().toISOString() })
  assert.deepEqual(await att.verify(open), { valid: false, reason: 'policy: expiry-required' })
  const good = await att.verifyBatch!([await att.sign(expiring), await att.sign(expiring)])
  assert.equal(good.allValid, true)
  const mixed = await att.verifyBatch!([await att.sign(expiring), open])
  assert.deepEqual({ allValid: mixed.allValid, valids: mixed.results.map((r) => r.valid) }, { allValid: false, valids: [true, false] })
  await att.close()
})

// 6. The evaluator escalates required grade as signals cross thresholds.
await check('gate escalation: nursery -> elementary -> graduated', () => {
  const base = { capabilities: new Set<string>(), adapterGrade: 'nursery' as const }
  assert.equal(evaluate({ ...base, signals: { prod: false, externalVerifiers: false, proofsPerDay: 10, keyAgeDays: 1 } }).requiredGrade, 'nursery')
  assert.equal(evaluate({ ...base, signals: { prod: true, externalVerifiers: false, proofsPerDay: 10, keyAgeDays: 1 } }).requiredGrade, 'elementary')
  assert.equal(evaluate({ ...base, signals: { prod: true, externalVerifiers: true, proofsPerDay: 50_000, keyAgeDays: 200 } }).requiredGrade, 'graduated')
})

// 7. AEvo: loosening is rejected; tightening is allowed.
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

// leave clean: remove the key material the test issuers persisted under .data
{
  const { rm } = await import('node:fs/promises')
  for (const dir of ['ed25519/test_fp', 'ed25519/test_tamper', 'ed25519/test_scan', 'graduated/test_fp', 'graduated/test_scan', 'graduated/test_rotate', 'graduated/test_policy'])
    await rm(new URL(`./.data/${dir}`, import.meta.url), { recursive: true, force: true })
}

console.log('')
if (failures > 0) {
  console.log(`${failures} failing\n`)
  process.exit(1)
}
console.log('all green\n')
