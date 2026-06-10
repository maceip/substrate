// demo.ts — a tiny avatar-upload app built ONLY against ./index.ts
//
// It never imports an adapter, a grade, or a gate directly. Run it under different
// FILES_ADAPTER values and the app code is byte-for-byte identical — that is the port
// doing its job. It shows put/get round-trips, prefix listing, the signed-URL seam, the
// adapter swap (same sequence fingerprinted under every grade), and the gate evaluator
// across three project lifecycles.
//
//   node blocks/files/demo.ts
//   FILES_ADAPTER=memory node blocks/files/demo.ts
//   FILES_ADAPTER=object node blocks/files/demo.ts

import { open, checkGrade, currentGrade } from './index.ts'

const grade = await currentGrade()
console.log(`\n=== files block — adapter grade: ${grade} ===\n`)

const store = await open('demo_avatars')
for (const k of await store.list()) await store.del(k) // idempotent across re-runs

// upload / download: bytes go through the port, never a disk path or vendor SDK
const png = new TextEncoder().encode('PNG bytes (pretend)')
const stat = await store.put('avatars/u1/profile.png', png, { contentType: 'image/png' })
console.log('upload / download:')
console.log(`  put avatars/u1/profile.png -> ${stat.size} bytes  etag ${stat.etag.slice(0, 12)}…`)
console.log(`  get -> ${JSON.stringify(new TextDecoder().decode((await store.get('avatars/u1/profile.png'))!))}`)

// object naming: namespaced keys make a prefix behave like a folder
await store.put('avatars/u2/profile.png', new TextEncoder().encode('another'), { contentType: 'image/png' })
await store.put('exports/report.csv', new TextEncoder().encode('a,b\n1,2'), { contentType: 'text/csv' })
console.log('\nprefix listing (keys as namespaced paths):')
console.log(`  list()           -> [${(await store.list()).join(', ')}]`)
console.log(`  list('avatars/') -> [${(await store.list('avatars/')).join(', ')}]`)

// the signed-URL seam: the app hands this string to a client and never knows the engine.
// memory:// in the nursery, file:// on the local fs, exp+sig token under the object adapter.
console.log('\ndownload link (the signed-URL seam):')
console.log(`  url('avatars/u1/profile.png') -> ${await store.url('avatars/u1/profile.png', { expiresInMs: 60_000 })}`)
console.log(`  url('avatars/missing.png')    -> ${await store.url('avatars/missing.png')}`)

for (const k of await store.list()) await store.del(k)
await store.close()

// adapter swap: the SAME sequence, fingerprinted under every grade in a subprocess
const { execFileSync } = await import('node:child_process')
const fp = (adapter: string) =>
  execFileSync(process.execPath, [new URL('./_fingerprint.ts', import.meta.url).pathname], {
    env: { ...process.env, FILES_ADAPTER: adapter },
    encoding: 'utf8',
  }).trim()
console.log('\nadapter swap (identical observable behavior):')
for (const a of ['memory', 'fs', 'object']) console.log(`  ${a.padEnd(7)} ${fp(a)}`)

function fmt(label: string, e: Awaited<ReturnType<typeof checkGrade>>) {
  const verdict = e.ok ? 'OK' : e.underGraded ? `UNDER-GRADED (need ${e.requiredGrade})` : 'REQUIREMENTS UNMET'
  const lines = [`  ${label} -> required:${e.requiredGrade}  ${verdict}`]
  for (const u of e.unmet) lines.push(`      ✗ ${u.requirement}: ${u.describe}`)
  return lines.join('\n')
}

console.log('\ngate evaluation across the project lifecycle:')
console.log(fmt('day 1   (dev, a few local files)  ', await checkGrade({ prodData: false, publicDownloads: false, instances: 1, objectCount: 12, totalBytes: 1_000_000 })))
console.log(fmt('month 2 (prod uploads)            ', await checkGrade({ prodData: true, publicDownloads: false, instances: 1, objectCount: 800, totalBytes: 200_000_000 })))
console.log(fmt('month 9 (4 instances, public links)', await checkGrade({ prodData: true, publicDownloads: true, instances: 4, objectCount: 90_000, totalBytes: 6_000_000_000 })))
console.log('')
