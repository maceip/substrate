# i18n — insights (FoT)

Distilled, cross-project lessons. **Merged, not appended. Capped.** Each entry is the
abstracted lesson only — not raw data, not code. A lesson here was learned in one project
and is meant to save the next one from relearning it. The test of FoT: a lesson crossed a
repo boundary without being hand-copied.

> Seeded from the substrate design work; entries below are starting hypotheses, replaced as
> real projects deposit real lessons.

- **A stated missing-key policy beats throwing — and beats blanking.** The instinct is to throw
  on an unknown key (crashes a page) or return "" (ships a blank label nobody notices). Both are
  worse than a STATED fallback: requested locale -> default locale -> the key itself, plus a
  report. The key string is an ugly but honest signal; a blank is a silent one. Decide the policy
  once, in the port, so no adapter can quietly pick a different bad default.
- **A catalog gap must be reported, not hidden behind fallback.** Silent fallback to the default
  locale makes a half-translated app look finished — the gap only surfaces when a user in `es`
  reads English. Measure non-default locales against the default keyset and report coverage %.
  Fallback is the runtime safety net; completeness reporting is the thing that gets the gap fixed.
- **Negotiate, then fall back — never serve a locale you do not have.** Parse Accept-Language by
  q-value, match exact then by primary subtag, and when nothing matches return the default. The
  bug this prevents is routing a user to a locale whose catalog is empty because the header
  *named* it — availability, not the header, decides what gets served.

<!-- fot:federated:begin -->
## Federated lessons (auto-synced from the FoT store — do not edit by hand)

_None yet — lessons deposited via the federation store appear here._
<!-- fot:federated:end -->
