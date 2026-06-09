// port.ts — THE PORT for request-guard. [PROTECTED]
//
// App code builds a guard middleware through ./index.ts and plugs it into the transport
// boundary. The seam this absorbs: HOW abuse is counted and blocked (per-process memory ->
// sliding window + shield -> distributed limiter + bot detection) changes behind the port; the
// middleware it returns is the same (req -> 429/413 Res, or null to continue).

export type { Grade } from '../_kernel/grade.ts'
import type { Grade } from '../_kernel/grade.ts'

export interface GuardReq {
  headers: Record<string, string | undefined>
  path?: string
}

export interface GuardOptions {
  limit: number // requests allowed per window per key
  windowMs: number
  maxBytes?: number // shield: reject bodies larger than this (by content-length)
  key?: (req: GuardReq) => string
}

export type GuardMiddleware = (req: GuardReq) => { status: number; body: unknown } | null

export interface Guard {
  name: string
  maxGrade: Grade
  capabilities: string[]
  create(opts: GuardOptions): GuardMiddleware
}

export function defaultKey(req: GuardReq): string {
  return req.headers['x-client'] ?? req.headers['x-forwarded-for'] ?? 'global'
}
