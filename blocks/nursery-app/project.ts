// project.ts — the project-wide grade view.
//
// One ProjectSignals drives every block's gate evaluator at once. This is the whole thesis in
// one function: you describe the project's situation once, and each block tells you what grade
// it now requires and what it's missing — "when you cross a threshold, every block's
// requirements light up together," not block-by-block guesswork.

import * as persistence from '../persistence/index.ts'
import * as envBlock from '../env/index.ts'
import * as logging from '../logging/index.ts'
import * as transport from '../transport/index.ts'
import * as validation from '../input-validation/index.ts'
import * as guard from '../request-guard/index.ts'
import type { EnvSpec } from '../env/index.ts'

export interface ProjectSignals {
  writers: number
  instances: number
  prod: boolean
  rows: number
  public: boolean
}

export interface BlockGrade {
  block: string
  requiredGrade: string
  ok: boolean
  unmet: { requirement: string; describe: string }[]
}

export async function gradeReport(p: ProjectSignals, sampleRecord: object, envSpec: EnvSpec): Promise<BlockGrade[]> {
  const [pers, env, log, tx, val, grd] = await Promise.all([
    persistence.checkGrade({ writers: p.writers, instances: p.instances, prodData: p.prod, rows: p.rows }, { sampleRecord }),
    envBlock.checkGrade(envSpec, { prod: p.prod, instances: p.instances }),
    logging.checkGrade({ prod: p.prod, instances: p.instances }),
    transport.checkGrade({ public: p.public, prod: p.prod, instances: p.instances }),
    validation.checkGrade({ public: p.public, prod: p.prod, sharedClient: false }),
    guard.checkGrade({ public: p.public, instances: p.instances }),
  ])
  const rows: BlockGrade[] = [
    ['persistence', pers],
    ['env', env],
    ['logging', log],
    ['transport', tx],
    ['input-validation', val],
    ['request-guard', grd],
  ].map(([block, e]) => ({ block: block as string, requiredGrade: (e as typeof pers).requiredGrade, ok: (e as typeof pers).ok, unmet: (e as typeof pers).unmet.map((u) => ({ requirement: u.requirement, describe: u.describe })) }))
  return rows
}

export function printReport(label: string, rows: BlockGrade[]): void {
  console.log(`\n  project grade — ${label}`)
  for (const r of rows) {
    const status = r.ok ? 'OK' : 'ACTION'
    console.log(`    ${r.block.padEnd(12)} required:${r.requiredGrade.padEnd(11)} ${status}`)
    for (const u of r.unmet) console.log(`        ✗ ${u.requirement}: ${u.describe}`)
  }
}
