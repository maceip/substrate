// contract.ts — PROTOCOL S7: agent-gates' port promises as DATA.
//
// PRIMARY OUTPUT: the Report that evaluate() hands to consumers — the verdict an agent (or a
// human) acts on. The load-bearing promise is port guarantee 2, stated as an iff: pass is
// true exactly when there is no 'block'-severity failure. Warns are surfaced but advisory;
// fail-closed evaluation (guarantee 1) means a throwing gate becomes a block failure, which
// this same assertion then forces to pass=false.

import { z } from 'zod'
import type { PortContract } from '../_kernel/contract.ts'

const failureShape = z.object({
  id: z.string().min(1),
  severity: z.enum(['block', 'warn']),
  detail: z.string(),
  attribution: z.enum(['local', 'upstream', 'structural']).optional(),
})

const reportShape = z.object({
  pass: z.boolean(),
  failures: z.array(failureShape),
  attribution: z.boolean().optional(),
})

export const CONTRACT: PortContract = {
  block: 'agent-gates',
  output: reportShape,
  assertions: [
    {
      id: 'pass-iff-no-blocking-failure',
      describe: "pass is true exactly when no failure has severity 'block' — a warn never fails the report, a block always does, and there is no silent pass",
      holds: (v) => {
        const r = v as { pass: boolean; failures: { severity: string }[] }
        return r.pass === !r.failures.some((f) => f.severity === 'block')
      },
    },
  ],
  forbidden: [],
}

// A known-good output (a passing report that still surfaces one advisory warn) that CONTRACT
// must accept.
export const SAMPLE: unknown = {
  pass: true,
  failures: [{ id: 'no-todo-in-shipped-code', severity: 'warn', detail: '1 TODO remains in a comment' }],
}
