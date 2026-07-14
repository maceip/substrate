// tools/crispr.ts — the MOSS back half: sealed evidence batch -> worktree trial ->
// ratchet-gated candidate. CRISPR v1, with promotion HUMAN-GATED exactly as the paper gates
// deployment behind explicit consent (arXiv:2605.22794: a CONVERGED candidate waits for
// `moss evo apply`; ours waits for a human merge).
//
//   node tools/crispr.ts <unit>             run one rewrite cycle on the oldest sealed batch
//   node tools/crispr.ts land <unit>        publish a normally merged candidate after it is reachable from main
//   node tools/crispr.ts discard <unit>     mark an unmerged candidate discarded; keep its evidence queued
//   node tools/crispr.ts                    list the rewrite queue (sealed batches per unit)
//
// The cycle (MOSS's stages, collapsed for v1):
//   1. TARGET  — the oldest sealed evidence batch for <unit> (the guide RNA)
//   2. ISOLATE — a fresh git worktree on branch crispr/<unit>-<n> (the trial chamber)
//   3. EDIT    — a pluggable coding-agent CLI receives the evidence and edits the worktree
//                (CODING_AGENT env; default `claude`; the repair template is the evidence +
//                the block's insights.md — never freestyle)
//   4. TRIAL   — the full suite runs in the worktree; the ratchet (protect.ts) runs inside
//                it, so a candidate that loosens any gate is RED by construction
//   5. VERDICT — CONVERGED (real diff + green) | NEED_MORE_WORK (no diff, or red)
//                CONVERGED records a pending candidate for human merge; the evidence batch is
//                consumed only by the separate landing command after the commit reaches main.
//
// Germline note: a merged candidate propagates to every project on the next steward run via
// the update channel. Somatic edits (app/ in projects) never pass through here.

import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { batchTs, sealedBatches } from '../blocks/_kernel/evidence.ts'
import { discardPendingCandidate, landValidatedProposal, pendingCandidate, recordValidatedProposal } from './crispr-lifecycle.ts'

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const command = process.argv[2]
const unit = command === 'land' || command === 'discard' ? process.argv[3] : command

if (command === 'land') {
  if (!unit) {
    console.error('crispr: usage: node tools/crispr.ts land <unit>')
    process.exit(1)
  }
  const result = landValidatedProposal(unit, ROOT)
  if (result === 'landed') {
    console.log(`crispr: human-landed — ${unit} candidate is reachable from main; evidence consumed and lesson published`)
    process.exit(0)
  }
  if (result === 'already-landed') {
    console.log(`crispr: human-landed already recorded for ${unit}; no evidence or lesson was changed`)
    process.exit(0)
  }
  if (result === 'not-reachable') {
    console.error(`crispr: candidate for ${unit} is not reachable from main; merge without squash or rebase before landing`)
    process.exit(1)
  }
  if (result === 'missing-evidence') {
    console.error(`crispr: candidate for ${unit} reached main, but its sealed evidence batch is missing; no lesson or landed state was published`)
    process.exit(1)
  }
  console.error(`crispr: no pending candidate for ${unit}`)
  process.exit(1)
}

if (command === 'discard') {
  if (!unit) {
    console.error('crispr: usage: node tools/crispr.ts discard <unit>')
    process.exit(1)
  }
  const batch = sealedBatches()[unit]?.[0]
  const evidenceDetail = batch?.[0]?.detail
  const evidenceTs = batch ? batchTs(batch) : undefined
  const result = discardPendingCandidate(unit, ROOT, evidenceDetail, evidenceTs)
  if (result.status === 'discarded') {
    console.log(`crispr: discarded pending candidate for ${unit} (branch ${result.candidate.branch}); sealed evidence remains queued when present`)
    process.exit(0)
  }
  if (result.status === 'already-reachable') {
    console.error(`crispr: candidate for ${unit} is already reachable from main; land it instead of discarding it`)
    process.exit(1)
  }
  console.error(`crispr: no pending candidate for ${unit}${evidenceDetail ? ' matches the oldest sealed batch' : ''}`)
  process.exit(1)
}

if (!unit) {
  const queue = sealedBatches()
  const units = Object.keys(queue)
  if (!units.length) {
    console.log('crispr: rewrite queue is empty — no sealed evidence batches')
    process.exit(0)
  }
  console.log('crispr rewrite queue:')
  for (const u of units) console.log(`  ${u}: ${queue[u].length} sealed batch(es) — run: node tools/crispr.ts ${u}`)
  process.exit(0)
}

const queue = sealedBatches()
const batch = queue[unit]?.[0]
if (!batch) {
  console.error(`crispr: no sealed batch for "${unit}" — nothing justifies a rewrite`)
  process.exit(1)
}
if (pendingCandidate(unit, batch[0].detail, batchTs(batch))) {
  console.error(`crispr: sealed batch for "${unit}" already has a pending candidate; land or discard it before rerunning`)
  process.exit(1)
}

const stamp = Date.now().toString(36)
const branch = `crispr/${unit}-${stamp}`
const worktree = join(ROOT, '..', `crispr-${unit}-${stamp}`)
const git = (...args: string[]) => execFileSync('git', args, { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] }).toString()
const wt = (cmd: string, args: string[]) => execFileSync(cmd, args, { cwd: worktree, stdio: ['ignore', 'pipe', 'pipe'] }).toString()

console.log(`crispr: cycle on "${unit}" — ${batch.length} evidence chunks, branch ${branch}`)
git('worktree', 'add', '-b', branch, worktree)

