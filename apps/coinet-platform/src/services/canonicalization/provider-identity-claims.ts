/**
 * L3.2 — Canonical Identity Resolution: Provider Identity Claims
 *
 * Provider claim normalization, comparison, co-authority disagreement
 * capture. Provider claims are evidence bundles, not truth.
 */

import type { CanonicalObjectType } from './canonical-entity-types';
import type {
  ProviderIdentityClaim,
  CrossProviderComparisonResult,
} from './identity-resolution-types';

// ═══════════════════════════════════════════════════════════════════════════════
// NORMALIZED CLAIM
// ═══════════════════════════════════════════════════════════════════════════════

export type NormalizedProviderClaim = {
  claimId: string;
  providerId: string;
  providerObjectId: string;
  claimClass: ProviderIdentityClaim['claimClass'];
  objectType: CanonicalObjectType;
  normalizedPayload: Record<string, unknown>;
  candidateCanonicalId?: string;
  strength: 'STRONG' | 'MODERATE' | 'WEAK';
  sourceRefs: string[];
};

// ═══════════════════════════════════════════════════════════════════════════════
// CLAIM NORMALIZATION
// ═══════════════════════════════════════════════════════════════════════════════

let _claimCounter = 0;

export function normalizeClaim(claim: ProviderIdentityClaim): NormalizedProviderClaim {
  const strength = claim.claimClass === 'DETERMINISTIC_ANCHOR' ? 'STRONG'
    : claim.claimClass === 'ALIAS' ? 'MODERATE'
    : claim.claimClass === 'ATTRIBUTION' ? 'MODERATE'
    : 'WEAK';

  return {
    claimId: `pclaim_${++_claimCounter}`,
    providerId: claim.providerId,
    providerObjectId: claim.providerObjectId,
    claimClass: claim.claimClass,
    objectType: claim.objectTypeHint,
    normalizedPayload: { ...claim.payload },
    strength,
    sourceRefs: [...claim.sourceRefs],
  };
}

export function normalizeClaims(claims: ProviderIdentityClaim[]): NormalizedProviderClaim[] {
  return claims.map(normalizeClaim);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLAIM LEDGER (in-memory; production backs to persistent store)
// ═══════════════════════════════════════════════════════════════════════════════

let _claimLedger: NormalizedProviderClaim[] = [];

export function recordClaim(claim: NormalizedProviderClaim): void {
  _claimLedger.push(claim);
}

export function getClaimsForCandidate(candidateId: string): NormalizedProviderClaim[] {
  return _claimLedger.filter(c => c.candidateCanonicalId === candidateId);
}

export function getClaimsByProvider(providerId: string): NormalizedProviderClaim[] {
  return _claimLedger.filter(c => c.providerId === providerId);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CROSS-PROVIDER COMPARISON
// ═══════════════════════════════════════════════════════════════════════════════

export type ProviderAgreementKey =
  | 'SAME_CONTRACT'
  | 'SAME_CHAIN'
  | 'SAME_PROTOCOL_FAMILY'
  | 'SAME_WALLET_CLUSTER'
  | 'SAME_TOPIC_BOUNDARY'
  | 'SAME_PAIR_SCOPE'
  | 'SAME_LIFECYCLE';

function claimsFavorCandidate(
  claims: NormalizedProviderClaim[],
  candidateId: string,
): number {
  let score = 0;
  for (const c of claims) {
    if (c.candidateCanonicalId !== candidateId) continue;
    if (c.strength === 'STRONG') score += 15;
    else if (c.strength === 'MODERATE') score += 8;
    else score += 3;
  }
  return score;
}

export function compareProviderClaims(
  claims: NormalizedProviderClaim[],
  candidateIds: string[],
): CrossProviderComparisonResult {
  const agreementByCandidate: Record<string, number> = {};
  const disagreements: string[] = [];
  const coAuthorityConflicts: string[] = [];
  const reinforcingClaims: string[] = [];

  for (const cid of candidateIds) {
    agreementByCandidate[cid] = claimsFavorCandidate(claims, cid);
  }

  const providerGroups = new Map<string, NormalizedProviderClaim[]>();
  for (const c of claims) {
    if (!providerGroups.has(c.providerId)) providerGroups.set(c.providerId, []);
    providerGroups.get(c.providerId)!.push(c);
  }

  const providerIds = [...providerGroups.keys()];

  for (let i = 0; i < providerIds.length; i++) {
    for (let j = i + 1; j < providerIds.length; j++) {
      const pa = providerGroups.get(providerIds[i])!;
      const pb = providerGroups.get(providerIds[j])!;

      const aCandidates = new Set(pa.map(c => c.candidateCanonicalId).filter(Boolean));
      const bCandidates = new Set(pb.map(c => c.candidateCanonicalId).filter(Boolean));

      const overlap = [...aCandidates].filter(id => bCandidates.has(id));
      const aOnly = [...aCandidates].filter(id => !bCandidates.has(id));
      const bOnly = [...bCandidates].filter(id => !aCandidates.has(id));

      if (overlap.length > 0) {
        reinforcingClaims.push(`${providerIds[i]}+${providerIds[j]}→${overlap.join(',')}`);
      }

      if (aOnly.length > 0 && bOnly.length > 0) {
        const aStrong = pa.some(c => c.strength === 'STRONG');
        const bStrong = pb.some(c => c.strength === 'STRONG');

        if (aStrong && bStrong) {
          coAuthorityConflicts.push(
            `CO_AUTHORITY_CONFLICT:${providerIds[i]}(${aOnly.join(',')})vs${providerIds[j]}(${bOnly.join(',')})`
          );
        } else {
          disagreements.push(
            `DISAGREE:${providerIds[i]}(${aOnly.join(',')})vs${providerIds[j]}(${bOnly.join(',')})`
          );
        }
      }
    }
  }

  return {
    agreementByCandidate,
    disagreements,
    coAuthorityConflicts,
    reinforcingClaims,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROVENANCE CHECK — critical for entity attribution
// ═══════════════════════════════════════════════════════════════════════════════

export function hasProvenanceSupport(
  claims: NormalizedProviderClaim[],
  objectType: CanonicalObjectType,
): boolean {
  if (objectType !== 'ENTITY') return true;

  const attributionClaims = claims.filter(c => c.claimClass === 'ATTRIBUTION');
  if (attributionClaims.length === 0) return false;

  const uniqueProviders = new Set(attributionClaims.map(c => c.providerId));
  return uniqueProviders.size >= 1 && attributionClaims.some(c => c.strength !== 'WEAK');
}

// ═══════════════════════════════════════════════════════════════════════════════
// RESET (for testing)
// ═══════════════════════════════════════════════════════════════════════════════

export function resetClaimState(): void {
  _claimLedger = [];
  _claimCounter = 0;
}
