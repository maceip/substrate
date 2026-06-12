// _kernel/check-contracts.ts — PROTOCOL S7's construction-time half, as a predicate.
//
//   node blocks/_kernel/check-contracts.ts       (exit 1 on violation)
//
// The Meta-Agent ablation says construction-time verification is the single most valuable
// component (+7.1). v1: every contract.ts must parse, export CONTRACT + SAMPLE, and
// CONTRACT must accept its own SAMPLE. Coverage is reported so the gap is a number, not
// a feeling. Runs in the nursery chain; stamps inherit it through their block suites later.

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { checkContract, type PortContract } from './contract.ts'

const blocksDir = dirname(dirname(fileURLToPath(import.meta.url)))
const cat = JSON.parse(readFileSync(join(blocksDir, 'CATALOG.json'), 'utf8')) as { blocks: { name: string; status: string; dir: string | null }[] }
const built = cat.blocks.filter((b) => b.status === 'built')

const errors: string[] = []
let covered = 0
for (const b of built) {
  const file = join(dirname(blocksDir), b.dir!, 'contract.ts')
  if (!existsSync(file)) continue
  covered++
  try {
    const mod = (await import(file)) as { CONTRACT?: PortContract; SAMPLE?: unknown }
    if (!mod.CONTRACT) {
      errors.push(`${b.name}: contract.ts exports no CONTRACT`)
      continue
    }
    if (!('SAMPLE' in mod)) {
      errors.push(`${b.name}: contract.ts exports no SAMPLE (construction-time check needs one)`)
      continue
    }
    // SAMPLES (plural) preferred; SAMPLE kept for back-compat. Every sample must pass.
    const samples = Array.isArray((mod as { SAMPLES?: unknown[] }).SAMPLES) ? (mod as { SAMPLES: unknown[] }).SAMPLES : [mod.SAMPLE]
    for (const [i, s] of samples.entries()) {
      const verdict = checkContract(mod.CONTRACT, s)
      if (!verdict.ok) errors.push(`${b.name}: CONTRACT rejects its own sample #${i} — ${verdict.violations.map((v) => `${v.kind}:${v.id}`).join(', ')}`)
    }

    // THE CONTRACT RATCHET (S4 applied to S7): live assertion/forbidden ids must be a
    // SUPERSET of the baseline committed at git HEAD (block.json "contract"). Adding is
    // tightening (free); a missing id is loosening (fail until a human commits the removal).
    try {
      const rel = `blocks/${b.name}/block.json`
      const headRaw = execFileSync('git', ['show', `HEAD:${rel}`], { cwd: dirname(blocksDir), stdio: ['ignore', 'pipe', 'pipe'] }).toString()
      const baseline = (JSON.parse(headRaw) as { contract?: { assertions: string[]; forbidden: string[] } }).contract
      if (baseline) {
        const liveA = new Set(mod.CONTRACT.assertions.map((a) => a.id))
        const liveF = new Set(mod.CONTRACT.forbidden.map((f) => f.id))
        for (const id of baseline.assertions) if (!liveA.has(id)) errors.push(`${b.name}: assertion "${id}" removed from contract — loosening requires a human commit of the baseline`)
        for (const id of baseline.forbidden) if (!liveF.has(id)) errors.push(`${b.name}: forbidden "${id}" removed from contract — loosening requires a human commit of the baseline`)
      }
    } catch {
      /* not a git checkout, or block.json not yet committed — the ratchet arms on first commit */
    }
  } catch (e) {
    errors.push(`${b.name}: contract.ts failed to load — ${(e as Error).message.slice(0, 100)}`)
  }
}

if (errors.length) {
  try {
    const { recordEvidence } = await import('./evidence.ts')
    recordEvidence('contracts', 'check-red', errors.slice(0, 2).join(' | '))
  } catch {
    /* best-effort */
  }
  console.error(`CONTRACT VIOLATIONS (${errors.length}):`)
  for (const e of errors) console.error(`  - ${e}`)
  process.exit(1)
}
console.log(`check-contracts: ${covered}/${built.length} built blocks carry a valid contract (S7 coverage)`)
