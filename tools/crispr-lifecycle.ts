import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'
import { consumeBatch, hasSealedBatch } from '../blocks/_kernel/evidence.ts'
import { deposit } from '../blocks/_kernel/fot.ts'

const DEFAULT_STORE = join(homedir(), '.substrate', 'crispr-candidates.json')

type CandidateState = 'candidate' | 'human-landed' | 'discarded'

export interface CrisprCandidate {
  unit: string
  branch: string
  commit: string
  evidenceDetail: string
  evidenceTs?: string
  state: CandidateState
  createdAt: string
  landedAt?: string
  discardedAt?: string
  lessonPublished?: boolean
}

interface CandidateStore {
  candidates: CrisprCandidate[]
}

function storePath(): string {
  return process.env.CRISPR_STORE ?? DEFAULT_STORE
}

function readStore(): CandidateStore {
  try {
    return JSON.parse(readFileSync(storePath(), 'utf8')) as CandidateStore
  } catch {
    return { candidates: [] }
  }
}

function writeStore(store: CandidateStore): void {
  const p = storePath()
  mkdirSync(dirname(p), { recursive: true })
  writeFileSync(p, JSON.stringify(store, null, 2))
}

function matchesEvidence(candidate: CrisprCandidate, evidenceDetail?: string, evidenceTs?: string): boolean {
  if (evidenceTs) return candidate.evidenceTs === evidenceTs || (!candidate.evidenceTs && candidate.evidenceDetail === evidenceDetail)
  if (evidenceDetail) return candidate.evidenceDetail === evidenceDetail
  return true
}

export function recordValidatedProposal(
  unit: string,
  branch: string,
  commit: string,
  evidenceDetail: string,
  evidenceTs?: string,
): CrisprCandidate {
  const store = readStore()
  const existing = store.candidates.find((c) => c.unit === unit && c.commit === commit)
  if (existing) {
    if (evidenceTs && !existing.evidenceTs) {
      existing.evidenceTs = evidenceTs
      writeStore(store)
    }
    return existing
  }
  const candidate: CrisprCandidate = {
    unit,
    branch,
    commit,
    evidenceDetail,
    evidenceTs,
    state: 'candidate',
    createdAt: new Date().toISOString(),
    lessonPublished: false,
  }
  store.candidates.unshift(candidate)
  writeStore(store)
  return candidate
}

export function pendingCandidate(unit: string, evidenceDetail?: string, evidenceTs?: string): CrisprCandidate | null {
  return readStore().candidates.find((c) => c.unit === unit && c.state === 'candidate' && matchesEvidence(c, evidenceDetail, evidenceTs)) ?? null
}

export function discardPendingCandidate(
  unit: string,
  repoRoot: string,
  evidenceDetail?: string,
  evidenceTs?: string,
  mainRef = 'main',
): { status: 'discarded' | 'already-reachable'; candidate: CrisprCandidate } | { status: 'no-candidate' } {
  const store = readStore()
  const candidate = store.candidates.find((c) => c.unit === unit && c.state === 'candidate' && matchesEvidence(c, evidenceDetail, evidenceTs))
  if (!candidate) return { status: 'no-candidate' }
  if (isAncestor(repoRoot, candidate.commit, mainRef) && hasSealedBatch(unit, candidate.evidenceDetail, candidate.evidenceTs)) {
    return { status: 'already-reachable', candidate }
  }
  candidate.state = 'discarded'
  candidate.discardedAt = new Date().toISOString()
  writeStore(store)
  return { status: 'discarded', candidate }
}

function isAncestor(repoRoot: string, commit: string, mainRef: string): boolean {
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', commit, mainRef], { cwd: repoRoot, stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

export function landValidatedProposal(
  unit: string,
  repoRoot: string,
  mainRef = 'main',
): 'landed' | 'already-landed' | 'not-reachable' | 'missing-evidence' | 'no-candidate' {
  const store = readStore()
  const candidates = store.candidates.filter((c) => c.unit === unit)
  // v1 supports only merges that preserve the validated commit. Patch-equivalence cannot
  // prove that a multi-commit proposal landed intact, so squash and rebase merges stay out.
  const candidate = candidates.find((c) => c.state === 'candidate' && isAncestor(repoRoot, c.commit, mainRef))
  if (!candidate) {
    if (candidates.some((c) => c.state === 'candidate')) return 'not-reachable'
    if (candidates.some((c) => c.state === 'human-landed')) return 'already-landed'
    return 'no-candidate'
  }

  const batch = consumeBatch(unit, candidate.evidenceDetail, candidate.evidenceTs)
  if (!batch) return 'missing-evidence'
  if (!candidate.lessonPublished) {
    deposit(unit, `crispr repair landed for failure class: ${candidate.evidenceDetail.slice(0, 160)} (branch ${candidate.branch})`, 'crispr')
  }
  candidate.state = 'human-landed'
  candidate.landedAt = new Date().toISOString()
  candidate.lessonPublished = true
  writeStore(store)
  return 'landed'
}
