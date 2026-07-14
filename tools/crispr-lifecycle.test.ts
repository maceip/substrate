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
let repoSeq = 0

function seedEvidence(unit: string, prefix = 'failure'): string {
  for (let i = 0; i < SEAL_AT; i++) recordEvidence(unit, 'test-red', `${prefix} ${i}`, 'crispr-lifecycle-test')
  return `${prefix} 0`
}

function makeRepo(): string {
  const repo = join(tmp, `repo-${repoSeq++}`)
  execFileSync('git', ['init', '--initial-branch=main', repo], { stdio: 'ignore' })
  git(repo, ['config', 'user.name', 'maceip'])
  git(repo, ['config', 'user.email', 'ryan.macarthur@gmail.com'])
  writeFileSync(join(repo, 'file.txt'), 'base\n')
  git(repo, ['add', 'file.txt'])
  git(repo, ['commit', '-m', 'base'])
  return repo
}

function createCandidate(repo: string, branch: string, repair: string): string {
  git(repo, ['checkout', '-b', branch, 'main'])
  writeFileSync(join(repo, 'file.txt'), `base\n${repair}\n`)
  git(repo, ['commit', '-am', repair])
  const commit = git(repo, ['rev-parse', 'HEAD'])
  git(repo, ['checkout', 'main'])
  return commit
}

try {
  const unit = 'test-unit'
  const evidenceDetail = seedEvidence(unit, 'shared failure')
  const repo = makeRepo()
  const candidateCommit = createCandidate(repo, 'crispr/test-unit', 'repair')
  recordValidatedProposal(unit, 'crispr/test-unit', candidateCommit, evidenceDetail)

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

  const batchMatchUnit = 'test-unit-batch-match'
  const olderDetail = seedEvidence(batchMatchUnit, 'older')
  const newerDetail = seedEvidence(batchMatchUnit, 'newer')
  const batchMatchRepo = makeRepo()
  const olderBatchCommit = createCandidate(batchMatchRepo, 'crispr/older-batch', 'older batch repair')
  const newerBatchCommit = createCandidate(batchMatchRepo, 'crispr/newer-batch', 'newer batch repair')
  recordValidatedProposal(batchMatchUnit, 'crispr/older-batch', olderBatchCommit, olderDetail)
  recordValidatedProposal(batchMatchUnit, 'crispr/newer-batch', newerBatchCommit, newerDetail)

  git(batchMatchRepo, ['merge', '--ff-only', 'crispr/newer-batch'])
  assert.equal(landValidatedProposal(batchMatchUnit, batchMatchRepo), 'landed', 'landing consumes the sealed batch that matches the merged candidate')
  assert.deepEqual(
    sealedBatches()[batchMatchUnit]?.map((batch) => batch[0].detail),
    [olderDetail],
    'landing leaves unrelated sealed evidence queued',
  )

  const reachableFallbackUnit = 'test-unit-reachable-fallback'
  const reachableOlderDetail = seedEvidence(reachableFallbackUnit, 'reachable older')
  const reachableNewerDetail = seedEvidence(reachableFallbackUnit, 'reachable newer')
  const reachableFallbackRepo = makeRepo()
  const reachableOlderCommit = createCandidate(reachableFallbackRepo, 'crispr/reachable-older', 'reachable older repair')
  const reachableNewerCommit = createCandidate(reachableFallbackRepo, 'crispr/reachable-newer', 'reachable newer repair')
  recordValidatedProposal(reachableFallbackUnit, 'crispr/reachable-older', reachableOlderCommit, reachableOlderDetail)
  recordValidatedProposal(reachableFallbackUnit, 'crispr/reachable-newer', reachableNewerCommit, reachableNewerDetail)

  git(reachableFallbackRepo, ['merge', '--ff-only', 'crispr/reachable-older'])
  assert.equal(landValidatedProposal(reachableFallbackUnit, reachableFallbackRepo), 'landed', 'landing falls back to an older merged candidate')
  assert.deepEqual(
    sealedBatches()[reachableFallbackUnit]?.map((batch) => batch[0].detail),
    [reachableNewerDetail],
    'landing skips unreachable newer candidates and consumes the matching older batch',
  )

  const squashUnit = 'test-unit-squash'
  const squashDetail = seedEvidence(squashUnit, 'squash failure')
  const squashRepo = makeRepo()
  const squashCommit = createCandidate(squashRepo, 'crispr/squash', 'squash repair')
  recordValidatedProposal(squashUnit, 'crispr/squash', squashCommit, squashDetail)

  git(squashRepo, ['merge', '--squash', 'crispr/squash'])
  git(squashRepo, ['commit', '-m', 'squash merge'])
  assert.equal(landValidatedProposal(squashUnit, squashRepo), 'landed', 'squash-merged candidates can land')
  assert.equal(sealedBatches()[squashUnit], undefined, 'squash-merged landing still consumes evidence')

  const rerunUnit = 'test-unit-rerun-guard'
  const rerunDetail = seedEvidence(rerunUnit, 'rerun failure')
  recordValidatedProposal(rerunUnit, 'crispr/rerun-guard', 'deadbeef', rerunDetail)

  let rerunStderr = ''
  try {
    execFileSync('node', ['--experimental-strip-types', 'tools/crispr.ts', rerunUnit], {
      cwd: join(tmp, '..', '..', 'workspace'),
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    })
    assert.fail('crispr rerun guard should reject a second cycle for the same sealed batch')
  } catch (error) {
    rerunStderr = (error as { stderr?: Buffer }).stderr?.toString() ?? ''
  }
  assert.match(rerunStderr, /already has a pending candidate/, 'crispr rejects reruns for a sealed batch that already has a pending candidate')

  const discardStdout = execFileSync('node', ['--experimental-strip-types', 'tools/crispr.ts', 'discard', rerunUnit], {
    cwd: join(tmp, '..', '..', 'workspace'),
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  }).toString()
  assert.match(discardStdout, /discarded pending candidate/, 'crispr exposes a discard path for blocked sealed batches')
  assert.equal(readFileSync(process.env.CRISPR_STORE!, 'utf8').includes('deadbeef'), false, 'discard removes the pending candidate from the store')
  assert.equal(sealedBatches()[rerunUnit]?.length, 1, 'discard keeps the sealed evidence queued')

  console.log('crispr-lifecycle.test.ts: ok')
} finally {
  rmSync(tmp, { recursive: true, force: true })
}
