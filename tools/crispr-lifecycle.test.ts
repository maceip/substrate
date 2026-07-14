import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { consumeBatch, SEAL_AT, recordEvidence, sealedBatches } from '../blocks/_kernel/evidence.ts'
import { recall } from '../blocks/_kernel/fot.ts'
import { discardPendingCandidate, landValidatedProposal, recordValidatedProposal } from './crispr-lifecycle.ts'

const tmp = mkdtempSync(join(tmpdir(), 'crispr-lifecycle-'))
const ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
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
  assert.equal(landValidatedProposal(squashUnit, squashRepo), 'not-reachable', 'squash merges are not treated as proof that the proposal landed intact')
  assert.equal(sealedBatches()[squashUnit]?.length, 1, 'rejected squash landing preserves evidence')

  const missingEvidenceUnit = 'test-unit-missing-evidence'
  const missingEvidenceDetail = seedEvidence(missingEvidenceUnit, 'missing evidence')
  const missingEvidenceRepo = makeRepo()
  const missingEvidenceCommit = createCandidate(missingEvidenceRepo, 'crispr/missing-evidence', 'missing evidence repair')
  recordValidatedProposal(missingEvidenceUnit, 'crispr/missing-evidence', missingEvidenceCommit, missingEvidenceDetail)
  git(missingEvidenceRepo, ['merge', '--ff-only', 'crispr/missing-evidence'])
  assert.ok(consumeBatch(missingEvidenceUnit, missingEvidenceDetail), 'test removes the candidate evidence before landing')
  assert.equal(landValidatedProposal(missingEvidenceUnit, missingEvidenceRepo), 'missing-evidence', 'landing fails closed when candidate evidence is absent')
  assert.equal(recall(missingEvidenceUnit).length, 0, 'missing evidence publishes no lesson')
  const missingEvidenceStore = JSON.parse(readFileSync(process.env.CRISPR_STORE!, 'utf8')) as {
    candidates: { unit: string; state: string }[]
  }
  assert.equal(
    missingEvidenceStore.candidates.find((candidate) => candidate.unit === missingEvidenceUnit)?.state,
    'candidate',
    'missing evidence leaves the candidate pending',
  )

  const mergedDiscardUnit = 'test-unit-merged-discard'
  const mergedDiscardDetail = seedEvidence(mergedDiscardUnit, 'merged discard')
  const mergedDiscardRepo = makeRepo()
  const mergedDiscardCommit = createCandidate(mergedDiscardRepo, 'crispr/merged-discard', 'merged discard repair')
  recordValidatedProposal(mergedDiscardUnit, 'crispr/merged-discard', mergedDiscardCommit, mergedDiscardDetail)
  git(mergedDiscardRepo, ['merge', '--ff-only', 'crispr/merged-discard'])
  assert.equal(
    discardPendingCandidate(mergedDiscardUnit, mergedDiscardRepo, mergedDiscardDetail).status,
    'already-reachable',
    'discard refuses a candidate that has already reached main',
  )
  assert.equal(landValidatedProposal(mergedDiscardUnit, mergedDiscardRepo), 'landed', 'refused discard leaves the merged candidate landable')

  const rerunUnit = 'test-unit-rerun-guard'
  const rerunDetail = seedEvidence(rerunUnit, 'rerun failure')
  recordValidatedProposal(rerunUnit, 'crispr/rerun-guard', 'deadbeef', rerunDetail)

  let rerunStderr = ''
  try {
    execFileSync('node', ['--experimental-strip-types', 'tools/crispr.ts', rerunUnit], {
      cwd: ROOT,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    })
    assert.fail('crispr rerun guard should reject a second cycle for the same sealed batch')
  } catch (error) {
    rerunStderr = (error as { stderr?: Buffer }).stderr?.toString() ?? ''
  }
  assert.match(rerunStderr, /already has a pending candidate/, 'crispr rejects reruns for a sealed batch that already has a pending candidate')

  const discardStdout = execFileSync('node', ['--experimental-strip-types', 'tools/crispr.ts', 'discard', rerunUnit], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  }).toString()
  assert.match(discardStdout, /discarded pending candidate/, 'crispr exposes a discard path for blocked sealed batches')
  const discardedStore = JSON.parse(readFileSync(process.env.CRISPR_STORE!, 'utf8')) as {
    candidates: { commit: string; state: string }[]
  }
  assert.equal(
    discardedStore.candidates.find((candidate) => candidate.commit === 'deadbeef')?.state,
    'discarded',
    'discard preserves the candidate audit record in an explicit terminal state',
  )
  assert.equal(sealedBatches()[rerunUnit]?.length, 1, 'discard keeps the sealed evidence queued')

  console.log('crispr-lifecycle.test.ts: ok')
} finally {
  rmSync(tmp, { recursive: true, force: true })
}
