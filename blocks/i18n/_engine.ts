// _engine.ts — the pure resolution logic every adapter shares.
//
// Not the port and not a grade: just the interpolation + negotiation primitives, written once
// so the nursery and elementary grades cannot drift in HOW a {var} is filled or HOW an
// Accept-Language header is parsed. Dependency-free; node builtins only (in fact, none needed).
//
// The two functions here are where PORT GUARANTEES 2 and 3 physically live:
//   - interpolate() leaves an un-supplied {var} VISIBLE and reports it (never silently blanked).
//   - negotiate() returns the best AVAILABLE locale or the default — never an unservable one.

import type { Messages, MissingReport } from './port.ts'

// Match {name}, {count}, etc. A backslash-escaped \{ is left literal (rare, but the seam exists).
const PLACEHOLDER = /\{(\w+)\}/g

// interpolate: fill {var} placeholders from `vars`. A declared placeholder with no matching
// value is LEFT IN PLACE (so QA sees "Hello, {name}", an obvious defect) and reported via
// `report` (so it is caught before QA). This is PORT GUARANTEE 2 made concrete.
export function interpolate(
  template: string,
  vars: Record<string, unknown> | undefined,
  ctx: { key: string; locale: string },
  report: (r: MissingReport) => void,
): string {
  return template.replace(PLACEHOLDER, (whole, name: string) => {
    if (vars && Object.prototype.hasOwnProperty.call(vars, name) && vars[name] != null) {
      return String(vars[name])
    }
    report({ kind: 'interpolation', key: ctx.key, locale: ctx.locale, variable: name })
    return whole // leave the placeholder visible — never blank it
  })
}

// parseAcceptLanguage: turn "en-US,en;q=0.9,fr;q=0.8" into ranges ordered by q (highest first).
// A bare token defaults to q=1. Ill-formed q values are treated as q=0 (least preferred), not a throw.
export function parseAcceptLanguage(header: string): string[] {
  return header
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';')
      const qParam = params.find((p) => p.trim().startsWith('q='))
      const q = qParam ? Number(qParam.trim().slice(2)) : 1
      return { tag: tag.trim().toLowerCase(), q: Number.isFinite(q) ? q : 0 }
    })
    .filter((r) => r.tag.length > 0 && r.q > 0)
    .sort((a, b) => b.q - a.q)
    .map((r) => r.tag)
}

// negotiate: pick the best AVAILABLE locale for a preference list. Matches exact ("fr-ca"),
// then by primary subtag ("fr-ca" -> "fr", or a preferred "fr" -> available "fr-CA"). Returns
// `defaultLocale` when nothing matches — PORT GUARANTEE 3: never an unservable locale.
export function negotiate(preferred: string | string[], available: string[], defaultLocale: string): string {
  const wants = (Array.isArray(preferred) ? preferred : parseAcceptLanguage(preferred)).map((p) => p.toLowerCase())
  const have = available.map((a) => ({ original: a, lower: a.toLowerCase() }))

  for (const want of wants) {
    const exact = have.find((h) => h.lower === want)
    if (exact) return exact.original
    const wantPrimary = want.split('-')[0]
    const byPrimary = have.find((h) => h.lower === wantPrimary || h.lower.split('-')[0] === wantPrimary)
    if (byPrimary) return byPrimary.original
  }
  return defaultLocale
}

// missingFrom: the keys present in the reference (default) catalog but absent from `locale`'s.
// The raw material for catalog-completeness reporting at the graduated grade.
export function missingFrom(reference: Messages, candidate: Messages): string[] {
  return Object.keys(reference).filter((k) => !Object.prototype.hasOwnProperty.call(candidate, k))
}
