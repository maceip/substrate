# Arriving at the substrate nursery (read before doing anything)

You are probably here because a user said "build me X" and mentioned substrate. Before you
stamp anything, match the entry path to the USER'S ALTITUDE — the single most common failure
observed in real tests is an agent answering a hello-world ask with protocol-level plumbing.

## The altitude rule

1. **The ask is an app the ecosystem can generate in one command** (a SolidJS/React/Next/
   Svelte hello world or starter, a Vite app, an Expo app...): RUN THE ECOSYSTEM GENERATOR
   (`npm create solid@latest`, etc.). Do not stamp. Do not import blocks. Substrate enters
   later, selectively, if and when the app needs real capabilities — that is what the adopt
   path is for. The strata rule applies to scaffolding exactly as it applies to libraries:
   where the ecosystem already does it in one command, use the command.
2. **The ask is a service or product with real capabilities** (data, caching, jobs, gates,
   auth, files): check precedent first (`~/.substrate/projects.json` — extending an existing
   project beats starting bare), then stamp (`node blocks/create.ts <dir> <name>`).
3. **The ask is specific and low-level** ("set this header", "write a raw socket server",
   "hand me the bytes"): do exactly that, at exactly that altitude. Substrate is capability
   infrastructure, not ceremony — the user's explicit altitude always wins.

Tripwire: if you find yourself writing protocol-level code (headers, MIME types, sockets)
for an ask that never mentioned the protocol, you took a wrong turn — re-read this list.
The user should never see plumbing they didn't ask about.

## Baseline expectations for any project that is becoming real

Tests and CI are baseline, not optional extras — every serious project here carries them.
CI is PROVIDER-AGNOSTIC by doctrine: GitHub Actions is one adapter, never the definition
(see the `ci-pipeline` card in blocks/CATALOG.json). Don't wire a forge-specific workflow
into a project's core; keep the runnable truth in `npm test` and let any CI provider call it.

## Everything else

Stamped projects carry their own AGENTS.md with the seven working rules (ports only,
HANDROLLED markers, lessons, precedent, exit reports). blocks/PROTOCOL.md is the DNA.
SESSION.md is the project history. The protocol governs capabilities you adopt — and only
those (per-capability boundary, never per-repo).
