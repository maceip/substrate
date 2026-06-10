// _fingerprint.ts — test helper. Runs a fixed app sequence against whatever adapter
// CACHE_ADAPTER selects and prints a stable fingerprint of the observable result.
// Used by block.test.ts to assert port invariance across adapters. The sequence is
// sequential on purpose: single-flight is a concurrency property and is tested separately;
// here every grade must agree on the plain semantics (miss/hit/expiry/del/fill).

import { open } from './index.ts'

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

const c = await open<string>('test_fp')
await c.clear() // idempotent across re-runs (the shared-file adapter persists)

const missBefore = await c.get('a')
await c.set('a', 'alpha', 10_000)
const hit = await c.get('a')

await c.set('b', 'beta', 30) // expires well inside the sleep below
await sleep(90)
const expired = await c.get('b')

const delHit = await c.del('a')
const delMiss = await c.del('a')

let fills = 0
const fill = async () => {
  fills++
  return 'gamma'
}
const filled = await c.getOrFill('c', fill, 10_000)
const cached = await c.getOrFill('c', fill, 10_000) // hit — fill must not run again

await c.clear() // leave clean
await c.close()

process.stdout.write(JSON.stringify({ missBefore: missBefore ?? null, hit, expired: expired ?? null, delHit, delMiss, filled, cached, fills }))
