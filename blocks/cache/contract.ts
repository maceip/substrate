// contract.ts — PROTOCOL S7: cache's port promises as DATA.
//
// PRIMARY OUTPUT: the cached value get()/getOrFill() hand back. It is the APP's own T — the
// port is generic by design, so there is no value shape to promise beyond "a value". The
// port's real guarantees (an entry past its ttlMs is never returned; getOrFill coalesces
// concurrent misses) are TEMPORAL/behavioral and not expressible as predicates over a single
// output value — so this contract is schema-only with empty assertion/forbidden arrays.

import { z } from 'zod'
import type { PortContract } from '../_kernel/contract.ts'

export const CONTRACT: PortContract = {
  block: 'cache',
  output: z.unknown(),
  assertions: [],
  forbidden: [],
}

// A known-good output (an app-shaped cached value) that CONTRACT must accept.
export const SAMPLE: unknown = { user: 'ada', plan: 'pro' }
