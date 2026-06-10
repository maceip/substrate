// demo.ts — a tiny localized app built ONLY against ./index.ts
//
// It never imports an adapter, a grade, or a gate directly. Run it under different I18N_ADAPTER
// values and the t() calls are byte-for-byte identical — that is the port doing its job. Then it
// runs the gate evaluator across the localization lifecycle to show requirements activating as
// thresholds are crossed.
//
//   node blocks/i18n/demo.ts
//   I18N_ADAPTER=nursery node blocks/i18n/demo.ts

import { open, checkGrade, currentGrade } from './index.ts'
import type { MissingReport } from './index.ts'

const grade = await currentGrade()
console.log(`\n=== i18n block — adapter grade: ${grade} ===\n`)

// One report sink for the whole app — the seam that makes a missing key/var loud, not silent.
const reports: MissingReport[] = []
const i18n = await open('en', (r) => reports.push(r))

// t() across locales — identical call sites, the locale picked by opts. (nursery serves only
// the default; elementary/graduated serve the shipped messages/*.json catalogs.)
console.log('t() across locales (identical call sites):')
console.log(`  en: ${i18n.t('greeting', { name: 'Ada' })}`)
console.log(`  fr: ${i18n.t('greeting', { name: 'Ada' }, { locale: 'fr' })}`)
console.log(`  es: ${i18n.t('greeting', { name: 'Ada' }, { locale: 'es' })}`)

// Accept-Language negotiation -> the best AVAILABLE locale (never an unservable one).
console.log('\nAccept-Language negotiation:')
console.log(`  "fr-CA,fr;q=0.9,en;q=0.5" -> ${i18n.negotiate('fr-CA,fr;q=0.9,en;q=0.5')}`)
console.log(`  "de-DE,de;q=0.9"          -> ${i18n.negotiate('de-DE,de;q=0.9')} (no German — falls back to default)`)

// Missing key -> the STATED fallback policy: requested locale -> default locale -> the key itself.
console.log('\nmissing-key fallback policy:')
console.log(`  es "order_total" (only in en) -> "${i18n.t('order_total', { total: '$9' }, { locale: 'es' })}" (served from default locale)`)
console.log(`  unknown "checkout_button"      -> "${i18n.t('checkout_button')}" (no locale has it — the key itself, never blank)`)

// Interpolation: a declared {name} the call omits is left VISIBLE and reported — never shipped silently.
console.log('\ninterpolation guard:')
console.log(`  t('greeting') with no name -> "${i18n.t('greeting')}" (placeholder kept visible AND reported)`)

console.log(`\nreports collected (${reports.length}) — these would never have surfaced if the policy were silent:`)
for (const r of reports) console.log(`  - ${r.kind} "${r.key}" (${r.locale})${r.variable ? ` var {${r.variable}}` : ''}`)

i18n.close()

function fmt(label: string, e: Awaited<ReturnType<typeof checkGrade>>) {
  const verdict = e.ok ? 'OK' : e.underGraded ? `UNDER-GRADED (need ${e.requiredGrade})` : 'REQUIREMENTS UNMET'
  const lines = [`  ${label} -> required:${e.requiredGrade}  ${verdict}`]
  for (const u of e.unmet) lines.push(`      ✗ ${u.requirement}: ${u.describe}`)
  return lines.join('\n')
}

console.log('\ngate evaluation across the localization lifecycle:')
console.log(fmt('day 1   (1 locale, dev)         ', await checkGrade({ locales: 1, prod: false, public: false, externalTranslators: false })))
console.log(fmt('launch  (3 locales, prod, public)', await checkGrade({ locales: 3, prod: true, public: true, externalTranslators: false })))
console.log(fmt('scale   (8 locales, Crowdin feed)', await checkGrade({ locales: 8, prod: true, public: true, externalTranslators: true })))
console.log('')
