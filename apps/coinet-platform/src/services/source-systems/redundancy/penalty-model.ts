/**
 * Substitution Penalty Model — computes authority, freshness, scope,
 * confidence, and claim-rights penalties for every substitution event.
 */

import type { SubstitutionMode, SubstitutionPenalty, ClaimRightsPenalty, AcceptableSubstitution } from './types';

const CLAIM_RIGHTS_WEIGHT: Record<ClaimRightsPenalty, number> = {
  none: 0,
  low: 0.1,
  medium: 0.25,
  high: 0.5,
  critical: 0.8,
};

export function computeSubstitutionPenalty(
  sub: AcceptableSubstitution,
  staleSinceMs: number = 0,
  maxFreshnessMs: number = Infinity,
): SubstitutionPenalty {
  const authorityPenalty = sub.authorityPenalty;
  const confidencePenalty = sub.confidencePenalty;
  const claimRightsPenalty = sub.claimRightsPenalty;

  let freshnessPenalty = 0;
  if (maxFreshnessMs < Infinity && staleSinceMs > 0) {
    const ratio = Math.min(staleSinceMs / maxFreshnessMs, 1);
    freshnessPenalty = ratio * 0.3;
  }

  let scopePenalty = 0;
  if (sub.mode === 'ADJACENT_TRUTH_CONTINUITY') {
    scopePenalty = 0.3;
  } else if (sub.mode === 'LOWER_AUTHORITY_SAME_TRUTH') {
    scopePenalty = 0.1;
  }

  const totalConfidenceReduction = Math.min(
    authorityPenalty + freshnessPenalty + scopePenalty + confidencePenalty,
    0.85,
  );

  return {
    authorityPenalty,
    freshnessPenalty,
    scopePenalty,
    confidencePenalty,
    claimRightsPenalty,
    totalConfidenceReduction,
  };
}

export function computeBlindPenalty(): SubstitutionPenalty {
  return {
    authorityPenalty: 1.0,
    freshnessPenalty: 1.0,
    scopePenalty: 1.0,
    confidencePenalty: 1.0,
    claimRightsPenalty: 'critical',
    totalConfidenceReduction: 1.0,
  };
}

export function computeTemporalFallbackPenalty(
  staleSinceMs: number,
  maxAgeMs: number,
  baseConfidencePenalty: number,
): SubstitutionPenalty {
  const ratio = Math.min(staleSinceMs / maxAgeMs, 1);
  const freshnessPenalty = ratio * 0.4;

  return {
    authorityPenalty: 0.1,
    freshnessPenalty,
    scopePenalty: 0,
    confidencePenalty: baseConfidencePenalty,
    claimRightsPenalty: ratio > 0.7 ? 'high' : 'medium',
    totalConfidenceReduction: Math.min(0.1 + freshnessPenalty + baseConfidencePenalty, 0.85),
  };
}

export function getClaimRightsReduction(penalty: ClaimRightsPenalty): number {
  return CLAIM_RIGHTS_WEIGHT[penalty] ?? 0;
}
