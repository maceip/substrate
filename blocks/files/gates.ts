// gates.ts — THE GRADING / GATING MODEL for files. [PROTECTED]
//
// Ladder from the port catalog (`files-artifacts-storage`, mined from real repos): local
// filesystem/blob adapter -> S3/R2/GCS, signed URLs, lifecycle policies. The first gate
// fires when stored objects matter (prod data, or enough objects that silent loss hurts);
// the second when more than one instance must see one logical store, when download links
// leave your control, or when volume demands lifecycle management.
//
// MOSS: every gate and requirement is an executable predicate, not prose. The check runs.
// AEvo: this file is PROTECTED. Gates may be ADDED or RAISED (tightened); never removed or
//       lowered without human approval. assertNoLoosening enforces the structural half.

import type { Grade } from './port.ts'
import { gradeAtLeast } from './port.ts'
export { assertNoLoosening } from '../_kernel/grade.ts'

// Signals are read from the code/infra, NOT asked of the human. Graduation is organic.
export interface FileSignals {
  prodData: boolean // stored objects must outlive the process in production
  publicDownloads: boolean // download URLs are handed to clients you do not control
  instances: number // app processes that must see ONE logical object store
  objectCount: number // approximate number of stored objects
  totalBytes: number // approximate total stored bytes
}

// What the evaluator can introspect to decide if a requirement is met.
export interface RequirementContext {
  signals: FileSignals
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
  triggered: (s: FileSignals) => boolean
  activates: Requirement[]
}

// --- Requirements --------------------------------------------------------------------

const cap = (name: string, id: string, describe: string): Requirement => ({ id, describe, satisfiedBy: (c) => c.capabilities.has(name) })

const atomicPut = cap('atomic-put', 'atomic-put', 'a put lands completely or not at all (write-temp + atomic rename) — a crash mid-upload cannot leave a torn object behind a valid key')
const contentHash = cap('content-hash', 'content-hash', 'every object carries a sha256 etag so corruption is detectable and dedup/conditional-fetch have a hook')
const expiringUrls = cap('expiring-urls', 'expiring-urls', 'download URLs carry a signed expiry — a leaked link goes dead instead of living forever')
const sharedBackend = cap('shared-backend', 'shared-backend', 'an object written by one instance is readable by every other, not trapped on one process or one disk')
const lifecyclePolicy = cap('lifecycle-policy', 'lifecycle-policy', 'expired objects are physically reclaimed by a sweep, not just hidden at read time — storage cannot grow without bound')

// --- Gates ---------------------------------------------------------------------------
// Each gate's `triggered` is the threshold; `activates` is what becomes mandatory the
// moment it is crossed. This list is the protected evaluator.

export const GATES: Gate[] = [
  {
    id: 'gate:nursery->elementary',
    from: 'nursery',
    to: 'elementary',
    why: 'stored objects now matter in production, or there are enough of them that a torn or silently corrupted object would hurt — loss is no longer acceptable',
    triggered: (s) => s.prodData || s.objectCount > 100,
    activates: [atomicPut, contentHash],
  },
  {
    id: 'gate:elementary->graduated',
    from: 'elementary',
    to: 'graduated',
    why: 'multiple instances need one logical store, download links leave your control, or volume needs lifecycle management — a single local disk cannot hold the line',
    triggered: (s) => s.instances > 1 || s.publicDownloads || s.totalBytes > 5_000_000_000,
    activates: [expiringUrls, sharedBackend, lifecyclePolicy],
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
