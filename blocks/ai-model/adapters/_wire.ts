// adapters/_wire.ts — shared wire-format helpers for the ai-model adapters.
//
// One place that knows the Anthropic Messages API and the OpenAI-compatible
// chat-completions shape, so the three grades don't each re-derive headers, JSON shapes,
// and error parsing. Everything here speaks the PORT types (CompleteRequest in,
// Completion out) — adapters add policy (retry, timeout, fallback), never wire format.
//
// Anthropic specifics (endpoint, anthropic-version header, request/response shape, model
// id) follow the current API reference. The model id is PINNED — an explicit id, never a
// floating "latest" alias — and overridable per call site via AI_MODEL / opts.model.

import type { CompleteRequest, Completion, Transport } from '../port.ts'

export const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
export const ANTHROPIC_VERSION = '2023-06-01'
export const PINNED_ANTHROPIC_MODEL = 'claude-opus-4-8'

export const DEFAULT_MAX_TOKENS = 1024
export const DEFAULT_TIMEOUT_MS = 30_000
export const DEFAULT_MAX_RETRIES = 2
export const DEFAULT_RETRY_BASE_MS = 250

// ProviderApiError: a non-2xx answer, with enough structure to decide what to do next.
// 429 (rate_limit_error), 529 (overloaded_error) and 5xx are transient — retry/fallback.
// 400 (invalid_request_error) is the caller's bug — retrying cannot help.
export class ProviderApiError extends Error {
  provider: string
  status: number
  errorType: string
  constructor(provider: string, status: number, errorType: string, message: string) {
    super(`${provider}: ${status} ${errorType}: ${message}`)
    this.provider = provider
    this.status = status
    this.errorType = errorType
  }
}

export function retryable(status: number): boolean {
  return status === 429 || status >= 500 // includes 529 overloaded_error
}

// Key resolution happens AT CALL TIME so a key exported after the client was opened still
// works, and so the error names the env var instead of failing deep inside a fetch. The
// key value itself is never logged or echoed.
export function requireAnthropicKey(explicit?: string): string {
  const key = explicit ?? process.env.ANTHROPIC_API_KEY
  if (!key) throw new Error('ANTHROPIC_API_KEY is not set — the ai-model block reads it at call time to reach the Anthropic API (export it; never hardcode a key)')
  return key
}

export function requireFallbackKey(explicit?: string): string {
  const key = explicit ?? process.env.AI_FALLBACK_API_KEY
  if (!key) throw new Error('AI_FALLBACK_API_KEY is not set — the fallback provider needs its own key (export it; never hardcode a key)')
  return key
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

// Bound a call without leaving a live timer behind: the race timer is ALWAYS cleared, so
// nothing here can hold the process open after the call settles.
export async function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined
  const gate = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
  })
  try {
    return await Promise.race([p, gate])
  } finally {
    clearTimeout(timer)
  }
}

async function readError(provider: string, status: number, raw: string): Promise<never> {
  let errorType = 'api_error'
  let message = raw
  try {
    const parsed = JSON.parse(raw) as { error?: { type?: string; message?: string } }
    errorType = parsed.error?.type ?? errorType
    message = parsed.error?.message ?? message
  } catch {
    // non-JSON error body — keep the raw text as the message
  }
  throw new ProviderApiError(provider, status, errorType, message)
}

// --- Anthropic Messages API ------------------------------------------------------------
// POST /v1/messages with x-api-key + anthropic-version headers. `temperature` is NOT
// forwarded: the pinned current-generation models reject sampling parameters with a 400.

interface AnthropicResponse {
  content: { type: string; text?: string }[]
  model: string
  stop_reason: string
  usage: { input_tokens: number; output_tokens: number }
}

export async function callAnthropic(transport: Transport, apiKey: string, model: string, req: CompleteRequest): Promise<Completion> {
  const res = await transport(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model,
      max_tokens: req.maxTokens ?? DEFAULT_MAX_TOKENS,
      ...(req.system !== undefined ? { system: req.system } : {}),
      messages: req.messages,
    }),
  })
  const raw = await res.text()
  if (res.status !== 200) await readError('anthropic', res.status, raw)
  const body = JSON.parse(raw) as AnthropicResponse
  return {
    text: body.content.filter((b) => b.type === 'text').map((b) => b.text ?? '').join(''),
    model: body.model,
    usage: { inputTokens: body.usage.input_tokens, outputTokens: body.usage.output_tokens },
    stopReason: body.stop_reason,
  }
}

// --- OpenAI-compatible chat completions -------------------------------------------------
// POST {baseUrl}/chat/completions with a Bearer key. The system prompt becomes a leading
// system message; finish_reason is normalized back to the port's Anthropic vocabulary.

interface OpenAiResponse {
  choices: { message: { content: string }; finish_reason: string }[]
  model: string
  usage?: { prompt_tokens: number; completion_tokens: number }
}

export async function callOpenAiCompat(transport: Transport, baseUrl: string, apiKey: string, model: string, req: CompleteRequest): Promise<Completion> {
  const res = await transport(`${baseUrl.replace(/\/+$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: req.maxTokens ?? DEFAULT_MAX_TOKENS,
      messages: [...(req.system !== undefined ? [{ role: 'system', content: req.system }] : []), ...req.messages],
      ...(req.temperature !== undefined ? { temperature: req.temperature } : {}),
    }),
  })
  const raw = await res.text()
  if (res.status !== 200) await readError('openai-compatible', res.status, raw)
  const body = JSON.parse(raw) as OpenAiResponse
  const finish = body.choices[0]?.finish_reason
  return {
    text: body.choices[0]?.message.content ?? '',
    model: body.model,
    usage: { inputTokens: body.usage?.prompt_tokens ?? 0, outputTokens: body.usage?.completion_tokens ?? 0 },
    stopReason: finish === 'stop' ? 'end_turn' : finish === 'length' ? 'max_tokens' : finish ?? 'end_turn',
  }
}
