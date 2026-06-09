// adapters/framework.ts — GRADUATED grade.
//
// A hardened framework (fastify) behind the SAME port: streaming/backpressure-safe responses
// and HTTP/2 on top of the middleware + graceful-shutdown the elementary grade already has.
// Needs the `fastify` package, so it does not run in the bare nursery — the gate tells you
// when multi-instance scale has earned it.
//
// To activate:  npm i fastify   and set  TRANSPORT_SERVER=framework
//
// Sketch only (kept honest — not a fake passing impl). Wire a Fastify instance to the Router
// surface here. Declares the capabilities the graduated gate checks for.

import type { Server } from '../port.ts'

export const server: Server = {
  name: 'framework',
  maxGrade: 'graduated',
  capabilities: ['routing', 'middleware', 'graceful-shutdown', 'streaming', 'http2'],
  create() {
    throw new Error('framework adapter not wired: npm i fastify and implement create() against the Router port')
  },
}
