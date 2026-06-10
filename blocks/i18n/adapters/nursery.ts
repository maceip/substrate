// adapters/nursery.ts — NURSERY grade
//
// The thinnest thing that satisfies the port: ONE in-memory catalog, the default locale only.
// Real enough to build and test against. It still honors the non-negotiable PORT GUARANTEES —
// a missing key falls back to the key string (never throws, never blanks) and a missing {var}
// is left visible and reported — but it has no second locale, so it cannot NEGOTIATE and cannot
// MEASURE coverage. That is exactly why it tops out at `nursery`: the moment a second locale or
// production users appear, the nursery->elementary gate's requirements outrun what it can do.
//
// Dependency-free: node builtins only (and in fact none needed beyond the shared engine).

import type { Adapter, I18n, Messages, MissingReport, TranslateOptions } from '../port.ts'
import { interpolate } from '../_engine.ts'

function defaultReport(r: MissingReport): void {
  const what = r.kind === 'key' ? `missing key "${r.key}"` : `missing var {${r.variable}} in "${r.key}"`
  console.warn(`[i18n:nursery] ${what} (${r.locale})`)
}

class NurseryI18n implements I18n {
  private catalog: Messages = {}
  private defaultLocale: string
  private onMissing: (r: MissingReport) => void

  constructor(defaultLocale: string, onMissing: (r: MissingReport) => void) {
    this.defaultLocale = defaultLocale
    this.onMissing = onMissing
  }

  t(key: string, vars?: Record<string, unknown>, _opts?: TranslateOptions): string {
    // Single locale: the requested-locale step and the default-locale step collapse to one.
    const template = this.catalog[key]
    if (template === undefined) {
      // PORT GUARANTEE 1: report, then fall back to the key itself. Never throw, never "".
      this.onMissing({ kind: 'key', key, locale: this.defaultLocale })
      return key
    }
    return interpolate(template, vars, { key, locale: this.defaultLocale }, this.onMissing)
  }

  negotiate(_preferred: string | string[]): string {
    // Only one locale exists to serve; there is nothing to negotiate. (Elementary adds real
    // negotiation — and the gate makes that mandatory the moment a second locale appears.)
    return this.defaultLocale
  }

  has(key: string, _locale?: string): boolean {
    return Object.prototype.hasOwnProperty.call(this.catalog, key)
  }

  locales(): string[] {
    return [this.defaultLocale]
  }

  addCatalog(_locale: string, messages: Messages): void {
    // Nursery is single-locale: every catalog merges into the one default locale.
    Object.assign(this.catalog, messages)
  }

  close(): void {}
}

export const adapter: Adapter = {
  name: 'nursery',
  maxGrade: 'nursery',
  // No negotiation, no completeness, no pipeline — only the unconditional guarantees hold here.
  capabilities: ['fallback-policy', 'missing-key-reported', 'interpolation-checked'],
  async open(defaultLocale: string, onMissing?: (r: MissingReport) => void): Promise<I18n> {
    return new NurseryI18n(defaultLocale, onMissing ?? defaultReport)
  },
}
