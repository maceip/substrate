// port.ts — THE PORT for payment. [PROTECTED]
//
// The single narrow interface app code is allowed to import. Defined by the CHANGE it
// absorbs: swapping the in-house ledger for Stripe/Adyen/etc. must pass through here and
// change NOTHING above it. The catalog ladder this block implements (port-catalog-v0,
// `payment-billing-rail`): single provider checkout/payment adapter -> subscriptions, ledger
// reconciliation, webhooks, tax, multi-currency.
//
// The TEST SEAM is part of the port: open() accepts an injectable fetch-shaped transport
// (global fetch is the default), so the provider grade's tests run with canned responses —
// zero network, zero keys — while production passes nothing and hits the real provider.
//
// PORT GUARANTEES (these are the contract, not adapter niceties — they hold at every grade):
//   1. charge() is IDEMPOTENT on idempotencyKey. The same key replays the FIRST charge and
//      never settles a second time — this is the seam that prevents the classic double-charge
//      bug (a retried request, a double-clicked button, a webhook redelivery).
//   2. Money is INTEGER MINOR UNITS (cents), never a float. amount is a non-negative integer;
//      a fractional amount is rejected at the port before any adapter sees it. No money value
//      is ever produced by float arithmetic, so cents cannot drift across a refund.
//   3. Webhook handling is FAIL-CLOSED. At the grades that require a verified signature, a
//      bad or absent signature is REJECTED (throws) and the event is never processed — there
//      is no path where an unverified event is mistaken for a verified one.
//
// AEvo: this file is PROTECTED. An agent may TIGHTEN it (add a method, narrow a type, add a
// guarantee) but may not LOOSEN it (remove a method, widen a return, drop a guarantee).
// See the PROTECTED file and gates.assertNoLoosening.

export type { Grade } from '../_kernel/grade.ts'
export { gradeAtLeast } from '../_kernel/grade.ts'
import type { Grade } from '../_kernel/grade.ts'

// A charge moves through exactly these states. 'settled' is terminal-success; 'refunded' /
// 'partially_refunded' record money returned; there is no 'maybe'. The port normalizes a
// provider's vocabulary into these — that normalization is the port doing its job.
export type ChargeStatus = 'settled' | 'refunded' | 'partially_refunded' | 'failed'

// ChargeRequest: the task shape app code speaks. amount is INTEGER MINOR UNITS (cents);
// idempotencyKey is the caller's de-dup token — the same key must name the same intended
// charge. customerRef is the app's own customer id, never card/PAN material.
export interface ChargeRequest {
  amount: number // integer minor units (cents). guarantee 2: never a float.
  currency: string // ISO-4217, lowercased ('usd', 'eur')
  idempotencyKey: string // guarantee 1: same key never double-charges
  customerRef: string // the app's customer id — never card/PAN/secret material
  description?: string
}

// Charge: what every adapter, at every grade, returns. amount/refundedAmount are integer
// minor units. `replayed` is true when an idempotent replay returned the first settlement
// instead of creating a new one — observable proof the guarantee held.
export interface Charge {
  id: string
  status: ChargeStatus
  amount: number // integer minor units, as charged
  currency: string
  refundedAmount: number // integer minor units returned so far (0 until a refund)
  idempotencyKey: string
  customerRef: string
  createdAt: string // ISO-8601
  replayed: boolean // true if this is an idempotent replay of an existing charge
}

// WebhookEvent: a VERIFIED provider event. handleWebhook only ever returns one of these, so
// holding a WebhookEvent IS the proof the signature checked out (guarantee 3) — an unverified
// event has no representation that reaches app code.
export interface WebhookEvent {
  id: string
  type: string // e.g. 'charge.settled', 'charge.refunded'
  chargeId?: string
  verified: true // structurally true — there is no unverified WebhookEvent
}

// Money on the read side, integer minor units throughout (guarantee 2).
export interface Balance {
  currency: string
  settled: number // total settled, minus refunds — integer minor units
}

