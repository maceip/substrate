// adapters/elementary.ts — ELEMENTARY grade (the DEFAULT for real projects)
//
// Multi-locale and dependency-free. Catalogs load from the JSON message files SHIPPED under the
// block (messages/*.json — content, committed, not runtime state). It does everything the
// nursery->elementary gate makes mandatory: the STATED fallback policy (requested locale ->
// default locale -> key), missing-key and missing-interpolation REPORTING through one seam, and
// real Accept-Language NEGOTIATION to the best available locale. App code does not change one
// character moving here from nursery — t() calls are identical.
//
// It stops short of `graduated`: it can FALL BACK across a gap but does not MEASURE coverage and
// has no import pipeline. Those are what the elementary->graduated gate demands, and what the
// graduated adapter adds.

import { readdir, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Adapter, I18n, Messages, MissingReport, TranslateOptions } from '../port.ts'
import { interpolate, negotiate } from '../_engine.ts'

const MESSAGES_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'messages')

// Load every messages/<locale>.json shipped with the block. These are CONTENT, not state.
// Exported so the graduated grade can layer its imported snapshot on top of the same baseline.
export async function loadShippedCatalogs(): Promise<Map<string, Messages>> {
  const catalogs = new Map<string, Messages>()
  let files: string[]
  try {
    files = await readdir(MESSAGES_DIR)
  } catch {
    return catalogs // no message files shipped yet — caller can addCatalog() at runtime
  }
  for (const file of files) {
    if (!file.endsWith('.json')) continue
    const locale = file.slice(0, -'.json'.length)
    const raw = await readFile(join(MESSAGES_DIR, file), 'utf8')
    catalogs.set(locale, JSON.parse(raw) as Messages)
  }
  return catalogs
}

function defaultReport(r: MissingReport): void {
  const what = r.kind === 'key' ? `missing key "${r.key}"` : `missing var {${r.variable}} in "${r.key}"`
  console.warn(`[i18n:elementary] ${what} (${r.locale})`)
}

export class ElementaryI18n implements I18n {
  protected catalogs: Map<string, Messages>
  protected defaultLocale: string
  protected onMissing: (r: MissingReport) => void

  constructor(defaultLocale: string, catalogs: Map<string, Messages>, onMissing: (r: MissingReport) => void) {
    this.defaultLocale = defaultLocale
    this.catalogs = catalogs
    this.onMissing = onMissing
    if (!this.catalogs.has(defaultLocale)) this.catalogs.set(defaultLocale, {})
  }

  t(key: string, vars?: Record<string, unknown>, opts?: TranslateOptions): string {
    const locale = opts?.locale ?? this.defaultLocale
    // PORT GUARANTEE 1, in order: requested locale -> default locale -> the key itself.
    const requested = this.catalogs.get(locale)
    if (requested && Object.prototype.hasOwnProperty.call(requested, key)) {
      return interpolate(requested[key], vars, { key, locale }, this.onMissing)
    }
    const fallback = this.catalogs.get(this.defaultLocale)
    if (fallback && Object.prototype.hasOwnProperty.call(fallback, key)) {
      // The string was missing in the REQUESTED locale: report the gap, then serve the default.
      if (locale !== this.defaultLocale) this.onMissing({ kind: 'key', key, locale })
      return interpolate(fallback[key], vars, { key, locale: this.defaultLocale }, this.onMissing)
    }
    // Absent everywhere: report and fall back to the key. Never a throw, never "".
    this.onMissing({ kind: 'key', key, locale })
    return key
  }

  negotiate(preferred: string | string[]): string {
    return negotiate(preferred, this.locales(), this.defaultLocale)
  }

  has(key: string, locale?: string): boolean {
    const cat = this.catalogs.get(locale ?? this.defaultLocale)
    return cat ? Object.prototype.hasOwnProperty.call(cat, key) : false
  }

  locales(): string[] {
    // Default first, then the rest in load order — negotiate() relies on availability, not order,
    // but a stable default-first list keeps locales()[0] meaningful to callers.
    const rest = [...this.catalogs.keys()].filter((l) => l !== this.defaultLocale)
    return [this.defaultLocale, ...rest]
  }

  addCatalog(locale: string, messages: Messages): void {
    const existing = this.catalogs.get(locale) ?? {}
    this.catalogs.set(locale, { ...existing, ...messages })
  }

  close(): void {}
}

export const adapter: Adapter = {
  name: 'elementary',
  maxGrade: 'elementary',
  // Everything the nursery->elementary gate requires; not yet completeness or a pipeline.
  capabilities: ['fallback-policy', 'missing-key-reported', 'interpolation-checked', 'locale-negotiation'],
  async open(defaultLocale: string, onMissing?: (r: MissingReport) => void): Promise<I18n> {
    const catalogs = await loadShippedCatalogs()
    return new ElementaryI18n(defaultLocale, catalogs, onMissing ?? defaultReport)
  },
}
