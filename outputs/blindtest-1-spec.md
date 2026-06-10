# Blind test #1 — spec handed to the builder agent

*Reference repo (NOT shown to builder): /Users/mac/pinback (C99 supervisor, Jun 6 2026).*
*Goal: see whether an agent + substrate nursery can reach the same capability without hand-rolling the plumbing.*

## The request (as given to the builder)

Build a small local web service called **workdesk**: a console for running a CLI agent
across multiple project workspaces from a browser.

Requirements:

1. **Workspaces.** Create, list, and delete workspaces. Each workspace points at an
   absolute project directory. Exactly one workspace is "active" at a time; switching
   activation is an API call.
2. **One agent process per workspace.** The agent is an arbitrary CLI binary (path given
   by config/env). When a workspace is activated, spawn the agent with its working
   directory set to the workspace dir, wired up via stdin/stdout pipes. For testing,
   write a tiny fake agent script that echoes prompts back with a delay.
3. **Event log.** Every event — workspace created, agent started/exited, prompt
   submitted, each chunk of agent output — is appended to a per-workspace persistent
   log that survives server restart.
4. **Live stream with replay.** A browser can subscribe to a workspace's event stream
   (SSE). On connect it first receives the workspace's historical events (replay), then
   live events as they happen.
5. **HTTP API**, roughly:
   - `GET /api/w` — list workspaces
   - `POST /api/w` — create (body: name, dir)
   - `POST /api/w/:id/activate` — switch the active workspace
   - `GET /api/w/:id/events` — SSE stream, replay then live
   - `POST /api/w/:id/input` — submit a prompt to the agent's stdin
   - `POST /api/w/:id/control` — abort (kill agent) or reset (kill + restart)
   - `DELETE /api/w/:id`
   - `GET /api/runtime` — health: uptime, active workspace, agent pid/status
6. **Minimal web UI** served by the same server: workspace list, live event view,
   prompt input box. One page is fine; no framework needed.
7. Malformed API input must be rejected with 400s, and the API should have basic
   rate limiting.

Stretch (only if the core is solid): per-prompt snapshot of the workspace directory so
a turn's file changes can be reverted.

## Builder constraints (the substrate part)

- Start by stamping the project: `node /Users/mac/substrate/blocks/create.ts /Users/mac/blind-build/workdesk workdesk`
- Read `/Users/mac/substrate/blocks/README.md` first; it is the vocabulary.
- Build ONLY against the ports (`substrate/<block>/port.ts`). Never import from
  `adapters/`. If a capability you need exists as a block, you must use the block.
- If you need a capability no block provides, hand-roll it in app code and clearly mark
  it `// HANDROLLED: <why no block fit>` — this is signal, not failure.
- Do not read any directory outside `/Users/mac/blind-build/workdesk` and
  `/Users/mac/substrate/blocks/`. No searching the rest of the disk for prior art.
- Done = `npm test` (or equivalent) green in the new project, including a test that
  drives the full loop: create workspace → activate (fake agent spawns) → submit
  prompt → event appears on SSE with replay → abort works → events survive restart.
