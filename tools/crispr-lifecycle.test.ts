import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { SEAL_AT, recordEvidence, sealedBatches } from '../blocks/_kernel/evidence.ts'
import { recall } from '../blocks/_kernel/fot.ts'
import { landValidatedProposal, recordValidatedProposal } from './crispr-lifecycle.ts'

const tmp = mkdtempSync(join(tmpdir(), 'crispr-lifecycle-'))
process.env.EVIDENCE_STORE = join(tmp, 'evidence.json')
process.env.FOT_STORE = join(tmp, 'fot.json')
process.env.CRISPR_STORE = join(tmp, 'candidates.json')

const git = (repo: string, args: string[]) => execFileSync('git', args, { cwd: repo, stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim()

function seedEvidence(unit: string): void {
  for (let i = 0; i < SEAL_AT; i++) recordEvidence(unit, 'test-red', `failure ${i}`, 'crispr-lifecycle-test')
}

function makeRepo(): { repo: string; candidateCommit: string } {
  const repo = join(tmp, 'repo')
  execFileSync('git', ['init', '--initial-branch=main', repo], { stdio: 'ignore' })
  git(repo, ['config', 'user.name', 'maceip'])
  git(repo, ['config', 'user.email', 'ryan.macarthur@gmail.com'])
  writeFileSync(join(repo, 'file.txt'), 'base\n')
  git(repo, ['add', 'file.txt'])
  git(repo, ['commit', '-m', 'base'])
  git(repo, ['checkout', '-b', 'crispr/test-unit'])
  writeFileSync(join(repo, 'file.txt'), 'base\nrepair\n')
  git(repo, ['commit', '-am', 'repair'])
  const candidateCommit = git(repo, ['rev-parse', 'HEAD'])
  git(repo, ['checkout', 'main'])
  return { repo, candidateCommit }
}

try {
  const unit = 'test-unit'
  seedEvidence(unit)
  const { repo, candidateCommit } = makeRepo()
  recordValidatedProposal(unit, 'crispr/test-unit', candidateCommit, 'shared failure')

  assert.equal(landValidatedProposal(unit, repo), 'not-reachable', 'candidate cannot land before human merge')
  assert.equal(sealedBatches()[unit]?.length, 1, 'premature landing preserves evidence')
  assert.equal(recall(unit).length, 0, 'premature landing publishes no lesson')

  git(repo, ['merge', '--ff-only', 'crispr/test-unit'])
  assert.equal(landValidatedProposal(unit, repo), 'landed', 'merged candidate lands')
  assert.equal(sealedBatches()[unit], undefined, 'successful landing consumes evidence')
  assert.equal(recall(unit).length, 1, 'successful landing publishes one lesson')

  assert.equal(landValidatedProposal(unit, repo), 'already-landed', 'landing is idempotent')
  assert.equal(recall(unit).length, 1, 'idempotent landing does not duplicate lessons')
  assert.equal(readFileSync(process.env.CRISPR_STORE!, 'utf8').includes('human-landed'), true, 'candidate records final state')

  console.log('crispr-lifecycle.test.ts: ok')
} finally {
  rmSync(tmp, { recursive: true, force: true })
}
