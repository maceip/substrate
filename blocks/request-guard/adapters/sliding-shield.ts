// adapters/sliding-shield.ts — ELEMENTARY grade (the default). Sliding-window rate limit
// (smoother than fixed windows at the boundary) plus a shield that rejects oversized bodies by
// content-length. Earns the `rate-limit` + `sliding-window` + `shield` capabilities the public
// gate requires. Still per-process — counters do not span instances.

import type { Guard, GuardOptions } from '../port.ts'
import { defaultKey } from '../port.ts'

const DEFAULT_MAX_BYTES = 1_000_000

export const guard: Guard = {
  name: 'sliding-shield',
  maxGrade: 'elementary',
  capabilities: ['rate-limit', 'sliding-window', 'shield'],
  create(opts: GuardOptions) {
    const hits = new Map<string, number[]>() // key -> timestamps within the window
    const keyOf = opts.key ?? defaultKey
    const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES
    return (req) => {
      // shield first: reject obviously-bad requests before counting them.
      const len = Number(req.headers['content-length'] ?? 0)
      if (len > maxBytes) return { status: 413, body: { error: 'payload too large', maxBytes } }

      const k = keyOf(req)
      const now = Date.now()
      const cutoff = now - opts.windowMs
      const recent = (hits.get(k) ?? []).filter((t) => t > cutoff)
      recent.push(now)
      hits.set(k, recent)
      if (recent.length > opts.limit) return { status: 429, body: { error: 'rate limited', retryAfterMs: opts.windowMs } }
      return null
    }
  },
}