// A double-entry-style ledger line. Every charge and refund is one or more entries; the
// balance is the SUM of entries, never a separately mutated number that can drift from them.
export interface LedgerEntry {
  id: string
  chargeId: string
  kind: 'charge' | 'refund'
  amount: number // signed integer minor units: +on charge, -on refund
  currency: string
  at: string // ISO-8601
}

// PaymentRail: the contract. Every adapter, at every grade, satisfies exactly this.
export interface PaymentRail {
  charge(req: ChargeRequest): Promise<Charge>
  refund(chargeId: string, amount?: number): Promise<Charge> // amount omitted = full remaining
  getCharge(id: string): Promise<Charge | null>
  handleWebhook(rawBody: string, signature?: string): Promise<WebhookEvent> // fail-closed at grades that require it
  balance(currency: string): Promise<Balance>
  ledger(): Promise<LedgerEntry[]>
  close(): Promise<void>
}

// Transport: the injectable seam, shaped like fetch so `globalThis.fetch` IS a Transport; a
// test passes a function returning canned provider responses instead. Used by the provider
// grade only — the in-memory and file grades are the ledger, they have no wire to call.
export interface TransportResponse {
  status: number
  text(): Promise<string>
}
export type Transport = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string },
) => Promise<TransportResponse>

export interface OpenOptions {
  transport?: Transport // default: globalThis.fetch (the real provider). provider grade only.
  apiKey?: string // default: PAYMENT_API_KEY, resolved at call time
  webhookSecret?: string // default: PAYMENT_WEBHOOK_SECRET, for HMAC webhook verification
  baseUrl?: string // default: PAYMENT_BASE_URL — the generic provider's API root
  ledgerFile?: string // file grade only: which ledger file under .data/ (tests isolate with their own)
}

// --- Shared port-level guards (one definition, every adapter; so the guarantees mean the
// same thing at every grade rather than being re-derived per adapter) ----------------------

// Guarantee 2, signing side: a producer handing in a non-integer or negative amount is a
// bug, so charge()/refund() throw before anything is settled. Money is cents, never a float.
export function assertMinorUnits(amount: number, label = 'amount'): void {
  if (typeof amount !== 'number' || !Number.isInteger(amount))
    throw new Error(`invalid ${label}: must be an integer number of minor units (cents), never a float — got ${amount}`)
  if (amount < 0) throw new Error(`invalid ${label}: must be non-negative — got ${amount}`)
}

export function assertChargeRequest(req: ChargeRequest): void {
  assertMinorUnits(req.amount, 'amount')
  if (typeof req.currency !== 'string' || req.currency.length === 0) throw new Error('invalid charge: currency must be a non-empty ISO-4217 code')
  if (typeof req.idempotencyKey !== 'string' || req.idempotencyKey.length === 0) throw new Error('invalid charge: idempotencyKey must be a non-empty string (it is what prevents the double-charge)')
  if (typeof req.customerRef !== 'string' || req.customerRef.length === 0) throw new Error('invalid charge: customerRef must be a non-empty string')
}

// Balance from ledger entries (guarantee 2): the SUM, never a mutated running total. Two
// places computing balance two ways is how a ledger drifts from its entries — so there is
// one way, shared by every adapter.
export function balanceFromEntries(entries: LedgerEntry[], currency: string): Balance {
  let settled = 0
  for (const e of entries) if (e.currency === currency) settled += e.amount
  return { currency, settled }
}

// Adapter: what each adapter file exports. The port is the SHAPE (PaymentRail); the adapter
// is the swappable thing behind it. `maxGrade` is the highest grade whose requirements this
// adapter can satisfy; `capabilities` are the named guarantees the gate evaluator checks.
export interface Adapter {
  name: string
  maxGrade: Grade
  capabilities: string[]
  open(opts?: OpenOptions): Promise<PaymentRail>
}
