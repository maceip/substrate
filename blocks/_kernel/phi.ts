// _kernel/phi.ts — the Φ observer (AEvo, corrected: this is the paper's actual contribution).
//
// AEvo (arXiv:2605.13821): a meta-agent observes a SUMMARY of the process — progress,
// repeated failures, costs, redundant directions — and emits EXACTLY ONE meta-action per
// boundary. Our boundary is a steward run. Φ reads the instruments that already exist
// (lens history, repeat ledger, evidence queue, consolidation queue) and names the single
// highest-leverage action. It never acts; the loop that runs it (steward, human, cron)
// decides. Φ's own history is recorded so the next observation can see redundancy.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { consolidationDue } from './fot.ts'
import { sealedBatches } from './evidence.ts'

export interface PhiInputs {
  sealedUnits: { unit: string; batches: number }[]
  consolidationDue: { block: string; count: number }[]
  repeats: number
  prevRepeats: number | null
  orchestrationShare: number | null
  prevOrchestrationShare: number | null
  autoTightenings: number | null
  lastAction: string | null
}

export interface PhiDecision {
  observation: string
  action: string // exactly one
}

// observe: pure ranking — rewrite queue beats consolidation beats repeats beats north-star
// drift beats idle. One action, always.
export function observe(i: PhiInputs): PhiDecision {
  const obs: string[] = []
  if (i.sealedUnits.length) obs.push(`rewrite queue: ${i.sealedUnits.map((s) => `${s.unit}(${s.batches})`).join(', ')}`)
  if (i.consolidationDue.length) obs.push(`consolidation due: ${i.consolidationDue.map((d) => `${d.block}:${d.count}`).join(', ')}`)
  if (i.prevRepeats !== null && i.repeats > i.prevRepeats) obs.push(`repeats rose ${i.prevRepeats} -> ${i.repeats}`)
  if (i.orchestrationShare !== null && i.prevOrchestrationShare !== null && i.orchestrationShare > i.prevOrchestrationShare)
    obs.push(`north star WRONG direction (${i.prevOrchestrationShare} -> ${i.orchestrationShare})`)
  if (i.autoTightenings === 0) obs.push('auto-tighten counter still 0')
  const observation = obs.length ? obs.join('; ') : 'all instruments quiet'

  let action: string
  if (i.sealedUnits.length) {
    action = `run a rewrite cycle: node tools/crispr.ts ${i.sealedUnits[0].unit}`
  } else if (i.consolidationDue.length) {
    action = `run consolidation: node blocks/_kernel/consolidate-cli.ts ${i.consolidationDue[0].block}`
  } else if (i.prevRepeats !== null && i.repeats > i.prevRepeats) {
    action = 'a known problem bit again — find which defense (gate/lesson/case) should have caught it and tighten that'
  } else if (i.orchestrationShare !== null && i.prevOrchestrationShare !== null && i.orchestrationShare > i.prevOrchestrationShare) {
    action = 'the user is driving MORE, not less — identify the most recent manual intervention and chokepoint it'
  } else {
    action = 'no mechanism work due — spend the next cycle on a real project (the user lens decides everything now)'
  }
  // redundancy guard (AEvo: redundant search directions are themselves a signal)
  if (i.lastAction === action && !action.startsWith('no mechanism')) {
    action += ' (REPEATED from last cycle — if it was attempted and failed, that failure is evidence; record it)'
  }
  return { observation, action }
}

// gather + record: the impure shell around observe().
const PHI_LOG = () => join(process.env.SUBSTRATE_HOME ?? join(homedir(), '.substrate'), 'phi.json')

export function phi(lensHistoryPath: string): PhiDecision {
  interface Snap {
    user: { orchestrationShare: number | null }
    papers: { repeats: number; autoTightenings?: number | null }
  }
  let hist: Snap[] = []
  try {
    hist = JSON.parse(readFileSync(lensHistoryPath, 'utf8')) as Snap[]
  } catch {
    /* no lens history yet */
  }
  const last = hist[hist.length - 1]
  const prev = hist[hist.length - 2]
  let prior: { action: string }[] = []
  try {
    prior = JSON.parse(readFileSync(PHI_LOG(), 'utf8')) as { action: string }[]
  } catch {
    /* first observation */
  }
  const decision = observe({
    sealedUnits: Object.entries(sealedBatches()).map(([unit, b]) => ({ unit, batches: b.length })),
    consolidationDue: consolidationDue(),
    repeats: last?.papers.repeats ?? 0,
    prevRepeats: prev?.papers.repeats ?? null,
    orchestrationShare: last?.user.orchestrationShare ?? null,
    prevOrchestrationShare: prev?.user.orchestrationShare ?? null,
    autoTightenings: last?.papers.autoTightenings ?? null,
    lastAction: prior[prior.length - 1]?.action ?? null,
  })
  const entry = { ts: new Date().toISOString(), ...decision }
  if (!existsSync(dirname(PHI_LOG()))) mkdirSync(dirname(PHI_LOG()), { recursive: true })
  writeFileSync(PHI_LOG(), JSON.stringify([...prior.slice(-49), entry], null, 2))
  return decision
}
