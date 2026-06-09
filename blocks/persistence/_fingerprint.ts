// _fingerprint.ts — test helper. Runs a fixed app sequence against whatever adapter
// PERSIST_ADAPTER selects and prints a stable fingerprint of the observable result.
// Used by block.test.ts to assert port invariance across adapters.

import { open } from './index.ts'
import type { BaseRecord } from './index.ts'

interface Item extends BaseRecord {
  name: string
}

const s = await open<Item>('test_items')
for (const r of await s.list()) await s.remove(r.id)
const a = await s.create({ name: 'a' })
const b = await s.create({ name: 'b' })
await s.update(a.id, { name: 'a2' })
await s.remove(b.id)
const rows = await s.list()
const n = await s.count()
for (const r of await s.list()) await s.remove(r.id) // leave clean
await s.close()

process.stdout.write(JSON.stringify({ names: rows.map((r) => r.name).sort(), versions: rows.map((r) => r.version), n }))
