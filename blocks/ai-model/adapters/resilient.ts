// adapters/resilient.ts — ELEMENTARY grade (the default)
//
// Same single provider (Anthropic Messages API), now with the guarantees the first gate
// activates: every call is bounded by a timeout, transient failures (429 rate-limit,
// 529 overloaded, 5xx, network errors) get a bounded backoff retry, and input/output
// tokens are accumulated PER PROCESS so spend is observable before the invoice. An
// invalid request (400) is never retried — the request is wrong, not the weather.
// Still one provider, so it tops out at `elementary`.

import type { Adapter, CompleteRequest, Completion, ModelClient, OpenOptions, ProviderUsage, Transport, Usage } from '../port.ts'
import {
  DEFAULT_MAX_RETRIES,
  DEFAULT_RETRY_BASE_MS,
  DEFAULT_TIMEOUT_MS,
  PINNED_ANTHROPIC_MODEL,
  ProviderApiError,
  callAnthropic,
  requireAnthropicKey,
  retryable,
  sleep,
  withTimeout,
} from './_wire.ts'

// usage accounting is a PER-PROCESS ledger on purpose: every client opened in this process
// feeds one accumulator, so the count survives short-lived clients (the `usage-accounting`
// capability the gate checks for).
const processTotals: Record<string, ProviderUsage> = {}

function record(provider: string, u: Usage): void {
  const t = (processTotals[provider] ??= { calls: 0, inputTokens: 0, outputTokens: 0 })
  t.calls++
  t.inputTokens += u.inputTokens
  t.outputTokens += u.outputTokens
}

class ResilientClient implements ModelClient {
  private transport: Transport
  private apiKey: string | undefined
  private model: string
  private timeoutMs: number
  private maxRetries: number
  private retryBaseMs: number

  constructor(opts: OpenOptions) {
    this.transport = opts.transport ?? globalThis.fetch
    this.apiKey = opts.apiKey
    this.model = opts.model ?? process.env.AI_MODEL ?? PINNED_ANTHROPIC_MODEL
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
    this.maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES
    this.retryBaseMs = opts.retryBaseMs ?? DEFAULT_RETRY_BASE_MS
  }

  async complete(req: CompleteRequest): Promise<Completion> {
    let lastErr: unknown
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) await sleep(this.retryBaseMs * 2 ** (attempt - 1)) // backoff doubles per retry
      try {
        const out = await withTimeout(callAnthropic(this.transport, requireAnthropicKey(this.apiKey), this.model, req), this.timeoutMs, 'anthropic complete')
        record('anthropic', out.usage)
        return out
      } catch (e) {
        // retry overloaded/rate-limited/5xx/network/timeout; an invalid request can only
        // fail the same way again — surface it immediately.
        if (e instanceof ProviderApiError && !retryable(e.status)) throw e
        lastErr = e
      }
    }
    throw lastErr
  }
  usage(): Record<string, ProviderUsage> {
    return structuredClone(processTotals)
  }
  async close(): Promise<void> {}
}

export const adapter: Adapter = {
  name: 'resilient',
  maxGrade: 'elementary',
  capabilities: ['model-pinned', 'timeout-retry', 'usage-accounting'],
  async open(opts: OpenOptions = {}): Promise<ModelClient> {
    return new ResilientClient(opts)
  },
}
