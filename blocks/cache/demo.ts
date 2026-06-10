// demo.ts — a tiny price-lookup app built ONLY against ./index.ts
//
// It never imports an adapter, a grade, or a gate directly. Run it under different
// CACHE_ADAPTER values and the app code is byte-for-byte identical — that is the port
// doing its job. It shows miss/hit, TTL expiry, the single-flight stampede seam, the
// adapter swap (same sequence fingerprinted under every grade), and the gate evaluator
// across three project lifecycles.
//
//   node blocks/cache/demo.ts
//   CACHE_ADAPTER=memory node blocks/cache/demo.ts

import { open, checkGrade, currentGrade } from './index.ts'

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

const grade = await currentGrade()
console.log(`\n=== cache block — adapter grade: ${grade} ===\n`)

const prices = await open<number>('demo_prices')
await prices.clear() // idempotent across re-runs

// miss -> fill -> hit
let lookups = 0
const lookupPrice = async () => {
  lookups++
  return 42
}
console.log('miss / hit:')
console.log(`  getOrFill #1 -> ${await prices.getOrFill('sku-1', lookupPrice, 10_000)}  (source lookups: ${lookups})`)
console.log(`  getOrFill #2 -> ${await prices.getOrFill('sku-1', lookupPrice, 10_000)}  (source lookups: ${lookups} — served from cache)`)

// TTL expiry — short TTL, short wait
await prices.set('sku-2', 99, 40)
console.log('\nTTL expiry (40ms):')
console.log(`  inside ttl  -> ${await prices.get('sku-2')}`)
await sleep(80)
console.log(`  past ttl    -> ${await prices.get('sku-2')}  (expired entries are never served)`)

// single-flight: 8 concurrent misses for one hot key
let fills = 0
const slowFill = async () => {
  fills++
  await sleep(30)
  return 7
}
const results = await Promise.all(Array.from({ length: 8 }, () => prices.getOrFill('hot-sku', slowFill, 10_000)))
console.log('\nstampede (8 concurrent getOrFill on one cold key):')
console.log(`  results: [${results.join(', ')}]  fills that hit the source: ${fills}`)
console.log(`  (adapters with 'single-flight' coalesce to 1; the nursery memory adapter pays all 8)`)

await prices.clear()
await prices.close()

// adapter swap: the SAME sequence, fingerprinted under every grade in a subprocess
const { execFileSync } = await import('node:child_process')
const fp = (adapter: string) =>
  execFileSync(process.execPath, [new URL('./_fingerprint.ts', import.meta.url).pathname], {
    env: { ...process.env, CACHE_ADAPTER: adapter },
    encoding: 'utf8',
  }).trim()
console.log('\nadapter swap (identical observable behavior):')
for (const a of ['memory', 'lru', 'shared-file']) console.log(`  ${a.padEnd(11)} ${fp(a)}`)

function fmt(label: string, e: Awaited<ReturnType<typeof checkGrade>>) {
  const verdict = e.ok ? 'OK' : e.underGraded ? `UNDER-GRADED (need ${e.requiredGrade})` : 'REQUIREMENTS UNMET'
  const lines = [`  ${label} -> required:${e.requiredGrade}  ${verdict}`]
  for (const u of e.unmet) lines.push(`      ✗ ${u.requirement}: ${u.describe}`)
  return lines.join('\n')
}

console.log('\ngate evaluation across the project lifecycle:')
console.log(fmt('day 1   (dev, cheap fills)      ', await checkGrade({ prod: false, instances: 1, hotKeys: 0, fillCostMs: 5 })))
console.log(fmt('month 2 (prod, 250ms fills)     ', await checkGrade({ prod: true, instances: 1, hotKeys: 6, fillCostMs: 250 })))
console.log(fmt('month 9 (4 instances)           ', await checkGrade({ prod: true, instances: 4, hotKeys: 20, fillCostMs: 250 })))
console.log('')
