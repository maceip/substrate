# Brownfield Probes (user tests 3 + 4) — combined findings (Jun 12 2026)

Two parallel probes into the brownfield-first question. Full reports in the session transcripts;
this is the load-bearing summary. Both foreign repos were left clean (feature branches, nothing
pushed); substrate itself untouched by both agents.

## Probe 3 — COEXIST (OpenClaw, ~20k files, mature agent gateway)
- ZERO block code crossed, correctly: the host already owns better-integrated versions of
  transport/env/logging. Coexist doctrine (SESSION 23b) empirically forced.
- WHAT TRAVELED: the TEXT layer — federated lessons shaped real design decisions in the shipped
  feature (fail-loud env, paths-never-values redaction, recomputed-verdict-never-stored-flag);
  one interface SHAPE vendored with provenance; 3 lessons + 1 evidence chunk deposited back.
  "The FoT store is the only substrate mechanism that worked unmodified across repos."
- HARD BLOCKERS for code adoption: zero-build `.ts`-extension imports unimportable in NodeNext
  hosts; host lint catches substrate style; create.ts refuses non-empty dirs.
- Feature shipped green: 14 new tests + 40 neighboring upstream tests.

## Probe 4 — WRAP (Documenso, real Prisma/Postgres schema)
- VERDICT: PARTIAL, AND VIABLY PARTIAL. Wrapped their Webhook model behind the persistence
  port: reads/writes/timestamps/not-found translate cleanly (P2025 -> null/false); contract
  accepts both create and update outputs verbatim.
- THE VERSION SEAM is the genuine disagreement: their model has no version field; synthetic
  version=1 passes the contract's per-value shape but the optimistic-concurrency SEMANTIC is
  dead — and checkContract cannot see cross-call semantics (the value-vs-trace contract split,
  again). Bridges by invasiveness: pg xmin view / trigger column / additive migration.
- NEEDS FIRST-CLASS PARTIAL-CONFORMANCE VOCABULARY: `conformance: { version: 'synthetic' }`
  readable by gates — not casts and comments.
- MECHANICS a generator must automate: schema parse + per-model eligibility matrix (string PK?
  timestamps? version?); field-bridge generation (Date->ISO, renames, synthetic fields);
  delegate + error translation + host enums mirrored verbatim + a type-only conformance file
  as drift alarm; THE PATH PROBLEM (six-up relative import to the port — needs a published
  port package or path alias); host module-dialect detection (typeless package -> .mts; strip-
  only TS forbids constructor param properties); ownership (borrowed Prisma client, close()
  must be a no-op).
- COEXIST CANDIDATES found in their code: cache (per-event Prisma query, no cache primitive),
  request-guard (their rate limiter costs a Postgres roundtrip per check).
- zod 3 (theirs) vs zod 4 (ours): fine while contract checks run in substrate's own
  node_modules; schema SHARING across the boundary would collide.

## ADOPT.TS — the settled design (v1 vs v2)
V1 (build now): `adopt.ts <repo>` =
  1. LESSONS-ONLY DEFAULT: write substrate.json (the per-capability boundary manifest: adopted
     blocks=[], appDirs declared), register in ~/.substrate/projects.json (harvest/precedent
     pick it up), append a substrate section to existing AGENTS.md (merge, never overwrite),
     give the repo read access to the federation (insights render on demand). No code enters.
  2. SELECTIVE BLOCK ADOPTION (`--blocks cache,request-guard`): vendor only those blocks +
     kernel, REWRITTEN to host conventions (.ts->.js import extensions or .mts islands per
     detected dialect), namespaced scripts (substrate:test), predicates scoped by manifest.
V2 (after v1 has users): `--wrap persistence --model X` generator per probe-4 mechanics, plus
the partial-conformance vocabulary in contracts/gates.
