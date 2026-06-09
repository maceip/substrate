// adapters/memory-fixed.ts — NURSERY grade. Fixed-window counter in process memory. Counts
// requests per key; rejects over the limit. No shield, single-process only.

import type { Guard, GuardOptions } from '../port.ts'
import { defaultKey } from '../port.ts'

export const guard: Guard = {
  name: 'memory-fixed',
  maxGrade: 'nursery',
  capabilities: ['rate-limit'],
  create(opts: GuardOptions) {
    const windows = new Map<string, { count: number; start: number }>()
    const keyOf = opts.key ?? defaultKey
    return (req) => {
      const k = keyOf(req)
      const now = Date.now()
      let w = windows.get(k)
      if (!w || now - w.start >= opts.windowMs) {
        w = { count: 0, start: now }
        windows.set(k, w)
      }
      w.count++
      if (w.count > opts.limit) return { status: 429, body: { error: 'rate limited', retryAfterMs: opts.windowMs - (now - w.start) } }
      return null
    }
  },
}
