// _kernel/signals.ts — the sensor half of "graduation is organic".
//
// Gates are executable thresholds over ProjectSignals — but until now the signals were
// hand-authored by whoever called gradeReport, which quietly reintroduced the human the
// gates were supposed to remove. This module MEASURES what is observable:
//   writers   — distinct source files in the app dir that call a store write method
//   instances — declared concurrency (INSTANCES / WEB_CONCURRENCY), default 1
//   prod      — NODE_ENV === 'production'
//   rows      — live store.count(), supplied by the caller who has the store open
//   public    — a public origin is declared (PUBLIC_URL)
//
// Honest limits: writers is a static approximation (a call-site scan, not a runtime trace);
// instances and public read declared env, not real infrastructure. Better sensors can
// replace these behind the same shape — the port idea, applied to the sensor itself.

import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export interface MeasuredSignals {
  writers: number
  instances: number
  prod: boolean
  rows: number
  public: boolean
}

const WRITE_CALL = /\.(create|update|remove)\(/

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue
    const p = join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (e.name.endsWith('.ts') && !e.name.endsWith('.test.ts')) out.push(p)
  }
  return out
}

// Distinct app files that write through a store — the static stand-in for "writer count".
export function countWriterFiles(appDir: string): number {
  return walk(appDir).filter((f) => WRITE_CALL.test(readFileSync(f, 'utf8'))).length
}

export function measureSignals(appDir: string, opts: { rows?: number } = {}): MeasuredSignals {
  return {
    writers: countWriterFiles(appDir),
    instances: Number(process.env.INSTANCES ?? process.env.WEB_CONCURRENCY ?? 1),
    prod: process.env.NODE_ENV === 'production',
    rows: opts.rows ?? 0,
    public: process.env.PUBLIC_URL !== undefined,
  }
}
