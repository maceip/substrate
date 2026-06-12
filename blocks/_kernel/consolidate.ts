// _kernel/consolidate.ts — PROTOCOL S5's missing half: LLM consolidation (FoT, corrected).
//
// The paper's core operation (arXiv:2604.16778, method read Jun 12): libraries shrink by
// SEMANTIC MERGE — cluster traces with similar skills, connect ones solving the same problem
// differently, synthesize fewer-but-stronger insights — never by truncation. Target size is
// their log-cap: round(log10(max(10, n)) * 10 + 1).
//
// Pure logic here; the model is INJECTED, so kernel tests run offline with a stub and the
// real pass (consolidate-cli.ts) wires an actual LLM. Provenance survives merging: a merged
// lesson records every contributing origin. Nothing is destroyed: the pre-merge library is
// archived to ~/.substrate/consolidations/ before the store is rewritten.

import { mkdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { recall, type Insight } from './fot.ts'

export type ModelFn = (prompt: string) => Promise<string>

export function targetSize(n: number): number {
  return Math.round(Math.log10(Math.max(10, n)) * 10 + 1)
}

export function consolidationPrompt(block: string, lessons: Insight[], target: number): string {
  const numbered = lessons.map((l, i) => `${i}. ${l.text}`).join('\n')
  return `You are consolidating a library of distilled engineering lessons about the capability "${block}".
Cluster lessons that express similar or connected knowledge, then SYNTHESIZE each cluster into one
stronger, more general lesson — do not merely concatenate, and do not lose any load-bearing
specific (exact failure modes, exact rules, exact names). Lessons that are genuinely unrelated
stay as they are. Aim for at most ${target} lessons total.

INPUT LESSONS (numbered):
${numbered}

Reply with ONLY a JSON array, no prose:
[{"text": "<merged or kept lesson>", "from": [<input indices it covers>]}, ...]
Every input index 0..${lessons.length - 1} must appear in exactly one "from" array.`
}

export interface MergedLesson {
  text: string
  from: number[]
}

// parse + validate the model's reply. Fail closed: a reply that loses or duplicates inputs
// is rejected — better to keep an unconsolidated library than to silently drop knowledge.
export function parseMerge(reply: string, inputCount: number): MergedLesson[] {
  const start = reply.indexOf('[')
  const end = reply.lastIndexOf(']')
  if (start < 0 || end <= start) throw new Error('no JSON array in model reply')
  const arr = JSON.parse(reply.slice(start, end + 1)) as MergedLesson[]
  const seen = new Set<number>()
  for (const m of arr) {
    if (typeof m.text !== 'string' || !m.text.trim() || !Array.isArray(m.from)) throw new Error('malformed merged lesson')
    for (const i of m.from) {
      if (!Number.isInteger(i) || i < 0 || i >= inputCount) throw new Error(`from index ${i} out of range`)
      if (seen.has(i)) throw new Error(`input ${i} covered twice — merge must partition, not duplicate`)
      seen.add(i)
    }
  }
  if (seen.size !== inputCount) throw new Error(`merge lost inputs: covered ${seen.size}/${inputCount} — refusing (never destroy knowledge)`)
  return arr
}

export interface ConsolidationResult {
  block: string
  before: number
  after: number
  library: Insight[]
}

// consolidateBlock: run the merge for one block. Does NOT write the store — returns the new
// library so the caller (CLI/steward) archives and applies explicitly.
export async function consolidateBlock(block: string, model: ModelFn): Promise<ConsolidationResult> {
  const lessons = recall(block)
  const target = targetSize(lessons.length)
  const reply = await model(consolidationPrompt(block, lessons, target))
  const merged = parseMerge(reply, lessons.length)
  const now = new Date().toISOString()
  const library: Insight[] = merged.map((m) => {
    const contributors = m.from.map((i) => lessons[i])
    const origins = [...new Set(contributors.map((c) => c.origin))]
    return {
      text: m.text.trim(),
      // single-source lessons keep their origin; merged ones record every contributor
      origin: m.from.length === 1 ? contributors[0].origin : `consolidated[${origins.join('+')}]`,
      ts: m.from.length === 1 ? contributors[0].ts : now,
    }
  })
  return { block, before: lessons.length, after: library.length, library }
}

// archive: never destroy — the pre-merge library is written out before any store rewrite.
export function archivePreMerge(block: string, lessons: Insight[]): string {
  const dir = join(process.env.SUBSTRATE_HOME ?? join(homedir(), '.substrate'), 'consolidations')
  mkdirSync(dir, { recursive: true })
  const file = join(dir, `${new Date().toISOString().replace(/[:.]/g, '-')}-${block}.json`)
  writeFileSync(file, JSON.stringify(lessons, null, 2))
  return file
}
