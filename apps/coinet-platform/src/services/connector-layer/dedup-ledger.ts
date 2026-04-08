/**
 * L2.4 — Dedup Ledger
 *
 * Immutable record of identity decisions: every arrival gets classified
 * and recorded. Duplicate chains, correction chains, replay isolation
 * records — all auditable.
 */

// ═══════════════════════════════════════════════════════════════════════════════
// INGRESS IDENTITY DECISION — the formal product of L2.4
// ═══════════════════════════════════════════════════════════════════════════════

export type IngressIdentityVerdict =
  | 'ACCEPT_NEW'
  | 'BLOCK_IDEMPOTENT_RETRY'
  | 'ABSORB_SEMANTIC_DUPLICATE'
  | 'APPLY_CORRECTION'
  | 'ISOLATE_REPLAY'
  | 'QUARANTINE'
  | 'REJECT';

export interface IngressIdentityDecision {
  envelopeId: string;
  idempotencyKey: string;
  dedupFingerprint: string;
  sequenceKey?: string;

  decision: IngressIdentityVerdict;
  priorEnvelopeIds: string[];
  correctionTargetEnvelopeId?: string;
  correctionType?: string;

  reasonCodes: string[];
  downstreamEmissionAllowed: boolean;
  liveStateMutationAllowed: boolean;

  decidedAt: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEDGER
// ═══════════════════════════════════════════════════════════════════════════════

const ledger: IngressIdentityDecision[] = [];

export function recordIdentityDecision(decision: IngressIdentityDecision): void {
  ledger.push(decision);
}

export function getIdentityLedger(): readonly IngressIdentityDecision[] {
  return ledger;
}

export function getIdentityLedgerByVerdict(verdict: IngressIdentityVerdict): IngressIdentityDecision[] {
  return ledger.filter(d => d.decision === verdict);
}

export function getIdentityLedgerForEnvelope(envelopeId: string): IngressIdentityDecision | undefined {
  return ledger.find(d => d.envelopeId === envelopeId);
}

export function resetIdentityLedger(): void {
  ledger.length = 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// IDENTITY HONESTY CHECK — anti-fake
// ═══════════════════════════════════════════════════════════════════════════════

export function verifyIdentityCollapseHonesty(decisions: readonly IngressIdentityDecision[]): string[] {
  const violations: string[] = [];

  for (const d of decisions) {
    if (d.decision === 'ABSORB_SEMANTIC_DUPLICATE' && d.correctionTargetEnvelopeId) {
      violations.push(`${d.envelopeId}: correction absorbed as duplicate`);
    }

    if (d.decision === 'ACCEPT_NEW' && !d.downstreamEmissionAllowed) {
      violations.push(`${d.envelopeId}: accepted new but emission blocked`);
    }

    if (d.decision === 'APPLY_CORRECTION' && !d.correctionTargetEnvelopeId) {
      violations.push(`${d.envelopeId}: correction without target`);
    }

    if (d.decision === 'ISOLATE_REPLAY' && d.liveStateMutationAllowed) {
      violations.push(`${d.envelopeId}: replay artifact mutating live state`);
    }

    if (d.decision === 'BLOCK_IDEMPOTENT_RETRY' && d.downstreamEmissionAllowed) {
      violations.push(`${d.envelopeId}: blocked retry still emitting downstream`);
    }
  }

  return violations;
}
