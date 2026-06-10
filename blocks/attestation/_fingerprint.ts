// _fingerprint.ts — test helper. Runs a fixed app sequence against whatever adapter
// ATTEST_ADAPTER selects and prints a stable fingerprint of the observable result.
// Used by block.test.ts to assert port invariance across adapters. Raw proof bytes differ
// by grade BY DESIGN (an HMAC is not an Ed25519 signature, keyIds differ per key) — the
// port promises the same BEHAVIOR, not the same bytes — so the fingerprint records verify
// outcomes: a valid roundtrip, a tampered claim rejected, an expired claim rejected, an
// unknown algorithm and a garbled proof refused fail-closed.

import { open } from './index.ts'
import type { Proof } from './index.ts'

const att = await open('test_fp')

const claim = { subject: 'artifact:fp', statement: 'sha256=abc123', issuedAt: '2026-01-01T00:00:00.000Z', expiresAt: '2099-01-01T00:00:00.000Z' }
const proof = await att.sign(claim)

const ok = await att.verify(proof)
const tamperedClaim = await att.verify({ ...proof, claim: { ...claim, statement: 'sha256=evil' } })
const flippedSig = await att.verify({ ...proof, signature: (proof.signature[0] === '0' ? '1' : '0') + proof.signature.slice(1) })
const expired = await att.verify(await att.sign({ subject: 'artifact:fp', statement: 'old', issuedAt: '2000-01-01T00:00:00.000Z', expiresAt: '2000-01-02T00:00:00.000Z' }))
const wrongAlg = await att.verify({ ...proof, algorithm: 'rot13' })
const garbled = await att.verify({ keyId: 'x' } as unknown as Proof)

await att.close()

process.stdout.write(JSON.stringify({ ok, tamperedClaim, flippedSig, expired, wrongAlg, garbled }))
