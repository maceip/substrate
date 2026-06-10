// adapters/memory.ts — NURSERY grade
//
// The thinnest thing that satisfies the port: an in-process ledger. Charges settle instantly,
// every charge and refund is an entry in a Map, and an idempotencyKey -> chargeId map makes
// charge() idempotent. It already keeps the PORT guarantees that are guarantees, not graduated
// luxuries — idempotent charge, integer minor units, balance from the SUM of entries — but it
// loses everything on restart, so it tops out at `nursery`. webhook handling here is a no-op
// parse: there is no provider and no secret, so it does NOT claim 'webhook-verified' (the gate
// that requires it forces a heavier grade). Real enough for the first five minutes and tests.

import { randomUUID } from 'node:crypto'
import type { Adapter, Balance, Charge, ChargeRequest, LedgerEntry, PaymentRail, WebhookEvent } from '../port.ts'
import { assertChargeRequest, assertMinorUnits, balanceFromEntries } from '../port.ts'

class MemoryRail implements PaymentRail {
  // idempotencyKey -> chargeId: the de-dup index. guarantee 1 lives here.
  private byKey = new Map<string, string>()
  private charges = new Map<string, Charge>()
  private entries: LedgerEntry[] = []

  async charge(req: ChargeRequest): Promise<Charge> {
    assertChargeRequest(req)
    // guarantee 1: the same key replays the first charge — it never settles a second time.
    const existing = this.byKey.get(req.idempotencyKey)
    if (existing) return { ...this.charges.get(existing)!, replayed: true }

    const id = `ch_${randomUUID()}`
    const charge: Charge = {
      id,
      status: 'settled', // nursery settles instantly — no async authorization step
      amount: req.amount,
      currency: req.currency,
      refundedAmount: 0,
      idempotencyKey: req.idempotencyKey,
      customerRef: req.customerRef,
      createdAt: new Date().toISOString(),
      replayed: false,
    }
    this.charges.set(id, charge)
    this.byKey.set(req.idempotencyKey, id)
    this.entries.push({ id: `le_${randomUUID()}`, chargeId: id, kind: 'charge', amount: req.amount, currency: req.currency, at: charge.createdAt })
    return charge
  }

  async refund(chargeId: string, amount?: number): Promise<Charge> {
    const charge = this.charges.get(chargeId)
    if (!charge) throw new Error(`refund: unknown charge ${chargeId}`)
    const remaining = charge.amount - charge.refundedAmount
    const value = amount ?? remaining // omitted = full remaining
    assertMinorUnits(value, 'refund amount')
    if (value > remaining) throw new Error(`refund: ${value} exceeds remaining ${remaining} on ${chargeId}`)

    const refundedAmount = charge.refundedAmount + value
    const updated: Charge = { ...charge, refundedAmount, status: refundedAmount === charge.amount ? 'refunded' : 'partially_refunded' }
    this.charges.set(chargeId, updated)
    // refund is a NEGATIVE ledger entry — balance stays the sum of entries, never re-derived.
    this.entries.push({ id: `le_${randomUUID()}`, chargeId, kind: 'refund', amount: -value, currency: charge.currency, at: new Date().toISOString() })
    return updated
  }

  async getCharge(id: string): Promise<Charge | null> {
    return this.charges.get(id) ?? null
  }

  // No provider and no secret at nursery, so this only parses the event shape — it does NOT
  // verify a signature and does NOT claim 'webhook-verified'. The verified:true marker is the
  // port's structural promise; here it is honest only because there is no untrusted provider.
  async handleWebhook(rawBody: string, _signature?: string): Promise<WebhookEvent> {
    const body = JSON.parse(rawBody) as { id?: string; type?: string; chargeId?: string }
    return { id: body.id ?? `evt_${randomUUID()}`, type: body.type ?? 'unknown', chargeId: body.chargeId, verified: true }
  }

  async balance(currency: string): Promise<Balance> {
    return balanceFromEntries(this.entries, currency)
  }
  async ledger(): Promise<LedgerEntry[]> {
    return [...this.entries]
  }
  async close(): Promise<void> {}
}

export const adapter: Adapter = {
  name: 'memory',
  maxGrade: 'nursery',
  capabilities: ['idempotent-charge', 'integer-minor-units'], // no durable ledger, no verified webhooks, no reconciliation
  async open(): Promise<PaymentRail> {
    return new MemoryRail()
  },
}
