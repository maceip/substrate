// _kernel/protect.ts — the RATCHET (protocol S4). Attribution corrected Jun 12: the
// tighten-freely / loosen-via-human-commit asymmetry is OURS, not AEvo's — the actual paper
// (arXiv:2605.13821) freezes its evaluator symmetrically. Ours can improve; theirs cannot.
// What follows is WHERE the committed baseline lives.
//
// assertNoLoosening compares two gate lists, but protection is only real if the "committed"
// side comes from somewhere the agent editing gates.ts cannot change in the same motion.
// That place is git HEAD: each block's block.json carries the gate baseline (gate ids +
// activated requirement ids), and this module reads it AS OF THE LAST COMMIT. An agent can
// tighten gates.ts freely and tests stay green; to loosen, the loosened baseline must be
// COMMITTED — a separate, human-reviewable act. Tightening is automatic; loosening needs
// approval. Before the first commit of block.json there is no baseline and protection is
// not yet armed — callers should surface that, not hide it.

import { execFileSync } from 'node:child_process'
import { assertNoLoosening, type GateLike } from './grade.ts'

// The gate baseline from block.json as of git HEAD, or null when none is committed yet
// (brand-new block, or a checkout that is not a git repo).
export function committedGates(blockDir: string): GateLike[] | null {
  try {
    const raw = execFileSync('git', ['show', 'HEAD:./block.json'], {
      cwd: blockDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    const gates = JSON.parse(raw).gates as { id: string; activates: string[] }[] | undefined
    if (!gates) return null
    return gates.map((g) => ({ id: g.id, activates: g.activates.map((id) => ({ id })) }))
  } catch {
    return null
  }
}

export interface ProtectionResult {
  baseline: 'commit' | 'none'
  violations: string[]
}

// Compare the LIVE gates (whatever the working tree says right now) against the last
// committed baseline. Violations = loosening that no commit has approved.
export function checkProtection(blockDir: string, live: GateLike[]): ProtectionResult {
  const committed = committedGates(blockDir)
  if (!committed) return { baseline: 'none', violations: [] }
  return { baseline: 'commit', violations: assertNoLoosening(committed, live) }
}
