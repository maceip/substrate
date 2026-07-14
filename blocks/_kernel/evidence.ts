// _kernel/evidence.ts — PROTOCOL SEGMENT S6: evidence on failure (the MOSS front half).
//
// MOSS's actual mechanism (arXiv:2605.22794, read Jun 12): failures are curated into
// per-target batches of structured chunks; a batch SEALING (at N chunks) is the artifact
// that triggers a rewrite cycle. The trigger is evidence volume, not a human noticing.
// This is that front half: every failure anywhere appends a chunk; sealed batches are the
// rewrite queue. The back half (locate→plan→implement→trial→verdict) stays human-gated.
//
// Storage: ~/.substrate/evidence.json — outside any repo for the same reason the FoT store
// is: failures in any project count as evidence against the shared block.

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'

const DEFAULT_STORE = join(homedir(), '.substrate', 'evidence.json')
export const SEAL_AT = 8 // MOSS's batch size

function storePath(): string {
  return process.env.EVIDENCE_STORE ?? DEFAULT_STORE
}

export interface EvidenceChunk {
  ts: string
  unit: string // block name, or a kernel unit like 'update-channel'
  source: string // what produced it: gate-block | test-red | update-red | repeat | manual
  detail: string // one line, enough to relocate the failure
  origin: string // which project
}

interface Store {
  open: Record<string, EvidenceChunk[]> // unit -> accumulating chunks
  sealed: Record<string, EvidenceChunk[][]> // unit -> sealed batches (the rewrite queue)
}

function read(): Store {
  try {
    return JSON.parse(readFileSync(storePath(), 'utf8')) as Store
  } catch {
    return { open: {}, sealed: {} }
  }
}

function write(s: Store): void {
  mkdirSync(dirname(storePath()), { recursive: true })
  writeFileSync(storePath(), JSON.stringify(s, null, 2))
}

// recordEvidence: append one failure chunk. Returns 'sealed' when this chunk completed a
// batch — the caller may surface that a rewrite cycle is now justified.
export function recordEvidence(unit: string, source: string, detail: string, origin = process.env.PROJECT ?? 'unknown'): 'open' | 'sealed' {
  const s = read()
  const list = s.open[unit] ?? []
  list.push({ ts: new Date().toISOString(), unit, source, detail: detail.slice(0, 500), origin })
  if (list.length >= SEAL_AT) {
    s.sealed[unit] = [...(s.sealed[unit] ?? []), list]
    s.open[unit] = []
    write(s)
    return 'sealed'
  }
  s.open[unit] = list
  write(s)
  return 'open'
}

// sealedBatches: the rewrite queue — every unit with at least one sealed batch.
export function sealedBatches(): Record<string, EvidenceChunk[][]> {
  return read().sealed
}

export function batchTs(batch: EvidenceChunk[]): string | undefined {
  return batch[0]?.ts
}

function matchesBatch(batch: EvidenceChunk[], evidenceDetail?: string, evidenceTs?: string): boolean {
  if (evidenceTs) return batchTs(batch) === evidenceTs
  if (evidenceDetail) return batch[0]?.detail === evidenceDetail
  return true
}

export function hasSealedBatch(unit: string, evidenceDetail?: string, evidenceTs?: string): boolean {
  const batches = read().sealed[unit]
  if (!batches?.length) return false
  return batches.some((batch) => matchesBatch(batch, evidenceDetail, evidenceTs))
}

// consumeBatch: a rewrite cycle took a sealed batch for a unit (call after the rewrite
// lands, so an aborted cycle leaves the evidence in the queue).
export function consumeBatch(unit: string, evidenceDetail?: string, evidenceTs?: string): EvidenceChunk[] | null {
  const s = read()
  const batches = s.sealed[unit]
  if (!batches?.length) return null
  const index = batches.findIndex((batch) => matchesBatch(batch, evidenceDetail, evidenceTs))
  if (index < 0) return null
  const [batch] = batches.splice(index, 1)
  if (!batches.length) delete s.sealed[unit]
  write(s)
  return batch ?? null
}

export function evidenceCounts(): Record<string, { open: number; sealedBatches: number }> {
  const s = read()
  const out: Record<string, { open: number; sealedBatches: number }> = {}
  for (const [u, l] of Object.entries(s.open)) out[u] = { open: l.length, sealedBatches: s.sealed[u]?.length ?? 0 }
  for (const [u, b] of Object.entries(s.sealed)) out[u] = { open: out[u]?.open ?? 0, sealedBatches: b.length }
  return out
}
