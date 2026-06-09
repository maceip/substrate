// adapters/node-http-mw.ts — ELEMENTARY grade (the default). Same node:http engine, but the
// boundary middleware pipeline is honored — that earns the `middleware` capability the
// public/prod gate requires (where input-validation + request-guard hooks live). The clean
// server.close() drain earns `graceful-shutdown`.

import type { Server } from '../port.ts'
import { makeRouter } from './_router.ts'

export const server: Server = {
  name: 'node-http-mw',
  maxGrade: 'elementary',
  capabilities: ['routing', 'middleware', 'graceful-shutdown'],
  create: () => makeRouter(true),
}
