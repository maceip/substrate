// demo.ts — a tiny notes app built ONLY against ./index.ts
//
// It never imports an adapter, a grade, or a gate directly. Run it under different
// PERSIST_ADAPTER values and the app code is byte-for-byte identical — that is the port
// doing its job. Then it runs the gate evaluator across three project lifecycles to show
// requirements activating as thresholds are crossed.
//
//   node blocks/persistence/demo.ts
//   PERSIST_ADAPTER=memory node blocks/persistence/demo.ts

import { open, checkGrade, currentGrade } from './index.ts'
import type { BaseRecord } from './index.ts'

interface Note extends BaseRecord {
  title: string
  body: string
}

async function notesApp() {
  const notes = await open<Note>('notes')
  for (const n of await notes.list()) await notes.remove(n.id) // idempotent across re-runs
  const a = await notes.create({ title: 'first', body: 'hello' })
  await notes.create({ title: 'second', body: 'world' })
  await notes.update(a.id, { body: 'hello (edited)' })
  const all = await notes.list()
  await notes.close()
  return all
}

function fmt(label: string, e: Awaited<ReturnType<typeof checkGrade>>) {
  const verdict = e.ok ? 'OK' : e.underGraded ? `UNDER-GRADED (need ${e.requiredGrade})` : 'REQUIREMENTS UNMET'
  const lines = [`  ${label} -> required:${e.requiredGrade}  ${verdict}`]
  for (const u of e.unmet) lines.push(`      ✗ ${u.requirement}: ${u.describe}`)
  return lines.join('\n')
}

const grade = await currentGrade()
console.log(`\n=== persistence block — adapter grade: ${grade} ===\n`)

const rows = await notesApp()
console.log('notes app output (identical under any adapter):')
for (const n of rows) console.log(`  - ${n.title} v${n.version}: ${n.body}`)

// A record sample for schema introspection (does it carry `version`? yes — installed at nursery).
const sample = rows[0]

console.log('\ngate evaluation across the project lifecycle:')
console.log(fmt('day 1   (1 writer, dev)        ', await checkGrade({ writers: 1, instances: 1, prodData: false, rows: 3 }, { sampleRecord: sample })))
console.log(fmt('month 2 (3 writers, prod)      ', await checkGrade({ writers: 3, instances: 1, prodData: true, rows: 400 }, { sampleRecord: sample })))
console.log(fmt('month 9 (4 instances, 120k rows)', await checkGrade({ writers: 5, instances: 4, prodData: true, rows: 120_000 }, { sampleRecord: sample, migrationsRegistered: 0 })))
console.log('')
