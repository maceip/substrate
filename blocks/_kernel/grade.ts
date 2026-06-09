// _kernel/grade.ts — the spine every block shares.
//
// One definition of the grade ladder and the protected-evaluator primitives, so that
// (a) blocks agree on what "elementary" means and a project-wide grade check can compare
// them, and (b) the AEvo no-loosening rule is written once, not re-derived per block.

export type Grade = 'nursery' | 'elementary' | 'graduated'

export const GRADE_ORDER: Grade[] = ['nursery', 'elementary', 'graduated']

export function gradeAtLeast(have: Grade, need: Grade): boolean {
  return GRADE_ORDER.indexOf(have) >= GRADE_ORDER.indexOf(need)
}

export function higherGrade(a: Grade, b: Grade): Grade {
  return GRADE_ORDER.indexOf(a) >= GRADE_ORDER.indexOf(b) ? a : b
}

// AEvo: structural half of "agents may tighten, not loosen". No gate id may vanish, and no
// requirement id may vanish from a gate. Adding gates or requirements (tightening) is fine.
export interface GateLike {
  id: string
  activates: { id: string }[]
}

export function assertNoLoosening(committed: GateLike[], proposed: GateLike[]): string[] {
  const violations: string[] = []
  const byId = new Map(proposed.map((g) => [g.id, g]))
  for (const c of committed) {
    const p = byId.get(c.id)
    if (!p) {
      violations.push(`gate ${c.id} was removed (loosening — needs human approval)`)
      continue
    }
    const reqs = new Set(p.activates.map((r) => r.id))
    for (const r of c.activates) {
      if (!reqs.has(r.id)) violations.push(`gate ${c.id} dropped requirement ${r.id} (loosening)`)
    }
  }
  return violations
}
