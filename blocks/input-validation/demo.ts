// demo.ts — input-validation against ./index.ts only.  node blocks/input-validation/demo.ts

import { parse, checkGrade, currentGrade } from './index.ts'
import type { Schema } from './index.ts'

const grade = await currentGrade()
console.log(`\n=== input-validation block — impl grade: ${grade} ===\n`)

const schema: Schema = {
  title: { type: 'string', required: true, min: 1, max: 80 },
  priority: { type: 'number', min: 1, max: 5 },
  done: { type: 'boolean' },
}

console.log('valid (with coercion: priority "3" -> 3, done "true" -> true):')
console.log(' ', await parse(schema, { title: 'ship it', priority: '3', done: 'true' }))

console.log('\ninvalid (missing title, priority out of range):')
console.log(' ', await parse(schema, { priority: 9 }))

function fmt(label: string, e: Awaited<ReturnType<typeof checkGrade>>) {
  const verdict = e.ok ? 'OK' : e.underGraded ? `UNDER-GRADED (need ${e.requiredGrade})` : 'REQUIREMENTS UNMET'
  const lines = [`  ${label} -> required:${e.requiredGrade}  ${verdict}`]
  for (const u of e.unmet) lines.push(`      ✗ ${u.requirement}: ${u.describe}`)
  return lines.join('\n')
}

console.log('\ngate evaluation:')
console.log(fmt('day 1   (private, dev)     ', await checkGrade({ public: false, prod: false, sharedClient: false })))
console.log(fmt('public  (no shared client) ', await checkGrade({ public: true, prod: true, sharedClient: false })))
console.log(fmt('client  (shared shapes)    ', await checkGrade({ public: true, prod: true, sharedClient: true })))
console.log('')
