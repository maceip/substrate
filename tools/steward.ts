// tools/steward.ts — the substrate meta-agent, as a basic loop instead of a harness.
//
//   node tools/steward.ts
//
// LangChain ships its own agent because its runtime has duties nobody else will do. Substrate's
// answer to the same problem: the DUTIES are code (this file); the loop that runs them is
// fungible — a human, a cron, or any agent. Nothing here requires intelligence; everything
// that does is PRINTED as a judgment list instead of attempted.
//
// Mechanical duties (done in-place, fail-closed):
//   1. lens snapshot              (tools/lens.ts — the two-lens constitution)
//   2. insights:sync              (render federated lessons, saturation guard)
//   3. project updates            (every stamped project behind the nursery gets update.ts,
//                                  which is itself fail-closed: clean tree, tests, auto-commit)
// Judgment duties (reported, never attempted):
//   - librarian: consolidation when the federation saturates / per-block overflow
//   - repeats: has anything bitten twice that should be recorded?
//   - red updates: a project whose tests went red under update needs eyes, not retries.

import { execFileSync } from 'node:child_process'
import { consolidationDue } from '../blocks/_kernel/fot.ts'
import { recordEvidence, sealedBatches } from '../blocks/_kernel/evidence.ts'
import { phi } from '../blocks/_kernel/phi.ts'
import { harvestAll } from '../blocks/_kernel/harvest.ts'
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const SUB = join(homedir(), '.substrate')

const run = (cmd: string, args: string[], cwd: string) => execFileSync(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] }).toString()

const judgment: string[] = []
console.log('substrate steward — mechanical duties first, judgment reported at the end\n')

// 1. lens snapshot
try {
  const out = run('node', [join(ROOT, 'tools', 'lens.ts')], ROOT)
  console.log(out.trim().split('\n').slice(0, 12).join('\n'))
} catch {
  console.log('  lens: FAILED to snapshot (non-fatal)')
}

// 2. render federated lessons + capture the saturation guard
try {
  const out = run('node', [join(ROOT, 'blocks', '_kernel', 'sync-insights.ts')], join(ROOT, 'blocks'))
  const synced = out.split('\n').filter((l) => l.startsWith('synced')).length
  console.log(`\ninsights:sync — ${synced} file(s) updated`)
  if (out.includes('WARNING')) judgment.push('librarian: federation past saturation — consolidate near-duplicate lessons in the store')
  if (out.includes('consolidation due')) judgment.push('librarian: some blocks render fewer lessons than they hold (per-block overflow)')
} catch {
  console.log('insights:sync FAILED (non-fatal)')
}

// 3. bring stamped projects up to the nursery
let head = 'unknown'
try {
  head = run('git', ['rev-parse', '--short', 'HEAD'], ROOT).trim()
} catch {
  /* nursery outside git */
}
interface Stamp {
  name: string
  dir: string
}
const stamps: Stamp[] = existsSync(join(SUB, 'projects.json')) ? JSON.parse(readFileSync(join(SUB, 'projects.json'), 'utf8')) : []
console.log(`\nprojects (${stamps.length} stamped, nursery @ ${head}):`)
for (const s of stamps) {
  if (!existsSync(s.dir)) {
    console.log(`  ${s.name}: directory gone (${s.dir}) — remove from ~/.substrate/projects.json if abandoned`)
    continue
  }
  const originFile = join(s.dir, 'substrate', '.origin.json')
  const sha = existsSync(originFile) ? (JSON.parse(readFileSync(originFile, 'utf8')) as { sha?: string }).sha : undefined
  if (sha === head) {
    console.log(`  ${s.name}: up to date`)
    continue
  }
  console.log(`  ${s.name}: behind (${sha ?? 'pre-origin stamp'} -> ${head}) — updating...`)
  try {
    run('node', [join(ROOT, 'blocks', 'update.ts'), s.dir], ROOT)
    console.log(`  ${s.name}: updated, tests green, committed`)
  } catch (e) {
    const tail = (e as { stderr?: Buffer }).stderr?.toString().trim().split('\n').slice(-2).join(' | ') ?? String(e)
    console.log(`  ${s.name}: update did NOT land (${tail})`)
    judgment.push(`${s.name}: update failed or was refused — needs eyes, not retries (${s.dir})`)
    recordEvidence('update-channel', 'update-red', `${s.name}: ${tail}`, 'steward')
  }
}

// 4. harvest: scan every stamped project for imported blocks + HANDROLLED markers — the
// precedent index updates and NEW gap markers become evidence automatically.
try {
  const h = harvestAll()
  console.log(`\nharvest: ${h.projects.length} project(s) indexed${h.newGaps ? `, ${h.newGaps} NEW gap marker(s) recorded as evidence` : ''}`)
  for (const pr of h.projects) console.log(`  ${pr.name}: blocks [${pr.blocksUsed.join(', ')}]${pr.handrolled.length ? `; handrolled: ${pr.handrolled.length}` : ''}`)
} catch (e) {
  console.log(`harvest FAILED (non-fatal): ${(e as Error).message.slice(0, 100)}`)
}

// S6 + S5 queues: sealed evidence batches justify a rewrite cycle; over-sweet-spot
// libraries are the librarian's consolidation queue.
for (const [unit, batches] of Object.entries(sealedBatches())) {
  judgment.push(`${unit}: ${batches.length} SEALED evidence batch(es) — a rewrite cycle is justified (MOSS S6)`) 
}
for (const d of consolidationDue()) {
  judgment.push(`${d.block}: ${d.count} lessons (> sweet spot) — LLM consolidation due (FoT S5)`)
}

// Φ (AEvo): one observation, ONE action per boundary. The steward is the boundary.
const decision = phi(join(ROOT, 'outputs', 'lens-history.json'))
console.log(`\nΦ observes: ${decision.observation}`)
console.log(`Φ action (one per cycle): ${decision.action}`)

// judgment report — the only part that wants an intelligent reader
console.log('\njudgment needed:')
if (judgment.length === 0) console.log('  nothing — the loop is fully mechanical today')
for (const j of judgment) console.log(`  - ${j}`)
console.log('  (and the standing question no script can answer: did anything bite twice this week?')
console.log('   if yes: node tools/lens.ts repeat "<what>")\n')
