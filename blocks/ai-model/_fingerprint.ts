// _fingerprint.ts — test helper. Runs a fixed app sequence against whatever adapter
// AI_ADAPTER selects and prints a stable fingerprint of the observable result. Used by
// block.test.ts to assert port invariance across adapters. The transport is FAKE —
// deterministic canned Anthropic-shaped responses (plus an OpenAI-shaped one should a
// fallback route ever fire) — so this runs with zero network and zero API keys. The
// apiKey below is a placeholder string for the fake wire, not key material.

import { open } from './index.ts'
import type { Transport } from './index.ts'

const canned = (body: unknown) => ({ status: 200, text: async () => JSON.stringify(body) })

const transport: Transport = async (url) => {
  if (url.includes('api.anthropic.com'))
    return canned({
      content: [{ type: 'text', text: 'pong' }],
      model: 'claude-opus-4-8',
      stop_reason: 'end_turn',
      usage: { input_tokens: 12, output_tokens: 3 },
    })
  return canned({
    choices: [{ message: { content: 'pong' }, finish_reason: 'stop' }],
    model: 'fallback-model',
    usage: { prompt_tokens: 12, completion_tokens: 3 },
  })
}

const client = await open({ transport, apiKey: 'placeholder-not-a-key', retryBaseMs: 1 })
const a = await client.complete({ messages: [{ role: 'user', content: 'ping' }], maxTokens: 32 })
const b = await client.complete({ system: 'be terse', messages: [{ role: 'user', content: 'ping again' }] })
const totals = client.usage()
await client.close()

process.stdout.write(JSON.stringify({ a, b, totals }))
