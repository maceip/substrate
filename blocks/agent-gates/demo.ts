// demo.ts — a tiny self-checking agent loop built ONLY against ./index.ts
//
// It never imports an adapter, a grade, or the port file directly. Run it under different
// GATES_ADAPTER values and the app code is byte-for-byte identical — that is the port doing its
// job. It registers two contracts-in-code, checks a passing then a failing artifact, proves the
// runner is FAIL-CLOSED on a throwing gate, shows the adapter swap leaves observable behavior
// identical, and prints the block's grade dashboard across the project lifecycle.
//
//   node agent-gates/demo.ts
//   GATES_ADAPTER=nursery node agent-gates/demo.ts
//   GATES_ADAPTER=graduated node agent-gates/demo.ts

import { gateSet, checkGrade, currentGrade } from './index.ts'
import type { Artifact, Gate, Report } from './index.ts'

// Two contracts that live in CODE (MOSS), not in a style guide an agent reads past.
const noTodoInShippedCode: Gate = {
  id: 'no-todo-in-shipped-code',
  severity: 'block',
  describe: 'no TODO marker survives into shipped code',
  check: (a: Artifact) => {
    const hit = (a.files ?? []).find((f) => f.content.includes('TODO'))
    return hit ? { pass: false, detail: `TODO found in ${hit.path}` } : { pass: true }
  },
}

const everyClaimHasEvidence: Gate = {
  id: 'every-claim-has-evidence',
  severity: 'block',
  describe: 'each claim the agent makes cites evidence it produced',
  check: (a: Artifact) => {
    const claims = a.claims ?? {}
    const missing = Object.keys(claims).filter((k) => !claims[k])
    return missing.length ? { pass: false, detail: `claim without evidence: ${missing.join(', ')}` } : { pass: true }
  },
}

function fmtReport(label: string, r: Report) {
  const verdict = r.pass ? 'PASS' : 'FAIL'
  const lines = [`  ${label} -> ${verdict}`]
  for (const f of r.failures) {
    const where = f.attribution ? `  [${f.attribution}]` : ''
    lines.push(`      ${f.severity === 'block' ? '✗' : '!'} ${f.id}: ${f.detail}${where}`)
  }
  return lines.join('\n')
}

const grade = await currentGrade()
console.log(`\n=== agent-gates block — adapter grade: ${grade} ===\n`)

const gs = await gateSet()
gs.register(noTodoInShippedCode)
gs.register(everyClaimHasEvidence)

// A passing artifact: clean code, every claim backed.
const good: Artifact = {
  files: [{ path: 'src/index.ts', content: 'export const greet = () => "hi"' }],
  claims: { 'tests pass': 'ran 12 tests, 0 failed' },
}
// A failing artifact: a shipped TODO (local) and an unbacked claim (upstream).
const bad: Artifact = {
  files: [{ path: 'src/index.ts', content: '// TODO: handle errors\nexport const greet = () => "hi"' }],
  claims: { 'tests pass': '' },
}

console.log('self-check of agent output:')
console.log(fmtReport('passing artifact', gs.evaluate(good)))
console.log(fmtReport('failing artifact', gs.evaluate(bad)))

// FAIL-CLOSED: a gate whose check() THROWS is a blocking failure with the thrown reason — never a
// silent pass. An exception is the least safe moment to assume the work is fine.
const throwingGate: Gate = {
  id: 'parses-config',
  severity: 'block',
  describe: 'the config parses',
  check: () => {
    throw new Error('config parser crashed')
  },
}
gs.register(throwingGate)
console.log('\nfail-closed (a gate that throws):')
console.log(fmtReport('throwing artifact', gs.evaluate(good)))
gs.close()

// The adapter swap: the SAME observable result under two grades. The fingerprint helper runs an
// identical app sequence; only the env var changes. Equal output == the port held.
console.log('\nadapter swap (identical fingerprint across grades):')
const { execFileSync } = await import('node:child_process')
const fp = (adapter: string) =>
  execFileSync(process.execPath, [new URL('./_fingerprint.ts', import.meta.url).pathname], {
    env: { ...process.env, GATES_ADAPTER: adapter },
    encoding: 'utf8',
  }).trim()
const a = fp('nursery')
const b = fp('graduated')
console.log(`  nursery   : ${a}`)
console.log(`  graduated : ${b}`)
console.log(`  identical : ${a === b ? 'yes — the port held' : 'NO — port leak!'}`)

// Grade dashboard: the SHARED block-grading axis (gates.ts), across the project lifecycle.
function fmtGrade(label: string, e: Awaited<ReturnType<typeof checkGrade>>) {
  const verdict = e.ok ? 'OK' : e.underGraded ? `UNDER-GRADED (need ${e.requiredGrade})` : 'REQUIREMENTS UNMET'
  const lines = [`  ${label} -> required:${e.requiredGrade}  ${verdict}`]
  for (const u of e.unmet) lines.push(`      ✗ ${u.requirement}: ${u.describe}`)
  return lines.join('\n')
}

console.log('\ngrade evaluation across the project lifecycle:')
console.log(fmtGrade('day 1   (no agent edits yet)     ', await checkGrade({ agentEdits: false, prod: false, gateCount: 1 })))
console.log(fmtGrade('week 1  (agents editing, dev)    ', await checkGrade({ agentEdits: true, prod: false, gateCount: 2 })))
console.log(fmtGrade('month 3 (self-checks ship, prod) ', await checkGrade({ agentEdits: true, prod: true, gateCount: 5 })))
console.log('')
