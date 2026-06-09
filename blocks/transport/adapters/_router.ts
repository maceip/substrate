// adapters/_router.ts — the shared node:http router used by the nursery and elementary
// adapters. `runMiddleware` is the one behavioral difference: the nursery grade has no
// boundary pipeline (capability absent), so registered middleware is NOT honored — the gate
// is what catches that you've gone public without it.

import { createServer } from 'node:http'
import type { Handler, Listening, Method, Middleware, Req, Res, Router } from '../port.ts'

interface RouteEntry {
  method: string
  segments: string[]
  handler: Handler
}

function match(entry: RouteEntry, method: string, path: string): Record<string, string> | null {
  if (entry.method !== method) return null
  const parts = path.split('/').filter(Boolean)
  if (parts.length !== entry.segments.length) return null
  const params: Record<string, string> = {}
  for (let i = 0; i < parts.length; i++) {
    const seg = entry.segments[i]
    if (seg.startsWith(':')) params[seg.slice(1)] = decodeURIComponent(parts[i])
    else if (seg !== parts[i]) return null
  }
  return params
}

export function makeRouter(runMiddleware: boolean): Router {
  const routes: RouteEntry[] = []
  const middleware: Middleware[] = []

  async function dispatch(method: string, path: string, body: unknown, query: Record<string, string>, headers: Record<string, string | undefined>): Promise<Res> {
    for (const entry of routes) {
      const params = match(entry, method, path)
      if (!params) continue
      const req: Req = { method, path, params, query, body, headers }
      if (runMiddleware) {
        for (const mw of middleware) {
          const short = await mw(req)
          if (short) return short
        }
      }
      return entry.handler(req)
    }
    return { status: 404, body: { error: 'not found', path } }
  }

  const router: Router = {
    route(method: Method, path: string, handler: Handler) {
      routes.push({ method, segments: path.split('/').filter(Boolean), handler })
      return router
    },
    use(mw: Middleware) {
      middleware.push(mw)
      return router
    },
    handle(method, path, init) {
      return dispatch(method, path, init?.body, init?.query ?? {}, init?.headers ?? {})
    },
    listen(port: number): Promise<Listening> {
      const server = createServer((httpReq, httpRes) => {
        const chunks: Buffer[] = []
        httpReq.on('data', (c) => chunks.push(c))
        httpReq.on('end', async () => {
          const url = new URL(httpReq.url ?? '/', 'http://localhost')
          const query: Record<string, string> = {}
          url.searchParams.forEach((v, k) => (query[k] = v))
          const raw = Buffer.concat(chunks).toString('utf8')
          let body: unknown = undefined
          if (raw) {
            try {
              body = JSON.parse(raw)
            } catch {
              body = raw
            }
          }
          const res = await dispatch(httpReq.method ?? 'GET', url.pathname, body, query, httpReq.headers as Record<string, string | undefined>)
          httpRes.writeHead(res.status, { 'content-type': 'application/json' })
          httpRes.end(JSON.stringify(res.body))
        })
      })
      return new Promise<Listening>((resolve) => {
        server.listen(port, () => {
          const addr = server.address()
          const actual = typeof addr === 'object' && addr ? addr.port : port
          resolve({
            port: actual,
            url: `http://localhost:${actual}`,
            close: () => new Promise<void>((res) => server.close(() => res())),
          })
        })
      })
    },
  }
  return router
}
