# Block Issues — what's wrong, why, and what we'll do instead

Plain-language status of the 19 built blocks after the Jun 12 strata+altitude audit and the
transport incident. The full audit data is in `outputs/strata-audit-jun12.md`; this is the
human summary and the decisions. Nothing here is fixed yet — by deliberate choice, we
documented before churning (see "Why we're not hand-editing all 19" at the bottom).

## The headline: the blocks are in good shape

16 of 19 are clean. The altitude law (no advanced concerns like backpressure in a nursery
adapter) is honored everywhere — every grade-marker word found in a nursery adapter was a
*disclaimer* ("no pool", "no single-flight", "NO bound on a slow consumer"), i.e. the nursery
correctly stating what it deliberately does NOT do. The three real issues are all the same
shape: a commodity problem hand-rolled where a battle-tested library exists.

## What happened with transport (the incident worth remembering)

Three user-test projects (workdesk, solid-hello, weather-display) all hit the same wall: the
transport port's response (`Res`) could only carry JSON, so serving an HTML page or streaming
required a hand-rolled `node:http` shell. That recurring pain sealed an evidence batch, and
the self-improvement loop (CRISPR cycle #1) automatically produced a repair.

The repair was **functionally right but doctrinally wrong, and unsafe**:
- It added two things at once: (a) verbatim body + content-type — simple, correct, nursery-OK;
  and (b) async-iterable STREAMING — which dragged in backpressure, mid-stream errors, and
  disconnect handling.
- The streaming code lived in the SHARED router that backs the nursery and elementary grades.
  So an automated edit pushed a graduated-level concern DOWN into the nursery — the exact
  altitude violation the doctrine forbids. (The committed transport already, correctly, kept
  streaming at the graduated `framework` grade only.)
- An adversarial review then found the streaming code could **crash the whole process**: an
  invalid header value or a mid-stream throw escaped the async socket callback as an unhandled
  rejection; disconnected clients leaked infinite generators.

**Decision: reject the candidate.** Leave transport exactly as committed (JSON-only nursery)
for now. When a project genuinely needs to serve a page, the minimal correct change is
verbatim-body+content-type in the nursery (buffered, no backpressure) and STREAMING as a
graduation gate that points at the framework grade — never streaming in the nursery.

**The lesson (now doctrine in PROTOCOL.md):** automated edits can violate altitude; the trial
gate only proves the tests an edit shipped with, and this edit's tests were happy-path. A
converged CRISPR candidate is not safe until adversarially reviewed. This is why block edits,
during the genesis era, are hand-mined, not loop-promoted unattended.

## The three real issues (commodity hand-rolled under a "dependency-free" banner)

| block | what's wrong | what we'll do instead | size |
|---|---|---|---|
| **cache** | `adapters/lru.ts` hand-rolls a bounded LRU (recency tricks + manual eviction). LRU is the canonical leaf library. | Wrap the `lru-cache` package in the elementary adapter. Port unchanged. | small |
| **i18n** | `_engine.ts`/`graduated.ts` hand-roll message interpolation, English-only pluralization, and Accept-Language negotiation. | Wrap `intl-messageformat`, use the `Intl.PluralRules` builtin, and `@formatjs/intl-localematcher`. Port unchanged; purely internal. | small |
| **ai-model** | (1) Hand-rolls the Anthropic Messages API as raw `fetch` instead of wrapping `@anthropic-ai/sdk`, and the nursery is KEY-REQUIRED instead of a keyless stub. (2) The neutral PORT leaks Anthropic's `stopReason` vocabulary, forcing other providers to translate into it. | Keyless stub nursery + the real SDK wrapped one grade up; a provider-neutral `StopReason` enum at the port with each adapter mapping to it. **Build via the claude-api reference, not from memory.** | medium; touches port + contract |

The recurring tell: all three hid behind a "dependency-free" comment the repo doesn't actually
honor (it wraps zod 21 times). "Dependency-free" in an adapter is the reliable signature of a
commodity leaf problem re-implemented.

## Two optional, non-violating cleanups (elementary grade, defensible as-is)

- **env**: `dotenv-file.ts` hand-rolls a KEY=VAL parser — could wrap `dotenv`.
- **logging**: `structured.ts` hand-rolls JSON + redaction — could wrap `pino`.
Both work fine; wrapping would inherit ecosystem edge-case lessons (the zod pattern). Low priority.

## Clean, and correctly hand-rolled (leave alone)

network-privacy, attestation, agent-gates — their crypto is already `node:crypto` (delegated,
not hand-rolled), and their domain logic (mixnet routing, fail-closed attestation, executable
gates) has no library equivalent. The strata rule says hand-roll where nothing fits; these fit
nothing. persistence, schema-migrations, files, async-jobs, transport, env, logging,
input-validation, request-guard, edge-model, realtime, remote-exec, payment are clean on all
three tests (input-validation is the model: zod wrapped, set as default, honest fallbacks).

## Why we're not hand-editing all 19 right now

The audit says 16/19 are clean, so rewriting all 19 is churn for little gain — and we have
unlanded moving pieces (the brownfield/adopt path, the selection/wiring layer) that matter more
to the product than polishing working blocks. Plan: fix the 3 real issues deliberately, one at
a time, by hand (genesis license), when they block real work — not as a speculative sweep. The
optional two and the convention normalizations wait until a block is touched for another reason.
