// adapters/graduated.ts — GRADUATED grade
//
// The heavy real implementation behind the SAME port. It extends the elementary multi-locale
// engine with exactly what the elementary->graduated gate makes mandatory:
//   - CATALOG COMPLETENESS: non-default locales are measured against the default locale's keys
//     and the gaps are REPORTED (coverage(), report()), not hidden behind silent fallback.
//   - an IMPORT PIPELINE (importTranslations) that stands in for a Crowdin-style flow: merge an
//     external bundle, persist the merge under .data/ (generated output, gitignored), and report
//     coverage % so a gap is caught at import time instead of in production.
//   - PLURALIZATION (plural()) so "1 item" / "2 items" is a rule, not six hand-written keys.
//
// Still dependency-free: node builtins only. App code does not change one character moving here —
// t(), negotiate(), has(), locales() are byte-for-byte the same calls. The extra surface
// (importTranslations/coverage/plural) is graduated-only capability, reached through index.ts's
// graduated handle, never required of an app that has not crossed the gate.

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { Adapter, I18n, Messages, MissingReport } from '../port.ts'
import { missingFrom } from '../_engine.ts'
import { ElementaryI18n, loadShippedCatalogs } from './elementary.ts'

const DATA_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', '.data')

// Coverage of one locale against the default locale: which keys exist, which are missing, the %.
export interface Coverage {
  locale: string
  total: number // keys in the default (reference) locale
  translated: number
  missing: string[]
  percent: number // 0..100, rounded
}

// English (CLDR-ish) plural categories — enough to make plural() a rule, not a stub. A real
// graduated i18n would load per-locale CLDR plural rules; this is the thin-but-real baseline.
function pluralCategory(n: number): 'one' | 'other' {
  return n === 1 ? 'one' : 'other'
}

function defaultReport(r: MissingReport): void {
  const what = r.kind === 'key' ? `missing key "${r.key}"` : `missing var {${r.variable}} in "${r.key}"`
  console.warn(`[i18n:graduated] ${what} (${r.locale})`)
}

// Exported so block.test.ts can exercise the graduated-only surface (import pipeline,
// completeness, pluralization) directly — the capabilities the elementary->graduated gate checks.
export class GraduatedI18n extends ElementaryI18n {
  // coverage: measure one locale against the default locale's keyset. This is the seam that turns
  // a silent gap into a reported number — catalog-completeness made executable.
  coverage(locale: string): Coverage {
    const reference = this.catalogs.get(this.defaultLocale) ?? {}
    const candidate = this.catalogs.get(locale) ?? {}
    const missing = missingFrom(reference, candidate)
    const total = Object.keys(reference).length
    const translated = total - missing.length
    return { locale, total, translated, missing, percent: total === 0 ? 100 : Math.round((translated / total) * 100) }
  }

  // report: coverage for every non-default locale at once — the dashboard an import step prints.
  report(): Coverage[] {
    return this.locales()
      .filter((l) => l !== this.defaultLocale)
      .map((l) => this.coverage(l))
  }

  // plural: select an English plural form for a count. forms.one is optional and falls back to
  // forms.other, so a caller can pass just { other } when no special singular exists.
  plural(forms: { one?: string; other: string }, count: number, vars: Record<string, unknown> = {}): string {
    const category = pluralCategory(count)
    const template = category === 'one' ? (forms.one ?? forms.other) : forms.other
    // Reuse t()'s interpolation by routing through a one-shot inline key — but simpler: interpolate
    // here is the same engine the port uses, with {count} pre-bound.
    return template.replace(/\{(\w+)\}/g, (whole, name: string) => {
      const supplied = name === 'count' ? count : vars[name]
      if (supplied != null) return String(supplied)
      this.onMissing({ kind: 'interpolation', key: '(plural)', locale: this.defaultLocale, variable: name })
      return whole
    })
  }

  // importTranslations: the Crowdin-style pipeline. Merge an external bundle (locale -> messages)
  // into the live catalogs, persist the merged result under .data/ (generated, gitignored), and
  // return per-locale coverage so a shortfall is caught at import time. The persisted file is the
  // stand-in for "what the translation service last delivered".
  async importTranslations(bundle: Record<string, Messages>): Promise<Coverage[]> {
    for (const [locale, messages] of Object.entries(bundle)) this.addCatalog(locale, messages)
    await this.persist()
    return this.report()
  }

  private async persist(): Promise<void> {
    await mkdir(DATA_DIR, { recursive: true })
    const snapshot: Record<string, Messages> = {}
    for (const locale of this.locales()) snapshot[locale] = this.catalogs.get(locale) ?? {}
    const path = join(DATA_DIR, 'imported-catalogs.json')
    const tmp = `${path}.${crypto.randomUUID()}.tmp`
    await writeFile(tmp, JSON.stringify(snapshot, null, 2))
    await rename(tmp, path) // atomic — a crash mid-import cannot leave a torn snapshot
  }
}

// Reload shipped catalogs PLUS any previously imported snapshot under .data/, so a restart keeps
// the last import's coverage instead of silently regressing to the shipped baseline.
async function loadAll(): Promise<Map<string, Messages>> {
  const catalogs = await loadShippedCatalogs() // the committed baseline (messages/*.json)
  try {
    const raw = await readFile(join(DATA_DIR, 'imported-catalogs.json'), 'utf8')
    const snapshot = JSON.parse(raw) as Record<string, Messages>
    for (const [locale, messages] of Object.entries(snapshot)) {
      catalogs.set(locale, { ...(catalogs.get(locale) ?? {}), ...messages })
    }
  } catch {
    // no prior import — shipped catalogs are the whole truth
  }
  return catalogs
}

export const adapter: Adapter = {
  name: 'graduated',
  maxGrade: 'graduated',
  // Everything elementary guarantees, PLUS completeness measurement and the import pipeline.
  capabilities: ['fallback-policy', 'missing-key-reported', 'interpolation-checked', 'locale-negotiation', 'catalog-completeness', 'import-pipeline'],
  async open(defaultLocale: string, onMissing?: (r: MissingReport) => void): Promise<I18n> {
    const catalogs = await loadAll()
    return new GraduatedI18n(defaultLocale, catalogs, onMissing ?? defaultReport)
  },
}
