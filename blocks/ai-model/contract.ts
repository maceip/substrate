// contract.ts — PROTOCOL S7: ai-model's port promises as DATA.
//
// PRIMARY OUTPUT: the Completion every adapter, at every grade, returns from complete().
// The port's value-shaped promises: the answering model is named (provider-reported), usage
// is counted in non-negative integer tokens, and stopReason is normalized to the Anthropic
// vocabulary ('end_turn' | 'max_tokens' | ...) regardless of which provider answered.

import { z } from 'zod'
import type { PortContract } from '../_kernel/contract.ts'

const completionShape = z.object({
  text: z.string(),
  model: z.string().min(1),
  usage: z.object({
    inputTokens: z.number().int().min(0),
    outputTokens: z.number().int().min(0),
  }),
  stopReason: z.string(),
})

export const CONTRACT: PortContract = {
  block: 'ai-model',
  output: completionShape,
  assertions: [
    {
      id: 'stop-reason-normalized',
      describe: "stopReason is a non-empty lowercase snake_case token from the Anthropic vocabulary ('end_turn', 'max_tokens', ...) no matter which provider answered",
      holds: (v) => /^[a-z][a-z_]*$/.test((v as { stopReason: string }).stopReason),
    },
  ],
  forbidden: [],
}

// A known-good output (a short completion with counted usage) that CONTRACT must accept.
export const SAMPLE: unknown = {
  text: 'Hello! How can I help today?',
  model: 'claude-sonnet-4-20250514',
  usage: { inputTokens: 12, outputTokens: 9 },
  stopReason: 'end_turn',
}
