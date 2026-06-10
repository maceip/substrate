// _fingerprint.ts — test helper. Runs a fixed app sequence against whatever adapter GATES_ADAPTER
// selects and prints a stable fingerprint of the PORT-INVARIANT observable result. Used by
// block.test.ts to assert port invariance across adapters.
//
// It fingerprints only what the port GUARANTEES at every grade — report.pass, and each failure's
// id+severity, plus list(). It deliberately omits report.attribution / failure.attribution, which is
// a GRADE feature (graduated only), not a port guarantee — the analog of persistence fingerprinting
// names/versions, not the engine. The whole point: swapping the grade must not change app behavior.

import { gateSet } from './index.ts'
import type { Artifact, Gate } from './index.ts'

const noTodo: Gate = {
  id: 'no-todo',
  severity: 'block',
  describe: 'shipped code carries no TODO marker',
  check: (a: Artifact) => {
    const hit = (a.files ?? []).find((f) => f.content.includes('TODO'))
    return hit ? { pass: false, detail: `TODO found in ${hit.path}` } : { pass: true }
  },
}

const hasOutput: Gate = {
  id: 'has-output',
  severity: 'warn',
  describe: 'the artifact reports some output',
  check: (a: Artifact) => (a.output && a.output.length > 0 ? { pass: true } : { pass: false, detail: 'no output' }),
}

const gs = await gateSet()
gs.register(noTodo)
gs.register(hasOutput)

const clean: Artifact = { files: [{ path: 'a.ts', content: 'export const x = 1' }], output: 'ok' }
const dirty: Artifact = { files: [{ path: 'b.ts', content: '// TODO: fix' }], output: '' }

const pass = gs.evaluate(clean)
const fail = gs.evaluate(dirty)
const ids = gs.list()
gs.close()

// Only port-guaranteed fields. Failures sorted by id so order is stable across adapters.
const flat = (fs: { id: string; severity: string }[]) => fs.map((f) => `${f.id}:${f.severity}`).sort()
process.stdout.write(
  JSON.stringify({
    pass: { pass: pass.pass, failures: flat(pass.failures) },
    fail: { pass: fail.pass, failures: flat(fail.failures) },
    list: flat(ids),
  }),
)
