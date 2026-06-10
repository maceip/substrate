// adapters/anthropic.ts — NURSERY grade
//
// The thinnest thing that satisfies the port: one provider (Anthropic Messages API via
// fetch), an explicit pinned model id, a single attempt. No timeout, no retry, no
// per-process accounting — a 429 or a hung socket is the app's problem, so this tops out
// at `nursery`. Real enough for the first five minutes and for tests with an injected
// transport; the moment completions reach real users, the gate fires.
//
// ANTHROPIC_API_KEY is required at call time (or pass opts.apiKey) — without it,
// complete() throws a clear error before anything touches the network.

import type { Adapter, CompleteRequest, Completion, ModelClient, OpenOptions, ProviderUsage, Transport, Usage } from '../port.ts'
import { PINNED_ANTHROPIC_MODEL, callAnthropic, requireAnthropicKey } from './_wire.ts'

class NurseryClient implements ModelClient {
  private transport: Transport
  private apiKey: string | undefined
  private model: string
  // per-CLIENT totals only — the `usage-accounting` (per-process) guarantee is elementary's
  private totals: Record<string, ProviderUsage> = {}

  constructor(transport: Transport, apiKey: string | undefined, model: string) {
    this.transport = transport
    this.apiKey = apiKey
    this.model = model
  }

  private record(provider: string, u: Usage): void {
    const t = (this.totals[provider] ??= { calls: 0, inputTokens: 0, outputTokens: 0 })
    t.calls++
    t.inputTokens += u.inputTokens
    t.outputTokens += u.outputTokens
  }

  async complete(req: CompleteRequest): Promise<Completion> {
    const out = await callAnthropic(this.transport, requireAnthropicKey(this.apiKey), this.model, req)
    this.record('anthropic', out.usage)
    return out
  }
  usage(): Record<string, ProviderUsage> {
    return structuredClone(this.totals)
  }
  async close(): Promise<void> {}
}

export const adapter: Adapter = {
  name: 'anthropic',
  maxGrade: 'nursery',
  capabilities: ['model-pinned'], // no timeout-retry, no per-process accounting, no fallback
  async open(opts: OpenOptions = {}): Promise<ModelClient> {
    const transport: Transport = opts.transport ?? globalThis.fetch
    const model = opts.model ?? process.env.AI_MODEL ?? PINNED_ANTHROPIC_MODEL
    return new NurseryClient(transport, opts.apiKey, model)
  },
}
