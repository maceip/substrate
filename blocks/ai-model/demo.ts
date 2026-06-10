// demo.ts — a tiny prompted operation built ONLY against ./index.ts
//
// It never imports an adapter, a provider, or a gate directly. The gate dashboard below
// runs with zero network and zero keys; if ANTHROPIC_API_KEY is set, the demo also makes
// ONE tiny real call (maxTokens 32) through whatever grade AI_ADAPTER selects — the app
// code is byte-for-byte identical either way, which is the port doing its job.
//
//   node blocks/ai-model/demo.ts
//   AI_ADAPTER=anthropic node blocks/ai-model/demo.ts

import { open, checkGrade, currentGrade } from './index.ts'

function fmt(label: string, e: Awaited<ReturnType<typeof checkGrade>>) {
  const verdict = e.ok ? 'OK' : e.underGraded ? `UNDER-GRADED (need ${e.requiredGrade})` : 'REQUIREMENTS UNMET'
  const lines = [`  ${label} -> required:${e.requiredGrade}  ${verdict}`]
  for (const u of e.unmet) lines.push(`      ✗ ${u.requirement}: ${u.describe}`)
  return lines.join('\n')
}

const grade = await currentGrade()
console.log(`\n=== ai-model block — adapter grade: ${grade} ===\n`)

console.log('gate evaluation across the project lifecycle:')
console.log(fmt('day 1   (dev, 20 calls/day)              ', await checkGrade({ prod: false, callsPerDay: 20, costSensitive: false, multiModel: false })))
console.log(fmt('month 2 (prod, 2k calls/day)             ', await checkGrade({ prod: true, callsPerDay: 2_000, costSensitive: false, multiModel: false })))
console.log(fmt('month 9 (multi-model, 50k calls, budgeted)', await checkGrade({ prod: true, callsPerDay: 50_000, costSensitive: true, multiModel: true })))

if (process.env.ANTHROPIC_API_KEY) {
  console.log('\nlive call (ANTHROPIC_API_KEY is set — one tiny completion, maxTokens 32):')
  const client = await open()
  const out = await client.complete({
    system: 'Answer in five words or fewer.',
    messages: [{ role: 'user', content: 'What is a port, in software?' }],
    maxTokens: 32,
  })
  console.log(`  ${out.model} [${out.stopReason}]: ${out.text.trim()}`)
  console.log(`  usage: ${JSON.stringify(client.usage())}`)
  await client.close()
} else {
  console.log('\nno live call: set ANTHROPIC_API_KEY for a one-line real completion (maxTokens 32).')
  console.log('everything above ran with zero network and zero keys.')
}
console.log('')
