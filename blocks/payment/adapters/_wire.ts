// adapters/_wire.ts — shared wire helpers for the payment provider grade.
//
// One place that knows the generic provider's charges/refunds wire shape and the HMAC
// webhook-signature scheme, so the provider adapter adds policy (idempotency forwarding,
// reconciliation) and never re-derives headers, JSON shapes, or signature verification.
// Everything here speaks the PORT types. The provider here is GENERIC on purpose — it stands
// in for Stripe/Adyen/etc.; swapping to a specific one is editing this file, not the port.
//
// Webhook verification is HMAC-SHA256 over the raw body with a shared webhook secret, the
// shape every major provider uses. timingSafeEqual is used so verification is constant-time;
// a bad or absent signature throws — fail-closed (port guarantee 3).

import { createHmac, timingSafeEqual } from 'node:crypto'
import type { Charge, ChargeRequest, Transport, WebhookEvent } from '../port.ts'

export const DEFAULT_BASE_URL = 'https://api.payments.example/v1'

// Key resolution happens AT CALL TIME so a key/secret exported after open() still works, and
// so the error names the env var instead of failing deep inside a fetch. The value itself is
// never logged or echoed (port discipline: never log card/secret material).
export function requireApiKey(explicit?: string): string {
  const key = explicit ?? process.env.PAYMENT_API_KEY
  if (!key) throw new Error('PAYMENT_API_KEY is not set — the payment provider grade reads it at call time (export it; never hardcode a key)')
  return key
}

export function requireWebhookSecret(explicit?: string): string {
  const secret = explicit ?? process.env.PAYMENT_WEBHOOK_SECRET
  if (!secret) throw new Error('PAYMENT_WEBHOOK_SECRET is not set — webhook verification is fail-closed and cannot run without it (export it; never hardcode a secret)')
  return secret
}

// computeWebhookSignature: hex HMAC-SHA256 of the raw body. The same function signs (in tests)
// and is the expected value at verify time — one definition so "what we check" and "what they
// send" can never disagree on the bytes.
export function computeWebhookSignature(secret: string, rawBody: string): string {
  return createHmac('sha256', secret).update(rawBody).digest('hex')
}

// verifyWebhook: fail-closed (port guarantee 3). An absent or non-matching signature THROWS —
// the event is never returned, so it can never be processed. A WebhookEvent only exists when
// the signature checked out, which is why holding one IS the proof it was verified.
export function verifyWebhook(secret: string, rawBody: string, signature: string | undefined): WebhookEvent {
  if (typeof signature !== 'string' || signature.length === 0) throw new Error('webhook rejected: missing signature (fail-closed — an unsigned event is never processed)')
  const expected = computeWebhookSignature(secret, rawBody)
  const got = Buffer.from(signature)
  const want = Buffer.from(expected)
  if (got.length !== want.length || !timingSafeEqual(got, want)) throw new Error('webhook rejected: bad signature (fail-closed — a forged or corrupted event is never processed)')
  const body = JSON.parse(rawBody) as { id?: string; type?: string; chargeId?: string }
  return { id: body.id ?? 'evt_unknown', type: body.type ?? 'unknown', chargeId: body.chargeId, verified: true }
}

// ProviderApiError: a non-2xx answer from the provider, with enough structure to surface a
// clear error. (We do not retry here — that policy belongs to the adapter / a later grade.)
export class ProviderApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(`payment provider: ${status} ${message}`)
    this.status = status
  }
}

// --- Generic provider charges/refunds API ----------------------------------------------
// POST {baseUrl}/charges with a Bearer key and an Idempotency-Key header (the provider's own
// de-dup, layered under our ledger index). Amounts are integer minor units on the wire too.

interface ProviderCharge {
  id: string
  status: string // provider vocabulary — normalized below
  amount: number // integer minor units
  currency: string
  amount_refunded?: number
}

function normalizeStatus(s: string, amount: number, refunded: number): Charge['status'] {
  if (refunded >= amount && amount > 0) return 'refunded'
  if (refunded > 0) return 'partially_refunded'
  if (s === 'succeeded' || s === 'settled' || s === 'paid') return 'settled'
  return s === 'failed' ? 'failed' : 'settled'
}

function toCharge(p: ProviderCharge, req: ChargeRequest, replayed: boolean): Charge {
  const refunded = p.amount_refunded ?? 0
  return {
    id: p.id,
    status: normalizeStatus(p.status, p.amount, refunded),
    amount: p.amount,
    currency: p.currency,
    refundedAmount: refunded,
    idempotencyKey: req.idempotencyKey,
    customerRef: req.customerRef,
    createdAt: new Date().toISOString(),
    replayed,
  }
}

async function readError(status: number, raw: string): Promise<never> {
  let message = raw
  try {
    message = (JSON.parse(raw) as { error?: { message?: string } }).error?.message ?? raw
  } catch {
    // non-JSON error body — keep the raw text
  }
  throw new ProviderApiError(status, message)
}

export async function providerCharge(transport: Transport, baseUrl: string, apiKey: string, req: ChargeRequest): Promise<Charge> {
  const res = await transport(`${baseUrl.replace(/\/+$/, '')}/charges`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
      'idempotency-key': req.idempotencyKey, // the provider's de-dup, under our ledger index
    },
    body: JSON.stringify({ amount: req.amount, currency: req.currency, customer_ref: req.customerRef, description: req.description }),
  })
  const raw = await res.text()
  if (res.status !== 200) await readError(res.status, raw)
  // A 200 with `replayed:true` is the provider telling us the idempotency key replayed.
  const body = JSON.parse(raw) as ProviderCharge & { replayed?: boolean }
  return toCharge(body, req, body.replayed === true)
}

export async function providerRefund(transport: Transport, baseUrl: string, apiKey: string, charge: Charge, amount: number): Promise<Charge> {
  const res = await transport(`${baseUrl.replace(/\/+$/, '')}/charges/${charge.id}/refunds`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ amount }),
  })
  const raw = await res.text()
  if (res.status !== 200) await readError(res.status, raw)
  const body = JSON.parse(raw) as ProviderCharge
  const refunded = body.amount_refunded ?? charge.refundedAmount + amount
  return { ...charge, refundedAmount: refunded, status: normalizeStatus(body.status, body.amount, refunded) }
}
