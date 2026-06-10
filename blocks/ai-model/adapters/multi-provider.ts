// adapters/multi-provider.ts — GRADUATED grade
//
// Multi-provider routing with ordered fallback: Anthropic first; the second provider is
// any OpenAI-compatible chat-completions endpoint, configured via env (AI_FALLBACK_BASE_URL
// + AI_FALLBACK_API_KEY + AI_FALLBACK_MODEL) or opts.fallback. Each provider gets the
// elementary guarantees (timeout, bounded backoff retry); when a provider exhausts its
// retries on a transient failure, the NEXT one in the order is tried. An invalid request
// (400) never falls through — every provider would reject the same broken request.
// Usage is attributed PER PROVIDER, per process, so the bill splits where the routing did.

import type { Adapter, CompleteRequest, Completion, ModelClient, OpenOptions, ProviderUsage, Transport, Usage } from '../port.ts'
import {
  DEFAULT_MAX_RETRIES,
  DEFAULT_RETRY_BASE_MS,
  DEFAULT_TIMEOUT_MS,
  PINNED_ANTHROPIC_MODEL,
  ProviderApiError,
  callAnthropic,
  callOpenAiCompat,
  requireAnthropicKey,
  requireFallbackKey,
  retryable,
  sleep,
  withTimeout,
} from './_wire.ts'

// Per-process, per-provider ledger — the `per-provider-usage` capability the second gate
// activates. Same shape as elementary's, attributed by who actually answered.
const processTotals: Record<string, ProviderUsage> = {}

function record(provider: string, u: Usage): void {
  const t = (processTotals[provider] ??= { calls: 0, inputTokens: 0, outputTokens: 0 })
  t.calls++
  t.inputTokens += u.inputTokens
  t.outputTokens += u.outputTokens
}

interface Provider {
  name: string
  call: (req: CompleteRequest) => Promise<Completion>
}

class MultiProviderClient implements ModelClient {
  private providers: Provider[]
  private timeoutMs: number
  private maxRetries: number
  private retryBaseMs: number

  constructor(providers: Provider[], opts: OpenOptions) {
    this.providers = providers
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS
    this.maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES
    this.retryBaseMs = opts.retryBaseMs ?? DEFAULT_RETRY_BASE_MS
  }

  // The elementary retry loop, applied per provider.
  private async attempt(p: Provider, req: CompleteRequest): Promise<Completion> {
    let lastErr: unknown
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      if (attempt > 0) await sleep(this.retryBaseMs * 2 ** (attempt - 1))
      try {
        return await withTimeout(p.call(req), this.timeoutMs, `${p.name} complete`)
      } catch (e) {
        if (e instanceof ProviderApiError && !retryable(e.status)) throw e
        lastErr = e
      }
    }
    throw lastErr
  }

  async complete(req: CompleteRequest): Promise<Completion> {
    let lastErr: unknown = new Error('ai-model: no providers configured')
    for (const p of this.providers) {
      try {
        const out = await this.attempt(p, req)
        record(p.name, out.usage)
        return out
      } catch (e) {
        // invalid request: the CALLER's bug — no provider will accept it; stop here.
        if (e instanceof ProviderApiError && e.status === 400) throw e
        lastErr = e // overloaded / rate-limited / auth / network: the next provider may hold
      }
    }
    throw lastErr
  }
  usage(): Record<string, ProviderUsage> {
    return structuredClone(processTotals)
  }
  async close(): Promise<void> {}
}

function envFallback(): { baseUrl: string; apiKey?: string; model: string } | null {
  const baseUrl = process.env.AI_FALLBACK_BASE_URL
  const model = process.env.AI_FALLBACK_MODEL
  if (!baseUrl || !model) return null
  return { baseUrl, apiKey: process.env.AI_FALLBACK_API_KEY, model }
}

export const adapter: Adapter = {
  name: 'multi-provider',
  maxGrade: 'graduated',
  capabilities: ['model-pinned', 'timeout-retry', 'usage-accounting', 'fallback-policy', 'per-provider-usage'],
  async open(opts: OpenOptions = {}): Promise<ModelClient> {
    const transport: Transport = opts.transport ?? globalThis.fetch
    const model = opts.model ?? process.env.AI_MODEL ?? PINNED_ANTHROPIC_MODEL
    const providers: Provider[] = [
      // keys resolve at call time so a missing one names the env var, never logs a value
      { name: 'anthropic', call: (req) => callAnthropic(transport, requireAnthropicKey(opts.apiKey), model, req) },
    ]
    const fb = opts.fallback ?? envFallback()
    if (fb) providers.push({ name: 'openai-compatible', call: (req) => callOpenAiCompat(transport, fb.baseUrl, requireFallbackKey(fb.apiKey), fb.model, req) })
    return new MultiProviderClient(providers, opts)
  },
}
