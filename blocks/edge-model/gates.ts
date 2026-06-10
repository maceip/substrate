// gates.ts — THE GRADING / GATING MODEL for edge-model. [PROTECTED]
//
// Ladder from the local/edge model lifecycle (the user's omlx/hf/download_model.sh/yt-dlp/uv
// signal): fetch+cache from a url/file ref -> + format conversion + checksum-on-load -> + a
// warm pool and multi-format. The first gate fires when a downloaded artifact matters (prod,
// or enough calls a re-download or a torn cache file becomes a certainty) — content-addressed
// caching and checksum verification stop being optional. The second fires when more than one
// format must be reachable, or a shared cache is in play and reloading the weights per call is
// the bottleneck — a warm pool (load once, reuse) becomes mandatory.
//
// MOSS: every gate and requirement is an executable predicate, not prose. The check runs.
// AEvo: this file is PROTECTED. Gates may be ADDED or RAISED (tightened); never removed or
//       lowered without human approval. assertNoLoosening enforces the structural half.

import type { Grade } from './port.ts'
import { gradeAtLeast } from './port.ts'
export { assertNoLoosening } from '../_kernel/grade.ts'

// Signals are read from the code/infra, NOT asked of the human. Graduation is organic.
export interface EdgeSignals {
  prod: boolean // the model is run to serve real work, not a one-off experiment
  callsPerDay: number // approximate daily inference volume
  multiFormat: boolean // more than one artifact format must be reachable (gguf + onnx, etc.)
  sharedCache: boolean // the artifact cache is shared across processes/runs
}

// What the evaluator can introspect to decide if a requirement is met.
export interface RequirementContext {
  signals: EdgeSignals
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
  triggered: (s: EdgeSignals) => boolean
  activates: Requirement[]
}

// --- Requirements --------------------------------------------------------------------

const cap = (name: string, id: string, describe: string): Requirement => ({ id, describe, satisfiedBy: (c) => c.capabilities.has(name) })

const contentAddressedCache = cap(
  'content-addressed-cache',
  'content-addressed-cache',
  'a fetched artifact is stored under its sha256 and a re-fetch of the same ref is a cache hit — the same model is never downloaded twice',
)
const checksumVerified = cap(
  'checksum-verified',
  'checksum-verified',
  'a cached artifact is checksum-verified on load — a corrupted or truncated download is rejected, not silently run',
)
const formatConvert = cap(
  'format-convert',
  'format-convert',
  'the runtime can convert a fetched artifact to the format it runs (raw -> gguf/onnx) behind the port, so an app never shells out to a converter',
)
const warmPool = cap(
  'warm-pool',
  'warm-pool',
  'a loaded model is reused across run() calls (load once, reuse) — not reloaded from disk per call',
)

// --- Gates ---------------------------------------------------------------------------
// Each gate's `triggered` is the threshold; `activates` is what becomes mandatory the
// moment it is crossed. This list is the protected evaluator.

export const GATES: Gate[] = [
  {
    id: 'gate:nursery->elementary',
    from: 'nursery',
    to: 'elementary',
    why: 'the downloaded artifact now matters — prod work, or enough daily calls that a silent re-download or a corrupted cache file is a certainty, not an edge case',
    triggered: (s) => s.prod || s.callsPerDay > 100,
    activates: [contentAddressedCache, checksumVerified],
  },
  {
    id: 'gate:elementary->graduated',
    from: 'elementary',
    to: 'graduated',
    why: 'more than one format must be reachable, or a shared cache is in play where reloading the weights from disk on every call is the bottleneck — a warm pool is no longer optional',
    triggered: (s) => s.multiFormat || s.sharedCache,
    activates: [formatConvert, warmPool],
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
