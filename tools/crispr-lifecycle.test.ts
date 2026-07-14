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

function seedEvidence(unit: string, prefix = 'failure', repeated = false): { detail: string; ts: string } {
  for (let i = 0; i < SEAL_AT; i++) {
    const detail = repeated ? prefix : `${prefix} ${i}`
    recordEvidence(unit, 'test-red', detail, 'crispr-lifecycle-test')
  }
  const batch = sealedBatches()[unit]?.at(-1)
  assert.ok(batch?.[0], `expected a sealed batch for ${unit}`)
  return { detail: batch[0].detail, ts: batch[0].ts }
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
  const evidence = seedEvidence(unit, 'shared failure')
  const repo = makeRepo()
  const candidateCommit = createCandidate(repo, 'crispr/test-unit', 'repair')
  recordValidatedProposal(unit, 'crispr/test-unit', candidateCommit, evidence.detail, evidence.ts)

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
  const olderBatch = seedEvidence(batchMatchUnit, 'older')
  const newerBatch = seedEvidence(batchMatchUnit, 'newer')
  const batchMatchRepo = makeRepo()
  const olderBatchCommit = createCandidate(batchMatchRepo, 'crispr/older-batch', 'older batch repair')
  const newerBatchCommit = createCandidate(batchMatchRepo, 'crispr/newer-batch', 'newer batch repair')
  recordValidatedProposal(batchMatchUnit, 'crispr/older-batch', olderBatchCommit, olderBatch.detail, olderBatch.ts)
  recordValidatedProposal(batchMatchUnit, 'crispr/newer-batch', newerBatchCommit, newerBatch.detail, newerBatch.ts)

  git(batchMatchRepo, ['merge', '--ff-only', 'crispr/newer-batch'])
  assert.equal(landValidatedProposal(batchMatchUnit, batchMatchRepo), 'landed', 'landing consumes the sealed batch that matches the merged candidate')
  assert.deepEqual(
    sealedBatches()[batchMatchUnit]?.map((batch) => batch[0].detail),
    [olderBatch.detail],
    'landing leaves unrelated sealed evidence queued',
  )

  const duplicateDetailUnit = 'test-unit-duplicate-detail'
  const olderDuplicateBatch = seedEvidence(duplicateDetailUnit, 'duplicate detail', true)
  const newerDuplicateBatch = seedEvidence(duplicateDetailUnit, 'duplicate detail', true)
  const duplicateDetailRepo = makeRepo()
  const olderDuplicateCommit = createCandidate(duplicateDetailRepo, 'crispr/older-duplicate', 'older duplicate repair')
  const newerDuplicateCommit = createCandidate(duplicateDetailRepo, 'crispr/newer-duplicate', 'newer duplicate repair')
  recordValidatedProposal(
    duplicateDetailUnit,
    'crispr/older-duplicate',
    olderDuplicateCommit,
    olderDuplicateBatch.detail,
    olderDuplicateBatch.ts,
  )
  recordValidatedProposal(
    duplicateDetailUnit,
    'crispr/newer-duplicate',
    newerDuplicateCommit,
    newerDuplicateBatch.detail,
    newerDuplicateBatch.ts,
  )

  git(duplicateDetailRepo, ['merge', '--ff-only', 'crispr/newer-duplicate'])
  assert.equal(
    landValidatedProposal(duplicateDetailUnit, duplicateDetailRepo),
    'landed',
    'landing consumes the merged candidate batch even when several sealed batches share a detail string',
  )
  assert.deepEqual(
    sealedBatches()[duplicateDetailUnit]?.map((batch) => batch[0].ts),
    [olderDuplicateBatch.ts],
    'landing keeps the older duplicate-detail batch queued',
  )

  const reachableFallbackUnit = 'test-unit-reachable-fallback'
  const reachableOlderBatch = seedEvidence(reachableFallbackUnit, 'reachable older')
  const reachableNewerBatch = seedEvidence(reachableFallbackUnit, 'reachable newer')
  const reachableFallbackRepo = makeRepo()
  const reachableOlderCommit = createCandidate(reachableFallbackRepo, 'crispr/reachable-older', 'reachable older repair')
  const reachableNewerCommit = createCandidate(reachableFallbackRepo, 'crispr/reachable-newer', 'reachable newer repair')
  recordValidatedProposal(
    reachableFallbackUnit,
    'crispr/reachable-older',
    reachableOlderCommit,
    reachableOlderBatch.detail,
    reachableOlderBatch.ts,
  )
  recordValidatedProposal(
    reachableFallbackUnit,
    'crispr/reachable-newer',
    reachableNewerCommit,
    reachableNewerBatch.detail,
    reachableNewerBatch.ts,
  )

  git(reachableFallbackRepo, ['merge', '--ff-only', 'crispr/reachable-older'])
  assert.equal(landValidatedProposal(reachableFallbackUnit, reachableFallbackRepo), 'landed', 'landing falls back to an older merged candidate')
  assert.deepEqual(
    sealedBatches()[reachableFallbackUnit]?.map((batch) => batch[0].detail),
    [reachableNewerBatch.detail],
    'landing skips unreachable newer candidates and consumes the matching older batch',
  )

  const squashUnit = 'test-unit-squash'
  const squashBatch = seedEvidence(squashUnit, 'squash failure')
  const squashRepo = makeRepo()
  const squashCommit = createCandidate(squashRepo, 'crispr/squash', 'squash repair')
  recordValidatedProposal(squashUnit, 'crispr/squash', squashCommit, squashBatch.detail, squashBatch.ts)

  git(squashRepo, ['merge', '--squash', 'crispr/squash'])
  git(squashRepo, ['commit', '-m', 'squash merge'])
  assert.equal(landValidatedProposal(squashUnit, squashRepo), 'not-reachable', 'squash merges are not treated as proof that the proposal landed intact')
  assert.equal(sealedBatches()[squashUnit]?.length, 1, 'rejected squash landing preserves evidence')

  const missingEvidenceUnit = 'test-unit-missing-evidence'
  const missingEvidenceBatch = seedEvidence(missingEvidenceUnit, 'missing evidence')
  const missingEvidenceRepo = makeRepo()
  const missingEvidenceCommit = createCandidate(missingEvidenceRepo, 'crispr/missing-evidence', 'missing evidence repair')
  recordValidatedProposal(
    missingEvidenceUnit,
    'crispr/missing-evidence',
    missingEvidenceCommit,
    missingEvidenceBatch.detail,
    missingEvidenceBatch.ts,
  )
  git(missingEvidenceRepo, ['merge', '--ff-only', 'crispr/missing-evidence'])
  assert.ok(consumeBatch(missingEvidenceUnit, missingEvidenceBatch.detail, missingEvidenceBatch.ts), 'test removes the candidate evidence before landing')
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
  assert.equal(
    discardPendingCandidate(missingEvidenceUnit, missingEvidenceRepo).status,
    'discarded',
    'discard recovers a reachable candidate whose sealed evidence is already gone',
  )
  const recoveredMissingEvidenceStore = JSON.parse(readFileSync(process.env.CRISPR_STORE!, 'utf8')) as {
    candidates: { unit: string; state: string }[]
  }
  assert.equal(
    recoveredMissingEvidenceStore.candidates.find((candidate) => candidate.unit === missingEvidenceUnit)?.state,
    'discarded',
    'recovery discard retires the blocked candidate',
  )

  const mergedDiscardUnit = 'test-unit-merged-discard'
  const mergedDiscardBatch = seedEvidence(mergedDiscardUnit, 'merged discard')
  const mergedDiscardRepo = makeRepo()
  const mergedDiscardCommit = createCandidate(mergedDiscardRepo, 'crispr/merged-discard', 'merged discard repair')
  recordValidatedProposal(
    mergedDiscardUnit,
    'crispr/merged-discard',
    mergedDiscardCommit,
    mergedDiscardBatch.detail,
    mergedDiscardBatch.ts,
  )
  git(mergedDiscardRepo, ['merge', '--ff-only', 'crispr/merged-discard'])
  assert.equal(
    discardPendingCandidate(mergedDiscardUnit, mergedDiscardRepo, mergedDiscardBatch.detail, mergedDiscardBatch.ts).status,
    'already-reachable',
    'discard refuses a candidate that has already reached main',
  )
  assert.equal(landValidatedProposal(mergedDiscardUnit, mergedDiscardRepo), 'landed', 'refused discard leaves the merged candidate landable')

  const rerunUnit = 'test-unit-rerun-guard'
  const rerunBatch = seedEvidence(rerunUnit, 'rerun failure')
  recordValidatedProposal(rerunUnit, 'crispr/rerun-guard', 'deadbeef', rerunBatch.detail, rerunBatch.ts)

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
