// _kernel/contract.ts — PROTOCOL SEGMENT S7: the declarative contract (Meta-Agent, corrected).
//
// The Meta-Agent paper's load-bearing design choice (arXiv:2605.25233, read Jun 12): a
// component's verification criteria are DATA attached to its contract — typed output schema +
// behavioral assertions + forbidden patterns — consumable by BOTH construction-time
// verification and the runtime attribution walker. Once edges carry validatable contracts,
// LOCAL-vs-UPSTREAM attribution is a mechanical walk: a value that violates its producer's
// contract at my input ⇒ UPSTREAM; valid inputs + my red test ⇒ LOCAL; mutually
// unsatisfiable contracts ⇒ STRUCTURAL.
//
// One contract object per port, exported as `CONTRACT` from the block's contract.ts.
// Adoption is progressive (PROTOCOL S7): required for every block touched from now on.

import { z } from 'zod'

export interface Assertion {
  id: string
  describe: string
  holds: (value: unknown) => boolean
}

export interface Forbidden {
  id: string
  describe: string
  violatedBy: (value: unknown) => boolean
}

export interface PortContract {
  block: string
  output: z.ZodType // the typed edge: what this port hands downstream
  assertions: Assertion[] // must all hold on every output
  forbidden: Forbidden[] // must never match any output
}

export interface ContractVerdict {
  ok: boolean
  violations: { kind: 'schema' | 'assertion' | 'forbidden'; id: string; detail: string }[]
}

export function checkContract(contract: PortContract, value: unknown): ContractVerdict {
  const violations: ContractVerdict['violations'] = []
  const parsed = contract.output.safeParse(value)
  if (!parsed.success) {
    for (const issue of parsed.error.issues.slice(0, 5)) {
      violations.push({ kind: 'schema', id: issue.path.join('.') || '(root)', detail: issue.message })
    }
  }
  for (const a of contract.assertions) {
    let holds = false
    try {
      holds = a.holds(value)
    } catch {
      /* a throwing assertion is a failed assertion — fail closed */
    }
    if (!holds) violations.push({ kind: 'assertion', id: a.id, detail: a.describe })
  }
  for (const f of contract.forbidden) {
    let violated = false
    try {
      violated = f.violatedBy(value)
    } catch {
      /* a throwing forbidden-check cannot prove innocence — fail closed */
      violated = true
    }
    if (violated) violations.push({ kind: 'forbidden', id: f.id, detail: f.describe })
  }
  return { ok: violations.length === 0, violations }
}

// attribute: the mechanical walk. Given a failure at `block` and the contract verdicts of its
// upstream inputs, classify the failure level (Meta-Agent's three-level taxonomy).
export type AttributionLevel = 'local' | 'upstream' | 'structural'
export function attribute(inputVerdicts: { producer: string; verdict: ContractVerdict }[]): {
  level: AttributionLevel
  culprit: string | null
} {
  const bad = inputVerdicts.filter((v) => !v.verdict.ok)
  if (bad.length === 1) return { level: 'upstream', culprit: bad[0].producer }
  if (bad.length > 1) return { level: 'structural', culprit: null } // multiple violated edges: the wiring, not one node
  return { level: 'local', culprit: null } // all inputs honored their contracts; the failure is mine
}
