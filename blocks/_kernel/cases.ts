// _kernel/cases.ts — federated regression CASES: the executable half of FoT.
//
// A lesson in fot.ts is prose — it informs the next agent but nothing runs it. A CASE is the
// same federation mechanism carrying something MOSS-shaped instead: declarative data that a
// block's own test suite executes. A failure in any project becomes a permanent check in every
// project that pulls the block, without a human writing the test.
//
// Cases are DATA, never code. The store is a writable shared file; carrying executable code in
// it would be a supply-chain hole. Each block's test passes a harness that interprets the case
// kinds it knows; unknown kinds are reported, not silently passed.
//
// AEvo protection: `npm run cases:sync` snapshots each block's federated cases into a COMMITTED
// <block>/cases.json. The runner executes the UNION of store + committed snapshot, so deleting a
// case from the store cannot remove a committed check — dropping one requires a human git commit,
// exactly the tighten-automatically / loosen-with-approval asymmetry.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'

const DEFAULT_STORE = join(homedir(), '.substrate', 'fot-cases.json')

function storePath(): string {
  return process.env.FOT_CASES ?? DEFAULT_STORE
}

export interface FederatedCase {
  id: string // stable slug; dedup + protection key
  description: string
  kind: string // which harness branch in the block's test runs it
  payload: unknown // declarative input the harness interprets
  origin: string // which project deposited it
  ts: string
}

type Store = Record<string, FederatedCase[]> // block -> cases

function read(): Store {
  try {
    return JSON.parse(readFileSync(storePath(), 'utf8')) as Store
  } catch {
    return {}
  }
}

function write(s: Store): void {
  const p = storePath()
  mkdirSync(dirname(p), { recursive: true })
  writeFileSync(p, JSON.stringify(s, null, 2))
}

// depositCase: add an executable case for a block. Dedup by id (merge, not append).
// Returns true if newly added.
export function depositCase(block: string, c: Omit<FederatedCase, 'ts'>): boolean {
  const s = read()
  const list = s[block] ?? []
  if (list.some((x) => x.id === c.id)) return false
  list.unshift({ ...c, ts: new Date().toISOString() })
  s[block] = list
  write(s)
  return true
}

export function recallCases(block: string): FederatedCase[] {
  return read()[block] ?? []
}

function committedCases(blockDir: string): FederatedCase[] {
  try {
    return JSON.parse(readFileSync(join(blockDir, 'cases.json'), 'utf8')) as FederatedCase[]
  } catch {
    return []
  }
}

// runCases: execute every case the block has accumulated — committed snapshot first (protected,
// cannot be removed via the store), then store-only ones (federated, not yet committed). The
// harness returns null on pass, a detail string on failure, or 'unknown-kind' for kinds this
// copy of the block does not know how to run (older stamp, newer case).
export interface CaseRun {
  ran: number
  failures: { id: string; origin: string; detail: string }[]
  unknown: string[] // case ids this harness could not interpret — visible, never a silent pass
}

export async function runCases(
  block: string,
  blockDir: string,
  harness: (kind: string, payload: unknown) => Promise<string | null> | string | null,
): Promise<CaseRun> {
  const committed = committedCases(blockDir)
  const fromStore = recallCases(block).filter((c) => !committed.some((k) => k.id === c.id))
  const res: CaseRun = { ran: 0, failures: [], unknown: [] }
  for (const c of [...committed, ...fromStore]) {
    const out = await harness(c.kind, c.payload)
    if (out === 'unknown-kind') {
      res.unknown.push(c.id)
      continue
    }
    res.ran++
    if (out !== null) res.failures.push({ id: c.id, origin: c.origin, detail: out })
  }
  return res
}

// syncCases: snapshot a block's federated cases into its committed cases.json. Called per block
// by the cases:sync script. Committing the result is the human approval that arms protection.
export function syncCases(block: string, blockDir: string): number {
  const merged = [...committedCases(blockDir)]
  for (const c of recallCases(block)) if (!merged.some((k) => k.id === c.id)) merged.push(c)
  if (merged.length) writeFileSync(join(blockDir, 'cases.json'), JSON.stringify(merged, null, 2) + '\n')
  return merged.length
}
