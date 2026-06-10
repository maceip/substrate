// adapters/graduated.ts — GRADUATED grade
//
// Provider-backed behind the SAME port: charges and refunds go to a generic provider over an
// injectable fetch-shaped transport (so tests run with canned responses — zero network, zero
// keys), webhooks are HMAC-verified fail-closed against a shared secret, and a local ledger
// MIRROR is kept so balance() and a reconcile() hook can compare our record against the
// provider's. It declares the two capabilities the elementary->graduated gate activates —
// 'webhook-verified' and 'reconciliation' — plus everything below it.
//
// The REAL graduated step is Stripe/Adyen/etc. (block.json: standsInFor). This adapter holds
// the same port and the same capability names, so the gate evaluator and the app cannot tell
// the difference, and swapping to a specific provider is editing _wire.ts, not the port.
//
// PAYMENT_API_KEY / PAYMENT_WEBHOOK_SECRET resolve at call time; their values are never logged.

import { randomUUID } from 'node:crypto'
import type { Adapter, Balance, Charge, ChargeRequest, LedgerEntry, OpenOptions, PaymentRail, Transport, WebhookEvent } from '../port.ts'
import { assertChargeRequest, assertMinorUnits, balanceFromEntries } from '../port.ts'
import { DEFAULT_BASE_URL, providerCharge, providerRefund, requireApiKey, requireWebhookSecret, verifyWebhook } from './_wire.ts'

// Reconciliation report — the 'reconciliation' capability made observable: charges the
// provider settled but our ledger missed (or vice versa) are listed, never silent.
export interface Reconciliation {
  inSync: boolean
  ledgerOnly: string[] // charge ids in our ledger the provider did not confirm
  providerOnly: string[] // charge ids the provider reports we never recorded
}

class ProviderRail implements PaymentRail {
  private transport: Transport
  private apiKey: string | undefined
  private webhookSecret: string | undefined
  private baseUrl: string
  // local mirror: the idempotency index, the charges, the double-entry ledger. The provider
  // is the record of truth; this mirror is what reconcile() compares against it.
  private byKey = new Map<string, string>()
  private charges = new Map<string, Charge>()
  private entries: LedgerEntry[] = []

  constructor(transport: Transport, opts: OpenOptions) {
    this.transport = transport
    this.apiKey = opts.apiKey
    this.webhookSecret = opts.webhookSecret
    this.baseUrl = opts.baseUrl ?? process.env.PAYMENT_BASE_URL ?? DEFAULT_BASE_URL
  }

  async charge(req: ChargeRequest): Promise<Charge> {
    assertChargeRequest(req)
    // guarantee 1, our side: replay the first charge locally — we never even hit the provider
    // a second time for the same key. (The provider's Idempotency-Key header is the backstop.)
    const existing = this.byKey.get(req.idempotencyKey)
    if (existing) return { ...this.charges.get(existing)!, replayed: true }

    const charge = await providerCharge(this.transport, this.baseUrl, requireApiKey(this.apiKey), req)
    this.charges.set(charge.id, charge)
    this.byKey.set(req.idempotencyKey, charge.id)
    this.entries.push({ id: `le_${randomUUID()}`, chargeId: charge.id, kind: 'charge', amount: charge.amount, currency: charge.currency, at: charge.createdAt })
    return charge
  }

  async refund(chargeId: string, amount?: number): Promise<Charge> {
    const charge = this.charges.get(chargeId)
    if (!charge) throw new Error(`refund: unknown charge ${chargeId}`)
    const remaining = charge.amount - charge.refundedAmount
    const value = amount ?? remaining
    assertMinorUnits(value, 'refund amount')
    if (value > remaining) throw new Error(`refund: ${value} exceeds remaining ${remaining} on ${chargeId}`)

    const updated = await providerRefund(this.transport, this.baseUrl, requireApiKey(this.apiKey), charge, value)
    this.charges.set(chargeId, updated)
    this.entries.push({ id: `le_${randomUUID()}`, chargeId, kind: 'refund', amount: -value, currency: charge.currency, at: new Date().toISOString() })
    return updated
  }

  async getCharge(id: string): Promise<Charge | null> {
    return this.charges.get(id) ?? null
  }

  // Fail-closed (port guarantee 3): a bad or absent signature THROWS via verifyWebhook, so the
  // event is never returned and never processed. Only a verified event becomes a WebhookEvent.
  async handleWebhook(rawBody: string, signature?: string): Promise<WebhookEvent> {
    return verifyWebhook(requireWebhookSecret(this.webhookSecret), rawBody, signature)
  }

  async balance(currency: string): Promise<Balance> {
    return balanceFromEntries(this.entries, currency)
  }
  async ledger(): Promise<LedgerEntry[]> {
    return [...this.entries]
  }

  // reconcile: the hook the 'reconciliation' capability names. Compare our ledger's charge ids
  // against a set the provider reports as settled; surface the mismatches in both directions.
  // (Real providers expose a list endpoint; the caller passes the provider's view so this stays
  // dependency-free and testable with a canned set.)
  async reconcile(providerChargeIds: string[]): Promise<Reconciliation> {
    const provider = new Set(providerChargeIds)
    const ours = new Set(this.charges.keys())
    const ledgerOnly = [...ours].filter((id) => !provider.has(id))
    const providerOnly = [...provider].filter((id) => !ours.has(id))
    return { inSync: ledgerOnly.length === 0 && providerOnly.length === 0, ledgerOnly, providerOnly }
  }

  async close(): Promise<void> {}
}

export const adapter: Adapter = {
  name: 'graduated',
  maxGrade: 'graduated',
  capabilities: ['idempotent-charge', 'integer-minor-units', 'double-entry-ledger', 'webhook-verified', 'reconciliation'],
  async open(opts: OpenOptions = {}): Promise<PaymentRail> {
    const transport: Transport = opts.transport ?? globalThis.fetch
    return new ProviderRail(transport, opts)
  },
}
