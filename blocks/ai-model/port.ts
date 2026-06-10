// port.ts — THE PORT for ai-model. [PROTECTED]
//
// The single narrow interface app code is allowed to import. Defined by the CHANGE it
// absorbs: swapping Anthropic for another provider, or adding fallback routing, must pass
// through here and change NOTHING above it. The catalog ladder this block implements
// (port-catalog-v0, `ai-model-provider`): one provider adapter with explicit model config
// -> multi-provider routing, fallback policy.
//
// The TEST SEAM is part of the port: open() accepts an injectable fetch-shaped transport
// (global fetch is the default), so invariance tests run with canned responses — zero
// network, zero API keys — while production code uses the real API by passing nothing.
//
// AEvo: this file is PROTECTED. An agent may TIGHTEN it (add a method, narrow a type, add a
// guarantee) but may not LOOSEN it (remove a method, widen a return, drop a guarantee).
// See the PROTECTED file and gates.assertNoLoosening.

export type { Grade } from '../_kernel/grade.ts'
export { gradeAtLeast } from '../_kernel/grade.ts'
import type { Grade } from '../_kernel/grade.ts'

export type Role = 'user' | 'assistant'

export interface ChatMessage {
  role: Role
  content: string
}

// CompleteRequest: the task shape app code speaks. Provider-agnostic on purpose — the
// adapter translates it to whatever wire format the provider wants. `temperature` is
// forwarded only to providers that accept it (current pinned Anthropic models reject
// sampling parameters); it is a hint, never a guarantee.
export interface CompleteRequest {
  system?: string
  messages: ChatMessage[]
  maxTokens?: number // default 1024
  temperature?: number
}

export interface Usage {
  inputTokens: number
  outputTokens: number
}

// Completion: what every adapter, at every grade, returns. `stopReason` is normalized to
// the Anthropic vocabulary ('end_turn' | 'max_tokens' | ...) regardless of which provider
// actually answered — that normalization is the port doing its job.
export interface Completion {
  text: string
  model: string // the model that actually answered (provider-reported)
  usage: Usage
  stopReason: string
}

// Per-provider usage totals, keyed by provider name. Counting happens AT THE PORT so spend
// is observable no matter which adapter (or which provider inside an adapter) served it.
export interface ProviderUsage {
  calls: number
  inputTokens: number
  outputTokens: number
}

// Transport: the injectable seam. Shaped like fetch so `globalThis.fetch` IS a Transport;
// a test passes a function returning canned responses instead.
export interface TransportResponse {
  status: number
  text(): Promise<string>
}
export type Transport = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<TransportResponse>

// FallbackConfig: any OpenAI-compatible chat-completions endpoint (base URL + key + model).
// Used by the graduated adapter; defaults come from AI_FALLBACK_* env vars.
export interface FallbackConfig {
  baseUrl: string
  apiKey?: string
  model: string
}

export interface OpenOptions {
  transport?: Transport // default: globalThis.fetch (the real API)
  apiKey?: string // default: ANTHROPIC_API_KEY, resolved at call time
  model?: string // default: AI_MODEL env, else the pinned model id
  timeoutMs?: number
  maxRetries?: number // retries AFTER the first attempt
  retryBaseMs?: number // backoff base (doubles per retry)
  fallback?: FallbackConfig
}

// ModelClient: the contract. Every adapter, at every grade, satisfies exactly this.
export interface ModelClient {
  complete(req: CompleteRequest): Promise<Completion>
  usage(): Record<string, ProviderUsage>
  close(): Promise<void>
}

// Adapter: what each adapter file exports. The port is the SHAPE (ModelClient); the adapter
// is the swappable thing behind it. `maxGrade` is the highest grade whose requirements this
// adapter can satisfy; `capabilities` are the named guarantees the gate evaluator checks.
export interface Adapter {
  name: string
  maxGrade: Grade
  capabilities: string[]
  open(opts?: OpenOptions): Promise<ModelClient>
}
