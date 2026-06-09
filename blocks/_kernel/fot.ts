// _kernel/fot.ts — Federation over Text. The flywheel.
//
// A shared, evolving insight library keyed by block. A project that uses a block can DEPOSIT a
// distilled lesson; a LATER, independent project that pulls the same block RECALLs it — without
// anyone hand-copying a file. That automatic crossing is the whole test of FoT (a file you edit
// by hand is not FoT; a lesson that travels on its own is).
//
// The store is MERGED and CAPPED (dedup by normalized text, keep the most recent CAP), not an
// append-only log — exactly as the paper specifies. Location is the federation boundary: set
// FOT_STORE to point independent projects at the same library (or isolate them in a test).

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const DEFAULT_STORE = join(dirname(fileURLToPath(import.meta.url)), '.fot-store.json')
const CAP = 20

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

// deposit: add a distilled lesson for a block. Dedups against existing (merge, not append) and
// caps the list. Returns true if it was newly added.
export function deposit(block: string, text: string, origin: string): boolean {
  const s = read()
  const list = s[block] ?? []
  if (list.some((i) => norm(i.text) === norm(text))) return false
  list.unshift({ text: text.trim(), origin, ts: new Date().toISOString() })
  s[block] = list.slice(0, CAP)
  write(s)
  return true
}

// recall: the federated lessons a block has accumulated across all projects.
export function recall(block: string): Insight[] {
  return read()[block] ?? []
}

// forBlock: the handle a block's index.ts re-exports so app code says `learn(...)` / `insights()`
// without knowing the store exists.
export function forBlock(block: string) {
  return {
    learn: (text: string, origin: string = process.env.PROJECT ?? 'unknown') => deposit(block, text, origin),
    insights: () => recall(block),
  }
}
