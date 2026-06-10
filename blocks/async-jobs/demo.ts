// demo.ts — a tiny job flow built ONLY against ./index.ts
//
// It never imports an adapter, a grade, or a gate directly. Because index.ts caches its
// adapter per process, the demo re-runs the SAME flow in a subprocess under two different
// JOBS_ADAPTER values — the app code is byte-for-byte identical, and the terminal outcome
// is identical; only the attempt counts betray the grade (retries at elementary). Then it
// runs the gate evaluator across three project lifecycles to show requirements activating.
//
//   node blocks/async-jobs/demo.ts
//   JOBS_ADAPTER=durable node blocks/async-jobs/demo.ts   (changes only the default-grade line)

import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { open, checkGrade, currentGrade } from './index.ts'

// --- the app: one succeeding job, one job whose upstream is down -----------------------

async function jobFlow() {
  const q = await open('demo_jobs')
  await q.purge() // idempotent across re-runs
  q.register('welcome-email', (p) => `sent to ${(p as { to: string }).to}`)
  q.register('sync-broken-feed', () => {
    throw new Error('upstream 500')
  })

  const a = await q.enqueue('welcome-email', { to: 'ada@example.com' })
  const b = await q.enqueue('sync-broken-feed', { feed: 'news' })
  await q.drain()

  const ra = (await q.status(a))!
  const rb = (await q.status(b))!
  console.log(`  welcome-email    -> ${ra.state} (result: ${JSON.stringify(ra.result)}) after ${ra.attempts} attempt(s)`)
  console.log(`  sync-broken-feed -> ${rb.state} (error: ${rb.error}) after ${rb.attempts} attempt(s)`)
  console.log(`  dead letters     -> [${(await q.deadLetters()).map((j) => j.name).join(', ')}]`)
  await q.purge()
  await q.close()
}

// Child mode: run the flow under whatever JOBS_ADAPTER the parent set, then exit.
if (process.env.JOBS_DEMO_FLOW) {
  await jobFlow()
  process.exit(0)
}

console.log(`\n=== async-jobs block — default adapter grade: ${await currentGrade()} ===\n`)

console.log('same job flow, two adapters — app code identical, terminal outcome identical:')
for (const adapter of ['inline', 'retry']) {
  console.log(`\n  [JOBS_ADAPTER=${adapter}]`)
  const out = execFileSync(process.execPath, [fileURLToPath(import.meta.url)], {
    env: { ...process.env, JOBS_ADAPTER: adapter, JOBS_DEMO_FLOW: '1' },
    encoding: 'utf8',
  })
  process.stdout.write(out)
}

// --- the gates: requirements switching on as the project grows -------------------------

function fmt(label: string, e: Awaited<ReturnType<typeof checkGrade>>) {
  const verdict = e.ok ? 'OK' : e.underGraded ? `UNDER-GRADED (need ${e.requiredGrade})` : 'REQUIREMENTS UNMET'
  const lines = [`  ${label} -> required:${e.requiredGrade}  ${verdict}`]
  for (const u of e.unmet) lines.push(`      ✗ ${u.requirement}: ${u.describe}`)
  return lines.join('\n')
}

console.log('\ngate evaluation across the project lifecycle:')
console.log(fmt('day 1   (dev, nothing external)   ', await checkGrade({ external: false, prodJobs: false, instances: 1, jobsPerDay: 20 })))
console.log(fmt('month 2 (emails via external API) ', await checkGrade({ external: true, prodJobs: true, instances: 1, jobsPerDay: 500 })))
console.log(fmt('month 9 (3 workers, 40k jobs/day) ', await checkGrade({ external: true, prodJobs: true, instances: 3, jobsPerDay: 40_000 })))
console.log('')
