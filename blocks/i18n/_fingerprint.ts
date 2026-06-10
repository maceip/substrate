// _fingerprint.ts — test helper. Runs a fixed app sequence against whatever adapter
// I18N_ADAPTER selects and prints a stable fingerprint of the observable result. Used by
// block.test.ts to assert port invariance across adapters.
//
// To compare fairly across grades (the nursery adapter is single-locale by design), the
// sequence seeds ONE locale via addCatalog and exercises only what every grade can serve:
// a present key, an interpolated key, a missing key (the fallback policy), and a missing var.
// The observable result of those calls is what must be identical no matter the grade.

import { open } from './index.ts'
import type { MissingReport } from './index.ts'

const reports: string[] = []
const i18n = await open('en', (r: MissingReport) => reports.push(`${r.kind}:${r.key}:${r.variable ?? ''}`))

i18n.addCatalog('en', { greeting: 'Hello, {name}', goodbye: 'Goodbye' })

const out = {
  present: i18n.t('greeting', { name: 'Ada' }), // interpolation
  plain: i18n.t('goodbye'), // no vars
  missingKey: i18n.t('nope'), // fallback policy -> the key itself
  missingVar: i18n.t('greeting'), // declared {name}, none supplied -> visible + reported
  has: [i18n.has('greeting'), i18n.has('nope')],
  reports: reports.sort(),
}
i18n.close()

process.stdout.write(JSON.stringify(out))
