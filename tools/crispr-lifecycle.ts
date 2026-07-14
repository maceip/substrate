import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'
import { consumeBatch, sealedBatches } from '../blocks/_kernel/evidence.ts'
import { deposit } from '../blocks/_kernel/fot.ts'

const DEFAULT_STORE = join(homedir(), '.substrate', 'crispr-candidates.json')

type CandidateState = 'candidate' | 'human-landed'

export interface CrisprCandidate {
  unit: string
  branch: string
  commit: string
  evidenceDetail: string
  state: CandidateState
  createdAt: string
  landedAt?: string
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

export function recordValidatedProposal(unit: string, branch: string, commit: string, evidenceDetail: string): CrisprCandidate {
  const store = readStore()
  const existing = store.candidates.find((c) => c.unit === unit && c.commit === commit)
  if (existing) return existing
  const candidate: CrisprCandidate = {
    unit,
    branch,
    commit,
    evidenceDetail,
    state: 'candidate',
    createdAt: new Date().toISOString(),
    lessonPublished: false,
  }
  store.candidates.unshift(candidate)
  writeStore(store)
  return candidate
}

export function pendingCandidate(unit: string): CrisprCandidate | null {
  return readStore().candidates.find((c) => c.unit === unit && c.state === 'candidate') ?? null
}

function isAncestor(repoRoot: string, commit: string, mainRef: string): boolean {
  try {
    execFileSync('git', ['merge-base', '--is-ancestor', commit, mainRef], { cwd: repoRoot, stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

export function landValidatedProposal(unit: string, repoRoot: string, mainRef = 'main'): 'landed' | 'already-landed' | 'not-reachable' | 'no-candidate' {
  const store = readStore()
  const candidate = store.candidates.find((c) => c.unit === unit && (c.state === 'candidate' || c.state === 'human-landed'))
  if (!candidate) return 'no-candidate'
  if (candidate.state === 'human-landed') return 'already-landed'
  if (!isAncestor(repoRoot, candidate.commit, mainRef)) return 'not-reachable'

  const batch = sealedBatches()[unit]?.[0]
  if (batch) consumeBatch(unit)
  if (!candidate.lessonPublished) {
    deposit(unit, `crispr repair landed for failure class: ${candidate.evidenceDetail.slice(0, 160)} (branch ${candidate.branch})`, 'crispr')
  }
  candidate.state = 'human-landed'
  candidate.landedAt = new Date().toISOString()
  candidate.lessonPublished = true
  writeStore(store)
  return 'landed'
}
