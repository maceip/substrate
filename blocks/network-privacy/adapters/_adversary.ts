// adapters/_adversary.ts — the adversarial-test seam. NOT part of the port.
//
// The catalog ladder ends in "adversarial tests", and the port guarantee is only worth
// stating if someone gets to attack it. block.test.ts plays an adversary with FULL inside
// access — the engine's own address table, plus captured envelopes it can re-inject — and
// proves that nothing the port returned reveals any of it, and that elementary+ refuses a
// replay. App code can never reach this: index.ts does not export it, and the
// PrivateTransport type does not carry it. Each adapter registers its internals here, keyed
// by transport instance, the moment connect() creates one.

export interface AdversaryView {
  addresses(): string[] // every internal transport address the engine knows (peers + relays)
  replay(receiptId: string): boolean // re-inject a previously carried envelope; true if it was accepted AGAIN
}

const views = new WeakMap<object, AdversaryView>()

export function expose(transport: object, view: AdversaryView): void {
  views.set(transport, view)
}

export function adversary(transport: object): AdversaryView {
  const v = views.get(transport)
  if (!v) throw new Error('no adversary view registered for this transport')
  return v
}
