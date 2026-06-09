// index.ts — THE ONLY FILE APP CODE IMPORTS for transport.
//   TRANSPORT_SERVER = node-http | node-http-mw | framework   (default: node-http-mw)

import type { Grade } from '../_kernel/grade.ts'
import type { Router, Server } from './port.ts'
import { evaluate } from './gates.ts'
import type { Evaluation, TransportSignals } from './gates.ts'

export type { Router, Req, Res, Handler, Middleware, Method } from './port.ts'
export type { Evaluation, TransportSignals } from './gates.ts'

const SERVERS: Record<string, () => Promise<{ server: Server }>> = {
  'node-http': () => import('./adapters/node-http.ts'),
  'node-http-mw': () => import('./adapters/node-http-mw.ts'),
  framework: () => import('./adapters/framework.ts'),
}

let loaded: Server | null = null
async function current(): Promise<Server> {
  if (loaded) return loaded
  const name = process.env.TRANSPORT_SERVER ?? 'node-http-mw'
  const mod = SERVERS[name]
  if (!mod) throw new Error(`unknown TRANSPORT_SERVER=${name} (expected: ${Object.keys(SERVERS).join(', ')})`)
  loaded = (await mod()).server
  return loaded
}

export async function createRouter(): Promise<Router> {
  return (await current()).create()
}

export async function checkGrade(signals: TransportSignals): Promise<Evaluation> {
  const s = await current()
  return evaluate({ signals, capabilities: new Set(s.capabilities), adapterGrade: s.maxGrade })
}

export async function currentGrade(): Promise<Grade> {
  return (await current()).maxGrade
}
