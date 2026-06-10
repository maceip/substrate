// block.test.ts — invariants of the edge-model block. Dependency-free; run with node.
//   node edge-model/block.test.ts
//
// Proves the claims the block exists to make — with FAKE transport/converter/inference
// throughout, so the whole file runs with zero network and zero real weights:
//   1. The port holds: the same app sequence yields the same result under every adapter.
//   2. The content-addressed cache: a second fetch of the same ref is a cache HIT.
//   3. Checksum-on-load: a corrupted cached artifact is rejected at elementary+.
//   4. The protected evaluator escalates and refuses loosening.

import assert from 'node:assert/strict'
import { rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { GATES, assertNoLoosening, evaluate } from './gates.ts'
import { adapter as elementary } from './adapters/elementary.ts'
import { adapter as graduated } from './adapters/graduated.ts'
import { adapter as nursery } from './adapters/nursery.ts'
import type { Inference, Transport } from './port.ts'

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

const DATA = join(dirname(fileURLToPath(import.meta.url)), '.data')
const CANNED = new TextEncoder().encode('canned model weights for the tests')
const inference: Inference = async (_a, input) => `out:${input.prompt ?? ''}:${input.tokens ?? 0}`
const URL_REF = { source: 'url' as const, id: 'https://example.test/model.bin' }

await rm(DATA, { recursive: true, force: true }) // start clean

console.log('\nedge-model block invariants:')

// 1. Port invariance: the same app sequence yields the same result under every adapter.
//    index.ts caches its adapter per process, so we fingerprint each adapter in a subprocess.
//    The fingerprint's transport/inference are fake — no network, no weights, deterministic.
await check('port invariance: nursery, elementary and graduated agree on app behavior', async () => {
  const { execFileSync } = await import('node:child_process')
  const run = (adapter: string) =>
    execFileSync(process.execPath, [new URL('./_fingerprint.ts', import.meta.url).pathname], {
      env: { ...process.env, MODEL_ADAPTER: adapter },
      encoding: 'utf8',
    }).trim()
  const a = run('nursery')
  assert.equal(a, run('elementary'), 'nursery and elementary diverged')
  assert.equal(a, run('graduated'), 'nursery and graduated diverged')
})

// 2. Content-addressed cache: a second fetch of the same ref is a cache HIT — the injected
//    transport is called exactly once, and both fetches report the same sha256.
await check('cache: a second fetch of the same ref is a HIT (transport called once)', async () => {
  let calls = 0
  const transport: Transport = async () => {
    calls++
    return { status: 200, bytes: async () => CANNED }
  }
  const rt = await elementary.open({ transport, inference })
  const first = await rt.fetch(URL_REF)
  const second = await rt.fetch(URL_REF)
  assert.equal(first.cached, false, 'first fetch should be a miss')
  assert.equal(second.cached, true, 'second fetch should be a cache hit')
  assert.equal(second.sha256, first.sha256, 'cache hit returned a different digest')
  assert.equal(calls, 1, `expected the transport to be called once, it was called ${calls}×`)
  await rt.close()
})

// 3. Checksum-on-load: a corrupted cached artifact is rejected at elementary+. We fetch (which
//    caches the ref->digest and lands clean bytes at their sha256 slot), then corrupt the bytes
//    at that exact slot, then read it back. elementary's run() re-reads the slot and re-hashes,
//    so the corruption surfaces as a rejection. nursery, which does NOT verify on load, runs the
//    corrupted bytes without complaint — the very gap the gate closes.
await check('checksum: a corrupted cached artifact is rejected on load at elementary+', async () => {
  const transport: Transport = async () => ({ status: 200, bytes: async () => CANNED })
  const rt = await elementary.open({ transport, inference })
  const seeded = await rt.fetch(URL_REF) // clean bytes land at sha256(CANNED)
  await writeFile(seeded.path, new TextEncoder().encode('TAMPERED — these bytes do not match the slot name'))
  await assert.rejects(() => rt.run({ prompt: 'x' }), /corrupted|checksum/, 'elementary must reject a corrupted slot on load')
  await rt.close()
  await rm(DATA, { recursive: true, force: true })
})

await check('checksum: nursery does NOT verify on load — it runs the corrupted bytes (the gap the gate closes)', async () => {
  const transport: Transport = async () => ({ status: 200, bytes: async () => CANNED })
  const rt = await nursery.open({ transport, inference })
  const seeded = await rt.fetch(URL_REF)
  await writeFile(seeded.path, new TextEncoder().encode('TAMPERED at nursery — unverified'))
  const out = await rt.run({ prompt: 'x' }) // nursery trusts the slot: no throw
  assert.equal(typeof out.output, 'string')
  await rt.close()
  await rm(DATA, { recursive: true, force: true })
})

// 4. The evaluator escalates required grade as signals cross thresholds.
await check('gate escalation: nursery -> elementary -> graduated', () => {
  const base = { capabilities: new Set<string>(), adapterGrade: 'nursery' as const }
  assert.equal(evaluate({ ...base, signals: { prod: false, callsPerDay: 20, multiFormat: false, sharedCache: false } }).requiredGrade, 'nursery')
  assert.equal(evaluate({ ...base, signals: { prod: true, callsPerDay: 20, multiFormat: false, sharedCache: false } }).requiredGrade, 'elementary')
  assert.equal(evaluate({ ...base, signals: { prod: true, callsPerDay: 50_000, multiFormat: true, sharedCache: true } }).requiredGrade, 'graduated')
})

// 5. AEvo: loosening is rejected; tightening is allowed.
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

await rm(DATA, { recursive: true, force: true }) // tests clean up after themselves
void graduated // exercised via the subprocess fingerprint; imported here for symmetry

console.log('')
if (failures > 0) {
  console.log(`${failures} failing\n`)
  process.exit(1)
}
console.log('all green\n')
