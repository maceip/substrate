// port.ts — THE PORT for i18n. [PROTECTED]
//
// The single narrow interface app code is allowed to import. Defined by the CHANGE it
// absorbs: going single-locale -> multi-locale + an import (Crowdin-style) pipeline must
// pass through here and touch NOTHING above it. `t('greeting', { name })` is byte-for-byte
// identical whether one in-memory catalog or twelve imported locales sit behind it. App code
// imports from ./index.ts, which re-exports this; it NEVER imports an adapter directly.
//
// AEvo: this file is PROTECTED. An agent may TIGHTEN it (add a method, narrow a type, add a
// failing case) but may not LOOSEN it (remove a method, widen a return, drop a guarantee).
// See the PROTECTED file and gates.assertNoLoosening.
//
// PORT GUARANTEES — the seams this exists to hold, stated so an adapter cannot quietly drop one:
//   1. MISSING KEY HAS A STATED POLICY. t(key) for an unknown key NEVER throws and NEVER returns
//      "". It falls back, in order: the requested locale -> the default locale -> the key string
//      itself. A user sees the key, an operator sees a report (see onMissing) — never a blank.
//   2. MISSING INTERPOLATION IS CAUGHT, NOT SHIPPED. If a message declares {name} and the call
//      omits `name`, that is reported through the SAME seam — it is the difference between
//      shipping "Hello, Ada" and shipping "Hello, {name}" to a real user. The placeholder is
//      left visible (so the gap is obvious in QA) AND reported (so it is caught before QA).
//   3. NEGOTIATION IS DETERMINISTIC. negotiate() picks the best AVAILABLE locale from an
//      Accept-Language header or a preference list, and falls back to the default locale when
//      none match — it never returns a locale the catalog cannot serve.

export type { Grade } from '../_kernel/grade.ts'
export { gradeAtLeast } from '../_kernel/grade.ts'
import type { Grade } from '../_kernel/grade.ts'

// A catalog is a flat map of message key -> template. Templates interpolate {var} placeholders.
export type Messages = Record<string, string>

// Reported when a key is absent or a declared interpolation variable is missing. The SAME
// channel carries both — the point of the port is that neither is silent.
export interface MissingReport {
  kind: 'key' | 'interpolation'
  key: string
  locale: string
  variable?: string // set when kind === 'interpolation'
}

export interface TranslateOptions {
  locale?: string // override the default locale for this one call
}

// I18n: the contract. Every adapter, at every grade, satisfies exactly this.
export interface I18n {
  // t: resolve a key for a locale, interpolate vars, apply the missing-key/var policy above.
  //    ALWAYS returns a string — the stated fallbacks guarantee it.
  t(key: string, vars?: Record<string, unknown>, opts?: TranslateOptions): string
  // negotiate: pick the best available locale from an Accept-Language header or a preference
  //    list; returns the default locale when nothing matches (never an unservable locale).
  negotiate(preferred: string | string[]): string
  // has: is this key present in the given (or default) locale's catalog?
  has(key: string, locale?: string): boolean
  // locales: every locale this instance can serve, default first.
  locales(): string[]
  // addCatalog: merge a catalog into a locale at runtime (the seam an import pipeline writes to).
  addCatalog(locale: string, messages: Messages): void
  // close: release any held resources. A no-op for in-memory grades; symmetry with every port.
  close(): void
}

// Adapter: what each adapter file exports. The port is the SHAPE (I18n); the adapter is the
// swappable thing behind it. `maxGrade` is the highest grade whose requirements this adapter
// can satisfy; `capabilities` are the named guarantees the gate evaluator checks against.
export interface Adapter {
  name: string
  maxGrade: Grade
  capabilities: string[]
  // open: build an I18n for a default locale. `onMissing` is the report seam (guarantees 1 & 2);
  // when omitted, a default reporter is installed so a missing key/var is still surfaced.
  open(defaultLocale: string, onMissing?: (r: MissingReport) => void): Promise<I18n>
}
