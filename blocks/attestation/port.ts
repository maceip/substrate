// port.ts — THE PORT for attestation. [PROTECTED]
//
// The single narrow interface app code is allowed to import. Defined by the CHANGE it
// absorbs: swapping the signing engine (in-process HMAC -> local Ed25519 keypair -> TEE /
// remote attestation / managed KMS) must pass through here and change NOTHING above it.
// The catalog ladder this block implements (port-catalog-v0, `attestation-crypto-boundary`):
// local verifier/signer adapter with explicit claim type -> TEE/remote attestation, key
// rotation, proof aggregation, policy verification.
//
// PORT GUARANTEES (these are the contract, not adapter niceties):
//   1. Private key material NEVER crosses the port. No method returns it, no proof embeds
//      it, keyInfo() exposes only a fingerprint — at every grade.
//   2. Verification is FAIL-CLOSED. An unknown algorithm, an unknown key, an expired or
//      garbled claim, a malformed proof — every failure mode is {valid:false, reason},
//      never an exception that some caller upstream turns into "assume valid".
//
// AEvo: this file is PROTECTED. An agent may TIGHTEN it (add a method, narrow a type, add a
// guarantee) but may not LOOSEN it (remove a method, widen a return, drop a guarantee).
// See the PROTECTED file and gates.assertNoLoosening.

export type { Grade } from '../_kernel/grade.ts'
export { gradeAtLeast } from '../_kernel/grade.ts'
import type { Grade } from '../_kernel/grade.ts'

// Claim: the explicit typed shape every proof attests to. Subject is WHAT is being attested
// ('artifact:app-v1.4.2'), statement is the assertion about it. Timestamps are ISO-8601.
export interface Claim {
  subject: string
  statement: string
  issuedAt: string
  expiresAt?: string // optional — but "no expiry" means "no expiry was chosen", never "valid forever by right"
}

// Proof: a claim plus the signature over its canonical bytes. keyId is a public fingerprint
// of the signing key (a hash, never the key); the signature is a MAC/signature, not a secret.
export interface Proof {
  claim: Claim
  keyId: string
  algorithm: string
  signature: string // hex
}

// VerifyResult: fail-closed by shape. `claim` is present ONLY when valid (the verified copy,
// safe to act on); `reason` is present ONLY when invalid. There is no third state.
export interface VerifyResult {
  valid: boolean
  claim?: Claim
  reason?: string
}

// KeyInfo: what operators may see about the signing key. A fingerprint, a birthday, an
// algorithm name — never private material (guarantee 1).
export interface KeyInfo {
  keyId: string
  createdAt: string
  algorithm: string
}

// VerifyPolicy: checks beyond the signature ("cryptographically genuine" is not the same as
// "acceptable"). Honored by adapters with the 'policy-checked' capability; the graduated
// gate makes that capability mandatory when it fires.
export interface VerifyPolicy {
  requireExpiry?: boolean // a claim without expiresAt verifies false
  maxClaimAgeMs?: number // a claim issued longer ago than this verifies false
}

// Attestor: the contract. Every adapter, at every grade, satisfies exactly this. rotate()
// and verifyBatch() are the graduated seams — optional on the type, named by the
// 'rotation-supported' / 'proof-aggregation' capabilities the gate evaluator checks.
export interface Attestor {
  sign(claim: Claim): Promise<Proof>
  verify(proof: Proof): Promise<VerifyResult>
  verifyBatch?(proofs: Proof[]): Promise<{ allValid: boolean; results: VerifyResult[] }>
  keyInfo(): Promise<KeyInfo>
  rotate?(): Promise<KeyInfo> // new active key; proofs signed before still verify (overlapping validity)
  close(): Promise<void>
}

// The canonical bytes every adapter signs and verifies: fixed field order, no extras. This
// is shared by all adapters so tamper detection means the same thing at every grade — two
// grades disagreeing on which bytes a signature covers would make the port a lie.
export function canonicalClaim(c: Claim): string {
  return JSON.stringify(
    c.expiresAt === undefined
      ? { subject: c.subject, statement: c.statement, issuedAt: c.issuedAt }
      : { subject: c.subject, statement: c.statement, issuedAt: c.issuedAt, expiresAt: c.expiresAt },
  )
}

// Signing-side guard: a producer handing in a malformed claim is a bug, so sign() throws.
// (The verifying side never throws — see proofShapeError and guarantee 2.)
export function assertValidClaim(c: Claim): void {
  if (typeof c !== 'object' || c === null) throw new Error('invalid claim: not an object')
  if (typeof c.subject !== 'string' || c.subject.length === 0) throw new Error('invalid claim: subject must be a non-empty string')
  if (typeof c.statement !== 'string' || c.statement.length === 0) throw new Error('invalid claim: statement must be a non-empty string')
  if (typeof c.issuedAt !== 'string' || Number.isNaN(Date.parse(c.issuedAt))) throw new Error('invalid claim: issuedAt must be an ISO-8601 timestamp')
  if (c.expiresAt !== undefined && (typeof c.expiresAt !== 'string' || Number.isNaN(Date.parse(c.expiresAt))))
    throw new Error('invalid claim: expiresAt must be an ISO-8601 timestamp when present')
}

// Expiry is enforced at verify time at every grade — a port guarantee, not a graduated luxury.
export function claimExpired(c: Claim, now: number = Date.now()): boolean {
  return c.expiresAt !== undefined && now >= Date.parse(c.expiresAt)
}

// Verify-side shape guard, shared by all adapters so a garbled proof gets the same fail-closed
// reason at every grade instead of an adapter-dependent exception. Returns the reason, or null.
export function proofShapeError(p: unknown): string | null {
  if (typeof p !== 'object' || p === null) return 'malformed-proof: not an object'
  const q = p as Partial<Proof>
  if (typeof q.keyId !== 'string' || q.keyId.length === 0) return 'malformed-proof: missing keyId'
  if (typeof q.algorithm !== 'string' || q.algorithm.length === 0) return 'malformed-proof: missing algorithm'
  if (typeof q.signature !== 'string' || q.signature.length === 0) return 'malformed-proof: missing signature'
  const c = q.claim as Partial<Claim> | undefined
  if (typeof c !== 'object' || c === null) return 'malformed-claim: missing claim'
  if (typeof c.subject !== 'string' || c.subject.length === 0) return 'malformed-claim: subject'
  if (typeof c.statement !== 'string' || c.statement.length === 0) return 'malformed-claim: statement'
  if (typeof c.issuedAt !== 'string' || Number.isNaN(Date.parse(c.issuedAt))) return 'malformed-claim: issuedAt'
  if (c.expiresAt !== undefined && (typeof c.expiresAt !== 'string' || Number.isNaN(Date.parse(c.expiresAt)))) return 'malformed-claim: expiresAt'
  return null
}

// Adapter: what each adapter file exports. The port is the SHAPE (Attestor); the adapter is
// the swappable thing behind it. `maxGrade` is the highest grade whose requirements this
// adapter can satisfy; `capabilities` are the named guarantees the gate evaluator checks.
// `issuer` namespaces key custody (one key per issuer, like a collection or a bucket).
export interface Adapter {
  name: string
  maxGrade: Grade
  capabilities: string[]
  open(issuer: string, policy?: VerifyPolicy): Promise<Attestor>
}
