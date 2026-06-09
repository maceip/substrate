// demo.ts — app code declaring the env it needs, against ./index.ts only.
//   node blocks/env/demo.ts
//   ENV_SOURCE=process node blocks/env/demo.ts

import { load, checkGrade, currentGrade } from './index.ts'

const spec = {
  PORT: { default: '3000', parse: (s: string) => Number(s), describe: 'http port' },
  LOG_LEVEL: { default: 'info', describe: 'logger level' },
  DATABASE_URL: { required: true, secret: true, describe: 'postgres connection string' },
}

// Provide the required secret for the demo (in a real app this comes from the source).
process.env.DATABASE_URL ??= 'postgres://localhost/dev'

const grade = await currentGrade()
console.log(`\n=== env block — source grade: ${grade} ===\n`)

const cfg = await load(spec)
console.log('loaded config:', cfg)

// Fail-loud proof: a spec with an unset required var throws.
try {
  await load({ STRIPE_KEY: { required: true, secret: true } })
  console.log('  (unexpected: missing required did not throw)')
} catch (e) {
  console.log(`fail-loud works: ${(e as Error).message}`)
}

function fmt(label: string, e: Awaited<ReturnType<typeof checkGrade>>) {
  const verdict = e.ok ? 'OK' : e.underGraded ? `UNDER-GRADED (need ${e.requiredGrade})` : 'REQUIREMENTS UNMET'
  const lines = [`  ${label} -> required:${e.requiredGrade}  ${verdict}`]
  for (const u of e.unmet) lines.push(`      ✗ ${u.requirement}: ${u.describe}`)
  return lines.join('\n')
}

console.log('\ngate evaluation (this spec has 1 secret: DATABASE_URL):')
console.log(fmt('day 1   (dev)            ', await checkGrade(spec, { prod: false, instances: 1 })))
console.log(fmt('launch  (prod, 1 inst)   ', await checkGrade(spec, { prod: true, instances: 1 })))
console.log('')
