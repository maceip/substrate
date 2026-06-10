// block.test.ts — invariants of the i18n block. Dependency-free; run with node.
//   node i18n/block.test.ts
//
// Proves the claims the block exists to make:
//   1. The port holds: the same app sequence yields the same result under every adapter.
//   2. A missing key follows the STATED fallback policy (locale -> default -> key), never a throw.
//   3. A declared interpolation var the call omits is REPORTED, not silently shipped.
//   4. Accept-Language negotiation picks the right AVAILABLE locale.
//   5. The evaluator escalates required grade as signals cross thresholds.
//   6. The protected evaluator refuses loosening.
//   7. The committed baseline is not loosened (AEvo, armed).

import assert from 'node:assert/strict'
import { GATES, assertNoLoosening, evaluate } from './gates.ts'
import { adapter as elementary } from './adapters/elementary.ts'
import type { Messages, MissingReport } from './port.ts'

let failures = 0
function check(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve()
    .then(fn)
    .then(() => console.log(`  ✓ ${name}`))
    .catch((e) => {
      failures++
      console.log(`  ✗ ${name}\n      ${e.message}`)
    })
}

console.log('\ni18n block invariants:')

// 1. Port invariance: the same app sequence yields the same result under every adapter.
//    index.ts caches its adapter per process, so we fingerprint each adapter in a subprocess.
await check('port invariance: nursery and elementary agree on app behavior', async () => {
  const { execFileSync } = await import('node:child_process')
  const run = (adapter: string) =>
    execFileSync(process.execPath, [new URL('./_fingerprint.ts', import.meta.url).pathname], {
      env: { ...process.env, I18N_ADAPTER: adapter },
      encoding: 'utf8',
    }).trim()
  assert.equal(run('nursery'), run('elementary'), 'nursery and elementary diverged')
})

// 2. Fallback policy: a missing key resolves locale -> default -> the key itself, deterministically.
await check('fallback policy: missing key -> default-locale value -> key, never a throw or blank', async () => {
  const i18n = await elementary.open('en', () => {}) // shipped catalogs: en complete, es partial; silence reports here
  // present in es directly:
  assert.equal(i18n.t('goodbye', {}, { locale: 'es' }), 'Adiós')
  // absent in es, present in default (en): served from the default locale, not blanked.
  assert.equal(i18n.t('order_total', { total: '$9' }, { locale: 'es' }), 'Your total is $9')
  // absent everywhere: the key itself — never a throw, never "".
  assert.equal(i18n.t('nonexistent_key', {}, { locale: 'es' }), 'nonexistent_key')
  i18n.close()
})

// 3. Interpolation: a declared var the call omits is reported AND left visible, never shipped silently.
await check('interpolation: a missing declared var is reported, not silently shipped', async () => {
  const reports: MissingReport[] = []
  const i18n = await elementary.open('en', (r) => reports.push(r))
  const out = i18n.t('greeting') // "Hello, {name}" with no name supplied
  assert.equal(out, 'Hello, {name}', 'placeholder must stay visible, not be blanked')
  assert.ok(
    reports.some((r) => r.kind === 'interpolation' && r.variable === 'name' && r.key === 'greeting'),
    'a missing interpolation var must be reported',
  )
  // A supplied var produces no report.
  reports.length = 0
  assert.equal(i18n.t('greeting', { name: 'Ada' }), 'Hello, Ada')
  assert.equal(reports.length, 0, 'a satisfied interpolation must not report')
  i18n.close()
})

// 4. Negotiation: Accept-Language picks the best AVAILABLE locale; falls back to default otherwise.
await check('negotiation: Accept-Language picks the right available locale', async () => {
  const i18n = await elementary.open('en') // available: en, fr, es
  assert.equal(i18n.negotiate('fr-CA,fr;q=0.9,en;q=0.5'), 'fr', 'primary-subtag match should pick fr')
  assert.equal(i18n.negotiate('es-MX'), 'es', 'es-MX should match available es')
  assert.equal(i18n.negotiate(['de', 'en']), 'en', 'first available preference wins')
  assert.equal(i18n.negotiate('de-DE,de;q=0.9'), 'en', 'no match -> default locale, never unservable')
  i18n.close()
})

