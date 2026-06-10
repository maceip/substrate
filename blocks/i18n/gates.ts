// gates.ts — THE GRADING / GATING MODEL for i18n. [PROTECTED]
//
// Ladder from the port catalog (`i18n-localization-routing`, mined from real repos): single-
// locale route wrapper and message file -> multi-locale routing, Crowdin/import pipeline,
// localized auth/UI. The first gate fires when a second locale appears or the strings ship to
// real users (a missing key or an un-interpolated {name} is now a user-facing defect); the
// second when external translators feed the catalog — at that point gaps must be measured and
// merged through a pipeline, not discovered in production.
//
// MOSS: every gate and requirement is an executable predicate, not prose. The check runs.
// AEvo: this file is PROTECTED. Gates may be ADDED or RAISED (tightened); never removed or
//       lowered without human approval. assertNoLoosening enforces the structural half.

import type { Grade } from './port.ts'
import { gradeAtLeast } from './port.ts'
export { assertNoLoosening } from '../_kernel/grade.ts'

// Signals are read from the code/infra, NOT asked of the human. Graduation is organic.
export interface I18nSignals {
  locales: number // how many locales the project must serve
  prod: boolean // these strings now reach real users in production
  public: boolean // untrusted/anonymous users hit localized surfaces (auth/UI), not just staff
  externalTranslators: boolean // translations arrive from outside (Crowdin, vendors, contributors)
}

// What the evaluator can introspect to decide if a requirement is met.
export interface RequirementContext {
  signals: I18nSignals
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
  triggered: (s: I18nSignals) => boolean
  activates: Requirement[]
}

// --- Requirements --------------------------------------------------------------------

const cap = (name: string, id: string, describe: string): Requirement => ({ id, describe, satisfiedBy: (c) => c.capabilities.has(name) })

const fallbackPolicy = cap('fallback-policy', 'fallback-policy', 'a missing key resolves by a STATED policy (requested locale -> default locale -> the key itself), never a throw and never an empty string')
const missingKeyReported = cap('missing-key-reported', 'missing-key-reported', 'a missing key is reported through a seam so an operator catches it, instead of silently degrading')
const interpolationChecked = cap('interpolation-checked', 'interpolation-checked', 'a declared {var} the call omits is reported (and left visible), so "Hello, {name}" can never ship to a user unnoticed')
const localeNegotiation = cap('locale-negotiation', 'locale-negotiation', 'an Accept-Language header / preference list is negotiated to the best AVAILABLE locale, falling back to the default — never an unservable one')
const catalogCompleteness = cap('catalog-completeness', 'catalog-completeness', 'non-default locales are measured against the default locale\'s keys and the gaps are REPORTED, not hidden behind silent fallback')
const importPipeline = cap('import-pipeline', 'import-pipeline', 'external translations are merged through a pipeline that reports coverage %, instead of being discovered missing in production')

// --- Gates ---------------------------------------------------------------------------
// Each gate's `triggered` is the threshold; `activates` is what becomes mandatory the
// moment it is crossed. This list is the protected evaluator.

export const GATES: Gate[] = [
  {
    id: 'gate:nursery->elementary',
    from: 'nursery',
    to: 'elementary',
    why: 'a second locale appears, or the strings now reach real users — a missing key or an un-interpolated {name} is a user-facing defect, so the fallback policy, reporting, interpolation checks, and negotiation must all be real',
    triggered: (s) => s.locales > 1 || s.prod || s.public,
    activates: [fallbackPolicy, missingKeyReported, interpolationChecked, localeNegotiation],
  },
  {
    id: 'gate:elementary->graduated',
    from: 'elementary',
    to: 'graduated',
    why: 'translations arrive from outside, or enough locales exist that coverage cannot be eyeballed — gaps must be measured and merged through an import pipeline, not found in production',
    triggered: (s) => s.externalTranslators || s.locales > 4,
    activates: [catalogCompleteness, importPipeline],
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
