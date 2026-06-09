// port.ts — THE PORT for the transport/http block. [PROTECTED]
//
// App code registers routes against a Router from ./index.ts and never names node:http or a
// framework. The seam this absorbs: the HTTP engine (node:http -> framework) and the
// middleware pipeline change behind the port; route handlers do not. `handle` dispatches
// in-process (so handlers compose and test without a socket); `listen` binds a real port.

export type { Grade } from '../_kernel/grade.ts'
import type { Grade } from '../_kernel/grade.ts'

export type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

export interface Req {
  method: string
  path: string
  params: Record<string, string>
  query: Record<string, string>
  body: unknown
  headers: Record<string, string | undefined>
}

export interface Res {
  status: number
  body: unknown
}

export type Handler = (req: Req) => Res | Promise<Res>
// Middleware runs at the boundary; return a Res to short-circuit, or null to continue.
export type Middleware = (req: Req) => Res | null | Promise<Res | null>

export interface Listening {
  port: number
  url: string
  close(): Promise<void>
}

export interface Router {
  route(method: Method, path: string, handler: Handler): Router
  use(mw: Middleware): Router
  handle(method: string, path: string, init?: { body?: unknown; query?: Record<string, string>; headers?: Record<string, string> }): Promise<Res>
  listen(port: number): Promise<Listening>
}

export interface Server {
  name: string
  maxGrade: Grade
  capabilities: string[]
  create(): Router
}
