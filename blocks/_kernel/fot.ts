// _kernel/fot.ts — Federation over Text. The flywheel.
//
// A shared, evolving insight library keyed by block. A project that uses a block can DEPOSIT a
// distilled lesson; a LATER, independent project that pulls the same block RECALLs it — without
// anyone hand-copying a file. That automatic crossing is the whole test of FoT (a file you edit
// by hand is not FoT; a lesson that travels on its own is).
//
// CORRECTED Jun 12 after actually reading the paper (arXiv:2604.16778): FoT libraries shrink by
// LLM CONSOLIDATION (cluster -> connect -> synthesize), never by truncation — discarding the
// oldest was their worst baseline. So deposit() no longer truncates: it dedups exact text and
// ACCUMULATES; consolidationDue() flags a block past the paper's ~20-insight sweet spot, and
// the consolidation pass (an LLM merge, the librarian's mechanized half) is what shrinks.
// Location is the federation boundary: the
// default lives OUTSIDE any repo (~/.substrate/) so independent projects on this machine share
// one library by default — a store inside a repo can never carry a lesson across repos. Set
// FOT_STORE to widen the boundary further (shared volume) or to isolate it in a test.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'

const DEFAULT_STORE = join(homedir(), '.substrate', 'fot-store.json')
export const SWEET_SPOT = 20 // the paper's per-library equilibrium; past it, consolidation is due

function storePath(): string {
  return process.env.FOT_STORE ?? DEFAULT_STORE
}

export interface Insight {
  text: string
  origin: string // which project deposited it
  ts: string
}

type Store = Record<string, Insight[]> // block -> insights

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

function norm(t: string): string {
  return t.trim().toLowerCase().replace(/\s+/g, ' ')
}

// deposit: add a distilled lesson for a block. Dedups exact text and ACCUMULATES — shrinking
// is consolidation's job, never truncation's (see header). Returns true if newly added.
export function deposit(block: string, text: string, origin: string): boolean {
  const s = read()
  const list = s[block] ?? []
  if (list.some((i) => norm(i.text) === norm(text))) return false
  list.unshift({ text: text.trim(), origin, ts: new Date().toISOString() })
  s[block] = list
  write(s)
  return true
}

// consolidationDue: blocks whose library has grown past the paper's sweet spot — the
// librarian's queue. Consolidation MERGES (cluster -> synthesize); it does not delete.
export function consolidationDue(): { block: string; count: number }[] {
  return Object.entries(read())
    .filter(([, list]) => list.length > SWEET_SPOT)
    .map(([block, list]) => ({ block, count: list.length }))
}

// recall: the federated lessons a block has accumulated across all projects.
export function recall(block: string): Insight[] {
  return read()[block] ?? []
}

// replaceLibrary: swap a block's whole library — ONLY for consolidation (S5's merge step),
// which must archive the pre-merge library first and is forbidden from losing inputs
// (parseMerge fails closed). Not for general use; deposit() is the write path.
export function replaceLibrary(block: string, lessons: Insight[]): void {
  const s = read()
  s[block] = lessons
  write(s)
}

// recallAll / totalInsights: the federation-wide view, so a project can show how much it
// inherited the moment it starts — across every block, not one. Read-only infrastructure.
export function recallAll(): Record<string, Insight[]> {
  return read()
}
export function totalInsights(): number {
  return Object.values(read()).reduce((n, list) => n + list.length, 0)
}

// forBlock: the handle a block's index.ts re-exports so app code says `learn(...)` / `insights()`
// without knowing the store exists.
export function forBlock(block: string) {
  return {
    learn: (text: string, origin: string = process.env.PROJECT ?? 'unknown') => deposit(block, text, origin),
    insights: () => recall(block),
  }
}
