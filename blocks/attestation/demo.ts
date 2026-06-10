// demo.ts — a tiny release-provenance app built ONLY against ./index.ts
//
// It never imports an adapter, a grade, or a gate directly. Run it under different
// ATTEST_ADAPTER values and the app code is byte-for-byte identical — that is the port
// doing its job. It signs a build claim, verifies it, proves tamper detection and expiry
// are fail-closed, shows the adapter swap (same sequence fingerprinted under every grade),
// and runs the gate evaluator across three project lifecycles.
//
//   node blocks/attestation/demo.ts
//   ATTEST_ADAPTER=hmac node blocks/attestation/demo.ts
//   ATTEST_ADAPTER=graduated node blocks/attestation/demo.ts

import { open, checkGrade, currentGrade } from './index.ts'

const grade = await currentGrade()
console.log(`\n=== attestation block — adapter grade: ${grade} ===\n`)

const ci = await open('demo_releases')

// key custody: operators see a fingerprint, a birthday, an algorithm — never the key
const info = await ci.keyInfo()
console.log('key custody (keyInfo — never private material):')
console.log(`  keyId ${info.keyId}  algorithm ${info.algorithm}  created ${info.createdAt}`)

// sign + verify: the claim is an explicit typed shape, the proof carries it with a signature
const claim = {
  subject: 'artifact:app-v1.4.2',
  statement: 'built from commit 1f3acd9 by ci, tests green',
  issuedAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
}
const proof = await ci.sign(claim)
const ok = await ci.verify(proof)
console.log('\nsign + verify:')
console.log(`  signed ${claim.subject} under key ${proof.keyId}`)
console.log(`  verify -> valid:${ok.valid}  claim echoed: ${JSON.stringify(ok.claim?.subject)}`)

// tamper detection: edit one field of the claim, keep the signature — fail-closed, with a reason
const tampered = await ci.verify({ ...proof, claim: { ...claim, statement: 'built from commit deadbee by ci, tests green' } })
console.log('\ntamper detection (statement edited, signature kept):')
console.log(`  verify -> valid:${tampered.valid}  reason: ${tampered.reason}`)

// expiry: an expired claim verifies false — "no longer true" is a verify outcome, not an exception
const stale = await ci.verify(await ci.sign({ ...claim, issuedAt: '2020-01-01T00:00:00.000Z', expiresAt: '2020-01-02T00:00:00.000Z' }))
console.log('\nexpiry enforcement (claim from 2020):')
console.log(`  verify -> valid:${stale.valid}  reason: ${stale.reason}`)

await ci.close()

// adapter swap: the SAME sequence, fingerprinted under every grade in a subprocess
const { execFileSync } = await import('node:child_process')
const fp = (adapter: string) =>
  execFileSync(process.execPath, [new URL('./_fingerprint.ts', import.meta.url).pathname], {
    env: { ...process.env, ATTEST_ADAPTER: adapter },
    encoding: 'utf8',
  }).trim()
console.log('\nadapter swap (identical observable behavior — proof BYTES differ, behavior does not):')
for (const a of ['hmac', 'ed25519', 'graduated']) console.log(`  ${a.padEnd(9)} ${fp(a)}`)

function fmt(label: string, e: Awaited<ReturnType<typeof checkGrade>>) {
  const verdict = e.ok ? 'OK' : e.underGraded ? `UNDER-GRADED (need ${e.requiredGrade})` : 'REQUIREMENTS UNMET'
  const lines = [`  ${label} -> required:${e.requiredGrade}  ${verdict}`]
  for (const u of e.unmet) lines.push(`      ✗ ${u.requirement}: ${u.describe}`)
  return lines.join('\n')
}

console.log('\ngate evaluation across the project lifecycle:')
console.log(fmt('day 1   (internal, a few proofs)   ', await checkGrade({ prod: false, externalVerifiers: false, proofsPerDay: 20, keyAgeDays: 1 })))
console.log(fmt('month 2 (prod, partners verify)    ', await checkGrade({ prod: true, externalVerifiers: true, proofsPerDay: 2_000, keyAgeDays: 40 })))
console.log(fmt('month 9 (50k proofs/day, old key)  ', await checkGrade({ prod: true, externalVerifiers: true, proofsPerDay: 50_000, keyAgeDays: 200 })))
console.log('')