let verdict = 'NEED_MORE_WORK'
try {
  // The guide + repair template, written into the trial chamber for the editing agent.
  const insightsPath = join(ROOT, 'blocks', unit, 'insights.md')
  const insights = existsSync(insightsPath) ? readFileSync(insightsPath, 'utf8') : '(no insights.md for this unit)'
  writeFileSync(
    join(worktree, 'EVIDENCE.md'),
    `# CRISPR cycle: ${unit}\n\nSealed evidence batch (${batch.length} chunks — each is a real failure):\n\n` +
      batch.map((c) => `- [${c.ts}] (${c.source}, ${c.origin}) ${c.detail}`).join('\n') +
      `\n\n## Repair template (federated lessons for this unit)\n\n${insights}\n\n## Your task\n` +
      `Fix the root cause these failures share, in this worktree. Rules: tighten, never loosen ` +
      `(protect.ts enforces this in the suite); behavior lives in code, not prose; add a regression ` +
      `test for the failure class; commit your work with [auto-tighten] in the subject if you add ` +
      `gates/tests. Run \`cd blocks && npm test\` until green.\n`,
  )

  // Preamble commit: the evidence brief is cycle infrastructure, not agent work — commit it
  // so the diff check below measures ONLY what the editing agent changed.
  wt('git', ['add', 'EVIDENCE.md'])
  wt('git', ['commit', '-m', `crispr(${unit}): evidence brief (cycle preamble)`])

  // Trial chamber needs runnable deps (a worktree shares no node_modules).
  console.log('  isolate: installing deps in the trial chamber...')
  execFileSync('npm', ['install', '--no-fund', '--no-audit'], { cwd: join(worktree, 'blocks'), stdio: ['ignore', 'pipe', 'pipe'] })

  // EDIT — pluggable coding agent. `true` = no-op (dry-run smoke testing).
  const agent = process.env.CODING_AGENT ?? 'claude'
  const agentArgs = agent === 'claude' ? ['-p', `Read EVIDENCE.md at the repo root and do what it says.`, '--permission-mode', 'acceptEdits'] : []
  console.log(`  edit: running ${agent} in the worktree...`)
  try {
    execFileSync(agent, agentArgs, { cwd: worktree, stdio: ['ignore', 'pipe', 'pipe'], timeout: 1000 * 60 * 30 })
  } catch (e) {
    console.error(`  edit: agent exited nonzero (${(e as Error).message.slice(0, 120)}) — continuing to trial anyway`)
  }

  const uncommitted = wt('git', ['status', '--porcelain'])
    .split('\n')
    .filter((l) => l.trim() && !l.includes('node_modules') && !l.includes('EVIDENCE.md'))
    .join('')
  const commitsBeyondPreamble = Number(wt('git', ['rev-list', '--count', 'HEAD']).trim()) - Number(git('rev-list', '--count', 'HEAD').trim()) - 1
  const diff = uncommitted + (commitsBeyondPreamble > 0 ? 'commits' : '')
  if (!diff) {
    console.log('  trial: no edit produced — NEED_MORE_WORK (evidence kept)')
  } else {
    console.log('  trial: running the full suite in the worktree...')
    try {
      execFileSync('npm', ['test'], { cwd: join(worktree, 'blocks'), stdio: ['ignore', 'pipe', 'pipe'], timeout: 1000 * 60 * 15 })
      verdict = 'CONVERGED'
    } catch {
      console.log('  trial: RED — NEED_MORE_WORK (evidence kept, branch left for inspection)')
    }
  }
} finally {
  if (verdict === 'CONVERGED') {
    // commit any uncommitted agent work so the branch is complete
    if (wt('git', ['status', '--porcelain']).trim()) {
      wt('git', ['add', '-A'])
      wt('git', ['commit', '-m', `[auto-tighten] crispr(${unit}): repair from sealed evidence batch`])
    }
    const commit = wt('git', ['rev-parse', 'HEAD']).trim()
    try {
      recordValidatedProposal(unit, branch, commit, batch[0].detail, batchTs(batch))
    } catch (error) {
      try {
        git('worktree', 'remove', '--force', worktree)
      } catch {
        /* best-effort cleanup keeps the original store failure */
      }
      try {
        git('branch', '-D', branch)
      } catch {
        /* branch may already be gone */
      }
      throw error
    }
    git('worktree', 'remove', '--force', worktree)
    console.log(`\nVERDICT: VALIDATED PROPOSAL — candidate ready on branch ${branch}`)
    console.log(`  promotion is human-gated: review with  git diff main...${branch}  then merge into main.`)
    console.log(`  after merging, run: node tools/crispr.ts land ${unit}  (publishes the lesson and consumes evidence exactly once).`)
  } else {
    // keep the worktree only if it holds work worth inspecting; otherwise clean up
    const dirty =
      existsSync(worktree) &&
      wt('git', ['status', '--porcelain'])
        .split('\n')
        .some((l) => l.trim() && !l.includes('node_modules') && !l.includes('EVIDENCE.md'))
    if (!dirty) {
      git('worktree', 'remove', '--force', worktree)
      try {
        git('branch', '-D', branch)
      } catch {
        /* branch may not exist */
      }
      console.log(`\nVERDICT: NEED_MORE_WORK — no candidate; evidence batch kept in the queue.`)
    } else {
      console.log(`\nVERDICT: NEED_MORE_WORK — worktree kept for inspection: ${worktree} (branch ${branch}); evidence kept.`)
    }
    rmSync(join(worktree, 'EVIDENCE.md'), { force: true })
  }
}
