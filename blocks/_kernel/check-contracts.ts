// _kernel/check-contracts.ts — PROTOCOL S7's construction-time half, as a predicate.
//
//   node blocks/_kernel/check-contracts.ts       (exit 1 on violation)
//
// The Meta-Agent ablation says construction-time verification is the single most valuable
// component (+7.1). v1: every contract.ts must parse, export CONTRACT + SAMPLE, and
// CONTRACT must accept its own SAMPLE. Coverage is reported so the gap is a number, not
// a feeling. Runs in the nursery chain; stamps inherit it through their block suites later.

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
    const verdict = checkContract(mod.CONTRACT, mod.SAMPLE)
    if (!verdict.ok) errors.push(`${b.name}: CONTRACT rejects its own SAMPLE — ${verdict.violations.map((v) => `${v.kind}:${v.id}`).join(', ')}`)
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
