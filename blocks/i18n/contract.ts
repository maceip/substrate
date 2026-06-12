// contract.ts — PROTOCOL S7: i18n's port promises as DATA.
//
// PRIMARY OUTPUT: the string t() returns — the one value that crosses to every render site.
// It is a plain string, but the port makes one hard promise about it (guarantee 1): t()
// NEVER returns "" — it falls back requested locale -> default locale -> the key itself, so
// a user sees at worst the key, never a blank. (Missing-var reporting flows through the
// onMissing seam, not through this value.)

import { z } from 'zod'
import type { PortContract } from '../_kernel/contract.ts'

export const CONTRACT: PortContract = {
  block: 'i18n',
  output: z.string(),
  assertions: [
    {
      id: 'never-blank',
      describe: 't() always returns a non-empty string — the stated fallback chain (locale -> default -> the key itself) guarantees it',
      holds: (v) => typeof v === 'string' && v.length > 0,
    },
  ],
  forbidden: [],
}

// A known-good output (an interpolated greeting) that CONTRACT must accept.
export const SAMPLE: unknown = 'Hello, Ada!'
