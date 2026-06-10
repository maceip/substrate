// _fingerprint.ts — test helper. Runs a fixed app sequence against whatever adapter
// FILES_ADAPTER selects and prints a stable fingerprint of the observable result.
// Used by block.test.ts to assert port invariance across adapters. URLs differ by grade
// BY DESIGN (memory:// vs file:// vs signed blob://) — the seam promises a usable link,
// not the same link — so the fingerprint records their presence, not their text.

import { open } from './index.ts'

const s = await open('test_fp')
for (const k of await s.list()) await s.del(k) // idempotent across re-runs (fs/object persist)

const missBefore = await s.get('a/one.txt')
const put1 = await s.put('a/one.txt', new TextEncoder().encode('hello blob'), { contentType: 'text/plain' })
await s.put('a/two.txt', new TextEncoder().encode('second'))
await s.put('b/three.bin', new Uint8Array([1, 2, 3]))

const hit = new TextDecoder().decode((await s.get('a/one.txt'))!)
const all = await s.list()
const underA = await s.list('a/')
const st = await s.stat('a/one.txt')
const statMiss = await s.stat('nope/gone')

const urlMiss = await s.url('nope/gone')
const urlHit = await s.url('a/one.txt')

const delHit = await s.del('a/two.txt')
const delMiss = await s.del('a/two.txt')
const after = await s.list()

for (const k of await s.list()) await s.del(k) // leave clean
await s.close()

process.stdout.write(
  JSON.stringify({
    missBefore: missBefore ?? null,
    put1: { size: put1.size, etag: put1.etag, contentType: put1.contentType },
    hit,
    all,
    underA,
    stat: st && { key: st.key, size: st.size, etag: st.etag, contentType: st.contentType },
    statMiss: statMiss ?? null,
    urlMiss: urlMiss ?? null,
    hasUrl: typeof urlHit === 'string' && urlHit.length > 0,
    delHit,
    delMiss,
    after,
  }),
)
