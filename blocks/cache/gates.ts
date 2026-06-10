// gates.ts — THE GRADING / GATING MODEL for cache. [PROTECTED]
//
// Ladder from the port catalog (`cache-ephemeral-state`, mined from real repos): in-memory
// TTL cache behind a get/set interface -> Redis/Memcached, distributed locks, stampede
// protection. The first gate fires when cached results matter (prod, or a miss is
// expensive); the second when more than one instance must see one logical cache.
//
// MOSS: every gate and requirement is an executable predicate, not prose. The check runs.
// AEvo: this file is PROTECTED. Gates may be ADDED or RAISED (tightened); never removed or
//       lowered without human approval. assertNoLoosening enforces the structural half.

import type { Grade } from './port.ts'
import { gradeAtLeast } from './port.ts'
export { assertNoLoosening } from '../_kernel/grade.ts'

// Signals are read from the code/infra, NOT asked of the human. Graduation is organic.
export interface CacheSignals {
  prod: boolean // cached results are served to real users
  instances: number // app processes that should see ONE logical cache
  hotKeys: number // keys with overlapping concurrent readers (stampede candidates)
  fillCostMs: number // typical cost of recomputing a miss
}

// What the evaluator can introspect to decide if a requirement is met.
export interface RequirementContext {
  signals: CacheSignals
  capabilities: Set<string> // what the current adapter guarantees
  adapterGrade: Grade // current adapter's maxGrade
}

export interface Requirement {
  id: string
  describe: string
  satisfiedBy: (ctx: RequirementContext) => boolean
}

export interface Gate {
  id: string
  from: Grade
  to: Grade
  why: string
  triggered: (s: CacheSignals) => boolean
  activates: Requirement[]
}

// --- Requirements --------------------------------------------------------------------

const cap = (name: string, id: string, describe: string): Requirement => ({ id, describe, satisfiedBy: (c) => c.capabilities.has(name) })

const ttlEnforced = cap('ttl', 'ttl-enforced', 'an entry past its TTL is never served — expiry is a guarantee of the port, not advisory')
const boundedSize = cap('bounded', 'bounded-size', 'entry count has a ceiling with eviction — the cache cannot grow until the process OOMs')
const singleFlight = cap('single-flight', 'single-flight', 'concurrent misses for one key coalesce into ONE fill — a hot miss cannot stampede the source')
const sharedBackend = cap('shared-backend', 'shared-backend', 'entries and invalidations are visible across instances, not trapped per-process')
const sharedSingleFlight = cap('shared-single-flight', 'shared-single-flight', 'the fill lock holds ACROSS processes (distributed lock), not just within one')

// --- Gates ---------------------------------------------------------------------------
// Each gate's `triggered` is the threshold; `activates` is what becomes mandatory the
// moment it is crossed. This list is the protected evaluator.

export const GATES: Gate[] = [
  {
    id: 'gate:nursery->elementary',
    from: 'nursery',
    to: 'elementary',
    why: 'cached results now reach real users, or a miss is expensive — unbounded growth, advisory TTLs, and thundering-herd fills stop being acceptable',
    triggered: (s) => s.prod || (s.hotKeys > 0 && s.fillCostMs > 100),
    activates: [ttlEnforced, boundedSize, singleFlight],
  },
  {
    id: 'gate:elementary->graduated',
    from: 'elementary',
    to: 'graduated',
    why: 'multiple instances — a per-process cache serves N different truths and a per-process lock multiplies fills by the instance count',
    triggered: (s) => s.instances > 1,
    activates: [sharedBackend, sharedSingleFlight],
  },
]

// --- Evaluator -----------------------------------------------------------------------

export interface Unmet {
  gate: string
  requirement: string
  describe: string
}

export interface Evaluation {
  requiredGrade: Grade
  crossed: string[] // gate ids whose threshold is met
  unmet: Unmet[] // activated requirements not yet satisfied
  underGraded: boolean // current adapter cannot reach requiredGrade
  ok: boolean
}

export function evaluate(ctx: RequirementContext, gates: Gate[] = GATES): Evaluation {
  let requiredGrade: Grade = 'nursery'
  const crossed: string[] = []
  const unmet: Unmet[] = []

  for (const gate of gates) {
    if (!gate.triggered(ctx.signals)) continue
    crossed.push(gate.id)
    if (gradeAtLeast(gate.to, requiredGrade)) requiredGrade = gate.to
    for (const req of gate.activates) {
      if (!req.satisfiedBy(ctx)) unmet.push({ gate: gate.id, requirement: req.id, describe: req.describe })
    }
  }

  const underGraded = !gradeAtLeast(ctx.adapterGrade, requiredGrade)
  return { requiredGrade, crossed, unmet, underGraded, ok: unmet.length === 0 && !underGraded }
}

// AEvo protection (assertNoLoosening) is the shared spine primitive, re-exported at the top
// of this file from ../_kernel/grade.ts — written once, used by every block.
