// demo.ts — request-guard against ./index.ts only.  node blocks/request-guard/demo.ts

import { guard, checkGrade, currentGrade } from './index.ts'

const grade = await currentGrade()
console.log(`\n=== request-guard block — impl grade: ${grade} ===\n`)

const mw = await guard({ limit: 3, windowMs: 60_000, maxBytes: 1000 })
const req = { headers: { 'x-client': 'caller-1' } as Record<string, string | undefined> }

console.log('rate limit (limit 3 per caller):')
for (let i = 1; i <= 5; i++) {
  const res = mw(req)
  console.log(`  request ${i}: ${res ? `${res.status} ${JSON.stringify(res.body)}` : 'allowed'}`)
}

console.log('\nshield (reject oversized body):')
const big = mw({ headers: { 'x-client': 'caller-2', 'content-length': '5000' } })
console.log(`  5KB body: ${big ? `${big.status} ${JSON.stringify(big.body)}` : 'allowed'}`)

function fmt(label: string, e: Awaited<ReturnType<typeof checkGrade>>) {
  const verdict = e.ok ? 'OK' : e.underGraded ? `UNDER-GRADED (need ${e.requiredGrade})` : 'REQUIREMENTS UNMET'
  const lines = [`  ${label} -> required:${e.requiredGrade}  ${verdict}`]
  for (const u of e.unmet) lines.push(`      ✗ ${u.requirement}: ${u.describe}`)
  return lines.join('\n')
}

console.log('\ngate evaluation:')
console.log(fmt('day 1   (private)        ', await checkGrade({ public: false, instances: 1 })))
console.log(fmt('public  (1 instance)     ', await checkGrade({ public: true, instances: 1 })))
console.log(fmt('scaled  (4 instances)    ', await checkGrade({ public: true, instances: 4 })))
console.log('')
