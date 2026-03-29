/**
 * Support Engine — computes hypothesis support from evidence links.
 */

import type { HypothesisEvidenceLink, HypothesisSupportProfile } from './types';

export function computeSupportScore(supportLinks: HypothesisEvidenceLink[]): number {
  if (supportLinks.length === 0) return 0;
  let totalWeight = 0;
  let weightedSum = 0;
  for (const link of supportLinks) {
    const effective = link.stale ? link.weight * (1 - (link.freshnessPenaltyApplied ?? 0.15)) : link.weight;
    totalWeight += 1;
    weightedSum += effective;
  }
  return Math.min(1, weightedSum / Math.max(1, totalWeight));
}

export function computeContradictionScore(contradictionLinks: HypothesisEvidenceLink[]): number {
  if (contradictionLinks.length === 0) return 0;
  let total = 0;
  for (const link of contradictionLinks) {
    total += link.weight * 0.3;
  }
  return Math.min(1, total);
}

export function computeMissingPenalty(missingLinks: HypothesisEvidenceLink[], requiredKeys: string[]): number {
  const missingRequired = requiredKeys.filter(k =>
    missingLinks.some(l => l.evidenceKey === k),
  );
  const basePenalty = missingLinks.length * 0.03;
  const requiredPenalty = missingRequired.length * 0.08;
  return Math.min(0.4, basePenalty + requiredPenalty);
}

export function computeStalePenalty(supportLinks: HypothesisEvidenceLink[]): number {
  const staleCount = supportLinks.filter(l => l.stale).length;
  if (staleCount === 0) return 0;
  return Math.min(0.2, staleCount * 0.04);
}

export function buildSupportProfile(params: {
  supportScore: number;
  contradictionScore: number;
  missingPenalty: number;
  stalePenalty: number;
  regimeModifier: number;
  sequenceModifier: number;
  coverageModifier: number;
  invalidationPenalty: number;
}): HypothesisSupportProfile {
  const finalScore = Math.max(0, Math.min(1,
    params.supportScore
    - params.contradictionScore
    - params.missingPenalty
    - params.stalePenalty
    - params.invalidationPenalty
    + params.regimeModifier
    + params.sequenceModifier
    + params.coverageModifier,
  ));
  return { ...params, finalScore };
}
