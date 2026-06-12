# Strata + Altitude Audit — all 19 built blocks (Jun 12 2026)

Four independent reviewers read every port.ts/index.ts/gates.ts/block.json/adapters/* against
PROTOCOL.md's three tests: altitude law (no grade-marker words in nursery adapters), strata
(leaf=wrap, structural=stay-neutral, domain=justified hand-roll), port neutrality.

## RESULT: 16/19 CLEAN, 3 real findings, 2 optional.

### Altitude law: PERFECT across all 19.
Every grade-marker word found in a nursery adapter was a NEGATIVE disclaimer ("no pool",
"no mvcc", "no single-flight", "NO bound on a slow consumer") — the law honored, not violated.
All graduated concerns (backpressure, pooling, quorum, mix-queue, keyring rotation) live only
at graduated grades, correctly gated. The transport CRISPR candidate is the ONLY altitude
violation in the whole system — it pushed async-iterable STREAMING down into the shared
nursery/elementary router; the committed block had streaming correctly confined to the
graduated (fastify) grade.

### Three real strata findings (commodity hand-rolled where a leaf library exists):
1. **cache** — `adapters/lru.ts:20-56` hand-rolls a bounded LRU (PROTOCOL names LRU as a
   canonical leaf). FIX: wrap `lru-cache` in the elementary adapter. Contained, port unchanged.
2. **i18n** — `_engine.ts` + `graduated.ts` hand-roll message interpolation/plural (→
   `intl-messageformat`), English-only plural categorization (→ `Intl.PluralRules`, a node
   builtin), and Accept-Language negotiation (→ `@formatjs/intl-localematcher`). Port neutral,
   fix is purely internal.
3. **ai-model** — TWO axes, the heaviest finding:
   - SHOULD-WRAP-LEAF: hand-rolls the Anthropic Messages API as raw fetch (`_wire.ts:97-121`)
     instead of wrapping `@anthropic-ai/sdk`; nursery is KEY-REQUIRED rather than a keyless
     stub like every other block. FIX: keyless stub nursery + real SDK wrapped one grade up.
   - PORT-LEAKY: the neutral port bakes in Anthropic's stopReason vocabulary (`port.ts:46-52`,
     `contract.ts:27`), forcing the OpenAI-compat adapter to translate INTO it. FIX: a
     provider-neutral StopReason enum at the port; each adapter maps to it.
   - NOTE: build this via the claude-api reference (SDK usage + model pinning), never memory.

### Two optional (non-violation) leaf-wraps, both at ELEMENTARY not nursery:
- env: `dotenv-file.ts` hand-rolls a KEY=VAL parser (could wrap `dotenv`).
- logging: `structured.ts` hand-rolls JSON+redaction (could wrap `pino`).
Defensible as-is; wrapping would inherit ecosystem edge-case lessons (the zod pattern).

### Clean, explicitly justified domain hand-rolling (leave alone):
network-privacy (mixnet routing/onion/cover-traffic; crypto IS node:crypto), attestation
(fail-closed verify, keyring rotation, aggregation; crypto IS node:crypto), agent-gates
(executable gates, tighten-only baseline, attribution — bespoke substrate doctrine).

## THE RECURRING TELL
All three violations hid under a "dependency-free" banner the repo does not actually honor
(it wraps zod 21 times). "Dependency-free" in an adapter comment is the reliable signature of
a commodity leaf problem re-implemented — the same root cause as the original zod pivot.
