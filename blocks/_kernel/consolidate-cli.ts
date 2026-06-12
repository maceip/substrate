// _kernel/consolidate-cli.ts — run the S5 consolidation pass for real.
//
//   node _kernel/consolidate-cli.ts [block ...]     (default: every block past the sweet spot)
//
// The model is the local `claude` CLI in print mode (already authenticated on this machine);
// set CONSOLIDATE_MODEL_CMD to override (a command receiving the prompt on stdin, replying on
// stdout). Archives the pre-merge library, applies the merge, re-renders insights.md.

import { execFileSync } from 'node:child_process'
import { archivePreMerge, consolidateBlock } from './consolidate.ts'
import { consolidationDue, recall, replaceLibrary } from './fot.ts'

const cmd = process.env.CONSOLIDATE_MODEL_CMD ?? 'claude'
const model = async (prompt: string): Promise<string> =>
  execFileSync(cmd, cmd === 'claude' ? ['-p'] : [], { input: prompt, maxBuffer: 10 * 1024 * 1024 }).toString()

const targets = process.argv.slice(2).length ? process.argv.slice(2) : consolidationDue().map((d) => d.block)
if (!targets.length) {
  console.log('consolidate: no library past the sweet spot — nothing due')
  process.exit(0)
}

for (const block of targets) {
  const before = recall(block)
  if (before.length < 2) {
    console.log(`${block}: ${before.length} lesson(s) — nothing to merge`)
    continue
  }
  try {
    const result = await consolidateBlock(block, model)
    const archive = archivePreMerge(block, before)
    replaceLibrary(block, result.library)
    console.log(`${block}: ${result.before} -> ${result.after} lessons (pre-merge archived: ${archive})`)
  } catch (e) {
    console.error(`${block}: consolidation REFUSED, library unchanged — ${(e as Error).message}`)
  }
}

execFileSync('node', [new URL('./sync-insights.ts', import.meta.url).pathname], { stdio: 'inherit' })