// 4b. Graduated-only: completeness is MEASURED (not hidden) and the import pipeline reports coverage.
await check('graduated: catalog completeness reported + import pipeline merges and re-measures', async () => {
  const { GraduatedI18n } = await import('./adapters/graduated.ts')
  const { rm } = await import('node:fs/promises')
  const dataDir = new URL('./.data', import.meta.url).pathname
  const catalogs = new Map<string, Messages>([
    ['en', { greeting: 'Hello, {name}', goodbye: 'Goodbye', login_prompt: 'Sign in' }],
    ['es', { greeting: 'Hola, {name}' }], // 1 of 3 -> a gap that must be REPORTED, not hidden
  ])
  const i18n = new GraduatedI18n('en', catalogs, () => {})
  const before = i18n.coverage('es')
  assert.equal(before.total, 3)
  assert.equal(before.translated, 1)
  assert.equal(before.percent, 33)
  assert.deepEqual(before.missing.sort(), ['goodbye', 'login_prompt'])
  // pluralization is a rule, not six hand-written keys:
  assert.equal(i18n.plural({ one: '{count} item', other: '{count} items' }, 1), '1 item')
  assert.equal(i18n.plural({ one: '{count} item', other: '{count} items' }, 5), '5 items')
  // import pipeline: merge an external bundle (Crowdin stand-in) and re-measure coverage.
  const report = await i18n.importTranslations({ es: { goodbye: 'Adiós', login_prompt: 'Inicia sesión' } })
  assert.equal(report.find((c) => c.locale === 'es')?.percent, 100, 'es is fully covered after import')
  i18n.close()
  await rm(dataDir, { recursive: true, force: true }) // generated output is not state — clean up
})

// 5. The evaluator escalates required grade as signals cross thresholds.
await check('gate escalation: nursery -> elementary -> graduated', () => {
  const base = { capabilities: new Set<string>(), adapterGrade: 'nursery' as const }
  assert.equal(evaluate({ ...base, signals: { locales: 1, prod: false, public: false, externalTranslators: false } }).requiredGrade, 'nursery')
  assert.equal(evaluate({ ...base, signals: { locales: 2, prod: false, public: false, externalTranslators: false } }).requiredGrade, 'elementary')
  assert.equal(evaluate({ ...base, signals: { locales: 3, prod: true, public: true, externalTranslators: true } }).requiredGrade, 'graduated')
})

// under-grade caught: the nursery adapter cannot serve a multi-locale production project.
await check('under-grade caught: nursery is public/multi-locale', () => {
  const e = evaluate({ signals: { locales: 3, prod: true, public: true, externalTranslators: false }, capabilities: new Set(['fallback-policy', 'missing-key-reported', 'interpolation-checked']), adapterGrade: 'nursery' })
  assert.ok(e.underGraded)
  assert.ok(e.unmet.some((u) => u.requirement === 'locale-negotiation'))
})

// 6. AEvo: loosening is rejected; tightening is allowed.
await check('assertNoLoosening: removing a gate is a violation', () => {
  const loosened = GATES.slice(0, 1) // dropped the graduated gate
  assert.ok(assertNoLoosening(GATES, loosened).length > 0)
})
await check('assertNoLoosening: adding a gate is allowed (tightening)', () => {
  const tightened = [...GATES, { ...GATES[0], id: 'gate:extra' }]
  assert.equal(assertNoLoosening(GATES, tightened).length, 0)
})

// AEvo armed: the live gates may not loosen the baseline committed at git HEAD
// (block.json). Tightening passes; loosening fails until a human commits it.
await check('PROTECTED: live gates do not loosen the committed baseline', async () => {
  const { checkProtection } = await import('../_kernel/protect.ts')
  const res = checkProtection(new URL('.', import.meta.url).pathname, GATES)
  if (res.baseline === 'none') return console.log('      (no committed baseline yet — protection arms on first commit)')
  assert.deepEqual(res.violations, [])
})

console.log('')
if (failures > 0) {
  console.log(`${failures} failing\n`)
  process.exit(1)
}
console.log('all green\n')
