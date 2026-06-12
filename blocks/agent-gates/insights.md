# agent-gates — insights (FoT)

Distilled, cross-project lessons. **Merged, not appended. Capped.** Each entry is the
abstracted lesson only — not raw data, not code. A lesson here was learned in one project
and is meant to save the next one from relearning it. The test of FoT: a lesson crossed a
repo boundary without being hand-copied.

> Seeded from the substrate design work; entries below are starting hypotheses, replaced as
> real projects deposit real lessons.

- **Enforcement lives in code, not prose.** A contract written in a README is a suggestion an
  agent can read past; a contract written as an executable `check()` is one it must pass. The
  moment a self-check matters, move it from a comment into a gate — the predicate runs, the
  prose does not. Everything load-bearing in this block is a function, never a paragraph.
- **Tightening is automatic; loosening needs a human.** Adding a gate, raising a `warn` to a
  `block`, narrowing what passes — all of these go green with no approval, because they only
  ever make the bar higher. REMOVING a gate or downgrading it is refused until a human commits
  the looser baseline: the approval IS the commit. Wire the baseline once and the asymmetry is
  free; never gate loosening behind a flag a tired agent will flip.
- **Fail-closed beats fail-quiet, and attribution beats blame.** A gate that throws must read as
  a BLOCKING failure, never a silent pass — an exception is the least safe moment to assume the
  work is fine. And once it fails, say WHERE: local (the artifact's own bytes), upstream (a claim
  it could not back), or structural (the gate itself broke). A bare red light makes a human
  re-drive the agent; an attributed one points them straight at the fix.

<!-- fot:federated:begin -->
## Federated lessons (auto-synced from the FoT store — do not edit by hand)

- A mining/working agent's product must write through to durable storage before its session ends, fail-closed — transcript-only output was nearly lost twice (hole-fill and enterprise waves, Jun 2026). Gate the session on artifacts-on-disk, not on a final chat message. *(substrate-nursery, 2026-06-12)*
- contract 'claims-have-evidence' is load-bearing: it blocked a ship (unsupported claims: signature-verified). keep it — tighten, never loosen. *(agent-ops, 2026-06-10)*
- contract 'no-todo' is load-bearing: it blocked a ship (hook.ts still contains TODO/FIXME). keep it — tighten, never loosen. *(agent-ops, 2026-06-10)*
<!-- fot:federated:end -->
