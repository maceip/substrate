// adapters/node-http.ts — NURSERY grade. node:http routing, no boundary pipeline.

import type { Server } from '../port.ts'
import { makeRouter } from './_router.ts'

export const server: Server = {
  name: 'node-http',
  maxGrade: 'nursery',
  capabilities: ['routing'],
  create: () => makeRouter(false),
}
